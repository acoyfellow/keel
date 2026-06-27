# Receipt: delete-the-handrolled-gate

Observed / projected / realized, kept separate. This receipt is about one
example: `examples/delete-the-handrolled-gate/`.

The leverage claim under test (could be wrong):

> A toy owner-operated worker with its own hand-rolled deploy gate can DELETE
> that hand-rolled code by adopting keel, and end up with fewer lines AND a
> stronger gate.

## Observed (ran, deterministic, no network, no secrets)

`bun run examples/delete-the-handrolled-gate/run.ts` exits `0` with:

```
PASS  before: forged approval is ACCEPTED (weakness)        promoted sha-evil
PASS  after:  forged approval is REFUSED (strength)         refused: unknown or missing verifier key; head=sha-v1
PASS  before: stale baseline is ACCEPTED, clobbers newer head (weakness)  clobbered to sha-v2 (sha-v1b lost)
PASS  after:  stale baseline is REFUSED, newer head survives (strength)   refused: lease stale: baseline moved (CAS failed); head=sha-v1b
PASS  after:  honest deploy is ADMITTED                     promoted sha-v2

LOC carried by the owner (non-blank, non-comment code lines):
   BEFORE hand-rolled gate substrate : 41
   AFTER  keel glue                  : 25
   DELTA  (before - after)           : 16  (39% fewer)

PASS: claim holds (fewer lines AND stronger gate)
```

`tsc --noEmit --strict` over the three example files: clean (exit 0).

What this concretely shows:
- Two attacks that the hand-rolled gate ACCEPTS, the keel-wired gate REFUSES:
  a forged approval (no private key -> no admissible signed proof) and a stale
  baseline (force-with-lease compare-and-swap rejects the clobber). The
  production ref is unchanged in both refusals.
- The keel gate still admits the honest deploy, so "stronger" is not "always
  no".
- The owner's carried code shrinks 41 -> 25 lines while gaining signing, key
  validity windows, and atomic swap that they did not write.

## What was deleted (the point)

The `before/` gate's substrate is removed wholesale in `after/`:
- approver allow-list + name lookup  -> a signature from a trusted active key;
- shared-token string compare        -> scoped + TTL write token checked by keel;
- unconditional head write           -> `promote()` force-with-lease (CAS).

`after/gate.ts` imports `../../../src` (`promote`, `RefStore`, `signProof`) and
the proof/token types. It does not reimplement any of the gate logic.

## Projected -> realized: where this sits

The prior `receipts/RECEIPTS.md` "Projected" line said leverage is realized
"only when a second project imports the proof/decision records and deletes its
own is-this-deploy-ok / who-approved-it substrate."

This example is **the first consumer that DELETES substrate by importing keel.**
That moves the leverage from *projected* toward *realized*. Honest qualifier:
it is realized **within this repo's examples**, not yet in an external
owner-operated worker's real deploy path. So:

- Realized: keel can absorb a hand-rolled gate; the deletion is real code, the
  strength gain is demonstrated by attacks, the LOC delta is measured.
- Still projected: an *out-of-tree* worker doing the same against its live
  deploy. That remains the bar for "Realized later (observed downstream use)".

## Two-faced adversarial review

**Pro (this is a real consumer):**
- `after/` genuinely deletes the gate; it does not wrap or shadow it. The
  security-critical logic is gone from the consumer and sourced from keel.
- The strength delta is not asserted, it is *executed*: the same attack inputs
  flip from accepted to refused, and the honest path still passes.
- It type-checks under the repo's strict config and imports the real modules
  named in the projected claim (controller-adjacent: promote-model + signed-proof).

**Anti (this is a staged demo):**
- The "worker" is a toy in keel's own examples dir, not an independent repo, so
  the import is intramural. A skeptic can say keel is grading its own homework.
- The BEFORE gate is *chosen* to be weak; a strawman can always be beaten. The
  forged-approval attack models "attacker copied a valid string", which is the
  unsigned gate's defining flaw — fair, but it is the flaw we picked.
- LOC counting is a methodology choice (non-blank, non-comment, between markers).
  Different rules give different numbers; 41 vs 25 is directionally honest but
  not a law of nature. And the count excludes keel/src, which is the honest
  framing but also means total system LOC went *up*, just not the owner's.

Net: a credible first realization of the deletion leverage, with the caveat
that "first external consumer in production" is still the unmet bar.

## One-line distillation

Importing keel let a toy worker delete its hand-rolled approve-and-promote gate
(41 -> 25 owner LOC) while turning two accepted attacks into refusals — the
first time keel's leverage is realized by deleting substrate, not just projected.
