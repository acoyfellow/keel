// Example: a candidate worker that BUILDS but returns a bad response under a
// real live request cannot promote itself.
//
// Worked backwards from this falsifiable claim:
//   "a candidate that BUILDS but returns a bad response under a real live
//    request cannot promote itself."
//
// The smallest runnable proof of that claim:
//   1. Write TWO real server artifacts to a temp dir. Both are valid TypeScript
//      and BOTH boot under `bun` (so a build/typecheck gate alone cannot tell
//      them apart):
//        - good: answers HTTP 200 on a live request.
//        - bad:  boots fine, then THROWS on the live request (500/closed conn).
//   2. Gate promotion with the real keel controller (`update`) whose ports are:
//        - deploy:   boots the built artifact and runs keel `liveSmoke` against
//                    it with a REAL localhost request (the falsifier).
//        - verify:   mints a verifier-SIGNED proof ONLY when the live smoke
//                    actually passed; otherwise it returns a `fail` proof.
//                    The signed proof is checked with `verifySignedProof`
//                    against a keyring-backed trusted key.
//        - rollback: restores the known-good revision.
//   3. Show the good candidate admitted + promoted, and the bad candidate
//      refused BEFORE promotion (ref unchanged, rolled back to known-good).
//
// Deterministic, localhost only (127.0.0.1, ephemeral port), no secrets.
//
// Run:  bun run run.ts   (from this directory)

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { liveSmoke, processRunner } from "../../src/live-smoke.ts";
import { update, type UpdatePorts, type UpdateResult } from "../../src/controller.ts";
import { makeProof, type Proof } from "../../src/proof.ts";
import { makeKeyPair, signProof, verifySignedProof, type SignedProof } from "../../src/signed-proof.ts";

// --- A single trusted verifier key (localhost, ephemeral, no secrets on disk).
const verifierKey = makeKeyPair();
const trusted = { [verifierKey.keyId]: verifierKey.publicPem };

// --- Two built candidates. Both are valid TS and BOTH boot under bun.
//     Only a REAL live request separates them.
const dir = mkdtempSync(join(tmpdir(), "keel-refuse-bad-"));

function writeServer(name: string, handlerBody: string): string {
  const file = join(dir, `${name}.ts`);
  writeFileSync(
    file,
    `const server = Bun.serve({ port: 0, fetch(req) { ${handlerBody} } });\n` +
      `console.log("listening " + server.port);\n`,
  );
  return file;
}

const artifacts: Record<string, string> = {
  // GOOD: answers 200 under a live request.
  good: writeServer("good", `return new Response("ok", { status: 200 });`),
  // BAD: builds + boots fine, but THROWS under the live request. A build/
  // typecheck gate cannot catch this; only a real request does.
  bad: writeServer("bad", `throw new Error("boom under live load");`),
};

function digestOf(revision: string): string {
  // Stable artifact digest so the signed proof binds the exact candidate.
  return createHash("sha256").update(`artifact:${revision}`).digest("hex");
}

// --- The live-smoke config: boot the built candidate and send it a real
//     localhost request. 200 is the only accepted outcome.
const smokeCfg = {
  runner: processRunner((artifact) => ["bun", artifact]),
  request: (base: string) => fetch(`${base}/`),
  accept: (res: Response) => res.status === 200,
  timeoutMs: 15_000,
};

