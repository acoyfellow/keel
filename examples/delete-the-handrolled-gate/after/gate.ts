// AFTER: the same toy worker, with its hand-rolled gate DELETED.
//
// The owner no longer maintains an approver allow-list, a shared-token compare,
// or a mutable head write. All of that is gone. What remains here is GLUE: the
// worker imports keel's primitives and hands them its deploy-shaped data.
//
//   - signing/authorization  -> keel signed-proof + keyring (ed25519, key windows)
//   - "is this deploy ok"     -> keel proof binding (artifact digest + pass/fail)
//   - "who approved it"       -> a signature from a trusted, active key
//   - safe promotion          -> keel promote() with force-with-lease (CAS)
//
// The LOC the run harness counts here is ONLY the glue below -- the substrate
// lives in keel/src and is shared, tested, and not the owner's burden.

import { promote, RefStore } from "../../../src/promote-model.ts";
import { signProof } from "../../../src/signed-proof.ts";
import type { Proof } from "../../../src/proof.ts";
import type { TrustedKeys } from "../../../src/signed-proof.ts";
import type { ScopedToken } from "../../../src/promote-model.ts";

export type Deploy = {
  candidate: string;
  baseline: string;
  proof: Proof; // verifier's pass/fail bound to the candidate digest
  signerKeyId: string; // which key signed the approval
  signerPrivatePem: string; // owner-supplied; in prod the signer holds this
  token: ScopedToken; // scoped + TTL write token
};

export type GateResult = { ok: true; newHead: string } | { ok: false; reason: string };

// >>> BEGIN GLUE (the only code the owner now maintains) >>>
export class KeelGate {
  constructor(
    private readonly store: RefStore,
    private readonly repo: string,
    private readonly trusted: TrustedKeys,
  ) {}

  liveHead(): string {
    return this.store.head(this.repo) ?? "";
  }

  promote(d: Deploy, now: number): GateResult {
    // The owner just signs the verifier's proof and asks keel to admit + swap.
    const signedProof = signProof(d.proof, d.signerKeyId, d.signerPrivatePem);
    return promote(
      this.store,
      {
        repo: this.repo,
        expectedBaseline: d.baseline,
        candidate: d.candidate,
        token: d.token,
        signedProof,
      },
      this.trusted,
      now,
    );
  }
}
// <<< END GLUE <<<
