// Durable persistence so the keyring and decision chain survive a restart.
// A Store is the injectable boundary (file-backed default; a KV/DO/D1 adapter
// implements the same interface). Protected writes carry a checksum so a store
// edited out of band is detected on load. The signed decision chain is also
// self-verifying via verifySignedChain; the checksum covers the keyring, which
// has no per-entry signatures.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface Store {
  load(key: string): string | null;
  save(key: string, value: string): void;
}

export class FileStore implements Store {
  #dir: string;
  constructor(dir: string) {
    this.#dir = dir;
    mkdirSync(dir, { recursive: true });
  }
  #path(key: string): string {
    return join(this.#dir, `${key}.json`);
  }
  load(key: string): string | null {
    const p = this.#path(key);
    return existsSync(p) ? readFileSync(p, "utf8") : null;
  }
  save(key: string, value: string): void {
    const p = this.#path(key);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, value);
  }
}

type Envelope = { checksum: string; payload: unknown };

function checksum(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class TamperError extends Error {}

/** Save `payload` with a checksum over its bytes. */
export function saveProtected(store: Store, key: string, payload: unknown): void {
  const env: Envelope = { checksum: checksum(payload), payload };
  store.save(key, JSON.stringify(env));
}

/**
 * Load and verify the checksum. Throws TamperError if the stored bytes were
 * edited out of band. Returns null when nothing is stored.
 */
export function loadProtected<T>(store: Store, key: string): T | null {
  const raw = store.load(key);
  if (raw === null) return null;
  const env = JSON.parse(raw) as Envelope;
  if (checksum(env.payload) !== env.checksum) {
    throw new TamperError(`persisted store '${key}' failed checksum`);
  }
  return env.payload as T;
}
