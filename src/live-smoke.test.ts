import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { liveSmoke, processRunner } from "./live-smoke.ts";

let dir = "";

// Two built "candidates": one whose server answers 200, one that boots but
// throws on the request. Both BUILD fine, so only a live request separates them.
function writeServer(name: string, handlerBody: string): string {
  const file = join(dir, `${name}.ts`);
  writeFileSync(
    file,
    `const server = Bun.serve({ port: 0, fetch(req) { ${handlerBody} } });
console.log("listening " + server.port);\n`,
  );
  return file;
}

beforeAll(() => { dir = mkdtempSync(join(tmpdir(), "keel-live-")); });
afterAll(() => dir && rmSync(dir, { recursive: true, force: true }));

const cfg = () => ({
  runner: processRunner((artifact) => ["bun", artifact]),
  request: (base: string) => fetch(`${base}/`),
  accept: (res: Response) => res.status === 200,
  timeoutMs: 15_000,
});

describe("pre-promote live smoke", () => {
  test("a candidate that answers 200 live passes", async () => {
    const artifact = writeServer("good", `return new Response("ok", { status: 200 });`);
    const r = await liveSmoke(artifact, cfg());
    expect(r.ok).toBe(true);
  });

  test("a candidate that BUILDS but fails the live request is rejected pre-promote", async () => {
    const artifact = writeServer("bad", `throw new Error("boom under load");`);
    const r = await liveSmoke(artifact, cfg());
    expect(r.ok).toBe(false);
  });

  test("a candidate that returns a non-accepted status is rejected", async () => {
    const artifact = writeServer("five", `return new Response("nope", { status: 503 });`);
    const r = await liveSmoke(artifact, cfg());
    expect(r.ok).toBe(false);
  });

  test("a candidate that never listens is rejected (no hang)", async () => {
    const file = join(dir, "noboot.ts");
    writeFileSync(file, `process.exit(1);\n`);
    const r = await liveSmoke(file, { ...cfg(), timeoutMs: 5_000 });
    expect(r.ok).toBe(false);
  });
});
