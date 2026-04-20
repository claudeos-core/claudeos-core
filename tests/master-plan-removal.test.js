/**
 * Tests: master-plan-removal.test.js
 *
 * Pins the invariants of the "master plan generation removal" change so
 * future edits can't silently re-introduce the old behavior:
 *   - init.js must not call 3d-standard / 3d-rules / 3d-skills / 3d-guide stages
 *   - scaffoldMasterPlans must be a no-op that writes zero files
 *   - Pass 4 prompt (pass-prompts/templates/common/pass4.md) must not instruct
 *     Claude to generate plan/50.memory-master.md
 *   - plan-validator must tolerate a missing plan/ directory (exit 0)
 *   - sync-checker must tolerate a missing plan/ directory (exit 0)
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

// ─── source-parity: init.js ─────────────────────────────────

test("master-plan-removal: init.js does NOT call removed 3d sub-stages", () => {
  const initSrc = fs.readFileSync(path.join(ROOT, "bin/commands/init.js"), "utf-8");

  for (const removed of ["3d-standard", "3d-rules", "3d-skills", "3d-guide"]) {
    const pattern = new RegExp(`runStage\\("${removed}"`);
    assert.doesNotMatch(initSrc, pattern,
      `init.js must NOT call runStage("${removed}") — master plan aggregation was removed`);
  }

  // 3d-aux is the only remaining 3d sub-stage.
  assert.match(initSrc, /runStage\("3d-aux"/,
    "init.js must still call runStage(\"3d-aux\") — it is the only remaining 3d sub-stage");

  // A plain "3d" stage must not exist either.
  assert.doesNotMatch(initSrc, /runStage\("3d"\s*,/,
    "init.js must NOT have a plain runStage(\"3d\", ...) call");
});

test("master-plan-removal: init.js does NOT hardcode planFiles for 50.memory-master.md in fallback marker", () => {
  const initSrc = fs.readFileSync(path.join(ROOT, "bin/commands/init.js"), "utf-8");

  // The legacy fallback marker included
  //   planFiles: ["claudeos-core/plan/50.memory-master.md"]
  // This must no longer be emitted by applyStaticFallback.
  assert.doesNotMatch(
    initSrc,
    /planFiles\s*:\s*\[\s*"claudeos-core\/plan\/50\.memory-master\.md"/,
    "init.js fallback marker must not hardcode plan/50.memory-master.md in planFiles"
  );
});

// ─── source-parity: pass4.md ─────────────────────────────────

test("master-plan-removal: pass4 prompt does NOT instruct Claude to create plan/50.memory-master.md", () => {
  const passPath = path.join(ROOT, "pass-prompts/templates/common/pass4.md");
  const src = fs.readFileSync(passPath, "utf-8");

  // There must be no required-output section targeting plan/50.memory-master.md.
  assert.doesNotMatch(
    src,
    /### \d+\.\s+`plan\/50\.memory-master\.md`/,
    "pass4.md must not have a '### N. `plan/50.memory-master.md`' required-output section"
  );

  // The completion marker's planFiles example (which used to list
  // plan/50.memory-master.md) must be gone as well.
  assert.doesNotMatch(
    src,
    /"planFiles"\s*:\s*\[[^\]]*50\.memory-master\.md/,
    "pass4.md completion marker must not include plan/50.memory-master.md in planFiles"
  );
});

// ─── runtime behavior: scaffoldMasterPlans is a no-op ───────

test("master-plan-removal: scaffoldMasterPlans writes zero files", () => {
  const { scaffoldMasterPlans, scaffoldMemory } = require(path.join(ROOT, "lib/memory-scaffold"));

  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-master-plan-removal-"));
  try {
    const memoryDir = path.join(d, "memory");
    const planDir = path.join(d, "plan");
    scaffoldMemory(memoryDir);

    // Run a few times in different shapes — must always be a no-op.
    for (const opts of [undefined, {}, { lang: "en" }, { lang: "ko" }, { overwrite: true }]) {
      const results = scaffoldMasterPlans(planDir, memoryDir, opts);
      assert.ok(Array.isArray(results), "must return an array");
      assert.equal(results.length, 0, "must return empty results (no-op)");
    }

    // No plan file must appear on disk after any of those calls.
    if (fs.existsSync(planDir)) {
      const leftovers = fs.readdirSync(planDir);
      assert.equal(
        leftovers.length,
        0,
        `plan/ must remain empty, but saw: ${leftovers.join(", ")}`
      );
    }
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── CLI tools: tolerate missing plan/ ──────────────────────

function spawnNode(scriptPath, cwd) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    env: { ...process.env, CLAUDEOS_ROOT: cwd },
    encoding: "utf-8",
    timeout: 20_000,
  });
}

test("master-plan-removal: plan-validator exits 0 when plan/ directory is missing", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-pv-nopath-"));
  try {
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
    // Deliberately do NOT create claudeos-core/plan/.
    const r = spawnNode(path.join(ROOT, "plan-validator/index.js"), d);
    assert.equal(r.status, 0,
      `plan-validator exit code should be 0 when plan/ is missing, got ${r.status}\n` +
      `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("master-plan-removal: sync-checker exits 0 when plan/ directory is missing", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-sc-nopath-"));
  try {
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
    // Write a minimal sync-map.json with empty mappings so the tool can load it.
    fs.writeFileSync(
      path.join(d, "claudeos-core/generated/sync-map.json"),
      JSON.stringify({ mappings: [], summary: { totalMappings: 0 } })
    );
    const r = spawnNode(path.join(ROOT, "sync-checker/index.js"), d);
    assert.equal(r.status, 0,
      `sync-checker exit code should be 0 when plan/ is missing, got ${r.status}\n` +
      `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("master-plan-removal: sync-checker exits 0 when sync-map has no mappings (empty plan)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-sc-empty-"));
  try {
    // plan/ exists but is empty → manifest-generator would produce empty mappings.
    fs.mkdirSync(path.join(d, "claudeos-core/plan"), { recursive: true });
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
    fs.writeFileSync(
      path.join(d, "claudeos-core/generated/sync-map.json"),
      JSON.stringify({ mappings: [], summary: { totalMappings: 0 } })
    );
    const r = spawnNode(path.join(ROOT, "sync-checker/index.js"), d);
    assert.equal(r.status, 0,
      `sync-checker exit code should be 0 when mappings are empty, got ${r.status}\n` +
      `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── v2.1.0: plan-sync-status.json guard ───────────────────────
// plan-validator must not create a 147 B all-zeros status file when plan/
// is absent or empty — previously this file was always generated and
// cluttered health-check output with noise.

test("master-plan-removal: plan-validator does NOT write plan-sync-status.json when plan/ is missing", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-pv-nostatus-"));
  try {
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
    // No plan/ directory.
    const r = spawnNode(path.join(ROOT, "plan-validator/index.js"), d);
    assert.equal(r.status, 0, `plan-validator should exit 0, got ${r.status}`);

    const statusPath = path.join(d, "claudeos-core/generated/plan-sync-status.json");
    assert.ok(!fs.existsSync(statusPath),
      "plan-sync-status.json must NOT be created when plan/ is missing");

    // stale-report should still be written so health-checker sees a clean result
    const staleReportPath = path.join(d, "claudeos-core/generated/stale-report.json");
    assert.ok(fs.existsSync(staleReportPath),
      "stale-report.json should still be written");
    const staleReport = JSON.parse(fs.readFileSync(staleReportPath, "utf-8"));
    assert.ok(staleReport.planValidation,
      "stale-report must include planValidation entry");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("master-plan-removal: plan-validator does NOT write plan-sync-status.json when plan/ exists but is empty", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-pv-empty-"));
  try {
    // plan/ directory exists (e.g., leftover from pre-v2.1 project) but has no .md files
    fs.mkdirSync(path.join(d, "claudeos-core/plan"), { recursive: true });
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });

    const r = spawnNode(path.join(ROOT, "plan-validator/index.js"), d);
    assert.equal(r.status, 0, `plan-validator should exit 0, got ${r.status}`);

    const statusPath = path.join(d, "claudeos-core/generated/plan-sync-status.json");
    assert.ok(!fs.existsSync(statusPath),
      "plan-sync-status.json must NOT be created when plan/ is empty");

    // stale-report still exists
    const staleReportPath = path.join(d, "claudeos-core/generated/stale-report.json");
    assert.ok(fs.existsSync(staleReportPath),
      "stale-report.json should still be written for empty plan/ case");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("master-plan-removal: plan-validator DOES write plan-sync-status.json when plan/ has real .md files (regression)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-pv-withplan-"));
  try {
    // Legacy project: plan/ has master plan files (e.g., upgrade from v2.0.x)
    fs.mkdirSync(path.join(d, "claudeos-core/plan"), { recursive: true });
    fs.writeFileSync(
      path.join(d, "claudeos-core/plan/10.standard-master.md"),
      '<file path="CLAUDE.md">\n# Legacy\n</file>\n'
    );
    fs.writeFileSync(path.join(d, "CLAUDE.md"), "# Legacy\n");
    fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });

    const r = spawnNode(path.join(ROOT, "plan-validator/index.js"), d);
    assert.equal(r.status, 0, `plan-validator should exit 0, got ${r.status}`);

    // When plan/ has files, plan-sync-status.json SHOULD still be produced
    // (backward compat for legacy projects that still use master plans)
    const statusPath = path.join(d, "claudeos-core/generated/plan-sync-status.json");
    assert.ok(fs.existsSync(statusPath),
      "plan-sync-status.json SHOULD be created when plan/ has actual files");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
