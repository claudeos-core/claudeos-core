/**
 * reporter.js — Human-readable formatter for validator reports.
 *
 * Keeps all user-facing messages in one place so the CLI and the
 * plan-installer integration produce consistent output.
 *
 * No color codes by default — the goal is to work in any terminal
 * without ANSI dependencies and to be easy to grep in CI logs.
 */

"use strict";

function formatReport(report) {
  const lines = [];
  lines.push("");
  lines.push(`  🔍 Validating: ${report.path}`);
  lines.push("");
  lines.push(`  ${report.summary}`);

  if (report.errors.length > 0) {
    lines.push("");
    lines.push("  Errors:");
    for (const err of report.errors) {
      lines.push(`    ❌ [${err.id}] ${err.message || "(no message)"}`);
      if (err.remediation) {
        lines.push(`       → ${err.remediation}`);
      }
    }
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("  Warnings:");
    for (const warn of report.warnings) {
      lines.push(`    ⚠️  [${warn.id}] ${warn.message || "(no message)"}`);
      if (warn.remediation) {
        lines.push(`       → ${warn.remediation}`);
      }
    }
  }

  if (!report.valid) {
    lines.push("");
    lines.push("  To regenerate CLAUDE.md from scratch:");
    lines.push("    npx claudeos-core init --force");
    lines.push("");
    lines.push("  To inspect the scaffold requirements:");
    lines.push("    See pass-prompts/templates/common/claude-md-scaffold.md");
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Short one-line summary suitable for inline output during pipeline runs.
 */
function formatSummaryLine(report) {
  if (report.valid) {
    const warn = report.warnings.length > 0 ? ` (${report.warnings.length} warning(s))` : "";
    return `✅ CLAUDE.md structure valid (${report.checksRun} checks)${warn}`;
  }
  return `⚠️  CLAUDE.md structure: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`;
}

module.exports = { formatReport, formatSummaryLine };
