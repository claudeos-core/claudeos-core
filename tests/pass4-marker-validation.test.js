/**
 * M1 — pass4-memory.json content validation.
 *
 * Prior bug: init.js only fileExists()-checked the Pass 4 marker before
 * accepting it as "Pass 4 complete". Claude can emit a malformed marker on
 * partial failure (e.g. `{"error":"timeout"}` or an empty `{}`) that still
 * satisfies existsSync and would silently poison every subsequent init run.
 *
 * Fix (init.js, Pass 4 block): introduce `isValidPass4Marker` that parses
 * the JSON and requires:
 *   - object shape (not array, not null)
 *   - passNum === 4
 *   - memoryFiles is a non-empty array
 *
 * Expected structure source: pass-prompts/templates/common/pass4.md:257-283.
 *
 * We reproduce the validator inline to test the decision logic; a separate
 * regression test (final block) asserts init.js actually ships this check.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "p4m-")); }
function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) {} }

function isValidPass4Marker(markerPath) {
  if (!fs.existsSync(markerPath)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(markerPath, "utf-8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) return false;
    if (data.passNum !== 4) return false;
    if (!Array.isArray(data.memoryFiles) || data.memoryFiles.length === 0) return false;
    return true;
  } catch (_e) { return false; }
}

function writeMarker(dir, body) {
  const fp = path.join(dir, "pass4-memory.json");
  fs.writeFileSync(fp, typeof body === "string" ? body : JSON.stringify(body));
  return fp;
}

test("M1: missing file → invalid", () => {
  const d = tmpDir();
  try {
    assert.equal(isValidPass4Marker(path.join(d, "pass4-memory.json")), false);
  } finally { cleanup(d); }
});

test("M1: malformed JSON → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, "{ this is not json ");
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: Claude error body {'error':'timeout'} → invalid (canonical failure)", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { error: "timeout" });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: empty object {} → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, {});
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: passNum wrong (3 instead of 4) → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: 3, memoryFiles: ["a.md"] });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: passNum stringified '4' → invalid (strict equality)", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: "4", memoryFiles: ["a.md"] });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: memoryFiles missing → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: 4 });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: memoryFiles is empty array → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: 4, memoryFiles: [] });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: memoryFiles is non-array → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: 4, memoryFiles: "claudeos-core/memory/decision-log.md" });
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: array at top level → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, [1, 2, 3]);
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: null at top level → invalid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, "null");
    assert.equal(isValidPass4Marker(fp), false);
  } finally { cleanup(d); }
});

test("M1: realistic Claude-written marker (passNum + all fields) → valid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, {
      analyzedAt: "2026-04-19T10:00:00.000Z",
      passNum: 4,
      memoryFiles: [
        "claudeos-core/memory/decision-log.md",
        "claudeos-core/memory/failure-patterns.md",
        "claudeos-core/memory/compaction.md",
        "claudeos-core/memory/auto-rule-update.md",
      ],
      ruleFiles: [".claude/rules/60.memory/01.decision-log.md"],
      claudeMdAppended: true,
    });
    assert.equal(isValidPass4Marker(fp), true);
  } finally { cleanup(d); }
});

test("M1: static-fallback marker shape (init.js applyStaticFallback) → valid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, {
      analyzedAt: "2026-04-19T10:00:00.000Z",
      passNum: 4,
      fallback: true,
      lang: "ko",
      memoryFiles: ["claudeos-core/memory/decision-log.md"],
      ruleFiles: [".claude/rules/00.core/51.doc-writing-rules.md"],
      claudeMdAppended: true,
    });
    assert.equal(isValidPass4Marker(fp), true);
  } finally { cleanup(d); }
});

test("M1: minimal valid marker (passNum + 1-element memoryFiles) → valid", () => {
  const d = tmpDir();
  try {
    const fp = writeMarker(d, { passNum: 4, memoryFiles: ["x.md"] });
    assert.equal(isValidPass4Marker(fp), true);
  } finally { cleanup(d); }
});

test("M1: stale-marker unlink failure surfaces as InitError (not silent skip)", () => {
  // Regression: previously the Pass 4 stale-detection swallowed unlink errors
  // with `catch (_e) { /* ignore */ }`. On Windows if AV or a file-watcher
  // had the handle open, the next `if (fileExists(pass4Marker))` check would
  // see the marker intact and skip Pass 4 → silent failure class that the
  // audit is eliminating. Now the catch logs + throws `InitError` so the
  // user gets an actionable message instead.
  const initSrc = fs.readFileSync(
    path.join(__dirname, "../bin/commands/init.js"),
    "utf-8",
  );
  assert.ok(
    initSrc.includes("dropStalePass4Marker"),
    "init.js must define a dropStalePass4Marker helper that surfaces unlink failures",
  );
  assert.ok(
    initSrc.includes("Failed to delete stale pass4-memory.json"),
    "init.js must log unlink failures with a specific message (not silent)",
  );
  assert.ok(
    initSrc.match(/throw\s+new\s+InitError[\s\S]{0,400}pass4-memory\.json/),
    "init.js must throw InitError (not swallow) when unlink fails",
  );
  // Both stale-detection branches must route through the helper so neither
  // one is silent.
  const helperCallCount = (initSrc.match(/dropStalePass4Marker\(/g) || []).length;
  assert.ok(
    helperCallCount >= 2,
    `dropStalePass4Marker must be called by both stale branches (memory-gone + malformed); found ${helperCallCount}`,
  );
});

test("M1: init.js implementation parity — confirms the real source uses this logic", () => {
  // Regression guard: any refactor that removes the content check must break
  // this test. Semantic checks (identifier presence + distinct substrings)
  // are preferred over multiline regex so the test tolerates innocent
  // refactors like split lines, added comments, or whitespace changes.
  const initSrc = fs.readFileSync(
    path.join(__dirname, "../bin/commands/init.js"),
    "utf-8",
  );
  assert.ok(
    initSrc.includes("isValidPass4Marker"),
    "init.js must declare/use isValidPass4Marker",
  );
  assert.ok(
    initSrc.includes("data.passNum !== 4") || initSrc.includes("data.passNum!==4"),
    "init.js must enforce passNum === 4 (strict not-equals against literal 4)",
  );
  // The non-empty memoryFiles check: two markers that must coexist (even if
  // split across lines): Array.isArray check and `.length === 0` fail.
  assert.ok(
    initSrc.includes("Array.isArray(data.memoryFiles)"),
    "init.js must verify memoryFiles is an array",
  );
  assert.ok(
    initSrc.includes("data.memoryFiles.length === 0") || initSrc.includes("data.memoryFiles.length===0"),
    "init.js must reject empty memoryFiles array",
  );
  // The post-Claude-run check must use the validator, not bare fileExists.
  assert.ok(
    initSrc.includes("!isValidPass4Marker(pass4Marker)"),
    "post-run gate must call isValidPass4Marker instead of fileExists",
  );
});
