// CLAIM (falsifiable): a leaked, still-valid write token is useless to an
// attacker without a fresh signed proof for the EXACT candidate.
//
// This is the smallest runnable demonstration. No network, no secrets, no
// clock: `now` is a fixed integer so the token never expires mid-run. The
// only thing standing between the attacker and a malicious promotion is the
// requirement that `promote` re-verify a signed proof bound to the candidate.
//
//   bun run examples/stolen-token-useless/run.ts
//
// Imports come from ../../src per the keel layout.

import { makeProof } from "../../src/proof.ts";
import { makeKeyPair, signProof, type TrustedKeys } from "../../src/signed-proof.ts";
import { MintingAuthority } from "../../src/minting.ts";
import { RefStore, promote } from "../../src/promote-model.ts";

const NOW = 1_000_000; // fixed clock; deterministic, no Date.now()
const TTL = 60_000; // token valid for the whole run (NOW + TTL never reached)

const REPO = "prod/service";
const BASELINE = "sha-baseline-0000"; // current live head
const CANDIDATE_A = "sha-good-aaaa1111"; // legitimately verified artifact
const CANDIDATE_B = "sha-evil-bbbb2222"; // attacker's malicious artifact

// One trusted verifier key. The verifier signs proofs; the minting role and the
// promoter both check against this trusted public key.
const verifierKey = makeKeyPair();
const trusted: TrustedKeys = { [verifierKey.keyId]: verifierKey.publicPem };

// A real passing, signed proof that binds CANDIDATE_A (and only A).
const proofA = makeProof({
  artifactDigest: CANDIDATE_A,
  verifier: "ci/behavioral",
  policy: "build+boot+200",
  result: "pass",
  evidence: "ran candidate A: built, booted, returned 200",
});
const signedProofA = signProof(proofA, verifierKey.keyId, verifierKey.privatePem);

// Minting role is separate from the promoter (separation of duties).
const minter = new MintingAuthority({
  minterIdentity: "mint-bot",
  trusted,
  ttlMs: TTL,
});

// --- Step 1: legitimate mint of a real scoped write token against proof A ---
const mintResult = minter.mint(
  { requester: "promoter-bot", repo: REPO, candidate: CANDIDATE_A, signedProof: signedProofA },
  NOW,
);
if (!mintResult.ok) {
  console.error(`SETUP BROKEN: legitimate mint failed: ${mintResult.reason}`);
  process.exit(1);
}
const writeToken = mintResult.token; // <- this is the credential that "leaks"
console.log(
  `[mint]   issued write token  scope=${writeToken.scope} repo=${writeToken.repo} ` +
    `expiresAt=${writeToken.expiresAt} (now=${NOW}, not expired)`,
);

// --- Step 2: ATTACKER. They have stolen `writeToken`. It is real and unexpired.
// They try to promote their own malicious CANDIDATE_B. They have NO signed proof
// for B, so they reuse the only proof they can see — the one bound to A — and/or
// try the raw token alone. keel must refuse: no proof binds B.
const store = new RefStore({ [REPO]: BASELINE });

// 2a: attacker presents the stolen token + the proof they have (proof for A)
//     while asking to promote B. The proof does not bind B.
const attackReusedProof = promote(
  store,
  {
    repo: REPO,
    expectedBaseline: BASELINE,
    candidate: CANDIDATE_B, // malicious target
    token: writeToken, // stolen, still valid
    signedProof: signedProofA, // proof is for A, not B
  },
  trusted,
  NOW,
);

// 2b: attacker tries to forge a passing proof for B with their own key.
//     keel does not trust the attacker's key, so verification fails.
const attackerKey = makeKeyPair(); // attacker's own untrusted key
const forgedProofB = signProof(
  makeProof({
    artifactDigest: CANDIDATE_B,
    verifier: "attacker",
    policy: "trust-me",
    result: "pass",
    evidence: "forged",
  }),
  attackerKey.keyId,
  attackerKey.privatePem,
);
const attackForgedProof = promote(
  store,
  {
    repo: REPO,
    expectedBaseline: BASELINE,
    candidate: CANDIDATE_B,
    token: writeToken, // stolen, still valid
    signedProof: forgedProofB, // signed by an UNTRUSTED key
  },
  trusted,
  NOW,
);

const attackBlocked = !attackReusedProof.ok && !attackForgedProof.ok;
const headUntouchedAfterAttack = store.head(REPO) === BASELINE;

console.log(
  `[attack] reuse A's proof for B -> ${attackReusedProof.ok ? "PROMOTED (BAD)" : `refused: ${attackReusedProof.reason}`}`,
);
console.log(
  `[attack] forge B proof (untrusted key) -> ${attackForgedProof.ok ? "PROMOTED (BAD)" : `refused: ${attackForgedProof.reason}`}`,
);
console.log(`[attack] live head after attack = ${store.head(REPO)} (baseline unchanged: ${headUntouchedAfterAttack})`);

// --- Step 3: legitimate promotion of A with the matching signed proof succeeds.
// Same token, but now a proof that actually binds the candidate.
const legit = promote(
  store,
  {
    repo: REPO,
    expectedBaseline: BASELINE,
    candidate: CANDIDATE_A,
    token: writeToken,
    signedProof: signedProofA, // binds A, signed by trusted key
  },
  trusted,
  NOW,
);
const legitPromoted = legit.ok && store.head(REPO) === CANDIDATE_A;
console.log(
  `[legit]  promote A with matching proof -> ${legit.ok ? `head now ${store.head(REPO)}` : `refused: ${legit.reason}`}`,
);

// --- Verdict --------------------------------------------------------------
const pass = attackBlocked && headUntouchedAfterAttack && legitPromoted;
console.log("");
console.log(
  pass
    ? "PASS: stolen write token could not promote candidate B (no proof bound to B); legitimate A succeeded."
    : "FAIL: claim falsified — see lines above.",
);
process.exit(pass ? 0 : 1);
