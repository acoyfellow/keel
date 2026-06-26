// Authenticated health check: answers Dane/Ana "a 302 is not health". A bare
// request to an Access-protected host returns 302 to the login page regardless
// of what is behind it. Real health means an authenticated request (service
// token) that gets a 200 AND a meaningful body signal (serverInfo), plus a
// second independent signal. Returns evidence suitable to bind a proof to.

export type HealthSignal = { name: string; ok: boolean; detail: string };
export type HealthResult = { healthy: boolean; signals: HealthSignal[] };

export type Probe = (path: string, init: RequestInit) => Promise<{ status: number; body: string }>;

// Real probe: MUST NOT follow redirects, or an Access 302 becomes a 200 login
// page and the unauth-guard signal silently flips to a false pass. Learned live.
export const defaultProbe: Probe = async (path, init) => {
  const res = await fetch(path, { ...init, redirect: "manual" });
  return { status: res.status, body: await res.text() };
};

export type AccessCreds = { clientId: string; clientSecret: string };

/**
 * Two independent signals through Access:
 *  1. MCP initialize returns 200 with serverInfo (the app is actually serving).
 *  2. A bare unauthenticated request is NOT 200 (Access is actually guarding).
 * A 302 alone counts as neither healthy nor proof of anything.
 */
export async function checkHealth(host: string, creds: AccessCreds, probe: Probe): Promise<HealthResult> {
  const signals: HealthSignal[] = [];

  const authed = await probe(`${host}/mcp`, {
    method: "POST",
    headers: {
      "CF-Access-Client-Id": creds.clientId,
      "CF-Access-Client-Secret": creds.clientSecret,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "health", version: "0.0.1" } } }),
  });
  const serverInfoOk = authed.status === 200 && authed.body.includes("serverInfo");
  signals.push({ name: "authenticated-serverinfo", ok: serverInfoOk, detail: `status=${authed.status} serverInfo=${authed.body.includes("serverInfo")}` });

  const bare = await probe(`${host}/mcp`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const guarded = bare.status !== 200; // Access must block the unauthenticated path
  signals.push({ name: "access-guards-unauth", ok: guarded, detail: `unauth status=${bare.status}` });

  return { healthy: signals.every((s) => s.ok), signals };
}
