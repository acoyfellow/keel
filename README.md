# keel

keel is a provider-agnostic control plane for verified self-update of
owner-operated software. A candidate version is identified by content, such as a
git or Artifacts commit. keel decides whether that candidate may replace the
running one; it does not deploy, contact any provider, or hold credentials.

The caller supplies deployment, verification, storage, and credential plumbing as
injected ports. keel runs no network call unless one of those ports makes it.
Trust rests on three things the owner controls: the promotion credential, the
trusted verifier keyring, and the known-good revision supplied before any change.

## What It Does

- **Behavioral gate** — builds the candidate and runs it under a real request
  before promotion. A candidate that builds but fails a live request is refused.
- **Signed proof** — an Ed25519, artifact-bound record states what the verifier
  observed. A proof is admitted only for the exact content digest it names.
- **Keyring** — verifier keys carry validity windows, rotation, and revocation. A
  valid signature from a revoked or rotated-out key is refused.
- **Threshold** — k-of-n distinct trusted keys must sign. One compromised key
  cannot admit alone.
- **Minting** — a short-lived, repo-scoped write credential is issued only against
  a passing signed proof, by a role separate from the promoter.
- **Promotion** — compare-and-swap against the known baseline. A candidate cannot
  clobber production if the baseline moved underneath it.
- **Decisions** — every step is hash-chained and signed, and survives a restart.
- **Transparency log** — an append-only record where an edited or removed
  authorization is detectable after the fact.

```text
candidate (content digest)
        │
        ▼
 verifier: tree integrity + build + live smoke  ->  evidence
        │
        ▼
 signed proof (artifact-bound) + keyring (active key, k-of-n)
        │
   ┌────┴────────┐
   ▼             ▼
 admitted      refused
 promote       roll back to known-good
 (force-with-lease vs baseline)
        │
        ▼
 hash-chained signed decision log
```

## Quick Start

```ts
import {
  buildAndSmoke,
  makeProof,
  signProof,
  verifySignedProof,
  Keyring,
} from "./src/index.ts";

// 1. Build and smoke-run the candidate. This is the gate, not a guess.
const gate = buildAndSmoke(candidateDir, {
  buildCmd: ["bun", "build", "src/index.ts", "--outfile", "dist/out.js", "--target", "bun"],
  outputFile: "dist/out.js",
  smokeCmd: (out) => ["bun", "smoke.ts", out],
});

// 2. Describe what the verifier saw, bound to this exact artifact.
const claim = makeProof({
  artifactDigest: candidateSha,
  verifier: keyId,
  policy: "build-smoke@1",
  result: gate.ok ? "pass" : "fail",
  evidence: `build=${gate.ok}`,
});

// 3. Sign the claim with the verifier key.
const proof = signProof(claim, keyId, privatePem);

// 4. Set up the trusted keyring.
const ring = new Keyring();
ring.add({ keyId, publicPem, notBefore: 0 });

// 5. Admit only when the key is trusted and active, and the signature verifies.
const keyActive = ring.status(keyId, Date.now()).trusted;
const proofValid = verifySignedProof(proof, candidateSha, { [keyId]: publicPem }).admitted;

if (keyActive && proofValid) {
  // promote by compare-and-swap against the known baseline
} else {
  // roll back to the known-good revision
}
```

```sh
bun install
bun test
```

## Who Owns What

| Layer | Responsibility |
|---|---|
| **Owner** | The promotion credential, the trusted verifier keyring, and the known-good revision. The owner root remains the ultimate authority. |
| **keel** | The decision: gate, proof check, key validity, threshold, compare-and-swap, decision log. No deployment, no network, no secrets. |
| **Caller ports** | Deployment, verification runner, durable storage, and credential minting. Each port retains its own authority; keel only decides whether to call promote. |

## Evidence

- `receipts/tests.txt` — 75 deterministic checks across the gate (signed-proof
  forgery, keyring revocation and rotation, threshold quorum, build and live
  smoke rejection, persistence reload and tamper, negative-auth attacks).
- `examples/` — five runnable demos, each worked backwards from a claim that
  could be wrong. `status.json` is the proven and unproven ledger; each receipt
  carries the case for the claim and the strongest case against it.
- `receipts/live-gated-deploy.txt` — an earlier signed and keyring-gated deploy
  ran against a live Cloudflare service using keel's precursor modules: the good
  path promoted and a revoked key was rejected with the production ref unchanged.
  The recorded health probe returned a false negative by following the Access
  302; a manual-redirect probe then confirmed 200 with serverInfo and the
  unauthenticated path still 302. The reproducible evidence for keel itself is
  the tests and examples in this repo.

```sh
bun run examples/refuse-bad-self-update/run.ts     # builds-but-fails-live cannot promote
bun run examples/stolen-token-useless/run.ts       # a leaked token is useless without a fresh proof
bun run examples/one-key-cant-ship/run.ts          # one compromised key cannot reach quorum
bun run examples/audit-survives-restart/run.ts     # trust and audit survive restart, tamper detected
bun run examples/delete-the-handrolled-gate/run.ts # a worker deletes its own gate by adopting keel
```

## Important Limits

| Surface | Current boundary |
|---|---|
| Live smoke | The default runner boots a built server and sends one request. It is a reference runner, not a hosted preview environment; binding to workerd or `wrangler dev` is the integrator's job through the port. |
| Minting | The minting role and scoped token are enforced in the model. A production deployment must back the minting role with a real, separately held credential rather than an ambient token. |
| Persistence | The default `Store` is file-backed with a checksum. A KV, Durable Object, or D1 adapter implements the same interface; protecting the store at rest is the integrator's responsibility. |
| Trust root | Threshold raises the cost of a single compromise; it does not remove the owner root as ultimate authority. The keyring has no external transparency anchor by default. |
| Leverage | The "delete your hand-rolled gate" result is real inside this repo's examples. An out-of-tree owner-operated worker doing the same against its live deploy is recorded as unproven in `status.json`. |

MIT, version `0.0.1`. An extracted primitive, kept small.
