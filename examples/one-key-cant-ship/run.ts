// one-key-cant-ship: a runnable falsification harness for the claim
//
//   "a single compromised verifier key cannot ship a bad artifact when keel
//    requires k-of-n signatures, and any bad authorization that does happen is
//    detectable after the fact."
//
// We work backwards from that claim. Each numbered check below is a concrete way
// the claim could be FALSE. If keel lets any of them through, the check FAILs and
// the claim is falsified. Run with:  bun run run.ts
//
// Deterministic, no network, no secrets. Ed25519 keys are generated in-process
// and discarded; nothing is persisted.

import { sign, createPrivateKey } from "node:crypto";
import { makeKeyPair } from "../../src/signed-proof.ts";
import { makeProof, type Proof } from "../../src/proof.ts";
import { Keyring } from "../../src/keyring.ts";
import {
  verifyThreshold,
  type MultiSignedProof,
} from "../../src/threshold.ts";
import {
  TransparencyLog,
  verifyLog,
  type LogEntry,
} from "../../src/transparency.ts";

// --- tiny assertion harness ---------------------------------------------------
let failures = 0;
function check(name: string, pass: boolean, detail: string): void {
  const tag = pass ? "PASS" : "FAIL";
  if (!pass) failures++;
  console.log(`  [${tag}] ${name} — ${detail}`);
}

// Canonical bytes signers sign over. Must match threshold.ts's `canonical`.
function canonical(proof: Proof): Buffer {
  const ordered = {
    artifactDigest: proof.artifactDigest,
    verifier: proof.verifier,
    policy: proof.policy,
    result: proof.result,
    evidence: proof.evidence,
  };
  return Buffer.from(JSON.stringify(ordered), "utf8");
}

function sigBy(privatePem: string, proof: Proof): string {
  // threshold.ts verifies signatures over canonical(proof) WITHOUT the keyId, so
  // produce a raw ed25519 sig over exactly those bytes (not signProof's envelope).
  return sign(null, canonical(proof), createPrivateKey(privatePem)).toString(
    "base64",
  );
}

// --- setup: a 2-of-3 verifier keyring -----------------------------------------
const NOW = 1_000_000; // fixed clock; no Date.now(), so the run is deterministic
const K = 2;
const N = 3;

const alice = makeKeyPair(); // honest verifier A
const bob = makeKeyPair(); //   honest verifier B
const carol = makeKeyPair(); // verifier C whose key gets STOLEN

const ring = new Keyring();
for (const kp of [alice, bob, carol]) {
  ring.add({ keyId: kp.keyId, publicPem: kp.publicPem, notBefore: 0 });
}

// The one artifact whose admission decides whether something ships.
const goodDigest = "sha256:GOOD-artifact-0001";

function proofFor(digest: string, verifier: string): Proof {
  return makeProof({
    artifactDigest: digest,
    verifier,
    policy: "ship-policy@v1",
    result: "pass",
    evidence: "ci:green;tests:75",
  });
}

console.log(`Claim under test:`);
console.log(
  `  "one compromised verifier key cannot ship a bad artifact under ${K}-of-${N},`,
);
console.log(`   and any bad authorization is detectable after the fact."\n`);
console.log(`Setup: ${K}-of-${N} keyring {alice, bob, carol@STOLEN}\n`);

// =============================================================================
// CHECK 1 — one stolen key alone is REFUSED.
// Falsifier: if carol's stolen key, signing twice / signing alone, admits.
// =============================================================================
console.log("Check 1: a single stolen key, acting alone, is refused");
{
  const p = proofFor(goodDigest, "carol");
  // The thief has exactly one key (carol). Even if they try to pack the
  // signature map, distinct *keyIds* are what count.
  const stolenOnly: MultiSignedProof = {
    proof: p,
    signatures: { [carol.keyId]: sigBy(carol.privatePem, p) },
  };
  const d = verifyThreshold(stolenOnly, goodDigest, ring, K, NOW);
  check(
    "stolen-key-alone refused",
    d.admitted === false,
    d.admitted ? "ADMITTED (claim falsified!)" : `refused: ${d.reason}`,
  );

  // Thief tries to forge a second slot by duplicating the same key under a
  // different label. The keyId must match a real trusted key, so a fake label
  // simply doesn't count as a distinct trusted signer.
  const forgedSecond: MultiSignedProof = {
    proof: p,
    signatures: {
      [carol.keyId]: sigBy(carol.privatePem, p),
      "carol-also": sigBy(carol.privatePem, p), // unknown keyId
    },
  };
  const d2 = verifyThreshold(forgedSecond, goodDigest, ring, K, NOW);
  check(
    "stolen-key duplicated-under-fake-label refused",
    d2.admitted === false,
    d2.admitted ? "ADMITTED (claim falsified!)" : `refused: ${d2.reason}`,
  );
}

