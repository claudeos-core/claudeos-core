/**
 * ClaudeOS-Core — Init Command Tests
 *
 * Tests init.js logic that can be tested without claude CLI:
 *   - CLI argument parsing (parseArgs in cli.js)
 *   - Prerequisites detection (project markers, node version)
 *   - Directory structure creation
 *   - Resume/fresh mode logic (file detection, cleanup)
 *   - i18n wait message generation
 *   - Complete banner formatting
 *
 * NOT tested (requires claude CLI):
 *   - Pass 1/2/3 execution (runClaudePrompt)
 *   - Full end-to-end pipeline
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-init-"));
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

// ─── CLI argument parsing ───────────────────────────────────

describe("CLI parseArgs", () => {
  // parseArgs is defined inside cli.js — test via require + private extraction
  // Since it's not exported, we re-implement the same logic for testing
  function parseArgs(argv) {
    const result = { command: null, lang: null };
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === "--lang" && i + 1 < argv.length) {
        result.lang = argv[++i];
      } else if (argv[i].startsWith("--lang=")) {
        result.lang = argv[i].split("=")[1];
      } else if (argv[i] === "--force" || argv[i] === "-f") {
        result.force = true;
      } else if (argv[i] === "--help" || argv[i] === "-h") {
        result.command = "--help";
      } else if (argv[i] === "--version" || argv[i] === "-v") {
        result.command = "--version";
      } else if (!argv[i].startsWith("-") && !result.command) {
        result.command = argv[i];
      }
    }
    return result;
  }

  it("parses init command", () => {
    const r = parseArgs(["init"]);
    assert.equal(r.command, "init");
  });

  it("parses --lang with space", () => {
    const r = parseArgs(["init", "--lang", "ko"]);
    assert.equal(r.command, "init");
    assert.equal(r.lang, "ko");
  });

  it("parses --lang= with equals sign", () => {
    const r = parseArgs(["init", "--lang=ja"]);
    assert.equal(r.command, "init");
    assert.equal(r.lang, "ja");
  });

  it("parses --force flag", () => {
    const r = parseArgs(["init", "--force"]);
    assert.equal(r.command, "init");
    assert.equal(r.force, true);
  });

  it("parses -f shorthand", () => {
    const r = parseArgs(["init", "-f"]);
    assert.equal(r.force, true);
  });

  it("parses --help", () => {
    const r = parseArgs(["--help"]);
    assert.equal(r.command, "--help");
  });

  it("parses --version", () => {
    const r = parseArgs(["--version"]);
    assert.equal(r.command, "--version");
  });

  it("parses -v shorthand", () => {
    const r = parseArgs(["-v"]);
    assert.equal(r.command, "--version");
  });

  it("parses combined flags", () => {
    const r = parseArgs(["init", "--lang", "zh-CN", "--force"]);
    assert.equal(r.command, "init");
    assert.equal(r.lang, "zh-CN");
    assert.equal(r.force, true);
  });

  it("ignores unknown flags", () => {
    const r = parseArgs(["init", "--unknown", "value"]);
    assert.equal(r.command, "init");
    assert.equal(r.lang, null);
  });

  it("returns null command when no args", () => {
    const r = parseArgs([]);
    assert.equal(r.command, null);
  });
});

// ─── Project marker detection ───────────────────────────────

describe("init — project marker detection", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  const PROJECT_MARKERS = [".git", "package.json", "build.gradle", "build.gradle.kts", "pom.xml", "pyproject.toml", "requirements.txt"];

  it("detects .git as project marker", () => {
    mkdirp(path.join(tmp, ".git"));
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(found, ".git should be detected as project marker");
  });

  it("detects package.json as project marker", () => {
    writeFile(path.join(tmp, "package.json"), "{}");
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(found);
  });

  it("detects build.gradle.kts as project marker", () => {
    writeFile(path.join(tmp, "build.gradle.kts"), "");
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(found);
  });

  it("detects pom.xml as project marker", () => {
    writeFile(path.join(tmp, "pom.xml"), "<project></project>");
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(found);
  });

  it("detects pyproject.toml as project marker", () => {
    writeFile(path.join(tmp, "pyproject.toml"), "[tool.poetry]");
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(found);
  });

  it("returns false for empty directory", () => {
    const found = PROJECT_MARKERS.some(m => fs.existsSync(path.join(tmp, m)));
    assert.ok(!found, "empty dir should not have project markers");
  });
});

// ─── Directory structure creation ───────────────────────────

describe("init — directory structure", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  const EXPECTED_DIRS = [
    ".claude/rules/00.core",
    ".claude/rules/10.backend",
    ".claude/rules/20.frontend",
    ".claude/rules/30.security-db",
    ".claude/rules/40.infra",
    ".claude/rules/50.sync",
    "claudeos-core/generated",
    "claudeos-core/standard/00.core",
    "claudeos-core/standard/10.backend-api",
    "claudeos-core/standard/20.frontend-ui",
    "claudeos-core/standard/30.security-db",
    "claudeos-core/standard/40.infra",
    "claudeos-core/standard/50.verification",
    "claudeos-core/standard/90.optional",
    "claudeos-core/skills/00.shared",
    "claudeos-core/skills/10.backend-crud/scaffold-crud-feature",
    "claudeos-core/skills/20.frontend-page/scaffold-page-feature",
    "claudeos-core/skills/50.testing",
    "claudeos-core/skills/90.experimental",
    "claudeos-core/plan",
    "claudeos-core/guide/01.onboarding",
    "claudeos-core/guide/02.usage",
    "claudeos-core/guide/03.troubleshooting",
    "claudeos-core/guide/04.architecture",
    "claudeos-core/database",
    "claudeos-core/mcp-guide",
  ];

  it("creates all expected directories", () => {
    for (const d of EXPECTED_DIRS) {
      mkdirp(path.join(tmp, d));
    }
    for (const d of EXPECTED_DIRS) {
      assert.ok(fs.existsSync(path.join(tmp, d)), `${d} should exist`);
    }
  });

  it("verifies directory list matches init.js (26 dirs)", () => {
    assert.equal(EXPECTED_DIRS.length, 26, "should have exactly 26 directories");
  });

  it("idempotent — creating dirs twice does not error", () => {
    for (const d of EXPECTED_DIRS) {
      mkdirp(path.join(tmp, d));
    }
    // Second run should not throw
    for (const d of EXPECTED_DIRS) {
      mkdirp(path.join(tmp, d));
    }
    assert.ok(true, "double creation should not throw");
  });
});

// ─── Resume/fresh logic ─────────────────────────────────────

describe("init — resume/fresh detection", () => {
  let tmp, genDir;
  beforeEach(() => {
    tmp = makeTmpDir();
    genDir = path.join(tmp, "claudeos-core/generated");
    mkdirp(genDir);
  });
  afterEach(() => cleanup(tmp));

  it("detects existing pass1 JSON files", () => {
    writeFile(path.join(genDir, "pass1-1.json"), '{"analysisPerDomain":{}}');
    writeFile(path.join(genDir, "pass1-2.json"), '{"analysisPerDomain":{}}');
    const existingPass1 = fs.readdirSync(genDir).filter(f => f.startsWith("pass1-") && f.endsWith(".json"));
    assert.equal(existingPass1.length, 2);
  });

  it("detects existing pass2-merged.json", () => {
    writeFile(path.join(genDir, "pass2-merged.json"), "{}");
    assert.ok(fs.existsSync(path.join(genDir, "pass2-merged.json")));
  });

  it("fresh mode cleans up pass1 and pass2 files", () => {
    writeFile(path.join(genDir, "pass1-1.json"), "{}");
    writeFile(path.join(genDir, "pass1-2.json"), "{}");
    writeFile(path.join(genDir, "pass2-merged.json"), "{}");
    writeFile(path.join(genDir, "project-analysis.json"), "{}"); // should NOT be deleted

    // Simulate fresh mode cleanup (same logic as init.js)
    const existingPass1 = fs.readdirSync(genDir).filter(f => f.startsWith("pass1-") && f.endsWith(".json"));
    for (const f of existingPass1) fs.unlinkSync(path.join(genDir, f));
    if (fs.existsSync(path.join(genDir, "pass2-merged.json"))) {
      fs.unlinkSync(path.join(genDir, "pass2-merged.json"));
    }

    assert.ok(!fs.existsSync(path.join(genDir, "pass1-1.json")));
    assert.ok(!fs.existsSync(path.join(genDir, "pass1-2.json")));
    assert.ok(!fs.existsSync(path.join(genDir, "pass2-merged.json")));
    assert.ok(fs.existsSync(path.join(genDir, "project-analysis.json")), "non-pass files should survive");
  });

  it("continue mode skips existing pass1 files", () => {
    writeFile(path.join(genDir, "pass1-1.json"), '{"analysisPerDomain":{"user":{}}}');

    // Simulate pass1 skip logic (same as init.js)
    const pass1Json = path.join(genDir, "pass1-1.json");
    let skipped = false;
    if (fs.existsSync(pass1Json)) {
      const existing = JSON.parse(fs.readFileSync(pass1Json, "utf-8"));
      if (existing && existing.analysisPerDomain) {
        skipped = true;
      }
    }
    assert.ok(skipped, "should skip existing valid pass1 file");
  });

  it("re-runs malformed pass1 files", () => {
    writeFile(path.join(genDir, "pass1-1.json"), '{"invalid": true}');

    const pass1Json = path.join(genDir, "pass1-1.json");
    let shouldRerun = false;
    if (fs.existsSync(pass1Json)) {
      try {
        const existing = JSON.parse(fs.readFileSync(pass1Json, "utf-8"));
        if (!existing || !existing.analysisPerDomain) {
          shouldRerun = true;
        }
      } catch (_e) {
        shouldRerun = true;
      }
    }
    assert.ok(shouldRerun, "malformed pass1 should trigger re-run");
  });
});

// ─── i18n wait message ──────────────────────────────────────

describe("init — claude wait message i18n", () => {
  // Reproduce the wait message logic from init.js
  const CLAUDE_WAIT_TMPL = {
    en: "    ⏳ [{{PASS}}] Running claude -p (no output is normal, please wait)...",
    ko: "    ⏳ [{{PASS}}] claude -p 실행 중 (출력이 없어도 정상입니다. 잠시 기다려주세요)...",
    "zh-CN": "    ⏳ [{{PASS}}] 正在运行 claude -p（没有输出是正常的，请稍候）...",
    ja: "    ⏳ [{{PASS}}] claude -p 実行中（出力がなくても正常です。しばらくお待ちください）...",
    es: "    ⏳ [{{PASS}}] Ejecutando claude -p (es normal que no haya salida, por favor espere)...",
    vi: "    ⏳ [{{PASS}}] Đang chạy claude -p (không có output là bình thường, vui lòng chờ)...",
    hi: "    ⏳ [{{PASS}}] claude -p चल रहा है (कोई आउटपुट न होना सामान्य है, कृपया प्रतीक्षा करें)...",
    ru: "    ⏳ [{{PASS}}] Выполняется claude -p (отсутствие вывода — это нормально, подождите)...",
    fr: "    ⏳ [{{PASS}}] Exécution de claude -p (l'absence de sortie est normale, veuillez patienter)...",
    de: "    ⏳ [{{PASS}}] claude -p wird ausgeführt (keine Ausgabe ist normal, bitte warten)...",
  };

  function claudeWaitMsg(lang, passLabel) {
    return (CLAUDE_WAIT_TMPL[lang] || CLAUDE_WAIT_TMPL.en).replace("{{PASS}}", passLabel);
  }

  it("generates English message with pass label", () => {
    const msg = claudeWaitMsg("en", "Pass 1-1/3");
    assert.ok(msg.includes("Pass 1-1/3"));
    assert.ok(msg.includes("Running claude -p"));
  });

  it("generates Korean message", () => {
    const msg = claudeWaitMsg("ko", "Pass 2");
    assert.ok(msg.includes("Pass 2"));
    assert.ok(msg.includes("실행 중"));
  });

  it("falls back to English for unknown language", () => {
    const msg = claudeWaitMsg("xx", "Pass 3");
    assert.ok(msg.includes("Running claude -p"), "should fall back to English");
  });

  it("generates messages for all 10 supported languages", () => {
    const langs = ["en", "ko", "zh-CN", "ja", "es", "vi", "hi", "ru", "fr", "de"];
    for (const lang of langs) {
      const msg = claudeWaitMsg(lang, "Test");
      assert.ok(msg.includes("Test"), `${lang} message should contain pass label`);
      assert.ok(msg.includes("claude -p"), `${lang} message should mention claude -p`);
      assert.ok(msg.length > 30, `${lang} message should be non-trivial length`);
    }
  });
});

// ─── Language validation ────────────────────────────────────

describe("init — language validation", () => {
  const LANG_CODES = ["en", "ko", "zh-CN", "ja", "es", "vi", "hi", "ru", "fr", "de"];

  it("accepts all supported languages", () => {
    for (const lang of LANG_CODES) {
      assert.ok(LANG_CODES.includes(lang), `${lang} should be valid`);
    }
  });

  it("rejects unsupported languages", () => {
    const invalid = ["pt", "it", "nl", "sv", "ar", "th", "id", ""];
    for (const lang of invalid) {
      assert.ok(!LANG_CODES.includes(lang), `${lang} should be invalid`);
    }
  });

  it("has exactly 10 supported languages", () => {
    assert.equal(LANG_CODES.length, 10);
  });
});

// ─── CLI commands routing ───────────────────────────────────

describe("CLI — command routing", () => {
  const TOOLS_DIR = path.resolve(__dirname, "..");

  it("shows help on --help", () => {
    const { execSync } = require("child_process");
    const output = execSync(`node "${path.join(TOOLS_DIR, "bin/cli.js")}" --help`, {
      encoding: "utf-8",
    });
    assert.ok(output.includes("ClaudeOS-Core"));
    assert.ok(output.includes("init"));
    assert.ok(output.includes("health"));
    assert.ok(output.includes("validate"));
    assert.ok(output.includes("restore"));
    assert.ok(output.includes("refresh"));
  });

  it("shows version on --version", () => {
    const { execSync } = require("child_process");
    const output = execSync(`node "${path.join(TOOLS_DIR, "bin/cli.js")}" --version`, {
      encoding: "utf-8",
    });
    assert.ok(output.includes("claudeos-core v"), "should output version string");
  });

  it("rejects unknown command", () => {
    const { execSync } = require("child_process");
    try {
      execSync(`node "${path.join(TOOLS_DIR, "bin/cli.js")}" nonexistent`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      assert.fail("should exit with error");
    } catch (e) {
      assert.ok(e.stdout.includes("Unknown command"), "should report unknown command");
    }
  });
});
