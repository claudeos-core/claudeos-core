/**
 * claude-md-validator — Post-generation structural validation for CLAUDE.md.
 *
 * Runs language-invariant structural checks against a generated CLAUDE.md
 * to detect the §9 re-declaration anti-pattern and other structural drift
 * that the scaffold + prompt-level instructions alone cannot reliably
 * prevent.
 *
 * Usage (as a library):
 *   const { validate } = require("./claude-md-validator");
 *   const report = validate("/path/to/CLAUDE.md");
 *   if (!report.valid) { ... }
 *
 * Usage (as a CLI):
 *   node claude-md-validator/index.js /path/to/CLAUDE.md
 *   node claude-md-validator/index.js          # defaults to ./CLAUDE.md
 *
 * Design principle: every check here must pass/fail identically regardless
 * of the language used to generate CLAUDE.md. See structural-checks.js
 * for the rationale.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const checks = require("./structural-checks");
const { formatReport } = require("./reporter");

/**
 * Validate a CLAUDE.md file.
 *
 * @param {string} claudeMdPath - Absolute or relative path to CLAUDE.md
 * @returns {object} report with { valid, path, checksRun, errors, warnings, summary }
 */
function validate(claudeMdPath) {
  // Guard against non-string inputs (null, undefined, numbers, objects).
  // path.resolve() throws TypeError on these, which surfaces as a raw
  // stack trace to CLI users. Returning a structured error keeps the
  // validator's contract simple: every call returns a report object.
  if (typeof claudeMdPath !== "string" || claudeMdPath.length === 0) {
    return {
      valid: false,
      path: String(claudeMdPath),
      checksRun: 0,
      errors: [
        {
          id: "INVALID_PATH",
          pass: false,
          severity: "error",
          message: `Path must be a non-empty string, got ${typeof claudeMdPath}: ${JSON.stringify(claudeMdPath)}`,
          remediation: "Pass a filesystem path to a CLAUDE.md file.",
        },
      ],
      warnings: [],
      summary: "❌ Invalid path argument.",
    };
  }

  const absPath = path.resolve(claudeMdPath);

  if (!fs.existsSync(absPath)) {
    return {
      valid: false,
      path: absPath,
      checksRun: 0,
      errors: [
        {
          id: "FILE_MISSING",
          pass: false,
          severity: "error",
          message: `File not found: ${absPath}`,
          remediation:
            "Run `npx claudeos-core init --force` to generate CLAUDE.md.",
        },
      ],
      warnings: [],
      summary: "❌ File not found.",
    };
  }

  // Guard against the user pointing the validator at a directory or an
  // unreadable file. Without this guard `readFileSync` throws EISDIR /
  // EACCES and the CLI exits with a raw stack trace, which looks like
  // a validator bug to end users.
  const stat = fs.statSync(absPath);
  if (!stat.isFile()) {
    return {
      valid: false,
      path: absPath,
      checksRun: 0,
      errors: [
        {
          id: "NOT_A_FILE",
          pass: false,
          severity: "error",
          message: `Path is not a regular file: ${absPath}`,
          remediation:
            "Point the validator at a CLAUDE.md file, not a directory or special file.",
        },
      ],
      warnings: [],
      summary: "❌ Path is not a file.",
    };
  }

  let rawContent;
  try {
    rawContent = fs.readFileSync(absPath, "utf8");
  } catch (e) {
    return {
      valid: false,
      path: absPath,
      checksRun: 0,
      errors: [
        {
          id: "FILE_UNREADABLE",
          pass: false,
          severity: "error",
          message: `Could not read file: ${e.message || e}`,
          remediation:
            "Check file permissions and re-run, or regenerate via `npx claudeos-core init --force`.",
        },
      ],
      warnings: [],
      summary: "❌ File unreadable.",
    };
  }
  // Strip UTF-8 BOM (U+FEFF) if present at the start of the file.
  // Some Windows editors and cross-platform generators prepend a BOM to
  // UTF-8 files; without this, the first `## ` line fails to match
  // `^## ` regex checks and the section count is silently off by one.
  const content = rawContent.charCodeAt(0) === 0xfeff ? rawContent.slice(1) : rawContent;
  const sections = checks.splitByH2(content);

  const results = [];

  // Structural checks (order does not matter; reporter groups them)
  results.push(checks.checkH2Count(sections));
  results.push(...checks.checkH3Counts(sections));
  results.push(...checks.checkH4Counts(sections));
  results.push(...checks.checkMemoryFileUniqueness(content));
  results.push(...checks.checkMemoryScopedToSection8(sections, content));
  results.push(...checks.checkSectionsHaveContent(sections));
  // Title-invariant check — English canonical token must appear in every
  // `## N.` heading so that multi-repo grep stays consistent across
  // projects generated in different output languages.
  results.push(...checks.checkCanonicalHeadings(sections));

  const errors = results.filter((r) => !r.pass && r.severity === "error");
  const warnings = results.filter((r) => !r.pass && r.severity === "warning");
  const valid = errors.length === 0;

  return {
    valid,
    path: absPath,
    checksRun: results.length,
    errors,
    warnings,
    allResults: results,
    summary: valid
      ? `✅ ${results.length} structural checks passed` +
        (warnings.length > 0 ? ` (${warnings.length} warning(s))` : "") +
        "."
      : `❌ ${errors.length} error(s), ${warnings.length} warning(s) out of ${results.length} checks.`,
  };
}

// ─── CLI entry ────────────────────────────────────────────────────

if (require.main === module) {
  const target = process.argv[2] || path.join(process.cwd(), "CLAUDE.md");
  const report = validate(target);
  console.log(formatReport(report));
  process.exit(report.valid ? 0 : 1);
}

module.exports = {
  validate,
  // Expose checks for advanced callers / testing
  checks,
  formatReport,
};
