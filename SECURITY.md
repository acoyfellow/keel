# Security

keel is a decision library. it does not deploy, hold secrets, or contact any
provider. trust rests on three things the owner controls: the promotion
credential, the trusted verifier keyring, and the known-good revision.

## reporting

open a private advisory or email the maintainer. do not file public issues for
vulnerabilities.

## boundaries and known limits

- a write/promotion credential alone cannot promote without a passing signed
  proof for the exact candidate digest.
- a valid proof cannot promote if the baseline moved (compare-and-swap).
- a revoked or rotated-out verifier key is rejected even with a valid signature.
- the keyring and decision log are in memory in this version; persist them in a
  protected store before relying on them.
- a compromised owner root, or a verifier key trusted and active at signing time,
  can authorize a bad artifact. keel narrows authority; it does not eliminate it.
