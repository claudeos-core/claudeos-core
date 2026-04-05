/**
 * ClaudeOS-Core — CLI Utilities
 *
 * Shared constants, execution helpers, and filesystem utilities for the CLI.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Path configuration ──────────────────────────────────────────
const TOOLS_DIR = path.resolve(__dirname, "../..");
const PROJECT_ROOT = process.cwd();
const GENERATED_DIR = path.join(PROJECT_ROOT, "claudeos-core/generated");

// ─── Language configuration ──────────────────────────────────────
const SUPPORTED_LANGS = {
  en:      "English",
  ko:      "한국어 (Korean)",
  "zh-CN": "简体中文 (Chinese Simplified)",
  ja:      "日本語 (Japanese)",
  es:      "Español (Spanish)",
  vi:      "Tiếng Việt (Vietnamese)",
  hi:      "हिन्दी (Hindi)",
  ru:      "Русский (Russian)",
  fr:      "Français (French)",
  de:      "Deutsch (German)",
};
const LANG_CODES = Object.keys(SUPPORTED_LANGS);

function isValidLang(lang) {
  return LANG_CODES.includes(lang);
}

// ─── Output ─────────────────────────────────────────────────────
function log(msg) {
  console.log(msg);
}

function header(title) {
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log(title);
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ─── Execution ──────────────────────────────────────────────────
function run(cmd, options = {}) {
  try {
    execSync(cmd, {
      cwd: options.cwd || PROJECT_ROOT,
      stdio: options.silent ? ["pipe", "pipe", "pipe"] : "inherit",
      encoding: "utf-8",
      timeout: options.timeout || 0,
    });
    return true;
  } catch (e) {
    if (options.ignoreError) return false;
    throw e;
  }
}

// Run claude -p: pass prompt via stdin (no shell pipe — avoids command injection)
function runClaudePrompt(prompt, options = {}) {
  try {
    execSync("claude -p --dangerously-skip-permissions", {
      input: prompt,
      cwd: options.cwd || PROJECT_ROOT,
      stdio: ["pipe", "inherit", "inherit"],
      encoding: "utf-8",
      timeout: 0,
    });
    return true;
  } catch (e) {
    if (options.ignoreError) return false;
    throw e;
  }
}

// ─── Filesystem ─────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fileExists(p) {
  return fs.existsSync(p);
}

function readFile(p) {
  return fs.readFileSync(p, "utf-8");
}

function injectProjectRoot(text) {
  // Normalize to forward slashes for prompts (Claude interprets backslashes as escapes)
  const normalizedRoot = PROJECT_ROOT.replace(/\\/g, "/");
  return text.replace(/\{\{PROJECT_ROOT\}\}/g, normalizedRoot);
}

// ─── Helpers ────────────────────────────────────────────────────
function pad(str, len) {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function countFiles() {
  try {
    let count = 0;
    const skipDirs = ["node_modules", "generated"];
    const visited = new Set();
    const scan = (dir) => {
      if (!fs.existsSync(dir)) return;
      let realDir;
      try { realDir = fs.realpathSync(dir); } catch (_e) { realDir = dir; }
      if (visited.has(realDir)) return;
      visited.add(realDir);
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skipDirs.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else count++;
      }
    };
    scan(path.join(PROJECT_ROOT, ".claude"));
    scan(path.join(PROJECT_ROOT, "claudeos-core"));
    return count;
  } catch (e) {
    return "?";
  }
}

function countPass1Files() {
  try {
    return fs
      .readdirSync(GENERATED_DIR)
      .filter((f) => f.startsWith("pass1-") && f.endsWith(".json")).length;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  TOOLS_DIR, PROJECT_ROOT, GENERATED_DIR,
  SUPPORTED_LANGS, LANG_CODES, isValidLang,
  log, header, run, runClaudePrompt,
  ensureDir, fileExists, readFile, injectProjectRoot,
  pad, countFiles, countPass1Files,
};
