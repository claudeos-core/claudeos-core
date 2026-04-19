/**
 * ClaudeOS-Core — Staged Rules Mover
 *
 * Pass 3 and Pass 4 write rule files into
 *   claudeos-core/generated/.staged-rules/**
 * rather than
 *   .claude/rules/**
 * because Claude Code's sensitive-path policy blocks direct writes to
 * `.claude/` from the `claude -p` subprocess (even with
 * `--dangerously-skip-permissions`).
 *
 * After each pass, this module moves everything under the staging dir into the
 * real `.claude/rules/` tree, preserving subpaths, then removes the staging
 * dir. The Node.js orchestrator is not subject to Claude Code's policy, so the
 * final writes succeed.
 */

const fs = require("fs");
const path = require("path");

/**
 * Recursively list files under dir (absolute paths). Returns [] if dir missing.
 */
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); }
    catch (_e) { continue; }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

/**
 * Move a single file, falling back to copy+unlink if rename fails
 * (Windows cross-volume/overwrite edge cases).
 */
function moveFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try {
    fs.renameSync(src, dst);
    return;
  } catch (_e) {
    // Fallback: copy then unlink. copyFileSync overwrites by default.
    fs.copyFileSync(src, dst);
    try { fs.unlinkSync(src); } catch (_e2) { /* best-effort cleanup */ }
  }
}

/**
 * Remove a directory tree. No-op if missing.
 */
function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Move everything from <projectRoot>/claudeos-core/generated/.staged-rules/**
 * to <projectRoot>/.claude/rules/**, preserving subpaths.
 *
 * @param {string} projectRoot - absolute path to the user's project root
 * @returns {{ moved: number, failed: number, files: string[], errors: string[], skipped: boolean }}
 *   - skipped: true when the staging dir does not exist (nothing to move)
 *   - files: list of subpaths moved (relative to .claude/rules/)
 *   - errors: per-file error messages (empty on full success)
 */
function moveStagedRules(projectRoot) {
  const stagingRoot = path.join(projectRoot, "claudeos-core", "generated", ".staged-rules");
  const rulesRoot = path.join(projectRoot, ".claude", "rules");

  if (!fs.existsSync(stagingRoot)) {
    return { moved: 0, failed: 0, files: [], errors: [], skipped: true };
  }

  const staged = walkFiles(stagingRoot);
  const result = { moved: 0, failed: 0, files: [], errors: [], skipped: false };

  for (const srcAbs of staged) {
    const rel = path.relative(stagingRoot, srcAbs);
    const dstAbs = path.join(rulesRoot, rel);
    try {
      moveFile(srcAbs, dstAbs);
      result.moved++;
      result.files.push(rel.split(path.sep).join("/"));
    } catch (e) {
      result.failed++;
      result.errors.push(`${rel}: ${e.code || e.message}`);
    }
  }

  // Clean up the staging tree on full success; keep it on partial failure so
  // the user (or a re-run) can inspect what didn't make it across.
  if (result.failed === 0) {
    try { removeDir(stagingRoot); } catch (_e) { /* non-fatal */ }
  }

  return result;
}

/**
 * Count the total number of regular files under a directory, recursively.
 * Returns 0 if the directory doesn't exist. Unreadable subdirectories are
 * skipped silently (consistent with walkFiles behavior).
 */
function countFilesRecursive(dir) {
  return walkFiles(dir).length;
}

module.exports = { moveStagedRules, countFilesRecursive };
