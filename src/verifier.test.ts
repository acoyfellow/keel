import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyTreeIntegrity } from "./verifier.ts";

let dir = "";
let goodSha = "";
let brokenSha = "";

function git(args: string[]) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "verifier-"));
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.email", "t@t"]);
  git(["config", "user.name", "t"]);
  // a realistic full tree
  mkdirSync(join(dir, "apps/host-cloudflare"), { recursive: true });
  writeFileSync(join(dir, "apps/host-cloudflare/index.ts"), "export default {}\n");
  writeFileSync(join(dir, "package.json"), "{}\n");
  for (const f of ["README.md", "tsconfig.json", "LICENSE", "src.ts"]) writeFileSync(join(dir, f), "x\n");
  git(["add", "."]);
  git(["commit", "-qm", "full tree"]);
  goodSha = git(["rev-parse", "HEAD"]);
  // the destructive bug: a commit whose tree is just one marker file
  spawnSync("git", ["-C", dir, "rm", "-rq", "."]);
  writeFileSync(join(dir, "SELF-EDIT-MARKER.md"), "marker\n");
  git(["add", "SELF-EDIT-MARKER.md"]);
  git(["commit", "-qm", "broken: collapsed tree"]);
  brokenSha = git(["rev-parse", "HEAD"]);
});

afterAll(() => dir && rmSync(dir, { recursive: true, force: true }));

const required = ["apps/host-cloudflare", "package.json"];

describe("content-integrity verifier", () => {
  test("full candidate tree passes", () => {
    const r = verifyTreeIntegrity(dir, goodSha, required);
    expect(r.ok).toBe(true);
  });

  test("THE BUG: collapsed tree (only marker) is caught, not deployed", () => {
    const r = verifyTreeIntegrity(dir, brokenSha, required);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("apps/host-cloudflare");
  });

  test("unknown commit fails closed", () => {
    const r = verifyTreeIntegrity(dir, "0".repeat(40), required);
    expect(r.ok).toBe(false);
  });
});
