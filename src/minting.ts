// Minting authority: a write credential is issued only against a passing signed
// proof for the exact candidate, by a role separate from the promoter. This
// closes the "a leaked write token alone can promote" gap: the token is a
// short-lived, repo-scoped artifact of a verified proof, not a standing secret.

import { verifySignedProof, type SignedProof, type TrustedKeys } from "./signed-proof.ts";
import type { ScopedToken } from "./promote-model.ts";

export type MintRequest = {
  requester: string; // identity asking to mint (the promoter)
  repo: string;
  candidate: string; // exact artifact the proof must bind
  signedProof: SignedProof;
};

export type MintOutcome =
  | { ok: true; token: ScopedToken }
  | { ok: false; reason: string };

export type MintConfig = {
  minterIdentity: string; // the role that owns minting; must differ from requester
  trusted: TrustedKeys;
  ttlMs: number; // short by construction
  maxTtlMs?: number; // hard ceiling
};

/**
 * The minting role. It never lives in the promoter. It issues a write token
 * only when the requester is not the minter itself and a signed proof admits
 * the exact candidate. The token is repo-scoped and short-lived.
 */
export class MintingAuthority {
  #cfg: MintConfig;
  constructor(cfg: MintConfig) {
    this.#cfg = cfg;
  }

  mint(req: MintRequest, now: number): MintOutcome {
    if (req.requester === this.#cfg.minterIdentity) {
      return { ok: false, reason: "promoter cannot mint its own write token" };
    }
    const decision = verifySignedProof(req.signedProof, req.candidate, this.#cfg.trusted);
    if (!decision.admitted) {
      return { ok: false, reason: `no passing proof: ${decision.reason}` };
    }
    const ttl = Math.min(this.#cfg.ttlMs, this.#cfg.maxTtlMs ?? this.#cfg.ttlMs);
    return {
      ok: true,
      token: { repo: req.repo, scope: "write", expiresAt: now + ttl },
    };
  }
}
