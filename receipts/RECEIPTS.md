# Receipts

Observed / projected / realized, kept separate. Projection never wears the
costume of achievement.

## Verified now (the artifact and its evidence exist and run)

- **55 deterministic checks pass** (`receipts/tests.txt`, `bun test ./src/*.test.ts`).
  Coverage that bites:
  - signed-proof: unsigned, forged, tampered, untrusted-key, wrong-digest all refused.
  - keyring: revoked (retroactive), rotated-out, not-yet-valid, unknown all refused;
    a cryptographically valid signature from an inactive key is still refused.
  - behavioral-verifier: build-broken, runtime-throw, and non-200 candidates refused;
    a path-complete-but-collapsed tree is caught by integrity, not by luck downstream.
  - promote-model: forged proof, stale token, replayed promotion, concurrent
    compare-and-swap race, wrong-repo token all refused with the ref unchanged.
- **One real signed + keyring-gated deploy** ran against a live Cloudflare service
  (`receipts/live-gated-deploy.txt`): candidate built (evidence bound), good path
  admitted and promoted via force-with-lease, a REVOKED verifier key rejected with
  the production ref unchanged, authenticated health green (200 + serverInfo, unauth
  302), then canonical restored.

## Negative results (first-class, recorded so they are not relearned)

- No native Artifacts repo import over the REST API: `POST /repos` accepts a
  `source` field and returns success but does not import (no refs); `/repos/import`
  is 404. `import({url,branch})` is a Workers-binding feature. Large initial loads
  over git need chunked pushes.
- A single git pack above ~44MB returns HTTP 500 on push; ~200-commit chunked
  deltas succeed.
- The git server ignores `--filter=blob:none` (warns, proceeds); fetch by full SHA
  + detached checkout works regardless.
- A health probe that follows redirects reports a false pass: an Access 302
  becomes a 200 login page. Probes must use manual redirect. Found live, then made
  un-repeatable via a default manual-redirect probe.

## Projected (credible, falsifiable, not yet realized)

- Leverage: a second owner-operated worker adopts verified self-update by supplying
  ports, without rebuilding the gate. Falsifiable: it is realized only when a
  second project imports the proof/decision records and deletes its own
  "is-this-deploy-ok / who-approved-it" substrate.

## Realized later (observed downstream use)

- None yet. The executor-on-cloudflare integration is the first candidate consumer;
  this line stays empty until that import exists and deletes substrate.

## Update: residual gaps closed (verified now)

75 tests pass across 14 files. The four gaps from the first cut are closed with
deterministic tests:

- `live-smoke`: boots the built candidate, sends a real request pre-promote;
  builds-but-throws, non-200, and never-listens are all rejected (no hang).
- `minting`: write token issued only against a passing signed proof; promoter
  self-mint rejected; a leaked token cannot promote a different candidate.
- `persistence`: keyring + signed decision chain survive reload (revocations and
  rotations intact, chain verifies); an out-of-band store edit fails checksum.
- `threshold` + `transparency`: k-of-n requires k distinct trusted active keys
  (one compromised key cannot admit); the transparency log detects edits,
  removals, and rewrites against a pinned head.

Still projected, not realized: no second project has imported the proof/decision
records and deleted its own substrate yet. The default runner and file store are
reference implementations; a hosted runner and a KV/DO/D1 store are integrator
work behind the existing ports.
