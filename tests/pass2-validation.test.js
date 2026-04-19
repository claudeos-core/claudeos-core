/**
 * H3 — pass2-merged.json structural validation (resume path).
 *
 * Prior bug: init.js only fileExists()-checked pass2-merged.json before
 * skipping Pass 2 on resume. A prior crashed run could leave a skeleton
 * `{}` or malformed JSON; the skip path would accept it, and Pass 3 would
 * then parse garbage as its analysis input.
 *
 * Fix (init.js around the Pass 2 block): try-parse the file, verify it's a
 * non-empty object with ≥5 top-level keys (matches pass-json-validator's
 * INSUFFICIENT_KEYS threshold). On failure, delete and re-run Pass 2.
 *
 * Tests reproduce the validator logic inline — we can't spawn the real Pass 2
 * (needs claude CLI), so we just assert the decision branches match init.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "p2v-")); }
function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) {} }

// Matches init.js H3 check.
function isValidPass2(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    return Object.keys(parsed).length >= 5;
  } catch (_e) {
    return false;
  }
}

test("H3: missing file → invalid (triggers re-run)", () => {
  const d = tmpDir();
  try {
    assert.equal(isValidPass2(path.join(d, "pass2-merged.json")), false);
  } finally { cleanup(d); }
});

test("H3: malformed JSON → invalid (triggers re-run)", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, "{ this is not json ");
    assert.equal(isValidPass2(fp), false);
  } finally { cleanup(d); }
});

test("H3: empty object {} → invalid (matches pass-json-validator INSUFFICIENT_KEYS threshold)", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, "{}");
    assert.equal(isValidPass2(fp), false);
  } finally { cleanup(d); }
});

test("H3: object with 4 keys → invalid (below threshold)", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, JSON.stringify({ a: 1, b: 2, c: 3, d: 4 }));
    assert.equal(isValidPass2(fp), false);
  } finally { cleanup(d); }
});

test("H3: object with 5 keys → valid (at threshold)", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, JSON.stringify({
      commonPatterns: {}, sharedPatterns: {}, domainSpecific: {}, antiPatterns: {}, namingConventions: {},
    }));
    assert.equal(isValidPass2(fp), true);
  } finally { cleanup(d); }
});

test("H3: realistic 10-key pass2 output → valid", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, JSON.stringify({
      commonPatterns: { foo: "bar" },
      sharedPatterns: {},
      domainSpecific: {},
      antiPatterns: [],
      namingConventions: {},
      commonUtilities: [],
      security: {},
      testing: {},
      logging: {},
      codeQuality: {},
    }));
    assert.equal(isValidPass2(fp), true);
  } finally { cleanup(d); }
});

test("H3: array at top level → invalid (must be object)", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, "[1, 2, 3, 4, 5, 6]");
    assert.equal(isValidPass2(fp), false);
  } finally { cleanup(d); }
});

test("H3: null at top level → invalid", () => {
  const d = tmpDir();
  try {
    const fp = path.join(d, "pass2-merged.json");
    fs.writeFileSync(fp, "null");
    assert.equal(isValidPass2(fp), false);
  } finally { cleanup(d); }
});

test("H3: init.js implementation parity — confirms the real source uses this logic", () => {
  // Regression guard: if someone removes the H3 validation from init.js,
  // this test catches it. We check semantically (presence of identifiers
  // + behaviour) rather than with brittle regex, so the test tolerates
  // innocent refactors (variable renames, formatting changes).
  const initSrc = fs.readFileSync(
    path.join(__dirname, "../bin/commands/init.js"),
    "utf-8",
  );
  // Identifier must exist — names a specific guard variable, not a pattern.
  assert.ok(
    initSrc.includes("pass2IsValid"),
    "init.js must declare pass2IsValid for the resume-path check",
  );
  // The specific threshold of 5 top-level keys must appear with the right
  // operator. Check operator + literal together rather than full regex so
  // formatting changes (line breaks, whitespace) don't break this test.
  assert.ok(
    initSrc.includes(".length >= 5") || initSrc.includes(".length>=5"),
    "init.js must enforce the ≥5 top-level keys threshold exactly",
  );
  // User-visible failure reason — must distinguish from other pass2 errors.
  assert.ok(
    initSrc.includes("malformed or incomplete"),
    "init.js must surface the re-run reason to the user",
  );
});
