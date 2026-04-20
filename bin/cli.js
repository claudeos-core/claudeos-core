#!/usr/bin/env node

/**
 * ClaudeOS-Core — CLI
 *
 * Node.js replacement for bootstrap.sh with cross-platform support.
 * Usage:
 *   npx claudeos-core init --lang ko  ← Run 4-Pass pipeline (Korean output)
 *   npx claudeos-core init            ← Interactive language selection
 *   npx claudeos-core health          ← Run health checker
 *   npx claudeos-core validate        ← Run plan validator (--check)
 *   npx claudeos-core restore         ← Restore from Master Plan
 *   npx claudeos-core refresh         ← Sync disk → Plan
 *   npx claudeos-core memory <sub>    ← L4 memory (compact/score/propose-rules)
 *   npx claudeos-core --help          ← Show help
 *
 * Also works when cloned directly:
 *   node claudeos-core-tools/bin/cli.js init
 */

const path = require("path");
const { TOOLS_DIR, PROJECT_ROOT, log, run, readFile } = require("./lib/cli-utils");
const { cmdInit, InitError } = require("./commands/init");
const { cmdMemory } = require("./commands/memory");

// Set env var so sub-tools (plan-installer, etc.) correctly resolve the project root
process.env.CLAUDEOS_ROOT = PROJECT_ROOT;

// ─── Command handlers (simple — delegate to sub-tools) ───────────
function cmdHealth() {
  run(`node "${path.join(TOOLS_DIR, "health-checker/index.js")}"`);
}

function cmdValidate() {
  run(`node "${path.join(TOOLS_DIR, "plan-validator/index.js")}" --check`);
}

function cmdRestore() {
  run(`node "${path.join(TOOLS_DIR, "plan-validator/index.js")}" --execute`);
}

function cmdRefresh() {
  run(`node "${path.join(TOOLS_DIR, "plan-validator/index.js")}" --refresh`);
}

// ─── Help ───────────────────────────────────────────────────────
function showHelp() {
  log(`
ClaudeOS-Core — Auto-generate Claude Code documentation from your source code.

Usage:
  claudeos-core <command>

Commands:
  init               Run the full 4-Pass pipeline (analyze → merge → generate → memory scaffold)
  health             Run all verification tools (health checker)
  validate           Check Plan ↔ disk consistency
  refresh            Sync disk changes → Master Plan
  restore            Restore all files from Master Plan
  memory <sub>       L4 memory:  compact | score | propose-rules

Options:
  --lang CODE Output language for generated files (required for init)
              Supported: en, ko, zh-CN, ja, es, vi, hi, ru, fr, de
              If omitted, interactive selection is shown.
  --force     Skip resume prompt and start fresh (delete previous results)
  --help      Show this help message
  --version   Show version

Examples:
  npx claudeos-core init --lang ko    # Generate in Korean
  npx claudeos-core init --lang ja    # Generate in Japanese
  npx claudeos-core init              # Interactive language selection
  npx claudeos-core health            # Check everything is consistent
  npx claudeos-core restore           # Recover from corrupted docs
`);
}

// ─── Argument parser ────────────────────────────────────────────
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
      // If we already saw a command (e.g. `memory --help`), let that command
      // handle --help itself via process.argv. Only promote --help to
      // top-level when it appears before any command (e.g. `--help` alone or
      // `--help memory`). This lets `memory --help` show memory's subcommand
      // help rather than the top-level usage.
      if (!result.command) result.command = "--help";
    } else if (argv[i] === "--version" || argv[i] === "-v") {
      result.command = "--version";
    } else if (!argv[i].startsWith("-") && !result.command) {
      result.command = argv[i];
    }
  }
  return result;
}

// ─── Main ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const parsedArgs = parseArgs(args);
const command = parsedArgs.command;

if (!command || command === "--help") {
  showHelp();
  process.exit(0);
}

if (command === "--version") {
  try {
    const pkg = JSON.parse(
      readFile(path.join(TOOLS_DIR, "package.json"))
    );
    log(`claudeos-core v${pkg.version}`);
  } catch (e) {
    log("claudeos-core (version unknown)");
  }
  process.exit(0);
}

const commands = {
  init: () => cmdInit(parsedArgs),
  health: cmdHealth,
  validate: cmdValidate,
  restore: cmdRestore,
  refresh: cmdRefresh,
  memory: () => cmdMemory(parsedArgs),
};

if (!commands[command]) {
  log(`Unknown command: ${command}`);
  log('Run "claudeos-core --help" for usage.');
  process.exit(1);
}

Promise.resolve().then(() => commands[command]()).catch((e) => {
  if (e instanceof InitError) {
    log(`\n  ❌ ${e.message}\n`);
  } else {
    console.error(e.message || e);
  }
  process.exit(1);
});
