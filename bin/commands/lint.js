/**
 * bin/commands/lint.js — `npx claudeos-core lint` command.
 *
 * Runs language-invariant structural validation on the generated CLAUDE.md.
 * Intended to run after Pass 3/4 to catch structural drift the scaffold
 * alone cannot prevent (e.g., the §9 L4-memory re-declaration anti-pattern).
 *
 * Exit code:
 *   0 — all checks passed
 *   1 — one or more checks failed (drift detected, repair needed)
 */

"use strict";

const path = require("path");
const { PROJECT_ROOT, log } = require("../lib/cli-utils");
const { validate } = require("../../claude-md-validator");
const { formatReport } = require("../../claude-md-validator/reporter");

function showHelp() {
  log(`
Usage: npx claudeos-core lint

Validates the structural invariants of the generated CLAUDE.md at the
project root. Runs language-invariant checks that work identically
for all 10 supported output languages (en, ko, ja, zh-CN, es, vi, hi,
ru, fr, de).

Checks:
  - Exactly 8 top-level (## ) sections
  - Section 4 has 3-4 ### sub-sections
  - Section 6 has exactly 3 ### sub-sections
  - Section 8 has exactly 2 ### sub-sections + 2 #### headings
  - Each L4 memory file appears in exactly 1 table row (inside Section 8)

Exit codes:
  0 — structure valid
  1 — one or more checks failed (report printed with remediation hints)

Options:
  --help, -h    Show this help message
`);
}

function cmdLint(parsedArgs) {
  // Support `lint --help` / `lint -h` before validating.
  const rest = process.argv.slice(3);
  if (rest.includes("--help") || rest.includes("-h")) {
    showHelp();
    return;
  }

  const target = path.join(PROJECT_ROOT, "CLAUDE.md");
  const report = validate(target);
  process.stdout.write(formatReport(report));

  if (!report.valid) {
    process.exit(1);
  }
}

module.exports = { cmdLint };
