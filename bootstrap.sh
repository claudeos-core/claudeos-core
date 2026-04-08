#!/bin/bash

# ClaudeOS-Core — Bootstrap (3-Pass Auto)
#
# One-click full system auto-build
# Automatically splits Pass 1 into N runs based on project size
#
# Prerequisites: bash, node (v18+), claude CLI
# Cross-platform alternative: node bin/cli.js init
#
# Usage: bash claudeos-core-tools/bootstrap.sh --lang ko
#        bash claudeos-core-tools/bootstrap.sh              (interactive)

# Require bash (not sh/dash) — script uses bash arrays and [[ ]]
if [ -z "$BASH_VERSION" ]; then
  echo "❌ This script requires bash. Run with: bash $0" >&2
  exit 1
fi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TOOLS_DIR="$SCRIPT_DIR"
GENERATED_DIR="$PROJECT_ROOT/claudeos-core/generated"

cd "$PROJECT_ROOT"

# Cleanup temp files on exit (Ctrl+C, errors, etc.)
trap 'rc=$?; rm -f "$GENERATED_DIR"/_tmp_*.md "$GENERATED_DIR"/_tmp_*.md.final 2>/dev/null; exit $rc' EXIT

# ─── Language selection (required) ──────────────────────────────
SUPPORTED_LANGS=("en" "ko" "zh-CN" "ja" "es" "vi" "hi" "ru" "fr" "de")
LANG_LABELS=("English" "한국어 (Korean)" "简体中文 (Chinese Simplified)" "日本語 (Japanese)" "Español (Spanish)" "Tiếng Việt (Vietnamese)" "हिन्दी (Hindi)" "Русский (Russian)" "Français (French)" "Deutsch (German)")

CLAUDEOS_LANG=""
CLAUDEOS_FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --lang) [ -z "$2" ] && echo "  ❌ --lang requires a value" && exit 1; CLAUDEOS_LANG="$2"; shift 2 ;;
    --lang=*) CLAUDEOS_LANG="${1#*=}"; shift ;;
    --force|-f) CLAUDEOS_FORCE=true; shift ;;
    *) echo "⚠️  Unknown argument: $1 (ignored)"; shift ;;
  esac
done

# Interactive selection if --lang not provided
if [ -z "$CLAUDEOS_LANG" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════╗"
  echo "║  Select generated document language (required)   ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo ""
  echo "  Generated files (CLAUDE.md, Standards, Rules,"
  echo "  Skills, Guides) will be written in this language."
  echo ""
  for i in "${!SUPPORTED_LANGS[@]}"; do
    printf "    %2d. %-6s — %s\n" "$((i+1))" "${SUPPORTED_LANGS[$i]}" "${LANG_LABELS[$i]}"
  done
  echo ""
  LANG_COUNT=${#SUPPORTED_LANGS[@]}
  read -rp "  Enter number (1-${LANG_COUNT}) or language code: " LANG_INPUT

  # Accept number
  if [[ "$LANG_INPUT" =~ ^[0-9]+$ ]] && [ "$LANG_INPUT" -ge 1 ] && [ "$LANG_INPUT" -le "$LANG_COUNT" ]; then
    CLAUDEOS_LANG="${SUPPORTED_LANGS[$((LANG_INPUT-1))]}"
  else
    # Accept language code
    CLAUDEOS_LANG="$LANG_INPUT"
  fi
fi

# Validate
VALID=false
for l in "${SUPPORTED_LANGS[@]}"; do
  if [ "$l" = "$CLAUDEOS_LANG" ]; then VALID=true; break; fi
done
if [ "$VALID" = false ]; then
  echo ""
  printf '  ❌ Unsupported language: "%s"\n' "$CLAUDEOS_LANG"
  echo "  Supported: ${SUPPORTED_LANGS[*]}"
  echo ""
  exit 1
fi

export CLAUDEOS_LANG
export CLAUDEOS_ROOT="$PROJECT_ROOT"

# ─── Prerequisites check ──────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo ""
  echo "  ❌ Node.js not found."
  echo "  Install: https://nodejs.org/"
  echo ""
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])" 2>/dev/null)
if ! [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] || [ "$NODE_MAJOR" -lt 18 ]; then
  echo ""
  echo "  ❌ Node.js v18+ required (current: v$(node --version))"
  echo "  Install: https://nodejs.org/"
  echo ""
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo ""
  echo "  ❌ Claude Code CLI not found."
  echo "  Install: https://code.claude.com/docs/en/overview"
  echo "  Then run: claude (and complete authentication)"
  echo ""
  exit 1
