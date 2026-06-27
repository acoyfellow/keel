// Append-only transparency log: makes a bad authorization detectable after the
// fact. Each entry chains to the previous by hash (a tiny Merkle-style chain).
// A removed or edited entry breaks the chain at a reportable index, so an
// authorization cannot be quietly retracted from the record.

import { createHash } from "node:crypto";

export type LogEntry = {
  index: number;
  payload: string; // opaque: e.g. a proof digest or decision hash
  previousHash: string | null;
  hash: string;
};

function entryHash(index: number, payload: string, previousHash: string | null): string {
  return createHash("sha256").update(JSON.stringify({ index, payload, previousHash })).digest("hex");
}

export class TransparencyLog {
  readonly entries: LogEntry[] = [];

  append(payload: string): LogEntry {
    const index = this.entries.length;
    const previousHash = this.entries.at(-1)?.hash ?? null;
    const entry: LogEntry = { index, payload, previousHash, hash: entryHash(index, payload, previousHash) };
    this.entries.push(entry);
    return entry;
  }

  // The head hash is the single value a verifier pins. If it changes without a
  // matching append, the log was rewritten.
  head(): string | null {
    return this.entries.at(-1)?.hash ?? null;
  }
}

export type LogCheck =
  | { ok: true }
  | { ok: false; brokenIndex: number; reason: string };

/** Verify the chain links and per-entry hashes. Detects edits and removals. */
export function verifyLog(entries: readonly LogEntry[]): LogCheck {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.index !== i) return { ok: false, brokenIndex: i, reason: "index gap (entry removed)" };
    const expectedPrev = i === 0 ? null : entries[i - 1].hash;
    if (e.previousHash !== expectedPrev) return { ok: false, brokenIndex: i, reason: "broken link" };
    if (e.hash !== entryHash(e.index, e.payload, e.previousHash)) {
      return { ok: false, brokenIndex: i, reason: "entry edited" };
    }
  }
  return { ok: true };
}

/** Consistency between a previously pinned head and the current log. */
export function consistentWith(pinnedHead: string | null, entries: readonly LogEntry[]): boolean {
  if (pinnedHead === null) return true;
  return entries.some((e) => e.hash === pinnedHead);
}
