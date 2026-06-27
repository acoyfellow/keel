// Example: keel trust and audit survive a process restart and detect tamper.
//
// CLAIM (falsifiable): "keel trust and audit survive a process restart and
// detect an out-of-band tamper."
//
// We work backwards from that claim into the smallest runnable proof:
//   1. Persist a keyring (with a revocation) and a signed decision chain to a
//      temp FileStore on disk.
//   2. Simulate a restart: drop every in-memory object and reload purely from
//      disk into fresh objects.
//   3. After reload, assert the revocation still holds (trust survived) and the
//      decision chain still verifies (audit survived).
//   4. Tamper with the on-disk bytes out of band and show keel detects it
//      (keyring via checksum/TamperError; chain via verifySignedChain break).
//
// Deterministic (fixed clock for decisions; key material is the only entropy,
// and we never assert on key bytes). No network. No secrets persisted beyond
// the throwaway temp dir, which is removed on exit.
//
// Run:  bun run examples/audit-survives-restart/run.ts

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FileStore,
  loadProtected,
  saveProtected,
  TamperError,
} from "../../src/persistence.ts";
import { Keyring, type KeyEntry } from "../../src/keyring.ts";
import { makeKeyPair, type TrustedKeys } from "../../src/signed-proof.ts";
import {
  SignedDecisionLog,
  verifySignedChain,
  type SignedRecord,
} from "../../src/signed-decision.ts";

