# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Make Claude Code follow YOUR project's conventions on the first try — not generic defaults.**

A deterministic Node.js scanner reads your code first; a 4-pass Claude pipeline then writes the full set — `CLAUDE.md` + auto-loaded `.claude/rules/` + standards + skills + L4 memory. 10 output languages, 5 post-generation validators, and an explicit path allowlist that prevents the LLM from inventing files or frameworks not in your code.

Works on [**12 stacks**](#supported-stacks) (monorepos included) — one `npx` command, no config, resume-safe, idempotent.

```bash
npx claudeos-core init
```

[🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## What is this?

You use Claude Code. It's powerful, but every session starts fresh — it has no memory of how _your_ project is structured. So it falls back to "generally good" defaults that rarely match what your team actually does:

- Your team uses **MyBatis**, but Claude generates JPA repositories.
- Your response wrapper is `ApiResponse.ok()`, but Claude writes `ResponseEntity.success()`.
- Your packages are layer-first (`controller/order/`), but Claude creates domain-first (`order/controller/`).
- Your errors go through centralized middleware, but Claude scatters `try/catch` in every endpoint.

You'd want a `.claude/rules/` set per project — Claude Code auto-loads it every session — but writing those rules by hand for each new repo takes hours, and they drift as the code evolves.

**ClaudeOS-Core writes them for you, from your actual source code.** A deterministic Node.js scanner reads your project first (stack, ORM, package layout, conventions, file paths). Then a 4-pass Claude pipeline turns the extracted facts into a complete documentation set:

- **`CLAUDE.md`** — the project index Claude reads on every session
- **`.claude/rules/`** — auto-loaded rules per category (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — reference docs (the "why" behind each rule)
- **`claudeos-core/skills/`** — reusable patterns (CRUD scaffolding, page templates)
- **`claudeos-core/memory/`** — decision log + failure patterns that grow with the project

Because the scanner hands Claude an explicit path allowlist, the LLM **cannot invent files or frameworks that aren't in your code**. Five post-generation validators (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) verify the output before it ships — language-invariant, so the same rules apply whether you generate in English, Korean, or any of 8 other languages.

```
Before:  You → Claude Code → "generally good" code → manual fixing each time
After:   You → Claude Code → code that matches YOUR project → ship it
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
<summary><strong>📄 What ends up in your <code>CLAUDE.md</code> (real excerpt — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

Every value above — exact dependency coordinates, the `dev.db` filename, the `V1__create_tables.sql` migration name, "no JPA" — is extracted by the scanner from `build.gradle` / `application.properties` / source tree before Claude writes the file. Nothing is guessed.

</details>

<details>
<summary><strong>🛡️ A real auto-loaded rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

The `paths: ["**/*"]` glob means Claude Code auto-loads this rule whenever you edit any file in the project. Every class name, package path, and exception handler in the rule comes directly from the scanned source — including the project's actual `CustomizeExceptionHandler` and `JacksonCustomizations`.

</details>

<details>
<summary><strong>🧠 An auto-generated <code>decision-log.md</code> seed (real excerpt)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 seeds `decision-log.md` with the architectural decisions extracted from `pass2-merged.json` so future sessions remember *why* the codebase looks the way it does — not just *what* it looks like. Every option ("JPA/Hibernate", "MyBatis-Plus") and every consequence is grounded in the actual `build.gradle` dependency block.

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

| You are... | The pain this removes |
|---|---|
| **A solo dev** starting a new project with Claude Code | "Teach Claude my conventions every session" — gone. `CLAUDE.md` + 8-category `.claude/rules/` generated in one pass. |
| **A team lead** maintaining shared standards across repos | `.claude/rules/` drift as people rename packages, switch ORMs, or change response wrappers. ClaudeOS-Core re-syncs deterministically — same input, byte-identical output, no diff noise. |
| **Already using Claude Code** but tired of fixing generated code | Wrong response wrapper, wrong package layout, JPA when you use MyBatis, `try/catch` scattered when your project uses centralized middleware. The scanner extracts your real conventions; every Claude pass runs against an explicit path allowlist. |
| **Onboarding to a new repo** (existing project, joining a team) | Run `init` on the repo, get a living architecture map: stack table in CLAUDE.md, per-layer rules with ✅/❌ examples, decision log seeded with "why" behind major choices (JPA vs MyBatis, REST vs GraphQL, etc.). Reading 5 files beats reading 5,000 source files. |
| **Working in Korean / Japanese / Chinese / 7 more languages** | Most Claude Code rule generators are English-only. ClaudeOS-Core writes the full set in **10 languages** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) with **byte-identical structural validation** — same `claude-md-validator` verdict regardless of output language. |
| **Running on a monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend + frontend domains analyzed in one run with separate prompts; `apps/*/` and `packages/*/` walked automatically; per-stack rules emitted under `70.domains/{type}/`. |
| **Contributing to OSS or experimenting** | Output is gitignore-friendly — `claudeos-core/` is your local working dir, only `CLAUDE.md` + `.claude/` need to ship. Resume-safe if interrupted; idempotent on re-runs (your manual edits to rules survive without `--force`). |

**Not a fit if:** you want a one-size-fits-all preset bundle of agents/skills/rules that works on day one without a scan step (see [docs/comparison.md](docs/comparison.md) for what fits where), your project doesn't match one of the [supported stacks](#supported-stacks) yet, or you only need a single `CLAUDE.md` (built-in `claude /init` is enough — no need to install another tool).

---

## How does it work?

ClaudeOS-Core inverts the usual Claude Code workflow:

```
Usual:    You describe project → Claude guesses your stack → Claude writes docs
This:     Code reads your stack → Code passes confirmed facts to Claude → Claude writes docs from facts
```

The pipeline runs in **three stages**, with code on both sides of the LLM call:

**1. Step A — Scanner (deterministic, no LLM).** A Node.js scanner walks your project root, reads `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parses `.env*` files (with sensitive-variable redaction for `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), classifies your architecture pattern (Java's 5 patterns A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), discovers domains, and builds an explicit allowlist of every source file path that exists. Output: `project-analysis.json` — the single source of truth for what follows.

**2. Step B — 4-Pass Claude pipeline (constrained by Step A's facts).**
- **Pass 1** reads representative files per domain group and extracts ~50–100 conventions per domain — response wrappers, logging libraries, error handling, naming conventions, test patterns. Runs once per domain group (`max 4 domains, 40 files per group`) so context never overflows.
- **Pass 2** merges all per-domain analysis into a project-wide picture and resolves disagreements by picking the dominant convention.
- **Pass 3** writes `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — split into stages (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) so each stage's prompt fits the LLM's context window even when `pass2-merged.json` is large. Sub-divides 3b/3c into ≤15-domain batches for ≥16-domain projects.
- **Pass 4** seeds the L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) and adds universal scaffold rules. Pass 4 is **forbidden from modifying `CLAUDE.md`** — Pass 3's Section 8 is authoritative.

**3. Step C — Verification (deterministic, no LLM).** Five validators check the output:
- `claude-md-validator` — 25 structural checks on `CLAUDE.md` (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant). Language-invariant: same verdict regardless of `--lang`.
- `content-validator` — 10 content checks including path-claim verification (`STALE_PATH` catches fabricated `src/...` references) and MANIFEST drift detection.
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count.
- `plan-validator` — plan ↔ disk consistency (legacy, mostly no-op since v2.1.0).
- `sync-checker` — disk ↔ `sync-map.json` registration consistency across 7 tracked dirs.

Three severity tiers (`fail` / `warn` / `advisory`) so warnings never deadlock CI on LLM hallucinations the user can fix manually.

The invariant that ties it all together: **Claude can only cite paths that actually exist in your code**, because Step A hands it a finite allowlist. If the LLM still tries to invent something (rare but happens on certain seeds), Step C catches it before the docs ship.

For per-pass details, marker-based resume, the staged-rules workaround for Claude Code's `.claude/` sensitive-path block, and stack detection internals, see [docs/architecture.md](docs/architecture.md).

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
