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

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const PLAN = path.join(ROOT, "claudeos-core/plan");
const GEN  = path.join(ROOT, "claudeos-core/generated");

// Plan files using code block format (the rest use <file> block format)
const CODE_BLOCK_PLANS = ["21.sync-rules-master.md"];

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

// Extract <file path="..."> ... </file> blocks
function extractFileBlocks(content) {
  const result = [];
  let m;
  const re = /<file\s+path="([^"]+)">\s*\n([\s\S]*?)\n<\/file>/g;
  while ((m = re.exec(content)) !== null) {
    result.push({ path: m[1], content: m[2] });
  }
  return result;
}

// Extract ## N. `path` \n```markdown ... ``` blocks
// Uses indexOf-based parsing to correctly handle nested code fences inside markdown content
function extractCodeBlocks(content) {
  const result = [];
  const headingRe = /^##\s+\d+\.\s+([^\n]+)/gm;
  let headingMatch;
  while ((headingMatch = headingRe.exec(content)) !== null) {
    const filePath = headingMatch[1].replace(/`/g, "").trim();
    // Find the opening ```markdown after the heading
    const openFence = content.indexOf("```markdown\n", headingMatch.index);
    if (openFence < 0) continue;
    const contentStart = openFence + "```markdown\n".length;
    // Find the matching closing ``` — track nesting depth to skip inner fenced blocks
    let searchPos = contentStart;
    let closingPos = -1;
    let nestDepth = 0;
    while (searchPos < content.length) {
      const nextFence = content.indexOf("\n```", searchPos);
      if (nextFence < 0) break;
      const fenceLineStart = nextFence + 1; // position of ```
      // Determine end of this ``` line
      const nextNewline = content.indexOf("\n", fenceLineStart + 3);
      const restOfLine = nextNewline >= 0
        ? content.substring(fenceLineStart + 3, nextNewline)
        : content.substring(fenceLineStart + 3);
      // Opening fence: ``` followed by a language tag (non-empty alphanumeric text)
      const isOpening = /^[a-zA-Z]/.test(restOfLine.trim());
      if (isOpening) {
        nestDepth++;
        searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
      } else if (nestDepth > 0) {
        nestDepth--;
        searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
      } else {
        closingPos = fenceLineStart;
        break;
      }
    }
    if (closingPos < 0) continue;
    const blockContent = content.substring(contentStart, closingPos).trimEnd();
    result.push({ path: filePath, content: blockContent });
    // Advance headingRe past this block to avoid re-matching inside content
    headingRe.lastIndex = closingPos;
  }
  return result;
}

// Replace <file> block content with new content
function replaceFileBlock(content, filePath, newContent) {
  const escaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(
    new RegExp(`(<file\\s+path="${escaped}">\\s*\\n)[\\s\\S]*?(\\n</file>)`, "g"),
    `$1${newContent}$2`
  );
}

// Replace code block content with new content
// Uses indexOf-based approach to avoid regex issues with nested code fences
function replaceCodeBlock(content, filePath, newContent) {
  const cleanPath = filePath.replace(/`/g, "");
  // Find the heading line containing the file path
  const headingPattern = new RegExp(`^##\\s+\\d+\\.\\s+\`?${cleanPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\`?`, "m");
  const headingMatch = headingPattern.exec(content);
  if (!headingMatch) return content;
  // Find the opening ```markdown after the heading
  const afterHeading = content.indexOf("```markdown\n", headingMatch.index);
  if (afterHeading < 0) return content;
  const contentStart = afterHeading + "```markdown\n".length;
  // Find the matching closing ``` — track nesting depth to skip inner fenced blocks
  let searchPos = contentStart;
  let closingPos = -1;
  let nestDepth = 0;
  while (searchPos < content.length) {
    const nextFence = content.indexOf("\n```", searchPos);
    if (nextFence < 0) break;
    const fenceLineStart = nextFence + 1; // position of ```
    // Determine end of this ``` line
    const nextNewline = content.indexOf("\n", fenceLineStart + 3);
    const restOfLine = nextNewline >= 0
      ? content.substring(fenceLineStart + 3, nextNewline)
      : content.substring(fenceLineStart + 3);
    // Opening fence: ``` followed by a language tag (non-empty alphanumeric text)
    const isOpening = /^[a-zA-Z]/.test(restOfLine.trim());
    if (isOpening) {
      nestDepth++;
      searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
    } else if (nestDepth > 0) {
      nestDepth--;
      searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
    } else {
      closingPos = fenceLineStart;
      break;
    }
  }
  if (closingPos < 0) return content;
  return content.substring(0, contentStart) + newContent + "\n" + content.substring(closingPos);
}

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
    const rp = path.join(GEN, "stale-report.json");
    let ex = {};
    if (fs.existsSync(rp)) {
      try { ex = JSON.parse(fs.readFileSync(rp, "utf-8")); } catch { ex = {}; }
    }
    ex.planValidation = { checkedAt: new Date().toISOString(), mode, total, synced, drift, missing };
    if (!ex.summary) ex.summary = {};
    ex.summary.planDrift = drift;
    ex.summary.planMissing = missing;
    fs.writeFileSync(rp, JSON.stringify(ex, null, 2));
  }

  process.exit(drift + missing > 0 ? 1 : 0);
}

// Export for testing; run main() only when executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractFileBlocks, extractCodeBlocks, replaceFileBlock, replaceCodeBlock };
