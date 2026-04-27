/**
 * Pass 3 output directories that must have real content on success.
 *
 * Complements expected-guides.js (9 guide files). Used by init.js Guard 3
 * to detect truncation that occurs AFTER the guide/ section — e.g. Claude
 * writes guide/ fully but cuts off before skills/ or plan/.
 *
 * Severity source: content-validator/index.js. Entries here map 1:1 to
 * validator ERROR-level checks. database/ and mcp-guide/ are intentionally
 * omitted because the validator flags them as WARNING-level only (stacks
 * legitimately skip when no DB or MCP integration is detected).
 */

const fs = require("fs");
const path = require("path");

const EXPECTED_OUTPUTS = [
  {
    // Sentinel file written by every stack's pass3.md template.
    label: "claudeos-core/standard/00.core/01.project-overview.md",
    kind: "file",
    relPath: "claudeos-core/standard/00.core/01.project-overview.md",
  },
  {
    // Skills/ holds scaffold-crud-feature (backend) and/or scaffold-page-feature
    // (frontend) sub-skills. Zero non-empty .md files = truncation.
    label: "claudeos-core/skills/ (≥1 non-empty .md)",
    kind: "dir-has-nonempty-md",
    relPath: "claudeos-core/skills",
  },
  // Note: claudeos-core/plan/ check was removed in this version because
  // master plan files (10.standard-master.md, 20.rules-master.md, etc.) are
  // no longer generated. Master plans were an internal tool backup not
  // consumed by Claude Code at runtime, and aggregating many files in a
  // single session caused "Prompt is too long" failures on mid-sized
  // projects (observed on 18-domain-class projects).
];

function readSafe(p) {
  try { return fs.readFileSync(p, "utf-8"); }
  catch (_e) { return null; }
}

// BOM-aware emptiness check. String.prototype.trim does NOT remove U+FEFF
// (not in Unicode White_Space), so a BOM-only file would pass a naive
// `.trim().length === 0` check — we strip it explicitly first. Mirrors
// content-validator/index.js:115 and the H2 check in init.js Guard 3.
function isBlank(text) {
  return text.replace(/^\uFEFF/, "").trim().length === 0;
}

// Stack-based traversal (no recursion limit, same pattern as lib/staged-rules.js
// walkFiles). Returns true on the first non-empty .md found; unreadable dirs
// are skipped silently (matches the project's fault-tolerant fs conventions).
function hasNonEmptyMdRecursive(dir) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch (_e) { continue; }
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) { stack.push(full); continue; }
      if (!e.isFile() || !e.name.endsWith(".md")) continue;
      const content = readSafe(full);
      if (content !== null && !isBlank(content)) return true;
    }
  }
  return false;
}

function findMissingOutputs(projectRoot) {
  const missing = [];
  for (const check of EXPECTED_OUTPUTS) {
    const abs = path.join(projectRoot, check.relPath);
    if (check.kind === "file") {
      if (!fs.existsSync(abs)) { missing.push(`${check.label} — not created`); continue; }
      const c = readSafe(abs);
      if (c === null) { missing.push(`${check.label} — unreadable`); continue; }
      if (isBlank(c)) { missing.push(`${check.label} — empty`); }
    } else if (check.kind === "dir-has-nonempty-md") {
      if (!fs.existsSync(abs)) { missing.push(`${check.label} — directory missing`); continue; }
      if (!hasNonEmptyMdRecursive(abs)) { missing.push(`${check.label} — no non-empty .md files found`); }
    }
  }
  return missing;
}

module.exports = { EXPECTED_OUTPUTS, findMissingOutputs, hasNonEmptyMdRecursive };
