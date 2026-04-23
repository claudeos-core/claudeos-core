/**
 * ClaudeOS-Core — Source Path Collector
 *
 * Collects the authoritative list of source file paths that actually exist
 * in the project. Used by pass3-context-builder to inject an "allowlist"
 * into pass3a-facts.md, which Pass 3/4 prompts then reference as the ONLY
 * set of paths they may cite in generated rule/standard files.
 *
 * ─── Why this exists ──────────────────────────────────────────────────
 *
 * Pass 3 hallucination failures in the v2.3.x series have almost always
 * been "convention-based path fabrication": the LLM, recognizing a
 * Next.js / Vite / Spring / Django project, would cite the framework's
 * canonical paths (`src/app/providers.tsx`, `src/middleware.ts`,
 * `src/__mocks__/handlers.ts`, etc.) from its training data rather than
 * from `pass2-merged.json`. The strongly-worded prompt warnings in
 * pass3-footer.md and pass4.md reduced but did not eliminate this class
 * of failure.
 *
 * The root cause is asymmetry of evidence: the prompt tells the LLM what
 * NOT to do in general terms ("do not invent paths"), but never tells it
 * WHAT IS ALLOWED specifically. This module closes that asymmetry by
 * producing a concrete list — "here are the N paths that exist; cite
 * none other" — which is far easier for an LLM to comply with than a
 * negative abstract constraint.
 *
 * ─── Design constraints ──────────────────────────────────────────────
 *
 * 1. Language-agnostic: must work for Java, Kotlin, TypeScript, JavaScript,
 *    Vue, and Python projects. Uses a fixed extension list rather than
 *    querying the per-language scanners (which each have their own
 *    incompatible output shapes).
 *
 * 2. Budget-bounded: even a moderately large project can have 3000+ source
 *    files, which would balloon pass3a-facts.md past its 10 KB target and
 *    re-introduce the context-overflow failure mode. We cap at MAX_PATHS
 *    (500) and use a directory-rollup strategy for projects above that
 *    threshold — preserving the "unique top-level paths" the LLM actually
 *    needs for reference without enumerating every leaf file.
 *
 * 3. Read-only: does not touch the per-language scanners (scan-java.js,
 *    scan-kotlin.js, scan-node.js, scan-python.js, scan-frontend.js).
 *    Those scanners are covered by 16 test files with tight expectations
 *    on their return shapes; a separate independent glob here avoids
 *    destabilizing them.
 */

"use strict";

const path = require("path");
const { glob } = require("glob");

// File extensions we consider "source". Intentionally narrower than
// everything — we want the paths that are likely to be cited in rule
// files, not every config/asset/lock file.
const SOURCE_EXTENSIONS = [
  // Backend: JVM
  "java", "kt", "kts",
  // Backend/Frontend: JS/TS
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  // Frontend: SFC
  "vue", "svelte",
  // Backend: Python
  "py",
];

// Directories to exclude from the scan. Each entry is matched as a path
// segment (so "node_modules" excludes `a/node_modules/b` too). Test/mock
// directories are INCLUDED — they are legitimate citation targets for
// rules about testing conventions.
const EXCLUDED_DIRS = [
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  "target",        // Maven/Gradle build output
  ".gradle",
  ".idea",
  ".vscode",
  ".git",
  "coverage",
  ".turbo",
  ".cache",
  ".claude",       // our own generated dir
  "claudeos-core", // our own generated dir
  "__pycache__",
  ".venv",
  "venv",
  ".pytest_cache",
];

// Hard cap on enumerated paths. Chosen to keep the injected section of
// pass3a-facts.md under ~10 KB (500 paths × ~40 chars avg ≈ 20 KB of raw
// text, but fits within the markdown list format budget after header +
// directory rollup).
const MAX_PATHS = 500;

// When the project has more paths than MAX_PATHS, we fall back to a
// directory-rollup strategy. We list every directory that contains at
// least MIN_FILES_PER_DIR source files, which lets the LLM know "this
// directory exists and has files in it" without enumerating each leaf.
const MIN_FILES_PER_DIR = 1;
const MAX_DIRS = 300;

