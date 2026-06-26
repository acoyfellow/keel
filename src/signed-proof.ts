// Signed proof envelope: answers Kenton/Ana "the trust is unsigned".
// A signed proof is only admitted if (1) the signature verifies against a
// trusted verifier key AND (2) the inner proof binds the expected artifact and
// passes. Unsigned, wrong-key, or tampered proofs are rejected. Fails closed.

import { createHash, createPrivateKey, createPublicKey, sign, verify, generateKeyPairSync } from "node:crypto";
import { checkProof, type Proof } from "./proof.ts";

export type SignedProof = {
  proof: Proof;
  keyId: string;
  // base64 ed25519 signature over canonical JSON of {proof, keyId}
  signature: string;
};

export type TrustedKeys = Record<string, string>; // keyId -> PEM public key

export type SignedDecision =
  | { admitted: true; reason: "proof passed" }
  | { admitted: false; reason: string };

function canonical(proof: Proof, keyId: string): Buffer {
  // stable key order; any field reorder/tamper changes the bytes
  const ordered = {
    keyId,
    proof: {
      artifactDigest: proof.artifactDigest,
      verifier: proof.verifier,
      policy: proof.policy,
      result: proof.result,
      evidence: proof.evidence,
    },
  };
  return Buffer.from(JSON.stringify(ordered), "utf8");
}

export function makeKeyPair(): { keyId: string; privatePem: string; publicPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  // keyId = hash of the raw public key DER bytes, so it is a verifiable
  // fingerprint of the actual key (not a constant PEM prefix).
  const der = publicKey.export({ type: "spki", format: "der" });
  const id = createHash("sha256").update(der).digest("hex").slice(0, 16);
  return { keyId: id, privatePem, publicPem };
}

export function signProof(proof: Proof, keyId: string, privatePem: string): SignedProof {
  const key = createPrivateKey(privatePem);
  const signature = sign(null, canonical(proof, keyId), key).toString("base64");
  return { proof, keyId, signature };
}

/**
 * Admit only when the signature verifies against a trusted key AND the inner
 * proof passes checkProof for the expected digest. Accepts unknown input.
 */
export function verifySignedProof(
  input: unknown,
  expectedArtifactDigest: string,
  trusted: TrustedKeys,
): SignedDecision {
  if (typeof input !== "object" || input === null) {
    return { admitted: false, reason: "signed proof is required" };
  }
  const sp = input as Partial<SignedProof>;
  if (typeof sp.keyId !== "string" || !(sp.keyId in trusted)) {
    return { admitted: false, reason: "unknown or missing verifier key" };
  }
  if (typeof sp.signature !== "string" || sp.signature.length === 0) {
    return { admitted: false, reason: "missing signature" };
  }
  if (typeof sp.proof !== "object" || sp.proof === null) {
    return { admitted: false, reason: "missing proof body" };
  }
  let ok = false;
  try {
    ok = verify(
      null,
      canonical(sp.proof as Proof, sp.keyId),
      createPublicKey(trusted[sp.keyId]),
      Buffer.from(sp.signature, "base64"),
    );
  } catch {
    ok = false;
  }
  if (!ok) return { admitted: false, reason: "signature does not verify" };
  // signature is valid; now apply the structural/binding checks
  return checkProof(sp.proof, expectedArtifactDigest);
}
