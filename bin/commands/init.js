/**
 * ClaudeOS-Core — Init Command
 *
 * Runs the full 3-Pass pipeline: analyze → merge → generate.
 * This is the main entry point for project bootstrapping.
 */

const fs = require("fs");
const path = require("path");
const {
  TOOLS_DIR, PROJECT_ROOT, GENERATED_DIR,
  SUPPORTED_LANGS, LANG_CODES, isValidLang,
  log, header, run, runClaudePrompt,
  ensureDir, fileExists, readFile, injectProjectRoot,
  pad, countFiles, countPass1Files,
} = require("../lib/cli-utils");
const { selectLangInteractive } = require("../lib/lang-selector");
const { selectResumeMode } = require("../lib/resume-selector");

// ─── i18n: claude -p waiting message ───────────────────────────
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

async function cmdInit(parsedArgs) {
  const totalStart = Date.now();

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
        log("  🔄 Previous results deleted (--force)\n");
      } else {
        const status = { pass1Done: existingPass1.length, pass2Done: pass2Exists };
        const mode = await selectResumeMode(lang, status);
        if (!mode) throw new InitError("Cancelled.");
        if (mode === "fresh") {
          for (const f of existingPass1) fs.unlinkSync(path.join(GENERATED_DIR, f));
          if (pass2Exists) fs.unlinkSync(path.join(GENERATED_DIR, "pass2-merged.json"));
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
  log("║       ClaudeOS-Core — Bootstrap (3-Pass)          ║");
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

  // Progress tracking: Pass 1 (N groups) + Pass 2 + Pass 3 = totalSteps
  const totalSteps = totalGroups + 2;
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

    // Placeholder substitution
    let prompt = template
      .replace(/\{\{DOMAIN_GROUP\}\}/g, domainList)
      .replace(/\{\{PASS_NUM\}\}/g, String(i));
    prompt = injectProjectRoot(prompt);

    log(claudeWaitMsg(lang, `Pass 1-${i}/${totalGroups}`));
    const t1 = Date.now();
    const ok = runClaudePrompt(prompt, { ignoreError: true });
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
  if (fileExists(pass2Json)) {
    log("    ⏭️  pass2-merged.json already exists, skipping");
    completedSteps++;
  } else {
    const pass2PromptFile = path.join(GENERATED_DIR, "pass2-prompt.md");
    if (!fileExists(pass2PromptFile)) {
      throw new InitError("pass2-prompt.md not found. Re-run plan-installer.");
    }
    let prompt = injectProjectRoot(readFile(pass2PromptFile));

    log(claudeWaitMsg(lang, "Pass 2"));
    const t2 = Date.now();
    const ok = runClaudePrompt(prompt, { ignoreError: true });
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

  const pass3PromptFile = path.join(GENERATED_DIR, "pass3-prompt.md");
  if (!fileExists(pass3PromptFile)) {
    throw new InitError("pass3-prompt.md not found. Re-run plan-installer.");
  }
  let prompt = injectProjectRoot(readFile(pass3PromptFile));

  log(claudeWaitMsg(lang, "Pass 3"));
  const t3 = Date.now();
  const ok3 = runClaudePrompt(prompt, { ignoreError: true });
  const elapsed3 = Date.now() - t3;
  stepTimes.push(elapsed3);

  if (!ok3) {
    throw new InitError("Pass 3 failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force");
  }

  if (!fileExists(path.join(PROJECT_ROOT, "CLAUDE.md"))) {
    throw new InitError("CLAUDE.md was not created. Claude ran but did not produce CLAUDE.md.\n    Verify pass3-prompt.md instructs Claude to create CLAUDE.md at project root.");
  }
  completedSteps++;
  progressBar(completedSteps, `Pass 3 complete (${formatElapsed(elapsed3)})`);
  log("");

  // ─── [7] Run verification tools ───────────────────────────────
  header("[7] Running verification tools...");

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
  log("╔════════════════════════════════════════════════════╗");
  log("║  ✅ ClaudeOS-Core — Complete                       ║");
  log("║                                                    ║");
  log(`║   Files created:     ${pad(String(totalFiles), 29)}║`);
  log(`║   Domains analyzed:  ${pad(totalGroups + " groups", 29)}║`);
  log(`║   Analysis passes:   ${pad(pass1Files + " pass1 files", 29)}║`);
  log(`║   Output language:   ${pad(SUPPORTED_LANGS[lang] || lang, 29)}║`);
  log(`║   Total time:       ${pad(formatElapsed(Date.now() - totalStart), 29)}║`);
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
