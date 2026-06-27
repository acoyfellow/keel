import { describe, expect, test } from "bun:test";
import { sign, createPrivateKey } from "node:crypto";
import { makeKeyPair } from "./signed-proof.ts";
import { makeProof, type Proof } from "./proof.ts";
import { Keyring } from "./keyring.ts";
import { verifyThreshold, type MultiSignedProof } from "./threshold.ts";
import { TransparencyLog, verifyLog, consistentWith } from "./transparency.ts";

const CAND = "7926218d1c8f6ccfe2886b188b5d890c6ee85c81";
const proof: Proof = makeProof({ artifactDigest: CAND, verifier: "quorum", policy: "p@1", result: "pass", evidence: "ok" });

function canonical(p: Proof) {
  return Buffer.from(JSON.stringify({ artifactDigest: p.artifactDigest, verifier: p.verifier, policy: p.policy, result: p.result, evidence: p.evidence }));
}
function signWith(privatePem: string) {
  return sign(null, canonical(proof), createPrivateKey(privatePem)).toString("base64");
}

describe("threshold (k-of-n) verification", () => {
  const a = makeKeyPair(), b = makeKeyPair(), c = makeKeyPair();
  const ring = new Keyring();
  for (const k of [a, b, c]) ring.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 0 });
  const NOW = 1000;

  test("2-of-3: two distinct trusted signers admit", () => {
    const ms: MultiSignedProof = { proof, signatures: { [a.keyId]: signWith(a.privatePem), [b.keyId]: signWith(b.privatePem) } };
    expect(verifyThreshold(ms, CAND, ring, 2, NOW).admitted).toBe(true);
  });

  test("a single (compromised) key cannot admit alone at k=2", () => {
    const ms: MultiSignedProof = { proof, signatures: { [a.keyId]: signWith(a.privatePem) } };
    const d = verifyThreshold(ms, CAND, ring, 2, NOW);
    expect(d.admitted).toBe(false);
  });

  test("an untrusted key's signature does not count toward the threshold", () => {
    const outsider = makeKeyPair();
    const ms: MultiSignedProof = { proof, signatures: { [a.keyId]: signWith(a.privatePem), [outsider.keyId]: signWith(outsider.privatePem) } };
    expect(verifyThreshold(ms, CAND, ring, 2, NOW).admitted).toBe(false);
  });

  test("a revoked signer drops below threshold", () => {
    const ring2 = new Keyring();
    for (const k of [a, b]) ring2.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 0 });
    ring2.revoke(b.keyId, 500);
    const ms: MultiSignedProof = { proof, signatures: { [a.keyId]: signWith(a.privatePem), [b.keyId]: signWith(b.privatePem) } };
    expect(verifyThreshold(ms, CAND, ring2, 2, NOW).admitted).toBe(false);
  });
});

describe("transparency log", () => {
  test("intact log verifies; head pins it", () => {
    const log = new TransparencyLog();
    log.append("proof:aaa"); log.append("proof:bbb"); log.append("proof:ccc");
    expect(verifyLog(log.entries).ok).toBe(true);
    expect(consistentWith(log.head(), log.entries)).toBe(true);
  });

  test("an edited entry is detected", () => {
    const log = new TransparencyLog();
    log.append("a"); log.append("b");
    const tampered = [...log.entries];
    tampered[0] = { ...tampered[0], payload: "evil" };
    const r = verifyLog(tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.brokenIndex).toBe(0);
  });

  test("a removed entry is detected", () => {
    const log = new TransparencyLog();
    log.append("a"); log.append("b"); log.append("c");
    const removed = [log.entries[0], log.entries[2]]; // drop the middle
    expect(verifyLog(removed).ok).toBe(false);
  });

  test("a pinned head no longer present means the log was rewritten", () => {
    const log = new TransparencyLog();
    log.append("a"); log.append("b");
    const pinned = log.head();
    const rewritten = new TransparencyLog();
    rewritten.append("a"); // different history, b dropped
    expect(consistentWith(pinned, rewritten.entries)).toBe(false);
  });
});
