import { describe, expect, test } from "bun:test";
import { checkProof, makeProof, type Proof } from "./proof";

const valid = makeProof({
  artifactDigest: "sha256:abc123",
  verifier: "sandbox.example/verifier",
  policy: "safe-tool/v2",
  result: "pass",
  evidence: "https://evidence.example/runs/42",
});

describe("proof records", () => {
  test("makeProof creates a reusable plain record", () => {
    expect(valid).toEqual({
      artifactDigest: "sha256:abc123",
      verifier: "sandbox.example/verifier",
      policy: "safe-tool/v2",
      result: "pass",
      evidence: "https://evidence.example/runs/42",
    });
  });

  test("a valid proof for the expected artifact admits", () => {
    expect(checkProof(valid, "sha256:abc123")).toEqual({
      admitted: true,
      reason: "proof passed",
    });
  });

  test("a proof for another artifact refuses", () => {
    expect(checkProof(valid, "sha256:different")).toEqual({
      admitted: false,
      reason: "proof does not bind the expected artifact",
    });
  });

  test("a failing result refuses", () => {
    expect(checkProof({ ...valid, result: "fail" }, valid.artifactDigest)).toEqual({
      admitted: false,
      reason: "verifier reported failure",
    });
  });

  test.each([
    ["artifactDigest", { ...valid, artifactDigest: "" }, "proof artifactDigest is required"],
    ["verifier", { ...valid, verifier: " " }, "proof verifier is required"],
    ["policy", { ...valid, policy: undefined }, "proof policy is required"],
    ["result", { ...valid, result: undefined }, "proof result must be pass or fail"],
    ["evidence", { ...valid, evidence: "" }, "proof evidence is required"],
  ])("missing %s refuses", (_field, proof, reason) => {
    expect(checkProof(proof, valid.artifactDigest)).toEqual({ admitted: false, reason });
  });

  test("malformed and absent proofs refuse", () => {
    expect(checkProof(null, valid.artifactDigest).admitted).toBe(false);
    expect(checkProof([], valid.artifactDigest).admitted).toBe(false);
    expect(checkProof("not a proof", valid.artifactDigest).admitted).toBe(false);
  });

  test("an unknown result refuses", () => {
    const proof = { ...valid, result: "maybe" } as unknown as Proof;
    expect(checkProof(proof, valid.artifactDigest)).toEqual({
      admitted: false,
      reason: "proof result must be pass or fail",
    });
  });

  test("a missing expected digest refuses", () => {
    expect(checkProof(valid, "")).toEqual({
      admitted: false,
      reason: "expected artifact digest is required",
    });
  });
});
