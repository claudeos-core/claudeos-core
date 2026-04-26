# CLI Commands

Every command, every flag, every exit code that ClaudeOS-Core actually supports.

This page is a reference. If you're new, read the [main README's Quick Start](../README.md#quick-start) first.

All commands are run via `npx claudeos-core <command>` (or `claudeos-core <command>` if installed globally — see [manual-installation.md](manual-installation.md)).

---

## Global flags

These work on every command:

| Flag | Effect |
|---|---|
| `--help` / `-h` | Show help. When placed after a command (e.g., `memory --help`), the subcommand handles its own help. |
| `--version` / `-v` | Print the installed version. |
| `--lang <code>` | Output language. One of: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. Currently consumed only by `init`. |
| `--force` / `-f` | Skip resume prompt; delete previous results. Currently consumed only by `init`. |

That's the complete list of CLI flags. **No `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run`, etc.** If you've seen those in older docs, they're not real — `bin/cli.js` parses only the four flags above.

---

## Quick reference

| Command | Use it when |
|---|---|
| `init` | First time on a project. Generates everything. |
| `lint` | After manually editing `CLAUDE.md`. Runs structural validation. |
| `health` | Before committing, or in CI. Runs the four content/path validators. |
| `restore` | Saved plan → disk. (Mostly no-op since v2.1.0; kept for back-compat.) |
| `refresh` | Disk → saved plan. (Mostly no-op since v2.1.0; kept for back-compat.) |
| `validate` | Run plan-validator's `--check` mode. (Mostly no-op since v2.1.0.) |
| `memory <sub>` | Memory layer maintenance: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` are kept around because they're harmless on projects that don't use the legacy plan files. If `plan/` doesn't exist (the v2.1.0+ default), they all skip with informational messages.

---

## `init` — Generate the documentation set

```bash
npx claudeos-core init [--lang <code>] [--force]
```

The main command. Runs the [4-pass pipeline](architecture.md) end-to-end:

1. Scanner produces `project-analysis.json`.
2. Pass 1 analyzes each domain group.
3. Pass 2 merges domains into a project-wide picture.
4. Pass 3 generates CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 scaffolds the memory layer.

**Examples:**

```bash
# First time, English output
npx claudeos-core init

# First time, Korean output
npx claudeos-core init --lang ko

# Re-do everything from scratch
npx claudeos-core init --force
```

### Resume safety

`init` is **resume-safe**. If interrupted (network blip, timeout, Ctrl-C), the next run picks up from the last completed pass marker. Markers live in `claudeos-core/generated/`:

- `pass1-<group>.json` — per-domain Pass 1 output
- `pass2-merged.json` — Pass 2 output
- `pass3-complete.json` — Pass 3 marker (also tracks which sub-stages of split mode completed)
- `pass4-memory.json` — Pass 4 marker

If a marker is malformed (e.g., crashed mid-write left `{"error":"timeout"}`), the validator rejects it and the pass re-runs.

For a partial Pass 3 (split mode interrupted between stages), the resume mechanism inspects the marker body — if `mode === "split"` and `completedAt` is missing, Pass 3 is re-invoked and resumes from the next unstarted stage.

### What `--force` does

`--force` deletes:
- Every `.json` and `.md` file under `claudeos-core/generated/` (including all four pass markers)
- The leftover `claudeos-core/generated/.staged-rules/` directory if any prior run crashed mid-move
- Everything under `.claude/rules/` (so Pass 3's "zero-rules detection" can't false-negative on stale rules)

`--force` does **not** delete:
- `claudeos-core/memory/` files (your decision log and failure patterns are preserved)
- Files outside `claudeos-core/` and `.claude/`

**Manual edits to rules are lost under `--force`.** That's the trade-off — `--force` exists for "I want a clean slate." If you want to preserve edits, just re-run without `--force`.

### Interactive vs non-interactive

Without `--lang`, `init` shows an interactive language selector (10 options, arrow keys or number entry). In non-TTY environments (CI, piped input), the selector falls back to readline, then to a non-interactive default if no input.

Without `--force`, if existing pass markers are detected, `init` shows a Continue / Fresh prompt. Passing `--force` skips this prompt entirely.

---

## `lint` — Validate `CLAUDE.md` structure

```bash
npx claudeos-core lint
```

Runs `claude-md-validator` against your project's `CLAUDE.md`. Fast — no LLM calls, just structural checks.

**Exit codes:**
- `0` — Pass.
- `1` — Fail. At least one structural issue.

**What it checks** (see [verification.md](verification.md) for the full list of check IDs):

- Section count must be exactly 8.
- Section 4 must have 3 or 4 H3 sub-sections.
- Section 6 must have exactly 3 H3 sub-sections.
- Section 8 must have exactly 2 H3 sub-sections (Common Rules + L4 Memory) AND exactly 2 H4 sub-sub-sections (L4 Memory Files + Memory Workflow).
- Each canonical section heading must contain its English token (e.g., `Role Definition`, `Memory`) so multi-repo grep works regardless of `--lang`.
- Each of the 4 memory files appears in exactly ONE markdown table row, confined to Section 8.

The validator is **language-invariant**: same checks work on a CLAUDE.md generated with `--lang ko`, `--lang ja`, or any other supported language.

Suitable for pre-commit hooks and CI.

---

## `health` — Run the verification suite

```bash
npx claudeos-core health
```

Orchestrates **4 validators** (claude-md-validator runs separately via `lint`):

| Order | Validator | Tier | What happens on fail |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | If this fails, `sync-checker` is skipped. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (if manifest succeeded). |
| 4 | `content-validator` | advisory | Surfaces but doesn't block. |
| 5 | `pass-json-validator` | warn | Surfaces but doesn't block. |

**Exit codes:**
- `0` — No `fail`-tier findings. Warnings and advisories may be present.
- `1` — At least one `fail`-tier finding.

The 3-tier severity (fail / warn / advisory) was added so `content-validator` findings (which often have false positives in unusual layouts) don't deadlock CI pipelines.

For details on each validator's checks, see [verification.md](verification.md).

---

## `restore` — Apply saved plan to disk (legacy)

```bash
npx claudeos-core restore
```

Runs `plan-validator` in `--execute` mode: copies content from `claudeos-core/plan/*.md` files into the locations they describe.

**v2.1.0 status:** Master plan generation was removed. `claudeos-core/plan/` is no longer auto-created. If `plan/` doesn't exist, this command logs an informational message and exits cleanly.

The command is kept for users who hand-maintain plan files for ad-hoc backup/restore purposes. It's harmless to run on a v2.1.0+ project.

Creates a `.bak` backup of any file it overwrites.

---

## `refresh` — Sync disk to saved plan (legacy)

```bash
npx claudeos-core refresh
```

The inverse of `restore`. Runs `plan-validator` in `--refresh` mode: reads the current state of disk files and updates `claudeos-core/plan/*.md` to match.

**v2.1.0 status:** Same as `restore` — no-op when `plan/` is absent.

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

Runs `plan-validator` in `--check` mode: reports differences between `claudeos-core/plan/*.md` and disk, but does not modify anything.

**v2.1.0 status:** No-op when `plan/` is absent. Most users should run `health` instead, which calls `plan-validator` along with the other validators.

---

## `memory <subcommand>` — Memory layer maintenance

```bash
npx claudeos-core memory <subcommand>
```

Three subcommands. The subcommands operate on `claudeos-core/memory/` files written by Pass 4 of `init`. If those files are missing, each subcommand logs `not found` and skips gracefully (best-effort tools).

For details on the memory model, see [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Applies a 4-stage compaction over `decision-log.md` and `failure-patterns.md`:

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body collapsed to a 1-line "fix" + meta |
| 2 | Duplicate headings | Merged (frequencies summed, body = most recent) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Dropped |
| 4 | File > 400 lines | Trim oldest non-preserved entries |

Entries with `importance >= 7`, `lastSeen < 30 days`, or a body referencing a concrete (non-glob) active rule path are auto-preserved.

After compaction, only the `## Last Compaction` section of `compaction.md` is replaced — everything else (your manual notes) is preserved.

### `memory score`

```bash
npx claudeos-core memory score
```

Recomputes importance scores for entries in `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Strips any existing importance lines before insertion (prevents duplicate-line regressions). The new score is written back into the entry's body.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Reads `failure-patterns.md`, picks entries with frequency ≥ 3, and asks Claude to draft proposed `.claude/rules/` content for the top candidates.

Confidence per candidate:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = entry mentions a concrete file path that exists on disk.)

The output is **appended to `claudeos-core/memory/auto-rule-update.md`** for your review. **It does not auto-apply** — you decide which suggestions to copy into actual rule files.

---

## Environment variables

| Variable | Effect |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Short-circuits the memory-scaffold translation path; throws before invoking `claude -p`. Used by CI and translation-dependent tests so they don't need a real Claude CLI installation. Strict `=== "1"` semantics — other values don't activate it. |
| `CLAUDEOS_ROOT` | Set automatically by `bin/cli.js` to the user's project root. Internal — don't override. |

That's the complete list. There's no `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR`, etc. — those don't exist.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Validation failure (`fail`-tier finding) or `InitError` (e.g., prerequisite missing, malformed marker, file lock). |
| Other | Bubbled up from the underlying Node process or sub-tool — uncaught exceptions, write errors, etc. |

There's no special exit code for "interrupted" — Ctrl-C just terminates the process. Re-run `init` and the resume mechanism takes over.

---

## What `npm test` runs (for contributors)

If you've cloned the repo and want to run the test suite locally:

```bash
npm test
```

This runs `node tests/*.test.js` across 33 test files. The test suite uses Node's built-in `node:test` runner (no Jest, no Mocha) and Node's `node:assert/strict`.

For a single test file:

```bash
node tests/scan-java.test.js
```

CI runs the suite on Linux / macOS / Windows × Node 18 / 20. The CI workflow sets `CLAUDEOS_SKIP_TRANSLATION=1` so translation-dependent tests don't need a `claude` CLI.

---

## See also

- [architecture.md](architecture.md) — what `init` actually does internally
- [verification.md](verification.md) — what the validators check
- [memory-layer.md](memory-layer.md) — what the `memory` subcommands operate on
- [troubleshooting.md](troubleshooting.md) — when commands fail