const checks: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name} — ${detail}`);
}

// Fixed clock so the run is deterministic.
const T0 = Date.parse("2026-06-25T00:00:00Z");
const fixedNow = () => new Date(T0);

const dir = mkdtempSync(join(tmpdir(), "keel-audit-"));
const KEYRING_KEY = "keyring";
const CHAIN_KEY = "decisions";

try {
  // ---------------------------------------------------------------------------
  // Phase 1 — write trust + audit to disk (the "before restart" process).
  // ---------------------------------------------------------------------------
  const signer = makeKeyPair(); // signs the decision chain; stays trusted
  const revoked = makeKeyPair(); // a key we will revoke; trust must say so

  const ring = new Keyring();
  ring.add({ keyId: signer.keyId, publicPem: signer.publicPem, notBefore: T0 });
  ring.add({ keyId: revoked.keyId, publicPem: revoked.publicPem, notBefore: T0 });
  // Revoke one key at T0+1s. This is the trust fact that must survive a restart.
  const REVOKE_AT = T0 + 1_000;
  ring.revoke(revoked.keyId, REVOKE_AT);

  const log = new SignedDecisionLog(signer.keyId, signer.privatePem, fixedNow);
  log.append({ subject: "self-edit", action: "fork", outcome: "allow", reason: "isolate" });
  log.append({ subject: "self-edit", action: "verify", outcome: "approve", reason: "proof passed" });
  log.append({ subject: "promoter", action: "promote", outcome: "approve", reason: "cas ok" });

  const store1 = new FileStore(dir);
  saveProtected(store1, KEYRING_KEY, ring.snapshot());
  saveProtected(store1, CHAIN_KEY, log.records);

  // Drop everything in memory. Only the bytes on disk remain.
  // (signer/revoked PEMs persist as part of the keyring snapshot.)

  // ---------------------------------------------------------------------------
  // Phase 2 — simulate a restart: a brand-new process reads only from disk.
  // ---------------------------------------------------------------------------
  const store2 = new FileStore(dir); // fresh handle, same dir
  const ringSnapshot = loadProtected<KeyEntry[]>(store2, KEYRING_KEY);
  const reloadedRecords = loadProtected<SignedRecord[]>(store2, CHAIN_KEY);

  check(
    "keyring reloaded from disk",
    ringSnapshot !== null && ringSnapshot.length === 2,
    `loaded ${ringSnapshot?.length ?? 0} key entries`,
  );
  check(
    "decision chain reloaded from disk",
    reloadedRecords !== null && reloadedRecords.length === 3,
    `loaded ${reloadedRecords?.length ?? 0} records`,
  );

  const ring2 = Keyring.restore(ringSnapshot!);

  // Trust survived: the revoked key is still revoked after restart.
  const revStatus = ring2.status(revoked.keyId, REVOKE_AT + 1);
  check(
    "revocation survives restart",
    revStatus.trusted === false && revStatus.reason === "key revoked",
    `status=${JSON.stringify(revStatus)}`,
  );
  // The signer key is still trusted after restart.
  const signerStatus = ring2.status(signer.keyId, REVOKE_AT + 1);
  check(
    "signer still trusted after restart",
    signerStatus.trusted === true,
    `status=${JSON.stringify(signerStatus)}`,
  );

  // Audit survived: the reloaded chain still verifies against the reloaded ring.
  const trusted: TrustedKeys = { [signer.keyId]: ring2.pem(signer.keyId)! };
  const v1 = verifySignedChain(reloadedRecords!, trusted);
  check(
    "decision chain verifies after restart",
    v1.ok === true,
    `verifySignedChain -> ${JSON.stringify(v1)}`,
  );

  // ---------------------------------------------------------------------------
  // Phase 3 — out-of-band tamper. Edit the raw files on disk, then reload.
  // ---------------------------------------------------------------------------

  // 3a. Tamper the keyring file: flip the revoked key back to "not revoked"
  //     by rewriting the payload but leaving the old checksum. saveProtected
  //     stores {checksum, payload}; we mutate payload only -> checksum breaks.
  const keyringPath = join(dir, `${KEYRING_KEY}.json`);
  const env = JSON.parse(readFileSync(keyringPath, "utf8")) as {
    checksum: string;
    payload: KeyEntry[];
  };
  for (const e of env.payload) if (e.revokedAt !== null) e.revokedAt = null;
  writeFileSync(keyringPath, JSON.stringify(env)); // same checksum, new payload
  let keyringTamperDetected = false;
  let keyringDetail = "no error thrown (TAMPER MISSED)";
  try {
    loadProtected<KeyEntry[]>(store2, KEYRING_KEY);
  } catch (err) {
    keyringTamperDetected = err instanceof TamperError;
    keyringDetail = `${(err as Error).name}: ${(err as Error).message}`;
  }
  check("keyring tamper detected (checksum)", keyringTamperDetected, keyringDetail);

  // 3b. Tamper the decision chain file: edit one record's outcome in place.
  //     The chain is self-verifying (no checksum needed): hashBody no longer
  //     matches the stored hash -> "tampered record". To reach the hash check
  //     we must keep the checksum envelope consistent, so we re-checksum the
  //     mutated payload (modelling an attacker who can recompute the file
  //     checksum but cannot forge the signer's signature / chain hashes).
  const chainPath = join(dir, `${CHAIN_KEY}.json`);
  const chainEnv = JSON.parse(readFileSync(chainPath, "utf8")) as {
    checksum: string;
    payload: SignedRecord[];
  };
  chainEnv.payload[1].outcome = "deny"; // was "approve"
  // recompute the file-level checksum so persistence lets it through to the
  // cryptographic chain verifier (the real defense for the audit trail).
  const { createHash } = await import("node:crypto");
  chainEnv.checksum = createHash("sha256")
    .update(JSON.stringify(chainEnv.payload))
    .digest("hex");
  writeFileSync(chainPath, JSON.stringify(chainEnv));

  const tamperedRecords = loadProtected<SignedRecord[]>(store2, CHAIN_KEY)!;
  const v2 = verifySignedChain(tamperedRecords, trusted);
  check(
    "decision chain tamper detected (chain break)",
    v2.ok === false && v2.brokenIndex === 1,
    `verifySignedChain -> ${JSON.stringify(v2)}`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// -----------------------------------------------------------------------------
const allOk = checks.every((c) => c.ok);
console.log("");
console.log(`RESULT: ${allOk ? "PASS" : "FAIL"} (${checks.filter((c) => c.ok).length}/${checks.length} checks)`);
process.exit(allOk ? 0 : 1);
