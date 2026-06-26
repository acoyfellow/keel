# keel

a self-updating worker that promotes a bad version of itself, and now the live
service is broken and the rollback target is whatever you can remember at 2am.

## promise

keel admits a new version only when a signed, artifact-bound proof says it is
good, promotes by compare-and-swap against the known baseline, and rolls back to
an explicit known-good revision when it is not. the audit trail is hash-chained
and signed, so it survives the incident.

it is a control plane for owner-operated software on Cloudflare. it knows nothing
about any particular app. you supply the deploy, verify, and storage; keel owns
the decision.

## quick start

```ts
import { buildAndSmoke, signProof, makeProof, Keyring, verifySignedProof } from "keel";

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

## proof

evidence lives in `receipts/`, not in this prose.

- `receipts/tests.txt` — 55 passing behavioral checks (signed-proof forgery,
  keyring revocation/rotation, build+smoke rejection, negative-auth attacks).
- `receipts/live-gated-deploy.log` — one real signed + keyring-gated deploy ran
  against a live Cloudflare service: good path admitted and promoted, a revoked
  verifier key was rejected with the production ref unchanged, authenticated
  health (200 + serverInfo, unauth 302) green, then it restored canonical.
- `receipts/RECEIPTS.md` — the observed / projected / realized ledger, including
  the negative results (no native Artifacts import over REST; a per-push
  pack-size limit; a collapsed-tree candidate caught by integrity, not luck).

## how it works

one flow, content in, decision out:

```text
candidate (git/Artifacts commit = content digest)
  -> verifier: tree integrity + injected build + smoke  -> evidence
  -> signed proof binds evidence to that exact digest
  -> keyring: signature valid AND key active (rotation/revocation) ?
  -> promote-model: scoped expiring token + force-with-lease vs baseline
  -> admitted: promote ; refused: roll back to the supplied known-good
  -> every step appended to a hash-chained, signed decision log
```

the load-bearing primitive is content addressing: a git/Artifacts commit hash is
the artifact identity, so a proof, a promotion, and a rollback all name the same
exact bytes. force-with-lease makes promotion a compare-and-swap, so a candidate
cannot clobber production if the baseline moved underneath it.

## what it deliberately does not do

keel does not deploy, does not talk to Cloudflare, and does not hold your
secrets. callers inject deploy / verify / rollback / storage / credentials. keel
decides; the ports act. a write token alone cannot promote without a passing
signed proof; a valid proof cannot promote if the baseline moved.

## where you edit behavior

the policy is the trusted keyring, the build+smoke commands, and the known-good
revision you supply to the controller. there is no hidden gate.

## what this makes possible next

keel is the extracted control plane from the executor-on-cloudflare notebook. the
leverage claim: any owner-operated worker that can name its versions by content
digest can adopt verified self-update without rebuilding the gate. the proof and
decision records are portable, so a second project consuming them deletes its own
hand-rolled "is this deploy ok / who approved it" substrate. that is projected
until a second notebook cites the schema; the executor integration is the first
candidate consumer.

## residual gaps (honest)

- the build+smoke gate runs before promotion but is not a full pre-promote live
  environment.
- the scoped token type models authorization; a real minting role and policy are
  still needed.
- the keyring and decision log are in memory; both need durable, protected
  persistence.
- a compromised owner root, or a verifier key valid at signing time, can still
  authorize a bad artifact.

MIT. version stays `0.0.1`; this is an extracted primitive, not a product.
