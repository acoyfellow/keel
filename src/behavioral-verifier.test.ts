import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildAndSmoke, evidenceString, type BuildSmokeConfig } from "./behavioral-verifier.ts";

// Each candidate is a tiny "worker": src/index.ts exporting a handler. Build =
// bun build to dist/out.js. Smoke = run a script that imports the build and
// calls the handler with a trivial request, exit 0 only if it returns 200.

let root = "";
function makeCandidate(name: string, indexSrc: string): string {
  const dir = join(root, name);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/index.ts"), indexSrc);
  writeFileSync(
    join(dir, "smoke.ts"),
    `const mod = await import(process.argv[2]);
const res = await mod.default.fetch(new Request("http://x/"));
if (res.status !== 200) { console.error("bad status", res.status); process.exit(1); }
process.exit(0);\n`,
  );
  return dir;
}

const cfg = (dir: string): BuildSmokeConfig => ({
  buildCmd: ["bun", "build", join(dir, "src/index.ts"), "--outfile", join(dir, "dist/out.js"), "--target", "bun"],
  outputFile: "dist/out.js",
  smokeCmd: (outputPath) => ["bun", join(dir, "smoke.ts"), outputPath],
  timeoutMs: 60_000,
});

beforeAll(() => { root = mkdtempSync(join(tmpdir(), "behav-")); });
afterAll(() => root && rmSync(root, { recursive: true, force: true }));

describe("behavioral verifier (build + smoke)", () => {
  test("good candidate builds and smokes -> admit, evidence bound", () => {
    const dir = makeCandidate("good", `export default { async fetch() { return new Response("ok", { status: 200 }); } };`);
    const r = buildAndSmoke(dir, cfg(dir));
    expect(r.ok).toBe(true);
    expect(r.evidence.buildOk && r.evidence.smokeOk).toBe(true);
    expect(evidenceString(r.evidence)).toContain("out=sha256:");
  });

  test("path-complete but BUILD-broken -> reject", () => {
    const dir = makeCandidate("broken-build", `export default { async fetch( { syntax error here ===`);
    const r = buildAndSmoke(dir, cfg(dir));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("build failed");
  });

  test("path-complete, builds, but SMOKE throws -> reject", () => {
    const dir = makeCandidate("broken-smoke", `export default { async fetch() { throw new Error("boom at runtime"); } };`);
    const r = buildAndSmoke(dir, cfg(dir));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("smoke failed");
  });

  test("builds but returns non-200 -> smoke reject", () => {
    const dir = makeCandidate("bad-status", `export default { async fetch() { return new Response("nope", { status: 500 }); } };`);
    const r = buildAndSmoke(dir, cfg(dir));
    expect(r.ok).toBe(false);
  });
});