/**
 * Scan the project for source file paths.
 *
 * @param {string} projectRoot absolute path to project root
 * @returns {Promise<{
 *   mode: "full" | "rollup",
 *   paths: string[],
 *   totalFiles: number,
 *   excludedDirs: string[],
 * }>}
 *
 * mode === "full":    `paths` is the complete enumeration of source files
 *                     (relative to projectRoot, forward slashes)
 * mode === "rollup":  `paths` is a list of directory paths (each ending
 *                     with "/") that contain source files. Used when the
 *                     project exceeds MAX_PATHS; the Pass 3 prompt tells
 *                     the LLM to treat each directory as a scope it may
 *                     cite, but to verify specific filenames against
 *                     pass2-merged.json before writing them.
 */
async function collectSourcePaths(projectRoot) {
  const pattern = `**/*.{${SOURCE_EXTENSIONS.join(",")}}`;
  // Build ignore patterns. glob's `ignore` option accepts micromatch
  // patterns; we wrap each excluded dir as `**/NAME/**` to match at any
  // depth.
  const ignore = EXCLUDED_DIRS.map((d) => `**/${d}/**`);

  let files;
  try {
    files = await glob(pattern, {
      cwd: projectRoot,
      ignore,
      nodir: true,
      dot: false,
    });
  } catch (_e) {
    // glob failure is not fatal — we just return an empty allowlist and
    // Pass 3 falls back to the pre-v2.3.4 behavior of relying on the
    // prompt warning alone.
    return { mode: "full", paths: [], totalFiles: 0, excludedDirs: EXCLUDED_DIRS.slice() };
  }

  // Normalize separators. glob returns forward slashes on POSIX but may
  // return backslashes on Windows depending on the shell.
  const normalized = files.map((f) => f.split(path.sep).join("/")).sort();

  if (normalized.length <= MAX_PATHS) {
    return {
      mode: "full",
      paths: normalized,
      totalFiles: normalized.length,
      excludedDirs: EXCLUDED_DIRS.slice(),
    };
  }

  // Rollup mode: group by parent directory.
  const dirCounts = new Map();
  for (const f of normalized) {
    const dir = path.posix.dirname(f);
    dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
  }
  const dirs = [...dirCounts.entries()]
    .filter(([, count]) => count >= MIN_FILES_PER_DIR)
    .sort((a, b) => {
      // Sort by file-count desc (most populated dirs first), then alpha.
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, MAX_DIRS)
    .map(([dir]) => dir + "/")
    .sort();

  return {
    mode: "rollup",
    paths: dirs,
    totalFiles: normalized.length,
    excludedDirs: EXCLUDED_DIRS.slice(),
  };
}

/**
 * Render a collected source-path list as a Markdown section body, ready
 * to be embedded into pass3-context.json (which is then cited by Pass 3a
 * when writing pass3a-facts.md).
 *
 * The render format is deliberately compact — bulleted list with path in
 * backticks — because this text will be read once by the LLM for every
 * Pass 3 sub-stage and we want to minimize token cost.
 */
function renderAllowedPathsSection(collected) {
  const { mode, paths, totalFiles } = collected;
  const lines = [];

  if (mode === "full") {
    lines.push(
      `Source files on disk (total: ${totalFiles}). ` +
      `When writing a \`src/...\` / \`packages/...\` / \`apps/...\` / ` +
      `language-specific path in any rule or standard file, cite ONLY ` +
      `paths that appear in this list. Do not invent filenames based on ` +
      `framework convention (Next.js, Vite, Spring, Django, etc.) — if ` +
      `a convention-standard path is not listed below, the project does ` +
      `NOT use that convention.`
    );
    lines.push("");
    for (const p of paths) {
      lines.push(`- \`${p}\``);
    }
  } else {
    lines.push(
      `Source directories on disk (total: ${totalFiles} files across ` +
      `${paths.length} listed directories — individual file enumeration ` +
      `was skipped because the project exceeds the ${MAX_PATHS}-file ` +
      `budget for this section). When citing a specific file path in a ` +
      `rule or standard file, the file's PARENT DIRECTORY must match ` +
      `one of the entries below. For the exact filename, consult ` +
      `\`pass2-merged.json\` ONCE and record the result in your ` +
      `in-context fact table. Never infer a filename from framework ` +
      `convention.`
    );
    lines.push("");
    for (const d of paths) {
      lines.push(`- \`${d}\``);
    }
  }

  return lines.join("\n");
}

module.exports = {
  collectSourcePaths,
  renderAllowedPathsSection,
  // Exported for test visibility.
  _constants: { SOURCE_EXTENSIONS, EXCLUDED_DIRS, MAX_PATHS, MIN_FILES_PER_DIR, MAX_DIRS },
};
