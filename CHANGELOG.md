# Changelog

## [2.0.1] — 2026-04-19

### Fixed

- **CI tests failing on all OS/Node combinations** — `.gitignore` no longer excludes `package-lock.json`. The GitHub Actions workflow uses `actions/setup-node` with `cache: 'npm'` and `npm ci`, both of which require a committed lockfile; without it, all 6 matrix jobs (Ubuntu/macOS/Windows × Node 18/20) failed at the install step with `Dependencies lock file is not found`.
- **`npm test` script not cross-platform** — Changed `node --test tests/*.test.js` → `node --test` in `package.json`. The `*.test.js` glob was expanded by `sh` on Linux/macOS but left literal by `cmd.exe` on Windows runners, causing `Could not find 'D:\a\...\tests\*.test.js'` on all 3 Windows matrix jobs. The `node --test` built-in auto-discovery matches `**/*.test.{cjs,mjs,js}` from cwd (skipping `node_modules`), independent of shell globbing.

### Changed

- **GitHub Actions runner compatibility** — Bumped `actions/checkout@v4` → `@v5` and `actions/setup-node@v4` → `@v5` in `.github/workflows/test.yml`. The `@v4` tags ran on Node.js 20, which GitHub deprecated on 2025-09-19 (forced Node 24 transition on 2026-06-02, full removal on 2026-09-16). The `@v5` tags ship with Node 24 support and clear the deprecation warnings.

## [2.0.0] — 2026-04-19

### Added

- **L4 Memory Layer** — New `claudeos-core/memory/` directory with 4 persistent files:
  - `decision-log.md` — "Why" behind design decisions (append-only, seeded from pass2-merged.json)
  - `failure-patterns.md` — Recurring errors auto-scored by `npx claudeos-core memory score`
  - `compaction.md` — 4-stage compaction strategy with project-specific error categories
  - `auto-rule-update.md` — Rule improvement proposals from `npx claudeos-core memory propose-rules`
