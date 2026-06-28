# keel site — final notes

## Kevin Kipp sign-off (design review on real cmux screenshots)

No remaining objections. Cleared across rounds:
- Headlines trimmed to modest sizes (no oversized). Hero clamp(2rem,4vw,3.25rem).
- Layout balanced (hero centered with the receipt proof beside it), cloudbox-clean.
- Branding: AX-warm orange accent on white, [bracket] mono eyebrows, Inter +
  IBM Plex Mono, squircle mark. Differentiated from cloudbox, same family.
- Shared Topbar/Footer + global primitives (one source of truth, no dead CSS).
- Examples grid (REFUSED red / ACCEPTED green, RECEIPT, mono command, bold
  result), numbered how-it-works rows, status dots, limits split, mono footer.
- Brand casing consistent (keel, not Keel). Copy plain, no AI-slop.
- Docs page modest and consistent.

## Deploy
Live at https://keel.coey.dev/ (200, real site). Deployed via local FileSystem
state + the alchemy OAuth login (CF token sourced from the wrangler login),
production stage, custom domain on the coey.dev zone. Confirmed 200 and verified
visually via cmux. The custom-domain edge cert provisioned slowly (~25min) and
was re-requested once via API before it activated.

## Notify
my.ax push sent via my_ax inject (URL + 200 confirmation; MCP inject cannot
attach images, so the prod screenshot at /tmp/keel-prod.png was referenced, per
the agreed image fallback).

## Residual / honest
- cmux WKWebView cannot set viewport, so mobile was verified via CSS media
  queries, not a rendered mobile screenshot.
- The accent is a warm orange (#d2691e), not cloudbox's exact #f6821f.
