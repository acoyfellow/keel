// Rooted trust: answers Kenton "a trust system whose root can't rotate isn't
// done". Replaces the flat trusted-key map with a keyring that has validity
// windows and revocation. A cryptographically valid signature is NOT enough:
// the key must be active at verification time. Rotation lets a new key take
// over; revocation kills a key immediately, even retroactively.

import { createPublicKey, verify } from "node:crypto";

export type KeyEntry = {
  keyId: string;
  publicPem: string;
  notBefore: number; // epoch ms the key becomes valid
  notAfter: number | null; // epoch ms the key stops being valid (rotation), or null
  revokedAt: number | null; // epoch ms of revocation (overrides everything)
};

export type KeyStatus =
  | { trusted: true }
  | { trusted: false; reason: string };

export class Keyring {
  #keys = new Map<string, KeyEntry>();

  add(entry: Omit<KeyEntry, "notAfter" | "revokedAt"> & Partial<Pick<KeyEntry, "notAfter" | "revokedAt">>): void {
    this.#keys.set(entry.keyId, { notAfter: null, revokedAt: null, ...entry });
  }

  /** Rotate: close the old key's window at `at` and register the new active key. */
  rotate(oldKeyId: string, next: Omit<KeyEntry, "notAfter" | "revokedAt">, at: number): void {
    const old = this.#keys.get(oldKeyId);
    if (old) this.#keys.set(oldKeyId, { ...old, notAfter: at });
    this.add({ ...next, notBefore: at });
  }

  revoke(keyId: string, at: number): void {
    const e = this.#keys.get(keyId);
    if (e) this.#keys.set(keyId, { ...e, revokedAt: at });
  }

  status(keyId: string, at: number): KeyStatus {
    const e = this.#keys.get(keyId);
    if (!e) return { trusted: false, reason: "unknown key" };
    if (e.revokedAt !== null && at >= e.revokedAt) return { trusted: false, reason: "key revoked" };
    if (at < e.notBefore) return { trusted: false, reason: "key not yet valid" };
    if (e.notAfter !== null && at >= e.notAfter) return { trusted: false, reason: "key rotated out" };
    return { trusted: true };
  }

  /** Verify a signature AND that the key is active at `at`. Both required. */
  verifyActive(keyId: string, message: Buffer, signature: Buffer, at: number): KeyStatus {
    const s = this.status(keyId, at);
    if (!s.trusted) return s;
    const e = this.#keys.get(keyId)!;
    let ok = false;
    try {
      ok = verify(null, message, createPublicKey(e.publicPem), signature);
    } catch {
      ok = false;
    }
    return ok ? { trusted: true } : { trusted: false, reason: "signature does not verify" };
  }

  pem(keyId: string): string | undefined {
    return this.#keys.get(keyId)?.publicPem;
  }

  /** A serializable snapshot of every key entry, including revocation state. */
  snapshot(): KeyEntry[] {
    return [...this.#keys.values()].map((e) => ({ ...e }));
  }

  /** Rebuild a keyring from a snapshot. Revocations and windows survive. */
  static restore(entries: KeyEntry[]): Keyring {
    const ring = new Keyring();
    for (const e of entries) ring.#keys.set(e.keyId, { ...e });
    return ring;
  }
}
