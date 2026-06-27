# delete-the-handrolled-gate

A before/after that tests one falsifiable claim:

> A toy owner-operated worker with its own hand-rolled deploy gate can
> **DELETE** that hand-rolled code by adopting keel, and end up with **fewer
> lines AND a stronger gate**.

## Run

```sh
bun run examples/delete-the-handrolled-gate/run.ts
```

Deterministic, no network, no secrets (an ephemeral ed25519 key is generated
in-process for each scenario). Exit code `0` means the claim held.

## Layout

- `before/gate.ts` — the worker's own gate: ad-hoc booleans, an approver
  allow-list, a shared-token string compare, and an **unconditional** head
  write. No signing, no compare-and-swap. The owner maintains all of it.
- `after/gate.ts` — that gate is **deleted**. What remains is glue that imports
  keel's `promote` + `signProof` + `RefStore` and hands them deploy-shaped
  data. Signing, key windows, and force-with-lease come from `keel/src` and are
  not the owner's burden.
- `run.ts` — exercises both and prints `PASS`/`FAIL` plus the LOC delta.

## Why AFTER is stronger (two attacks)

| Attack | BEFORE | AFTER |
| --- | --- | --- |
| **Forged approval** (copy/guess the credential strings) | accepted — an unsigned gate can't tell a copied string from a real one | refused — authorization is an ed25519 signature from a trusted, active key the attacker doesn't hold |
| **Stale baseline** (promotion built against an old head) | accepted — head is written unconditionally, clobbering newer work (lost update) | refused — `promote()` uses compare-and-swap; the stale lease no longer matches the live head |

AFTER still **admits the honest path** (sanity check), so it isn't a brick that
just says no.

## LOC

`run.ts` counts non-blank, non-comment code lines between the `BEGIN/END`
markers in each gate: the substrate the owner actually carries.

- BEFORE hand-rolled gate substrate: **41**
- AFTER keel glue: **25**
- Delta: **16 fewer (39%)**

The honest framing: AFTER doesn't just shrink the owner's code, it moves the
hard, security-critical lines (signing, key lifecycle, atomic swap) into shared,
tested `keel/src` — so the line count understates the leverage.
