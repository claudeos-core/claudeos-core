/**
 * M2 — CLAUDEOS_SKIP_TRANSLATION=1 escape hatch.
 *
 * Purpose: make translation-dependent tests deterministic regardless of
 * whether `claude` CLI is authenticated in the test env. Also useful for CI
 * environments that don't install `claude` at all.
 *
 * Without this guard, the 6 tests under `lang-aware-fallback.test.js` that
 * assert "translation must throw without CLI" would fail on every dev
 * machine where Claude Code is installed — they'd shell out, get a real
 * translation, and the expected-throw assertion would flip.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { scaffoldMemory } = require("../lib/memory-scaffold");

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "m2-")); }
function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) {} }

test("M2: CLAUDEOS_SKIP_TRANSLATION=1 forces translateIfNeeded to throw before calling claude CLI", () => {
  const prior = process.env.CLAUDEOS_SKIP_TRANSLATION;
  process.env.CLAUDEOS_SKIP_TRANSLATION = "1";
  const d = tmpDir();
  try {
    assert.throws(
      () => scaffoldMemory(path.join(d, "claudeos-core/memory"), { lang: "ko" }),
      /CLAUDEOS_SKIP_TRANSLATION=1/,
      "error must surface the env-skip reason so users can diagnose",
    );
  } finally {
    if (prior === undefined) delete process.env.CLAUDEOS_SKIP_TRANSLATION;
    else process.env.CLAUDEOS_SKIP_TRANSLATION = prior;
    cleanup(d);
  }
});

test("M2: error message names the lang so failure is actionable", () => {
  const prior = process.env.CLAUDEOS_SKIP_TRANSLATION;
  process.env.CLAUDEOS_SKIP_TRANSLATION = "1";
  const d = tmpDir();
  try {
    assert.throws(
      () => scaffoldMemory(path.join(d, "claudeos-core/memory"), { lang: "ja" }),
      /lang='ja'/,
    );
  } finally {
    if (prior === undefined) delete process.env.CLAUDEOS_SKIP_TRANSLATION;
    else process.env.CLAUDEOS_SKIP_TRANSLATION = prior;
    cleanup(d);
  }
});

test("M2: lang='en' path is NOT affected by the env guard (no-op for English)", () => {
  const prior = process.env.CLAUDEOS_SKIP_TRANSLATION;
  process.env.CLAUDEOS_SKIP_TRANSLATION = "1";
  const d = tmpDir();
  try {
    // English doesn't translate; must succeed even when env guard is set.
    assert.doesNotThrow(
      () => scaffoldMemory(path.join(d, "claudeos-core/memory"), { lang: "en" }),
    );
  } finally {
    if (prior === undefined) delete process.env.CLAUDEOS_SKIP_TRANSLATION;
    else process.env.CLAUDEOS_SKIP_TRANSLATION = prior;
    cleanup(d);
  }
});

test("M2: unset env → guard does not fire (default behavior preserved)", () => {
  const prior = process.env.CLAUDEOS_SKIP_TRANSLATION;
  delete process.env.CLAUDEOS_SKIP_TRANSLATION;
  try {
    // Just import + call — we're not asserting what happens without the env,
    // only that the env-skip branch is specifically gated on "1".
    // (On a machine with Claude CLI, translation would actually run; we
    // can't assert the outcome without real CLI side-effects, so we just
    // confirm the guard is opt-in.)
    const source = fs.readFileSync(
      path.join(__dirname, "../lib/memory-scaffold.js"),
      "utf-8",
    );
    assert.ok(
      source.match(/CLAUDEOS_SKIP_TRANSLATION\s*===\s*"1"/),
      "guard must be strictly opt-in (=== '1'), not truthy-coerce",
    );
  } finally {
    if (prior !== undefined) process.env.CLAUDEOS_SKIP_TRANSLATION = prior;
  }
});

test("init.js fails fast when CLAUDEOS_SKIP_TRANSLATION=1 + non-English lang", () => {
  // Round 3 fix: if the user has this test-only env var set accidentally
  // AND picks --lang ko/ja/etc, the pipeline would later crash inside Pass 4
  // with a confusing "translation skipped" error (multiple lines deep into
  // scaffoldMemory). Fail fast at language-selection time with a clear
  // remediation message instead.
  const initSrc = fs.readFileSync(
    path.join(__dirname, "../bin/commands/init.js"),
    "utf-8",
  );
  // The early check must reference both conditions: env var + non-en lang
  assert.ok(
    initSrc.includes("CLAUDEOS_SKIP_TRANSLATION") &&
    initSrc.includes('process.env.CLAUDEOS_SKIP_TRANSLATION === "1"'),
    "init.js must read process.env.CLAUDEOS_SKIP_TRANSLATION === '1' at lang check",
  );
  assert.ok(
    initSrc.match(/CLAUDEOS_SKIP_TRANSLATION[\s\S]{0,500}lang\s*!==\s*["']en["']/),
    "init.js must check env var AND lang !== 'en' together (early-fail gate)",
  );
  // Must surface remediation (unset env var or --lang en)
  assert.ok(
    initSrc.match(/unset CLAUDEOS_SKIP_TRANSLATION|--lang en/),
    "init.js early-fail must suggest how to fix (unset or --lang en)",
  );
  // Must use InitError so the CLI formats it appropriately
  const earlyFailBlock = initSrc.match(/CLAUDEOS_SKIP_TRANSLATION === "1"[\s\S]{0,800}/);
  assert.ok(earlyFailBlock, "early-fail block not found");
  assert.match(earlyFailBlock[0], /throw new InitError/, "early-fail must throw InitError, not warn");
});

test("M3: CI workflow wires CLAUDEOS_SKIP_TRANSLATION=1 into npm test env", () => {
  // Ensure the CI workflow sets the env guard before running tests. Without
  // it, the 5 translation-dependent tests would fail deterministically on
  // any CI runner that doesn't have Claude CLI installed.
  const workflow = path.join(__dirname, "../.github/workflows/test.yml");
  assert.ok(fs.existsSync(workflow), ".github/workflows/test.yml must exist");
  const src = fs.readFileSync(workflow, "utf-8");

  // Prefer structural YAML parse (js-yaml is a transitive dep via gray-matter
  // so normally always available). If it ever disappears, degrade to regex
  // checks rather than flagging the test itself as broken — missing YAML
  // validation is a separate concern from workflow correctness.
  let yaml = null;
  try { yaml = require("js-yaml"); } catch (_e) { /* fall through to regex */ }

  if (yaml) {
    let parsed;
    try { parsed = yaml.load(src); }
    catch (err) { assert.fail(`workflow YAML failed to parse: ${err.message}`); }
    assert.ok(parsed && typeof parsed === "object", "workflow must parse to a YAML object");
    assert.ok(parsed.jobs && parsed.jobs.test, "workflow must define a 'test' job");
    const steps = parsed.jobs.test.steps || [];
    const testStep = steps.find(s => s && s.run && /npm\s+test/.test(s.run));
    assert.ok(testStep, "workflow must have a step that runs `npm test`");
    assert.ok(
      testStep.env && String(testStep.env.CLAUDEOS_SKIP_TRANSLATION) === "1",
      "the `npm test` step must set CLAUDEOS_SKIP_TRANSLATION='1' in its env",
    );
  } else {
    // Fallback: regex-only validation. Narrower than structural parse but
    // still catches the "env var completely missing" regression. Anchor on
    // the value-end boundary so `CLAUDEOS_SKIP_TRANSLATION: 1foo` does NOT
    // falsely match (the `?` on the quote is optional so without a trailing
    // boundary, `1` followed by any char would pass).
    assert.match(
      src,
      /CLAUDEOS_SKIP_TRANSLATION:\s*(?:['"]1['"]|1)(?:\s|$)/m,
      "workflow must set CLAUDEOS_SKIP_TRANSLATION=1 (value boundary enforced) for the test step",
    );
    assert.match(src, /npm\s+test/, "workflow must invoke `npm test`");
  }
});

