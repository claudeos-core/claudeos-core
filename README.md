# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Auto-generate Claude Code documentation from your actual source code.** A CLI tool that statically analyzes your project, then runs a 4-pass Claude pipeline to generate `.claude/rules/`, standards, skills, and guides — so Claude Code follows your project's conventions, not generic ones.

```bash
npx claudeos-core init
```

[🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## What is this?

You use Claude Code. It's smart, but it doesn't know **your project's conventions**:
- Your team uses MyBatis, but Claude generates JPA code.
- Your wrapper is `ApiResponse.ok()`, but Claude writes `ResponseEntity.success()`.
- Your packages are `controller/order/`, but Claude creates `order/controller/`.

So you spend a chunk of time fixing every generated file.

**ClaudeOS-Core fixes this.** It scans your actual source code, figures out your conventions, and writes a complete set of rules into `.claude/rules/` — the directory Claude Code reads automatically. Next time you say *"Create a CRUD for orders"*, Claude follows your conventions on the first try.

```
Before:  You → Claude Code → "generally good" code → manual fixing
After:   You → Claude Code → code that matches your project → ship it
```

---

## See it on a real project

Run on [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Output: **75 generated files**, total time **53 minutes**, all validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Terminal output (text version, for search & copy)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>📄 What ends up in your <code>CLAUDE.md</code> (real excerpt)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

Note: every claim above is grounded in the actual source — class names, package paths, configuration keys, and the dead-config flag are all extracted by the scanner before Claude writes the file.

</details>

<details>
<summary><strong>🛡️ A real auto-loaded rule (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

The `paths: ["**/*"]` glob means Claude Code auto-loads this rule whenever you edit any file in the project. The ✅/❌ examples come straight from this codebase's actual conventions and existing bug patterns.

</details>

<details>
<summary><strong>🧠 An auto-generated <code>decision-log.md</code> seed (real excerpt)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 seeds `decision-log.md` with the architectural decisions extracted from `pass2-merged.json` so future sessions remember *why* the codebase looks the way it does — not just *what* it looks like.

</details>

---

## Quick Start

**Prerequisites:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated.

```bash
# 1. Go to your project root
cd my-spring-boot-project

# 2. Run init (this analyzes your code and asks Claude to write the rules)
npx claudeos-core init

# 3. Done. Open Claude Code and start coding — your rules are already loaded.
```

**What you get** after `init` finishes:

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-loaded by Claude Code
│       ├── 00.core/              (general rules — naming, architecture)
│       ├── 10.backend/           (backend stack rules, if any)
│       ├── 20.frontend/          (frontend stack rules, if any)
│       ├── 30.security-db/       (security & DB conventions)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync reminders — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (testing strategy + build verification reminders)
├── claudeos-core/
│   ├── standard/                 ← Reference docs (mirror category structure)
│   │   ├── 00.core/              (project overview, architecture, naming)
│   │   ├── 10.backend/           (backend reference — if backend stack)
│   │   ├── 20.frontend/          (frontend reference — if frontend stack)
│   │   ├── 30.security-db/       (security & DB reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (build / startup / testing reference — standard only)
│   │   └── 90.optional/          (stack-specific extras — standard only)
│   ├── skills/                   (reusable patterns Claude can apply)
│   ├── guide/                    (how-to guides for common tasks)
│   ├── database/                 (schema overview, migration guide)
│   ├── mcp-guide/                (MCP integration notes)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (the index Claude reads first)
```

Categories sharing the same number prefix between `rules/` and `standard/` represent the same conceptual area (e.g., `10.backend` rules ↔ `10.backend` standards). Rules-only categories: `50.sync` (doc sync reminders) and `60.memory` (Pass 4 memory). Standard-only category: `90.optional` (stack-specific extras with no enforcement). All other prefixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) appear in BOTH `rules/` and `standard/`. Claude Code now knows your project.

---

## Who is this for?

| You are... | This helps you... |
|---|---|
| **A solo dev** starting a new project with Claude Code | Skip the "teach Claude my conventions" phase entirely |
| **A team lead** maintaining shared standards | Automate the tedious part of keeping `.claude/rules/` up to date |
| **Already using Claude Code** but tired of fixing generated code | Make Claude follow YOUR patterns, not "generally good" patterns |

**Not a fit if:** you want a one-size-fits-all preset bundle of agents/skills/rules that works on day one without a scan step (see [docs/comparison.md](docs/comparison.md) for what fits where), or your project doesn't fit one of the [supported stacks](#supported-stacks) yet.

---

## How does it work?

ClaudeOS-Core inverts the usual Claude Code workflow:

```
Usual:    You describe project → Claude guesses your stack → Claude writes docs
This:     Code reads your stack → Code passes confirmed facts to Claude → Claude writes docs from facts
```

The key idea: **a Node.js scanner reads your source code first** (deterministic, no AI), then a 4-pass Claude pipeline writes the documentation, constrained by what the scanner found. Claude can't invent paths or frameworks that aren't actually in your code.

For the full architecture, see [docs/architecture.md](docs/architecture.md).

---

## Supported Stacks

12 stacks, auto-detected from your project files:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack projects (e.g., Spring Boot backend + Next.js frontend) work out of the box.

For detection rules and what each scanner extracts, see [docs/stacks.md](docs/stacks.md).

---

## Daily Workflow

Three commands cover ~95% of usage:

```bash
# First time on a project
npx claudeos-core init

# After you manually edited standards or rules
npx claudeos-core lint

# Health check (run before commits, or in CI)
npx claudeos-core health
```

Two more for memory layer maintenance:

```bash
# Compact the failure-patterns log (run periodically)
npx claudeos-core memory compact

# Promote frequent failure patterns into proposed rules
npx claudeos-core memory propose-rules
```

For each command's full options, see [docs/commands.md](docs/commands.md).

---

## What makes this different

Most Claude Code documentation tools generate from a description (you tell the tool, the tool tells Claude). ClaudeOS-Core generates from your actual source code (the tool reads, the tool tells Claude what's confirmed, Claude writes only what's confirmed).

Three concrete consequences:

1. **Deterministic stack detection.** Same project + same code = same output. No "Claude rolled differently this time."
2. **No invented paths.** The Pass 3 prompt explicitly lists every allowed source path; Claude can't cite paths that don't exist.
3. **Multi-stack aware.** Backend and frontend domains use different analysis prompts in the same run.

For a side-by-side scope comparison with other tools, see [docs/comparison.md](docs/comparison.md). The comparison is about **what each tool does**, not **which is better** — most are complementary.

---

## Verification (post-generation)

After Claude writes the docs, code verifies them. Five separate validators:

| Validator | What it checks | Run by |
|---|---|---|
| `claude-md-validator` | CLAUDE.md structural invariants (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path claims actually exist; manifest consistency | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 outputs are well-formed JSON | `health` (warn) |
| `plan-validator` | Saved plan matches what's on disk | `health` (fail-on-error) |
| `sync-checker` | Disk files match `sync-map.json` registrations (orphaned/unregistered detection) | `health` (fail-on-error) |

A `health-checker` orchestrates the four runtime validators with three-tier severity (fail / warn / advisory) and exits with the appropriate code for CI. `claude-md-validator` runs separately via the `lint` command since structural drift is a re-init signal, not a soft warning. Run anytime:

```bash
npx claudeos-core health
```

For each validator's checks in detail, see [docs/verification.md](docs/verification.md).

---

## Memory Layer (optional, for long-running projects)

After v2.0, ClaudeOS-Core writes a `claudeos-core/memory/` folder with four files:

- `decision-log.md` — append-only "why we chose X over Y"
- `failure-patterns.md` — recurring errors with frequency/importance scores
- `compaction.md` — how memory is auto-compacted over time
- `auto-rule-update.md` — patterns that should become new rules

You can run `npx claudeos-core memory propose-rules` to ask Claude to look at recent failure patterns and suggest new rules to add.

For the memory model and lifecycle, see [docs/memory-layer.md](docs/memory-layer.md).

---

## FAQ

**Q: Do I need a Claude API key?**
A: No. ClaudeOS-Core uses your existing Claude Code installation — it pipes prompts to `claude -p` on your machine. No extra accounts.

**Q: Will this overwrite my existing CLAUDE.md or `.claude/rules/`?**
A: First run on a fresh project: it creates them. Re-running without `--force` preserves your edits — pass markers from the previous run are detected and the passes are skipped. Re-running with `--force` wipes and regenerates everything (your edits are lost — that's what `--force` means). See [docs/safety.md](docs/safety.md).

**Q: My stack isn't supported. Can I add one?**
A: Yes. New stacks need ~3 prompt templates + a domain scanner. See [CONTRIBUTING.md](CONTRIBUTING.md) for the 8-step guide.

**Q: How do I generate docs in Korean (or another language)?**
A: `npx claudeos-core init --lang ko`. 10 languages supported: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: Does this work with monorepos?**
A: Yes — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), and npm/yarn workspaces (`package.json#workspaces`) are detected by the stack-detector. Each app gets its own analysis. Other monorepo layouts (e.g., NX) are not detected specifically, but generic `apps/*/` and `packages/*/` patterns are still picked up by the per-stack scanners.

**Q: What if Claude Code generates rules I disagree with?**
A: Edit them directly. Then run `npx claudeos-core lint` to verify CLAUDE.md is still structurally valid. Your edits are preserved on subsequent `init` runs (without `--force`) — the resume mechanism skips passes whose markers exist.

**Q: Where do I report bugs?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). For security issues, see [SECURITY.md](SECURITY.md).

---

## Documentation

| Topic | Read this |
|---|---|
| How the 4-pass pipeline works (deeper than the diagram) | [docs/architecture.md](docs/architecture.md) |
| Visual diagrams (Mermaid) of the architecture | [docs/diagrams.md](docs/diagrams.md) |
| Stack detection — what each scanner looks for | [docs/stacks.md](docs/stacks.md) |
| Memory layer — decision logs and failure patterns | [docs/memory-layer.md](docs/memory-layer.md) |
| All 5 validators in detail | [docs/verification.md](docs/verification.md) |
| Every CLI command and option | [docs/commands.md](docs/commands.md) |
| Manual installation (no `npx`) | [docs/manual-installation.md](docs/manual-installation.md) |
| Scanner overrides — `.claudeos-scan.json` | [docs/advanced-config.md](docs/advanced-config.md) |
| Safety: what gets preserved on re-init | [docs/safety.md](docs/safety.md) |
| Comparison with similar tools (scope, not quality) | [docs/comparison.md](docs/comparison.md) |
| Errors and recovery | [docs/troubleshooting.md](docs/troubleshooting.md) |

---

## Contributing

Contributions welcome — adding stack support, improving prompts, fixing bugs. See [CONTRIBUTING.md](CONTRIBUTING.md).

For Code of Conduct and security policy, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).

## License

[ISC](LICENSE) — free for any use, including commercial.

---

<sub>Built with care by [@claudeos-core](https://github.com/claudeos-core). If this saved you time, a ⭐ on GitHub keeps it visible.</sub>
