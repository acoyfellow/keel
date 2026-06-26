import { describe, expect, test } from "bun:test";
import { DecisionLog, verifyChain, type DecisionRecord } from "./decision";

const fixedClock = () => new Date("2026-06-25T12:00:00.000Z");

function populatedLog(): DecisionLog {
  const log = new DecisionLog(fixedClock);
  log.append({
    subject: "agent:researcher",
    action: "search",
    argsRef: "sha256:request-one",
    outcome: "allow",
    reason: "policy match",
  });
  log.append({
    subject: "agent:researcher",
    approver: "alice@example.com",
    action: "delete",
    argsRef: "urn:request:42",
    outcome: "deny",
    reason: "destructive operation not approved",
  });
  return log;
}

describe("DecisionLog", () => {
  test("appending records links the hash chain", () => {
    const log = populatedLog();

    expect(log.records[0].previousHash).toBeNull();
    expect(log.records[0].hash).toMatch(/^[a-f0-9]{64}$/);
    expect(log.records[1].previousHash).toBe(log.records[0].hash);
    expect(log.records[1].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("records both allow and deny outcomes with decision context", () => {
    const log = populatedLog();

    expect(log.records.map(record => record.outcome)).toEqual(["allow", "deny"]);
    expect(log.records[0]).toMatchObject({
      subject: "agent:researcher",
      action: "search",
      argsRef: "sha256:request-one",
      reason: "policy match",
      timestamp: "2026-06-25T12:00:00.000Z",
    });
    expect(log.records[1].approver).toBe("alice@example.com");
  });

  test("accepts an explicit timestamp", () => {
    const log = new DecisionLog(() => {
      throw new Error("clock should not be called");
    });
    const record = log.append({
      subject: "system",
      action: "approval-request",
      outcome: "expire",
      reason: "deadline elapsed",
      timestamp: "2026-01-01T00:00:00.000Z",
    });

    expect(record.timestamp).toBe("2026-01-01T00:00:00.000Z");
    expect(verifyChain(log.records)).toEqual({ ok: true, brokenIndex: null });
  });
});

describe("verifyChain", () => {
  test("passes an intact chain (including an empty one)", () => {
    expect(verifyChain([])).toEqual({ ok: true, brokenIndex: null });
    expect(verifyChain(populatedLog().records)).toEqual({ ok: true, brokenIndex: null });
  });

  test("reports the first edited record", () => {
    const records = structuredClone(populatedLog().records) as DecisionRecord[];
    records[0].reason = "retroactively changed";

    expect(verifyChain(records)).toEqual({ ok: false, brokenIndex: 0 });
  });

  test("reports a broken link", () => {
    const records = structuredClone(populatedLog().records) as DecisionRecord[];
    records[1].previousHash = null;

    expect(verifyChain(records)).toEqual({ ok: false, brokenIndex: 1 });
  });

  test("reports a forged hash", () => {
    const records = structuredClone(populatedLog().records) as DecisionRecord[];
    records[1].hash = "0".repeat(64);

    expect(verifyChain(records)).toEqual({ ok: false, brokenIndex: 1 });
  });
});
