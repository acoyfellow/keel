# Docs build notes (for the loop)

Recon done. Build on this; do not re-derive each run.

## Shape to mimic
- vibe-cdn: clean multi-page docs site (overview / docs / install), honest tone
  ("the honest version", candid prereqs/costs), sober sections with eyebrows,
  markdown docs that travel with the repo in `docs/`.
- molt: lean sober THESIS-style claim doc, minimal, `0.0.1` honesty.

## Stack (already here)
- SvelteKit + adapter-cloudflare + alchemy. Light theme + img-gen squircle mark.
- Deploy: alchemy, production `domains: ['keel.coey.dev']` (alchemy.run.ts).
- Local dev iteration surface: `bun run dev` / `bun run preview`.

## Content sources
- keel/README.md (definition, what it does, who owns what, limits).
- keel/status.json (proven / unproven ledger).
- keel/examples/* (five runnable demos) and keel/receipts/* (each with a
  two-faced review). site/src/lib/site.ts already encodes the five examples.

## Structural decision (do this)
- The landing's section styles are SCOPED to +page.svelte, so a new /docs route
  cannot reuse them. Extract shared layout + section primitives into a small set
  of components (or global classes in app.css) so landing and /docs are
  consistent. Kevin will reject token/spacing drift between pages.
- Add a /docs route: what it is, install/quickstart (commands that RUN), core
  concepts (proof, keyring, threshold, promote, decision), the five examples
  with what each proves, deploy, honest limits. Keep it minimal; delete noise.

## Voice
Title-case headings, sentence case. No arrows in prose, no "X not Y", no
apophasis, no "seven-minute" slop, no triads-for-rhythm. Every command must run.

## Adversary
Kevin Kipp (FE craft/taste/minimal) signs off; borrow Pete's "does quickstart
run on a clean machine". Record each round's unmet conditions and the fixes.
