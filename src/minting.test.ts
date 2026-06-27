import { describe, expect, test } from "bun:test";
import { makeKeyPair, signProof } from "./signed-proof.ts";
import { makeProof } from "./proof.ts";
import { MintingAuthority } from "./minting.ts";
import { promote, RefStore } from "./promote-model.ts";

const CAND = "7926218d1c8f6ccfe2886b188b5d890c6ee85c81";
const BASE = "24bccd671205d7acbe78e46c507973b5d15a7808";
const k = makeKeyPair();
const trusted = { [k.keyId]: k.publicPem };
const NOW = 1_000_000;

const passing = signProof(
  makeProof({ artifactDigest: CAND, verifier: k.keyId, policy: "p@1", result: "pass", evidence: "ok" }),
  k.keyId, k.privatePem,
);
const failing = signProof(
  makeProof({ artifactDigest: CAND, verifier: k.keyId, policy: "p@1", result: "fail", evidence: "no" }),
  k.keyId, k.privatePem,
);

const authority = () => new MintingAuthority({ minterIdentity: "minter", trusted, ttlMs: 60_000, maxTtlMs: 300_000 });

describe("minting authority", () => {
  test("mints a short-lived repo-scoped write token against a passing proof", () => {
    const r = authority().mint({ requester: "promoter", repo: "executor/source", candidate: CAND, signedProof: passing }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.token.scope).toBe("write");
      expect(r.token.repo).toBe("executor/source");
      expect(r.token.expiresAt - NOW).toBeLessThanOrEqual(60_000);
    }
  });

  test("promoter cannot mint its own write token", () => {
    const r = authority().mint({ requester: "minter", repo: "r", candidate: CAND, signedProof: passing }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("cannot mint its own");
  });

  test("no minting without a passing proof", () => {
    const r = authority().mint({ requester: "promoter", repo: "r", candidate: CAND, signedProof: failing }, NOW);
    expect(r.ok).toBe(false);
  });

  test("a leaked write token alone cannot promote a different candidate", () => {
    // mint a real token for CAND, then try to promote a DIFFERENT artifact with it
    const minted = authority().mint({ requester: "promoter", repo: "r", candidate: CAND, signedProof: passing }, NOW);
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const store = new RefStore({ r: BASE });
    const other = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    // promote needs a signed proof for the candidate; the leaked token does not carry one
    const r = promote(store, { repo: "r", expectedBaseline: BASE, candidate: other, token: minted.token, signedProof: passing }, trusted, NOW);
    expect(r.ok).toBe(false); // proof binds CAND, not `other`
    expect(store.head("r")).toBe(BASE);
  });
});
