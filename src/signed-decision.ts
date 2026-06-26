// Signed decision chain: answers Ana "the audit trail is forgeable". Each record
// is hash-chained (like the decision hammer) AND signed by its author key.
// verifySignedChain rejects a chain with a broken link, a tampered record, or a
// signature that does not verify - so the record survives an incident.

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import type { TrustedKeys } from "./signed-proof.ts";

export type DecisionOutcome = "allow" | "deny" | "approve" | "expire";

export type SignedRecord = {
  subject: string;
  action: string;
  argsRef?: string;
  outcome: DecisionOutcome;
  reason: string;
  timestamp: string;
  previousHash: string | null;
  keyId: string;
  hash: string;
  signature: string; // ed25519 over the hash
};

type Body = Omit<SignedRecord, "hash" | "signature">;

function hashBody(b: Body): string {
  return createHash("sha256").update(JSON.stringify(b)).digest("hex");
}

export class SignedDecisionLog {
  readonly records: SignedRecord[] = [];
  #now: () => Date;
  #keyId: string;
  #privatePem: string;
  constructor(keyId: string, privatePem: string, now: () => Date = () => new Date()) {
    this.#keyId = keyId;
    this.#privatePem = privatePem;
    this.#now = now;
  }
  append(input: { subject: string; action: string; argsRef?: string; outcome: DecisionOutcome; reason: string }): SignedRecord {
    const body: Body = {
      ...input,
      timestamp: this.#now().toISOString(),
      previousHash: this.records.at(-1)?.hash ?? null,
      keyId: this.#keyId,
    };
    const hash = hashBody(body);
    const signature = sign(null, Buffer.from(hash, "hex"), createPrivateKey(this.#privatePem)).toString("base64");
    const record = { ...body, hash, signature };
    this.records.push(record);
    return record;
  }
}

export type ChainVerification =
  | { ok: true; brokenIndex: null }
  | { ok: false; brokenIndex: number; reason: string };

export function verifySignedChain(records: readonly SignedRecord[], trusted: TrustedKeys): ChainVerification {
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const expectedPrev = i === 0 ? null : records[i - 1].hash;
    const { hash, signature, ...body } = r;
    if (r.previousHash !== expectedPrev) return { ok: false, brokenIndex: i, reason: "broken link" };
    if (hashBody(body as Body) !== hash) return { ok: false, brokenIndex: i, reason: "tampered record" };
    if (!(r.keyId in trusted)) return { ok: false, brokenIndex: i, reason: "untrusted key" };
    let sigOk = false;
    try {
      sigOk = verify(null, Buffer.from(hash, "hex"), createPublicKey(trusted[r.keyId]), Buffer.from(signature, "base64"));
    } catch {
      sigOk = false;
    }
    if (!sigOk) return { ok: false, brokenIndex: i, reason: "signature does not verify" };
  }
  return { ok: true, brokenIndex: null };
}
