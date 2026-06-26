import { describe, expect, test } from "bun:test";
import { makeKeyPair, signProof, type SignedProof } from "./signed-proof.ts";
import { makeProof } from "./proof.ts";
import { promote, RefStore, type ScopedToken } from "./promote-model.ts";

const BASE = "24bccd671205d7acbe78e46c507973b5d15a7808";
const CAND = "7926218d1c8f6ccfe2886b188b5d890c6ee85c81";
const k = makeKeyPair();
const trusted = { [k.keyId]: k.publicPem };
const NOW = 1_000_000;

function signedFor(sha: string): SignedProof {
  return signProof(makeProof({ artifactDigest: sha, verifier: "v", policy: "p@1", result: "pass", evidence: "ok" }), k.keyId, k.privatePem);
}
const freshToken: ScopedToken = { repo: "owner/source", scope: "write", expiresAt: NOW + 3600_000 };

describe("negative-auth attacks (all must be rejected)", () => {
  test("baseline: a legit promotion succeeds", () => {
    const store = new RefStore({ "owner/source": BASE });
    const r = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: freshToken, signedProof: signedFor(CAND) }, trusted, NOW);
    expect(r.ok).toBe(true);
    expect(store.head("owner/source")).toBe(CAND);
  });

  test("forged proof for the real digest (unsigned/attacker key) is rejected", () => {
    const store = new RefStore({ "owner/source": BASE });
    const attacker = makeKeyPair();
    const forged = signProof(makeProof({ artifactDigest: CAND, verifier: "v", policy: "p@1", result: "pass", evidence: "ok" }), attacker.keyId, attacker.privatePem);
    const r = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: freshToken, signedProof: forged }, trusted, NOW);
    expect(r.ok).toBe(false);
    expect(store.head("owner/source")).toBe(BASE); // unchanged
  });

  test("stale-but-structurally-valid token is rejected", () => {
    const store = new RefStore({ "owner/source": BASE });
    const stale: ScopedToken = { repo: "owner/source", scope: "write", expiresAt: NOW - 1 };
    const r = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: stale, signedProof: signedFor(CAND) }, trusted, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("expired");
  });

  test("replayed promotion (old baseline) is rejected after the ref moved", () => {
    const store = new RefStore({ "owner/source": BASE });
    // first promotion moves head to CAND
    promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: freshToken, signedProof: signedFor(CAND) }, trusted, NOW);
    // replay the original request whose baseline is now stale
    const replay = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: freshToken, signedProof: signedFor(CAND) }, trusted, NOW);
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toContain("lease stale");
  });

  test("concurrent promote race: exactly one wins (compare-and-swap)", () => {
    const store = new RefStore({ "owner/source": BASE });
    const A = "aaaa111111111111111111111111111111111111";
    const B = "bbbb222222222222222222222222222222222222";
    const r1 = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: A, token: freshToken, signedProof: signedFor(A) }, trusted, NOW);
    const r2 = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: B, token: freshToken, signedProof: signedFor(B) }, trusted, NOW);
    expect([r1.ok, r2.ok].filter(Boolean).length).toBe(1); // exactly one
    expect([A, B]).toContain(store.head("owner/source")!);
  });

  test("wrong-repo token is rejected", () => {
    const store = new RefStore({ "owner/source": BASE });
    const wrong: ScopedToken = { repo: "owner/other", scope: "write", expiresAt: NOW + 1000 };
    const r = promote(store, { repo: "owner/source", expectedBaseline: BASE, candidate: CAND, token: wrong, signedProof: signedFor(CAND) }, trusted, NOW);
    expect(r.ok).toBe(false);
  });
});