test("M2: guard is strictly '=== \"1\"' — source inspection (no translation side-effects)", () => {
  // Regression: the guard must be strictly === "1" to avoid surprise-triggering
  // from common env convention differences ("true", "0", ""). Instead of
  // running scaffoldMemory for each value (which either shells out to
  // `claude` for 99s or flips outcomes per env), validate via static source
  // inspection — much faster and more reliable.
  const source = fs.readFileSync(
    path.join(__dirname, "../lib/memory-scaffold.js"),
    "utf-8",
  );
  // Must use strict triple-equals against the string "1"
  assert.ok(
    source.match(/process\.env\.CLAUDEOS_SKIP_TRANSLATION\s*===\s*"1"/),
    "guard must be `process.env.CLAUDEOS_SKIP_TRANSLATION === \"1\"` (strict)",
  );
  // Must NOT use loose truthiness like `if (process.env.X)` or `!!x`
  assert.doesNotMatch(
    source,
    /if\s*\(\s*process\.env\.CLAUDEOS_SKIP_TRANSLATION\s*\)/,
    "guard must not use truthy-coerce (would trigger on any non-empty value)",
  );
  // Must throw (not silently return) when the guard fires
  const guardBlock = source.match(/CLAUDEOS_SKIP_TRANSLATION\s*===\s*"1"[\s\S]{0,300}/);
  assert.ok(guardBlock, "guard block not found");
  assert.match(guardBlock[0], /throw new Error/, "guard must throw, not return");
});
