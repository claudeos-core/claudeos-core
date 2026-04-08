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
| **Angular** | `package.json`, `angular.json` | 12 categories, 78 sub-items |

Auto-detected: language & version, framework & version, ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), database (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), package manager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), architecture (CQRS, BFF — from module names), multi-module structure (from settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**You don't specify anything. It's all detected automatically.**

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
- **Config fallback**: Detects Next.js/Vite/Nuxt from config files when not in `package.json` (monorepo support)
- **Deep directory fallback**: For React/CRA/Vite/Vue/RN projects, scans `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` at any depth

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

That's it. After 5–18 minutes, all documentation is generated and ready to use. The CLI shows elapsed time per pass and total time in the completion banner.

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
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

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
- `pass3-prompt.md` — generation prompt

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
# For group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# For group 2 (if exists):
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# For frontend groups, use pass1-frontend-prompt.md instead
```

**Verify:** `ls claudeos-core/generated/pass1-*.json` should show one JSON per group.

#### Step 5: Pass 2 — Merge analysis results

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verify:** `claudeos-core/generated/pass2-merged.json` should exist with 9+ top-level keys.

#### Step 6: Pass 3 — Generate all documentation

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verify:** `CLAUDE.md` should exist in your project root.

#### Step 7: Run verification tools

```bash
# Generate metadata (required before other checks)
node claudeos-core-tools/manifest-generator/index.js

# Run all checks
node claudeos-core-tools/health-checker/index.js

# Or run individual checks:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk consistency
node claudeos-core-tools/sync-checker/index.js          # Unregistered/orphaned files
node claudeos-core-tools/content-validator/index.js     # File quality checks
node claudeos-core-tools/pass-json-validator/index.js   # Pass JSON format checks
```

#### Step 8: Verify the results

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

## How It Works — 3-Pass Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Dependencies (~10s)
    ├── [2] Directory structure            ← Create folders (~1s)
    ├── [3] plan-installer (Node.js)       ← Project scan (~5s)
    │       ├── Auto-detect stack (multi-stack aware)
    │       ├── Extract domain list (tagged: backend/frontend)
    │       ├── Split into domain groups (per type)
    │       └── Select stack-specific prompts (per type)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Deep code analysis (~2-8min)
    │       ├── ⚙️ Backend groups → backend-specific prompt
    │       └── 🎨 Frontend groups → frontend-specific prompt
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Merge analysis (~1min)
    │       └── Consolidate ALL Pass 1 results (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Generate everything (~3-5min)
    │       └── Combined prompt (backend + frontend targets)
    │
    └── [7] Verification                   ← Auto-run health checker
```

### Why 3 Passes?

**Pass 1** is the only pass that reads your source code. It selects representative files per domain and extracts patterns across 55–95 analysis categories (per stack). For large projects, Pass 1 runs multiple times — one per domain group. In multi-stack projects (e.g., Java backend + React frontend), backend and frontend domains use **different analysis prompts** tailored to each stack.

**Pass 2** merges all Pass 1 results into a unified analysis: common patterns (100% shared), majority patterns (50%+ shared), domain-specific patterns, anti-patterns by severity, and cross-cutting concerns (naming, security, DB, testing, logging, performance). Backend and frontend results are merged together.

**Pass 3** takes the merged analysis and generates the entire file ecosystem. It never reads source code — only the analysis JSON. In multi-stack mode, the generation prompt combines backend and frontend targets so both sets of standards are generated in a single pass.

---

## Generated File Structure

```
your-project/
│
├── CLAUDE.md                          ← Claude Code entry point
│
├── .claude/
│   └── rules/                         ← Glob-triggered rules
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Sync reminder rules
│
├── claudeos-core/                     ← Main output directory
│   ├── generated/                     ← Analysis JSON + dynamic prompts
│   │   ├── project-analysis.json      ← Stack info (multi-stack aware)
│   │   ├── domain-groups.json         ← Groups with type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Backend analysis prompt
│   │   ├── pass1-frontend-prompt.md   ← Frontend analysis prompt (if detected)
│   │   ├── pass2-prompt.md            ← Merge prompt
│   │   └── pass3-prompt.md            ← Generation prompt (combined)
│   ├── standard/                      ← Coding standards (15-19 files)
│   │   ├── 00.core/                   ← Overview, architecture, naming
│   │   ├── 10.backend-api/            ← API patterns (stack-specific)
│   │   ├── 20.frontend-ui/            ← Frontend patterns (if detected)
│   │   ├── 30.security-db/            ← Security, DB schema, utilities
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   └── 50.verification/           ← Build verification, testing
│   ├── skills/                        ← CRUD scaffolding skills
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 files)
│   ├── plan/                          ← Master plans (backup/restore)
│   ├── database/                      ← DB schema, migration guide
│   └── mcp-guide/                     ← MCP server integration guide
│
└── claudeos-core-tools/               ← This toolkit (don't modify)
```

Every standard file includes ✅ correct examples, ❌ incorrect examples, and a rules summary table — all derived from your actual code patterns, not generic templates.

---

## Auto-scaling by Project Size

| Size | Domains | Pass 1 Runs | Total `claude -p` | Est. Time |
|---|---|---|---|---|
| Small | 1–4 | 1 | 3 | ~5min |
| Medium | 5–8 | 2 | 4 | ~8min |
| Large | 9–16 | 3–4 | 5–6 | ~12min |
| X-Large | 17+ | 5+ | 7+ | ~18min+ |

For multi-stack projects (e.g., Java + React), backend and frontend domains are counted together. A project with 6 backend + 4 frontend domains = 10 total, scaling as "Large".

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
| **manifest-generator** | Builds metadata JSON (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Compares Master Plan `<file>` blocks against disk — 3 modes: check, refresh, restore |
| **sync-checker** | Detects unregistered files (on disk but not in plan) and orphaned entries |
| **content-validator** | Validates file quality — empty files, missing ✅/❌ examples, required sections |
| **pass-json-validator** | Validates Pass 1–3 JSON structure, required keys, and section completeness |

---

## How Claude Code Uses Your Documentation

ClaudeOS-Core generates documentation that Claude Code actually reads — here's how:

### What Claude Code reads automatically

| File | When | Guaranteed |
|---|---|---|
| `CLAUDE.md` | Every conversation start | Always |
| `.claude/rules/00.core/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/10.backend/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/30.security-db/*` | When any file is edited (`paths: ["**/*"]`) | Always |
| `.claude/rules/40.infra/*` | Only when editing config/infra files (scoped paths) | Conditional |
| `.claude/rules/50.sync/*` | Only when editing claudeos-core files (scoped paths) | Conditional |

### What Claude Code reads on-demand via rule references

Each rule file links to its corresponding standard via a `## Reference` section. Claude reads only the relevant standard for the current task:

- `claudeos-core/standard/**` — coding patterns, ✅/❌ examples, naming conventions
- `claudeos-core/database/**` — DB schema (for queries, mappers, migrations)

The `00.standard-reference.md` serves as a directory of all standard files for discovering standards that have no corresponding rule.

### What Claude Code does NOT read (saves context)

These folders are explicitly excluded via the `DO NOT Read` section in the standard-reference rule:

| Folder | Why excluded |
|---|---|
| `claudeos-core/plan/` | Master Plan backups (~340KB). Use `npx claudeos-core refresh` to sync. |
| `claudeos-core/generated/` | Build metadata JSON. Not for coding. |
| `claudeos-core/guide/` | Onboarding guides for humans. |
| `claudeos-core/mcp-guide/` | MCP server docs. Not for coding. |

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
# Restore everything from Master Plan
npx claudeos-core restore
```

### CI/CD Integration

```yaml
# GitHub Actions example
- run: npx claudeos-core validate
# Exit code 1 blocks the PR
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
It calls `claude -p` 3–7 times. This is within normal Claude Code usage.

**Q: Should I commit the generated files to Git?**
Yes, recommended. Your team can share the same Claude Code standards. Consider adding `claudeos-core/generated/` to `.gitignore` (analysis JSON is regeneratable).

**Q: What about mixed-stack projects (e.g., Java backend + React frontend)?**
Fully supported. ClaudeOS-Core auto-detects both stacks, tags domains as `backend` or `frontend`, and uses stack-specific analysis prompts for each. Pass 2 merges everything, and Pass 3 generates both backend and frontend standards in one pass.

**Q: Does it work with Turborepo / pnpm workspaces / Lerna monorepos?**
Yes. ClaudeOS-Core detects `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, or `package.json#workspaces` and automatically scans sub-package `package.json` files for framework/ORM/DB dependencies. Domain scanning covers `apps/*/src/` and `packages/*/src/` patterns. Run from the monorepo root.

**Q: What happens on re-run?**
If previous Pass 1/2 results exist, an interactive prompt lets you choose: **Continue** (resume from where it stopped) or **Fresh** (delete all and start over). Use `--force` to skip the prompt and always start fresh. Pass 3 always re-runs. Previous versions can be restored from Master Plans.

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

---

## Template Structure

```
pass-prompts/templates/
├── common/                  # Shared header/footer
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` auto-detects your stack(s), then assembles type-specific prompts. NestJS and Vue/Nuxt use dedicated templates with framework-specific analysis categories (e.g., `@Module`/`@Injectable`/Guards for NestJS, `<script setup>`/Pinia/useFetch for Vue). For multi-stack projects, separate `pass1-backend-prompt.md` and `pass1-frontend-prompt.md` are generated, while `pass3-prompt.md` combines both stacks' generation targets.

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

---

## Contributing

Contributions are welcome! Areas where help is most needed:

- **New stack templates** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Monorepo deep support** — Separate sub-project roots, workspace detection
- **Test coverage** — Expanding test suite (currently 256 tests covering all scanners, stack detection, domain grouping, plan parsing, prompt generation, CLI selectors, monorepo detection, and verification tools)

---

## Author

Created by **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## License

ISC
