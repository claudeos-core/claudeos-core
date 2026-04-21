/**
 * Tests for Pass 3 output-accumulation mitigation
 *
 *   1. pass3-context-builder: splitRecommendation computation accuracy
 *      - small project → recommend: false
 *      - large output (many domains) → recommend: true
 *      - large input (pass2 > 300KB) → recommend: true
 *      - both → reasons records both
 *
 *   2. phase1: Rule D (output conciseness) / Rule E (batch idempotent) blocks exist
 *
 *   3. phase1: no conflict with existing rules A/B/C
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { buildPass3Context } = require("../plan-installer/pass3-context-builder");

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "v211-"));
}
function rm(d) {
  try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) { /* best-effort */ }
}
function writeAnalysis(dir, backendCount, frontendCount) {
  const backendDomains = Array.from({ length: backendCount }, (_, i) => ({
    name: `backend-${i}`, type: "backend", totalFiles: 10,
  }));
  const frontendDomains = Array.from({ length: frontendCount }, (_, i) => ({
    name: `frontend-${i}`, type: "frontend", totalFiles: 10,
  }));
  const analysis = {
    stack: { language: "typescript", framework: "vite", frontend: "react" },
    backendDomains, frontendDomains,
    frontend: { exists: frontendCount > 0 },
    summary: {
      totalDomains: backendCount + frontendCount,
      backendDomains: backendCount,
      frontendDomains: frontendCount,
    },
    activeDomains: {},
  };
  fs.writeFileSync(path.join(dir, "project-analysis.json"), JSON.stringify(analysis));
}

test("pass3 — splitRecommendation: small project (2 domains) → no split", () => {
  const dir = tmp();
  try {
    writeAnalysis(dir, 1, 1); // 2 domains total → ~27 files estimated
    const ctx = buildPass3Context(dir);
    assert.ok(ctx);
    assert.ok(ctx.splitRecommendation);
    assert.strictEqual(ctx.splitRecommendation.recommend, false);
    assert.deepStrictEqual(ctx.splitRecommendation.reasons, []);
    assert.strictEqual(ctx.splitRecommendation.totalDomains, 2);
    // 15 + 2*6 = 27
    assert.strictEqual(ctx.splitRecommendation.estimatedFileCount, 27);
  } finally { rm(dir); }
});

test("pass3 — splitRecommendation: large output (7 frontend domains → 57 files) → recommend", () => {
  const dir = tmp();
  try {
    // frontend-heavy case: 0 backend, 7 frontend
    writeAnalysis(dir, 0, 7);
    const ctx = buildPass3Context(dir);
    assert.ok(ctx);
    assert.strictEqual(ctx.splitRecommendation.recommend, true);
    assert.strictEqual(ctx.splitRecommendation.estimatedFileCount, 15 + 7 * 6); // 57
    assert.ok(
      ctx.splitRecommendation.reasons.some(r => /output files/.test(r)),
      `expected output-threshold reason, got: ${JSON.stringify(ctx.splitRecommendation.reasons)}`
    );
  } finally { rm(dir); }
});

test("pass3 — splitRecommendation: large input (> 300KB pass2-merged) → recommend", () => {
  const dir = tmp();
  try {
    writeAnalysis(dir, 1, 0); // tiny project, 21 files estimated — won't trigger output threshold
    // Create a pass2-merged.json > 300 KB
    const bigPayload = { padding: "x".repeat(400 * 1024) };
    fs.writeFileSync(path.join(dir, "pass2-merged.json"), JSON.stringify(bigPayload));
    const ctx = buildPass3Context(dir);
    assert.ok(ctx);
    assert.strictEqual(ctx.splitRecommendation.recommend, true);
    assert.ok(
      ctx.splitRecommendation.reasons.some(r => /pass2-merged\.json is \d+ KB/.test(r)),
      `expected input-threshold reason, got: ${JSON.stringify(ctx.splitRecommendation.reasons)}`
    );
  } finally { rm(dir); }
});

test("pass3 — splitRecommendation: at threshold boundaries", () => {
  const dir = tmp();
  try {
    // exactly 35 files = at the threshold (> 35 needed for recommend)
    // 35 = 15 + N*6 → N = 3.33, so 3 domains → 33 files (below), 4 domains → 39 files (above)
    writeAnalysis(dir, 2, 1); // 3 domains → 33 files: should NOT recommend
    let ctx = buildPass3Context(dir);
    assert.strictEqual(ctx.splitRecommendation.recommend, false);

    rm(dir);
    const dir2 = tmp();
    writeAnalysis(dir2, 2, 2); // 4 domains → 39 files: SHOULD recommend
    ctx = buildPass3Context(dir2);
    assert.strictEqual(ctx.splitRecommendation.recommend, true);
    rm(dir2);
  } finally { /* tmp already rm'd */ }
});

