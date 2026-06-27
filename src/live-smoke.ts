// Pre-promote live smoke: run the built candidate as a real server and send it a
// real request BEFORE promotion, so the proof evidence reflects observed
// behavior in a live environment, not just a successful build. The runner is
// injectable so the lib stays provider-agnostic; a process-backed default ships
// here. A candidate that builds but does not answer a live request is rejected
// before it can be promoted.

import { spawn } from "node:child_process";

export type LiveSmokeResult =
  | { ok: true; status: number; detail: string }
  | { ok: false; detail: string };

// A runner boots the built artifact, returns a base URL plus a stop handle.
export type LiveRunner = (artifactPath: string) => Promise<{ url: string; stop: () => Promise<void> }>;

export type LiveSmokeConfig = {
  runner: LiveRunner;
  request: (baseUrl: string) => Promise<Response>;
  accept: (res: Response) => boolean; // what counts as a live pass
  timeoutMs?: number;
};

export async function liveSmoke(artifactPath: string, cfg: LiveSmokeConfig): Promise<LiveSmokeResult> {
  let handle: { url: string; stop: () => Promise<void> } | null = null;
  try {
    handle = await withTimeout(cfg.runner(artifactPath), cfg.timeoutMs ?? 30_000, "runner boot");
    const res = await withTimeout(cfg.request(handle.url), cfg.timeoutMs ?? 30_000, "live request");
    const passed = cfg.accept(res);
    return passed
      ? { ok: true, status: res.status, detail: `live status ${res.status}` }
      : { ok: false, detail: `live request rejected (status ${res.status})` };
  } catch (e) {
    return { ok: false, detail: `live smoke error: ${(e as Error).message}` };
  } finally {
    if (handle) await handle.stop().catch(() => {});
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${ms}ms`)), ms)),
  ]);
}

// A real default runner: boot a built Bun/Node server file that listens on a
// port (read from the spawned process's first stdout line "listening PORT").
export function processRunner(command: (artifactPath: string) => string[]): LiveRunner {
  return (artifactPath) =>
    new Promise((resolve, reject) => {
      const argv = command(artifactPath);
      const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
      const stop = async () => {
        child.kill("SIGKILL");
      };
      let settled = false;
      child.stdout.on("data", (b: Buffer) => {
        const m = b.toString().match(/listening (\d+)/);
        if (m && !settled) {
          settled = true;
          resolve({ url: `http://127.0.0.1:${m[1]}`, stop });
        }
      });
      child.on("error", (e) => !settled && (settled = true, reject(e)));
      child.on("exit", (code) => !settled && (settled = true, reject(new Error(`runner exited ${code} before listening`))));
    });
}
