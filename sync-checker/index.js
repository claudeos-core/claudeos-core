#!/usr/bin/env node

/**
 * ClaudeOS-Core — Sync Checker
 *
 * Role: Check disk ↔ Master Plan sync status based on sync-map.json
 * Detection items:
 *   - Unregistered: file exists on disk but not registered in any plan
 *   - Orphaned:     registered in plan but missing from disk
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/sync-checker/index.js
 * Depends: manifest-generator must run first (sync-map.json)
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { updateStaleReport } = require("../lib/stale-report");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const GEN = path.join(ROOT, "claudeos-core/generated");
const SMP = path.join(GEN, "sync-map.json");

const TRACKED = [
  { dir: ".claude/rules",           pfx: "rules"     },
  { dir: "claudeos-core/standard",  pfx: "standard"  },
  { dir: "claudeos-core/skills",    pfx: "skills"    },
  { dir: "claudeos-core/guide",     pfx: "guide"     },
  { dir: "claudeos-core/database",  pfx: "database"  },
  { dir: "claudeos-core/mcp-guide", pfx: "mcp-guide" },
];

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function isWithinRoot(absPath) {
  let resolved = path.resolve(absPath);
  let root = path.resolve(ROOT);
  if (process.platform === "win32") {
    resolved = resolved.toLowerCase();
    root = root.toLowerCase();
  }
  return resolved === root || resolved.startsWith(root + path.sep);
}

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Sync Checker         ║");
  console.log("╚═══════════════════════════════════════╝\n");

  if (!fs.existsSync(SMP)) {
    console.log("  ❌ sync-map.json not found. Run manifest-generator first.\n");
    process.exit(1);
  }

  let sm;
  try {
    sm = JSON.parse(fs.readFileSync(SMP, "utf-8"));
  } catch (e) {
    console.log(`  ❌ sync-map.json is malformed: ${e.message}\n`);
    process.exit(1);
  }
  if (!Array.isArray(sm.mappings)) {
    console.log("  ❌ sync-map.json has no mappings array.\n");
    process.exit(1);
  }
  const reg = new Set(sm.mappings.map((m) => m.sourcePath).filter(Boolean));
  const issues = { unreg: [], orphan: [] };

  // ─── [1/2] Disk → Plan: detect unregistered files ───────
  console.log("  [1/2] Disk → Plan...");
  for (const t of TRACKED) {
    const abs = path.join(ROOT, t.dir);
    if (!fs.existsSync(abs)) continue;

    for (const f of await glob("**/*.md", { cwd: abs, absolute: true })) {
      const r = rel(f);
      if (path.basename(f) === "README.md") continue;
      if (!reg.has(r)) {
        issues.unreg.push({ path: r, domain: t.pfx });
      }
    }
  }

  // Check CLAUDE.md separately
  if (fs.existsSync(path.join(ROOT, "CLAUDE.md")) && !reg.has("CLAUDE.md")) {
    issues.unreg.push({ path: "CLAUDE.md", domain: "root" });
  }

  // ─── [2/2] Plan → Disk: detect orphaned files ───────────────
  console.log("  [2/2] Plan → Disk...");
  for (const m of sm.mappings) {
    const abs = path.join(ROOT, m.sourcePath);
    // Skip path traversal attempts (allow files at ROOT level and below)
    if (!isWithinRoot(abs)) continue;
    if (!fs.existsSync(abs)) {
      issues.orphan.push({ path: m.sourcePath, plan: m.planFile });
    }
  }

  // ─── Output results ─────────────────────────────────────────
  if (issues.unreg.length) {
    console.log(`\n  ⚠️  Unregistered (${issues.unreg.length}):`);
    issues.unreg.forEach((i) => console.log(`     + ${i.path}`));
  }
  if (issues.orphan.length) {
    console.log(`\n  ⚠️  Orphaned (${issues.orphan.length}):`);
    issues.orphan.forEach((i) => console.log(`     - ${i.path}`));
  }

  const total = issues.unreg.length + issues.orphan.length;
  console.log(`\n  Registered: ${reg.size} | Unregistered: ${issues.unreg.length} | Orphaned: ${issues.orphan.length}`);
  console.log(total === 0 ? "  ✅ All in sync\n" : `  ⚠️  ${total} issues\n`);

  // ─── Update stale-report.json ────────────────────────────
  updateStaleReport(GEN, "syncMisses",
    { checkedAt: new Date().toISOString(), unregistered: issues.unreg, orphaned: issues.orphan },
    { syncIssues: total, status: total === 0 ? "ok" : "warning" }
  );

  // Exit 1 only for orphaned files (actual breakage), not for unregistered (informational)
  const orphanCount = issues.orphan.length;
  process.exit(orphanCount > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(e => { console.error(`\n  ❌ Unexpected error: ${e.message || e}`); process.exit(1); });
}

module.exports = { main };
