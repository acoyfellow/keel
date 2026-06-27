// Threshold verification: shrink the blast radius of one compromised verifier
// key. A proof is admitted only when k distinct trusted, active keys have each
// signed it. One stolen key (k-1 of k) cannot admit alone.

import { createPublicKey, verify } from "node:crypto";
import { checkProof, type Proof, type ProofDecision } from "./proof.ts";
import { Keyring } from "./keyring.ts";

export type MultiSignedProof = {
  proof: Proof;
  // one signature per signer, keyed by keyId; signatures over canonical(proof)
  signatures: Record<string, string>;
};

function canonical(proof: Proof): Buffer {
  const ordered = {
    artifactDigest: proof.artifactDigest,
    verifier: proof.verifier,
    policy: proof.policy,
    result: proof.result,
    evidence: proof.evidence,
  };
  return Buffer.from(JSON.stringify(ordered), "utf8");
}

export type ThresholdDecision =
  | { admitted: true; signers: string[] }
  | { admitted: false; reason: string };

/**
 * Admit only when at least `k` distinct keys, each trusted and active in the
 * keyring at `at`, have a valid signature over the proof, AND the proof itself
 * passes for the expected digest.
 */
export function verifyThreshold(
  input: MultiSignedProof,
  expectedArtifactDigest: string,
  ring: Keyring,
  k: number,
  at: number,
): ThresholdDecision {
  if (k < 1) return { admitted: false, reason: "threshold k must be >= 1" };
  const base: ProofDecision = checkProof(input.proof, expectedArtifactDigest);
  if (!base.admitted) return { admitted: false, reason: base.reason };

  const msg = canonical(input.proof);
  const validSigners = new Set<string>();
  for (const [keyId, sig] of Object.entries(input.signatures ?? {})) {
    const status = ring.status(keyId, at);
    if (!status.trusted) continue;
    const pem = ring.pem(keyId);
    if (!pem) continue;
    try {
      if (verify(null, msg, createPublicKey(pem), Buffer.from(sig, "base64"))) {
        validSigners.add(keyId);
      }
    } catch {
      // ignore a malformed signature; it simply does not count
    }
  }
  if (validSigners.size < k) {
    return { admitted: false, reason: `need ${k} distinct trusted signers, have ${validSigners.size}` };
  }
  return { admitted: true, signers: [...validSigners] };
}
