import { describe, expect, test } from "bun:test";
import { makeKeyPair } from "./signed-proof.ts";
import { SignedDecisionLog, verifySignedChain, type SignedRecord } from "./signed-decision.ts";

const k = makeKeyPair();
const trusted = { [k.keyId]: k.publicPem };
const at = () => new Date("2026-06-25T00:00:00Z");

function chain(): SignedRecord[] {
  const log = new SignedDecisionLog(k.keyId, k.privatePem, at);
  log.append({ subject: "self-edit", action: "fork", outcome: "allow", reason: "isolate" });
  log.append({ subject: "self-edit", action: "verify", outcome: "approve", reason: "proof passed" });
  log.append({ subject: "promoter", action: "promote", outcome: "approve", reason: "cas ok" });
  return log.records;
}

describe("signed decision chain", () => {
  test("intact signed chain verifies", () => {
    expect(verifySignedChain(chain(), trusted).ok).toBe(true);
  });

  test("tampered record is detected", () => {
    const r = chain();
    r[1] = { ...r[1], outcome: "deny" }; // edit content, keep old hash/sig
    const v = verifySignedChain(r, trusted);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.brokenIndex).toBe(1);
  });

  test("forged signature is detected", () => {
    const r = chain();
    r[2] = { ...r[2], signature: Buffer.from("forged").toString("base64") };
    expect(verifySignedChain(r, trusted).ok).toBe(false);
  });

  test("record signed by an untrusted key is rejected", () => {
    const attacker = makeKeyPair();
    const log = new SignedDecisionLog(attacker.keyId, attacker.privatePem, at);
    log.append({ subject: "x", action: "promote", outcome: "approve", reason: "evil" });
    expect(verifySignedChain(log.records, trusted).ok).toBe(false);
  });
});
