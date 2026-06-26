// Behavioral verifier: answers Ana/Dane "the gate checks presence, not behavior".
// It actually BUILDS the candidate and SMOKE-RUNS the built artifact in a child
// process, then emits an evidence record a signed proof can bind to. A candidate
// that keeps every required path but fails to build, or throws on a smoke
// request, is rejected. Fails closed.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Evidence = {
  buildOk: boolean;
  smokeOk: boolean;
  outputDigest: string | null;
  detail: string;
};

export type BehavioralResult =
  | { ok: true; evidence: Evidence }
  | { ok: false; reason: string; evidence: Evidence };

export type BuildSmokeConfig = {
  // build command run in candidateDir; must exit 0 and produce outputFile
  buildCmd: string[];
  outputFile: string; // relative to candidateDir, hashed into evidence
  // smoke: a node/bun script that imports/executes the output and exits 0 if the
  // candidate responds correctly to a trivial request. Run with the output path.
  smokeCmd: (outputPath: string) => string[];
  timeoutMs?: number;
};

export function buildAndSmoke(candidateDir: string, cfg: BuildSmokeConfig): BehavioralResult {
  const timeout = cfg.timeoutMs ?? 60_000;
  const empty: Evidence = { buildOk: false, smokeOk: false, outputDigest: null, detail: "" };

  const build = spawnSync(cfg.buildCmd[0], cfg.buildCmd.slice(1), { cwd: candidateDir, timeout, encoding: "utf8" });
  if (build.status !== 0) {
    return { ok: false, reason: "build failed", evidence: { ...empty, detail: (build.stderr || build.stdout || "non-zero exit").slice(0, 300) } };
  }
  const outputPath = join(candidateDir, cfg.outputFile);
  if (!existsSync(outputPath)) {
    return { ok: false, reason: "build produced no output", evidence: { ...empty, buildOk: true, detail: `missing ${cfg.outputFile}` } };
  }
  const outputDigest = "sha256:" + createHash("sha256").update(readFileSync(outputPath)).digest("hex");

  const smoke = spawnSync(cfg.smokeCmd(outputPath)[0], cfg.smokeCmd(outputPath).slice(1), { cwd: candidateDir, timeout, encoding: "utf8" });
  if (smoke.status !== 0) {
    return {
      ok: false,
      reason: "smoke failed",
      evidence: { buildOk: true, smokeOk: false, outputDigest, detail: (smoke.stderr || smoke.stdout || "smoke non-zero exit").slice(0, 300) },
    };
  }
  return { ok: true, evidence: { buildOk: true, smokeOk: true, outputDigest, detail: "build+smoke ok" } };
}

/** A canonical evidence string a proof can bind to, so the proof attests behavior. */
export function evidenceString(e: Evidence): string {
  return `build=${e.buildOk};smoke=${e.smokeOk};out=${e.outputDigest ?? "none"}`;
}