fi

## perl is no longer required — placeholder substitution now uses Node.js



echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║       ClaudeOS-Core — Bootstrap (3-Pass)          ║"
echo "╚════════════════════════════════════════════════════╝"
echo "    Project root: $PROJECT_ROOT"
# Find label for selected lang
for i in "${!SUPPORTED_LANGS[@]}"; do
  if [ "${SUPPORTED_LANGS[$i]}" = "$CLAUDEOS_LANG" ]; then
    echo "    Language:     ${LANG_LABELS[$i]} ($CLAUDEOS_LANG)"
    break
  fi
done
echo ""

# ─── [1] Install dependencies ────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[1] Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$TOOLS_DIR"
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
cd "$PROJECT_ROOT"
echo "    ✅ Done"
echo ""

# ─── [2] Create directory structure ─────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[2] Creating directory structure..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}
mkdir -p claudeos-core/generated
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}
mkdir -p claudeos-core/plan
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/database
mkdir -p claudeos-core/mcp-guide
echo "    ✅ Done"
echo ""

# ─── [3] Run plan-installer (project analysis) ────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[3] Analyzing project (plan-installer)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node "$TOOLS_DIR/plan-installer/index.js"
echo ""

# ─── Resume / Fresh selection ────────────────────────────
PASS1_EXISTING=$(ls -1 "$GENERATED_DIR"/pass1-*.json 2>/dev/null | wc -l | tr -d ' ')
PASS2_EXISTING=false
[ -f "$GENERATED_DIR/pass2-merged.json" ] && PASS2_EXISTING=true

if [ "$PASS1_EXISTING" -gt 0 ] || [ "$PASS2_EXISTING" = true ]; then
  PASS2_LABEL="✗"
  [ "$PASS2_EXISTING" = true ] && PASS2_LABEL="✓"
  if [ "$CLAUDEOS_FORCE" = true ]; then
    rm -f "$GENERATED_DIR"/pass1-*.json "$GENERATED_DIR"/pass2-merged.json
    echo "  🔄 Previous results deleted (--force)"
    echo ""
  else
    echo ""
    echo "  ⚠️  Previous analysis found (pass1: ${PASS1_EXISTING} completed, pass2: ${PASS2_LABEL})"
    echo ""
    echo "    1. Continue — Resume from where it stopped"
    echo "    2. Fresh    — Delete all and start over"
    echo ""
    read -rp "  Enter number (1-2): " RESUME_CHOICE
    if [ "$RESUME_CHOICE" = "2" ]; then
      rm -f "$GENERATED_DIR"/pass1-*.json "$GENERATED_DIR"/pass2-merged.json
      echo "  🔄 Previous results deleted"
    fi
    echo ""
  fi
fi

