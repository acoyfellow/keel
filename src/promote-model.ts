// A model of the promotion guard with the real defenses, so the dangerous
// negative cases can be tested: stale tokens, replayed decisions, and
// concurrent compare-and-swap races. No network; this isolates the logic the
// live flow relies on (force-with-lease + scoped TTL token + signed proof).

import { verifySignedProof, type SignedProof, type TrustedKeys } from "./signed-proof.ts";

export type ScopedToken = {
  repo: string;
  scope: "read" | "write";
  expiresAt: number; // epoch ms
};

export type PromoteRequest = {
  repo: string;
  expectedBaseline: string; // the lease: SHA the promoter believes is live
  candidate: string; // SHA to promote to
  token: ScopedToken;
  signedProof: SignedProof; // must be admitted for `candidate`
};

export type PromoteOutcome =
  | { ok: true; newHead: string }
  | { ok: false; reason: string };

// A tiny compare-and-swap ref store standing in for the Artifacts production ref.
export class RefStore {
  #heads = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(initial)) this.#heads.set(k, v);
  }
  head(repo: string): string | undefined {
    return this.#heads.get(repo);
  }
  // force-with-lease: only swap if current head equals the expected baseline.
  cas(repo: string, expected: string, next: string): boolean {
    if (this.#heads.get(repo) !== expected) return false;
    this.#heads.set(repo, next);
    return true;
  }
}

export function promote(
  store: RefStore,
  req: PromoteRequest,
  trusted: TrustedKeys,
  now: number,
): PromoteOutcome {
  if (req.token.scope !== "write" || req.token.repo !== req.repo) {
    return { ok: false, reason: "token scope/repo mismatch" };
  }
  if (now >= req.token.expiresAt) {
    return { ok: false, reason: "token expired" };
  }
  const decision = verifySignedProof(req.signedProof, req.candidate, trusted);
  if (!decision.admitted) {
    return { ok: false, reason: `proof refused: ${decision.reason}` };
  }
  // force-with-lease: rejects replayed/stale promotions whose baseline moved.
  if (!store.cas(req.repo, req.expectedBaseline, req.candidate)) {
    return { ok: false, reason: "lease stale: baseline moved (compare-and-swap failed)" };
  }
  return { ok: true, newHead: req.candidate };
}
