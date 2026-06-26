import { describe, expect, test } from "bun:test";
import { checkHealth, type Probe } from "./health.ts";

const creds = { clientId: "id", clientSecret: "secret" };
const authedHeader = (init: RequestInit) => (init.headers as Record<string, string>)["CF-Access-Client-Id"];

describe("authenticated health check", () => {
  test("healthy: authed 200+serverInfo AND unauth is blocked", async () => {
    const probe: Probe = async (_p, init) =>
      authedHeader(init) ? { status: 200, body: '{"result":{"serverInfo":{"name":"service"}}}' } : { status: 302, body: "" };
    const r = await checkHealth("https://service.example.com", creds, probe);
    expect(r.healthy).toBe(true);
  });

  test("a bare 302 is NOT counted as healthy", async () => {
    // app returns 302 even to the authed probe (e.g. broken deploy / wrong route)
    const probe: Probe = async () => ({ status: 302, body: "" });
    const r = await checkHealth("https://service.example.com", creds, probe);
    expect(r.healthy).toBe(false);
  });

  test("unhealthy if Access does NOT guard the unauth path", async () => {
    const probe: Probe = async () => ({ status: 200, body: '{"result":{"serverInfo":{}}}' }); // both authed+unauth 200
    const r = await checkHealth("https://service.example.com", creds, probe);
    expect(r.healthy).toBe(false);
    expect(r.signals.find((s) => s.name === "access-guards-unauth")!.ok).toBe(false);
  });

  test("authed 200 but no serverInfo is unhealthy", async () => {
    const probe: Probe = async (_p, init) =>
      authedHeader(init) ? { status: 200, body: "ok" } : { status: 302, body: "" };
    const r = await checkHealth("https://service.example.com", creds, probe);
    expect(r.healthy).toBe(false);
  });
});
