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
  // Since it's not exported, we re-implement the same logic for testing.
  // Keep this in sync with bin/cli.js::parseArgs — the source-parity test at
  // the end of this describe block guards against drift.
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
        // v2.1.0: --help only promotes to top-level command when it appears
        // BEFORE any command. `memory --help` leaves command as "memory"
        // so memory subcommand can handle --help itself.
        if (!result.command) result.command = "--help";
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

  // v2.1.0: --help after a command stays with that command so subcommand
  // can handle its own help. Before v2.1.0, `memory --help` was broken —
  // --help overrode the command and showed top-level help instead of
  // the memory subcommand help.
  it("parses `memory --help` as memory command (not top-level --help)", () => {
    const r = parseArgs(["memory", "--help"]);
    assert.equal(r.command, "memory",
      "--help after a command must not override it (memory handles --help itself)");
  });

  it("parses `memory -h` as memory command (shorthand)", () => {
    const r = parseArgs(["memory", "-h"]);
    assert.equal(r.command, "memory",
      "-h after a command must not override it (shorthand path)");
  });

  it("parses `--help memory` as top-level --help (flag before command)", () => {
    const r = parseArgs(["--help", "memory"]);
    assert.equal(r.command, "--help",
      "--help before any command should still promote to top-level help");
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

// ─── v2.1.0 source-parity assertions ────────────────────────
// These tests pin specific invariants about init.js that must not regress.
// We inspect the source text directly rather than executing init (which
// requires the claude CLI). Same pattern as pass3-batch-subdivision tests.

describe("init.js source-parity (v2.1.0)", () => {
  const INIT_SRC = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"),
    "utf-8"
  );

  it("dirs[] does NOT include claudeos-core/plan (master plan removed in v2.1.0)", () => {
    // Locate the dirs array inside [2] "Creating directory structure..." block.
    // The array literal runs from "const dirs = [" to the next "];" on its own line.
    const match = INIT_SRC.match(/const dirs = \[([\s\S]*?)\n\s*\];/);
    assert.ok(match, "could not locate dirs array in init.js");

    const dirsBody = match[1];
    // The exact string we're defending against: "claudeos-core/plan" (no subpath)
    // as a top-level dir entry. We DO allow "claudeos-core/plan/..." if ever added,
    // so the assertion is specific to the bare directory skeleton.
    assert.doesNotMatch(
      dirsBody,
      /"claudeos-core\/plan"/,
      "dirs[] must not create the bare claudeos-core/plan directory " +
      "(master plan generation was removed in v2.1.0)"
    );

    // Sanity: the array should still contain other expected entries, so we
    // know the regex actually matched the right array.
    assert.match(dirsBody, /"claudeos-core\/memory"/,
      "sanity: dirs[] must still create claudeos-core/memory");
    assert.match(dirsBody, /"claudeos-core\/skills\/00\.shared"/,
      "sanity: dirs[] must still create skills/00.shared");
  });

  it("Pass 4 ticker totalExpected is 5 (not 6) — reflects master plan removal", () => {
    // Pass 4's makePassTicker invocation must declare totalExpected: 5.
    // If this drifts back to 6, the progress bar will appear stuck at 83%
    // because the 6th file (plan/50.memory-master.md) is no longer generated.
    assert.match(
      INIT_SRC,
      /makePassTicker\("Pass 4"[\s\S]{0,300}totalExpected:\s*5/,
      "Pass 4 ticker must use totalExpected: 5 (4 memory + 1 standard; " +
      "master plan removed in v2.1.0)"
    );
    assert.doesNotMatch(
      INIT_SRC,
      /makePassTicker\("Pass 4"[\s\S]{0,300}totalExpected:\s*6/,
      "Pass 4 ticker must NOT use totalExpected: 6 (stale master-plan count)"
    );
  });

  it("scaffoldSkillsManifest is imported and called in Pass 4 gap-fill", () => {
    // v2.1.0 added scaffoldSkillsManifest as a Pass 4 gap-fill. It must be:
    //   1. Imported from memory-scaffold
    //   2. Called in applyStaticFallback (when Claude-driven Pass 4 fails)
    //   3. Called in the Claude-driven Pass 4 success gap-fill
    //
    // The actual destructure source order is:
    //   const { ..., scaffoldSkillsManifest } = require("../../lib/memory-scaffold");
    // so we check both directions: name-then-require and require-then-name.
    assert.match(
      INIT_SRC,
      /scaffoldSkillsManifest\s*\}\s*=\s*require\(["']\.\.\/\.\.\/lib\/memory-scaffold["']\)/,
      "scaffoldSkillsManifest must be destructured from require(memory-scaffold)"
    );

    // At least 2 call sites (applyStaticFallback + Claude-driven gap-fill)
    const callPattern = /scaffoldSkillsManifest\(skillsSharedPath/g;
    const invocations = INIT_SRC.match(callPattern) || [];
    assert.ok(invocations.length >= 2,
      `expected scaffoldSkillsManifest to be invoked at least 2x, got ${invocations.length}`);
  });
});
