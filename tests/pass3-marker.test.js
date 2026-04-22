/**
 * Pass 3 completion marker logic
 *
 * The marker file `claudeos-core/generated/pass3-complete.json` prevents
 * Pass 3 from re-running (and overwriting CLAUDE.md) on subsequent `init` invocations.
 *
 * These tests cover the marker detection + migration behavior without requiring
 * the actual Claude CLI. The logic mirrors bin/commands/init.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "p3m-")); }

test("v1.7.1 migration: backfills marker when CLAUDE.md + pass2 exist but marker missing", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  fs.writeFileSync(path.join(d, "CLAUDE.md"), "# Existing output from v1.7.1");
  fs.writeFileSync(path.join(G, "pass2-merged.json"), "{}");

  // Migration logic (same as init.js)
  const marker = path.join(G, "pass3-complete.json");
  const claudeMd = path.join(d, "CLAUDE.md");
  const pass2 = path.join(G, "pass2-merged.json");
  if (fs.existsSync(claudeMd) && !fs.existsSync(marker) && fs.existsSync(pass2)) {
    fs.writeFileSync(marker, JSON.stringify({ completedAt: new Date().toISOString(), backfilled: true }, null, 2));
  }

  assert.ok(fs.existsSync(marker), "marker should be backfilled");
  const body = JSON.parse(fs.readFileSync(marker, "utf-8"));
  assert.equal(body.backfilled, true);
  fs.rmSync(d, { recursive: true, force: true });
});

test("migration: does NOT backfill if pass2 missing (incomplete prior state)", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  fs.writeFileSync(path.join(d, "CLAUDE.md"), "# stale");

  const marker = path.join(G, "pass3-complete.json");
  const claudeMd = path.join(d, "CLAUDE.md");
  const pass2 = path.join(G, "pass2-merged.json");
  if (fs.existsSync(claudeMd) && !fs.existsSync(marker) && fs.existsSync(pass2)) {
    fs.writeFileSync(marker, JSON.stringify({ backfilled: true }, null, 2));
  }

  assert.ok(!fs.existsSync(marker), "should not backfill if pass2 absent (indicates incomplete prior run)");
  fs.rmSync(d, { recursive: true, force: true });
});

test("fresh mode: deletes pass3 + pass4 markers (re-run required)", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const p3 = path.join(G, "pass3-complete.json");
  const p4 = path.join(G, "pass4-memory.json");
  fs.writeFileSync(p3, "{}");
  fs.writeFileSync(p4, "{}");

  // Simulate fresh mode cleanup (matching init.js)
  if (fs.existsSync(p3)) fs.unlinkSync(p3);
  if (fs.existsSync(p4)) fs.unlinkSync(p4);

  assert.ok(!fs.existsSync(p3));
  assert.ok(!fs.existsSync(p4));
  fs.rmSync(d, { recursive: true, force: true });
});

test("marker present: skip indicator logic", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const marker = path.join(G, "pass3-complete.json");
  fs.writeFileSync(marker, JSON.stringify({ completedAt: "2026-04-15" }));

  // Logic: if marker exists, Pass 3 is skipped
  const shouldSkip = fs.existsSync(marker);
  assert.equal(shouldSkip, true);
  fs.rmSync(d, { recursive: true, force: true });
});

test("stale marker: pass3 marker exists but CLAUDE.md deleted → marker treated as stale", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const marker = path.join(G, "pass3-complete.json");
  fs.writeFileSync(marker, "{}");
  const claudeMd = path.join(d, "CLAUDE.md");
  // CLAUDE.md deliberately not created

  // Stale detection logic (matching init.js)
  if (fs.existsSync(marker) && !fs.existsSync(claudeMd)) {
    fs.unlinkSync(marker);
  }

  assert.ok(!fs.existsSync(marker), "stale marker should be removed");
  fs.rmSync(d, { recursive: true, force: true });
});

test("stale marker: pass4 marker exists but memory files gone → stale", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const marker = path.join(G, "pass4-memory.json");
  fs.writeFileSync(marker, "{}");
  // memory/ dir NOT created

  const memoryAny = fs.existsSync(path.join(d, "claudeos-core/memory/decision-log.md"))
    || fs.existsSync(path.join(d, "claudeos-core/memory/compaction.md"));
  if (fs.existsSync(marker) && !memoryAny) {
    fs.unlinkSync(marker);
  }

  assert.ok(!fs.existsSync(marker), "stale pass4 marker should be removed");
  fs.rmSync(d, { recursive: true, force: true });
});

test("valid marker preserved: pass4 marker + any memory file → keep marker", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const marker = path.join(G, "pass4-memory.json");
  fs.writeFileSync(marker, "{}");
  fs.mkdirSync(path.join(d, "claudeos-core/memory"), { recursive: true });
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# DL");

  const memoryAny = fs.existsSync(path.join(d, "claudeos-core/memory/decision-log.md"))
    || fs.existsSync(path.join(d, "claudeos-core/memory/compaction.md"));
  if (fs.existsSync(marker) && !memoryAny) {
    fs.unlinkSync(marker);
  }

  assert.ok(fs.existsSync(marker), "valid marker must be preserved when any memory file exists");
  fs.rmSync(d, { recursive: true, force: true });
});

test("fresh/--force gate: backfill guard must NOT fire when wasFreshClean is true", () => {
  // Regression: fresh mode deletes the pass3 marker but leaves root CLAUDE.md
  // intact. Before the wasFreshClean gate, the v1.7.x backfill branch would
  // observe (CLAUDE.md exists + marker missing + pass2 exists) and re-write
  // the marker, causing Pass 3 to skip on an explicit fresh request — leaving
  // the project in an inconsistent state (stale CLAUDE.md + new pass1/2 +
  // wiped .claude/rules/ + missing standard/skills/guide regeneration).
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  fs.writeFileSync(path.join(d, "CLAUDE.md"), "# Stale from prior run");
  fs.writeFileSync(path.join(G, "pass2-merged.json"), "{}");

  const marker = path.join(G, "pass3-complete.json");
  const claudeMd = path.join(d, "CLAUDE.md");
  const pass2 = path.join(G, "pass2-merged.json");
  const wasFreshClean = true;

  // Gated backfill logic (matching init.js)
  if (!wasFreshClean && fs.existsSync(claudeMd) && !fs.existsSync(marker) && fs.existsSync(pass2)) {
    fs.writeFileSync(marker, JSON.stringify({ backfilled: true }, null, 2));
  }

  assert.ok(!fs.existsSync(marker), "backfill must be suppressed under fresh/--force");
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── Pass 3 stale-marker recovery (v2.0.2) ──────────────────────────────
// Projects initialized before v2.0.0 could end up with a valid-looking
// pass3-complete.json marker on disk even though guide/ or standard/skills/
// plan/ were empty — the output-completeness guards only existed starting in
// v2.0.0. Without stale-detection on these outputs, `init` forever skips
// Pass 3 on those projects and `health` forever fails. The recovery is a
// direct mirror of the Pass 4 `dropStalePass4Marker` pattern.

const { EXPECTED_GUIDE_FILES } = require("../lib/expected-guides");
const { findMissingOutputs } = require("../lib/expected-outputs");

function setupValidPass3Outputs(d) {
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  const marker = path.join(G, "pass3-complete.json");
  fs.writeFileSync(marker, JSON.stringify({ completedAt: new Date().toISOString() }, null, 2));
  fs.writeFileSync(path.join(d, "CLAUDE.md"), "# Project");
  // All 9 guide files with non-empty content
  const guideDir = path.join(d, "claudeos-core/guide");
  for (const rel of EXPECTED_GUIDE_FILES) {
    const fp = path.join(guideDir, rel);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, "# " + rel);
  }
  // Expected outputs: standard sentinel + skills
  const coreDir = path.join(d, "claudeos-core/standard/00.core");
  fs.mkdirSync(coreDir, { recursive: true });
  fs.writeFileSync(path.join(coreDir, "01.project-overview.md"), "# overview");
  const skillsDir = path.join(d, "claudeos-core/skills/10.backend-crud");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, "orchestrator.md"), "# skill");
  // Note: master plan files (plan/*-master.md) are no longer generated, so
  // the fixture does not create claudeos-core/plan/. The stale-marker logic
  // does not depend on their presence.
  return { marker, guideDir };
}

// Replicates init.js Pass 3 stale-marker logic. Mirrors the production code
// in bin/commands/init.js so these tests stay meaningful even if the init
// module isn't importable in a pure unit context (it runs side-effects on load).
function runPass3StaleCheck(d) {
  const marker = path.join(d, "claudeos-core/generated/pass3-complete.json");
  const claudeMd = path.join(d, "CLAUDE.md");
  if (!fs.existsSync(marker)) return { dropped: false, reason: null };
  if (!fs.existsSync(claudeMd)) {
    fs.unlinkSync(marker);
    return { dropped: true, reason: "claude-md-missing" };
  }
  const guideDir = path.join(d, "claudeos-core/guide");
  const missingGuides = EXPECTED_GUIDE_FILES.filter(g => {
    const fp = path.join(guideDir, g);
    if (!fs.existsSync(fp)) return true;
    try {
      return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
    } catch (_e) { return true; }
  });
  if (missingGuides.length > 0) {
    fs.unlinkSync(marker);
    return { dropped: true, reason: "guides-missing", count: missingGuides.length };
  }
  const missingOutputs = findMissingOutputs(d);
  if (missingOutputs.length > 0) {
    fs.unlinkSync(marker);
    return { dropped: true, reason: "outputs-missing", count: missingOutputs.length };
  }
  return { dropped: false, reason: null };
}

test("stale pass3 marker: CLAUDE.md present but guide files missing → drop marker", () => {
  const d = tmpDir();
  const { marker, guideDir } = setupValidPass3Outputs(d);
  // Remove all guide files to simulate pre-v2.0.0 project state
  fs.rmSync(guideDir, { recursive: true, force: true });

  const result = runPass3StaleCheck(d);
  assert.equal(result.dropped, true);
  assert.equal(result.reason, "guides-missing");
  assert.ok(!fs.existsSync(marker), "marker should be removed when guides are missing");
  fs.rmSync(d, { recursive: true, force: true });
});

test("stale pass3 marker: one guide file BOM-only-empty → drop marker", () => {
  const d = tmpDir();
  const { marker, guideDir } = setupValidPass3Outputs(d);
  // BOM-only file (3 bytes, no real content) — content-validator treats as empty
  fs.writeFileSync(path.join(guideDir, EXPECTED_GUIDE_FILES[0]), "\uFEFF");

  const result = runPass3StaleCheck(d);
  assert.equal(result.dropped, true);
  assert.equal(result.reason, "guides-missing");
  assert.equal(result.count, 1);
  assert.ok(!fs.existsSync(marker));
  fs.rmSync(d, { recursive: true, force: true });
});

test("stale pass3 marker: guides present but skills/ empty → drop marker", () => {
  const d = tmpDir();
  const { marker } = setupValidPass3Outputs(d);
  // Remove skills/ to simulate post-guide truncation
  fs.rmSync(path.join(d, "claudeos-core/skills"), { recursive: true, force: true });

  const result = runPass3StaleCheck(d);
  assert.equal(result.dropped, true);
  assert.equal(result.reason, "outputs-missing");
  assert.ok(!fs.existsSync(marker));
  fs.rmSync(d, { recursive: true, force: true });
});

test("stale pass3 marker: guides present but standard sentinel missing → drop marker", () => {
  const d = tmpDir();
  const { marker } = setupValidPass3Outputs(d);
  fs.unlinkSync(path.join(d, "claudeos-core/standard/00.core/01.project-overview.md"));

  const result = runPass3StaleCheck(d);
  assert.equal(result.dropped, true);
  assert.equal(result.reason, "outputs-missing");
  assert.ok(!fs.existsSync(marker));
  fs.rmSync(d, { recursive: true, force: true });
});

test("valid pass3 marker: CLAUDE.md + all guides + all outputs present → preserve", () => {
  const d = tmpDir();
  const { marker } = setupValidPass3Outputs(d);

  const result = runPass3StaleCheck(d);
  assert.equal(result.dropped, false);
  assert.ok(fs.existsSync(marker), "complete project state must preserve marker");
  fs.rmSync(d, { recursive: true, force: true });
});

test("init.js source parity: dropStalePass3Marker helper + guide-stale + outputs-stale branches present", () => {
  // Guard against refactors that accidentally drop the stale-check branches
  // added in v2.0.2. If the helper or either sub-branch disappears from
  // init.js, the runtime behavior silently regresses to v2.0.1 (permanent
  // skip on pre-v2.0.0 projects) — this test is the tripwire.
  const src = fs.readFileSync(path.join(__dirname, "..", "bin/commands/init.js"), "utf-8");
  assert.ok(src.includes("dropStalePass3Marker"),
    "init.js must define the dropStalePass3Marker helper (symmetric with dropStalePass4Marker)");
  assert.ok(src.includes("EXPECTED_GUIDE_FILES"),
    "init.js must use EXPECTED_GUIDE_FILES in the stale-check branch");
  assert.ok(src.includes("findMissingOutputs"),
    "init.js must use findMissingOutputs in the stale-check branch");
  // Also guarantee both helpers are invoked from the stale-check region
  // (not just from Guard 3 after Pass 3 runs).
  const staleRegionMatch = src.match(/dropStalePass3Marker[\s\S]*?completedSteps\+\+/);
  assert.ok(staleRegionMatch, "dropStalePass3Marker must appear before the Pass 3 skip/run branch");
  const region = staleRegionMatch[0];
  assert.ok(region.includes("EXPECTED_GUIDE_FILES") && region.includes("findMissingOutputs"),
    "stale-check region must reference both guide files and expected outputs");
});

test("--force equivalent: unlinking all *.json in generated/ clears markers", () => {
  const d = tmpDir();
  const G = path.join(d, "claudeos-core/generated");
  fs.mkdirSync(G, { recursive: true });
  fs.writeFileSync(path.join(G, "pass1-1.json"), "{}");
  fs.writeFileSync(path.join(G, "pass2-merged.json"), "{}");
  fs.writeFileSync(path.join(G, "pass3-complete.json"), "{}");
  fs.writeFileSync(path.join(G, "pass4-memory.json"), "{}");
  fs.writeFileSync(path.join(G, "project-analysis.json"), "{}");

  // --force behavior from init.js
  const genFiles = fs.readdirSync(G).filter(f => f.endsWith(".json") || f.endsWith(".md"));
  for (const f of genFiles) fs.unlinkSync(path.join(G, f));

  assert.equal(fs.readdirSync(G).length, 0, "all files cleared");
  fs.rmSync(d, { recursive: true, force: true });
});

/**
 * v2.3.0 regression — resume decision on split-partial marker.
 *
 * Bug: cmdInit previously checked only `fileExists(pass3Marker)` before
 * deciding whether to call runPass3Split. A split-mode partial marker
 * (from a prior timeout mid-pipeline, e.g. 3d-aux stream idle) passed
 * that check and fell into the "skip" branch, so the remaining stages
 * never ran on re-execution. The database/ and mcp-guide/ directories
 * were silently left empty.
 *
 * Fix: additionally inspect the marker body. If mode === "split" and
 * completedAt is absent, treat it as resume-needed and call
 * runPass3Split. runPass3Split itself already knows how to skip
 * already-completed stages via `groupsCompleted`.
 *
 * These tests verify the decision function directly. The classification
 * logic is a pure function of the marker contents, extracted here.
 */
