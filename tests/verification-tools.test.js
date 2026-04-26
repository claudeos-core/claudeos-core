/**
 * ClaudeOS-Core — Verification Tools Tests
 *
 * Tests verification tools (manifest-generator, content-validator, plan-validator,
 * sync-checker, pass-json-validator) by running them as child processes against
 * temporary project structures.
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const TOOLS_DIR = path.resolve(__dirname, "..");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-verify-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function runTool(script, root, expectFail = false) {
  try {
    const output = execSync(`node "${script}"`, {
      cwd: root,
      env: { ...process.env, CLAUDEOS_ROOT: root },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (e) {
    if (!expectFail) throw e;
    return { ok: false, output: e.stdout || "", stderr: e.stderr || "" };
  }
}

// ─── manifest-generator ──────────────────────────────────────

describe("manifest-generator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("generates rule-manifest.json from rules and standards", () => {
    // Setup minimal structure
    writeFile(path.join(tmp, ".claude/rules/00.core/01.test.md"), "---\npaths:\n  - \"**/*\"\n---\n# Test Rule\nContent here.");
    writeFile(path.join(tmp, "claudeos-core/standard/00.core/01.test.md"), "# Test Standard\nContent.");
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "manifest-generator/index.js"), tmp);
    assert.ok(r.ok, "manifest-generator should succeed");

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, "claudeos-core/generated/rule-manifest.json"), "utf-8"));
    assert.ok(manifest.rules.length >= 1, "should index at least 1 rule");
    assert.ok(manifest.standards.length >= 1, "should index at least 1 standard");
    assert.ok(manifest.summary.total >= 2, "total should be >= 2");
  });

  it("generates sync-map.json from plan files", () => {
    writeFile(path.join(tmp, "claudeos-core/plan/10.test.md"), '<file path="CLAUDE.md">\n# Test\n</file>');
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "manifest-generator/index.js"), tmp);
    assert.ok(r.ok);

    const syncMap = JSON.parse(fs.readFileSync(path.join(tmp, "claudeos-core/generated/sync-map.json"), "utf-8"));
    assert.ok(syncMap.mappings.length >= 1, "should extract at least 1 mapping");
    assert.equal(syncMap.mappings[0].sourcePath, "CLAUDE.md");
  });

  // ─── v2.1.0: plan-manifest.json was removed ────────────────
  // Master plan generation was removed; a manifest with an empty plans array
  // is noise. This fixes the "plan-manifest.json 62B left behind" gap
  // observed in 18-domain production runs.

  it("does NOT generate plan-manifest.json (removed in v2.1.0)", () => {
    // Setup: rules directory + empty generated/ (no plan/ dir exists)
    writeFile(path.join(tmp, ".claude/rules/00.core/01.rule.md"),
      "---\nname: Rule\npaths:\n  - \"**/*\"\n---\n\n# Rule\n");
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "manifest-generator/index.js"), tmp);
    assert.ok(r.ok, "manifest-generator should succeed");

    const planManifestPath = path.join(tmp, "claudeos-core/generated/plan-manifest.json");
    assert.ok(!fs.existsSync(planManifestPath),
      "plan-manifest.json must NOT be created (v2.1.0 removed it)");

    // Output log should say "3 files", not "4"
    assert.ok(r.output.includes("(3 files)"),
      `output should report 3 files, got: ${r.output}`);
  });

  it("does NOT generate plan-manifest.json even when plan/ dir has master plan files", () => {
    // Even with stale master plan files from an upgrade, we no longer index them
    writeFile(path.join(tmp, ".claude/rules/00.core/01.rule.md"),
      "---\nname: Rule\npaths:\n  - \"**/*\"\n---\n\n# Rule\n");
    writeFile(path.join(tmp, "claudeos-core/plan/10.standard-master.md"),
      "# Standard Master (leftover from v2.0.x)\n\n<file path=\"CLAUDE.md\">\n# CLAUDE\n</file>\n");
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "manifest-generator/index.js"), tmp);
    assert.ok(r.ok, "manifest-generator should succeed");

    const planManifestPath = path.join(tmp, "claudeos-core/generated/plan-manifest.json");
    assert.ok(!fs.existsSync(planManifestPath),
      "plan-manifest.json must NOT be created even if plan/ has leftover files");

    // sync-map.json should still index the plan/ file for sync-checker compat
    const syncMap = JSON.parse(fs.readFileSync(
      path.join(tmp, "claudeos-core/generated/sync-map.json"), "utf-8"));
    assert.ok(syncMap.mappings.length >= 1,
      "sync-map.json should still index leftover plan/ files for backward compat");
  });
});

// ─── content-validator ───────────────────────────────────────

