import { describe, expect, test } from "bun:test";
import { makeKeyPair, signProof, verifySignedProof } from "./signed-proof.ts";
import { makeProof } from "./proof.ts";

const DIGEST = "7926218d1c8f6ccfe2886b188b5d890c6ee85c81";
const good = makeProof({ artifactDigest: DIGEST, verifier: "v", policy: "p@1", result: "pass", evidence: "ok" });

describe("signed proof", () => {
  const k = makeKeyPair();
  const trusted = { [k.keyId]: k.publicPem };

  test("valid signature + passing proof admits", () => {
    const signed = signProof(good, k.keyId, k.privatePem);
    expect(verifySignedProof(signed, DIGEST, trusted).admitted).toBe(true);
  });

  test("unsigned proof (raw, no envelope) is rejected", () => {
    expect(verifySignedProof(good, DIGEST, trusted).admitted).toBe(false);
  });

  test("forged result:pass without a valid signature is rejected", () => {
    const forged = { proof: good, keyId: k.keyId, signature: Buffer.from("nope").toString("base64") };
    const d = verifySignedProof(forged, DIGEST, trusted);
    expect(d.admitted).toBe(false);
    expect(d.reason).toContain("signature does not verify");
  });

  test("tampered body after signing is rejected", () => {
    const signed = signProof(good, k.keyId, k.privatePem);
    const tampered = { ...signed, proof: { ...good, result: "pass" as const, artifactDigest: "deadbeef" } };
    expect(verifySignedProof(tampered, "deadbeef", trusted).admitted).toBe(false);
  });

  test("signature from an untrusted key is rejected", () => {
    const attacker = makeKeyPair();
    const signed = signProof(good, attacker.keyId, attacker.privatePem);
    const d = verifySignedProof(signed, DIGEST, trusted);
    expect(d.admitted).toBe(false);
    expect(d.reason).toContain("unknown or missing verifier key");
  });

  test("valid signature but wrong digest still refuses (binding preserved)", () => {
    const signed = signProof(good, k.keyId, k.privatePem);
    expect(verifySignedProof(signed, "other-digest", trusted).admitted).toBe(false);
  });
});
