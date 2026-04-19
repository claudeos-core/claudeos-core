/**
 * ClaudeOS-Core — Init Command
 *
 * Runs the full 4-Pass pipeline: analyze → merge → generate → memory scaffold.
 * This is the main entry point for project bootstrapping.
 */

const fs = require("fs");
const path = require("path");
const {
  TOOLS_DIR, PROJECT_ROOT, GENERATED_DIR,
  SUPPORTED_LANGS, LANG_CODES, isValidLang,
  log, header, run, runClaudePrompt, runClaudePromptAsync,
  ensureDir, fileExists, readFile, injectProjectRoot,
  pad, countFiles, countPass1Files,
} = require("../lib/cli-utils");
const { selectLangInteractive } = require("../lib/lang-selector");
const { selectResumeMode } = require("../lib/resume-selector");

const { EXPECTED_GUIDE_FILES } = require("../../lib/expected-guides");
const { findMissingOutputs } = require("../../lib/expected-outputs");

class InitError extends Error {
  constructor(msg) { super(msg); this.name = "InitError"; }
}

function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

// Creates an onTick/clearLine pair for long-running claude -p passes. We can
// only observe progress externally (elapsed time, sometimes filesystem delta).
// TTYs get a single \r-rewritten line; CI/piped stdout gets periodic new lines.
// Modes via opts:
//   - elapsed-only (no baselineCount): ⏳ label running... 45s
//   - file delta (baselineCount set):  📝 label generating... 24 new files | 45s
//   - fixed target (+ totalExpected):  📝 label generating... 8/12 files (67%) | 45s
function makePassTicker(label, startTime, opts = {}) {
  const isTTY = Boolean(process.stdout.isTTY);
  const { baselineCount, totalExpected } = opts;
  const trackFiles = typeof baselineCount === "number";
  let lastLineLen = 0;
  function onTick() {
    const elapsed = formatElapsed(Date.now() - startTime);
    let line;
    if (!trackFiles) {
      line = `    ⏳ ${label} running... ${elapsed} elapsed`;
    } else {
      const current = countFiles();
      const delta = typeof current === "number" ? Math.max(0, current - baselineCount) : null;
      let progress;
      if (delta === null) progress = "? new files";
      else if (typeof totalExpected === "number" && totalExpected > 0) {
        const capped = Math.min(delta, totalExpected);
        const pct = Math.round((capped / totalExpected) * 100);
        progress = `${capped}/${totalExpected} files (${pct}%)`;
      } else {
        progress = `${delta} new files`;
      }
      line = `    📝 ${label} generating... ${progress} | ${elapsed} elapsed`;
    }
    if (isTTY) {
      const pad = " ".repeat(Math.max(0, lastLineLen - line.length));
      process.stdout.write("\r" + line + pad);
      lastLineLen = line.length;
    } else {
      log(line);
    }
  }
  function clearLine() {
    if (isTTY && lastLineLen > 0) {
      process.stdout.write("\r" + " ".repeat(lastLineLen) + "\r");
      lastLineLen = 0;
    }
  }
  return { onTick, clearLine, tickMs: isTTY ? 1000 : 15000 };
}