- **L4 Memory rules** — New `.claude/rules/60.memory/` directory with 4 rule files (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) instructing when/how to read and write memory files.
- **L4 Common rules** — New `.claude/rules/00.core/51.doc-writing-rules.md` and `.claude/rules/00.core/52.ai-work-rules.md` (frontmatter requirements, hallucination prevention patterns, memory vs rules distinction).
- **AI Work Rules template hardening** — `.claude/rules/00.core/52.ai-work-rules.md` substantially expanded for stack/role/scenario coverage:
  - **New `## Safety & Security` section** (CRITICAL — overrides every other rule in the file): destructive commands (`rm -rf`, `git reset --hard`, `git push --force`, `DROP TABLE`, `npm publish`, migration `down`/`revert`, etc.) require explicit per-command user confirmation (re-confirmed each time, not blanket); secret files (`.env*`, `*.pem`, `*.key`, `id_rsa*`, credentials JSON) referenced by variable name only — never echoed/logged/committed.
  - **17 Hallucination Prevention patterns** (was 13 in v1.x; net +4 after removing 3 redundant). New patterns: hallucinated import (verify package manifest), wrong-version API (verify manifest **and** lockfile — `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`/`gradle.lockfile`/`poetry.lock`/`Pipfile.lock`/`uv.lock`), cross-config drift (env/config family glob across backend `.env*`/`application-*.yml`/`*settings.py` and frontend `environment*.ts`/`next.config.*`/`vite.config.*`/`nuxt.config.*`), server/client component boundary mixing (Next.js App Router `"use client"`, Nuxt server/client composables, Remix `loader`/`action` — N/A for pure SPA/backend), component prop hallucination (read the target's `interface Props`/`defineProps<>`/function signature first), hardcoded secrets (Grep regex `(api[_-]?key|token|password|secret)\s*=\s*["']\w+["']` before commit; use `process.env.X`/`os.getenv("X")`/`@Value("${X}")` instead), historical DB migration editing (Flyway `migrations/V*.sql`, Alembic `alembic/versions/*.py`, Rails `db/migrate/*.rb`, Prisma `prisma/migrations/*/migration.sql`, TypeORM `migrations/*.ts` — append-only once applied; verify with `flyway info`/`alembic history`/`prisma migrate status`).
  - **Backend/frontend balanced examples** throughout — `§ No Unsolicited Work` memory-dedup bullet now lists both backend (port numbers, pool sizes, handler names, transaction propagation modes) and frontend (dev server port, build output dir, env var prefixes `VITE_`/`NEXT_PUBLIC_`/`REACT_APP_`, route definitions, bundle size budgets); `§ Code/Document Generation Accuracy` framework-shape bullet covers backend (DTOs, entity field naming, repository method signatures) and frontend (component prop interfaces, store/state shapes for Pinia/Redux/Zustand, API response types, route param types, CSS module class names).
  - **3 internal contradictions resolved** with Exception clauses — `§1 Accuracy First` "always read directly" narrowed to "always read **critical facts** directly" with sub-agent delegation explicitly allowed for non-critical exploration; `§ No Unsolicited Work` "do not make unsolicited suggestions" gains *Exception: factual errors in this project's own docs (wrong paths, dead references, internally contradicting rules) MUST be reported even if not asked*; "do not directly read internal document directories" gains *Exception: read directly when the user explicitly asks or when debugging requires it*.
  - **`Project Architecture — Hands Off` section** consolidates the previous `3-Layer Design` + `Memory vs Rules` sections (11 bullets → 7) without losing the architectural defenses (cross-layer/same-layer duplication intentional, multi-rule reinforcement, `**/*` paths protection, minor wording differences not "inconsistency").
  - **Empty directory rule softened with marker convention** — intent markers (`.gitkeep`, `KEEP_EMPTY.md`, dir listed in CLAUDE.md as planned, or referenced by an active plan/standard/skills doc) required to qualify as "intentional"; otherwise the AI must ask before deleting. Prevents the previous absolute "all empty dirs are intentional" rule from masking genuine neglect.
  - **Planned reference rule softened** — `§ Planned References` "do not label as missing" gains *Exception: if a referenced path appears in 3+ documents and doesn't exist on disk, flag for human review* (parallel to the factual-error Exception above). Prevents typos from masquerading as planned references.
  - **`Established codebase conventions take precedence over textbook-ideal patterns`** rule added — modernization/refactoring/"current best practices" migration proposals require explicit user request (e.g., "modernize", "migrate to v3"); otherwise follow existing pattern even if a greenfield design would differ.
  - **Neighbor file pattern requirement** — before writing new code, read 2-3 neighboring files in the same directory for existing patterns (naming, error handling, logging, import order, return type idioms, test structure) and match them. Greenfield/textbook idioms come second to in-codebase consistency.
  - **`§ Hallucination Prevention` pattern 7 audience-agnostic** — "code examples in rules are essential" rationale changed from "vibe-coding workflows" (audience-dependent) to "AI-assisted code generation — reduces hallucination risk regardless of audience experience" (universal).
  - **§1 cleanup** — removed `Cross-check agent results against source documents` bullet (now a weaker restatement of the narrowed §1 #2 after Exception additions).
  - **16 regression tests** added to `tests/memory-scaffold.test.js` (21 → 37) pinning the structure (7 sections, 17 patterns, 1..17 numbering continuity), all required tokens (frontend state libs, env prefixes, lockfiles, migration patterns), Exception clauses, and removed-pattern guards to prevent silent reversion.
- **Pass 4 pipeline stage** — Generates L4 Memory scaffolding (memory files, 60.memory rules, doc-writing guide, CLAUDE.md append, master plan `50.memory-master.md`) from pass2-merged.json; Claude-driven with static fallback on failure.
- **New CLI subcommand**:
  - `memory compact | score | propose-rules`
- **Pass 3 completion marker** (`pass3-complete.json`) — Prevents regeneration of CLAUDE.md on subsequent `init` runs.
- **Pass 4 completion marker** (`pass4-memory.json`) — Tracks memory scaffold completion; enables resume/skip behavior across init runs.
- **Stale marker recovery** — Automatically detects and removes stale Pass 3/4 markers when underlying files (CLAUDE.md or memory/) are externally deleted.
- **v1.7.x migration** — Auto-backfills Pass 3 marker when upgrading from v1.7.x with existing CLAUDE.md to prevent overwrite.
- **New verification coverage** — content-validator section [9/9] checks memory scaffold integrity (file presence, entry structure, required fields with fence-aware parsing); pass-json-validator [5a] validates pass3-complete.json and [5b] validates pass4-memory.json.
- **Master plan file** — `plan/50.memory-master.md` aggregates all 4 memory files using `<file path="...">` blocks.
- **New library module** — `lib/memory-scaffold.js` (1006 LOC) containing memory/rule/plan/CLAUDE.md scaffolding with built-in multi-language translation via Claude CLI and strict translation validation (length, headings, code fences, frontmatter, CLI-parsed keywords).
- **Translation cache** — Scaffold translations are cached per-language in `claudeos-core/generated/.i18n-cache-<lang>.json` to avoid repeated Claude CLI calls on subsequent init runs.
- **Confidence scoring rewrite** — `memory propose-rules` replaces v1 saturating formula (`min(1, freq/10 + imp/20)`) with sigmoid on weighted evidence plus anchor-match multiplier (unanchored patterns × 0.6, missing importance caps evidence at 6).
- **Staged-rules workaround for `.claude/` sensitive-path block** — Pass 3 and Pass 4 now write rule files to `claudeos-core/generated/.staged-rules/**` instead of `.claude/rules/**`, because Claude Code's sensitive-path policy refuses direct `.claude/` writes from the `claude -p` subprocess (even with `--dangerously-skip-permissions`). The Node.js orchestrator (not subject to that policy) moves the staged tree into `.claude/rules/` after each pass via `lib/staged-rules.js`, with rename + copy-fallback for Windows cross-volume/overwrite edge cases.
- **`pass-prompts/templates/common/staging-override.md`** — Prepended to Pass 3/4 prompts as an absolute write-target redirect directive (preserves subpaths, leaves prose references and frontmatter `paths:` globs untouched).
- **Pass 3 silent-failure guards** — Four post-generation guards prevent writing `pass3-complete.json` on a partial success. All guards run AFTER the staged-rules move, BEFORE the marker write:
  - **Guard 1 (partial move):** if any staged file failed to move into `.claude/rules/`, throw `InitError` with retry guidance — next `init` re-runs Pass 3 automatically.
  - **Guard 2 (zero rules):** if `.claude/rules/` is empty after the move, treat it as Claude having ignored the `staging-override.md` directive and throw, instructing the user to re-run with `--force`.
  - **Guard 3 (H2 — incomplete guide/):** reject when any of the 9 expected guide files (list in `lib/expected-guides.js`) is missing or empty. Uses BOM-aware emptiness check (`.replace(/^\uFEFF/, "").trim().length === 0`) because `String.prototype.trim` doesn't remove U+FEFF (not in Unicode White_Space) — a BOM-only file would otherwise silently pass.
  - **Guard 3 (H1 — incomplete output):** reject when (a) `claudeos-core/standard/00.core/01.project-overview.md` sentinel is missing/empty, OR (b) `claudeos-core/skills/` has zero non-empty `.md` files, OR (c) `claudeos-core/plan/` has zero non-empty `.md` files. List in `lib/expected-outputs.js`. `database/` and `mcp-guide/` intentionally excluded (content-validator treats them WARNING-level; stacks legitimately skip).
- **Pass 2 resume validation (H3)** — On resume, `pass2-merged.json` is parsed and validated to have ≥5 top-level keys (mirrors `pass-json-validator`'s `INSUFFICIENT_KEYS` threshold) before Pass 2 is skipped. Skeleton `{}` or malformed JSON triggers file deletion + Pass 2 re-run instead of silently poisoning Pass 3's analysis input.
- **Pass 4 marker content validation (M1)** — `isValidPass4Marker` helper validates JSON shape + `passNum === 4` + non-empty `memoryFiles` array in both stale-detection and post-Claude-run gate. Rejects malformed bodies like `{"error":"timeout"}` that Claude could emit on partial failure; previously existence-only check would accept garbage and silently skip Pass 4 forever.
- **`dropStalePass4Marker` helper (M1)** — Pass 4 stale-marker unlink failures now surface as `InitError` with Windows file-lock guidance instead of being swallowed by `catch (_e) { /* ignore */ }`. Previously a locked file (AV scanner / editor holding the handle) would leave the stale marker in place, and the subsequent `fileExists(pass4Marker)` check would accept it → silent Pass 4 skip.
- **Pass 3 stale-marker unlink strictness** — Symmetric with Pass 4 above: `pass3-complete.json` cleanup (when CLAUDE.md is externally deleted) now throws `InitError` on unlink failure instead of being swallowed. Closes the same silent-skip class for Pass 3.
- **`CLAUDEOS_SKIP_TRANSLATION=1` env guard (M2)** — `lib/memory-scaffold.js` `translateIfNeeded()` short-circuits to throw with a clear lang-specific message when this env var is set, before any `claude -p` invocation. Intended as a test-only escape hatch so translation-dependent tests (e.g. `tests/lang-aware-fallback.test.js`) assert the "translation must throw" contract deterministically regardless of whether the `claude` CLI is authenticated in the test env. Strict `=== "1"` check (not truthy-coerce) to avoid surprise-triggering on common env conventions.
- **Early fail-fast for env+lang incompatibility** — `init.js` detects `CLAUDEOS_SKIP_TRANSLATION=1` combined with `--lang ≠ en` at language-selection time and throws `InitError` immediately with remediation (`unset CLAUDEOS_SKIP_TRANSLATION` or `--lang en`). Previously this combination would let the pipeline proceed and crash mid-Pass-4 with a confusing "translation skipped" error deep in the scaffolding stack.
- **CI workflow (M3)** — `.github/workflows/test.yml` runs `npm test` on `ubuntu-latest × windows-latest × macos-latest × Node 18/20` matrix with `CLAUDEOS_SKIP_TRANSLATION=1` set on the test step so translation tests pass without requiring `claude` CLI in the runner. Uses `npm ci` against the committed `package-lock.json`.
- **New shared library modules** — Single sources of truth for Pass 3 output expectations, preventing drift between enforcement and validation:
  - `lib/expected-guides.js` — 9 guide file paths. Imported by `init.js` Guard 3 H2 and `content-validator/index.js` `[5/9]` (no more hardcoded duplicates).
  - `lib/expected-outputs.js` — 3 additional Pass 3 outputs (standard sentinel, `skills/`, `plan/`) with `findMissingOutputs(projectRoot)` + `hasNonEmptyMdRecursive(dir)` helpers (BOM-aware). Imported by `init.js` Guard 3 H1.
- **Async claude execution + progress ticker** — `cli-utils.js` adds `runClaudePromptAsync` (spawn-based, non-blocking; lets a `setInterval` ticker run concurrently with the Claude subprocess) and `runClaudeCapture` (execSync wrapper that captures stdout, used by the translation engine in `memory-scaffold.js`). `init.js` adds `makePassTicker` with three display modes — elapsed-only, file-delta, and fixed-target (`N/M files (P%)`) — driving the per-pass `⏳`/`📝` progress line in TTY (`\r`-rewritten) and CI/piped (periodic newlines) environments.
- **`--force` and "fresh" resume cleanup** — Now also wipes `claudeos-core/generated/.staged-rules/` (leftover from a prior crashed Pass 3/4 run) and `.claude/rules/` (so Guard 2's zero-rules detection can't false-negative on stale rules from a previous run); under `"fresh"` mode the `pass3-complete.json` and `pass4-memory.json` markers are also unlinked so both passes re-execute. Manual edits to `.claude/rules/` are lost — acceptable under the explicit `--force`/`fresh` choice.
- **190+ new tests** (296 → 489) — New/expanded suites: `memory-scaffold.test.js`, `memory-command.test.js`, `pass4-prompt.test.js`, `pass3-marker.test.js`, `pass3-guards.test.js` (Guards 1/2 + Guard 3 H1/H2 with BOM coverage), `pass2-validation.test.js` (H3 structural check), `pass4-marker-validation.test.js` (M1 `isValidPass4Marker` + `dropStalePass4Marker` regression guards), `translation-skip-env.test.js` (M2 env guard + M3 CI workflow presence), `staged-rules.test.js`, `lang-aware-fallback.test.js` (sets `CLAUDEOS_SKIP_TRANSLATION=1` at module top to make translation-throw assertions deterministic), `placeholder-substitution.test.js`, plus expansions to existing suites.
- **Progress bar with ETA** — Pass 1/2/3/4 execution shows a progress bar with percentage, elapsed time, and ETA based on average step duration (carried over and extended from v1.7.0; Pass 4 added).
- **Platform/tier-split frontend detection (framework-agnostic)** — `scan-frontend.js` now recognizes `src/{platform}/{subapp}/` layouts where `{platform}` is either a device/target-environment keyword (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) or an access-tier keyword (`admin`, `cms`, `backoffice`, `back-office`, `portal`) — covers English names plus common Korean corporate abbreviations. The short `adm` abbreviation is deliberately excluded as too ambiguous in isolation; projects using `src/adm/` as an admin root should rename to `admin` or wait for the override-file mechanism planned for a future release. Emits one domain per (platform, subapp) pair named `{platform}-{subapp}`, with per-domain counts for `routes`/`components`/`layouts`/`hooks`. Runs as a shared pattern across **all** detected frontends (Angular, Next.js, React, Vue/Nuxt) — the glob uses a multi-extension filter (`{tsx,jsx,ts,js,vue}`) so Angular `.component.ts` files and Vue `.vue` files are captured alongside React `.tsx`. A minimum of 2 source files per subapp is required before a domain is emitted — single-file dirs under a platform root are almost always accidental and would otherwise produce noisy 1-file "domains" in the Pass 1 group plan. Subapp name is always read from the filesystem via `path.basename` at scan time — no project/brand identifiers are hardcoded. Structural dirs (`components`, `hooks`, `layouts`), FSD layers (`widgets`, `features`, `entities`), and framework router dirs (`app`, `pages`, `routes`, `views`, `screens`, `containers`, `modules`, `domains`) are skipped at the subapp level so deeper structures still reach their dedicated scanners. Ambiguous names like `store` are deliberately allowed because e-commerce projects legitimately use them as subapp names. **Behavior note:** the change is additive for projects whose `src/{platform}/{subapp}/` dirs were previously unreachable by the primary/FSD/components scanners — those projects now gain the new domains; projects whose content was already being captured by other scanners see no change (the skip list ensures `src/admin/pages/*`, `src/admin/components/*`, etc. still fall through to their existing scanners).
- **Deep routes-file fallback (Fallback E, framework-agnostic)** — Catches React Router file-routing projects (CRA/Vite + `react-router`) that don't match Next.js `page.tsx` or FSD layouts. When all primary scanners and Fallback A–D return 0, globs `**/routes/*.{tsx,jsx,ts,js,vue}` and groups by the parent-of-`routes` directory name. Also runs across all frontends (Angular/Next/React/Vue), not gated to any single framework. Generic parent names (`src`, `app`, `pages`) are filtered so the fallback emits meaningful feature/subapp names rather than framework-convention placeholders.
- **Shared scanner ignore lists** — `BUILD_IGNORE_DIRS` (node_modules, build, dist, out, .next, .nuxt, .svelte-kit, .angular, .turbo, .cache, .parcel-cache, coverage, storybook-static, .vercel, .netlify) and `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__` dirs) extracted as module-level constants. Both the platform scan and Fallback E consume these so build outputs and test fixtures don't inflate per-domain file counts or create spurious Fallback E hits.
- **Monorepo platform split** — Platform scan now matches three layouts: `src/{platform}/{subapp}/` (standalone), `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace with `src/`), and `{apps,packages}/{platform}/{subapp}/` (workspaces without a `src/` wrapper). Platform segment is located via `parts.findIndex` on the keyword list, so paths like `src/pc/admin/` correctly split into `pc` (platform) + `admin` (subapp) without mistaking the subapp name for another platform keyword.
- **Windows path glob fix across all scanners** — `dirGlobPrefix()` helper extracted to module scope and applied to every `${dir}**/*.ext` pattern (Angular primary + deep fallback, Next/React/Vue primary, FSD, components/*, Fallback C, Fallback D, platform scan). On Windows, glob v10+ returns backslash paths without a trailing slash, so the old `${dir.replace(/\\/g,"/")}**/*.tsx` pattern became `foo**/*.tsx` and only matched one level deep — silently missing nested files like `foo/routes/X.tsx` and (in some cases) spuriously matching sibling directories sharing the same prefix. The helper normalizes to `foo/**/*.tsx`, producing correct matches at any depth. Per-domain file counts may shift slightly in existing projects where this bug was masking under- or over-counts.
- **Skip-list tightening in primary scanners** — To keep deep fallbacks (Angular deep fallback, Fallback C) effective, structural container names now short-circuit the primary scans: `modules`/`features`/`pages`/`views` added to `skipAngularDirs`; `components`/`hooks`/`widgets`/`entities`/`features`/`modules`/`lib`/`libs`/`utils`/`util`/`config`/`types`/`shared`/`common`/`assets` added to the Next/React/Vue `skipPages` list. A path like `src/desktop/app/components/order/` now correctly emits `order` via Fallback C instead of the generic `components` domain from the primary pattern.
- **Project override file `.claudeos-scan.json`** — Optional file at project root allows extending scanner defaults without editing the tool:
  ```json
  {
    "frontendScan": {
      "platformKeywords": ["kiosk"],
      "skipSubappNames": ["legacy"],
      "minSubappFiles": 3
    }
  }
  ```
  All fields additive (user entries extend defaults, never replace). `minSubappFiles` overrides the default `2`. Missing file or malformed JSON silently falls back to defaults. Resolves the `src/adm/` → `admin` rename requirement raised when the `adm` short abbreviation was excluded from the built-in keyword list.

### Changed

- **4-Pass pipeline** — `init` now runs Pass 1 → Pass 2 → Pass 3 → Pass 4 (previously 3-Pass). Init banner updated to `Bootstrap (4-Pass)` and `totalSteps` recomputed as `totalGroups + 3`.
- **Directory count** — `init` now creates 28 directories (previously 26) with `claudeos-core/memory/` and `.claude/rules/60.memory/` added.
- **Verification tools extended** — sync-checker now tracks 7 directories (added `memory/`); manifest-generator scans and indexes the memory layer with `totalMemory` in the summary.
- **content-validator section count** — `[1/8]`–`[8/8]` re-numbered to `[1/9]`–`[9/9]` with a new section `[9/9] claudeos-core/memory/` performing fence-aware structural validation (decision-log heading dates, failure-pattern required fields).
- **CLAUDE.md output** — Pass 4 appends a new `## Memory (L4)` section (the `(L4)` marker is language-independent so the CLI fallback can detect it across all 10 supported languages).
- **Pass-3/Pass-4 prompts** — `pass3-footer.md` and the new `pass4.md` template are now wrapped with the `staging-override.md` directive so Claude redirects all `.claude/rules/` writes to the staging dir without dropping or rewriting prose references.
- **`bin/cli.js`** — `cmdInit` is now `async` and `await`ed; init flow uses the new async claude executor end-to-end so the per-pass tickers actually fire.

### Fixed

- **Glob pattern false-anchoring in memory preservation** — `isPreserved()` and `propose-rules` now skip glob patterns (`**/*`, `src/**/*.java`) when matching rule anchors against pattern bodies; a literal glob inside an entry's Fix line no longer makes every matching low-importance entry permanently preserved.
- **Fence-aware entry parsing** — memory.js `parseEntries()` and content-validator's memory checks now ignore `## ...` lines inside ```` ``` ```` / `~~~` code fences; example markdown inside a decision's body text is no longer parsed as a new entry.
- **Anchored regex for metadata fields** — `parseField()` and `parseDate()` require start-of-line + hyphen prefix for `frequency:` / `last seen:` / `importance:`; verbose prose containing these words (e.g., "set the frequency: 10 in config") is no longer picked up as the entry's meta value.
- **Fix line detection** — matches only `- Fix:` / `- **fix**:` / `- solution:` field format (not arbitrary `fix`/`prefix` substrings); a verbose line containing "fixing" no longer falsely satisfies the Stage 1 fix-line preservation check.
- **Stage 2 duplicate-merge persistence** — merged `frequency` sum and `lastSeen` max are now rewritten back into body lines before serialization; previously the in-memory merge was silently discarded on disk.
- **Stage 3 drop respects anchors** — low-importance aged entries anchored by an active rule path (concrete file path match) are no longer silently dropped.
- **Compaction section preservation** — `memory compact` only replaces the `## Last Compaction` section; user-added content that follows (e.g., project notes) is preserved.
- **Pass 3 marker write validation** — `init` now throws `InitError` if `pass3-complete.json` write fails (previously silently succeeded, causing next run to regenerate CLAUDE.md).
- **Silent Pass 3 marker on incomplete output** — `pass3-complete.json` could be written even when Claude truncated mid-response and `claudeos-core/guide/` was entirely empty (9 files missing). Root cause: step [8] content-validator ran with `ignoreError:true` so the 9 MISSING errors didn't block the "✅ Complete" banner; the next `init` run saw the marker + skipped Pass 3 permanently. Fixed by Guard 3 H2 (see Added). Also covers the same truncation pattern affecting `standard/`, `skills/`, `plan/` via Guard 3 H1.
- **Silent Pass 4 skip on malformed marker** — Claude can emit a partial-failure marker body like `{"error":"timeout"}` that still satisfies `fileExists()`. Previously this gated subsequent runs into skipping Pass 4 forever. Fixed by `isValidPass4Marker` content validation (see Added M1).
- **Silent Pass 3/4 skip on Windows file-lock** — Stale-marker `fs.unlinkSync` calls were wrapped in `catch (_e) { /* ignore */ }`. If antivirus or an editor held the file handle, the unlink threw, was silently swallowed, and the subsequent `fileExists(marker)` check accepted the stale marker → silent pass-skip. Both Pass 3 and Pass 4 now surface unlink failures as `InitError` with actionable "close the editor/AV scanner" guidance (see Added `dropStalePass4Marker` + Pass 3 symmetric fix).
- **Pass 2 resume accepting skeleton `{}`** — `init.js` previously only `fileExists()`-checked `pass2-merged.json` on resume. A prior crashed run that left a skeleton `{}` or malformed JSON would be accepted, poisoning Pass 3's analysis. Fixed by H3 (see Added).
- **Translation fallback safety** — when `--lang` is non-English, translation failures in the static fallback path now throw `InitError` instead of silently writing English content (contradicting the user's `--lang` choice).
- **Translation validation** — memory-scaffold rejects translations that lose ≥40% content length, drop >40% of headings, break code-fence count, lose required CLI-parsed keywords (`frequency:`, `last seen:`, `importance:`, `(L4)`), or break YAML frontmatter markers.
- **Placeholder substitution safety** — Pass 1 prompt placeholder substitution (`{{DOMAIN_GROUP}}`, `{{PASS_NUM}}`) and `injectProjectRoot`'s `{{PROJECT_ROOT}}` substitution both now use replacement functions so `$`, `$1`, `$&`, `$$` in domain names or project paths are preserved as literal characters rather than interpreted as regex back-references (same bug class as v1.6.x's `replaceFileBlock`).
- **Stale `.staged-rules/` from prior crashed runs** — Pass 3 and Pass 4 now wipe any leftover staging directory before running Claude, so a crashed prior run can't smuggle stale rule files into the move step alongside the fresh output.
- **Windows shell-escape warning (DEP0190)** — `runClaudePromptAsync` builds the spawn command as a single string with `shell: true` on Windows (so `claude.cmd`/`.ps1` shims resolve via PATH) and as separate args on Unix (no shell), eliminating Node 18+'s deprecation warning about mixing `shell:true` with an args array. Flags are hardcoded literals — no injection surface either way.
- **Pass 3 skipped under `--force` / "fresh" resume mode** — The v1.7.x→v2.0.0 backfill guard fired whenever `CLAUDE.md + pass2-merged.json` existed and the `pass3-complete.json` marker was missing, even when the marker was missing *because* `--force` or `"fresh"` had just deleted it. The guard re-wrote the marker, Pass 3 was skipped, and the project was left with a stale `CLAUDE.md` alongside freshly-regenerated `pass1/2` artifacts and wiped `.claude/rules/` — which then failed both `sync-checker` (Master Plan orphans) and `content-validator` (missing sections). `init.js` now tracks a `wasFreshClean` flag set by the `--force` and `"fresh"` cleanup branches and gates the backfill with `!wasFreshClean`, so explicit fresh requests always run Pass 3. The existing guard still covers the intended v1.7.x upgrade path. Regression test added in `tests/pass3-marker.test.js`.

### Migration notes

Existing v1.7.x projects are automatically migrated on the first `v2.0.0` `init` run:
- If `CLAUDE.md` and `pass2-merged.json` exist, `pass3-complete.json` is backfilled to preserve the existing `CLAUDE.md`.
- `claudeos-core/memory/` and `.claude/rules/60.memory/` are scaffolded by Pass 4 (or static fallback with Claude-driven translation when `--lang` is non-English).
- A new `## Memory (L4)` section is appended to the existing `CLAUDE.md`.
- No manual steps required.
- To force full regeneration, use `npx claudeos-core init --force`. Note that under v2.0.0, `--force` and `"fresh"` resume mode now also wipe `.claude/rules/` and `claudeos-core/generated/.staged-rules/` — manual edits to existing rule files will be lost. Back them up first if needed.

### Known constraints

- **`claude` CLI is now a hard requirement for non-English languages.** v1.7.x silently fell back to English when translation failed; v2.0.0 throws `InitError` instead. If `--lang` is non-`en`, ensure `claude` is installed and authenticated before running `init`. Use `--lang en` to bypass the translation requirement.
- **`.claude/rules/` writes from Claude `-p` are blocked by Claude Code's sensitive-path policy.** v2.0.0 works around this with the staged-rules mechanism. If you author custom Pass 3/4 prompts, prepend `pass-prompts/templates/common/staging-override.md` so writes are redirected to the staging dir.
- **`CLAUDEOS_SKIP_TRANSLATION=1` is a test-only escape hatch.** It short-circuits `translateIfNeeded()` to throw before invoking `claude -p`. If set in your shell accidentally (e.g. leftover from CI/test setup), `init` will fail fast when `--lang` is non-`en`. Remedy: `unset CLAUDEOS_SKIP_TRANSLATION` or run with `--lang en`. CI workflows can set it to keep translation tests deterministic without installing `claude`.

## [1.7.1] — 2026-04-11

### Added

- **Java scanner unit tests** — New `tests/scan-java.test.js` with 18 tests covering all 5 patterns (A/B/C/D/E), supplementary scan, skip list, root package extraction, MyBatis XML detection, DDD infrastructure/ detection, and full fallback
- **Flask dedicated template** — New `pass-prompts/templates/python-flask/` with pass1/pass2/pass3 prompts tailored for Flask (Blueprint, @app.route, application factory, g/current_app, before_request, WTForms, Flask-SQLAlchemy, Flask-Login, Jinja2); Flask no longer shares python-fastapi template
- **FastAPI/Flask flat project fallback** — `scan-python.js` now detects flat projects with `main.py` or `app.py` at root (or `app/main.py`) when no router files or subdomain structure exists; covers FastAPI official tutorial structure
- **Vite SPA primary path scanning** — `scan-frontend.js` now detects `src/views/*/`, `src/screens/*/`, `src/routes/*/` in primary scan; Vite SPA projects no longer fall through to Fallback D
- **296 tests** (287 → 296) — Added 9 new tests: Flask template selection, flat project fallback (5 cases), Vite SPA primary paths (3 cases)

### Fixed

- **Java scanner Windows path normalization** — `scan-java.js` added `norm()` function and `.map(norm)` to 9 glob calls; regex matching failed on Windows backslash paths for Pattern E (DDD/Hexagonal), root package extraction, and supplementary scan
- **Pattern E missing infrastructure/ detection** — `scan-java.js` Pattern E `mprGlob` now includes `{domain}/infrastructure/*.java` in addition to `adapter/out/{persistence,repository}/`
- **Flask misusing FastAPI template** — `selectTemplates()` now routes `framework: "flask"` to dedicated `python-flask` instead of `python-fastapi`
- **Completion banner alignment** — `Total time:` label spacing fixed to align with other rows

## [1.7.0] — 2026-04-11

### Added

- **Vite SPA support** — Full Vite detection pipeline: `stack-detector.js` detects `vite` from package.json dependencies and `vite.config.ts/js` fallback; `selectTemplates()` routes to dedicated `node-vite` template; `determineActiveDomains()` correctly classifies Vite as frontend-only
- **`node-vite` template** — New `pass-prompts/templates/node-vite/` with pass1/pass2/pass3 prompts tailored for Vite SPA (client-side routing, VITE_ env prefix, Vitest, static hosting deployment — no RSC/Server Actions/next.config)
- **Non-standard nested path scanning** — `scan-frontend.js` now detects pages, components, and FSD layers under `src/*/` paths (e.g., `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **No-hallucination guardrail** — `pass3-footer.md` enforces that Pass 3 may only reference technologies explicitly present in `project-analysis.json` or `pass2-merged.json`; inference from other detected libraries is prohibited
- **Skill orchestrator completeness guardrail** — `pass3-footer.md` enforces that orchestrator execution tables must list all sub-skill files with no gaps in the sequence
- **Progress bar with ETA** — Pass 1/2/3 execution now shows a progress bar with percentage, elapsed time, and estimated remaining time based on average step duration
- **Angular/Next.js default ports** — `defaultPort` logic now assigns 4200 for Angular and 3000 for frontend-only Next.js projects
- **Enriched Node.js scanner** — `scan-node.js` now classifies entities, modules, guards, pipes, and interceptors (NestJS-aware) in addition to controllers/services/dtos
- **Enriched Python scanner** — `scan-python.js` now classifies admin, forms, urls, and tasks (Django/Celery-aware) in addition to views/models/serializers
- **Fastify handler detection** — `scan-node.js` now counts `handler` files as controllers alongside controller/router/route

### Fixed

- **Vite SPA misclassified as Next.js** — `selectTemplates()` now routes `frontend: "react"` + `framework: "vite"` to `node-vite` instead of `node-nextjs`
- **Vite incorrectly assigned backend template** — Backend template fallback (`node-express`) now excludes `framework: "vite"`
- **Vite SPA marked as backend project** — `determineActiveDomains()` now excludes `framework: "vite"` from backend activation
- **Vite default port** — Port 5173 assigned for Vite instead of falling back to 8080
- **Vite triggers unnecessary backend scan** — `structure-scanner.js` now skips Node.js backend scanning when `framework: "vite"`
- **Frontend-only security-db activation** — `determineActiveDomains()` now activates `30.security-db` for frontend-only projects (auth/token/XSS standards are relevant); previously required a backend framework
- **FSD glob deduplication** — `scan-frontend.js` FSD layer scanning now uses Set-based deduplication matching the existing components pattern
- **269 tests** (256 → 269) — Added 13 new tests for Vite detection, template selection, non-standard paths, and active domain classification

## [1.6.2] — 2026-04-09

### Fixed

- **Sync command crash bypass** — `cli.js` sync throw from `cmdHealth`/`cmdValidate`/`cmdRestore`/`cmdRefresh` now correctly caught by `.catch()` handler; previously caused unhandled exception
- **`init.js` group.domains crash** — Null guard added for `group.domains` and `group.estimatedFiles` in domain-groups iteration; prevents TypeError on malformed `domain-groups.json`
- **Kotlin shared query resolution failure** — `scan-kotlin.js` full key (`__` separator) module names now converted back to path form (`/`) before file matching; `resolveSharedQueryDomains` was silently failing to find any files
- **Python scanner Windows glob failure** — `scan-python.js` added `dir.replace(/\\/g, "/")` for Django and FastAPI/Flask glob patterns; Windows `path.dirname` returns backslashes that break glob (same fix `scan-node.js` already had)
- **`prompt-generator.js` langData.labels crash** — Added null guard for `langData.labels` access; prevents TypeError when `lang-instructions.json` has `instructions` but missing `labels` key
- **Plan parser heading description leakage** — `plan-parser.js` `parseCodeBlocks` now strips trailing ` — description` / ` – description` / ` - description` from heading; previously included in `filePath`
- **Content validator regex escape** — `content-validator/index.js` regex character class now correctly escapes `[` and `]`; previously `[` was unescaped, causing runtime error when keyword contains `[`
- **Manifest generator CODE_BLOCK_PLANS count** — `plan-manifest.json` now uses `extractCodeBlockPathsFromFile` for code-block-format plans (e.g., `21.sync-rules-master.md`); `fileBlocks` count was always 0
- **Resume pass1/pass2 inconsistency** — When "continue" is selected but no pass1 files exist while pass2 does, pass2 is now deleted to force re-run; previously new pass1 + stale pass2 caused data mismatch
- **`--force` incomplete cleanup** — Now deletes all `.json` and `.md` files in `generated/` directory (not just pass1/pass2); ensures truly fresh start including stale prompts, manifests, and reports
- **Workspace path without wildcard** — `stack-detector.js` now handles concrete workspace paths (e.g., `packages/backend`) by scanning both direct and child `package.json` files; previously only glob patterns with `*` worked
- **Framework-less Python projects skipped** — `structure-scanner.js` now triggers Python scanner for all `language === "python"` projects; previously required `framework` to be `django`/`fastapi`/`flask`
- **Root directory router.py false domain** — `scan-python.js` now skips `name === "."` when `router.py` is in project root; previously created a domain named `.`
- **Sync checker null sourcePath** — `sync-checker/index.js` now skips mappings with null/undefined `sourcePath`; previously produced `path.join(ROOT, undefined)` = `"ROOT/undefined"`
- **Java Pattern B/D detection instability** — `scan-java.js` `detectedPattern` now determined by majority vote across all domains; previously depended on first `Object.keys` insertion order
- **Duplicate pass1 prompt overwrite** — `prompt-generator.js` deduplicates `activeTemplates` via `Set`; when backend and frontend share the same template, pass1 is generated once instead of being overwritten
- **Health checker stale-report overwrite** — Removed redundant `generatedAt` write that was overwriting `manifest-generator`'s `summaryPatch`; manifest-generator (run as prerequisite) already sets this key
- **Plan validator empty file creation** — `--execute` mode now skips file creation when plan block has empty/whitespace-only content; previously created blank files

## [1.6.1] — 2026-04-09

### Fixed

- **Path traversal hardening (Windows)** — `plan-validator` and `sync-checker` now use case-insensitive path comparison on Windows, preventing UNC/case-mismatch bypass of root boundary check
- **Null pointer crash in `stack-detector.js`** — `readFileSafe()` return value for `pnpm-workspace.yaml` now guarded; prevents crash when file exists but is unreadable
- **Empty pass3 prompt generation** — `prompt-generator.js` now early-returns with warning when pass3 template is missing, instead of silently writing header+footer-only prompt
- **Domain group boundary off-by-one** — `splitDomainGroups` changed `>=` to `>` for file count threshold; groups now fill up to exactly `MAX_FILES_PER_GROUP` (40) instead of flushing one file early
- **Perl regex injection in `bootstrap.sh`** — All placeholder substitution migrated from `perl -pi -e` to Node.js `String.replace()`; eliminates regex special character risk in domain names; `perl` is no longer a prerequisite
- **Flask default port** — `plan-installer` now maps Flask to port 5000 (was falling through to 8080)
- **Health-checker dependency chain** — `sync-checker` is now automatically skipped when `manifest-generator` fails, instead of running against missing `sync-map.json`
- **`pass-json-validator` null template crash** — Added null guard before `typeof` check; `null` no longer passes `typeof === "object"` gate
- **`pass-json-validator` missing backend frameworks** — Added `"fastify"` and `"flask"` to backend framework list; these stacks previously skipped backend section validation
- **Init error messages** — Pass 1/2/3 failure messages now include actionable guidance (check output above, retry with `--force`, verify prompt file)
- **Manifest-generator error context** — `.catch()` handler now prefixes error with tool name
- **Line counting off-by-one** — `statSafe()` and `manifest-generator stat()` no longer count trailing newline as an extra line
- **Windows CRLF drift** — `plan-validator` now normalizes `\r\n` → `\n` before content comparison; prevents false drift on Windows
- **`stale-report.js` mutation** — `Object.assign(ex.summary, patch)` replaced with spread operator to avoid in-place mutation
- **Undefined in sync-checker Set** — Malformed mappings with missing `sourcePath` no longer insert `undefined` into the registered paths Set
- **BOM frontmatter detection** — `content-validator` now strips UTF-8 BOM (`\uFEFF`) before checking `---` frontmatter marker
- **Health-checker stderr loss** — Error output now combines both `stdout` and `stderr` instead of preferring one
- **`bootstrap.sh` exit code preservation** — EXIT trap now captures and restores `$?` instead of always exiting 0
- **`bootstrap.sh` NODE_MAJOR stderr** — `node -e` stderr redirected to `/dev/null` to prevent parse failure from noise

## [1.6.0] — 2026-04-08

### Added

- **JS/TS monorepo support** — Auto-detect `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, `package.json#workspaces`; scan sub-package `package.json` for framework/ORM/DB dependencies; domain scanning covers `apps/*/src/` and `packages/*/src/` patterns
- **NestJS dedicated template (`node-nestjs`)** — Separate analysis prompts for `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI container, CQRS, `Test.createTestingModule`; previously shared `node-express` template
- **Vue/Nuxt dedicated template (`vue-nuxt`)** — Separate analysis prompts for Composition API, `<script setup>`, Pinia, `useFetch`/`useAsyncData`, Nitro server routes, `@nuxt/test-utils`; previously shared `node-nextjs` template
- **Elapsed time tracking** — CLI shows per-pass elapsed time and total time in completion banner
- **169 new tests** (87 → 256) — Full coverage for `scan-frontend.js` (4-stage fallback), `scan-kotlin.js` (CQRS, shared query resolution), `scan-node.js`, `scan-python.js`, `prompt-generator.js` (multi-stack), `lang-selector.js`, `resume-selector.js`, `init.js`, `plan-parser.js`, monorepo detection
- **README updates (10 languages)** — Updated all README files (en, ko, zh-CN, ja, es, vi, hi, ru, fr, de) to reflect new stacks table (NestJS/Vue split), monorepo root execution, facade/usecase/orchestrator detection, template structure, 3 new FAQ entries, 256 test count

### Fixed

- **Windows backslash glob in `scan-kotlin.js`** — glob returns backslash paths on Windows, causing multi-module detection to silently fail; added `norm()` normalization (no-op on Unix)
- **Kotlin module key collision** — When same module name exists under different parents (e.g., `servers/command/api-server` + `servers/query/api-server`), both entries now upgrade to full key; `domainMap` merges counts instead of overwriting
- **Java facade/usecase/orchestrator detection** — `scan-java.js` now detects `facade/`, `usecase/`, `orchestrator/` directories as service-layer (previously only `aggregator/`)
- **Verification tools exit code** — 4 tools (`content-validator`, `plan-validator`, `sync-checker`, `pass-json-validator`) now exit(1) on unexpected errors instead of exit(0); `health-checker` wrapped in try/catch

### Changed

- **`lib/plan-parser.js`** (new) — Extracted shared `parseFileBlocks`, `parseCodeBlocks`, `replaceFileBlock`, `replaceCodeBlock`, `CODE_BLOCK_PLANS` from `manifest-generator` and `plan-validator`; eliminates duplicate code across 2 files
- **`lib/stale-report.js`** (new) — Extracted shared `updateStaleReport()` from 6 verification tools; eliminates copy-paste pattern
- **`cli-utils.js`** — `ensureDir` and `fileExists` now delegate to `lib/safe-fs.js` (single source of truth)
- **`prompt-generator.js`** — Removed dead strip regex (no template matched these patterns)
- **`init.js` process.exit refactoring** — `process.exit(1)` replaced with `throw InitError`; `lang-selector.js` and `resume-selector.js` return `null` instead of calling `process.exit()`; all errors handled centrally in `cli.js`

## [1.5.1] — 2026-04-06

### Fixed
- **Remove 13 bare catch blocks** — `catch { }` → `catch (_e) { }` across 9 files; enables error variable access during debugging
- **Windows backslash glob fix (3 locations)** — `scan-frontend.js` missing `dir.replace(/\\/g, "/")` at App/Pages Router (line 63), FSD (line 84), and components (line 98) scans; other locations already had this fix
- **Pattern C flat MyBatis XML detection** — `scan-java.js` xmlGlob now matches flat XML layout (e.g., `mapper/OrderMapper.xml`) in addition to domain subdirectory layout for Pattern C projects
- **Next.js reserved segment false positives** — Added `not-found`, `error`, `loading` to `skipPages` in `scan-frontend.js` to prevent Next.js App Router reserved directories from being detected as domains
- **cap variable shadowing** — Renamed outer-scope `cap` to `capDn` in `scan-java.js` to avoid shadowing the block-scoped `cap` in Pattern C branch

### Changed
- **Gradle DB detection comment** — Added 2-line comment explaining postgres/sqlite exclusion rationale in `stack-detector.js` line 118

## [1.5.0] — 2026-04-05
- feat: initial release claudeos-core v1.5.0