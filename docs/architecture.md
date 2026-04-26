# Architecture — The 4-Pass Pipeline

This document explains how `claudeos-core init` actually works, end to end. If you just want to use the tool, the [main README](../README.md) is enough — this is for understanding *why* the design looks the way it does.

If you've never used the tool, [run it once first](../README.md#quick-start). The concepts below will land much faster after you've seen the output.

---

## The core idea — "Code confirms, Claude creates"

Most tools that generate Claude Code documentation work in one step:

```
Your description  →  Claude  →  CLAUDE.md / rules / standards
```

Claude has to guess your stack, your conventions, your domain structure. It guesses well, but it does guess. ClaudeOS-Core inverts this:

```
Your source code
       ↓
[Step A: Code reads]      ← Node.js scanner, deterministic, no AI
       ↓
project-analysis.json     ← confirmed facts: stack, domains, paths
       ↓
[Step B: Claude writes]   ← 4-pass LLM pipeline, constrained by facts
       ↓
[Step C: Code verifies]   ← 5 validators, run automatically
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**Code does the parts that need to be exact** (your stack, your file paths, your domain structure).
**Claude does the parts that need to be expressive** (explanations, conventions, prose).
They don't overlap, and they don't second-guess each other.

The reason this matters: an LLM cannot invent paths or frameworks that aren't actually in your code. The Pass 3 prompt explicitly hands Claude the allowlist of source paths from the scanner. If Claude tries to cite a path that's not on the list, the post-generation `content-validator` flags it.

---

## Step A — The scanner (deterministic)

Before Claude is invoked at all, a Node.js process walks your project and writes `claudeos-core/generated/project-analysis.json`. This file is the single source of truth for everything that follows.

### What the scanner reads

The scanner picks up signals from these files at the project root:

| File | What it tells the scanner |
|---|---|
| `package.json` | Node.js project; framework via `dependencies` |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; framework via packages |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |
| `.env*` files | Runtime config (port, host, DB URL — see below) |

If none match, `init` stops with a clear error rather than guessing.

### What the scanner writes into `project-analysis.json`

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — for Java, one of 5 patterns (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). For Kotlin, CQRS / BFF / multi-module detection. For frontend, App Router / Pages Router / FSD layouts plus `components/*/` patterns, with multi-stage fallbacks.
- **Domain list** — discovered by walking the directory tree, with a file count per domain. The scanner picks one or two representative files per domain for Pass 1 to read.
- **Source path allowlist** — every source file path that exists in your project. Pass 3 prompts include this list explicitly so Claude has nothing to guess.
- **Monorepo structure** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), and npm/yarn workspaces (`package.json#workspaces`), when present. NX is not auto-detected specifically; generic `apps/*/` and `packages/*/` patterns are picked up by the per-stack scanners regardless.
- **`.env` snapshot** — port, host, API target, sensitive vars redacted. See [stacks.md](stacks.md) for the search order.

The scanner has **no LLM calls**. Same project + same code = same `project-analysis.json`, every time.

For per-stack details (what each scanner extracts and how), see [stacks.md](stacks.md).

---

## Step B — The 4-pass Claude pipeline

Each pass has a specific job. They run in sequence, with Pass N reading Pass (N-1)'s output as a small structured file (not the full output of all previous passes).

### Pass 1 — Per-domain deep analysis

**Input:** `project-analysis.json` + a representative file from each domain.

**What it does:** Reads the representative files and extracts patterns across dozens of analysis categories per stack (typically 50 to 100+ bullet-level items, varying by stack — Kotlin/Spring's CQRS-aware template is the densest, the lightweight Node.js templates are the most compact). For example: "Does this controller use `@RestController` or `@Controller`? What response wrapper is used? What logging library?"

**Output:** `pass1-<group-N>.json` — one file per domain group.

For large projects, Pass 1 runs multiple times — one invocation per domain group. The grouping rule is **at most 4 domains and 40 files per group**, auto-applied in `plan-installer/domain-grouper.js`. A 12-domain project would run Pass 1 three times.

This split exists because Claude's context window is finite. Trying to fit 12 domains' worth of source files into one prompt would either overflow the context or force the LLM to skim. Splitting keeps each pass focused.

### Pass 2 — Cross-domain merge

**Input:** All `pass1-*.json` files.

**What it does:** Merges them into a single project-wide picture. When two domains disagree (e.g., one says the response wrapper is `success()`, another says `ok()`), Pass 2 picks the dominant convention and notes the disagreement.

**Output:** `pass2-merged.json` — typically 100–400 KB.

### Pass 3 — Documentation generation (split mode)

**Input:** `pass2-merged.json`.

**What it does:** Writes the actual documentation. This is the heavy pass — it produces ~40–50 markdown files across CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`, and `claudeos-core/mcp-guide/`.

**Output:** All the user-facing files, organized into the directory structure shown in the [main README](../README.md#quick-start).

To keep each stage's output within Claude's context window (the merged Pass 2 input is large, and the generated output is even larger), Pass 3 **always splits into stages** — even for small projects. The split is applied unconditionally; small projects just have fewer per-domain batches:

| Stage | What it writes |
|---|---|
| **3a** | A small "facts table" (`pass3a-facts.md`) extracted from `pass2-merged.json`. Acts as a compressed input for the later stages so they don't have to re-read the big merged file. |
| **3b-core** | Generates `CLAUDE.md` (the index Claude Code reads first) + the bulk of `claudeos-core/standard/`. |
| **3b-N** | Per-domain rule and standard files (one stage per group of ≤15 domains). |
| **3c-core** | Generates `claudeos-core/skills/` orchestrator files + `claudeos-core/guide/`. |
| **3c-N** | Per-domain skill files. |
| **3d-aux** | Generates auxiliary content under `claudeos-core/database/` and `claudeos-core/mcp-guide/`. |

For very large projects (≥16 domains), 3b and 3c sub-divide further into batches. Each batch gets a fresh context window.

After all stages finish successfully, `pass3-complete.json` is written as a marker. If `init` is interrupted partway through, the next run reads the marker and resumes from the next unstarted stage — completed stages aren't re-run.

### Pass 4 — Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**What it does:** Generates the L4 memory layer plus the universal scaffold rules. All scaffold writes are **skip-if-exists**, so re-running Pass 4 doesn't overwrite anything.

- `claudeos-core/memory/` — 4 markdown files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 rule files (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) that auto-load the memory files when Claude Code is editing relevant areas
- `.claude/rules/00.core/51.doc-writing-rules.md` and `52.ai-work-rules.md` — universal generic rules (Pass 3 generates project-specific `00.core` rules like `00.standard-reference.md`; Pass 4 adds these two reserved-slot files if they don't already exist)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — meta-guide on writing additional rules. The numeric prefix is auto-assigned to `Math.max(existing-numbers) + 1`, so it's typically `04` or `05` depending on what Pass 3 already wrote there.

**Output:** Memory files + `pass4-memory.json` marker.

Important: **Pass 4 does not modify `CLAUDE.md`.** Pass 3 already authored Section 8 (which references the memory files). Modifying CLAUDE.md again here would re-declare Section 8 content and trigger validator errors. This is enforced by the prompt and verified by `tests/pass4-claude-md-untouched.test.js`.

For details on what each memory file does and the lifecycle, see [memory-layer.md](memory-layer.md).

---

## Step C — Verification (deterministic, post-Claude)

After Claude finishes, Node.js code verifies the output across 5 validators. **None of them call an LLM** — all checks are deterministic.

| Validator | What it checks |
|---|---|
| `claude-md-validator` | Structural checks on `CLAUDE.md` (top-level section count, per-section H3/H4 counts, memory-file table-row uniqueness/scope, T1 canonical heading tokens). Language-invariant — same checks pass for all 10 output languages. |
| `content-validator` | 10 content-level checks: required files exist, paths cited in standards/skills are real, MANIFEST is consistent. |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 JSON outputs are well-formed and contain the expected keys. |
| `plan-validator` | (Legacy) Compares saved plan files to disk. Master plan generation was removed in v2.1.0, so this is mostly a no-op now — kept for backward compat. |
| `sync-checker` | Disk files under tracked dirs match the `sync-map.json` registrations (orphaned vs. unregistered). |

These have **3 severity tiers**:

- **fail** — Blocks completion, exits non-zero in CI. Something is structurally broken.
- **warn** — Surfaces in output, but doesn't block. Worth investigating.
- **advisory** — Review later. Often false positives in unusual project layouts (e.g., gitignored files flagged as "missing").

For the full check list per validator, see [verification.md](verification.md).

The validators are orchestrated two ways:

1. **`claudeos-core lint`** — runs only `claude-md-validator`. Fast, structural-only. Use after manually editing CLAUDE.md.
2. **`claudeos-core health`** — runs the other 4 validators (claude-md-validator is intentionally separate, since structural drift in CLAUDE.md is a re-init signal, not a soft warning). Recommended in CI.

---

## Why this architecture matters

### Fact-injected prompts prevent hallucination

When Pass 3 runs, the prompt looks roughly like this (simplified):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude has no opening to invent paths. The constraint is **positive** (whitelist), not negative ("don't make things up") — the difference matters because LLMs comply better with concrete positive constraints than with abstract negative ones.

If despite this Claude still cites a fabricated path, the `content-validator [10/10]` check at the end flags it as `STALE_PATH`. The user sees the warning before the docs ship.

### Resume-safe via markers

Each pass writes a marker file (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) when it completes successfully. If `init` is interrupted (network blip, timeout, you Ctrl-C), the next run reads the markers and picks up from where the last one left off. You don't lose work.

Pass 3's marker also tracks **which sub-stages** completed, so a partial Pass 3 (e.g., 3b finished, 3c crashed mid-stage) resumes from the next stage, not from 3a.

### Idempotent re-runs

Running `init` on a project that already has rules **does not** silently overwrite manual edits.

The mechanism: Claude Code's permission system blocks subprocess writes to `.claude/`, even with `--dangerously-skip-permissions`. So Pass 3/4 are instructed to write rule files into `claudeos-core/generated/.staged-rules/` instead. After each pass, the Node.js orchestrator (which is not subject to Claude Code's permission policy) moves the staged files into `.claude/rules/`.

In practice this means: **on a fresh project, re-running creates everything anew. On a project where you've manually edited rules, re-running with `--force` re-generates from scratch (your edits are lost — that's what `--force` means). Without `--force`, the resume mechanism kicks in and only un-completed passes run.**

For the full preservation story, see [safety.md](safety.md).

### Language-invariant verification

The validators don't match translated heading text. They match **structural shape** (heading levels, counts, ordering). This means the same `claude-md-validator` produces byte-for-byte identical verdicts on a CLAUDE.md generated in any of the 10 supported languages. No per-language dictionaries. No maintenance burden when adding a new language.

---

## Performance — what to expect

Concrete timings depend heavily on:
- Project size (number of source files, number of domains)
- Network latency to Anthropic's API
- Which Claude model is selected in your Claude Code config

Rough guidance:

| Step | Time on a small project (<200 files) | Time on a medium project (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 seconds | 10–30 seconds |
| Step B (4 Claude passes) | A few minutes | 10–30 minutes |
| Step C (validators) | < 5 seconds | 10–20 seconds |

Pass 1 dominates the wall clock on large projects because it runs once per domain group. A 24-domain project = 6 Pass-1 invocations (24 / 4 domains per group).

If you want a precise number, run it once on your project — that's the only honest answer.

---

## Where the code for each step lives

| Step | File |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| Per-stack scanners | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt assembly | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass templates | `pass-prompts/templates/<stack>/pass{1,2,3}.md` per stack; `pass-prompts/templates/common/pass4.md` shared across stacks |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## Further reading

- [stacks.md](stacks.md) — what each scanner extracts per stack
- [memory-layer.md](memory-layer.md) — Pass 4 in detail
- [verification.md](verification.md) — all 5 validators
- [diagrams.md](diagrams.md) — the same architecture as Mermaid pictures
- [comparison.md](comparison.md) — how this differs from other Claude Code tools