# ─── [4] Pass 1: Deep analysis per domain group (multi-stack) ──────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[4] Pass 1 — Deep analysis per domain group..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Read groups from domain-groups.json
TOTAL_GROUPS=$(node -e "
  const g = require(process.argv[1]);
  console.log(g.totalGroups);
" "$GENERATED_DIR/domain-groups.json")

# Validate TOTAL_GROUPS is a positive integer
if ! [[ "$TOTAL_GROUPS" =~ ^[0-9]+$ ]] || [ "$TOTAL_GROUPS" -lt 1 ]; then
  echo "    ❌ Invalid TOTAL_GROUPS: '${TOTAL_GROUPS}'. domain-groups.json may be malformed."
  exit 1
fi

for i in $(seq 1 "$TOTAL_GROUPS"); do
  DOMAIN_LIST=$(node -e "
    const g = require(process.argv[1]);
    console.log(g.groups[process.argv[2] - 1].domains.join(', '));
  " "$GENERATED_DIR/domain-groups.json" "$i")
  EST_FILES=$(node -e "
    const g = require(process.argv[1]);
    console.log(g.groups[process.argv[2] - 1].estimatedFiles);
  " "$GENERATED_DIR/domain-groups.json" "$i")
  GROUP_TYPE=$(node -e "
    const g = require(process.argv[1]);
    console.log(g.groups[process.argv[2] - 1].type || 'backend');
  " "$GENERATED_DIR/domain-groups.json" "$i")

  echo ""
  echo "    [Pass 1-${i}/${TOTAL_GROUPS}] (${GROUP_TYPE}) Analyzing: ${DOMAIN_LIST} (~${EST_FILES} files)"

  # Skip already completed passes
  if [ -f "$GENERATED_DIR/pass1-${i}.json" ]; then
    echo "    ⏭️  pass1-${i}.json already exists, skipping"
    continue
  fi

  # Select prompt by type
  PROMPT_FILE="$GENERATED_DIR/pass1-${GROUP_TYPE}-prompt.md"
  if [ ! -f "$PROMPT_FILE" ]; then
    PROMPT_FILE="$GENERATED_DIR/pass1-prompt.md"
  fi
  # Substitute placeholders via temp file (uses Node.js for safe literal replacement)
  TMP_PROMPT="$GENERATED_DIR/_tmp_pass1_prompt.md"
  cp "$PROMPT_FILE" "$TMP_PROMPT"
  export _DOMAIN_LIST="$DOMAIN_LIST"
  export _PASS_NUM="$i"
  export _PROJECT_ROOT="$PROJECT_ROOT"
  node -e "
    const fs = require('fs');
    let c = fs.readFileSync(process.argv[1], 'utf8');
    c = c.replace(/\{\{DOMAIN_GROUP\}\}/g, process.env._DOMAIN_LIST);
    c = c.replace(/\{\{PASS_NUM\}\}/g, process.env._PASS_NUM);
    c = c.replace(/\{\{PROJECT_ROOT\}\}/g, process.env._PROJECT_ROOT);
    fs.writeFileSync(process.argv[1], c);
  " "$TMP_PROMPT"

  echo "    ⏳ [Pass 1-${i}/${TOTAL_GROUPS}] Running claude -p (no output is normal, please wait)..."
  if ! (cd "$PROJECT_ROOT" && cat "$TMP_PROMPT" | claude -p --dangerously-skip-permissions); then
    rm -f "$TMP_PROMPT"
    echo "    ❌ Pass 1-${i} failed. Aborting."
    exit 1
  fi
  rm -f "$TMP_PROMPT"

  # Verify JSON was created
  if [ ! -f "$GENERATED_DIR/pass1-${i}.json" ]; then
    echo "    ❌ pass1-${i}.json was not created. Aborting."
    exit 1
  fi

  echo "    ✅ pass1-${i}.json created"
done
unset _DOMAIN_LIST _PASS_NUM _PROJECT_ROOT
echo ""

# ─── [5] Pass 2: Merge analysis results ─────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[5] Pass 2 — Merging analysis results..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$GENERATED_DIR/pass2-merged.json" ]; then
  echo "    ⏭️  pass2-merged.json already exists, skipping"
else
  TMP_PASS2="$GENERATED_DIR/_tmp_pass2_prompt.md"
  export _PROJECT_ROOT="$PROJECT_ROOT"
  node -e "
    const fs = require('fs');
    let c = fs.readFileSync(process.argv[1], 'utf8');
    c = c.replace(/\{\{PROJECT_ROOT\}\}/g, process.env._PROJECT_ROOT);
    fs.writeFileSync(process.argv[2], c);
  " "$GENERATED_DIR/pass2-prompt.md" "$TMP_PASS2"

  echo "    ⏳ [Pass 2] Running claude -p (no output is normal, please wait)..."
  if ! (cd "$PROJECT_ROOT" && cat "$TMP_PASS2" | claude -p --dangerously-skip-permissions); then
    rm -f "$TMP_PASS2"
    echo "    ❌ Pass 2 failed. Aborting."
    exit 1
  fi
  rm -f "$TMP_PASS2"

  if [ ! -f "$GENERATED_DIR/pass2-merged.json" ]; then
    echo "    ❌ pass2-merged.json was not created. Aborting."
    exit 1
  fi

  echo "    ✅ pass2-merged.json created"
fi
echo ""

# ─── [6] Pass 3: Generate + Master Plan build + verification ────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[6] Pass 3 — Generating all files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TMP_PASS3="$GENERATED_DIR/_tmp_pass3_prompt.md"
export _PROJECT_ROOT="$PROJECT_ROOT"
node -e "
  const fs = require('fs');
  let c = fs.readFileSync(process.argv[1], 'utf8');
  c = c.replace(/\{\{PROJECT_ROOT\}\}/g, process.env._PROJECT_ROOT);
  fs.writeFileSync(process.argv[2], c);
" "$GENERATED_DIR/pass3-prompt.md" "$TMP_PASS3"

echo "    ⏳ [Pass 3] Running claude -p (no output is normal, please wait)..."
if ! (cd "$PROJECT_ROOT" && cat "$TMP_PASS3" | claude -p --dangerously-skip-permissions); then
  rm -f "$TMP_PASS3"
  echo "    ❌ Pass 3 failed. Aborting."
  exit 1
fi
rm -f "$TMP_PASS3"

if [ ! -f "$PROJECT_ROOT/CLAUDE.md" ]; then
  echo "    ❌ CLAUDE.md was not created. Pass 3 may have failed silently."
  exit 1
fi
unset _PROJECT_ROOT
echo ""

# ─── [7] Run verification tools ───────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[7] Running verification tools..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$TOOLS_DIR/manifest-generator/index.js" ]; then
  echo -n "    ⏳ manifest-generator..."
  if node "$TOOLS_DIR/manifest-generator/index.js" > /dev/null 2>&1; then
    echo " ✅"
  else
    echo " ❌ (non-fatal)"
  fi
fi

if [ -f "$TOOLS_DIR/health-checker/index.js" ]; then
  echo -n "    ⏳ health-checker..."
  if node "$TOOLS_DIR/health-checker/index.js" > /dev/null 2>&1; then
    echo " ✅"
  else
    echo " ⚠️  issues found (non-fatal)"
  fi
fi
echo ""

# ─── Complete ───────────────────────────────────────────────
TOTAL_FILES=$(find .claude claudeos-core -type f 2>/dev/null | grep -v '/node_modules/' | grep -v '/generated/' | wc -l | tr -d ' ')
TOTAL_GROUPS_DONE=$TOTAL_GROUPS
PASS1_FILES=$(ls -1 "$GENERATED_DIR"/pass1-*.json 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  ✅ ClaudeOS-Core — Complete                       ║"
echo "║                                                    ║"
printf "║   Files created:     %-29s║\n" "${TOTAL_FILES}"
printf "║   Domains analyzed:  %-29s║\n" "${TOTAL_GROUPS_DONE} groups"
printf "║   Analysis passes:   %-29s║\n" "${PASS1_FILES} pass1 files"
# Find label for selected lang
LANG_LABEL="$CLAUDEOS_LANG"
for i in "${!SUPPORTED_LANGS[@]}"; do
  if [ "${SUPPORTED_LANGS[$i]}" = "$CLAUDEOS_LANG" ]; then
    LANG_LABEL="${LANG_LABELS[$i]}"; break
  fi
done
printf "║   Output language:   %-29s║\n" "${LANG_LABEL}"
echo "║                                                    ║"
echo "║   Verify anytime:                                  ║"
echo "║   npx claudeos-core health                         ║"
echo "║                                                    ║"
echo "║   Start using:                                     ║"
echo "║   \"Create a CRUD for orders\"                       ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
