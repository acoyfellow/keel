# Receipt: one-key-cant-ship

Worked backwards from a falsifiable claim to a runnable example. The claim could
be wrong; the harness exists to try to make it wrong.

**Claim under test:** "a single compromised verifier key cannot ship a bad
artifact when keel requires k-of-n signatures, and any bad authorization that
does happen is detectable after the fact."

**Artifact:** `examples/one-key-cant-ship/run.ts` (run: `bun run run.ts`).
Deterministic (fixed clock `NOW`, no `Date.now`, no network), no secrets
(ed25519 keys generated in-process and discarded).

---

## Observed (ran, output exists)

`bun run run.ts` exits 0 and prints `RESULT: PASS`. Output is byte-identical
across two consecutive runs (verified via diff). Six checks, all PASS:

- **Check 1** — one stolen key (carol), acting alone, is refused
  (`need 2 distinct trusted signers, have 1`); and the same key duplicated under
  a fake label is still refused — distinct trusted *keyIds* are what count.
- **Check 2** — a genuine quorum (alice + bob) admits, reporting exactly 2
  signers. (Guards against a gate that refuses everything.)
- **Check 2b** — stolen key plus fabricated garbage signatures cannot reach
  quorum; the thief still needs a second independent trusted party.
- **Check 3** — editing the payload of authorization entry #1 is detected
  (`entry edited @1`).
- **Check 4** — splicing out an authorization entry is detected
  (`index gap (entry removed) @1`).

Imports are the real keel modules under `../../src`: `threshold` (verifyThreshold),
`keyring` (Keyring), `transparency` (TransparencyLog/verifyLog), `signed-proof`
(makeKeyPair), `proof` (makeProof). No source under `src/` was modified.

## Projected (credible, falsifiable, not yet realized)

- This generalizes to k-of-n for any k≤n by changing two constants. A test
  matrix over (k, n, #stolen, #honest) would map the exact admit/refuse
  boundary; it is not yet written.
- A "detect → quarantine" loop (transparency break automatically freezes the
  ref) is a believable next step. Not built here; this example only *detects*.

## Realized (downstream use observed)

- None. No other module imports this example yet. This line stays empty until a
  consumer depends on it.

---

## Two-faced adversarial review

**Pro (why the claim holds here).** keel makes signers count by distinct trusted
*keyId*, not by signature-slot count, so a thief holding one key cannot inflate
itself to quorum by duplicating, relabeling, or padding with garbage — every
falsifier in Check 1/2b refused with `have 1`. The transparency log is a hash
chain where each entry binds its index and previous hash, so an edit changes the
entry hash and a removal opens an index gap; both are caught at a reportable
index (Checks 3/4). The two properties compose: prevention (k-of-n) shrinks the
blast radius of one key, and detection (the log) covers the residual.

**Anti (strongest attack / what is NOT proven).** The single strongest attack
this example does **not** defeat: **compromise of two distinct trusted keys**
(or k of them). k-of-n is a *threshold*, not a guarantee — steal alice AND bob
and the bad artifact ships, fully "admitted," and Check 2's path would wave it
through. The harness only proves resistance at k-1 compromise, not k.

Further unproven by this example, stated plainly:
- **Owner root is still ultimate authority.** Whoever controls the keyring can
  `add`/`revoke`/`rotate` keys (and could rewrite who the n are) and is trusted
  to keep an honest, append-only copy of the log. Compromise the root and both
  properties dissolve. This example assumes an honest root; it does not defend
  the root.
- **Detection ≠ prevention, and detection ≠ alerting.** The log catches tamper
  *if someone verifies it against a pinned head*. Nothing here forces anyone to
  look, nor stops a bad-but-validly-signed authorization from being appended
  honestly. `verifyLog` over a fully-recomputed forged chain (rebuilt from a new
  root) is out of scope — that collapses to the root-compromise case above.
- **No liveness / no key-storage threat model.** HSM theft, signing-oracle
  abuse, side channels, replay across artifacts, and quorum members colluding
  are all out of scope.
- **Scope is in-process.** No network, no persistence boundary, no real CI
  signer — so it proves the *logic* of the gate, not a deployed system.

---

## One-line distillation

k-of-n stops one stolen key and the hash-chained log makes tamper detectable —
but only below the threshold and only while the owner root stays honest.