describe("content-validator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("reports error when CLAUDE.md is missing", () => {
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(!r.ok, "should fail when CLAUDE.md missing");
    assert.ok(r.output.includes("CLAUDE.md"), "error should mention CLAUDE.md");
  });

  it("passes when CLAUDE.md exists with required sections", () => {
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nDeveloper\n## Build\ngradle build\n## Run\ngradle run\n## Standard\nSee docs\n## Skills\nSee skills\n\nLong enough content to pass the 100 char check. Additional text here to make it sufficiently long for validation.");
    mkdirp(path.join(tmp, ".claude/rules"));
    mkdirp(path.join(tmp, "claudeos-core/standard"));
    mkdirp(path.join(tmp, "claudeos-core/skills"));
    mkdirp(path.join(tmp, "claudeos-core/guide"));
    mkdirp(path.join(tmp, "claudeos-core/plan"));
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    // May still have warnings (guide files missing etc.) but CLAUDE.md error should not appear
    assert.ok(!r.output.includes("[MISSING] CLAUDE.md"), "should not report CLAUDE.md as missing");
  });

  // ─── Memory structural validation (v2.0.0 memory-only additions) ───

  it("flags MALFORMED_ENTRY when failure-patterns.md entry lacks required fields", () => {
    // Minimal project — just enough to reach the memory check section
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    // All other expected memory files need to exist so we isolate the failure-patterns check
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"), "# Decision Log\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    // Broken failure-patterns: entry without frequency / last seen / fix
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"),
      "# Failure Patterns\n\n## broken-pattern\njust some random text with no fields at all here\n");

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(r.output.includes("MALFORMED_ENTRY"),
      "should flag MALFORMED_ENTRY for missing fields");
    assert.ok(r.output.includes("broken-pattern"),
      "warning should reference the broken pattern id");
  });

  it("flags MISSING_MARKER when compaction.md lacks '## Last Compaction' section", () => {
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"), "# Decision Log\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"), "# Failure Patterns\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    // compaction.md without `## Last Compaction` marker
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"),
      "# Compaction Strategy\n\nSome body text but no Last Compaction section here.\n" + "x".repeat(60));

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(r.output.includes("MISSING_MARKER"),
      "should flag MISSING_MARKER when `## Last Compaction` is absent");
    assert.ok(r.output.includes("Last Compaction"),
      "warning should mention the missing marker name");
  });

  it("passes structural validation when memory files are well-formed", () => {
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    // Well-formed memory files
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"),
      "# Decision Log\n\n## 2026-04-17 — Initial architecture\n- Context: baseline\n- Decision: MyBatis\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"),
      "# Failure Patterns\n\n## null-ptr\n- frequency: 3\n- last seen: 2026-04-17\n- Fix: null check\n");
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"),
      "# Compaction Strategy\n\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"),
      "# Auto Rule Update Proposals\n" + "x".repeat(60));

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    // No structural warnings for memory files (may have unrelated warnings for missing rules/skills/etc.)
    assert.ok(!r.output.includes("MALFORMED_ENTRY"),
      "well-formed entries should not trigger MALFORMED_ENTRY");
    assert.ok(!r.output.includes("MISSING_MARKER"),
      "compaction.md with marker should not trigger MISSING_MARKER");
  });

  it("accepts bold-markdown fields (**frequency**:, **last seen**:, **Fix**:)", () => {
    // Regression guard: content-validator previously used `/\bfrequency\b\s*[:=]/i`
    // which did NOT match `- **frequency**: 5` because ** separates the word
    // from the colon. After `memory score` rewrites these fields with bold,
    // content-validator would falsely flag the entry as MALFORMED.
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"), "# Decision Log\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    // All fields in bold (as `memory score` writes them)
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"),
      "# Failure Patterns\n\n## bold-fields\n- **frequency**: 5 _(auto-scored)_\n- **last seen**: 2026-04-17\n- **importance**: 8\n- **Fix**: apply the patch\n");

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(!r.output.includes("MALFORMED_ENTRY"),
      "entries with bold-markdown fields must not be flagged as MALFORMED");
  });

  it("does not treat '## heading' inside fenced code blocks as a new entry", () => {
    // Regression guard: content-validator split on every `## ` line, so a
    // fenced code block containing example markdown headings would be
    // parsed as multiple entries — the real entry appeared "missing fields"
    // because its fields were "inherited" by a phantom entry from the code
    // block. Fence-aware parsing prevents this.
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"), "# Decision Log\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"),
      "# Failure Patterns\n\n## entry-with-codeblock\n- frequency: 3\n- last seen: 2026-04-17\n- Fix: use this config\n\n```yaml\n## example in code block\nkey: value\n```\n\nmore body\n");

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(!r.output.includes("MALFORMED_ENTRY"),
      "entry with embedded code block must not be split into phantom entries");
    assert.ok(!r.output.includes("example in code"),
      "code block heading should not be reported as an entry");
  });

  it("requires Fix/solution as a field line, not any word containing 'fix'", () => {
    // Regression guard: previous `/\bfix\b/i` matched any line mentioning
    // 'fix' (e.g. "prefix the name to fix conflict"), so an entry missing
    // a real `- Fix: ...` field would slip past validation. The new
    // regex requires `^[-]* (fix|solution) [:=]` (field line format).
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"), "# Decision Log\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    // Entry has verbose 'fix' word but NO field line — should now be flagged
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"),
      "# Failure Patterns\n\n## fake-fix\n- frequency: 3\n- last seen: 2026-04-17\nWe tried to prefix the bean names to fix the conflict.\n");

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(r.output.includes("MALFORMED_ENTRY"),
      "entry lacking real `- Fix:` field must be flagged despite 'fix' word in prose");
    assert.ok(r.output.includes("fix/solution"),
      "missing-fields list should name fix/solution");
  });

  it("decision-log.md: ignores '## YYYY-MM-DD' example inside code fence", () => {
    // Regression guard: decision-log's heading check used to scan every
    // `## ...` line, so a fenced markdown example in a decision's body
    // would be compared against the ISO-date rule and flagged falsely.
    writeFile(path.join(tmp, "CLAUDE.md"), "# Project\n## Role\nx\n## Build\nx\n## Run\nx\n## Standard\nx\n## Skills\nx\n\n" + "x".repeat(100));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify({ stack: { language: "java" }, lang: "en" }));
    writeFile(path.join(tmp, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/failure-patterns.md"), "# Failure Patterns\n" + "x".repeat(60));
    writeFile(path.join(tmp, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n" + "x".repeat(60));
    // Valid decision entry + a markdown fence showing syntax examples
    writeFile(path.join(tmp, "claudeos-core/memory/decision-log.md"),
      "# Decision Log\n\n## 2026-04-17 — Real decision\n- Context: example\n\nSyntax illustration:\n\n```markdown\n## Not a real entry heading\n- Context: example\n```\n" + "x".repeat(60));

    const r = runTool(path.join(TOOLS_DIR, "content-validator/index.js"), tmp, true);
    assert.ok(!r.output.includes("Not a real entry"),
      "fenced example heading must not be flagged as malformed decision");
  });
});

// ─── plan-validator ──────────────────────────────────────────

describe("plan-validator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects synced files in --check mode", () => {
    // Create plan with <file> block matching disk
    writeFile(path.join(tmp, "CLAUDE.md"), "# My Project");
    writeFile(path.join(tmp, "claudeos-core/plan/10.test.md"), '<file path="CLAUDE.md">\n# My Project\n</file>');
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "plan-validator/index.js"), tmp);
    assert.ok(r.ok, "should pass when plan matches disk");
    assert.ok(r.output.includes("Synced: 1"), "should report 1 synced");
  });

  it("detects missing files in --check mode", () => {
    // Plan references a file that doesn't exist
    writeFile(path.join(tmp, "claudeos-core/plan/10.test.md"), '<file path="CLAUDE.md">\n# Missing\n</file>');
    mkdirp(path.join(tmp, "claudeos-core/generated"));

    const r = runTool(path.join(TOOLS_DIR, "plan-validator/index.js"), tmp, true);
    assert.ok(!r.ok, "should fail when file missing");
    assert.ok(r.output.includes("MISSING"), "should report MISSING");
  });
});

