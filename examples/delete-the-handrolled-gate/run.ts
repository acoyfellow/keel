// run.ts -- exercise BEFORE and AFTER, prove AFTER is stronger, report LOC.
//
//   bun run examples/delete-the-handrolled-gate/run.ts
//
// Deterministic. No network. No secrets (ephemeral ed25519 key generated here).
//
// The falsifiable claim under test:
//   "A toy owner-operated worker with its own hand-rolled deploy gate can
//    DELETE that hand-rolled code by adopting keel, and end up with fewer
//    lines AND a stronger gate."
//
// We make "stronger" concrete with two attacks that BEFORE accepts and AFTER
// refuses:
//   A. forged approval  -- an attacker fabricates approval credentials.
//   B. stale baseline   -- a promotion built against an old head clobbers
//                          newer work because there is no compare-and-swap.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { HandRolledGate } from "./before/gate.ts";
import { KeelGate } from "./after/gate.ts";
import { RefStore } from "../../src/promote-model.ts";
import { makeKeyPair } from "../../src/signed-proof.ts";
import { makeProof } from "../../src/proof.ts";
import type { TrustedKeys, ScopedToken } from "../../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));

// ---- LOC accounting -------------------------------------------------------
// BEFORE: count the maintained gate substrate (BEGIN GATE..END GATE).
// AFTER:  count the maintained glue (BEGIN GLUE..END GLUE).
// We count non-blank, non-pure-comment lines so the comparison is about code
// the owner actually carries, not prose. (Marker lines are excluded.)
function countCarriedLines(file: string, begin: string, end: string): number {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  let inBlock = false;
  let n = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.includes(begin)) {
      inBlock = true;
      continue;
    }
    if (line.includes(end)) {
      inBlock = false;
      continue;
    }
    if (!inBlock) continue;
    if (line === "") continue;
    if (line.startsWith("//")) continue;
    n++;
  }
  return n;
}

const beforeLOC = countCarriedLines(join(here, "before/gate.ts"), "BEGIN GATE", "END GATE");
const afterLOC = countCarriedLines(join(here, "after/gate.ts"), "BEGIN GLUE", "END GLUE");

// ---- shared scenario ------------------------------------------------------
const REPO = "toy-worker";
const BASELINE = "sha-v1"; // what's live
const CANDIDATE = "sha-v2"; // what we want to promote
const HONEST_APPROVER = "owner@example";
const SHARED_TOKEN = "let-me-in"; // the before-gate's "secret"

const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

// ===========================================================================
// ATTACK A: forged approval
// ===========================================================================
// BEFORE: the attacker doesn't know the real approver/token... except an
// unsigned gate cannot tell a forged string from a real one. If the attacker
// has ever SEEN one valid request (or guesses the token), they reproduce it
// verbatim. We model that: the attacker replays the known-good string fields.
{
  const before = new HandRolledGate(BASELINE, [HONEST_APPROVER], SHARED_TOKEN);
  const forged = before.promote({
    candidate: "sha-evil",
    baseline: BASELINE,
    testsPassed: true,
    approvedBy: HONEST_APPROVER, // copied string -- no signature to forge
    approvalToken: SHARED_TOKEN, // copied string -- no signature to forge
  });
  // BEFORE accepts the forgery: a copied/guessed string IS the credential.
  check(
    "before: forged approval is ACCEPTED (weakness)",
    forged.ok === true && forged.newHead === "sha-evil",
    forged.ok ? `promoted ${forged.newHead}` : `unexpectedly refused: ${forged.reason}`,
  );
}

// AFTER: authorization is an ed25519 signature from a trusted, active key.
// The attacker does not hold the private key, so they cannot mint a valid
// signed proof for "sha-evil". The best they can do is submit an unsigned /
// wrong-key proof, which keel refuses.
{
  const honest = makeKeyPair();
  const attacker = makeKeyPair(); // a key keel does NOT trust
  const trusted: TrustedKeys = { [honest.keyId]: honest.publicPem };
  const store = new RefStore({ [REPO]: BASELINE });
  const gate = new KeelGate(store, REPO, trusted);
  const now = 1_000_000;
  const token: ScopedToken = { repo: REPO, scope: "write", expiresAt: now + 60_000 };

  const forged = gate.promote(
    {
      candidate: "sha-evil",
      baseline: BASELINE,
      proof: makeProof({
        artifactDigest: "sha-evil",
        verifier: "ci",
        policy: "tests-green",
        result: "pass",
        evidence: "attacker-built",
      }),
      signerKeyId: attacker.keyId, // attacker signs with an untrusted key
      signerPrivatePem: attacker.privatePem,
      token,
    },
    now,
  );
  // AFTER refuses: untrusted key -> signature/key not admitted, ref unchanged.
  check(
    "after: forged approval is REFUSED (strength)",
    forged.ok === false && store.head(REPO) === BASELINE,
    forged.ok ? `WRONGLY promoted ${forged.newHead}` : `refused: ${forged.reason}; head=${store.head(REPO)}`,
  );
}

