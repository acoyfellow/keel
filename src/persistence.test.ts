import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeKeyPair } from "./signed-proof.ts";
import { Keyring, type KeyEntry } from "./keyring.ts";
import { SignedDecisionLog, verifySignedChain } from "./signed-decision.ts";
import { FileStore, saveProtected, loadProtected, TamperError } from "./persistence.ts";

let dir = "";
beforeAll(() => { dir = mkdtempSync(join(tmpdir(), "keel-persist-")); });
afterAll(() => dir && rmSync(dir, { recursive: true, force: true }));

describe("durable persistence", () => {
  test("keyring survives reload with revocations and rotations intact", () => {
    const store = new FileStore(dir);
    const a = makeKeyPair(), b = makeKeyPair(), c = makeKeyPair();
    const ring = new Keyring();
    ring.add({ keyId: a.keyId, publicPem: a.publicPem, notBefore: 0 });
    ring.add({ keyId: b.keyId, publicPem: b.publicPem, notBefore: 0 });
    ring.revoke(b.keyId, 500);
    ring.rotate(a.keyId, { keyId: c.keyId, publicPem: c.publicPem, notBefore: 0 }, 1000);

    saveProtected(store, "keyring", ring.snapshot());
    const reloaded = Keyring.restore(loadProtected<KeyEntry[]>(store, "keyring")!);

    expect(reloaded.status(b.keyId, 2000)).toMatchObject({ trusted: false, reason: "key revoked" });
    expect(reloaded.status(a.keyId, 2000)).toMatchObject({ trusted: false, reason: "key rotated out" });
    expect(reloaded.status(c.keyId, 2000).trusted).toBe(true);
  });

  test("signed decision chain verifies after reload", () => {
    const store = new FileStore(dir);
    const k = makeKeyPair();
    const trusted = { [k.keyId]: k.publicPem };
    const log = new SignedDecisionLog(k.keyId, k.privatePem);
    log.append({ subject: "promoter", action: "promote", outcome: "approve", reason: "cas ok" });
    log.append({ subject: "promoter", action: "rollback", outcome: "allow", reason: "health failed" });

    saveProtected(store, "decisions", log.records);
    const reloaded = loadProtected<typeof log.records>(store, "decisions")!;
    expect(verifySignedChain(reloaded, trusted).ok).toBe(true);
  });

  test("a store edited out of band is detected on load", () => {
    const store = new FileStore(dir);
    saveProtected(store, "keys", [{ keyId: "x", publicPem: "p", notBefore: 0, notAfter: null, revokedAt: null }]);
    // tamper with the file directly
    const file = join(dir, "keys.json");
    const env = JSON.parse(readFileSync(file, "utf8"));
    env.payload[0].revokedAt = null; // attacker un-revokes; payload changes, checksum will not match
    env.payload[0].keyId = "evil";
    writeFileSync(file, JSON.stringify(env));
    expect(() => loadProtected(store, "keys")).toThrow(TamperError);
  });

  test("missing key loads as null", () => {
    expect(loadProtected(new FileStore(dir), "nothing-here")).toBeNull();
  });
});
