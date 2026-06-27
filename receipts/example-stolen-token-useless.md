# Receipt: stolen write token is useless without a fresh bound proof

Claim under test (could be wrong): *a leaked, still-valid write token is
useless to an attacker without a fresh signed proof for the exact candidate.*

Artifact: `examples/stolen-token-useless/run.ts` — `bun run examples/stolen-token-useless/run.ts`.
Deterministic: fixed clock (`now = 1_000_000`), no network, no secrets, no
`Date.now()`. Imports the real `minting`, `promote-model`, `signed-proof`, and
`proof` from `../../src`.

## Observed (ran, exit 0)

```
[mint]   issued write token  scope=write repo=prod/service expiresAt=1060000 (now=1000000, not expired)
[attack] reuse A's proof for B -> refused: proof refused: proof does not bind the expected artifact
[attack] forge B proof (untrusted key) -> refused: proof refused: unknown or missing verifier key
[attack] live head after attack = sha-baseline-0000 (baseline unchanged: true)
[legit]  promote A with matching proof -> head now sha-good-aaaa1111

PASS: stolen write token could not promote candidate B (no proof bound to B); legitimate A succeeded.
```

`PASS`, exit 0. `bunx tsc --noEmit` on the example: exit 0.

What the run actually establishes:
- A *real* scoped write token is minted only against a passing, trusted-key
  signed proof for candidate A (separation of duties: `mint-bot` ≠ `promoter-bot`).
- An attacker holding that exact, unexpired token cannot promote a different
  candidate B by (a) re-presenting A's proof — refused, *proof does not bind the
  expected artifact* — or (b) forging a passing proof for B with their own key —
  refused, *unknown or missing verifier key*.
- After both attacks the production ref is unchanged (`force-with-lease` baseline
  intact).
- The legitimate promotion of A with the matching proof succeeds and advances the
  head.

## Projected (credible, falsifiable, not run here)

- The same refusal should hold for *any* candidate ≠ the one bound by an
  available trusted proof, not just the two SHAs hard-coded here; the guard keys
  on `artifactDigest` equality (`proof.ts`), so this is a structural property, not
  a fixture coincidence. Falsifiable: fuzz candidate strings and assert refusal
  whenever no trusted proof binds the candidate.
- In a live deploy the token is also short-lived; here TTL is set so the token
  never expires, isolating the *proof-binding* defense from the *expiry* defense.

## Realized later (downstream)

- None yet. This becomes "realized" when a real promoter path (e.g. the live
  smoke / gated deploy flow) refuses a recorded stolen-token replay against a
  production ref. Stays empty until that observation exists.

## Two-faced adversarial review

**Pro.** The demonstration is honest about the mechanism: the token carries no
authority of its own. `promote()` independently re-runs `verifySignedProof` over
the candidate before touching the ref, so possession of a valid token is
necessary but not sufficient. Both realistic attacker moves are shown — reuse the
only proof in reach, and forge a new one with an attacker-controlled key — and
both fail closed for *different, named* reasons (binding mismatch; untrusted
key). The ref is asserted unchanged after the attack, so the test would catch a
silent partial promotion, not just a thrown error. It runs, typechecks, and is
deterministic.

**Anti (strongest attack / what is NOT proven).** This proves the *guard logic*
refuses, not that the system is secure. The decisive unproven assumption is the
integrity and secrecy of the *verifier's signing key*: the entire claim collapses
if the attacker can obtain a signed passing proof for B — by stealing the
verifier private key, by compromising the verifier/CI so it signs a malicious
candidate as "pass", or by getting B mis-bound as A upstream of the digest. The
example trusts `makeKeyPair()` output and assumes the digest faithfully names the
artifact; it does not verify that the artifact at `CANDIDATE_A` is what the proof
inspected (no content-addressing check here), nor does it exercise the *minting*
path under attack with this token (it only exercises `promote`). It is in-memory:
no real ref store, no concurrency, no network, no time. A leaked token plus a
leaked *proof-signing capability* would defeat this; "useless without a fresh
bound proof" is exactly as strong as "the attacker cannot manufacture a fresh
bound proof," which this run assumes rather than proves.

## Distillation

A stolen write token is inert because authority lives in a fresh trusted-key
proof bound to the exact candidate — so the claim holds only as far as the
verifier's signing key stays uncompromised.
