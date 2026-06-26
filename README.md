# keel

keel is a signed, verified self-update control plane for owner-operated software on Cloudflare.

A candidate is identified by content, such as a git commit or Artifacts digest. keel can check the source tree, run an injected build and smoke command, and bind the resulting evidence to that exact artifact. Ed25519 signatures authenticate proofs. A keyring gives verifier keys validity windows, rotation, and revocation. Promotion uses a scoped, expiring credential and compare-and-swap against the known baseline. Health probes use authenticated requests and an independent access-control signal. Decisions are hash-chained and may also be signed. A refused candidate returns to an explicit known-good revision.

## modules

- `proof`: artifact-bound proof records and admission checks
- `keyring`: verifier trust, rotation, validity windows, and revocation
- `signed-proof`: Ed25519 proof envelopes
- `verifier`: content-addressed git tree integrity checks
- `behavioral-verifier`: injected build and smoke gate with output evidence
- `health`: authenticated application and access-control probes
- `promote-model`: scoped credentials and force-with-lease promotion
- `decision`: hash-chained decisions
- `signed-decision`: signed hash-chained decisions
- `controller`: generic deploy, verify, promote, and rollback orchestration

## trust model

The owner controls promotion credentials, the trusted verifier keyring, and the known-good revision. A promotion is admitted only for a passing proof whose artifact digest matches the candidate and whose signing key is trusted. The backing ref remains authoritative, so compare-and-swap rejects stale promoters. Rollback is deterministic because its target is supplied before deployment.

Callers provide deployment, verification, rollback, storage, and credential plumbing. keel does not contact Cloudflare unless those ports do.

## residual gaps

The included build and smoke gate runs before promotion, but it does not provide a real pre-promote live environment. The scoped token type models the required authorization; a production token-minting role and policy are still needed. The keyring is in memory and needs durable, protected persistence. Decision records likewise need durable storage. A compromised owner root or verifier active at signing time can authorize a bad artifact. External deployment systems may also have failure modes beyond the controller's model.

## development

```sh
bun test
bun run typecheck
```