function classifyPass3Marker(markerContentOrAbsent) {
  // Mirrors the logic in bin/commands/init.js after the v2.3.0 fix.
  if (markerContentOrAbsent === null) {
    return { needsRun: true, isResume: false };
  }
  let parsed;
  try {
    parsed = JSON.parse(markerContentOrAbsent);
  } catch (_e) {
    // Malformed marker → caller handles via stale-drop elsewhere.
    // If still here, skip (do nothing) is the safest default.
    return { needsRun: false, isResume: false };
  }
  if (parsed && parsed.mode === "split" && !parsed.completedAt) {
    return { needsRun: true, isResume: true };
  }
  return { needsRun: false, isResume: false };
}

test("v2.3.0 resume: absent marker → fresh run", () => {
  const r = classifyPass3Marker(null);
  assert.equal(r.needsRun, true);
  assert.equal(r.isResume, false);
});

test("v2.3.0 resume: split-partial marker (no completedAt) → resume run", () => {
  // Exact shape from the backend-java-spring dogfood case: 3a/3b/3c done,
  // 3d-aux timed out, lastUpdatedAt present but completedAt absent.
  const marker = JSON.stringify({
    mode: "split",
    groupsCompleted: ["3a", "3b", "3c"],
    lastUpdatedAt: "2026-04-22T10:00:00.000Z",
  });
  const r = classifyPass3Marker(marker);
  assert.equal(r.needsRun, true, "must re-invoke runPass3Split to pick up 3d-aux");
  assert.equal(r.isResume, true);
});

