/**
 * ClaudeOS-Core — CLI Selector Tests (lang-selector, resume-selector)
 *
 * Both selectors have 3 code paths:
 *   1. non-TTY (piped stdin) — readline-based number/code input
 *   2. TTY + setRawMode fails — readline fallback
 *   3. TTY + setRawMode ok — arrow key interactive (untestable in CI)
 *
 * Tests here cover path 1 (non-TTY) via child process with piped stdin.
 * Path 2 is structurally identical to path 1 (same readline logic).
 * Path 3 is manual-test only (requires real terminal).
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const TOOLS_DIR = path.resolve(__dirname, "..");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-sel-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Run a JS file with piped stdin input.
 */
function runScriptFile(scriptPath, input) {
  try {
    const output = execSync(`node "${scriptPath}"`, {
      input,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });
    return { ok: true, output, exitCode: 0 };
  } catch (e) {
    return { ok: false, output: e.stdout || "", stderr: e.stderr || "", exitCode: e.status || 1 };
  }
}

// ─── lang-selector (non-TTY path) ───────────────────────────

describe("lang-selector — non-TTY", () => {
  let tmpDir, scriptPath;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => cleanup(tmpDir));

  function writeLangScript() {
    scriptPath = path.join(tmpDir, "test-lang.js");
    fs.writeFileSync(scriptPath, `
const { selectLangInteractive } = require(${JSON.stringify(path.join(TOOLS_DIR, "bin/lib/lang-selector").replace(/\\/g, "/"))});
selectLangInteractive().then(lang => {
  console.log("SELECTED:" + lang);
  process.exit(0);
}).catch(() => {});
`);
    return scriptPath;
  }

  it("accepts number input (1 = en)", () => {
    const r = runScriptFile(writeLangScript(), "1\n");
    assert.ok(r.output.includes("SELECTED:en"), `should select en, got: ${r.output.trim()}`);
  });

  it("accepts number input (2 = ko)", () => {
    const r = runScriptFile(writeLangScript(), "2\n");
    assert.ok(r.output.includes("SELECTED:ko"), `should select ko, got: ${r.output.trim()}`);
  });

  it("accepts number input (3 = zh-CN)", () => {
    const r = runScriptFile(writeLangScript(), "3\n");
    assert.ok(r.output.includes("SELECTED:zh-CN"), `should select zh-CN, got: ${r.output.trim()}`);
  });

  it("accepts language code input directly", () => {
    const r = runScriptFile(writeLangScript(), "ja\n");
    assert.ok(r.output.includes("SELECTED:ja"), `should select ja, got: ${r.output.trim()}`);
  });

  it("accepts zh-CN code with hyphen", () => {
    const r = runScriptFile(writeLangScript(), "zh-CN\n");
    assert.ok(r.output.includes("SELECTED:zh-CN"), `should select zh-CN, got: ${r.output.trim()}`);
  });

  it("rejects invalid input and exits", () => {
    const r = runScriptFile(writeLangScript(), "xyz\n");
    assert.ok(!r.ok || r.output.includes("Invalid"), "should reject invalid input");
  });

  it("rejects out-of-range number", () => {
    const r = runScriptFile(writeLangScript(), "99\n");
    assert.ok(!r.ok || r.output.includes("Invalid"), "should reject out-of-range number");
  });

  it("displays language selection menu", () => {
    const r = runScriptFile(writeLangScript(), "1\n");
    assert.ok(r.output.includes("Select generated document language"), "should show selection header");
    assert.ok(r.output.includes("English"), "should list English");
  });

  it("accepts all 10 language numbers", () => {
    const expectedLangs = ["en", "ko", "zh-CN", "ja", "es", "vi", "hi", "ru", "fr", "de"];
    for (let i = 0; i < expectedLangs.length; i++) {
      const r = runScriptFile(writeLangScript(), `${i + 1}\n`);
      assert.ok(r.output.includes(`SELECTED:${expectedLangs[i]}`),
        `number ${i + 1} should select ${expectedLangs[i]}, got: ${r.output.trim().split("\n").pop()}`);
    }
  });
});

// ─── resume-selector (non-TTY path) ─────────────────────────

describe("resume-selector — non-TTY", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  function writeResumeScript(lang, pass1Done, pass2Done) {
    const scriptPath = path.join(tmpDir, "test-resume.js");
    fs.writeFileSync(scriptPath, `
const { selectResumeMode } = require(${JSON.stringify(path.join(TOOLS_DIR, "bin/lib/resume-selector").replace(/\\/g, "/"))});
selectResumeMode(${JSON.stringify(lang)}, { pass1Done: ${pass1Done}, pass2Done: ${pass2Done} }).then(mode => {
  console.log("MODE:" + mode);
  process.exit(0);
}).catch(() => {});
`);
    return scriptPath;
  }

  it("returns 'continue' for input 1", () => {
    const r = runScriptFile(writeResumeScript("en", 2, false), "1\n");
    assert.ok(r.output.includes("MODE:continue"), `should return continue, got: ${r.output.trim()}`);
  });

  it("returns 'fresh' for input 2", () => {
    const r = runScriptFile(writeResumeScript("en", 3, true), "2\n");
    assert.ok(r.output.includes("MODE:fresh"), `should return fresh, got: ${r.output.trim()}`);
  });

  it("displays status line with pass1/pass2 counts", () => {
    const r = runScriptFile(writeResumeScript("en", 5, true), "1\n");
    assert.ok(r.output.includes("pass1: 5"), "should show pass1 count");
    assert.ok(r.output.includes("pass2:"), "should show pass2 status");
  });

  it("uses Korean text for lang=ko", () => {
    const r = runScriptFile(writeResumeScript("ko", 1, false), "1\n");
    assert.ok(r.output.includes("\uC774\uC804 \uBD84\uC11D \uACB0\uACFC"), "should show Korean warning text");
  });

  it("uses Japanese text for lang=ja", () => {
    const r = runScriptFile(writeResumeScript("ja", 1, false), "1\n");
    assert.ok(r.output.includes("\u4EE5\u524D\u306E\u5206\u6790\u7D50\u679C"), "should show Japanese warning text");
  });

  it("falls back to English for unsupported lang", () => {
    const r = runScriptFile(writeResumeScript("xx", 1, false), "1\n");
    assert.ok(r.output.includes("Previous analysis found"), "should fall back to English");
  });

  it("exits on invalid input", () => {
    const r = runScriptFile(writeResumeScript("en", 1, false), "3\n");
    assert.ok(!r.ok || r.output.includes("Cancelled"), "should exit on invalid input");
  });

  it("shows all 10 language variants without error", () => {
    const langs = ["en", "ko", "zh-CN", "ja", "es", "vi", "hi", "ru", "fr", "de"];
    for (const lang of langs) {
      const r = runScriptFile(writeResumeScript(lang, 1, false), "1\n");
      assert.ok(r.output.includes("MODE:continue"),
        `lang=${lang} should work, got: ${r.output.trim().split("\n").pop()}`);
    }
  });
});
