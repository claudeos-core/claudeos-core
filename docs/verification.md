# Verification

After Claude finishes generating documentation, code verifies the output across **5 separate validators**. None of them call an LLM — all checks are deterministic.

This page covers what each validator checks, how severity tiers work, and how to read the output.

---

## Why post-generation verification

LLMs are non-deterministic. Even with fact-injected prompts (the [allowlist of source paths](architecture.md#fact-injected-prompts-prevent-hallucination)), Claude can still:

- Skip a required section under context pressure.
- Cite a path that almost-but-doesn't-quite match the allowlist (e.g., `src/feature/routers/featureRoutePath.ts` invented from a parent directory + a TypeScript constant name).
- Generate inconsistent cross-references between standards and rules.
- Re-declare Section 8 content somewhere else in CLAUDE.md.

Validators catch these silently-bad outputs before the docs ship.

---

## The 5 validators

### 1. `claude-md-validator` — structural invariants

Validates `CLAUDE.md` against a set of structural checks (the table below lists the check ID families — total individual reportable IDs vary as `checkSectionsHaveContent` and `checkCanonicalHeadings` emit one per section, etc.). Lives in `claude-md-validator/`.

**Run via:**
```bash
npx claudeos-core lint
```

(Not run by `health` — see [Why two entry points](#why-two-entry-points-lint-vs-health) below.)

**What it checks:**

| Check ID | What it enforces |
|---|---|
| `S1` | Section count is exactly 8 |
| `S2-N` | Each section has at least 2 non-empty body lines |
| `S-H3-4` | Section 4 has 3 or 4 H3 sub-sections |
| `S-H3-6` | Section 6 has exactly 3 H3 sub-sections |
| `S-H3-8` | Section 8 has exactly 2 H3 sub-sections |
| `S-H4-8` | Section 8 has exactly 2 H4 headings (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Each of 4 memory files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) appears in exactly ONE markdown table row |
| `F2-<file>` | Memory file table rows are confined to Section 8 |
| `T1-1` to `T1-8` | Each `## N.` section heading contains its English canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) — case-insensitive substring match |

**Why language-invariant:** the validator never matches translated heading prose. It only matches markdown structure (heading levels, counts, ordering) and English canonical tokens. The same checks pass on a CLAUDE.md generated in any of the 10 supported languages.

**Why this matters in practice:** a CLAUDE.md generated with `--lang ja` and one generated with `--lang en` look completely different to a human, but `claude-md-validator` produces byte-for-byte identical pass/fail verdicts on both. No per-language dictionary maintenance.

### 2. `content-validator` — path & manifest checks

Validates the **content** of generated files (not the structure of CLAUDE.md). Lives in `content-validator/`.

**10 checks** (the first 9 are labeled `[N/9]` in console output; the 10th was added later and labeled `[10/10]` — this asymmetry is preserved in the code so existing CI greps still match):

| Check | What it enforces |
|---|---|
| `[1/9]` | CLAUDE.md exists, ≥100 chars, contains required section keywords (10-language aware) |
| `[2/9]` | `.claude/rules/**/*.md` files have YAML frontmatter with `paths:` key, no empty files |
| `[3/9]` | `claudeos-core/standard/**/*.md` files are ≥200 chars and contain ✅/❌ examples + a markdown table (Kotlin standards also check for ` ```kotlin ` blocks) |
| `[4/9]` | `claudeos-core/skills/**/*.md` files are non-empty; orchestrator + MANIFEST present |
| `[5/9]` | `claudeos-core/guide/` has all 9 expected files, each non-empty (BOM-aware emptiness check) |
| `[6/9]` | `claudeos-core/plan/` files non-empty (informational since v2.1.2 — `plan/` is no longer auto-created) |
| `[7/9]` | `claudeos-core/database/` files exist (warning if missing) |
| `[8/9]` | `claudeos-core/mcp-guide/` files exist (warning if missing) |
| `[9/9]` | `claudeos-core/memory/` 4 files exist + structural validation (decision-log ISO date, failure-pattern required fields, compaction `## Last Compaction` marker) |
| `[10/10]` | Path-claim verification + MANIFEST drift (3 sub-classes — see below) |

**Check `[10/10]` sub-classes:**

| Class | What it catches |
|---|---|
| `STALE_PATH` | Any `src/...\.(ts|tsx|js|jsx)` reference in `.claude/rules/**` or `claudeos-core/standard/**` must resolve to a real file. Fenced code blocks and placeholder paths (`src/{domain}/feature.ts`) are excluded. |
| `STALE_SKILL_ENTRY` | Every skill path registered in `claudeos-core/skills/00.shared/MANIFEST.md` must exist on disk. |
| `MANIFEST_DRIFT` | Every registered skill must be mentioned in `CLAUDE.md` (with **orchestrator/sub-skill exception** — Pass 3b writes Section 6 before Pass 3c creates sub-skills, so listing every sub-skill is structurally impossible). |

The orchestrator/sub-skill exception: a registered sub-skill at `{category}/{parent-stem}/{NN}.{name}.md` is considered covered when an orchestrator at `{category}/*{parent-stem}*.md` is mentioned in CLAUDE.md.

**Severity:** content-validator runs at **advisory** tier — surfaces in output but doesn't block CI. The reasoning: re-running Pass 3 isn't guaranteed to fix LLM hallucinations, so blocking would deadlock users in `--force` loops. The detection signal (non-zero exit + `stale-report` entry) is enough for CI pipelines and human triage.

### 3. `pass-json-validator` — Pass output well-formedness

Validates that the JSON files written by each pass are well-formed and contain expected keys. Lives in `pass-json-validator/`.

**Files validated:**

| File | Required keys |
|---|---|
| `project-analysis.json` | 5 required keys (stack, domains, etc.) |
| `domain-groups.json` | 4 required keys |
| `pass1-*.json` | 4 required keys + `analysisPerDomain` object |
| `pass2-merged.json` | 10 common sections (always) + 2 backend sections (when backend stack) + 1 kotlin base section + 2 kotlin CQRS sections (when applicable). Fuzzy match with semantic alias map; top-level key count <5 = ERROR, <9 = WARNING; empty value detection. |
| `pass3-complete.json` | Marker presence + structure |
| `pass4-memory.json` | Marker structure: object, `passNum === 4`, non-empty `memoryFiles` array |

The pass2 check is **stack-aware**: it reads `project-analysis.json` to determine backend/kotlin/cqrs and adjusts which sections it expects.

**Severity:** runs at **warn-only** tier — surfaces issues but doesn't block CI.

### 4. `plan-validator` — Plan ↔ disk consistency (legacy)

Compares `claudeos-core/plan/*.md` files against disk. Lives in `plan-validator/`.

**3 modes:**
- `--check` (default): detect drift only
- `--refresh`: update plan files from disk
- `--execute`: apply plan content to disk (creates `.bak` backups)

**v2.1.0 status:** Master plan generation was removed in v2.1.0. `claudeos-core/plan/` is no longer auto-created by `init`. When `plan/` is absent, this validator skips with informational messages.

It's kept in the validator suite for users who hand-maintain plan files for ad-hoc backup purposes.

**Security:** path traversal is blocked — `isWithinRoot(absPath)` rejects paths that escape the project root via `../`.

**Severity:** runs at **fail** tier when actual drift is detected. No-ops when `plan/` is absent.

### 5. `sync-checker` — Disk ↔ `sync-map.json` consistency

Verifies that the files registered in `sync-map.json` (written by `manifest-generator`) match the files actually on disk. Bidirectional check across the 7 tracked directories. Lives in `sync-checker/`.

**Two-step check:**

1. **Disk → Plan:** Walks 7 tracked directories (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Reports files that exist on disk but aren't registered in `sync-map.json`.
2. **Plan → Disk:** Reports paths registered in `sync-map.json` that no longer exist on disk (orphaned).

**Exit code:** Only orphaned files cause exit 1. Unregistered files are informational (a v2.1.0+ project has zero registered paths by default, so this is the common case).

**Severity:** runs at **fail** tier for orphaned files. Clean skip when `sync-map.json` has no mappings.

---

## Severity tiers

Not every failed check is equally serious. The `health-checker` orchestrates the runtime validators with three-tier severity:

| Tier | Symbol | Behavior |
|---|---|---|
| **fail** | `❌` | Blocks completion. CI exits non-zero. Must be fixed. |
| **warn** | `⚠️` | Surfaces in output but doesn't block. Worth investigating. |
| **advisory** | `ℹ️` | Review later. Often false positives in unusual project layouts. |

**Examples by tier:**

- **fail:** plan-validator detects actual drift; sync-checker finds orphaned files; required guide file missing.
- **warn:** pass-json-validator finds a non-critical schema gap.
- **advisory:** content-validator's `STALE_PATH` flags a path that exists but is gitignored (false positive in some projects).

The 3-tier system was added so `content-validator` findings (which can have false positives in unusual layouts) don't deadlock CI pipelines. Without it, every advisory would block — and re-running `init` doesn't reliably fix LLM hallucinations.

The summary line shows the breakdown:
```
All systems operational (1 advisory, 1 warning)
```

---

## Why two entry points: `lint` vs `health`

```bash
npx claudeos-core lint     # claude-md-validator only
npx claudeos-core health   # 4 other validators
```

**Why split?**

`claude-md-validator` finds **structural** issues — section count wrong, memory file table re-declared, canonical heading missing the English token. These are signals that **CLAUDE.md needs to be re-generated**, not soft warnings to investigate. Re-running `init` (with `--force` if needed) is the fix.

The other validators find **content** issues — paths, manifest entries, schema gaps. These can be reviewed and fixed by hand without re-generating everything.

Keeping `lint` separate means it can be used in pre-commit hooks (fast, structural-only) without dragging in the slower content checks.

---

## Running validation

```bash
# Run structural validation on CLAUDE.md
npx claudeos-core lint

# Run the 4-validator health suite
npx claudeos-core health
```

For CI, `health` is the recommended check. It's still fast (no LLM calls) and covers everything except the structural CLAUDE.md checks, which most CI pipelines don't need to verify on every commit.

For pre-commit hooks, `lint` is fast enough to run on every commit.

---

## Output format

Validators produce human-readable output by default:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

The `manifest-generator` writes machine-readable artifacts to `claudeos-core/generated/`:

- `rule-manifest.json` — file list + frontmatter from gray-matter + stat
- `sync-map.json` — registered path mappings (v2.1.0+: empty array by default)
- `stale-report.json` — consolidated findings from all validators

---

## CI integration

A minimal GitHub Actions example:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Exit code is non-zero only for `fail`-tier findings. `warn` and `advisory` print but don't fail the build.

The official CI workflow (in `.github/workflows/test.yml`) runs across `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## When validators flag something you disagree with

False positives happen, especially in unusual project layouts (e.g., gitignored generated files, custom build steps that emit into non-standard paths).

**To suppress detection on a specific file**, see [advanced-config.md](advanced-config.md) for the available `.claudeos-scan.json` overrides.

**If a validator is wrong on a general level** (not just your project), [open an issue](https://github.com/claudeos-core/claudeos-core/issues) — these checks are tuned over time based on real reports.

---

## See also

- [architecture.md](architecture.md) — where the validators sit in the pipeline
- [commands.md](commands.md) — `lint` and `health` command reference
- [troubleshooting.md](troubleshooting.md) — what specific validator errors mean
