# ClaudeOS-Core

**The only tool that reads your source code first, confirms your stack and patterns with deterministic analysis, then generates Claude Code rules tailored to your exact project.**

```bash
npx claudeos-core init
```

ClaudeOS-Core reads your codebase, extracts every pattern it finds, and generates a complete set of Standards, Rules, Skills, and Guides tailored to _your_ project. After that, when you tell Claude Code "Create a CRUD for orders", it produces code that matches your existing patterns exactly.

[🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Why ClaudeOS-Core?

Every other Claude Code tool works like this:

> **Human describes the project → LLM generates documentation**

ClaudeOS-Core works like this:

> **Code analyzes your source → Code builds a tailored prompt → LLM generates documentation → Code verifies the output**

This is not a small difference. Here's why it matters:

### The core problem: LLMs guess. Code doesn't.

When you ask Claude to "analyze this project," it **guesses** your stack, your ORM, your domain structure.
It might see `spring-boot` in your `build.gradle` but miss that you use MyBatis (not JPA).
It might detect a `user/` directory but not realize your project uses layer-first packaging (Pattern A), not domain-first (Pattern B).

**ClaudeOS-Core doesn't guess.** Before Claude ever sees your project, Node.js code has already:

- Parsed `build.gradle` / `package.json` / `pyproject.toml` and **confirmed** your stack, ORM, DB, and package manager
- Scanned your directory structure and **confirmed** your domain list with file counts
- Classified your project structure into one of 5 Java patterns, Kotlin CQRS/BFF, or Next.js App Router/FSD
- Split domains into optimally-sized groups that fit Claude's context window
- Assembled a stack-specific prompt with all confirmed facts injected

By the time Claude receives the prompt, there's nothing left to guess. The stack is confirmed. The domains are confirmed. The structure pattern is confirmed. Claude's only job is to generate documentation that matches these **confirmed facts**.

### The result

Other tools produce "generally good" documentation.
ClaudeOS-Core produces documentation that knows your project uses `ApiResponse.ok()` (not `ResponseEntity.success()`), that your MyBatis XML mappers live in `src/main/resources/mybatis/mappers/`, and that your package structure is `com.company.module.{domain}.controller` — because it read your actual code.

### Before & After

**Without ClaudeOS-Core** — you ask Claude Code to create an Order CRUD:
```
❌ Uses JPA-style repository (your project uses MyBatis)
❌ Creates ResponseEntity.success() (your wrapper is ApiResponse.ok())
❌ Places files in order/controller/ (your project uses controller/order/)
❌ Generates English comments (your team writes Korean comments)
→ You spend 20 minutes fixing every generated file
```

**With ClaudeOS-Core** — `.claude/rules/` already contains your confirmed patterns:
```
✅ Generates MyBatis mapper + XML (detected from build.gradle)
✅ Uses ApiResponse.ok() (extracted from your actual source)
✅ Places files in controller/order/ (Pattern A confirmed by structure scan)
✅ Korean comments (--lang ko applied)
→ Generated code matches your project conventions immediately
```

This difference compounds. 10 tasks/day × 20 minutes saved = **3+ hours/day**.

---

## Post-Generation Quality Assurance (v2.3.0)

Generation is only half the problem. The other half is **knowing the output is correct** — across 10 output languages, across 11 stack templates, across projects of any size. v2.3.0 adds two deterministic validators that run after generation and do not depend on LLM self-checks:

### `claude-md-validator` — structural invariants

Every generated `CLAUDE.md` is checked against 25 structural invariants that use only language-invariant signals: markdown syntax (`^## `, `^### `), literal file names (`decision-log.md`, `failure-patterns.md` — never translated), section counts, sub-section counts per section, and table-row counts. The same validator, byte-for-byte, produces identical verdicts on a `CLAUDE.md` generated in English, Korean, Japanese, Vietnamese, Hindi, Russian, Spanish, Chinese, French, or German.

The cross-language guarantee is verified by test fixtures in all 10 languages, including bad-case fixtures in 6 of those languages that produce identical error signatures. When an invariant fails on a Vietnamese project, the fix is the same as when it fails on a German project.

### `content-validator [10/10]` — path-claim verification and MANIFEST consistency

Reads every backticked path reference (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) from all generated `.md` files and verifies them against the actual file system. Catches two classes of LLM failure that no tool detected before:

- **`STALE_PATH`** — when Pass 3 or Pass 4 fabricates a plausible-but-nonexistent path. Three canonical classes: (1) **identifier-to-filename renormalization** — inferring a filename from an ALL_CAPS TypeScript constant or Java annotation when the actual filename lives under a different convention; (2) **framework-convention entry-point invention** — assuming a stock entry-point file (Vite's main module, Next.js app-router providers, etc.) in a project that chose a different layout; (3) **plausibly-named utility invention** — citing a concrete filename for a helper that "would naturally" exist under a seen directory.
- **`MANIFEST_DRIFT`** — when `claudeos-core/skills/00.shared/MANIFEST.md` registers a skill that `CLAUDE.md §6` doesn't mention (or vice versa). Recognizes the common orchestrator + sub-skills layout where `CLAUDE.md §6` is an entry point and `MANIFEST.md` is the full registry — sub-skills are considered covered via their parent orchestrator.

The validator is paired with prompt-time prevention in `pass3-footer.md` and `pass4.md`: anti-pattern blocks documenting the specific hallucination classes (parent-directory prefix, Vite/MSW/Vitest/Jest/RTL library conventions), and explicit positive guidance to scope rules by directory when a concrete filename isn't in `pass3a-facts.md`.

### Run validation on any project

```bash
npx claudeos-core health     # all validators — single go/no-go verdict
npx claudeos-core lint       # CLAUDE.md structural invariants only (any language)
```

---

## Supported Stacks

| Stack | Detection | Analysis Depth |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 package patterns | 10 categories, 59 sub-items |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 categories, 95 sub-items |
| **Node.js / Express** | `package.json` | 9 categories, 57 sub-items |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 categories, 68 sub-items |
| **Next.js / React** | `package.json`, `next.config.*`, FSD support | 9 categories, 55 sub-items |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 categories, 58 sub-items |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 categories, 55 sub-items |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 categories, 58 sub-items |
| **Node.js / Fastify** | `package.json` | 10 categories, 62 sub-items |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 categories, 55 sub-items |
| **Angular** | `package.json`, `angular.json` | 12 categories, 78 sub-items |

Auto-detected: language & version, framework & version (including Vite as SPA framework), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), database (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), package manager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), architecture (CQRS, BFF — from module names), multi-module structure (from settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **runtime configuration from `.env.example`** (v2.2.0 — port/host/API-target across 16+ convention variable names for Vite, Next.js, Nuxt, Angular, Node, Python frameworks).

**You don't specify anything. It's all detected automatically.**

### `.env`-driven runtime configuration (v2.2.0)

v2.2.0 adds `lib/env-parser.js` so generated `CLAUDE.md` reflects what the project actually declares rather than framework defaults.

- **Search order**: `.env.example` (canonical, committed) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. The `.example` variant wins because it is the developer-neutral shape-of-truth, not one contributor's local overrides.
- **Port variable conventions recognised**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / generic `PORT`. Framework-specific names win over the generic `PORT` when both are present.
- **Host & API target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` etc.
- **Precedence**: Spring Boot `application.yml` `server.port` still wins (framework-native config), then `.env`-declared port, then framework default (Vite 5173, Next.js 3000, Django 8000, etc.) as last resort.
- **Sensitive-variable redaction**: values of variables matching `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` patterns are replaced with `***REDACTED***` before reaching any downstream generator. Defense-in-depth against accidentally committed secrets in `.env.example`. `DATABASE_URL` is explicitly whitelisted for stack-detector DB-identification back-compat.

### Java Domain Detection (5 patterns with fallback)

| Priority | Pattern | Structure | Example |
|---|---|---|---|
| A | Layer-first | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domain-first | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Module prefix | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Flat | `controller/*.java` | `controller/UserController.java` → extracts `user` from class name |

Service-only domains (without controllers) are also detected via `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` directories. Skips: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2`, etc.

### Kotlin Multi-Module Domain Detection

For Kotlin projects with Gradle multi-module structure (e.g., CQRS monorepo):

| Step | What It Does | Example |
|---|---|---|
| 1 | Scan `settings.gradle.kts` for `include()` | Finds 14 modules |
| 2 | Detect module type from name | `reservation-command-server` → type: `command` |
| 3 | Extract domain from module name | `reservation-command-server` → domain: `reservation` |
| 4 | Group same domain across modules | `reservation-command-server` + `common-query-server` → 1 domain |
| 5 | Detect architecture | Has `command` + `query` modules → CQRS |

Supported module types: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Shared libraries (`shared-lib`, `integration-lib`) are detected as special domains.

### Frontend Domain Detection

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split**: Detects `client.tsx` pattern, tracks Server/Client component separation
- **Non-standard nested paths**: Detects pages, components, and FSD layers under `src/*/` paths (e.g., `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Platform/tier-split detection (v2.0.0)**: Recognizes `src/{platform}/{subapp}/` layouts — `{platform}` can be a device/target keyword (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) or an access-tier keyword (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Emits one domain per `(platform, subapp)` pair named `{platform}-{subapp}` with per-domain counts for routes/components/layouts/hooks. Runs across Angular, Next.js, React, and Vue simultaneously (multi-extension glob `{tsx,jsx,ts,js,vue}`). Requires ≥2 source files per subapp to avoid noisy 1-file domains.
- **Monorepo platform split (v2.0.0)**: The platform scan also matches `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace with `src/`) and `{apps,packages}/{platform}/{subapp}/` (workspaces without `src/` wrapper).
- **Fallback E — routes-file (v2.0.0)**: When primary scanners + Fallbacks A–D all return 0, globs `**/routes/*.{tsx,jsx,ts,js,vue}` and groups by the parent-of-`routes` directory name. Catches React Router file-routing projects (CRA/Vite + `react-router`) that don't match Next.js `page.tsx` or FSD layouts. Generic parent names (`src`, `app`, `pages`) are filtered out.
- **Config fallback**: Detects Next.js/Vite/Nuxt from config files when not in `package.json` (monorepo support)
- **Deep directory fallback**: For React/CRA/Vite/Vue/RN projects, scans `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` at any depth
- **Shared ignore lists (v2.0.0)**: All scanners share `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) and `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`) so build outputs and test fixtures don't inflate per-domain file counts.

### Scanner Overrides (v2.0.0)

Drop an optional `.claudeos-scan.json` at your project root to extend scanner defaults without editing the toolkit. All fields are **additive** — user entries extend defaults, never replace:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Field | Default | Purpose |
|---|---|---|
| `platformKeywords` | built-in list above | Additional `{platform}` keywords for the platform scan (e.g., `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | structural dirs only | Additional subapp names to exclude from platform-scan domain emission |
| `minSubappFiles` | `2` | Override the minimum file count required before a subapp becomes a domain |

Missing file or malformed JSON → silently falls back to defaults (no crash). Typical use: opt-in a short abbreviation (`adm`, `bo`) that the built-in list excludes as too ambiguous, or raise `minSubappFiles` for noisy monorepos.

---

## Quick Start

### Prerequisites

- **Node.js** v18+
- **Claude Code CLI** (installed & authenticated)

### Installation

```bash
cd /your/project/root

# Option A: npx (recommended — no install needed)
npx claudeos-core init

# Option B: global install
npm install -g claudeos-core
claudeos-core init

# Option C: project devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# Option D: git clone (for development/contribution)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Cross-platform (PowerShell, CMD, Bash, Zsh — any terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (Bash only)
bash claudeos-core-tools/bootstrap.sh
```

### Output Language (10 languages)

When you run `init` without `--lang`, an interactive selector appears — use arrow keys or number keys to choose:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Generated files (CLAUDE.md, Standards, Rules,
  Skills, Guides) will be written in English.

  ❯  1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

The description changes to the selected language as you navigate. To skip the selector, pass `--lang` directly:

```bash
npx claudeos-core init --lang ko    # Korean
npx claudeos-core init --lang ja    # Japanese
npx claudeos-core init --lang en    # English (default)
```

> **Note:** This sets the language for generated documentation files only. Code analysis (Pass 1–2) always runs in English; generated output (Pass 3) is written in your chosen language. Code examples inside the generated files remain in their original programming language syntax.

That's it. After 10 minutes (small project) to 2 hours (60+ domain monorepo), all documentation is generated and ready to use. The CLI shows a progress bar with percentage, elapsed time, and ETA for each pass. See [Auto-scaling by Project Size](#auto-scaling-by-project-size) for detailed timing by project size.

### Manual Step-by-Step Installation

If you want full control over each phase — or if the automated pipeline fails at any step — you can run each stage manually. This is also useful for understanding how ClaudeOS-Core works internally.

#### Step 1: Clone and install dependencies

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Create directory structure

```bash
# Rules (v2.0.0: added 60.memory)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: added memory; v2.1.0: removed plan)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **v2.1.0 note:** The `claudeos-core/plan/` directory is no longer created. Master plan generation was removed because master plans were an internal backup Claude Code never reads at runtime, and aggregating them triggered `Prompt is too long` failures. Use `git` for backup/restore.

#### Step 3: Run plan-installer (project analysis)

This scans your project, detects the stack, finds domains, splits them into groups, and generates prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Output (in `claudeos-core/generated/`):**
- `project-analysis.json` — detected stack, domains, frontend info
- `domain-groups.json` — domain groups for Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — analysis prompts
- `pass2-prompt.md` — merge prompt
- `pass3-prompt.md` — Pass 3 prompt template with the Phase 1 "Read Once, Extract Facts" block prepended (Rules A–E). The automated pipeline splits Pass 3 into multiple stages at runtime; this template feeds each stage.
- `pass3-context.json` — slim project summary (< 5 KB, built after Pass 2) that Pass 3 prompts prefer over the full `pass2-merged.json` (v2.1.0)
- `pass4-prompt.md` — L4 memory scaffolding prompt (v2.0.0; uses the same `staging-override.md` for `60.memory/` rule writes)

You can inspect these files to verify detection accuracy before proceeding.

#### Step 4: Pass 1 — Deep code analysis (per domain group)

Run Pass 1 for each domain group. Check `domain-groups.json` for the number of groups.

```bash
# Check how many groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for each group (replace domains and group number)
# Note: v1.6.1+ uses Node.js String.replace() instead of perl — perl is no
# longer required, and replacement-function semantics prevent regex injection
# from $/&/$1 characters that may appear in domain names.
#
# For group 1:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# For group 2 (if exists):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# For frontend groups, swap pass1-backend-prompt.md → pass1-frontend-prompt.md
```

**Verify:** `ls claudeos-core/generated/pass1-*.json` should show one JSON per group.

#### Step 5: Pass 2 — Merge analysis results

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verify:** `claudeos-core/generated/pass2-merged.json` should exist with 9+ top-level keys.

#### Step 6: Pass 3 — Generate all documentation (split into multiple stages)

**v2.1.0 note:** Pass 3 is **always run in split mode** by the automated pipeline. Each stage is a separate `claude -p` call with a fresh context window, so output-accumulation overflow is structurally impossible regardless of project size. The `pass3-prompt.md` template is assembled per-stage with a `STAGE:` directive that tells Claude which subset of files to emit. For manual mode, the simplest path is still to feed the full template and let Claude generate everything in one call — but this is only reliable on small projects (≤5 domains). For anything larger, use `npx claudeos-core init` so the split runner handles stage orchestration.

**Single-call mode (small projects only, ≤5 domains):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Stage-by-stage mode (recommended for all project sizes):**

The automated pipeline runs these stages. The stage list is:

| Stage | Writes | Notes |
|---|---|---|
| `3a` | `pass3a-facts.md` (5–10 KB distilled fact sheet) | Reads `pass2-merged.json` once; later stages reference this file |
| `3b-core` | `CLAUDE.md`, common `standard/`, common `.claude/rules/` | Cross-project files; no domain-specific output |
| `3b-1..N` | Domain-specific `standard/60.domains/*.md` + domain rules | Batch of ≤15 domains per stage (auto-divided at ≥16 domains) |
| `3c-core` | `guide/` (9 files), `skills/00.shared/MANIFEST.md`, `skills/*/` orchestrators | Shared skills and all user-facing guides |
| `3c-1..N` | Domain sub-skills under `skills/20.frontend-page/scaffold-page-feature/` | Batch of ≤15 domains per stage |
| `3d-aux` | `database/`, `mcp-guide/` | Fixed-size, independent of domain count |

For a 1–15 domain project this expands to 4 stages (`3a`, `3b-core`, `3c-core`, `3d-aux` — no batch sub-division). For 16–30 domains it expands to 8 stages (`3b` and `3c` each sub-divided into 2 batches). See [Auto-scaling by Project Size](#auto-scaling-by-project-size) for the full table.

**Verify:** `CLAUDE.md` should exist in your project root, and `claudeos-core/generated/pass3-complete.json` marker should be written. In split mode, the marker contains `mode: "split"` and a `groupsCompleted` array listing every stage that finished — the partial-marker logic uses this to resume from the right stage after a crash rather than restarting from `3a` (which would double the token cost).

> **Staging note:** Pass 3 writes rule files to `claudeos-core/generated/.staged-rules/` first because Claude Code's sensitive-path policy blocks direct writes to `.claude/`. The automated pipeline handles the move automatically after each stage. If you run a stage manually, you'll need to move the staged tree yourself: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (preserve subpaths).

#### Step 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verify:** `claudeos-core/memory/` should contain 4 files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` should contain 4 rule files, and `CLAUDE.md` should have a `## Memory (L4)` section appended. Marker: `claudeos-core/generated/pass4-memory.json`.

> **v2.1.0 gap-fill:** Pass 4 also ensures `claudeos-core/skills/00.shared/MANIFEST.md` exists. If Pass 3c omitted it (possible on skill-sparse projects because the stack `pass3.md` templates list `MANIFEST.md` among generation targets without marking it REQUIRED), the gap-fill creates a minimal stub so that `.claude/rules/50.sync/02.skills-sync.md` (v2.2.0 path — the sync rule count was reduced from 3 to 2, so what was `03` is now `02`) always has a valid reference target. Idempotent: skips if the file already has real content (>20 chars).

> **Note:** If `claude -p` fails or `pass4-prompt.md` is missing, the automated pipeline falls back to a static scaffold via `lib/memory-scaffold.js` (with Claude-driven translation when `--lang` is non-English). The static fallback runs only inside `npx claudeos-core init` — manual mode requires Pass 4 to succeed.

#### Step 8: Run verification tools

```bash
# Generate metadata (required before other checks)
node claudeos-core-tools/manifest-generator/index.js

# Run all checks
node claudeos-core-tools/health-checker/index.js

# Or run individual checks:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk consistency
node claudeos-core-tools/sync-checker/index.js          # Unregistered/orphaned files
node claudeos-core-tools/content-validator/index.js     # File quality checks (incl. memory/ section [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Pass 1–4 JSON + completion marker checks
```

#### Step 9: Verify the results

```bash
# Count generated files
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# Check CLAUDE.md
head -30 CLAUDE.md

# Check a standard file
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Check rules
ls .claude/rules/*/
```

> **Tip:** If any step fails, you can fix the issue and re-run just that step. Pass 1/2 results are cached — if `pass1-N.json` or `pass2-merged.json` already exists, the automated pipeline skips them. Use `npx claudeos-core init --force` to delete previous results and start fresh.

### Start Using

```
# In Claude Code — just ask naturally:
"Create a CRUD for the order domain"
"Add user authentication API"
"Refactor this code to match project patterns"

# Claude Code automatically references your generated Standards, Rules, and Skills.
```

---

## How It Works — 4-Pass Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Dependencies (~10s)
    ├── [2] Directory structure                ← Create folders (~1s)
    ├── [3] plan-installer (Node.js)           ← Project scan (~5s)
    │       ├── Auto-detect stack (multi-stack aware)
    │       ├── Extract domain list (tagged: backend/frontend)
    │       ├── Split into domain groups (per type)
    │       ├── Build pass3-context.json (slim summary, v2.1.0)
    │       └── Select stack-specific prompts (per type)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Deep code analysis (~2-8min)
    │       ├── ⚙️ Backend groups → backend-specific prompt
    │       └── 🎨 Frontend groups → frontend-specific prompt
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Merge analysis (~1min)
    │       └── Consolidate ALL Pass 1 results into pass2-merged.json
    │
    ├── [6] Pass 3 (split mode, v2.1.0)        ← Generate everything
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Fact extraction (~5-10min)
    │       │       └── Read pass2-merged.json once → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + common standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← Domain standards/rules (≤15 domains/batch)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + shared skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Domain sub-skills (≤15 domains/batch)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← database/ + mcp-guide/ stubs
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30s-5min)
    │       ├── Seed memory/ (decision-log, failure-patterns, …)
    │       ├── Generate 60.memory/ rules
    │       ├── Append "Memory (L4)" section to CLAUDE.md
    │       └── Gap-fill: ensure skills/00.shared/MANIFEST.md exists (v2.1.0)
    │
    └── [8] Verification                       ← Auto-run health checker
```

### Why 4 Passes?

**Pass 1** is the only pass that reads your source code. It selects representative files per domain and extracts patterns across 55–95 analysis categories (per stack). For large projects, Pass 1 runs multiple times — one per domain group. In multi-stack projects (e.g., Java backend + React frontend), backend and frontend domains use **different analysis prompts** tailored to each stack.

**Pass 2** merges all Pass 1 results into a unified analysis: common patterns (100% shared), majority patterns (50%+ shared), domain-specific patterns, anti-patterns by severity, and cross-cutting concerns (naming, security, DB, testing, logging, performance). Backend and frontend results are merged together.

**Pass 3** (split mode, v2.1.0) takes the merged analysis and generates the entire file ecosystem (CLAUDE.md, rules, standards, skills, guides) across multiple sequential `claude -p` calls. The key insight is that output-accumulation overflow is not predictable from input size: single-call Pass 3 worked fine on 2-domain projects and reliably failed at ~5 domains, and the failure boundary shifted depending on how verbose each file happened to be. Split mode sidesteps this entirely — each stage starts with a fresh context window and writes a bounded subset of files. Cross-stage consistency (which was the main advantage of the single-call approach) is preserved by `pass3a-facts.md`, a 5–10 KB distilled fact sheet that every subsequent stage references.

The Pass 3 prompt template also includes a **Phase 1 "Read Once, Extract Facts" block** with five rules that further constrain output volume:

- **Rule A** — Reference the fact table; don't re-read `pass2-merged.json`.
- **Rule B** — Idempotent file writing (skip if target exists with real content), making Pass 3 safely re-runnable after interruption.
- **Rule C** — Cross-file consistency enforced via the fact table as single source of truth.
- **Rule D** — Output conciseness: one line (`[WRITE]`/`[SKIP]`) between file writes, no restating the fact table, no echoing file content.
- **Rule E** — Batch idempotent check: one `Glob` at PHASE 2 start instead of per-target `Read` calls.

In **v2.2.0**, Pass 3 also inlines a deterministic CLAUDE.md scaffold (`pass-prompts/templates/common/claude-md-scaffold.md`) into the prompt. This fixes the 8 top-level section titles and order so the generated `CLAUDE.md` no longer drifts across projects, while still letting per-section content adapt to each project. The stack-detector's new `.env`-parser (`lib/env-parser.js`) supplies `stack.envInfo` to the prompt so port/host/API-target rows match what the project actually declares rather than framework defaults.

**Pass 4** scaffolds the L4 Memory layer: persistent team knowledge files (decision-log, failure-patterns, compaction policy, auto-rule-update) plus the `60.memory/` rules that tell future sessions when and how to read/write those files. The memory layer is what lets Claude Code accumulate lessons across sessions instead of re-discovering them each time. When `--lang` is non-English, the fallback static content is translated via Claude before being written. v2.1.0 adds a gap-fill for `skills/00.shared/MANIFEST.md` in case Pass 3c omitted it.

---

## Generated File Structure

```
your-project/
│
├── CLAUDE.md                          ← Claude Code entry point (deterministic 8-section structure, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Glob-triggered rules
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Sync reminder rules
│       └── 60.memory/                 ← L4 memory on-demand scope rules (v2.0.0)
│
├── claudeos-core/                     ← Main output directory
│   ├── generated/                     ← Analysis JSON + dynamic prompts + Pass markers (gitignore this)
│   │   ├── project-analysis.json      ← Stack info (multi-stack aware)
│   │   ├── domain-groups.json         ← Groups with type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Backend analysis prompt
│   │   ├── pass1-frontend-prompt.md   ← Frontend analysis prompt (if detected)
│   │   ├── pass2-prompt.md            ← Merge prompt
│   │   ├── pass2-merged.json          ← Pass 2 output (consumed by Pass 3a only)
│   │   ├── pass3-context.json         ← Slim summary (< 5 KB) for Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Pass 3 prompt template (Phase 1 block prepended)
│   │   ├── pass3a-facts.md            ← Fact sheet written by Pass 3a, read by 3b/3c/3d (v2.1.0)
│   │   ├── pass4-prompt.md            ← Memory scaffolding prompt (v2.0.0)
│   │   ├── pass3-complete.json        ← Pass 3 completion marker (split mode: includes groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Pass 4 completion marker (skip on resume)
│   │   ├── rule-manifest.json         ← File index for verification tools
│   │   ├── sync-map.json              ← Plan ↔ disk mapping (empty in v2.1.0; kept for sync-checker compat)
│   │   ├── stale-report.json          ← Consolidated verification results
│   │   ├── .i18n-cache-<lang>.json    ← Translation cache (non-English `--lang`)
│   │   └── .staged-rules/             ← Transient staging dir for `.claude/rules/` writes (auto-moved + cleaned)
│   ├── standard/                      ← Coding standards (15-19 files + per-domain in 60.domains/)
│   │   ├── 00.core/                   ← Overview, architecture, naming
│   │   ├── 10.backend-api/            ← API patterns (stack-specific)
│   │   ├── 20.frontend-ui/            ← Frontend patterns (if detected)
│   │   ├── 30.security-db/            ← Security, DB schema, utilities
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Build verification, testing
│   │   ├── 60.domains/                ← Per-domain standards (written by Pass 3b-N, v2.1.0)
│   │   └── 90.optional/               ← Optional conventions (stack-specific extras)
│   ├── skills/                        ← CRUD/page scaffolding skills
│   │   └── 00.shared/MANIFEST.md      ← Single source of truth for registered skills
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 files)
│   ├── database/                      ← DB schema, migration guide
│   ├── mcp-guide/                     ← MCP server integration guide
│   └── memory/                        ← L4: team knowledge (4 files) — commit these
│       ├── decision-log.md            ← "Why" behind design decisions
│       ├── failure-patterns.md        ← Recurring errors & fixes (auto-scored — `npx claudeos-core memory score`)
│       ├── compaction.md              ← 4-stage compaction strategy (run `npx claudeos-core memory compact`)
│       └── auto-rule-update.md        ← Rule improvement proposals (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← This toolkit (don't modify)
```

Every standard file includes ✅ correct examples, ❌ incorrect examples, and a rules summary table — all derived from your actual code patterns, not generic templates.

> **v2.1.0 note:** `claudeos-core/plan/` is no longer generated. Master plans were an internal backup that Claude Code didn't consume at runtime, and aggregating them in Pass 3 was a primary cause of output-accumulation overflow. Use `git` for backup/restore instead. Projects upgrading from v2.0.x can safely delete any existing `claudeos-core/plan/` directory.

### Gitignore recommendations

**Do commit** (team knowledge — meant to be shared):
- `CLAUDE.md` — Claude Code entry point
- `.claude/rules/**` — auto-loaded rules
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — generated documentation
- `claudeos-core/memory/**` — decision history, failure patterns, rule proposals

**Do NOT commit** (regeneratable build artifacts):

```gitignore
# ClaudeOS-Core — generated analysis & translation cache
claudeos-core/generated/
```

The `generated/` directory contains analysis JSON (`pass1-*.json`, `pass2-merged.json`), prompts (`pass1/2/3/4-prompt.md`), Pass completion markers (`pass3-complete.json`, `pass4-memory.json`), translation cache (`.i18n-cache-<lang>.json`), and the transient staging directory (`.staged-rules/`) — all rebuildable by re-running `npx claudeos-core init`.

---

## Auto-scaling by Project Size

Pass 3's split mode scales stage count with domain count. The batch sub-division kicks in at 16 domains to keep each stage under ~50 files of output, which is the empirical safe range for `claude -p` before output-accumulation overflow starts.

| Project Size | Domains | Pass 3 Stages | Total `claude -p` | Est. Time |
|---|---|---|---|---|
| Small | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 stages of Pass 3 + Pass 4) | ~10–15 min |
| Medium | 5–15 | 4 | 8–9 | ~25–45 min |
| Large | 16–30 | **8** (3b, 3c each split into 2 batches) | 11–12 | **~60–105 min** |
| X-Large | 31–45 | 10 | 13–14 | ~100–150 min |
| XX-Large | 46–60 | 12 | 15–16 | ~150–200 min |
| XXX-Large | 61+ | 14+ | 17+ | 200 min+ |

Stage count formula (when batched): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, where `N = ceil(totalDomains / 15)`.

Pass 4 (memory scaffolding) adds ~30 seconds to 5 minutes on top depending on whether Claude-driven generation or static fallback runs. For multi-stack projects (e.g., Java + React), backend and frontend domains are counted together. A project with 6 backend + 4 frontend domains = 10 total = Medium tier.

---

## Verification Tools

ClaudeOS-Core includes 5 built-in verification tools that run automatically after generation:

```bash
# Run all checks at once (recommended)
npx claudeos-core health

# Individual commands
npx claudeos-core validate     # Plan ↔ disk comparison
npx claudeos-core refresh      # Disk → Plan sync
npx claudeos-core restore      # Plan → Disk restore

# Or use node directly (git clone users)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Tool | What It Does |
|---|---|
| **manifest-generator** | Builds metadata JSON (`rule-manifest.json`, `sync-map.json`, initializes `stale-report.json`); indexes 7 directories including `memory/` (`totalMemory` in summary). v2.1.0: `plan-manifest.json` is no longer generated since master plans were removed. |
| **plan-validator** | Validates master plan `<file>` blocks against disk for projects that still have `claudeos-core/plan/` (legacy upgrade case). v2.1.0: skips `plan-sync-status.json` emission when `plan/` is absent or empty — `stale-report.json` still records a passing no-op. |
| **sync-checker** | Detects unregistered files (on disk but not in plan) and orphaned entries — covers 7 directories (added `memory/` in v2.0.0). Exits cleanly when `sync-map.json` has no mappings (v2.1.0 default state). |
| **content-validator** | 10-check quality gate. Checks 1–9 cover empty files, missing ✅/❌ examples, required sections, and L4 memory scaffold integrity (decision-log heading dates, failure-pattern required fields, fence-aware parsing). **Check 10 (v2.3.0)** adds path-claim verification across all generated `.md` files and MANIFEST ↔ CLAUDE.md §6 cross-reference — catches `STALE_PATH` (LLM-fabricated paths from identifier-to-filename renormalization, framework-convention entry-point invention, or plausibly-named utility invention) and `MANIFEST_DRIFT` (registered skills not mentioned in CLAUDE.md or vice versa), with an orchestrator/sub-skill exception that recognizes the canonical "§6 entry point + MANIFEST registry" split. |
| **claude-md-validator (v2.3.0)** | Structural invariant check on `CLAUDE.md` using only language-invariant signals (markdown syntax, literal file names, section/sub-section/table-row counts). 25 checks, language-agnostic — identical verdicts across all 10 output languages. Invoked via `npx claudeos-core lint`. |
| **pass-json-validator** | Validates Pass 1–4 JSON structure plus the `pass3-complete.json` (split-mode shape, v2.1.0) and `pass4-memory.json` completion markers |

---

## How Claude Code Uses Your Documentation

ClaudeOS-Core generates documentation that Claude Code actually reads — here's how:

### What Claude Code reads automatically

| File | When | Guaranteed |
|---|---|---|
| `CLAUDE.md` | Every conversation start | Always |
| `.claude/rules/00.core/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/10.backend/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/20.frontend/*` | When any frontend file is edited (scoped to component/page/style paths) | Conditional |
| `.claude/rules/30.security-db/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/40.infra/*` | Only when editing config/infra files (scoped paths) | Conditional |
| `.claude/rules/50.sync/*` | Only when editing claudeos-core files (scoped paths) | Conditional |
| `.claude/rules/60.memory/*` | When `claudeos-core/memory/*` is edited (scoped to memory paths) — instructs **how** to read/write the on-demand memory layer | Conditional (v2.0.0) |

### What Claude Code reads on-demand via rule references

Each rule file links to its corresponding standard via a `## Reference` section. Claude reads only the relevant standard for the current task:

- `claudeos-core/standard/**` — coding patterns, ✅/❌ examples, naming conventions
- `claudeos-core/database/**` — DB schema (for queries, mappers, migrations)
- `claudeos-core/memory/**` (v2.0.0) — L4 team knowledge layer; **not** auto-loaded (would be too noisy on every conversation). Instead, the `60.memory/*` rules tell Claude *when* to Read these files: at session start (skim recent `decision-log.md` + high-importance `failure-patterns.md`), and append-on-demand when making decisions or hitting recurring errors.

The `00.standard-reference.md` serves as a directory of all standard files for discovering standards that have no corresponding rule.

### What Claude Code does NOT read (saves context)

These folders are explicitly excluded via the `DO NOT Read` section in the standard-reference rule:

| Folder | Why excluded |
|---|---|
| `claudeos-core/plan/` | Master plan backups from legacy projects (v2.0.x and earlier). Not generated in v2.1.0. If present, Claude Code won't load it automatically — read-on-demand only. |
| `claudeos-core/generated/` | Build metadata JSON, prompts, Pass markers, translation cache, `.staged-rules/`. Not for coding. |
| `claudeos-core/guide/` | Onboarding guides for humans. |
| `claudeos-core/mcp-guide/` | MCP server docs. Not for coding. |
| `claudeos-core/memory/` (auto-load) | **Auto-load disabled** by design — would balloon context on every conversation. Read on-demand via the `60.memory/*` rules instead (e.g. session-start scan of `failure-patterns.md`). Always commit these files. |

---

## Daily Workflow

### After Installation

```
# Just use Claude Code as normal — it references your standards automatically:
"Create a CRUD for the order domain"
"Add user profile update API"
"Refactor this code to match project patterns"
```

### After Manually Editing Standards

```bash
# After editing standards or rules files:
npx claudeos-core refresh

# Verify everything is consistent
npx claudeos-core health
```

### When Docs Get Corrupted

```bash
# v2.1.0 recommendation: use git to restore (since master plans are no
# longer generated). Commit your generated docs regularly so you can roll
# back specific files without regenerating:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (v2.0.x projects with claudeos-core/plan/ still present):
npx claudeos-core restore
```

### Memory Layer Maintenance (v2.0.0)

The L4 Memory layer (`claudeos-core/memory/`) accumulates team knowledge across sessions. Three CLI subcommands keep it healthy:

```bash
# Compact: enforce 4-stage compaction policy (run periodically — e.g. monthly)
npx claudeos-core memory compact
#   Stage 1: summarize aged entries (>30 days, body → one-line)
#   Stage 2: merge duplicate headings (frequency summed, latest fix kept)
#   Stage 3: drop low-importance + aged (importance <3 AND lastSeen >60 days)
#   Stage 4: enforce 400-line cap per file (oldest low-importance dropped first)

# Score: re-rank failure-patterns.md entries by importance
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), capped at 10
#   Run after appending several new failure patterns

# Propose-rules: surface candidate rule additions from recurring failures
npx claudeos-core memory propose-rules
#   Reads failure-patterns.md entries with frequency ≥ 3
#   Computes confidence (sigmoid on weighted evidence × anchor multiplier)
#   Writes proposals to memory/auto-rule-update.md (NOT auto-applied)
#   Confidence ≥ 0.70 deserves serious review; accept → edit rule + log decision

# v2.1.0: `memory --help` now routes to subcommand help (was showing top-level)
npx claudeos-core memory --help
```

> **v2.1.0 fixes:** `memory score` no longer leaves duplicate `importance` lines after the first run (previously the auto-scored line was added on top while the original plain line was left below). `memory compact`'s Stage 1 summary marker is now a proper markdown list item (`- _Summarized on ..._`) so it renders cleanly and is correctly re-parsed on subsequent compactions.

When to write to memory (Claude does this on-demand, but you can edit manually too):
- **`decision-log.md`** — append a new entry whenever you choose between competing patterns, select a library, define a team convention, or decide NOT to do something. Append-only; never edit historical entries.
- **`failure-patterns.md`** — append on the **second occurrence** of a recurring error or non-obvious root cause. First-time errors don't need an entry.
- `compaction.md` and `auto-rule-update.md` — generated/managed by the CLI subcommands above; don't edit by hand.

### CI/CD Integration

```yaml
# GitHub Actions example
- run: npx claudeos-core validate
# Exit code 1 blocks the PR

# Optional: monthly memory housekeeping (separate cron workflow)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## How Is This Different?

### vs Other Claude Code Tools

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Persistent memory layer** | ✅ L4 — decision log + failure patterns + auto-scored rule proposals (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### The key difference in one sentence

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

That's why Claude Code stops generating JPA code in your MyBatis project,
stops using `success()` when your codebase uses `ok()`,
and stops creating `user/controller/` directories when your project uses `controller/user/`.

### Complementary, not competing

ClaudeOS-Core focuses on **project-specific rules and standards**.
Other tools focus on **agent orchestration and workflows**.

You can use ClaudeOS-Core to generate your project's rules, then use ECC or Harness on top for agent teams and workflow automation. They solve different problems.

---

## FAQ

**Q: Does it modify my source code?**
No. It only creates `CLAUDE.md`, `.claude/rules/`, and `claudeos-core/`. Your existing code is never modified.

**Q: How much does it cost?**
It calls `claude -p` several times across 4 passes. In v2.1.0 split mode, Pass 3 alone expands into 4–14+ stages depending on project size (see [Auto-scaling](#auto-scaling-by-project-size)). A typical small project (1–15 domains) uses 8–9 `claude -p` calls total; an 18-domain project uses 11; a 60-domain project uses 15–17. Each stage runs with a fresh context window — the per-call token cost is actually lower than single-call Pass 3 was, because no stage has to hold the entire file tree in one context. When `--lang` is non-English, the static fallback path may invoke a few additional `claude -p` calls for translation; results are cached in `claudeos-core/generated/.i18n-cache-<lang>.json` so subsequent runs reuse them. This is within normal Claude Code usage.

**Q: What is Pass 3 split mode and why was it added in v2.1.0?**
Before v2.1.0, Pass 3 made a single `claude -p` call that had to emit the entire generated file tree (`CLAUDE.md`, standards, rules, skills, guides — typically 30–60 files) in one response. This worked on small projects but reliably hit `Prompt is too long` output-accumulation failures at ~5 domains. The failure was not predictable from input size — it depended on how verbose each generated file happened to be, and could strike the same project intermittently. Split mode sidesteps the problem structurally: Pass 3 is broken into sequential stages (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), each a separate `claude -p` call with a fresh context window. Cross-stage consistency is preserved by `pass3a-facts.md`, a 5–10 KB distilled fact sheet that every later stage references instead of re-reading `pass2-merged.json`. The `pass3-complete.json` marker carries a `groupsCompleted` array so a crash during `3c-2` resumes from `3c-2` (not from `3a`), avoiding double token cost.
**Q: Should I commit the generated files to Git?**
Yes, recommended. Your team can share the same Claude Code standards. Consider adding `claudeos-core/generated/` to `.gitignore` (analysis JSON is regeneratable).

**Q: What about mixed-stack projects (e.g., Java backend + React frontend)?**
Fully supported. ClaudeOS-Core auto-detects both stacks, tags domains as `backend` or `frontend`, and uses stack-specific analysis prompts for each. Pass 2 merges everything, and Pass 3 generates both backend and frontend standards across its split stages — backend domains go into some 3b/3c batches, frontend domains into others, all referencing the same `pass3a-facts.md` for consistency.

**Q: Does it work with Turborepo / pnpm workspaces / Lerna monorepos?**
Yes. ClaudeOS-Core detects `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, or `package.json#workspaces` and automatically scans sub-package `package.json` files for framework/ORM/DB dependencies. Domain scanning covers `apps/*/src/` and `packages/*/src/` patterns. Run from the monorepo root.

**Q: What happens on re-run?**
If previous Pass 1/2 results exist, an interactive prompt lets you choose: **Continue** (resume from where it stopped) or **Fresh** (delete all and start over). Use `--force` to skip the prompt and always start fresh. In v2.1.0 split mode, Pass 3 resume works at stage granularity — if the run crashed during `3c-2`, the next `init` resumes from `3c-2` rather than restarting from `3a` (which would double the token cost). The `pass3-complete.json` marker records `mode: "split"` plus a `groupsCompleted` array to drive this logic.

**Q: Does NestJS get its own template or use the Express one?**
NestJS uses a dedicated `node-nestjs` template with NestJS-specific analysis categories: `@Module`, `@Injectable`, `@Controller` decorators, Guards, Pipes, Interceptors, DI container, CQRS patterns, and `Test.createTestingModule`. Express projects use the separate `node-express` template.

**Q: What about Vue / Nuxt projects?**
Vue/Nuxt uses a dedicated `vue-nuxt` template covering Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, Nitro server routes, and `@nuxt/test-utils`. Next.js/React projects use the `node-nextjs` template.

**Q: Does it support Kotlin?**
Yes. ClaudeOS-Core auto-detects Kotlin from `build.gradle.kts` or the kotlin plugin in `build.gradle`. It uses a dedicated `kotlin-spring` template with Kotlin-specific analysis (data classes, sealed classes, coroutines, extension functions, MockK, etc.).

**Q: What about CQRS / BFF architecture?**
Fully supported for Kotlin multi-module projects. ClaudeOS-Core reads `settings.gradle.kts`, detects module types (command, query, bff, integration) from module names, and groups the same domain across Command/Query modules. The generated standards include separate rules for command controllers vs query controllers, BFF/Feign patterns, and inter-module communication conventions.

**Q: What about Gradle multi-module monorepos?**
ClaudeOS-Core scans all submodules (`**/src/main/kotlin/**/*.kt`) regardless of nesting depth. Module types are inferred from naming conventions (e.g., `reservation-command-server` → domain: `reservation`, type: `command`). Shared libraries (`shared-lib`, `integration-lib`) are also detected.

**Q: What is the L4 Memory layer (v2.0.0)? Should I commit `claudeos-core/memory/`?**
Yes — **always commit** `claudeos-core/memory/`. It's persistent team knowledge: `decision-log.md` records the *why* behind architectural choices (append-only), `failure-patterns.md` registers recurring errors with importance scores so future sessions avoid them, `compaction.md` defines the 4-stage compaction policy, and `auto-rule-update.md` collects machine-generated rule improvement proposals. Unlike rules (auto-loaded by path), memory files are **on-demand** — Claude reads them only when the `60.memory/*` rules direct it to (e.g. session-start scan of high-importance failures). This keeps context cost low while preserving long-term knowledge.

**Q: What if Pass 4 fails?**
The automated pipeline (`npx claudeos-core init`) has a static fallback: if `claude -p` fails or `pass4-prompt.md` is missing, it scaffolds the memory layer directly via `lib/memory-scaffold.js`. When `--lang` is non-English, the static fallback **must** translate via the `claude` CLI — if that fails too, the run aborts with `InitError` (no silent English fallback). Re-run when `claude` is authenticated, or use `--lang en` to skip translation. Translation results are cached in `claudeos-core/generated/.i18n-cache-<lang>.json` so subsequent runs reuse them.

**Q: What do `memory compact` / `memory score` / `memory propose-rules` do?**
See the [Memory Layer Maintenance](#memory-layer-maintenance-v200) section above. Short version: `compact` runs the 4-stage policy (summarize aged, merge duplicates, drop low-importance aged, enforce 400-line cap); `score` re-ranks `failure-patterns.md` by importance (frequency × recency); `propose-rules` surfaces candidate rule additions from recurring failures into `auto-rule-update.md` (not auto-applied — review and accept/reject manually).

**Q: Why does `--force` (or "fresh" resume mode) delete `.claude/rules/`?**
v2.0.0 added three Pass 3 silent-failure guards (Guard 3 covers two incomplete-output variants: H2 for `guide/` and H1 for `standard/skills`). Guard 1 ("partial staged-rules move") and Guard 3 ("incomplete output — missing/empty guide files or missing standard sentinel / empty skills") don't depend on existing rules, but Guard 2 ("zero rules detected") does — it fires when Claude ignored the `staging-override.md` directive and tried to write directly to `.claude/` (where Claude Code's sensitive-path policy blocks it). Stale rules from a prior run would let Guard 2 false-negative — so `--force`/`fresh` wipes `.claude/rules/` to ensure a clean detection. **Manual edits to rule files will be lost** under `--force`/`fresh`; back them up first if needed. (v2.1.0 note: Guard 3 H1 no longer checks `plan/` since master plans are no longer generated.)

**Q: What is `claudeos-core/generated/.staged-rules/` and why does it exist?**
Claude Code's sensitive-path policy refuses direct writes to `.claude/` from the `claude -p` subprocess (even with `--dangerously-skip-permissions`). v2.0.0 works around this by having Pass 3/4 prompts redirect all `.claude/rules/` writes to the staging directory; the Node.js orchestrator (not subject to that policy) then moves the staged tree into `.claude/rules/` after each pass. This is transparent to the user — the directory is auto-created, auto-cleaned, and auto-moved. If a prior run crashed mid-move, the next run wipes the staging dir before retrying. In v2.1.0 split mode, the stage runner moves staged rules to `.claude/rules/` after every stage (not just at the end), so a crash mid-Pass-3 still leaves previously completed stages' rules in place.

**Q: Can I run Pass 3 manually instead of `npx claudeos-core init`?**
Yes for small projects (≤5 domains) — the single-call manual instructions in [Step 6](#step-6-pass-3--generate-all-documentation-split-into-multiple-stages) still work. For larger projects you should use `npx claudeos-core init` because the split runner is what orchestrates stage-by-stage execution with fresh contexts, handles batch sub-division at ≥16 domains, writes the correct `pass3-complete.json` marker shape (`mode: "split"` + `groupsCompleted`), and moves staged rules between stages. Reproducing that orchestration by hand is possible but tedious. If you have a reason to run stages manually (e.g., debugging a specific stage), you can template `pass3-prompt.md` with the appropriate `STAGE:` directive and feed it to `claude -p` directly — but remember to move `.staged-rules/` after each stage and update the marker yourself.

**Q: My project is an upgrade from v2.0.x and has an existing `claudeos-core/plan/` directory. What do I do?**
Nothing required — v2.1.0 tools ignore `plan/` when it's absent or empty, and `plan-validator` still handles legacy projects with populated `plan/` directories for backward compatibility. You can safely delete `claudeos-core/plan/` if you don't need the master plan backups (git history is a better backup anyway). If you keep `plan/`, running `npx claudeos-core init` won't update it — new content is not aggregated into master plans in v2.1.0. Verification tools handle both cases cleanly.

---

## Template Structure

```
pass-prompts/templates/
├── common/                  # Shared header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Role + output-format directive (all passes)
│   ├── pass3-footer.md       # Post-Pass-3 health-check instruction + 5 CRITICAL guardrail blocks (v2.2.0)
│   ├── pass3-phase1.md       # "Read Once, Extract Facts" block with Rules A-E (v2.1.0)
│   ├── pass4.md              # Memory scaffolding prompt (v2.0.0)
│   ├── staging-override.md   # Redirects .claude/rules/** writes to .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # Deterministic 8-section CLAUDE.md template (v2.2.0)
│   └── lang-instructions.json # Per-language output directives (10 languages)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` auto-detects your stack(s), then assembles type-specific prompts. NestJS, Vue/Nuxt, Vite SPA, and Flask each use dedicated templates with framework-specific analysis categories (e.g., `@Module`/`@Injectable`/Guards for NestJS; `<script setup>`/Pinia/useFetch for Vue; client-side routing/`VITE_` env for Vite; Blueprint/`app.factory`/Flask-SQLAlchemy for Flask). For multi-stack projects, separate `pass1-backend-prompt.md` and `pass1-frontend-prompt.md` are generated, while `pass3-prompt.md` combines both stacks' generation targets. In v2.1.0, the Pass 3 template is prepended with `common/pass3-phase1.md` (the "Read Once, Extract Facts" block with Rules A–E) before being sliced per split-mode stage. Pass 4 uses the shared `common/pass4.md` template (memory scaffolding) regardless of stack.

**In v2.2.0**, the Pass 3 prompt also inlines `common/claude-md-scaffold.md` (the deterministic 8-section CLAUDE.md template) between the phase1 block and the stack-specific body — this fixes the section structure so generated CLAUDE.md files don't drift across projects while letting content adapt per-project. Templates are written **English-first**; the language injection from `lang-instructions.json` tells the LLM to translate section titles and prose at emit time into the target output language.

---

## Monorepo Support

ClaudeOS-Core automatically detects JS/TS monorepo setups and scans sub-packages for dependencies.

**Supported monorepo markers** (auto-detected):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Run from the monorepo root** — ClaudeOS-Core reads `apps/*/package.json` and `packages/*/package.json` to discover framework/ORM/DB dependencies across sub-packages:

```bash
cd my-monorepo
npx claudeos-core init
```

**What gets detected:**
- Dependencies from `apps/web/package.json` (e.g., `next`, `react`) → frontend stack
- Dependencies from `apps/api/package.json` (e.g., `express`, `prisma`) → backend stack
- Dependencies from `packages/db/package.json` (e.g., `drizzle-orm`) → ORM/DB
- Custom workspace paths from `pnpm-workspace.yaml` (e.g., `services/*`)

**Domain scanning also covers monorepo layouts:**
- `apps/api/src/modules/*/` and `apps/api/src/*/` for backend domains
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` for frontend domains
- `packages/*/src/*/` for shared package domains

```
my-monorepo/                    ← Run here: npx claudeos-core init
├── turbo.json                  ← Auto-detected as Turborepo
├── apps/
│   ├── web/                    ← Next.js detected from apps/web/package.json
│   │   ├── app/dashboard/      ← Frontend domain detected
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express detected from apps/api/package.json
│       ├── src/modules/users/  ← Backend domain detected
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle detected from packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Note:** For Kotlin/Java monorepos, multi-module detection uses `settings.gradle.kts` (see [Kotlin Multi-Module Detection](#kotlin-multi-module-domain-detection) above) and does not require JS monorepo markers.

## Troubleshooting

**"claude: command not found"** — Claude Code CLI is not installed or not in PATH. See [Claude Code docs](https://code.claude.com/docs/en/overview).

**"npm install failed"** — Node.js version may be too low. Requires v18+.

**"0 domains detected"** — Your project structure may be non-standard. See the detection patterns above for your stack.

**"0 domains detected" on Kotlin project** — Ensure your project has `build.gradle.kts` (or `build.gradle` with kotlin plugin) at the root, and source files are under `**/src/main/kotlin/`. For multi-module projects, ensure `settings.gradle.kts` contains `include()` statements. Single-module Kotlin projects (without `settings.gradle`) are also supported — domains are extracted from package/class structure under `src/main/kotlin/`.

**"Language detected as java instead of kotlin"** — ClaudeOS-Core checks the root `build.gradle(.kts)` first, then submodule build files. If the root build file uses `java` plugin without `kotlin`, but submodules use Kotlin, the tool checks up to 5 submodule build files as fallback. If still not detected, ensure at least one `build.gradle.kts` contains `kotlin("jvm")` or `org.jetbrains.kotlin`.

**"CQRS not detected"** — Architecture detection relies on module names containing `command` and `query` keywords. If your modules use different naming (e.g., `write-server`, `read-server`), the CQRS architecture won't be auto-detected. You can manually adjust the generated prompts after plan-installer runs.

**"Pass 3 produced 0 rule files under .claude/rules/" (v2.0.0)** — Guard 2 fired: Claude ignored the `staging-override.md` directive and tried to write directly to `.claude/`, where Claude Code's sensitive-path policy blocks writes. Re-run with `npx claudeos-core init --force`. If the error persists, inspect `claudeos-core/generated/pass3-prompt.md` to verify the `staging-override.md` block is at the top.

**"Pass 3 finished but N rule file(s) could not be moved from staging" (v2.0.0)** — Guard 1 fired: the staging move hit a transient file lock (typically Windows antivirus or file-watcher). The marker is NOT written, so the next `init` run automatically retries Pass 3. Just re-run `npx claudeos-core init`.

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty" (v2.0.0)** — Guard 3 (H2) fired: Claude truncated mid-response after writing CLAUDE.md + rules but before finishing (or starting) the `claudeos-core/guide/` section (9 files expected). Also fires on a BOM-only or whitespace-only file (heading was written but the body was truncated). Without this guard the completion marker would still be written, leaving `guide/` permanently empty on subsequent runs. The marker is NOT written here, so the next `init` run retries Pass 3 from the same Pass 2 results. If it keeps repeating, re-run with `npx claudeos-core init --force` to regenerate from scratch.

**"Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0, updated v2.1.0)** — Guard 3 (H1) fired: Claude truncated AFTER `claudeos-core/guide/` but before (or during) `claudeos-core/standard/` or `claudeos-core/skills/`. Requirements: (a) `standard/00.core/01.project-overview.md` exists and is non-empty (sentinel written by every stack's Pass 3 prompt), (b) `skills/` has ≥1 non-empty `.md`. `database/` and `mcp-guide/` are intentionally excluded (some stacks legitimately produce zero files). `plan/` is no longer checked as of v2.1.0 (master plans were removed). Same recovery path as Guard 3 (H2): re-run `init`, or `--force` if it persists.

**"Pass 3 split stage crashed partway through (v2.1.0)"** — When one of the split stages (e.g., `3b-1`, `3c-2`) fails mid-run, the stage-level marker is NOT written, but completed stages ARE recorded in `pass3-complete.json.groupsCompleted`. The next `init` run reads this array and resumes from the first uncompleted stage, skipping all earlier completed work. You don't need to do anything manually — just re-run `npx claudeos-core init`. If resume keeps failing at the same stage, inspect `claudeos-core/generated/pass3-prompt.md` for malformed content, then try `--force` for a full restart. The `pass3-complete.json` shape (`mode: "split"`, `groupsCompleted: [...]`) is stable; a missing or malformed marker causes the full Pass 3 to re-run from `3a`.

**"Pass 3 stale marker (shape mismatch) — treating as incomplete" (v2.1.0)** — A `pass3-complete.json` from a pre-v2.1.0 single-call run is being interpreted under the new split-mode rules. The shape check looks for `mode: "split"` and a `groupsCompleted` array; if either is missing, the marker is treated as partial and Pass 3 re-runs in split mode. If you upgraded from v2.0.x, this is expected once — the next run will write the correct marker shape. No action needed.

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Info log, not an error. On resume, `init` now parses and validates `pass2-merged.json` (≥5 top-level keys required, mirroring `pass-json-validator`'s `INSUFFICIENT_KEYS` threshold). Skeleton `{}` or malformed JSON from a prior crashed run is automatically deleted and Pass 2 re-runs. No manual action needed — the pipeline self-heals. If it keeps recurring, inspect `claudeos-core/generated/pass2-prompt.md` and retry with `--force`.

**"Static fallback failed while translating to lang='ko'" (v2.0.0)** — When `--lang` is non-English, Pass 4 / static fallback / gap-fill all require `claude` CLI to translate. If translation fails (CLI not authenticated, network timeout, or strict validation rejected the output: <40% length, broken code fences, lost frontmatter, etc.), the run aborts rather than silently writing English. Fix: ensure `claude` is authenticated, or re-run with `--lang en` to skip translation.

**"pass4-memory.json exists but memory/ is empty" (v2.0.0)** — A previous run wrote the marker but the user (or a cleanup script) deleted `claudeos-core/memory/`. The CLI auto-detects this stale marker and re-runs Pass 4 on the next `init`. No manual action needed.

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Info log, not an error. The Pass 4 marker content is now validated (`passNum === 4` + non-empty `memoryFiles` array), not just its existence. A partial Claude failure that emitted something like `{"error":"timeout"}` as the marker body would previously be accepted as success forever; now the marker is deleted and Pass 4 re-runs automatically.

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` detected a stale marker (Pass 3: CLAUDE.md was externally deleted; Pass 4: memory/ empty or marker body malformed) and tried to remove it, but the `unlinkSync` call failed — typically because Windows antivirus or a file-watcher (editor, IDE indexer) is holding the file handle. Previously this was silently ignored, causing the pipeline to skip the pass and re-use the stale marker. Now it fails loudly. Fix: close any editor/AV scanner that might have the file open, then re-run `npx claudeos-core init`.

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — You have the test-only env var `CLAUDEOS_SKIP_TRANSLATION=1` set in your shell (likely a leftover from CI/test setup) AND picked a non-English `--lang`. This env var short-circuits the translation path that Pass 4's static-fallback and gap-fill depend on for non-English output. `init` detects the conflict at language-selection time and aborts immediately (rather than crashing mid-Pass-4 with a confusing nested error). Fix: either `unset CLAUDEOS_SKIP_TRANSLATION` before running, or use `npx claudeos-core init --lang en`.

**"⚠️ v2.2.0 upgrade detected" warning (v2.2.0)** — Your existing `CLAUDE.md` was generated with a pre-v2.2.0 version. The default resume-mode regeneration will skip existing files under Rule B idempotency, so v2.2.0's structural improvements (8-section CLAUDE.md scaffold, per-file `40.infra/*` paths, `.env.example`-based port accuracy, Section 8 redesign into `Common Rules & Memory (L4)` with two sub-sections, `60.memory/*` rule row, forward-referenced `04.doc-writing-guide.md`) would NOT be applied. Fix: re-run with `npx claudeos-core init --force` — this overwrites generated files (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) while preserving `claudeos-core/memory/` content (decision-log, failure-patterns entries you've accumulated are append-only and kept intact). Commit your project first if you want to diff the overwrites before accepting them.

**Port in CLAUDE.md differs from `.env.example` (v2.2.0)** — The stack-detector's new `.env`-parser (`lib/env-parser.js`) reads `.env.example` first (canonical, committed), then `.env` variants as fallback. Port variables it recognizes include `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT`, etc. For Spring Boot, `application.yml`'s `server.port` still takes precedence over `.env` (framework-native config wins). If your project uses an unusual env var name, either rename it to a recognized convention or raise an issue for us to extend `PORT_VAR_KEYS`. Framework defaults (Vite 5173, Next.js 3000, Django 8000) are used only when both direct detection and `.env` are silent.

**Secret values redacted as `***REDACTED***` in generated docs (v2.2.0)** — Expected behavior. The v2.2.0 `.env`-parser automatically redacts values of variables matching `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` patterns before they reach any generator. This is defense-in-depth against accidentally committed secrets in `.env.example`. `DATABASE_URL` is kept as-is for stack-detector DB identification back-compat. If you see `***REDACTED***` somewhere in the generated `CLAUDE.md`, that's a bug — redacted values should never reach the table; please file an issue. Non-sensitive runtime config (port, host, API target, NODE_ENV, etc.) pass through unchanged.

---

## Contributing

Contributions are welcome! Areas where help is most needed:

- **New stack templates** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **IDE integration** — VS Code extension, IntelliJ plugin
- **CI/CD templates** — GitLab CI, CircleCI, Jenkins examples (GitHub Actions already shipped — see `.github/workflows/test.yml`)
- **Test coverage** — Expanding test suite (currently 602 tests across 30 test files covering scanners, stack detection, domain grouping, plan parsing, prompt generation, CLI selectors, monorepo detection, Vite SPA detection, verification tools, L4 memory scaffold, Pass 2 resume validation, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + strict stale-marker unlink), Pass 3 split-mode batch subdivision, Pass 3 partial-marker resume (v2.1.0), Pass 4 marker content validation + stale-marker unlink strictness + scaffoldSkillsManifest gap-fill (v2.1.0), translation env-skip guard + early fail-fast + CI workflow, staged-rules move, lang-aware translation fallback, master plan removal regression suite (v2.1.0), memory score/compact formatting regression (v2.1.0), AI Work Rules template structure, and `.env`-parser port/host/API-target extraction + sensitive-variable redaction (v2.2.0))

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full list of areas, code style, commit convention, and the step-by-step guide for adding a new stack template.

---

## Author

Created by **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## License

ISC
