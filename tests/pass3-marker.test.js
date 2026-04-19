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
