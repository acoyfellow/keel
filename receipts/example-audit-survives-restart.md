# Receipt: audit-survives-restart

**Claim (falsifiable):** "keel trust and audit survive a process restart and
detect an out-of-band tamper."

**Artifact:** `examples/audit-survives-restart/run.ts` — `bun run` it.

---

## Observed

Running `bun run examples/audit-survives-restart/run.ts` (twice, identical output):

```
  ok   keyring reloaded from disk — loaded 2 key entries
  ok   decision chain reloaded from disk — loaded 3 records
  ok   revocation survives restart — status={"trusted":false,"reason":"key revoked"}
  ok   signer still trusted after restart — status={"trusted":true}
  ok   decision chain verifies after restart — verifySignedChain -> {"ok":true,"brokenIndex":null}
  ok   keyring tamper detected (checksum) — Error: persisted store 'keyring' failed checksum
  ok   decision chain tamper detected (chain break) — verifySignedChain -> {"ok":false,"brokenIndex":1,"reason":"tampered record"}

RESULT: PASS (7/7 checks)
```

Exit code 0. Temp dir created under `os.tmpdir()` and removed in `finally`
(verified: no `keel-audit-*` dirs remain). No network, no secrets persisted
beyond the throwaway dir.

## Projected (what I expected before running)

- The keyring `snapshot()`/`restore()` round-trip would carry `revokedAt`
  through disk, so `status()` after restart still returns
  `{trusted:false, reason:"key revoked"}`.
- The hash-chained, signed decision records would re-verify against the
  reloaded public PEM with `verifySignedChain(...).ok === true`.
- A byte edit to the keyring payload (leaving the stored checksum) would raise
  `TamperError` from `loadProtected` (checksum mismatch).
- A byte edit to a decision record's `outcome` would make `verifySignedChain`
  return `{ok:false, brokenIndex:1, reason:"tampered record"}`.

## Realized (what actually happened)

All four projections held; 7/7 checks PASS, exit 0, deterministic across runs.
One detail had to be made explicit: persistence wraps the chain in a checksum
envelope too. A naive payload edit is caught by the *checksum* before the
crypto chain verifier ever runs. To actually exercise the audit trail's own
defense (chain-break detection), the example re-computes the file-level
checksum after the edit — modelling an attacker who controls the storage file
(can recompute a SHA-256 over bytes) but cannot forge ed25519 signatures or
chain hashes. With that, the break is caught by `verifySignedChain`, not by the
outer checksum. This is the honest, stronger test.

---

## Two-faced adversarial review

**Pro (why this supports the claim):**
- Trust state is reconstructed *only* from disk in a fresh `FileStore` +
  `Keyring.restore` — no in-memory carryover — and the revocation still fires.
  That is a genuine restart of the trust decision.
- The decision chain re-verifies after reload, and two independent tamper
  vectors are each caught by the mechanism designed for them: keyring by
  checksum (it has no per-entry signatures), chain by hash+signature.
- Deterministic and self-cleaning; reproducible by anyone with `bun`.

**Anti (strongest attack on this receipt / what is NOT proven):**
- **Strongest attack — the "restart" is a fiction in one process.** I simulate
  restart by discarding object references and re-reading the same files in the
  same process. A real restart (separate OS process, cold module state, FS
  cache eviction, partial/torn writes, concurrent writers, fsync ordering) is
  NOT exercised. Nothing here proves durability against crash-during-write or
  atomicity of `saveProtected` (it's a plain `writeFileSync`, not atomic).
- **The checksum is not a security boundary against a file-controlling
  attacker.** SHA-256 over the payload with the checksum stored *next to* it
  means anyone who can edit the file can recompute the checksum. The keyring
  tamper is only "detected" because the test deliberately left the old checksum;
  an attacker who recomputes it defeats the keyring check entirely. The keyring
  has no signatures — so trust integrity at rest rests on the *store* being
  trusted, which the example's own chain-tamper step shows is a weak assumption.
- **No key-compromise scenario.** If the signer's private key leaks, a forged
  chain verifies cleanly. This proves tamper-evidence, not unforgeability under
  key theft.
- **Single key, tiny chain, fixed clock.** No rotation overlap, no
  revocation-then-rotation interplay, no clock-skew between sign-time and
  verify-time, no large-chain performance/ordering edge cases.
- **TransparencyLog imported conceptually but not exercised here** — the claim
  scoped to keyring + signed-decision; transparency-log restart/consistency is
  out of scope and unproven by this receipt.

---

## One-line distillation

keel's revocation state and signed decision chain reconstruct from disk alone
and stay tamper-evident — but the keyring's at-rest integrity depends on a
trusted store (checksum ≠ signature), and "restart" here is in-process, so
crash/atomicity/key-compromise durability remains unproven.
