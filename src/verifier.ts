// Content-integrity verifier: answers Dane/Ana "passes the gate != is correct"
// and "it only failed closed by luck". Instead of relying on a downstream
// bootstrap to choke on a missing dir, the verifier ASSERTS the candidate tree
// contains the expected paths before a proof is ever issued. Fails closed.

import { spawnSync } from "node:child_process";

export type IntegrityResult =
  | { ok: true; presentCount: number }
  | { ok: false; reason: string; missing: string[] };

function lsTree(repoDir: string, sha: string): string[] | null {
  const r = spawnSync("git", ["-C", repoDir, "ls-tree", "-r", "--name-only", sha], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return r.stdout.split("\n").filter(Boolean);
}

function topLevel(repoDir: string, sha: string): string[] | null {
  const r = spawnSync("git", ["-C", repoDir, "ls-tree", "--name-only", sha], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return r.stdout.split("\n").filter(Boolean);
}

/**
 * Require that every path in `requiredPaths` exists somewhere in the candidate
 * tree, and that the tree is not suspiciously small (a destructive commit that
 * replaced the whole tree with one file - the real bug we hit). A required path
 * may be a directory prefix (e.g. "apps/host-cloudflare") or an exact file.
 */
export function verifyTreeIntegrity(
  repoDir: string,
  sha: string,
  requiredPaths: string[],
  minTopLevelEntries = 5,
): IntegrityResult {
  const files = lsTree(repoDir, sha);
  if (files === null) return { ok: false, reason: "commit not found", missing: requiredPaths };

  const missing = requiredPaths.filter(
    (p) => !files.some((f) => f === p || f.startsWith(p.endsWith("/") ? p : p + "/")),
  );
  if (missing.length > 0) return { ok: false, reason: "required paths missing", missing };

  const top = topLevel(repoDir, sha) ?? [];
  if (top.length < minTopLevelEntries) {
    return {
      ok: false,
      reason: `tree collapsed: ${top.length} top-level entries (< ${minTopLevelEntries})`,
      missing: [],
    };
  }
  return { ok: true, presentCount: files.length };
}