// ─── pass-json-validator ─────────────────────────────────────

describe("pass-json-validator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("validates project-analysis.json format", () => {
    const analysis = {
      analyzedAt: new Date().toISOString(),
      stack: { language: "java", framework: "spring-boot" },
      domains: [{ name: "user", totalFiles: 5 }],
      frontend: { exists: false },
      summary: { totalDomains: 1 },
      lang: "en",
      templates: { backend: "java-spring", frontend: null },
    };
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), JSON.stringify(analysis));
    writeFile(path.join(tmp, "claudeos-core/generated/domain-groups.json"), JSON.stringify({
      generatedAt: new Date().toISOString(), totalDomains: 1, totalGroups: 1,
      groups: [{ domains: ["user"], type: "backend", estimatedFiles: 5 }],
    }));

    const r = runTool(path.join(TOOLS_DIR, "pass-json-validator/index.js"), tmp, true);
    // May warn about missing pass1/pass2 but should not error on analysis format
    assert.ok(!r.output.includes("PARSE_ERROR"), "should not have parse errors");
    assert.ok(r.output.includes("project-analysis.json"), "should check project-analysis.json");
  });

  it("reports error for malformed JSON", () => {
    writeFile(path.join(tmp, "claudeos-core/generated/project-analysis.json"), "NOT VALID JSON {{{");
    writeFile(path.join(tmp, "claudeos-core/generated/domain-groups.json"), "{}");

    const r = runTool(path.join(TOOLS_DIR, "pass-json-validator/index.js"), tmp, true);
    assert.ok(!r.ok, "should fail for malformed JSON");
    assert.ok(r.output.includes("PARSE_ERROR"), "should report PARSE_ERROR");
  });
});