// =============================================================================
// CHECK 2 — two DISTINCT trusted keys ADMIT.
// Falsifier: if a genuine 2-of-3 quorum is wrongly refused, the gate is useless.
// =============================================================================
console.log("\nCheck 2: two distinct trusted keys admit");
{
  const p = proofFor(goodDigest, "alice+bob");
  const quorum: MultiSignedProof = {
    proof: p,
    signatures: {
      [alice.keyId]: sigBy(alice.privatePem, p),
      [bob.keyId]: sigBy(bob.privatePem, p),
    },
  };
  const d = verifyThreshold(quorum, goodDigest, ring, K, NOW);
  const okSigners =
    d.admitted && d.signers.length === 2 &&
    d.signers.includes(alice.keyId) && d.signers.includes(bob.keyId);
  check(
    "alice+bob quorum admits",
    okSigners,
    d.admitted ? `admitted by ${d.signers.length} signers` : `refused: ${d.reason}`,
  );
}

// =============================================================================
// CHECK 2b — stolen key + ONE honest key still misses the threshold.
// (k-1 honest + 1 stolen = 2 distinct... so to keep the stolen key from
// reaching quorum on its own, we show 1 honest + stolen needs the honest party's
// cooperation. With k=2 that pair DOES admit — which is the honest meaning of
// k-of-n: the thief still needs a second *independent* trusted party. We assert
// the thief cannot reach quorum WITHOUT a second genuine party.)
// =============================================================================
console.log("\nCheck 2b: stolen key cannot reach quorum without a real second party");
{
  const p = proofFor(goodDigest, "carol-solo-retry");
  // Only the stolen key participates; everything else is junk the thief controls.
  const thiefOnly: MultiSignedProof = {
    proof: p,
    signatures: {
      [carol.keyId]: sigBy(carol.privatePem, p),
      "ghost-1": "AAAA", // garbage
      "ghost-2": "BBBB", // garbage
    },
  };
  const d = verifyThreshold(thiefOnly, goodDigest, ring, K, NOW);
  check(
    "thief + fabricated signatures refused",
    d.admitted === false,
    d.admitted ? "ADMITTED (claim falsified!)" : `refused: ${d.reason}`,
  );
}

// =============================================================================
// CHECK 3 — the transparency log catches an EDIT of an authorization entry.
// Falsifier: if a tampered entry verifies clean, bad authz is not detectable.
// =============================================================================
console.log("\nCheck 3: transparency log catches an edited authorization entry");
{
  const log = new TransparencyLog();
  log.append("authz:alice+bob admitted sha256:GOOD-artifact-0001");
  log.append("authz:alice+bob admitted sha256:GOOD-artifact-0002");
  log.append("authz:alice+bob admitted sha256:GOOD-artifact-0003");

  const clean = verifyLog(log.entries);
  check("untampered log verifies", clean.ok === true,
    clean.ok ? "chain intact" : `unexpected break at ${clean.brokenIndex}`);

  // Attacker edits the payload of entry 1 (e.g. to launder a bad artifact in).
  const edited: LogEntry[] = log.entries.map((e) => ({ ...e }));
  edited[1] = { ...edited[1], payload: "authz:alice+bob admitted sha256:BAD-artifact" };
  const d = verifyLog(edited);
  check(
    "edited entry detected",
    d.ok === false && d.brokenIndex === 1,
    d.ok ? "NOT DETECTED (claim falsified!)" : `detected: ${d.reason} @${d.brokenIndex}`,
  );
}

// =============================================================================
// CHECK 4 — the transparency log catches a REMOVAL of an authorization entry.
// Falsifier: if quietly dropping an entry leaves a valid-looking chain.
// =============================================================================
console.log("\nCheck 4: transparency log catches a removed authorization entry");
{
  const log = new TransparencyLog();
  log.append("authz:entry-0");
  log.append("authz:entry-1-to-be-removed");
  log.append("authz:entry-2");

  // Attacker splices out entry 1 to retract an authorization from the record.
  const removed: LogEntry[] = [log.entries[0], log.entries[2]];
  const d = verifyLog(removed);
  check(
    "removed entry detected",
    d.ok === false,
    d.ok ? "NOT DETECTED (claim falsified!)" : `detected: ${d.reason} @${d.brokenIndex}`,
  );
}

// --- verdict ------------------------------------------------------------------
console.log("");
if (failures === 0) {
  console.log("RESULT: PASS — the claim survived every falsifier in this harness.");
  process.exit(0);
} else {
  console.log(`RESULT: FAIL — ${failures} falsifier(s) admitted; the claim is broken here.`);
  process.exit(1);
}
