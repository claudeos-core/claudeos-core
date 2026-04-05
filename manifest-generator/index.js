#!/usr/bin/env node

/**
 * ClaudeOS-Core — Manifest Generator
 *
 * Role: Generate metadata JSON + initialize stale-report
 * Output (claudeos-core/generated/):
 *   - rule-manifest.json   : rules/standard/skills/guide file list + frontmatter
 *   - sync-map.json        : plan/ <file> block → file path mapping
 *   - plan-manifest.json   : plan/ file list + <file> block count
 *   - stale-report.json    : initialized (each verification tool appends results)
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/manifest-generator/index.js
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { glob } = require("glob");

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
};

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function stat(f) {
  const s = fs.statSync(f);
  const c = fs.readFileSync(f, "utf-8");
  return {
    lines: c.split("\n").length,
    bytes: s.size,
    modified: s.mtime.toISOString().split("T")[0],
  };
}

function frontmatter(f) {
  try {
    return matter(fs.readFileSync(f, "utf-8")).data || {};
  } catch (_e) {
    return {};
  }
}


// Plans using <file path="..."> block format
function extractFileBlocks(f) {
  if (!fs.existsSync(f)) return [];
  const content = fs.readFileSync(f, "utf-8");
  const result = [];
  let m;
  const re = /<file\s+path="([^"]+)">/g;
  while ((m = re.exec(content)) !== null) {
    result.push({ sourcePath: m[1], planFile: rel(f) });
  }
  return result;
}

// Plans using ## N. `path` ```markdown code block format (e.g., 21.sync-rules-master.md)
function extractCodeBlockPaths(f) {
  if (!fs.existsSync(f)) return [];
  const content = fs.readFileSync(f, "utf-8");
  const result = [];
  const headingRe = /^##\s+\d+\.\s+`?([^`\n]+)`?/gm;
  let headingMatch;
  while ((headingMatch = headingRe.exec(content)) !== null) {
    const filePath = headingMatch[1].trim();
    if (filePath && filePath.includes("/")) {
      result.push({ sourcePath: filePath, planFile: rel(f) });
    }
  }
  return result;
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
  };

  const scanTargets = [
    ["rules",    DIRS.rules],
    ["standards", DIRS.standard],
    ["skills",   DIRS.skills],
    ["guides",   DIRS.guide],
    ["database", DIRS.database],
    ["mcpGuide", DIRS.mcpGuide],
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
    total: mf.rules.length + mf.standards.length + mf.skills.length +
           mf.guides.length + mf.database.length + mf.mcpGuide.length,
  };
  fs.writeFileSync(path.join(GEN, "rule-manifest.json"), JSON.stringify(mf, null, 2));
  console.log(`  ✅ rule-manifest.json — ${mf.summary.total} files indexed`);

  // import-graph.json removed — @import was never a Claude Code feature

  // ─── sync-map.json ─────────────────────────────────────
  const CODE_BLOCK_PLANS = ["21.sync-rules-master.md"];
  const sm = { generatedAt: new Date().toISOString(), mappings: [] };
  if (fs.existsSync(DIRS.plan)) {
    for (const p of await glob("*.md", { cwd: DIRS.plan, absolute: true })) {
      const bn = path.basename(p);
      if (CODE_BLOCK_PLANS.includes(bn)) {
        sm.mappings.push(...extractCodeBlockPaths(p));
      } else {
        sm.mappings.push(...extractFileBlocks(p));
      }
    }
  }
  sm.summary = { totalMappings: sm.mappings.length };
  fs.writeFileSync(path.join(GEN, "sync-map.json"), JSON.stringify(sm, null, 2));
  console.log(`  ✅ sync-map.json — ${sm.summary.totalMappings} mappings`);

  // ─── plan-manifest.json ────────────────────────────────
  const pm = { generatedAt: new Date().toISOString(), plans: [] };
  if (fs.existsSync(DIRS.plan)) {
    for (const p of await glob("*.md", { cwd: DIRS.plan, absolute: true })) {
      const r = rel(p);
      const s = stat(p);
      const blocks = extractFileBlocks(p);
      pm.plans.push({ path: r, ...s, fileBlocks: blocks.length, status: "ok" });
    }
  }
  fs.writeFileSync(path.join(GEN, "plan-manifest.json"), JSON.stringify(pm, null, 2));
  console.log(`  ✅ plan-manifest.json — ${pm.plans.length} plans`);

  // ─── Initialize stale-report.json (preserve existing sub-tool results) ──
  const srPath = path.join(GEN, "stale-report.json");
  let sr = {};
  if (fs.existsSync(srPath)) {
    try { sr = JSON.parse(fs.readFileSync(srPath, "utf-8")); } catch (_e) { sr = {}; }
  }
  sr.generatedAt = new Date().toISOString();
  if (!sr.summary) sr.summary = {};
  sr.summary.totalIssues = 0;
  sr.summary.status = "initial";
  fs.writeFileSync(srPath, JSON.stringify(sr, null, 2));
  console.log("  ✅ stale-report.json — initialized");
  console.log("\n  📁 Output: claudeos-core/generated/ (4 files)\n");
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { main };
