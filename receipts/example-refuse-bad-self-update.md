# Receipt: refuse-bad-self-update

Worked backwards from a falsifiable claim to a runnable keel example.

**Claim (could be wrong):** *a candidate worker that BUILDS but returns a bad
response under a real live request cannot promote itself.*

**Example:** `examples/refuse-bad-self-update/run.ts` (`bun run run.ts`).

Kept in observed / projected / realized shape. Projection does not wear the
costume of achievement.

---

## Observed (the artifact and its evidence exist and run now)

Running `bun run examples/refuse-bad-self-update/run.ts` exits **0** and prints
**`RESULT: PASS`**. Re-ran 3× back to back: all exit 0 (deterministic; localhost
127.0.0.1 ephemeral port, no secrets).

What it actually does, using real keel modules (`../../src`):

- Writes **two** server artifacts to a temp dir. Both are valid TypeScript and
  **both BUILD/boot** — independently verified: `bun build` exits 0 for both, so
  a build/typecheck gate alone cannot distinguish them. The only difference is
  live behavior:
  - `good`: answers HTTP **200** on a real request.
  - `bad`: boots fine, then **throws** under the live request.
- Promotion is gated by the real keel controller `update()` (`src/controller.ts`)
  whose ports run the actual gate:
  - `deploy` boots the built artifact and runs keel `liveSmoke`
    (`src/live-smoke.ts`) with a **real localhost fetch**; only status 200 is
    accepted.
  - `verify` mints a verifier-**signed** proof (`signProof`) and admits it only
    through `verifySignedProof` against a trusted keyring; it yields a `pass`
    proof iff the live smoke passed, else `fail`.
  - `rollback` restores the known-good revision.
- Observed outcome:
  - **GOOD**: `promoted=true`, `reason: proof passed`, `chainOk=true`.
  - **BAD**: `promoted=false`, `reason: verifier reported failure`,
    `chainOk=true`, live ref rolled back to the known-good digest, and **no**
    `promote/approve` record ever appears in its hash-chained decision log.

The PASS gate is conjunctive: good admitted+promoted AND bad not-promoted AND
bad never reached `promote/approve` AND bad rolled back to known-good AND both
decision chains verify.

## Projected (credible, falsifiable, not yet realized here)

- The same gate in front of a hosted runner (real Workers deploy + real edge
  request) instead of a localhost `bun` process. Falsifiable: realized only when
  a deployed candidate that 500s under a live edge request is refused promotion
  with the production ref unchanged. (The `live-gated-deploy` receipt shows the
  signed+keyring deploy path against a live service; this example does not re-run
  that.)

## Realized (observed downstream use)

- None. No external consumer imports this example's wiring yet. Line stays empty
  until that exists.

---

## Two-faced adversarial review

**Pro-AI (why this supports the claim).** The two candidates are constructed to
be indistinguishable to everything *except* a live request: both are valid TS
and both `bun build` to exit 0, so a compile/typecheck/static gate would wave
both through. The only discriminator wired into promotion is a real localhost
request via keel's `liveSmoke`, and the bad candidate — which throws under that
request — is refused *before* any `promote/approve` record is written, then
rolled back to known-good, with the decision chain verifying. Promotion is not
reachable except through ports that demand a *signed, digest-bound, passing*
proof, and a failed live smoke produces a `fail` proof that the signed-proof
gate refuses. So within this harness the claim is demonstrated mechanically, not
asserted.

**Anti-AI (the strongest attack / what it does NOT prove).** This proves the
claim only for the failure mode it chose to inject (an exception → non-200) under
a single `GET /` against a local `bun` process. "Returns a bad response" is far
larger than "throws": a candidate that returns a *200 with a wrong/poisoned body*
sails through, because `accept` checks only `res.status === 200`. The example is
also self-refereed — the same code that runs the smoke also mints and trusts the
proof key in-process, so it shows the *gate's plumbing* is sound, not that a real
adversary couldn't bypass it (e.g. a candidate that detects the smoke probe and
behaves only during it, an environment mismatch between localhost and edge, or a
candidate that supplies its own pre-signed proof). It does not exercise a hosted
deploy, network faults, or concurrency. So it proves "this gate refuses *this*
class of build-passes-but-live-fails candidate," not the universal "any bad
response is unpromotable."

**Distillation:** Honest verdict — **partially proven**: a candidate that builds
but throws/non-200s on a real live request is provably refused before promotion;
"bad response" in the broader sense (valid-status-wrong-content, probe-aware, or
edge-only failures) is not yet covered.
