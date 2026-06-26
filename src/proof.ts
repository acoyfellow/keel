export type ProofResult = "pass" | "fail";

/** A verifier's claim about one exact artifact. This record is not itself signed. */
export type Proof = {
  artifactDigest: string;
  verifier: string;
  policy: string;
  result: ProofResult;
  evidence: string;
};

export type ProofInput = Proof;

export type ProofDecision =
  | { admitted: true; reason: "proof passed" }
  | { admitted: false; reason: string };

/** Creates a proof record without claiming to authenticate its contents. */
export function makeProof(input: ProofInput): Proof {
  return { ...input };
}

/**
 * Checks the minimum admission invariants. Accepts unknown input so callers can
 * safely check data decoded from JSON. This is structural validation, not
 * cryptographic signature verification.
 */
export function checkProof(
  proof: unknown,
  expectedArtifactDigest: string,
): ProofDecision {
  if (!isNonEmptyString(expectedArtifactDigest)) {
    return { admitted: false, reason: "expected artifact digest is required" };
  }
  if (!isRecord(proof)) {
    return { admitted: false, reason: "proof is required" };
  }

  for (const field of ["artifactDigest", "verifier", "policy", "evidence"] as const) {
    if (!isNonEmptyString(proof[field])) {
      return { admitted: false, reason: `proof ${field} is required` };
    }
  }
  if (proof.result !== "pass" && proof.result !== "fail") {
    return { admitted: false, reason: "proof result must be pass or fail" };
  }
  if (proof.artifactDigest !== expectedArtifactDigest) {
    return { admitted: false, reason: "proof does not bind the expected artifact" };
  }
  if (proof.result === "fail") {
    return { admitted: false, reason: "verifier reported failure" };
  }

  return { admitted: true, reason: "proof passed" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
