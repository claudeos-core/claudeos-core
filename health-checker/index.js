#!/usr/bin/env node

/**
 * ClaudeOS-Core — Health Checker
 *
 * Role: Execute all verification tools sequentially and output consolidated results
 * Execution order:
 *   [0] manifest-generator  ← prerequisite: generates metadata like sync-map.json
 *   [1] plan-validator       ← Plan ↔ disk consistency
 *   [2] sync-checker         ← sync verification based on sync-map.json (requires manifest)
 *   [3] content-validator    ← generated file quality validation
 *   [4] pass-json-validator  ← Pass 1-3 JSON format validation
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/health-checker/index.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { updateStaleReport } = require("../lib/stale-report");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const TOOLS = path.resolve(__dirname, "..");
const GEN = path.join(ROOT, "claudeos-core/generated");

function run(name, script) {
  try {
    const output = execSync(`node "${script}"`, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { name, ok: true, output };
  } catch (e) {
    return { name, ok: false, output: [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message || "", exitCode: e.status || 1 };
  }
}

function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Health Checker       ║");
  console.log("╚═══════════════════════════════════════╝\n");

  // ─── [0] Run manifest-generator first (prerequisite) ──────────────────
  // Must run first because sync-checker reads sync-map.json
  let manifestOk = false;
  const manifestScript = path.join(TOOLS, "manifest-generator/index.js");
  if (fs.existsSync(manifestScript)) {
    process.stdout.write("  ⏳ manifest-generator — generating metadata...");
    const r = run("manifest-generator", manifestScript);
    if (r.ok) {
      console.log(" ✅");
      manifestOk = true;
    } else {
      console.log(" ❌");
      console.log("  ⚠️  manifest-generator failed. sync-checker will be skipped.");
    }
  } else {
    console.log("  ⏭️  manifest-generator — not found");
  }
  console.log();

  // ─── [1-4] Run verification tools sequentially ────────────────────
  //
  // Tool status tiers (3-way):
  //   - default       : non-zero exit → "fail" (❌, sets hasErr, blocks `health` exit code)
  //   - warnOnly:true  : non-zero exit → "warn" (⚠️, does not set hasErr)
  //   - softFail:true  : non-zero exit → "advisory" (ℹ️, does not set hasErr)
  //
  // The `softFail` tier (v2.4.0) was added for `content-validator` after
  // user feedback: its findings are documentation quality notes
  // (STALE_PATH suggestions, MANIFEST_DRIFT, NO_BAD_EXAMPLE) not generation
  // failures, but pre-fix it surfaced as "❌ fail" alongside the
  // "non-fatal" message — a confusing dual signal. `ℹ️ advisory` separates
  // the visual from real structural failures (plan-validator,
  // sync-checker, manifest-generator).
  //
  // `warnOnly` (existing) and `softFail` (new) are functionally similar at
  // the gate level; the tier name encodes intent: warn = "watch this",
  // advisory = "review when convenient". Both keep the health-check gate
  // green.
  const tools = [
    { name: "plan-validator",      script: path.join(TOOLS, "plan-validator/index.js"),      desc: "Plan consistency"                          },
    { name: "sync-checker",        script: path.join(TOOLS, "sync-checker/index.js"),        desc: "Sync status"                               },
    { name: "content-validator",   script: path.join(TOOLS, "content-validator/index.js"),   desc: "Content quality", softFail: true            },
    { name: "pass-json-validator", script: path.join(TOOLS, "pass-json-validator/index.js"), desc: "JSON format",     warnOnly: true            },
  ];

  const results = [];
  let hasErr = false;

  for (const t of tools) {
    if (!fs.existsSync(t.script)) {
      console.log(`  ⏭️  ${t.name} — not found`);
      results.push({ name: t.name, status: "skipped" });
      continue;
    }
    // Skip sync-checker if manifest-generator failed (depends on sync-map.json)
    if (t.name === "sync-checker" && !manifestOk) {
      console.log(`  ⏭️  ${t.name} — skipped (manifest-generator failed)`);
      results.push({ name: t.name, status: "skipped" });
      continue;
    }
    process.stdout.write(`  ⏳ ${t.name} — ${t.desc}...`);
    const r = run(t.name, t.script);
    if (r.ok) {
      console.log(" ✅");
      results.push({ name: t.name, status: "pass" });
    } else if (t.softFail) {
      console.log(" ℹ️");
      results.push({ name: t.name, status: "advisory" });
    } else if (t.warnOnly) {
      console.log(" ⚠️");
      results.push({ name: t.name, status: "warn" });
    } else {
      console.log(" ❌");
      results.push({ name: t.name, status: "fail" });
      hasErr = true;
    }
  }

  // ─── Results summary ──────────────────────────────────────────
  console.log("\n  ══════════════════════════════");
  results.forEach((r) => {
    const icon = r.status === "pass" ? "✅"
      : r.status === "fail" ? "❌"
      : r.status === "warn" ? "⚠️"
      : r.status === "advisory" ? "ℹ️"
      : "⏭️";
    console.log(`  ${icon} ${r.name.padEnd(22)} ${r.status}`);
  });
  console.log("  ──────────────────────────────");
  // Summary line: distinguish real failures (block the gate) from
  // advisory/warn results (informational, gate stays green).
  const failCount = results.filter((r) => r.status === "fail").length;
  const advisoryCount = results.filter((r) => r.status === "advisory").length;
  const warnCount = results.filter((r) => r.status === "warn").length;
  if (hasErr) {
    console.log(`  ⚠️  ${failCount} failed`);
  } else {
    const tail = [];
    if (advisoryCount) tail.push(`${advisoryCount} advisory`);
    if (warnCount) tail.push(`${warnCount} warning`);
    const suffix = tail.length ? ` (${tail.join(", ")})` : "";
    console.log(`  ✅ All systems operational${suffix}`);
  }
  console.log("  ══════════════════════════════\n");

  // ─── Update stale-report.json ────────────────────────────
  updateStaleReport(GEN, "healthCheck",
    { results, status: hasErr ? "fail" : "pass" },
    { totalIssues: results.filter((r) => r.status === "fail").length, healthStatus: hasErr ? "fail" : "ok" }
  );

  process.exit(hasErr ? 1 : 0);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n  ❌ Unexpected error: ${e.message || e}`); process.exit(1); }
}

module.exports = { main };
