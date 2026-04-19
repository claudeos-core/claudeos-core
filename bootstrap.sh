#!/bin/bash

# ClaudeOS-Core — Bootstrap
#
# Thin wrapper that forwards to `node bin/cli.js init`.
#
# The full init pipeline (plan-installer, Pass 1 multi-group, Pass 2 merge,
# Pass 3 file generation, Pass 4 memory scaffolding, verification) is
# implemented in bin/commands/init.js — this script just ensures Node.js
# is available, installs npm dependencies on first run, and delegates.
#
# Why delegation instead of reimplementing the pipeline in bash:
#   - init.js supports features this script does not (and cannot reasonably
#     reimplement): --lang (10 languages), --resume (interrupted init
#     recovery), Pass 4 memory scaffolding with translated fallback,
#     progress bar with ETA, stale-marker detection, clear error messages.
#   - A single source of truth (init.js) prevents the two code paths from
#     drifting, which was the cause of bug #21's cousin: bootstrap.sh was
#     still advertising "3-Pass" while the CLI had moved to 4-Pass with
#     persistent memory scaffolding.
#
# Prerequisites:
#   - bash (this script), node (v18+), claude CLI (for the init pipeline)
#
# Usage:
#   bash claudeos-core-tools/bootstrap.sh                  # interactive lang pick
#   bash claudeos-core-tools/bootstrap.sh --lang ko        # Korean
#   bash claudeos-core-tools/bootstrap.sh --lang en --force # fresh English init
#
# Cross-platform alternative (recommended):
#   npx claudeos-core init
#   node claudeos-core-tools/bin/cli.js init

if [ -z "$BASH_VERSION" ]; then
  echo "❌ This script requires bash. Run with: bash $0" >&2
  exit 1
fi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOLS_DIR="$SCRIPT_DIR"

cd "$PROJECT_ROOT"

# ─── Prerequisites check ──────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "❌ node is required but not found in PATH. Install Node.js 18+ and re-run." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found v$(node -v 2>/dev/null))." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  \`claude\` CLI not found in PATH. The init pipeline requires it." >&2
  echo "    Install & sign in: https://docs.claude.com/en/docs/claude-code/overview" >&2
  # Don't exit — let init.js surface the exact point of failure with context.
fi

# ─── [1/2] Ensure npm dependencies ────────────────────────────
# init.js requires glob + gray-matter. If node_modules is missing (first
# bootstrap run for a freshly-cloned tools directory), install them.
if [ ! -d "$TOOLS_DIR/node_modules" ]; then
  echo "[1/2] Installing dependencies (first bootstrap run)..."
  (cd "$TOOLS_DIR" && npm install --silent --no-audit --no-fund) || {
    echo "❌ npm install failed. Check network / npm registry access." >&2
    exit 1
  }
  echo "    ✅ Dependencies installed"
  echo
fi

# ─── [2/2] Delegate to the CLI ────────────────────────────────
echo "[2/2] Running ClaudeOS-Core init..."
echo
exec node "$TOOLS_DIR/bin/cli.js" init "$@"
