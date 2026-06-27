# keel

A self-updating worker promotes a bad version of itself, the live service
breaks, and the rollback target is whatever you can remember at 2am.

## Promise

keel admits a new version only when a signed, artifact-bound proof says it is
good, promotes by compare-and-swap against the known baseline, and rolls back to
an explicit known-good revision when it is not. The audit trail is hash-chained
and signed, so it survives the incident.

It is a control plane for owner-operated software on Cloudflare, and it knows
nothing about any particular app. You supply the deploy, verify, and storage;
keel owns the decision.

## Quick Start

```ts
import { buildAndSmoke, signProof, makeProof, Keyring, verifySignedProof } from "./src/index.ts";

// 1. behavioral gate: actually build and smoke-run the candidate
const ev = buildAndSmoke(candidateDir, {
  buildCmd: ["bun", "build", "src/index.ts", "--outfile", "dist/out.js", "--target", "bun"],
  outputFile: "dist/out.js",
  smokeCmd: (out) => ["bun", "smoke.ts", out],
});

// 2. bind a signed proof to the exact artifact + that evidence
const proof = signProof(
  makeProof({ artifactDigest: candidateSha, verifier: keyId, policy: "build-smoke@1",
              result: ev.ok ? "pass" : "fail", evidence: `build=${ev.ok}` }),
  keyId, privatePem,
);

// 3. admit only if the proof verifies against a trusted, active key
const ring = new Keyring();
ring.add({ keyId, publicPem, notBefore: 0 });
const admitted = ring.status(keyId, Date.now()).trusted
  && verifySignedProof(proof, candidateSha, { [keyId]: publicPem }).admitted;
// promote (compare-and-swap) only when admitted; else roll back to known-good.
```

```sh
bun install
bun test        # 55 deterministic checks across the gate
```

## Proof

The receipts hold the evidence.

- `receipts/tests.txt` — 55 passing behavioral checks (signed-proof forgery,
  keyring revocation/rotation, build+smoke rejection, negative-auth attacks).
- `receipts/live-gated-deploy.txt` — one real signed and keyring-gated deploy ran
  against a live Cloudflare service: good path admitted and promoted, a revoked
  verifier key rejected with the production ref unchanged, authenticated health
  (200 + serverInfo, unauth 302) green, then canonical restored.
- `receipts/RECEIPTS.md` — the observed / projected / realized ledger, with the
  negative results (no native Artifacts import over REST, a per-push pack-size
  limit, a collapsed-tree candidate caught by integrity rather than luck).

## How It Works

The flow:

```text
candidate (git/Artifacts commit = content digest)
  -> verifier: tree integrity + injected build + smoke  -> evidence
  -> signed proof binds evidence to that exact digest
  -> keyring: signature valid AND key active (rotation/revocation) ?
  -> promote-model: scoped expiring token + force-with-lease vs baseline
  -> admitted: promote ; refused: roll back to the supplied known-good
  -> every step appended to a hash-chained, signed decision log
```

The load-bearing primitive is content addressing: a git or Artifacts commit hash
is the artifact identity, so a proof, a promotion, and a rollback all name the
same exact bytes. force-with-lease makes promotion a compare-and-swap, so a
candidate cannot clobber production if the baseline moved underneath it.

## What It Deliberately Does Not Do

keel does not deploy, does not talk to Cloudflare, and does not hold your
secrets. Callers inject deploy, verify, rollback, storage, and credentials. keel
decides; the ports act. A write token alone cannot promote without a passing
signed proof, and a valid proof cannot promote if the baseline moved.

## Where You Edit Behavior

The policy is the trusted keyring, the build and smoke commands, and the
known-good revision you supply to the controller. There is no hidden gate.

## What This Makes Possible Next

keel is the extracted control plane from the executor-on-cloudflare notebook. The
leverage claim: any owner-operated worker that can name its versions by content
digest can adopt verified self-update without rebuilding the gate. The proof and
decision records are portable, so a second project consuming them deletes its own
hand-rolled "is this deploy ok / who approved it" substrate. That is projected
until a second notebook cites the schema; the executor integration is the first
candidate consumer.

## Residual Gaps

- The build and smoke gate runs before promotion, but it is not a full
  pre-promote live environment.
- The scoped token type models authorization; a real minting role and policy are
  still needed.
- The keyring and decision log are in memory; both need durable, protected
  persistence.
- A compromised owner root, or a verifier key valid at signing time, can still
  authorize a bad artifact.

MIT, version `0.0.1`. Extracted from the executor notebook, kept small.