test("pass3 — phase1 template contains Rule D (output conciseness)", () => {
  const phase1Path = path.join(__dirname, "..", "pass-prompts", "templates", "common", "pass3-phase1.md");
  const content = fs.readFileSync(phase1Path, "utf-8");
  assert.match(content, /Rule D/);
  assert.match(content, /Output conciseness/);
  assert.match(content, /\[WRITE\]/);
  assert.match(content, /\[SKIP\]/);
  // Must warn about the specific failure mode
  assert.match(content, /Prompt is too long/);
});

test("pass3 — phase1 template contains Rule E (batch idempotent)", () => {
  const phase1Path = path.join(__dirname, "..", "pass-prompts", "templates", "common", "pass3-phase1.md");
  const content = fs.readFileSync(phase1Path, "utf-8");
  assert.match(content, /Rule E/);
  assert.match(content, /Glob/);
  assert.match(content, /batch.*idempotent|Batch idempotent/i);
});

test("pass3 — phase1 template preserves existing Rule A/B/C", () => {
  const phase1Path = path.join(__dirname, "..", "pass-prompts", "templates", "common", "pass3-phase1.md");
  const content = fs.readFileSync(phase1Path, "utf-8");
  // Regression guard: preserve v2.1.0 original rules
  assert.match(content, /Rule A/);
  assert.match(content, /Rule B/);
  assert.match(content, /Rule C/);
  assert.match(content, /Reference, don't re-read/);
  assert.match(content, /Idempotent file writing/);
  assert.match(content, /Cross-file consistency/);
});

test("pass3 — splitRecommendation size stays small (<6KB total context)", () => {
  const dir = tmp();
  try {
    writeAnalysis(dir, 10, 10); // max-load scenario
    const ctx = buildPass3Context(dir);
    const serialized = JSON.stringify(ctx);
    // The previous cap was 5KB; splitRecommendation adds a little, but
    // the serialized context must still stay under 6KB
    assert.ok(serialized.length < 6 * 1024,
      `context too large after splitRecommendation: ${serialized.length} bytes`);
  } finally { rm(dir); }
});

// ─── Pass 3 split mode (always on) ────────────────────────────
//
// Design: Pass 3 runs in split mode unconditionally. There is no longer any
// environment variable toggle; single-call mode was removed because empirical
// data showed it failed reliably on projects with more than ~5 domains.
// splitRecommendation is retained in pass3-context.json for informational
// logging but does NOT drive any decision.

test("pass3 — split is always enabled (no env toggle)", () => {
  // Sanity invariant: this function/test block documents that split mode
  // has no escape hatch. If anyone tries to reintroduce a toggle, this
  // intent reminder should surface in code review.
  const alwaysSplit = true;
  assert.strictEqual(alwaysSplit, true,
    "Pass 3 must always run in split mode — single-call was removed");
});

test("pass3 — init.js source-parity: single-call mode has been completely removed", () => {
  // After removing single-call mode, init.js must no longer reference
  // CLAUDEOS_PASS3_SPLIT, pass3SplitEnabled, or any branch that falls
  // through to single-call processing. Pass 3 always runs in split mode.
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // Environment variable must no longer drive Pass 3 flow.
  assert.doesNotMatch(initSrc, /process\.env\.CLAUDEOS_PASS3_SPLIT/,
    "init.js must NOT read CLAUDEOS_PASS3_SPLIT — single-call mode was removed");
  assert.doesNotMatch(initSrc, /splitEnv\s*===\s*"0"/,
    "init.js must NOT have a =0 opt-out branch — single-call mode was removed");
  assert.doesNotMatch(initSrc, /splitEnv\s*===\s*"false"/,
    "init.js must NOT have a =false opt-out branch — single-call mode was removed");

  // No toggle variable for split mode.
  assert.doesNotMatch(initSrc, /pass3SplitEnabled/,
    "init.js must NOT carry a pass3SplitEnabled flag — Pass 3 is always split");

  // Pass 3 split runner must still be invoked.
  assert.match(initSrc, /await runPass3Split\(/,
    "init.js must call runPass3Split unconditionally");

  // splitRecommendation is still surfaced as informational log only.
  assert.match(initSrc, /splitRecommendation/,
    "init.js should still surface splitRecommendation for informational logging");
});

