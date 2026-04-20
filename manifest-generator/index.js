#!/usr/bin/env node

/**
 * ClaudeOS-Core — Manifest Generator
 *
 * Role: Generate metadata JSON + initialize stale-report
 * Output (claudeos-core/generated/):
 *   - rule-manifest.json   : rules/standard/skills/guide file list + frontmatter
 *   - sync-map.json        : plan/ <file> block → file path mapping (empty since
 *                            master plan generation was removed in v2.1.0;
 *                            kept for sync-checker backward compatibility)
 *   - stale-report.json    : initialized (each verification tool appends results)
 *
 * v2.1.0 removed plan-manifest.json generation (master plan aggregation gone).
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/manifest-generator/index.js
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { glob } = require("glob");
const { parseFileBlocks, parseCodeBlocks, CODE_BLOCK_PLANS } = require("../lib/plan-parser");
const { updateStaleReport } = require("../lib/stale-report");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const GEN = path.join(ROOT, "claudeos-core/generated");

const DIRS = {
  rules:    path.join(ROOT, ".claude/rules"),
  standard: path.join(ROOT, "claudeos-core/standard"),
  skills:   path.join(ROOT, "claudeos-core/skills"),
  plan:     path.join(ROOT, "claudeos-core/plan"),
  guide:    path.join(ROOT, "claudeos-core/guide"),
  database: path.join(ROOT, "claudeos-core/database"),
  mcpGuide: path.join(ROOT, "claudeos-core/mcp-guide"),
  memory:   path.join(ROOT, "claudeos-core/memory"),
};

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function stat(f) {
  try {
    const s = fs.statSync(f);
    const c = fs.readFileSync(f, "utf-8");
    return {
      lines: c.endsWith("\n") ? c.split("\n").length - 1 : c.split("\n").length,
      bytes: s.size,
      modified: s.mtime.toISOString().split("T")[0],
    };
  } catch (_e) {
    return { lines: 0, bytes: 0, modified: "unknown" };
  }
}

function frontmatter(f) {
  try {
    return matter(fs.readFileSync(f, "utf-8")).data || {};
  } catch (_e) {
    return {};
  }
}


// Wrappers: read file → parse → attach planFile metadata
function extractFileBlocksFromFile(f) {
  if (!fs.existsSync(f)) return [];
  const content = fs.readFileSync(f, "utf-8");
  return parseFileBlocks(content).map(b => ({ sourcePath: b.path, planFile: rel(f) }));
}

function extractCodeBlockPathsFromFile(f) {
  if (!fs.existsSync(f)) return [];
  const content = fs.readFileSync(f, "utf-8");
  return parseCodeBlocks(content).map(b => ({ sourcePath: b.path, planFile: rel(f) }));
}

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Manifest Generator   ║");
  console.log("╚═══════════════════════════════════════╝\n");

  if (!fs.existsSync(GEN)) fs.mkdirSync(GEN, { recursive: true });

  // ─── rule-manifest.json ────────────────────────────────
  const mf = {
    generatedAt: new Date().toISOString(),
    rules: [], standards: [], skills: [], guides: [], database: [], mcpGuide: [],
    memory: [],
  };

  const scanTargets = [
    ["rules",    DIRS.rules],
    ["standards", DIRS.standard],
    ["skills",   DIRS.skills],
    ["guides",   DIRS.guide],
    ["database", DIRS.database],
    ["mcpGuide", DIRS.mcpGuide],
    ["memory",   DIRS.memory],
  ];

  for (const [key, dir] of scanTargets) {
    if (!fs.existsSync(dir)) continue;
    for (const f of await glob("**/*.md", { cwd: dir, absolute: true })) {
      const r = rel(f);
      const s = stat(f);
      const fm = frontmatter(f);
      mf[key].push({
        path: r,
        paths: fm.paths || undefined,
        name: fm.name || undefined,
        ...s,
      });
    }
  }

  mf.summary = {
    totalRules:     mf.rules.length,
    totalStandards: mf.standards.length,
    totalSkills:    mf.skills.length,
    totalGuides:    mf.guides.length,
    totalDatabase:  mf.database.length,
    totalMcpGuide:  mf.mcpGuide.length,
    totalMemory:    mf.memory.length,
    total: mf.rules.length + mf.standards.length + mf.skills.length +
           mf.guides.length + mf.database.length + mf.mcpGuide.length +
           mf.memory.length,
  };
  fs.writeFileSync(path.join(GEN, "rule-manifest.json"), JSON.stringify(mf, null, 2));
  console.log(`  ✅ rule-manifest.json — ${mf.summary.total} files indexed`);

  // import-graph.json removed — @import was never a Claude Code feature

  // ─── sync-map.json ─────────────────────────────────────
  // Master plan aggregation was removed in v2.1.0 (plan/ directory is no longer
  // populated). sync-map.json is still produced with an empty `mappings` array
  // for sync-checker backward compatibility — sync-checker treats an empty map
  // as "nothing to sync" and exits cleanly (see master-plan-removal tests).
  // CODE_BLOCK_PLANS imported from lib/plan-parser.js
  const sm = { generatedAt: new Date().toISOString(), mappings: [] };
  if (fs.existsSync(DIRS.plan)) {
    for (const p of await glob("*.md", { cwd: DIRS.plan, absolute: true })) {
      const bn = path.basename(p);
      if (CODE_BLOCK_PLANS.includes(bn)) {
        sm.mappings.push(...extractCodeBlockPathsFromFile(p));
      } else {
        sm.mappings.push(...extractFileBlocksFromFile(p));
      }
    }
  }
  sm.summary = { totalMappings: sm.mappings.length };
  fs.writeFileSync(path.join(GEN, "sync-map.json"), JSON.stringify(sm, null, 2));
  console.log(`  ✅ sync-map.json — ${sm.summary.totalMappings} mappings`);

  // ─── plan-manifest.json ─ REMOVED in v2.1.0 ─────────────
  // Master plan generation was removed; a plan-manifest with an empty plans
  // array is noise — nothing reads it, nothing validates it. The two-file
  // stale output (62 B plan-manifest + 147 B plan-sync-status) was removed
  // to match the declared v2.1.0 contract "plan/ directory is no longer
  // created during init".

  // ─── Initialize stale-report.json (preserve existing sub-tool results) ──
  updateStaleReport(GEN, "generatedAt", new Date().toISOString(), { totalIssues: 0, status: "initial" });
  console.log("  ✅ stale-report.json — initialized");
  console.log("\n  📁 Output: claudeos-core/generated/ (3 files)\n");
}

if (require.main === module) {
  main().catch(e => { console.error(`\n  ❌ Manifest Generator failed: ${e.message || e}`); process.exit(1); });
}

module.exports = { main };