// ===========================================================================
// ATTACK B: stale baseline (lost-update / clobber)
// ===========================================================================
// Setup: a promotion is prepared believing head == sha-v1. Meanwhile head
// legitimately advanced to sha-v1b. The stale promotion then lands.
// BEFORE: head is written unconditionally, so the stale promotion clobbers
// sha-v1b -> lost update.
{
  const before = new HandRolledGate(BASELINE, [HONEST_APPROVER], SHARED_TOKEN);
  // someone else advanced the head legitimately:
  before.promote({
    candidate: "sha-v1b",
    baseline: BASELINE,
    testsPassed: true,
    approvedBy: HONEST_APPROVER,
    approvalToken: SHARED_TOKEN,
  });
  // now the stale promotion (still believing baseline sha-v1) lands:
  const stale = before.promote({
    candidate: CANDIDATE,
    baseline: BASELINE, // STALE -- head is already sha-v1b
    testsPassed: true,
    approvedBy: HONEST_APPROVER,
    approvalToken: SHARED_TOKEN,
  });
  // BEFORE accepts it and clobbers sha-v1b. The lost update is invisible.
  check(
    "before: stale baseline is ACCEPTED, clobbers newer head (weakness)",
    stale.ok === true && before.liveHead() === CANDIDATE,
    stale.ok ? `clobbered to ${before.liveHead()} (sha-v1b lost)` : `refused: ${stale.reason}`,
  );
}

// AFTER: promote() uses force-with-lease (compare-and-swap). A stale baseline
// no longer matches the live head, so the swap is rejected and sha-v1b stands.
{
  const honest = makeKeyPair();
  const trusted: TrustedKeys = { [honest.keyId]: honest.publicPem };
  const store = new RefStore({ [REPO]: BASELINE });
  const gate = new KeelGate(store, REPO, trusted);
  const now = 1_000_000;
  const token: ScopedToken = { repo: REPO, scope: "write", expiresAt: now + 60_000 };

  // legitimate advance to sha-v1b (lease matches BASELINE):
  gate.promote(
    {
      candidate: "sha-v1b",
      baseline: BASELINE,
      proof: makeProof({ artifactDigest: "sha-v1b", verifier: "ci", policy: "tests-green", result: "pass", evidence: "ok" }),
      signerKeyId: honest.keyId,
      signerPrivatePem: honest.privatePem,
      token,
    },
    now,
  );
  // stale promotion (still believes baseline sha-v1):
  const stale = gate.promote(
    {
      candidate: CANDIDATE,
      baseline: BASELINE, // STALE
      proof: makeProof({ artifactDigest: CANDIDATE, verifier: "ci", policy: "tests-green", result: "pass", evidence: "ok" }),
      signerKeyId: honest.keyId,
      signerPrivatePem: honest.privatePem,
      token,
    },
    now,
  );
  // AFTER refuses: lease stale, sha-v1b survives.
  check(
    "after: stale baseline is REFUSED, newer head survives (strength)",
    stale.ok === false && store.head(REPO) === "sha-v1b",
    stale.ok ? `WRONGLY clobbered to ${stale.newHead}` : `refused: ${stale.reason}; head=${store.head(REPO)}`,
  );
}

// ===========================================================================
// SANITY: AFTER still admits the honest path (not just a brick that says no).
// ===========================================================================
{
  const honest = makeKeyPair();
  const trusted: TrustedKeys = { [honest.keyId]: honest.publicPem };
  const store = new RefStore({ [REPO]: BASELINE });
  const gate = new KeelGate(store, REPO, trusted);
  const now = 1_000_000;
  const token: ScopedToken = { repo: REPO, scope: "write", expiresAt: now + 60_000 };
  const ok = gate.promote(
    {
      candidate: CANDIDATE,
      baseline: BASELINE,
      proof: makeProof({ artifactDigest: CANDIDATE, verifier: "ci", policy: "tests-green", result: "pass", evidence: "ok" }),
      signerKeyId: honest.keyId,
      signerPrivatePem: honest.privatePem,
      token,
    },
    now,
  );
  check(
    "after: honest deploy is ADMITTED",
    ok.ok === true && store.head(REPO) === CANDIDATE,
    ok.ok ? `promoted ${ok.newHead}` : `wrongly refused: ${ok.reason}`,
  );
}

// ---- report ---------------------------------------------------------------
console.log("=".repeat(70));
console.log("delete-the-handrolled-gate :: BEFORE vs AFTER");
console.log("=".repeat(70));
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  console.log(`        ${r.detail}`);
}

console.log("-".repeat(70));
const delta = beforeLOC - afterLOC;
const pct = beforeLOC > 0 ? Math.round((delta / beforeLOC) * 100) : 0;
console.log("LOC carried by the owner (non-blank, non-comment code lines):");
console.log(`   BEFORE hand-rolled gate substrate : ${beforeLOC}`);
console.log(`   AFTER  keel glue                   : ${afterLOC}`);
console.log(`   DELTA  (before - after)            : ${delta}  (${pct}% fewer)`);
console.log("   note: AFTER also gains signing + key windows + CAS that the");
console.log("         owner did NOT have to write -- it lives in shared keel/src.");
console.log("-".repeat(70));

const fewerLines = afterLOC < beforeLOC;
const allChecks = results.every((r) => r.pass);
const claimHolds = fewerLines && allChecks;

console.log(`fewer lines? ${fewerLines}   all checks pass? ${allChecks}`);
console.log("=".repeat(70));
console.log(claimHolds ? "PASS: claim holds (fewer lines AND stronger gate)" : "FAIL: claim does not hold");
console.log("=".repeat(70));

process.exit(claimHolds ? 0 : 1);