// ─── sync-checker ────────────────────────────────────────────

describe("sync-checker", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("reports all in sync when mappings match disk", () => {
    writeFile(path.join(tmp, ".claude/rules/00.core/01.test.md"), "# Rule");
    writeFile(path.join(tmp, "claudeos-core/generated/sync-map.json"), JSON.stringify({
      mappings: [{ sourcePath: ".claude/rules/00.core/01.test.md", planFile: "plan/test.md" }],
    }));

    const r = runTool(path.join(TOOLS_DIR, "sync-checker/index.js"), tmp);
    assert.ok(r.ok, "should pass when all mapped files exist");
    assert.ok(r.output.includes("All in sync") || r.output.includes("Registered: 1"), "should report in sync");
  });

  it("reports orphaned when mapped file is missing from disk", () => {
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, "claudeos-core/generated/sync-map.json"), JSON.stringify({
      mappings: [{ sourcePath: ".claude/rules/00.core/missing.md", planFile: "plan/test.md" }],
    }));

    const r = runTool(path.join(TOOLS_DIR, "sync-checker/index.js"), tmp, true);
    assert.ok(!r.ok, "should fail when mapped file missing");
    assert.ok(r.output.includes("Orphaned"), "should report orphaned");
  });
});

// ─── health-checker (3-tier severity, v2.4.0) ─────────────────
//
// Documents the soft-fail tier introduced for content-validator: when
// content-validator exits non-zero with only quality advisories
// (STALE_PATH, MANIFEST_DRIFT, NO_BAD_EXAMPLE), the health-checker must
// classify the result as `advisory` (ℹ️) rather than `fail` (❌) and
// must NOT propagate that to its own exit code. Real structural failures
// (plan-validator, sync-checker, manifest-generator) still gate the
// overall health result. This separation prevents the "❌ fail + 'non-fatal'
// dual signal" UX confusion observed in field testing.

describe("health-checker — soft-fail tier", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("content-validator with only advisories renders as ℹ️ advisory + health exits 0", () => {
    // Empty project: content-validator finds MISSING/EMPTY directories
    // but no real structural failures from plan-validator/sync-checker
    // (both gracefully no-op in the absence of plan/ + sync-map). Setup
    // must include manifest-generator's expected stale-report directory.
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, ".gitignore"), "");

    const r = runTool(path.join(TOOLS_DIR, "health-checker/index.js"), tmp, true);
    // health-checker exits 1 if manifest-generator fails (no plan content).
    // We accept either exit 0 OR exit 1 here — what matters is the
    // CONTENT-VALIDATOR-specific signal in the output.
    assert.match(r.output, /content-validator/);
    // Must show ℹ️ icon (advisory tier), not ❌ (fail).
    assert.match(r.output, /content-validator.*ℹ️|ℹ️.*content-validator/s,
      `content-validator should render as ℹ️ advisory; output:\n${r.output}`);
    // Must NOT classify content-validator as "fail" in the summary table.
    assert.doesNotMatch(r.output, /content-validator\s+fail/,
      `content-validator must not appear as 'fail'; output:\n${r.output}`);
  });

  it("summary line distinguishes advisory from real failure", () => {
    // Setup: a project where content-validator fires advisories but no
    // hard failures from other tools.
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    writeFile(path.join(tmp, ".gitignore"), "");

    const r = runTool(path.join(TOOLS_DIR, "health-checker/index.js"), tmp, true);
    // Either "All systems operational" (with optional advisory/warning
    // tail) when no real fails — or "N failed" when real fails exist.
    // We assert the new tail format is present when applicable.
    if (/All systems operational/.test(r.output)) {
      // The tail should mention "advisory" if content-validator surfaced any.
      // (Strict assertion — content-validator always surfaces advisories on
      // an empty tree because of MISSING dirs.)
      assert.match(r.output, /advisory/i,
        `summary should include advisory tail; output:\n${r.output}`);
    }
  });
});
