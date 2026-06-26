import { describe, expect, test } from "bun:test";
import { sign, createPrivateKey } from "node:crypto";
import { makeKeyPair } from "./signed-proof.ts";
import { Keyring } from "./keyring.ts";

const MSG = Buffer.from("promote 7926218 -> main");
function sig(privatePem: string) {
  return sign(null, MSG, createPrivateKey(privatePem));
}

describe("keyring rotation + revocation", () => {
  test("active key with valid signature is trusted", () => {
    const k = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 0 });
    expect(ring.verifyActive(k.keyId, MSG, sig(k.privatePem), 1000).trusted).toBe(true);
  });

  test("unknown key is rejected", () => {
    const k = makeKeyPair();
    const ring = new Keyring();
    expect(ring.verifyActive(k.keyId, MSG, sig(k.privatePem), 1000)).toMatchObject({ trusted: false, reason: "unknown key" });
  });

  test("revoked key is rejected even with a valid signature (retroactive)", () => {
    const k = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 0 });
    ring.revoke(k.keyId, 500);
    const s = sig(k.privatePem); // perfectly valid signature
    expect(ring.verifyActive(k.keyId, MSG, s, 1000)).toMatchObject({ trusted: false, reason: "key revoked" });
  });

  test("rotated-out key is rejected after rotation; new key takes over", () => {
    const oldK = makeKeyPair();
    const newK = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: oldK.keyId, publicPem: oldK.publicPem, notBefore: 0 });
    ring.rotate(oldK.keyId, { keyId: newK.keyId, publicPem: newK.publicPem, notBefore: 0 }, 1000);
    // after rotation, old key no longer valid; new key is
    expect(ring.verifyActive(oldK.keyId, MSG, sig(oldK.privatePem), 2000)).toMatchObject({ trusted: false, reason: "key rotated out" });
    expect(ring.verifyActive(newK.keyId, MSG, sig(newK.privatePem), 2000).trusted).toBe(true);
  });

  test("key not yet valid is rejected", () => {
    const k = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 5000 });
    expect(ring.verifyActive(k.keyId, MSG, sig(k.privatePem), 1000)).toMatchObject({ trusted: false, reason: "key not yet valid" });
  });

  test("a forged signature from an active key is still rejected", () => {
    const k = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: k.keyId, publicPem: k.publicPem, notBefore: 0 });
    expect(ring.verifyActive(k.keyId, MSG, Buffer.from("garbage"), 1000)).toMatchObject({ trusted: false, reason: "signature does not verify" });
  });
});
