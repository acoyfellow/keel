# Docs notes — Kevin Kipp adversary loop

Not signed off yet. Iterating in local dev.

## Round 1 (built /docs, shared Topbar/Footer)

Shipped: a /docs route (what it is, quickstart that runs, five concepts, the
five examples, deploy, honest limits), shared `Topbar`/`Footer` components, light
theme + squircle mark consistent. `/` and `/docs` build and return 200; the
quickstart example runs; 75 keel tests still pass.

### Kevin's unmet conditions (round 1)
1. **Two sources of truth.** `.eyebrow`, `.section`, `.lead`, `.command-rail`
   are defined scoped in BOTH `+page.svelte` and `docs/+page.svelte`. Extract to
   one place (global app.css utilities or a shared primitive) so they cannot
   drift. A docs site with two copies of its section style is not minimal.
2. **Dead CSS.** The landing still carries `.topbar`/`.footer`/`.brand` styles
   (5 blocks) that moved into the components. Delete them.
3. **Spacing drift.** Docs sections use `--space-16`; landing uses `--space-20`.
   Pick one rhythm and apply it on both pages.
4. **Misleading import (fixed this round).** Deploy showed `from 'keel'`; keel is
   not on npm. Now a path import with a note.

### Next round
Extract shared section/eyebrow/lead/command-rail primitives, delete the dead
landing CSS, unify section spacing, then re-review for cramped/empty states and
mobile. Deploy to keel.coey.dev once Kevin's list is empty.