async function cmdInit(parsedArgs) {
  const totalStart = Date.now();
  // Tracks whether we just wiped generated state via --force or "fresh" resume
  // mode. Used by the Pass 3 backfill guard below: fresh/force explicitly
  // means "regenerate from scratch", so a leftover CLAUDE.md from a prior run
  // must NOT cause Pass 3 to be skipped via the v1.7.x migration backfill.
  let wasFreshClean = false;

  // ─── Prerequisites check ───────────────────────────────────
  const hasProjectMarker = [".git", "package.json", "build.gradle", "build.gradle.kts", "pom.xml", "pyproject.toml", "requirements.txt"].some(
    m => fs.existsSync(path.join(PROJECT_ROOT, m))
  );
  if (!hasProjectMarker) {
    log(`\n  ⚠️  Warning: ${PROJECT_ROOT} does not look like a project root.`);
    log("  No .git, package.json, build.gradle, or pom.xml found.");
    log("  Run this command from your project directory.\n");
  }

  const nodeVersion = parseInt(process.versions.node.split(".")[0]);
  if (nodeVersion < 18) {
    throw new InitError(`Node.js v18+ required (current: v${process.versions.node})\n  Install: https://nodejs.org/`);
  }

  const claudeExists = run("claude --version", { silent: true, ignoreError: true });
  if (!claudeExists) {
    throw new InitError("Claude Code CLI not found.\n  Install: https://code.claude.com/docs/en/overview\n  Then run: claude (and complete authentication)");
  }

  // Verify Claude is authenticated (quick prompt test)
  const claudeAuth = run('claude -p "echo ok"', { silent: true, ignoreError: true });
  if (!claudeAuth) {
    throw new InitError("Claude Code may not be authenticated.\n  Run: claude (and complete authentication)\n  Then retry: npx claudeos-core init");
  }

  // ─── Language selection (required) ────────────────────────────
  let lang = parsedArgs.lang;
  if (!lang) {
    lang = await selectLangInteractive();
  }
  if (!lang) {
    throw new InitError("Cancelled.");
  }
  if (!isValidLang(lang)) {
    throw new InitError(`Unsupported language: "${lang}"\n  Supported: ${LANG_CODES.join(", ")}`);
  }

  // Early incompatibility check: CLAUDEOS_SKIP_TRANSLATION is a test-only
  // env var that short-circuits lib/memory-scaffold.js translation path.
  // If set AND the user chose a non-English language, Pass 4's static fallback
  // and gap-fill would throw mid-run with a confusing "translation skipped"
  // error. Fail fast here with a clear message so the user can unset the var
  // or pick --lang en before the pipeline starts.
  if (process.env.CLAUDEOS_SKIP_TRANSLATION === "1" && lang !== "en") {
    throw new InitError(
      `CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='${lang}' requires translation.\n` +
      `  This env var is a test-only escape hatch that blocks calls to \`claude -p\`\n` +
      `  from lib/memory-scaffold.js. Pass 4 would crash later with a hard-to-\n` +
      `  diagnose error.\n\n` +
      `  Either unset the env var:    unset CLAUDEOS_SKIP_TRANSLATION\n` +
      `  Or run with English output:  npx claudeos-core init --lang en`
    );
  }

  process.env.CLAUDEOS_LANG = lang;

  // ─── Resume / Fresh selection ────────────────────────────
  if (fs.existsSync(GENERATED_DIR)) {
    const existingPass1 = fs.readdirSync(GENERATED_DIR).filter(f => f.startsWith("pass1-") && f.endsWith(".json"));
    const pass2Exists = fileExists(path.join(GENERATED_DIR, "pass2-merged.json"));

    if (existingPass1.length > 0 || pass2Exists) {
      if (parsedArgs.force) {
        // --force: clean all generated files for truly fresh start
        const genFiles = fs.readdirSync(GENERATED_DIR).filter(f => f.endsWith(".json") || f.endsWith(".md"));
        for (const f of genFiles) fs.unlinkSync(path.join(GENERATED_DIR, f));
        // Also clean any leftover .staged-rules/ from a prior crashed run
        // (only .json/.md are unlinked above; directories aren't touched).
        const stagedDir = path.join(GENERATED_DIR, ".staged-rules");
        if (fileExists(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
        // Also wipe .claude/rules/ so Guard 2 (zero-rules detection) can't
        // false-negative on stale rules from a previous run when the fresh
        // Pass 3 run fails silently (e.g. Claude ignores staging-override).
        // Step [2] recreates the subdirs from scratch. Any manual edits the
        // user made to rule files are lost — acceptable under --force
        // ("truly fresh start").
        const rulesDir = path.join(PROJECT_ROOT, ".claude/rules");
        if (fileExists(rulesDir)) fs.rmSync(rulesDir, { recursive: true, force: true });
        wasFreshClean = true;
        log("  🔄 Previous results deleted (--force)\n");
      } else {
        const status = { pass1Done: existingPass1.length, pass2Done: pass2Exists };
        const mode = await selectResumeMode(lang, status);
        if (!mode) throw new InitError("Cancelled.");
        if (mode === "fresh") {
          for (const f of existingPass1) fs.unlinkSync(path.join(GENERATED_DIR, f));
          if (pass2Exists) fs.unlinkSync(path.join(GENERATED_DIR, "pass2-merged.json"));
          // Also reset pass 3 & pass 4 markers so they re-run
          const pass3M = path.join(GENERATED_DIR, "pass3-complete.json");
          const pass4M = path.join(GENERATED_DIR, "pass4-memory.json");
          if (fileExists(pass3M)) fs.unlinkSync(pass3M);
          if (fileExists(pass4M)) fs.unlinkSync(pass4M);
          // Clean .staged-rules/ leftover from a prior crashed run (same reason as --force branch).
          const stagedDir = path.join(GENERATED_DIR, ".staged-rules");
          if (fileExists(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
          // Wipe .claude/rules/ for the same Guard 2 false-negative reason as
          // the --force branch. Step [2] recreates the subdirs; any manual
          // edits are lost — acceptable under an explicit "fresh" choice.
          const rulesDir = path.join(PROJECT_ROOT, ".claude/rules");
          if (fileExists(rulesDir)) fs.rmSync(rulesDir, { recursive: true, force: true });
          wasFreshClean = true;
        } else if (mode === "continue" && existingPass1.length === 0 && pass2Exists) {
          // pass2 exists but no pass1 → pass2 is stale, force re-run
          fs.unlinkSync(path.join(GENERATED_DIR, "pass2-merged.json"));
          log("    ⚠️  pass2-merged.json deleted (no pass1 files to continue from)");
        }
      }
    }
  }

  log("");
  log("╔════════════════════════════════════════════════════╗");
  log("║       ClaudeOS-Core — Bootstrap (4-Pass)          ║");
  log("╚════════════════════════════════════════════════════╝");
  log(`    Project root: ${PROJECT_ROOT}`);
  log(`    Language:     ${SUPPORTED_LANGS[lang]} (${lang})`);
  log("");

  // ─── [1] Install dependencies ────────────────────────────────
  header("[1] Installing dependencies...");
  if (!fileExists(path.join(TOOLS_DIR, "node_modules"))) {
    run("npm install --silent", { cwd: TOOLS_DIR });
  }
  log("    ✅ Done\n");

  // ─── [2] Create directory structure ─────────────────────────
  header("[2] Creating directory structure...");
  const dirs = [
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
  for (const d of dirs) {
    ensureDir(path.join(PROJECT_ROOT, d));
  }
  log("    ✅ Done\n");

  // ─── [3] Run plan-installer ─────────────────────────
  header("[3] Analyzing project (plan-installer)...");
  run(`node "${path.join(TOOLS_DIR, "plan-installer/index.js")}"`);
  log("");

  // ─── [4] Pass 1: Deep analysis per domain group ──────────────────
  header("[4] Pass 1 — Deep analysis per domain group...");

  let domainGroups;
  try {
    domainGroups = JSON.parse(
      readFile(path.join(GENERATED_DIR, "domain-groups.json"))
    );
  } catch (e) {
    throw new InitError(`domain-groups.json is missing or malformed: ${e.message}\n    Re-run plan-installer or check claudeos-core/generated/`);
  }
  const totalGroups = domainGroups.totalGroups;
  if (!totalGroups || typeof totalGroups !== "number" || totalGroups < 1) {
    throw new InitError(`domain-groups.json has invalid totalGroups: ${totalGroups}\n    Re-run plan-installer or check claudeos-core/generated/`);
  }

  // Load pass1 prompts by type
  const pass1Prompts = {};
  for (const type of ["backend", "frontend"]) {
    const promptFile = path.join(GENERATED_DIR, `pass1-${type}-prompt.md`);
    if (fileExists(promptFile)) {
      pass1Prompts[type] = readFile(promptFile);
    }
  }
  // Single-stack backward compatibility
  if (Object.keys(pass1Prompts).length === 0) {
    const fallback = path.join(GENERATED_DIR, "pass1-prompt.md");
    if (fileExists(fallback)) pass1Prompts["backend"] = readFile(fallback);
  }

  if (!domainGroups.groups || totalGroups !== domainGroups.groups.length) {
    throw new InitError(`domain-groups.json is malformed: expected ${totalGroups} groups, found ${domainGroups.groups ? domainGroups.groups.length : 0}`);
  }

  // Progress tracking: Pass 1 (N groups) + Pass 2 + Pass 3 + Pass 4 = totalSteps
  const totalSteps = totalGroups + 3;
  let completedSteps = 0;
  const stepTimes = [];
  const passStart = Date.now();

  function progressBar(step, label) {
    const pct = Math.round((step / totalSteps) * 100);
    const elapsed = Date.now() - passStart;
    let eta = "";
    if (stepTimes.length > 0) {
      const avgMs = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
      const remaining = (totalSteps - step) * avgMs;
      eta = ` | ETA ${formatElapsed(remaining)}`;
    }
    const filled = Math.round(pct / 5);
    const bar = "█".repeat(filled) + "░".repeat(20 - filled);
    log(`    [${bar}] ${pct}% (${step}/${totalSteps}) ${formatElapsed(elapsed)}${eta} — ${label}`);
  }

  for (let i = 1; i <= totalGroups; i++) {
    const group = domainGroups.groups[i - 1];
    const domainList = (group.domains || []).join(", ") || "(unknown)";
    const estFiles = group.estimatedFiles || 0;
    const groupType = group.type || "backend";
    const icon = groupType === "frontend" ? "🎨" : "⚙️";

    log("");
    log(
      `    ${icon} [Pass 1-${i}/${totalGroups}] ${groupType}: ${domainList} (~${estFiles} files)`
    );

    const pass1Json = path.join(GENERATED_DIR, `pass1-${i}.json`);
    if (fileExists(pass1Json)) {
      try {
        const existing = JSON.parse(readFile(pass1Json));
        if (existing && existing.analysisPerDomain) {
          log(`    ⏭️  pass1-${i}.json already exists, skipping`);
          completedSteps++;
          continue;
        }
      } catch (_e) { /* malformed — re-run */ }
      log(`    ⚠️  pass1-${i}.json exists but is malformed, re-running`);
    }

    // Select prompt for this type
    const template = pass1Prompts[groupType] || pass1Prompts["backend"];
    if (!template) {
      throw new InitError(`No pass1 prompt found for type: ${groupType}`);
    }

    // Placeholder substitution — use replacement functions (not string form)
    // so that `$`, `$1`, `$&`, `$$` etc. in domainList are preserved as
    // literal characters rather than interpreted as regex back-references.
    // (Same bug class as bug #18 in lib/plan-parser.js replaceFileBlock.)
    let prompt = template
      .replace(/\{\{DOMAIN_GROUP\}\}/g, () => domainList)
      .replace(/\{\{PASS_NUM\}\}/g, () => String(i));
    prompt = injectProjectRoot(prompt);

    const t1 = Date.now();
    const ticker1 = makePassTicker(`Pass 1-${i}/${totalGroups}`, t1);
    const ok = await runClaudePromptAsync(prompt, {
      onTick: ticker1.onTick,
      tickMs: ticker1.tickMs,
    });
    ticker1.clearLine();
    const elapsed1 = Date.now() - t1;
    stepTimes.push(elapsed1);

    if (!ok) {
      throw new InitError(`Pass 1-${i} failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force`);
    }

    if (!fileExists(pass1Json)) {
      throw new InitError(`pass1-${i}.json was not created. Claude may have run but not produced expected output.\n    Ensure the prompt instructs Claude to write to claudeos-core/generated/pass1-${i}.json`);
    }

    completedSteps++;
    progressBar(completedSteps, `pass1-${i}.json created (${formatElapsed(elapsed1)})`);
  }
  log("");

  // ─── [5] Pass 2: Merge analysis results ──────────────────────
  header("[5] Pass 2 — Merging analysis results...");

  const pass2Json = path.join(GENERATED_DIR, "pass2-merged.json");

  // H3: resume-path structural validation. existsSync alone isn't enough —
  // a prior crashed run may have left a skeleton (`{}`) or malformed JSON
  // that passes existsSync but silently poisons Pass 3 (which parses this
  // file as its analysis input). Mirrors pass1's malformed-detection at
  // the pass1 loop above, and the "<5 top-level keys = INSUFFICIENT_KEYS"
  // threshold from pass-json-validator/index.js (ERROR level).
  let pass2IsValid = false;
  if (fileExists(pass2Json)) {
    try {
      const existing = JSON.parse(readFile(pass2Json));
      if (existing && typeof existing === "object" && !Array.isArray(existing)
          && Object.keys(existing).length >= 5) {
        pass2IsValid = true;
      }
    } catch (_e) { /* malformed — fall through to re-run */ }
    if (!pass2IsValid) {
      log("    ⚠️  pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running");
      try { fs.unlinkSync(pass2Json); } catch (_e) { /* best-effort cleanup */ }
    }
  }

  if (pass2IsValid) {
    log("    ⏭️  pass2-merged.json already exists, skipping");
    completedSteps++;
  } else {
    const pass2PromptFile = path.join(GENERATED_DIR, "pass2-prompt.md");
    if (!fileExists(pass2PromptFile)) {
      throw new InitError("pass2-prompt.md not found. Re-run plan-installer.");
    }
    let prompt = injectProjectRoot(readFile(pass2PromptFile));

    const t2 = Date.now();
    const ticker2 = makePassTicker("Pass 2", t2);
    const ok = await runClaudePromptAsync(prompt, {
      onTick: ticker2.onTick,
      tickMs: ticker2.tickMs,
    });
    ticker2.clearLine();
    const elapsed2 = Date.now() - t2;
    stepTimes.push(elapsed2);

    if (!ok) {
      throw new InitError("Pass 2 failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force");
    }

    if (!fileExists(pass2Json)) {
      throw new InitError("pass2-merged.json was not created. Claude may have run but not produced expected output.");
    }

    completedSteps++;
    progressBar(completedSteps, `pass2-merged.json created (${formatElapsed(elapsed2)})`);
  }
  log("");

  // ─── [6] Pass 3: Generate + verify ─────────────────────────
  header("[6] Pass 3 — Generating all files...");

  const pass3Marker = path.join(GENERATED_DIR, "pass3-complete.json");
  const claudeMdPath = path.join(PROJECT_ROOT, "CLAUDE.md");

  // v1.7.1 → v1.7.2 migration: if CLAUDE.md exists from prior version but marker
  // is missing, backfill marker to preserve user's existing output.
  //
  // Gated by !wasFreshClean: --force and "fresh" resume mode wipe the marker
  // on purpose to force Pass 3 to re-run. They do NOT delete CLAUDE.md (user
  // may have manual edits worth preserving in the continue flow), so without
  // this gate the backfill would fire on a fresh run, re-write the marker,
  // and Pass 3 would skip — leaving stale CLAUDE.md + regenerated pass1/2 +
  // wiped rules/, which fails sync-checker and content-validator.
  if (!wasFreshClean && fileExists(claudeMdPath) && !fileExists(pass3Marker) && fileExists(path.join(GENERATED_DIR, "pass2-merged.json"))) {
    const { writeFileSafe: wfsMig } = require("../../lib/safe-fs");
    const backfillOk = wfsMig(pass3Marker, JSON.stringify({
      completedAt: new Date().toISOString(),
      backfilled: true,
      reason: "CLAUDE.md exists from prior version; marker backfilled to prevent regeneration. To force re-run, use --force or pick 'fresh' in the resume prompt.",
    }, null, 2));
    if (backfillOk) {
      log("    ℹ️  Detected existing CLAUDE.md — Pass 3 marker backfilled (use --force to regenerate)");
    } else {
      log("    ⚠️  CLAUDE.md exists but marker backfill failed — Pass 3 will re-run");
    }
  }

  // Stale marker detection (Pass 3). Drops the marker and re-runs Pass 3 if
  // any of the following is true:
  //   (a) CLAUDE.md was deleted externally (original check),
  //   (b) any of EXPECTED_GUIDE_FILES is missing or BOM-aware empty,
  //   (c) any entry in expected-outputs (standard sentinel / skills / plan) is
  //       missing or empty.
  //
  // (b) and (c) were previously only enforced as Pass 3 post-generation Guards
  // 3 (H2/H1), which gate marker *creation* on fresh runs. Projects that were
  // initialized on a pre-v2.0.0 release (before those guards existed) can end
  // up with a marker on disk even though guide/ or standard/skills/plan are
  // empty. Without this stale check, such projects hit a permanent
  // content-validator fail loop because init sees the marker and skips Pass 3
  // forever. This mirrors the Pass 4 dropStalePass4Marker pattern below.
  //
  // Unlink is surfaced as InitError on failure (symmetric with Pass 4).
  // Silently ignoring the error would leave the stale marker in place, and
  // the `if (fileExists(pass3Marker))` check below would accept it — skipping
  // Pass 3 while outputs are still incomplete. That silent-skip is the exact
  // bug class this audit round closes.
  function dropStalePass3Marker(reasonLog) {
    log(reasonLog);
    try { fs.unlinkSync(pass3Marker); } catch (e) {
      log(`    ❌ Failed to delete stale pass3-complete.json: ${e.code || e.message}`);
      throw new InitError(
        `Could not delete stale pass3-complete.json at:\n    ${pass3Marker}\n` +
        `    The file is likely locked by another process (Windows antivirus or a file-watcher).\n` +
        `    Close any editor/AV scanner holding the file and re-run \`npx claudeos-core init\`.`
      );
    }
  }
  if (fileExists(pass3Marker)) {
    if (!fileExists(claudeMdPath)) {
      dropStalePass3Marker("    ⚠️  pass3-complete.json exists but CLAUDE.md is missing — treating marker as stale, re-running Pass 3");
    } else {
      const guideDirForStale = path.join(PROJECT_ROOT, "claudeos-core/guide");
      const staleMissingGuides = EXPECTED_GUIDE_FILES.filter(g => {
        const fp = path.join(guideDirForStale, g);
        if (!fileExists(fp)) return true;
        try {
          return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
        } catch (_e) { return true; }
      });
      if (staleMissingGuides.length > 0) {
        dropStalePass3Marker(
          `    ⚠️  pass3-complete.json exists but ${staleMissingGuides.length}/${EXPECTED_GUIDE_FILES.length} guide files are missing or empty — treating marker as stale, re-running Pass 3`
        );
      } else {
        const staleMissingOutputs = findMissingOutputs(PROJECT_ROOT);
        if (staleMissingOutputs.length > 0) {
          dropStalePass3Marker(
            `    ⚠️  pass3-complete.json exists but ${staleMissingOutputs.length} required output(s) are missing or empty — treating marker as stale, re-running Pass 3`
          );
        }
      }
    }
  }

  if (fileExists(pass3Marker)) {
    log("    ⏭️  pass3-complete.json already exists, skipping");
    completedSteps++;
  } else {
    const pass3PromptFile = path.join(GENERATED_DIR, "pass3-prompt.md");
    if (!fileExists(pass3PromptFile)) {
      throw new InitError("pass3-prompt.md not found. Re-run plan-installer.");
    }
    let prompt = injectProjectRoot(readFile(pass3PromptFile));

    // Clear any stale .staged-rules/ before running Claude, so we don't
    // accidentally move leftover files from a prior crashed run alongside
    // the new output. Safe no-op when the dir doesn't exist.
    const stagedBeforeP3 = path.join(GENERATED_DIR, ".staged-rules");
    if (fileExists(stagedBeforeP3)) fs.rmSync(stagedBeforeP3, { recursive: true, force: true });

    const t3 = Date.now();
    // Pass 3 writes many files across .claude/ and claudeos-core/; we can't
    // know the total in advance (stack-dependent), so we show the delta only.
    const ticker3 = makePassTicker("Pass 3", t3, { baselineCount: countFiles() });
    const ok3 = await runClaudePromptAsync(prompt, {
      onTick: ticker3.onTick,
      tickMs: ticker3.tickMs,
    });
    ticker3.clearLine();
    const elapsed3 = Date.now() - t3;
    stepTimes.push(elapsed3);

    if (!ok3) {
      throw new InitError("Pass 3 failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force");
    }

    // Move rule files that Pass 3 wrote to the staging dir (workaround for
    // Claude Code's .claude/ sensitive-path block). See lib/staged-rules.js.
    const { moveStagedRules: mvP3, countFilesRecursive } = require("../../lib/staged-rules");
    const p3Move = mvP3(PROJECT_ROOT);
    if (p3Move.failed > 0) {
      log(`    ⚠️  Pass 3 staged-rules: ${p3Move.moved} moved, ${p3Move.failed} failed`);
      for (const err of p3Move.errors) log(`       • ${err}`);
    } else if (p3Move.moved > 0) {
      log(`    📦 Pass 3 staged-rules: ${p3Move.moved} rule files moved to .claude/rules/`);
    }

    // Guard 1 (Risk #1): Partial move failure. We do NOT write the pass3
    // completion marker, so the next `init` run re-executes Pass 3 via the
    // continue-mode path. Transient causes (Windows file locks, antivirus
    // scanners) usually clear on retry. The partially-moved rules stay in
    // .claude/rules/ — they're overwritten on re-run.
    if (p3Move.failed > 0) {
      throw new InitError(
        `Pass 3 finished but ${p3Move.failed} rule file(s) could not be moved from staging.\n` +
        `    See the warnings above. This is usually a transient file-lock issue.\n` +
        `    Re-run \`npx claudeos-core init\` — Pass 3 will retry automatically.`
      );
    }

    // Guard 2 (Risk #2): Empty .claude/rules/. If Claude ignored the
    // staging-override directive and tried to write directly to .claude/,
    // those writes are blocked by Claude Code and the staging dir stays
    // empty. Pass 3 reliably generates at least 00.standard-reference.md,
    // so zero files is a strong signal that generation failed silently.
    const ruleFilesCount = countFilesRecursive(path.join(PROJECT_ROOT, ".claude/rules"));
    if (ruleFilesCount === 0) {
      throw new InitError(
        "Pass 3 produced 0 rule files under .claude/rules/.\n" +
        "    This usually means Claude ignored the staging-override directive\n" +
        "    and attempted to write to .claude/ directly, where Claude Code's\n" +
        "    sensitive-path policy blocks writes.\n" +
        "    Re-run with --force: `npx claudeos-core init --force`"
      );
    }

    if (!fileExists(claudeMdPath)) {
      throw new InitError("CLAUDE.md was not created. Claude ran but did not produce CLAUDE.md.\n    Verify pass3-prompt.md instructs Claude to create CLAUDE.md at project root.");
    }

    // Guard 3 (Risk #3): Incomplete generation. Claude occasionally truncates
    // mid-response after writing CLAUDE.md + rules/ but before reaching the
    // guide/ section of the prompt. It also occasionally writes only a heading
    // and truncates before the body — giving us an empty file that satisfies
    // existsSync but fails content-validator's trim-length check. Both cases
    // leave the project permanently broken on subsequent runs (step [8]
    // content-validator errors are non-fatal), so gate the marker here.
    const guideDir = path.join(PROJECT_ROOT, "claudeos-core/guide");
    const missingOrEmptyGuides = EXPECTED_GUIDE_FILES.filter(g => {
      const fp = path.join(guideDir, g);
      if (!fileExists(fp)) return true;
      try {
        // Strip UTF-8 BOM before trim — String.prototype.trim doesn't remove
        // U+FEFF (not in Unicode White_Space). Otherwise a BOM-only file
        // (3 bytes, no text) would pass the empty check and Guard 3 would
        // silently accept it. Mirrors content-validator/index.js:115.
        return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
      } catch (_e) { return true; }  // unreadable counts as missing
    });
    if (missingOrEmptyGuides.length > 0) {
      const preview = missingOrEmptyGuides.slice(0, 5).map(g => `       • claudeos-core/guide/${g}`).join("\n");
      const more = missingOrEmptyGuides.length > 5 ? `\n       • ... and ${missingOrEmptyGuides.length - 5} more` : "";
      throw new InitError(
        `Pass 3 produced CLAUDE.md and rules but ${missingOrEmptyGuides.length}/${EXPECTED_GUIDE_FILES.length} guide files are missing or empty:\n` +
        preview + more + "\n" +
        "    Claude likely truncated the response before reaching or finishing the guide/ section.\n" +
        "    Re-run with --force: `npx claudeos-core init --force`"
      );
    }

    // Guard 3 extension (H1): The same truncation pattern can cut off Claude's
    // response AFTER the guide/ section but before standard/, skills/, or
    // plan/. content-validator flags these as ERROR-level but step [8] runs
    // with ignoreError:true so nothing blocks the marker. Validate each
    // directory here — a specific sentinel file for standard/, and a
    // "≥1 non-empty .md" check for skills/ and plan/. database/ and
    // mcp-guide/ are intentionally excluded (validator: WARNING-level; stacks
    // legitimately produce zero files when no DB or MCP integration exists).
    const missingOutputs = findMissingOutputs(PROJECT_ROOT);
    if (missingOutputs.length > 0) {
      const preview = missingOutputs.map(m => `       • ${m}`).join("\n");
      throw new InitError(
        `Pass 3 finished but the following required output(s) are missing or empty:\n` +
        preview + "\n" +
        "    Claude likely truncated the response before completing all output sections.\n" +
        "    Re-run with --force: `npx claudeos-core init --force`"
      );
    }

    // Write completion marker so subsequent `init` runs skip Pass 3 under "continue" mode.
    const { writeFileSafe: wfs } = require("../../lib/safe-fs");
    const markerOk = wfs(pass3Marker, JSON.stringify({ completedAt: new Date().toISOString() }, null, 2));
    if (!markerOk) {
      throw new InitError(`Failed to write ${path.basename(pass3Marker)}. Check disk space and permissions on claudeos-core/generated/.\n    Without this marker, subsequent \`init\` runs will regenerate CLAUDE.md.`);
    }
    completedSteps++;
    progressBar(completedSteps, `Pass 3 complete (${formatElapsed(elapsed3)})`);
  }
  log("");

  // ─── [7] Pass 4: L4 memory scaffolding ────────────
  header("[7] Pass 4 — Memory scaffolding...");

  const pass4Marker = path.join(GENERATED_DIR, "pass4-memory.json");
  const pass4PromptFile = path.join(GENERATED_DIR, "pass4-prompt.md");

  const { scaffoldMemory, scaffoldRules, appendClaudeMdL4Memory, scaffoldMasterPlans, scaffoldDocWritingGuide } = require("../../lib/memory-scaffold");
  const { writeFileSafe } = require("../../lib/safe-fs");

  const memoryPath = path.join(PROJECT_ROOT, "claudeos-core/memory");
  const planPath = path.join(PROJECT_ROOT, "claudeos-core/plan");
  const rulesPath = path.join(PROJECT_ROOT, ".claude/rules");
  const standardCorePath = path.join(PROJECT_ROOT, "claudeos-core/standard/00.core");

  function applyStaticFallback() {
    try {
      scaffoldMemory(memoryPath, { lang });
      scaffoldRules(rulesPath, { lang });
      scaffoldDocWritingGuide(standardCorePath, { lang });
      scaffoldMasterPlans(planPath, memoryPath, { lang });
      appendClaudeMdL4Memory(claudeMdPath, { lang });
    } catch (err) {
      // When lang !== "en", translation is REQUIRED. If it fails, we surface
      // a clear error rather than silently writing English (which would
      // contradict the user's --lang choice).
      throw new InitError(
        `Static fallback failed while translating to lang='${lang}':\n` +
        `    ${err.message}\n` +
        `    Ensure the \`claude\` CLI is available and authenticated, then re-run.\n` +
        `    Alternatively re-run with --lang en to skip translation.`
      );
    }
    const markerBody = JSON.stringify({
      analyzedAt: new Date().toISOString(),
      passNum: 4,
      fallback: true,
      lang,
      memoryFiles: [
        "claudeos-core/memory/decision-log.md",
        "claudeos-core/memory/failure-patterns.md",
        "claudeos-core/memory/compaction.md",
        "claudeos-core/memory/auto-rule-update.md",
      ],
      ruleFiles: [
        ".claude/rules/00.core/51.doc-writing-rules.md",
        ".claude/rules/00.core/52.ai-work-rules.md",
        ".claude/rules/60.memory/01.decision-log.md",
        ".claude/rules/60.memory/02.failure-patterns.md",
        ".claude/rules/60.memory/03.compaction.md",
        ".claude/rules/60.memory/04.auto-rule-update.md",
      ],
      planFiles: [
        "claudeos-core/plan/50.memory-master.md",
      ],
      claudeMdAppended: true,
    }, null, 2);
    return writeFileSafe(pass4Marker, markerBody);
  }

  // M1: validate Pass 4 marker CONTENT, not just existence. Claude can emit
  // a malformed marker on partial failure (e.g. `{"error":"timeout"}`) that
  // still satisfies fileExists() and would cause the skip path to accept it
  // forever. Pass 4 prompt (pass-prompts/templates/common/pass4.md:255-283)
  // specifies the required structure; we check the minimum subset that
  // distinguishes a real marker from junk: object shape + passNum === 4 +
  // non-empty memoryFiles array.
  function isValidPass4Marker(markerPath) {
    if (!fileExists(markerPath)) return false;
    try {
      const data = JSON.parse(readFile(markerPath));
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      if (data.passNum !== 4) return false;
      if (!Array.isArray(data.memoryFiles) || data.memoryFiles.length === 0) return false;
      return true;
    } catch (_e) { return false; }
  }

  // Stale / invalid marker detection. Delete and re-run if either:
  //   (a) memory/ was deleted externally (original stale-detection), OR
  //   (b) the marker file itself is malformed (M1).
  //
  // Unlink can fail on Windows if an AV or file-watcher has the handle open.
  // We surface that failure to the user — without it, the subsequent
  // `if (fileExists(pass4Marker))` check below would accept the stale marker
  // and skip Pass 4 silently, leaving the project with half-scaffolded memory
  // state (exactly the silent-failure class this audit is eliminating).
  const memoryAny = fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/decision-log.md"))
    || fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/compaction.md"));
  function dropStalePass4Marker(reasonLog) {
    log(reasonLog);
    try { fs.unlinkSync(pass4Marker); } catch (e) {
      log(`    ❌ Failed to delete stale pass4-memory.json: ${e.code || e.message}`);
      throw new InitError(
        `Could not delete stale pass4-memory.json at:\n    ${pass4Marker}\n` +
        `    The file is likely locked by another process (Windows antivirus or a file-watcher).\n` +
        `    Close any editor/AV scanner holding the file and re-run \`npx claudeos-core init\`.`
      );
    }
  }
  if (fileExists(pass4Marker)) {
    if (!memoryAny) {
      dropStalePass4Marker("    ⚠️  pass4-memory.json exists but memory/ is empty — re-running Pass 4");
    } else if (!isValidPass4Marker(pass4Marker)) {
      dropStalePass4Marker("    ⚠️  pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4");
    }
  }

  const pass4Start = Date.now();
  let pass4Label = "Pass 4 complete";

  if (fileExists(pass4Marker)) {
    log("    ⏭️  pass4-memory.json already exists, skipping");
    pass4Label = "Pass 4 already present";
  } else if (!fileExists(pass4PromptFile)) {
    log("    ⚠️  pass4-prompt.md not found — falling back to static scaffold");
    if (applyStaticFallback()) { log("    ✅ Memory/Rules/Plans scaffolded + CLAUDE.md appended (static fallback)"); pass4Label = "Pass 4 (static fallback)"; }
    else { log("    ❌ Static fallback failed to write marker"); pass4Label = "Pass 4 fallback failed"; }
  } else {
    let prompt4 = injectProjectRoot(readFile(pass4PromptFile));

    // Same stale-staging guard as Pass 3 (in case a previous Pass 4 crashed
    // after writing to the staging dir but before the move could run).
    const stagedBeforeP4 = path.join(GENERATED_DIR, ".staged-rules");
    if (fileExists(stagedBeforeP4)) fs.rmSync(stagedBeforeP4, { recursive: true, force: true });

    const t4 = Date.now();
    // Pass 4 creates 12 files in total, but the 6 rule files go to
    // .staged-rules/ (i.e. under claudeos-core/generated/) which countFiles()
    // deliberately skips. So the ticker can only observe 6 files during the
    // run: 4 memory + 1 plan + 1 standard. We set totalExpected to that
    // observable max; the final "100%" shows up on the outer progressBar
    // once the staged move + marker are done.
    const ticker4 = makePassTicker("Pass 4", t4, {
      baselineCount: countFiles(),
      totalExpected: 6,
    });
    const ok4 = await runClaudePromptAsync(prompt4, {
      onTick: ticker4.onTick,
      tickMs: ticker4.tickMs,
    });
    ticker4.clearLine();
    const elapsed4 = Date.now() - t4;

    // Move any rule files Pass 4 wrote to the staging dir. This runs regardless
    // of pass4Marker status, because Claude may have written rules before
    // failing to produce the marker. Static fallback (below) writes directly
    // to .claude/rules/ and is unaffected by the move (no-op on empty staging).
    const { moveStagedRules: mvP4 } = require("../../lib/staged-rules");
    const p4Move = mvP4(PROJECT_ROOT);
    if (p4Move.failed > 0) {
      log(`    ⚠️  Pass 4 staged-rules: ${p4Move.moved} moved, ${p4Move.failed} failed`);
      for (const err of p4Move.errors) log(`       • ${err}`);
    } else if (p4Move.moved > 0) {
      log(`    📦 Pass 4 staged-rules: ${p4Move.moved} rule files moved to .claude/rules/`);
    }

    if (!ok4 || !isValidPass4Marker(pass4Marker)) {
      log("    ⚠️  Pass 4 did not produce a valid pass4-memory.json — using static fallback");
      if (applyStaticFallback()) { log("    ✅ Memory/Rules/Plans scaffolded + CLAUDE.md appended (static fallback)"); pass4Label = `Pass 4 (static fallback, ${formatElapsed(elapsed4)})`; }
      else { log("    ❌ Static fallback failed to write marker"); pass4Label = "Pass 4 fallback failed"; }
    } else {
      // Claude-driven Pass 4 succeeded. Ensure memory + rules + plans + standard + CLAUDE.md append exist
      // (Claude may have created them; fill any gaps with static fallback).
      // scaffoldMemory is skip-safe: it only writes files that don't already exist,
      // so it won't overwrite Claude's translated content — it only fills gaps.
      // When lang !== "en", the gap-fill MUST translate: we do not silently
      // write English into a non-English project (bug #21).
      let gapResults;
      try {
        const memR   = scaffoldMemory(memoryPath, { lang });
        const ruleR  = scaffoldRules(rulesPath, { lang });
        const docR   = scaffoldDocWritingGuide(standardCorePath, { lang });
        const planR  = scaffoldMasterPlans(planPath, memoryPath, { lang });
        const claudeOk = appendClaudeMdL4Memory(claudeMdPath, { lang });
        // Collect all statuses into one flat array for summary reporting.
        gapResults = [
          ...memR,
          ...ruleR,
          ...planR,
          { file: docR.file, status: docR.status },
          { file: "CLAUDE.md#(L4)", status: claudeOk ? "present-or-appended" : "error" },
        ];
      } catch (err) {
        throw new InitError(
          `Pass 4 gap-fill failed while translating to lang='${lang}':\n` +
          `    ${err.message}\n` +
          `    Pass 4 Claude succeeded but some files were missing and translation of the ` +
          `static fallback to ${lang} failed.\n` +
          `    Re-run when \`claude\` CLI is available, or use --lang en.`
        );
      }
      // Summary: how many were already present (skipped) vs written by gap-fill.
      // This surfaces the true state regardless of what Claude printed during Pass 4.
      const skipped = gapResults.filter(r => r.status === "skipped" || r.status === "present-or-appended").length;
      const written = gapResults.filter(r => r.status === "written").length;
      const erroredItems = gapResults.filter(r => r.status === "error");
      const errored = erroredItems.length;
      log(`    ✅ Pass 4 complete (${formatElapsed(elapsed4)})`);
      if (written > 0 || errored > 0) {
        log(`       📋 Gap-fill: ${skipped} already present, ${written} created via fallback, ${errored} errored`);
      } else {
        log(`       📋 Gap-fill: all ${skipped} expected files already present`);
      }
      // Surface which files errored so the user can investigate (instead of
      // silently rolling them into a count). Common causes: write permission,
      // disk full, or appendClaudeMdL4Memory returned false (CLAUDE.md missing
      // or unwritable). All erroredItems are non-fatal — Pass 4 marker still
      // gets written, but the user should know what was incomplete.
      for (const item of erroredItems) {
        log(`       ❌ ${item.file} — write failed (check disk space, permissions)`);
      }
      pass4Label = `Pass 4 complete (${formatElapsed(elapsed4)})`;
    }
  }
  // Record Pass 4 in the overall progress bar, regardless of which branch
  // (skip / static fallback / Claude-driven) ran above. Only feed stepTimes
  // when we actually did real work, so ETA for future steps stays meaningful.
  const pass4Elapsed = Date.now() - pass4Start;
  if (pass4Elapsed > 500) stepTimes.push(pass4Elapsed);
  completedSteps++;
  progressBar(completedSteps, pass4Label);
  log("");

  // ─── [8] Run verification tools ───────────────────────────────
  header("[8] Running verification tools...");

  const verifyTools = [
    { name: "manifest-generator", script: path.join(TOOLS_DIR, "manifest-generator/index.js") },
    { name: "health-checker",     script: path.join(TOOLS_DIR, "health-checker/index.js") },
  ];

  for (const t of verifyTools) {
    if (!fileExists(t.script)) {
      log(`    ⏭️  ${t.name} — not found, skipping`);
      continue;
    }
    const ok = run(`node "${t.script}"`, { ignoreError: true });
    if (!ok) {
      log(`    ⚠️  ${t.name} reported issues (non-fatal)`);
    }
  }
  log("");

  // ─── Complete ─────────────────────────────────────────────
  const totalFiles = countFiles();
  const pass1Files = countPass1Files();

  log("");
  const memoryReady = fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/decision-log.md"));
  const rulesReady = fileExists(path.join(PROJECT_ROOT, ".claude/rules/60.memory/01.decision-log.md"));
  const l4Status = (memoryReady && rulesReady) ? "memory + rules" : "partial";
  log("╔════════════════════════════════════════════════════╗");
  log("║  ✅ ClaudeOS-Core — Complete                       ║");
  log("║                                                    ║");
  log(`║   Files created:     ${pad(String(totalFiles), 29)}║`);
  log(`║   Domains analyzed:  ${pad(totalGroups + " groups", 29)}║`);
  log(`║   Analysis passes:   ${pad(pass1Files + " pass1 files", 29)}║`);
  log(`║   L4 scaffolded:     ${pad(l4Status, 29)}║`);
  log(`║   Output language:   ${pad(SUPPORTED_LANGS[lang] || lang, 29)}║`);
  log(`║   Total time:        ${pad(formatElapsed(Date.now() - totalStart), 29)}║`);
  log("║                                                    ║");
  log("║   Verify anytime:                                  ║");
  log("║   npx claudeos-core health                         ║");
  log("║                                                    ║");
  log("║   Start using:                                     ║");
  log('║   "Create a CRUD for orders"                       ║');
  log("╚════════════════════════════════════════════════════╝");
  log("");
}

module.exports = { cmdInit, InitError };
