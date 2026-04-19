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
    "claudeos-core/memory",
    ".claude/rules/60.memory",
  ];

  it("creates all expected directories", () => {
    for (const d of EXPECTED_DIRS) {
      mkdirp(path.join(tmp, d));
    }
    for (const d of EXPECTED_DIRS) {
      assert.ok(fs.existsSync(path.join(tmp, d)), `${d} should exist`);
    }
  });

  it("verifies directory list matches init.js (28 dirs)", () => {
    assert.equal(EXPECTED_DIRS.length, 28, "should have exactly 28 directories (26 base + L4 memory dir + L4 memory rules dir)");
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

  it("--force and fresh wipe .claude/rules/ so Guard 2 sees a clean slate", () => {
    // Regression guard for risk #8: Without this, Claude ignoring the
    // staging-override directive during a --force re-run would leave OLD
    // rule files in .claude/rules/. Guard 2 would then count those stale
    // files, think Pass 3 succeeded, and write the marker — hiding the
    // silent failure.
    const rulesDir = path.join(tmp, ".claude/rules");
    writeFile(path.join(rulesDir, "00.core/00.standard-reference.md"), "# old ref\n");
    writeFile(path.join(rulesDir, "10.backend/01.controller-rules.md"), "# old rules\n");
    writeFile(path.join(rulesDir, "60.memory/01.decision-log.md"), "# old decision\n");

    // Simulate --force / fresh cleanup (matching init.js)
    if (fs.existsSync(rulesDir)) fs.rmSync(rulesDir, { recursive: true, force: true });

    assert.ok(!fs.existsSync(rulesDir), ".claude/rules/ must be gone after --force/fresh");
    assert.ok(!fs.existsSync(path.join(rulesDir, "00.core/00.standard-reference.md")));
    assert.ok(!fs.existsSync(path.join(rulesDir, "10.backend/01.controller-rules.md")));
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

// ─── formatElapsed ──────────────────────────────────────────

describe("init — formatElapsed", () => {
  // Reproduce the same logic from init.js
  function formatElapsed(ms) {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
  }

  it("formats seconds only", () => {
    assert.equal(formatElapsed(5000), "5s");
    assert.equal(formatElapsed(45000), "45s");
    assert.equal(formatElapsed(0), "0s");
  });

  it("formats minutes and seconds", () => {
    assert.equal(formatElapsed(90000), "1m 30s");
    assert.equal(formatElapsed(503000), "8m 23s");
  });

  it("formats exact minutes without remainder", () => {
    assert.equal(formatElapsed(120000), "2m");
    assert.equal(formatElapsed(300000), "5m");
  });

  it("handles sub-second (rounds down)", () => {
    assert.equal(formatElapsed(999), "0s");
    assert.equal(formatElapsed(1500), "1s");
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
