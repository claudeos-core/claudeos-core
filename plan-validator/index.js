#!/usr/bin/env node

/**
 * ClaudeOS-Core — Plan Validator
 *
 * Role: Validate and sync Master Plan (plan/) <file> blocks ↔ disk files
 * Modes:
 *   --check    : detect drift/missing only (default, for CI/CD)
 *   --refresh  : sync disk → Plan (after manual file edits)
 *   --execute  : restore Plan → disk (when files are corrupted)
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/plan-validator/index.js [--check|--refresh|--execute]
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { parseFileBlocks, parseCodeBlocks, replaceFileBlock, replaceCodeBlock, CODE_BLOCK_PLANS } = require("../lib/plan-parser");
const { updateStaleReport } = require("../lib/stale-report");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const PLAN = path.join(ROOT, "claudeos-core/plan");
const GEN  = path.join(ROOT, "claudeos-core/generated");

// CODE_BLOCK_PLANS imported from lib/plan-parser.js

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

// Aliases for backward compatibility (used by tests and main())
function extractFileBlocks(content) { return parseFileBlocks(content, { includeContent: true }); }
function extractCodeBlocks(content) { return parseCodeBlocks(content, { includeContent: true }); }

async function main() {
  const validModes = ["--check", "--refresh", "--execute"];
  const mode = process.argv[2] || "--check";
  if (!validModes.includes(mode)) {
    console.log(`  ❌ Unknown mode: ${mode}`);
    console.log(`  Valid modes: ${validModes.join(", ")}`);
    process.exit(1);
  }

  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Plan Validator       ║");
  console.log(`║  Mode: ${mode.padEnd(31)}║`);
  console.log("╚═══════════════════════════════════════╝\n");

  if (!fs.existsSync(PLAN)) {
    console.log("  ❌ Plan directory not found");
    process.exit(1);
  }

  let total = 0, synced = 0, drift = 0, missing = 0;
  const results = [];

  for (const pf of await glob("*.md", { cwd: PLAN, absolute: true })) {
    const pn = path.basename(pf);
    const pc = fs.readFileSync(pf, "utf-8");
    const isCB = CODE_BLOCK_PLANS.includes(pn);
    const blocks = isCB ? extractCodeBlocks(pc) : extractFileBlocks(pc);
    if (!blocks.length) continue;

    console.log(`  📄 ${pn} (${blocks.length} blocks)`);
    let updatedContent = pc;
    let modified = false;

    for (const b of blocks) {
      total++;
      const abs = path.join(ROOT, b.path);

      // Block path traversal attempts (allow files at ROOT level and below)
      const resolvedAbs = path.resolve(abs);
      const resolvedRoot = path.resolve(ROOT);
      if (resolvedAbs !== resolvedRoot && !resolvedAbs.startsWith(resolvedRoot + path.sep)) {
        console.log(`     ⚠️  SKIPPED: ${b.path} (path traversal blocked)`);
        continue;
      }

      // File does not exist
      if (!fs.existsSync(abs)) {
        if (mode === "--execute") {
          const dir = path.dirname(abs);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(abs, b.content + "\n");
          console.log(`     ✅ CREATED:  ${b.path}`);
          synced++;
        } else {
          console.log(`     ❌ MISSING:  ${b.path}`);
          missing++;
          results.push({ plan: pn, file: b.path, status: "missing" });
        }
        continue;
      }

      // File exists — compare content (normalize trailing newlines only)
      const diskContent = fs.readFileSync(abs, "utf-8").replace(/\n+$/, "");
      const planContent = b.content.replace(/\n+$/, "");

      if (diskContent === planContent) {
        synced++;
      } else {
        if (mode === "--refresh") {
          updatedContent = isCB
            ? replaceCodeBlock(updatedContent, b.path, diskContent)
            : replaceFileBlock(updatedContent, b.path, diskContent);
          modified = true;
          console.log(`     🔄 REFRESHED: ${b.path}`);
          synced++;
        } else if (mode === "--execute") {
          // Backup existing file before overwrite
          const backupPath = abs + ".bak";
          fs.copyFileSync(abs, backupPath);
          fs.writeFileSync(abs, b.content + "\n");
          console.log(`     ✅ RESTORED: ${b.path} (backup: ${b.path}.bak)`);
          synced++;
        } else {
          console.log(`     ⚠️  DRIFT:    ${b.path}`);
          drift++;
          results.push({ plan: pn, file: b.path, status: "drift" });
        }
      }
    }

    if (mode === "--refresh" && modified) {
      fs.writeFileSync(pf, updatedContent);
      console.log(`     💾 Saved: ${pn}`);
    }
  }

  // ─── Results summary ──────────────────────────────────────────
  console.log(`\n  Total: ${total} | Synced: ${synced} | Drift: ${drift} | Missing: ${missing}`);
  console.log(drift + missing === 0 ? "  ✅ All plans in sync\n" : `  ⚠️  ${drift + missing} issues\n`);

  // ─── Update plan-sync-status.json + stale-report.json ──
  if (fs.existsSync(GEN)) {
    fs.writeFileSync(
      path.join(GEN, "plan-sync-status.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), lastMode: mode, total, synced, drift, missing, issues: results }, null, 2)
    );

    // Also write to stale-report.json for consolidated health reporting
    updateStaleReport(GEN, "planValidation",
      { checkedAt: new Date().toISOString(), mode, total, synced, drift, missing },
      { planDrift: drift, planMissing: missing }
    );
  }

  process.exit(drift + missing > 0 ? 1 : 0);
}

// Export for testing; run main() only when executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractFileBlocks, extractCodeBlocks, replaceFileBlock, replaceCodeBlock };