test("v2.3.0 resume: fully-completed marker → skip", () => {
  const marker = JSON.stringify({
    mode: "split",
    groupsCompleted: ["3a", "3b", "3c", "3d-aux"],
    lastUpdatedAt: "2026-04-22T10:00:00.000Z",
    completedAt: "2026-04-22T10:00:00.000Z",
  });
  const r = classifyPass3Marker(marker);
  assert.equal(r.needsRun, false, "finished runs must not re-execute");
  assert.equal(r.isResume, false);
});

test("v2.3.0 resume: empty groupsCompleted array still counts as partial", () => {
  // Edge case: 3a itself timed out before persisting any completed stage.
  // groupsCompleted is [] and completedAt is absent.
  const marker = JSON.stringify({
    mode: "split",
    groupsCompleted: [],
    lastUpdatedAt: "2026-04-22T10:00:00.000Z",
  });
  const r = classifyPass3Marker(marker);
  assert.equal(r.needsRun, true);
  assert.equal(r.isResume, true);
});

test("v2.3.0 resume: malformed JSON → safe skip (upstream handles stale drop)", () => {
  const r = classifyPass3Marker("{not valid json");
  assert.equal(r.needsRun, false);
  assert.equal(r.isResume, false);
});

test("v2.3.0 resume: non-split mode marker → skip (not this function's concern)", () => {
  const marker = JSON.stringify({
    mode: "legacy-v1",
    completedAt: "2026-04-22T10:00:00.000Z",
  });
  const r = classifyPass3Marker(marker);
  assert.equal(r.needsRun, false);
});