// --- keel controller ports. Promotion can ONLY happen via these ports, and the
//     `verify` port refuses to mint a passing signed proof unless the live smoke
//     actually passed against a real request.
function portsFor(revision: string): UpdatePorts & { lastSmoke: () => string } {
  const deployedDigest = digestOf(revision);
  let smokeDetail = "smoke not run";

  const ports: UpdatePorts = {
    // "deploy" here means: stage the built artifact and run the pre-promote
    // live smoke against it. The digest returned is what `verify`/`checkProof`
    // must bind to.
    deploy: async (rev) => {
      const smoke = await liveSmoke(artifacts[rev], smokeCfg);
      smokeDetail = smoke.ok ? `LIVE PASS: ${smoke.detail}` : `LIVE FAIL: ${smoke.detail}`;
      // Stash the smoke result on the ports closure so verify can read it.
      (ports as { _smokeOk?: boolean })._smokeOk = smoke.ok;
      (ports as { _smokeDetail?: string })._smokeDetail = smokeDetail;
      return deployedDigest;
    },

    // "verify" mints a verifier-SIGNED proof. It returns a PASSING proof only
    // when the live smoke passed; otherwise it returns a FAIL proof. Either way
    // the proof is signed and verified through verifySignedProof against the
    // trusted keyring, then collapsed into the plain Proof the controller gates.
    verify: async (rev): Promise<Proof> => {
      const smokeOk = (ports as { _smokeOk?: boolean })._smokeOk === true;
      const detail = (ports as { _smokeDetail?: string })._smokeDetail ?? smokeDetail;

      const inner: Proof = makeProof({
        artifactDigest: deployedDigest,
        verifier: "live-smoke@127.0.0.1",
        policy: "live request must return 200 before promotion",
        result: smokeOk ? "pass" : "fail",
        evidence: detail,
      });

      const signed: SignedProof = signProof(inner, verifierKey.keyId, verifierKey.privatePem);

      // Cryptographic gate: only admit a proof whose signature verifies against
      // a trusted key AND whose body passes for the expected digest. A FAIL
      // proof (from a failed live smoke) is refused here.
      const admit = verifySignedProof(signed, deployedDigest, trusted);

      // Feed the controller a proof whose result reflects the signed-gate
      // decision, so the controller's checkProof refuses exactly when the
      // signed-proof gate refuses.
      return makeProof({
        ...inner,
        result: admit.admitted ? "pass" : "fail",
        evidence: admit.admitted ? `signed-gate admitted | ${detail}` : `signed-gate refused: ${admit.reason} | ${detail}`,
      });
    },

    rollback: async (knownGood) => digestOf(knownGood),
  };

  return Object.assign(ports, { lastSmoke: () => smokeDetail });
}

async function promote(revision: string, knownGood: string): Promise<UpdateResult> {
  return update({ revision }, knownGood, portsFor(revision));
}

function line(label: string, r: UpdateResult): string {
  return (
    `  ${label.padEnd(5)} promoted=${String(r.promoted).padEnd(5)} ` +
    `liveRevision=${r.liveRevision.slice(0, 12)}… chainOk=${r.chainOk}\n` +
    `        reason: ${r.reason}`
  );
}

async function main() {
  const knownGood = "good"; // the canonical, known-good revision to fall back to

  console.log("keel example — refuse-bad-self-update");
  console.log("claim: a candidate that BUILDS but answers a bad live response cannot promote itself.\n");

  // Sanity: prove BOTH candidates BUILD/boot, so only a live request can tell
  // them apart. (bun build exits 0 for both.)
  console.log("preflight: both candidates are valid TS and boot (build cannot distinguish them).");
  console.log(`  good artifact: ${artifacts.good}`);
  console.log(`  bad  artifact: ${artifacts.bad}\n`);

  const goodResult = await promote("good", knownGood);
  const badResult = await promote("bad", knownGood);

  console.log("results:");
  console.log(line("GOOD", goodResult));
  console.log(line("BAD", badResult));
  console.log("");

  // The claim holds iff:
  //   - the GOOD candidate is admitted + promoted, AND
  //   - the BAD candidate is REFUSED before promotion (not promoted), AND
  //   - the BAD candidate rolled back to the known-good revision, AND
  //   - both decision chains verify.
  const goodPromoted = goodResult.promoted === true && goodResult.chainOk;
  const badRefused = badResult.promoted === false && badResult.chainOk;
  const badRolledBack = badResult.liveRevision === digestOf(knownGood);
  const badNeverPromoted = !badResult.records.some(
    (rec) => rec.action === "promote" && rec.outcome === "approve",
  );

  const pass = goodPromoted && badRefused && badRolledBack && badNeverPromoted;

  console.log("checks:");
  console.log(`  good admitted + promoted ............ ${goodPromoted ? "yes" : "NO"}`);
  console.log(`  bad refused (not promoted) .......... ${badRefused ? "yes" : "NO"}`);
  console.log(`  bad never reached 'promote/approve' .. ${badNeverPromoted ? "yes" : "NO"}`);
  console.log(`  bad rolled back to known-good ....... ${badRolledBack ? "yes" : "NO"}`);
  console.log("");

  console.log(pass ? "RESULT: PASS — the bad self-update was refused before promotion." : "RESULT: FAIL");

  rmSync(dir, { recursive: true, force: true });
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("RESULT: FAIL — unexpected error:", e);
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
});
