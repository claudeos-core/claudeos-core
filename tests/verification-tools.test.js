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
