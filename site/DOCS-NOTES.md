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

## Round 2 (cleared structural list)

Fixed Kevin's round-1 items 1-3:
- Extracted shared primitives (.shell, .eyebrow, .lead, .section, .section-heading,
  .command-rail) into src/lib/primitives.css, imported once in +layout. One source
  of truth; docs and landing share it.
- Deleted dead nav/footer CSS from the landing (it moved into Topbar/Footer
  components). Build shows no unused-selector warnings.
- Unified section spacing on the global .section (var(--space-20)). No more
  16-vs-20 drift between pages.

Remaining before sign-off: deploy to keel.coey.dev and one final visual polish
pass (cramped/empty states, mobile, tag legibility on white).

## Round 3 (type-scale consistency) + deploy blocker

Fixed: docs section headings matched the landing scale (clamp(1.75rem,3vw,2.5rem))
instead of a fixed 1.6rem. Pages now share the same heading rhythm.

BLOCKED ON DEPLOY: keel.coey.dev cannot be deployed from here. alchemy.run.ts
requires ALCHEMY_PASSWORD + CLOUDFLARE_API_TOKEN + ALCHEMY_STATE_TOKEN (remote
state); none are in env and keel.coey.dev resolves to nothing. Needs the owner to
either supply those / run `bun run deploy`, or approve switching keel/site to
local-state + OAuth login (like executor-cloudflare). Until then the terminal
condition (live at keel.coey.dev) cannot be met. Docs are otherwise clean in
local dev. Holding deploy; not spinning failed deploys.
