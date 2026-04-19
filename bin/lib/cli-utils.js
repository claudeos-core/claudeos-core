/**
 * ClaudeOS-Core — CLI Utilities
 *
 * Shared constants, execution helpers, and filesystem utilities for the CLI.
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ensureDir, existsSafe } = require("../../lib/safe-fs");

// ─── Path configuration ──────────────────────────────────────────
const TOOLS_DIR = path.resolve(__dirname, "../..");
const PROJECT_ROOT = process.cwd();
const GENERATED_DIR = path.join(PROJECT_ROOT, "claudeos-core/generated");

// ─── Language configuration ──────────────────────────────────────
// Single source of truth: lib/language-config.js. We re-export under the
// historical name SUPPORTED_LANGS so existing imports keep working.
const { LANGUAGES: SUPPORTED_LANGS, LANG_CODES, isValidLang } = require("../../lib/language-config");

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

// Async variant of runClaudePrompt using spawn — does NOT block the event loop,
// so the caller can run setInterval-based progress callbacks concurrently.
// Resolves to true on exit code 0, false otherwise (no throw; mirrors ignoreError:true).
// onTick is invoked every tickMs while claude is running; stopped on close.
// shell:true on Windows so that `claude.cmd`/`claude.ps1` shims resolve via PATH.
function runClaudePromptAsync(prompt, options = {}) {
  return new Promise((resolve) => {
    let child = null;
    let tickTimer = null;
    const cleanup = () => { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } };
    const bail = () => {
      cleanup();
      // Best-effort kill so we don't leave orphaned claude processes when we
      // fail to hand off the prompt or encounter an unexpected spawn error.
      if (child && !child.killed) { try { child.kill(); } catch (_e) { /* ignore */ } }
      resolve(false);
    };
    try {
      // Node 18+ emits DEP0190 when mixing shell:true with an args array (the
      // args aren't escaped — just concatenated). On Windows we need shell:true
      // so `claude.cmd`/`claude.ps1` shims resolve via PATH, so we build the
      // whole command as a single string there and pass an empty args array.
      // The flags are hardcoded literals (no user input) so there's no
      // injection surface either way; this just silences the warning.
      const isWin = process.platform === "win32";
      const spawnCmd = isWin ? "claude -p --dangerously-skip-permissions" : "claude";
      const spawnArgs = isWin ? [] : ["-p", "--dangerously-skip-permissions"];
      child = spawn(spawnCmd, spawnArgs, {
        cwd: options.cwd || PROJECT_ROOT,
        stdio: ["pipe", "inherit", "inherit"],
        shell: isWin,
      });
      if (typeof options.onTick === "function" && options.tickMs > 0) {
        // Fire once immediately so the user sees the progress line right away,
        // instead of waiting a full tick interval for any feedback.
        try { options.onTick(); } catch (_e) { /* swallow */ }
        tickTimer = setInterval(() => {
          try { options.onTick(); } catch (_e) { /* swallow — progress is best-effort */ }
        }, options.tickMs);
      }
      child.on("close", (code) => { cleanup(); resolve(code === 0); });
      child.on("error", () => { cleanup(); resolve(false); });
      child.stdin.on("error", () => { bail(); });
      child.stdin.write(prompt);
      child.stdin.end();
    } catch (_e) {
      // Catches synchronous throws from spawn (e.g. ENAMETOOLONG on some
      // platforms) or from the initial stdin.write before listeners were
      // attached. Either way: no orphan child, no leaked interval.
      bail();
    }
  });
}

// Run claude -p but CAPTURE stdout instead of inheriting it.
// Returns the captured stdout string on success, or null on failure.
// Used for short tasks where we need the response content (e.g. translation).
// maxBuffer default is 10MB — enough for document translation.
function runClaudeCapture(prompt, options = {}) {
  try {
    const out = execSync("claude -p --dangerously-skip-permissions", {
      input: prompt,
      cwd: options.cwd || PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
      timeout: options.timeout || 0,
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
    });
    return out;
  } catch (_e) {
    return null;
  }
}

// ─── Filesystem ─────────────────────────────────────────────────
// ensureDir: delegated to lib/safe-fs.js (single source of truth)
// fileExists: alias for existsSafe from lib/safe-fs.js
const fileExists = existsSafe;

// readFile: intentionally throws on error (CLI needs hard failure, unlike safe-fs fallback)
function readFile(p) {
  return fs.readFileSync(p, "utf-8");
}

function injectProjectRoot(text) {
  // Normalize to forward slashes for prompts (Claude interprets backslashes as escapes)
  const normalizedRoot = PROJECT_ROOT.replace(/\\/g, "/");
  // Use a replacement function so that `$`, `$1`, `$&`, `$$` in the
  // project path (rare but possible on some systems) are preserved as
  // literal characters rather than interpreted as regex specials.
  return text.replace(/\{\{PROJECT_ROOT\}\}/g, () => normalizedRoot);
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
  log, header, run, runClaudePrompt, runClaudePromptAsync, runClaudeCapture,
  ensureDir, fileExists, readFile, injectProjectRoot,
  pad, countFiles, countPass1Files,
};
