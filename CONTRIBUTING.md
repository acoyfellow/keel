# Contributing

keel is small on purpose. before adding surface, ask whether an official
Cloudflare primitive (Artifacts, Workers versions, Access) can carry it instead.

- `bun install`, `bun test` must stay green and deterministic.
- TypeScript, ESM, strict. Biome for format + lint (2-space, single quotes).
- every behavioral claim needs a test; every fix needs a regression test.
- keep keel provider-agnostic. deploy/verify/storage/credential plumbing stays
  in the caller's ports, never in keel.
- evidence goes in `receipts/` in a portable shape, not in prose.
