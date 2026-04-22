# Changelog

## [2.3.1] — 2026-04-23

Patch release. Fixes Windows CI breakage in `npm test`.

- **CI — cross-platform `npm test`**. Windows cmd.exe does not expand `*`
  glob patterns, so `node --test tests/*.test.js` received the literal
  string and exited 1 on every Windows runner. Replaced with a thin
  `scripts/run-tests.js` wrapper that uses the existing `glob` dep to
  enumerate test files before forwarding to `node --test`. Also replaced
  the `pretest` `2>/dev/null` stderr redirect (which spuriously triggered
  "The system cannot find the path specified" on Windows) with a Node
  `try/catch` so the probe is silent on all platforms. No new dependencies.

No source, template, or test changes. Test count unchanged at 662.

## [2.3.0] — 2026-04-23

Adds language-invariant structural validation for generated `CLAUDE.md`.
Dogfooding v2.2.0 on a Korean-output Vite + React project (`frontend-react-A`)
surfaced the §9 L4-memory re-declaration anti-pattern *despite* the scaffold,
expanded blocklist, and post-generation self-check all being present in the
embedded Pass 3 prompt. Root cause: forbidden-section enforcement depended
on the LLM matching English canonical labels (`"Memory Layer (L4)"`) against
its own translated output (`"메모리 (L4)"`, `"メモリ (L4)"`, etc.) — a
natural-language equivalence judgment the LLM does not perform reliably
across 10 supported languages.

Dogfooding v2.3.0's initial build on a sibling project (`frontend-react-B`,
same organization, same language, same stack family) then surfaced a second
multi-repo invariant failure: the §9 problem was fixed, but the *wording*
of section headings drifted freely. One project's §7 read
`"DO NOT Read (직접 읽지 말아야 할 파일)"` while the sibling's read
`"읽지 말 것 (Files Not to Be Read Directly)"`. Both were "equivalent in
meaning" per the scaffold, but `grep "## 7. DO NOT Read"` matched the
first and missed the second — multi-repo discoverability broken.

v2.3.0 addresses both failures by shifting structural enforcement from
LLM self-check to deterministic code-level validation that does not depend
on natural-language matching, and adds a cross-repo title-determinism
invariant (English canonical primary + optional translation parenthetical).

Continued dogfooding on `frontend-react-B` then surfaced two more failure
classes unrelated to CLAUDE.md structure:

1. **Path hallucination in rules/standard**. Pass 3 generated rule files
   referencing `src/feature/routers/featureRoutePath.ts` when the actual
   file was `src/feature/routers/routePath.ts`. Root cause: the LLM saw
   the parent directory `src/feature/` and a TypeScript constant
   `FEATURE_ROUTE_PATH` and "renormalized" the filename to match. Pre-v2.3.0
   validation did not check whether path claims resolved to real files.

2. **MANIFEST ↔ CLAUDE.md §6 Skills drift**. Four skills registered in
   `claudeos-core/skills/00.shared/MANIFEST.md`, only one of them
   mentioned in CLAUDE.md §6. No existing tool detected the mismatch.

Both are now detected by a new `content-validator [10/10] path-claim
verification` check. The check uses only structural signals (backticked
paths, file-system existence, MANIFEST vs CLAUDE.md cross-reference) —
no natural-language matching, so it works identically for all 10 output
languages.

Running the initial v2.3.0 build against `frontend-react-B` surfaced a
third, upstream issue in the frontend domain scanner. The project has
a single-SPA layout (`src/admin/{api,context,dto,routers,pages/*}/`,
plus a separate `src/guide/` for documentation). The subapp scanner,
designed for dual-platform layouts (`src/pc/admin/` + `src/mobile/admin/`),
interpreted `admin` as a platform keyword and emitted the architectural
layers beneath it as pseudo-domains: `admin-api`, `admin-context`,
`admin-dto`, `admin-routers`. That fragmented one SPA into 5+ spurious
domains and, critically, primed Pass 3 to fabricate filenames with the
`admin` prefix — the root cause of the `featureRoutePath.ts` hallucination
pattern. v2.3.0 adds a single-SPA detection rule: when only ONE distinct
platform keyword matches across the project tree, subapp emission is
suppressed by default, and feature domains are left to the downstream
page/FSD/components scanners to discover correctly.

Running the v2.3.0 build against `backend-java-spring` then surfaced a
long-standing resume bug in the init pipeline. When a prior `init` run
is interrupted mid-Pass-3 — most commonly a stream idle timeout during
the 3d-aux (database + mcp-guide) stage — `pass3-complete.json` is
persisted in partial form (`mode: "split"`, `groupsCompleted: [...]`,
no `completedAt`). On the next run, the init orchestrator branched
solely on `fileExists(pass3Marker)` and fell into the "skip" branch
for any existing marker, even partial ones. The result: remaining
Pass 3 stages never ran, `database/` and `mcp-guide/` directories
were left empty, and the final `pass3-complete.json` retained the
partial shape — which `pass-json-validator` later caught as a
`MISSING_KEY: completedAt` error after the fact. v2.3.0 fixes the
orchestrator to inspect marker contents: when the marker is partial,
`runPass3Split` is re-invoked and its internal `groupsCompleted`
logic resumes from the next unstarted stage; only fully-completed
markers are skipped.

Finally, the full v2.3.0 pipeline run against `frontend-react-B` (14
domains, Korean output) surfaced a structural regression the validator
itself caught and flagged: `## 9. 메모리 운영 (L4)` appeared in
`CLAUDE.md` as a re-declaration of the memory file table already
present in Section 8. This was the exact anti-pattern v2.3.0 was
designed to prevent, now reappearing despite the scaffold's explicit
constraints. Root-cause analysis traced it to a legacy Pass 4
behavior preserved from pre-v2.3.0: `pass4.md` instructed the LLM to
**append** a new `## N. ... (L4)` section to `CLAUDE.md`, and
`init.js` also called `appendClaudeMdL4Memory()` from
`lib/memory-scaffold.js` as a static fallback doing the same. Both
predated the current Pass 3 scaffold design where Section 8 "Common
Rules & Memory (L4)" is authored directly by Pass 3 and is the single
canonical home for both the Common Rules table and the L4 Memory
file table + workflow. With Pass 3 already writing that content,
every additional Pass 4 append produced the [S1]/[M-*]/[F2-*]
duplications the validator was built to catch. The validator was
working correctly; the generator was self-contradicting. v2.3.0 fix:
retire the Pass 4 CLAUDE.md append path completely. Pass 4 continues
to generate memory files, memory rules, and the doc-writing guide,
but never touches `CLAUDE.md`. The `appendClaudeMdL4Memory()` export
is preserved as a no-op for any external caller depending on its
signature.

Post-retirement dogfooding on `frontend-react-B` surfaced a final class
of issue: four `STALE_PATH` errors in Pass 4-generated rule and
standard files (`src/feature/main.tsx` assumed from Vite convention;
`src/feature/routers/featureRoutePath.ts` invented by prepending the
parent directory name to the filename; `src/components/utils/classNameMaker.ts`
fabricated as a plausible-sounding utility). The root cause was
parallel to the §9 issue: Pass 3's path grounding rules live in
`pass3-footer.md`, which Pass 4 never reads. Pass 4 was invoking
prior training knowledge to fabricate concrete paths instead of
grounding them in `pass3a-facts.md`. v2.3.0 adds `pass3a-facts.md`
as a mandatory read for Pass 4, plus a dedicated "Path fact
grounding" CRITICAL section in the prompt with all three flagship
hallucination anti-patterns documented as explicit ❌ examples.
The guidance also teaches the positive pattern: when in doubt,
scope a rule to a directory (`src/admin/api/`) rather than
inventing a specific filename.

Re-running `init` on `backend-java-spring` with the Fix A build proved
path-grounding works in practice — STALE_PATH dropped from the
expected 4 to 0 across all Pass 4-generated rule and standard
files — but left 8 MANIFEST_DRIFT errors in place. Analysis
traced these to a structural ordering problem, not an LLM
compliance problem: Pass 3b writes CLAUDE.md Section 6 BEFORE
Pass 3c generates the skills directory + `MANIFEST.md`. When a
skill ships as an orchestrator + sub-skills pair — e.g.
`10.backend-crud/01.scaffold-crud-feature.md` plus eight
sub-skills under `scaffold-crud-feature/` — Pass 3b cannot
enumerate the sub-skills because they don't exist yet, and
forcing it to predict filenames would just move the problem
into a new form of hallucination (it would write
`01.entity.md` while Pass 3c emits `01.dto.md`, etc.).

The correct design is role-separated: `CLAUDE.md` Section 6 is an
**entry point** that names categories and orchestrators; `MANIFEST.md`
is the **authoritative registry** for the full sub-skill list. v2.3.0
implements both halves of this split:

1. `content-validator [10/10]` gains an orchestrator-aware
   exception: a registered sub-skill is suppressed from
   `MANIFEST_DRIFT` when its orchestrator (matching
   `{category}/{*}.{parent-stem}.md`) is referenced anywhere in
   CLAUDE.md. Integrity checks (`STALE_SKILL_ENTRY` for missing
   files, unrelated-parent drift) are preserved.

2. `pass3b-core-header.md` gains a "CLAUDE.md Section 6 — Skills
   sub-section (entry point only)" guidance block that tells the
   LLM to list only MANIFEST + orchestrators, never to predict
   sub-skill filenames, and that cites the v2.3.0 validator's
   exception so the instruction and the detection layer remain
   in lockstep.

Together, Fix A (Pass 4 path grounding) and Fix B
(orchestrator/sub-skill exception + §6 guidance) close the last
two classes of dogfood-observed content-validator errors. The
remaining validator surface continues to enforce the strict
invariants — fabricated paths, missing skill files, unrelated-
parent drift, §9 re-declaration, T1 heading drift, etc. — without
relaxation.

Re-running `init` on `frontend-react-B` with the Fix A + Fix B
build produced `0 MANIFEST_DRIFT` (Fix B suppressed all 8
sub-skill drift rows) but left 1 residual `STALE_PATH` in
`claudeos-core/standard/50.verification/02.testing-strategy.md`
referencing `src/__mocks__/handlers.ts`. Analysis showed a
library-convention hallucination class that the original three
anti-patterns did not cover: testing documents reach for MSW /
Vitest / Jest / React Testing Library conventional paths even
when the project has zero test coverage and no such files exist.
Analogous traps exist for `styling-patterns.md` (global
stylesheet/theme files) and `state-management.md` (store
bootstrap files). v2.3.0 adds a "Library-convention hallucination
class" block to both `pass3-footer.md` and `pass4.md` documenting
the four concrete MSW/testing anti-patterns plus the three
trigger document types, and the positive pattern: when
`pass3a-facts.md` has no concrete test/style/store files listed,
describe testing/styling/state guidance in abstract terms
(directory scope or role-based) without naming a specific path.

Final validation pass on both dogfood projects with the complete
v2.3.0 build:

- `frontend-react-B` (Korean output, 14 frontend domains,
  dual-entry Vite + React 19, single-SPA admin layout,
  scaffold-page-feature orchestrator with 8 sub-skills):
  **12 errors → 0 errors** (100% improvement), full health
  check green, 25/25 CLAUDE.md lint checks passed.
- `backend-java-spring` (Korean output, 8 backend domains,
  Java 17 + Spring Boot + MyBatis, scaffold-crud-feature
  orchestrator with 8 sub-skills, multi-dialect DB migration
  in progress): **8 errors → 0 errors** (100% improvement),
  full health check green, complete first-try run in 45m 29s
  including the resume-from-partial-marker code path hitting
  for the first time from a real-world partial Pass 3 run.

Both projects exercise distinct v2.3.0 code paths (Fix A + Fix B,
single-SPA rule, Pass 3 resume, library-convention anti-pattern,
orchestrator/sub-skill exception), and both settled at 0 errors
without any manual file edits to the generated output. This is
the first release where the full end-to-end pipeline produces a
clean `content-validator [10/10]` report on real-world sibling
Korean projects — the core criterion for v2.3.0 being
publish-ready.

### Added

- **`claude-md-validator/`** (new package, ~430 lines across 3 files).
  Post-generation structural validator for `CLAUDE.md`. Every check uses
  only signals that survive translation:
  - **Markdown syntax**: `^## `, `^### `, `^#### `, `^```` — not localized.
  - **Literal file names**: `decision-log.md`, `failure-patterns.md`,
    `compaction.md`, `auto-rule-update.md` — never translated.
  - **Counts and table-row positions**: section count, sub-section count
    per section, memory-file table-row count inside vs outside Section 8.
  The same validator, byte-for-byte, produces identical verdicts on a
  `CLAUDE.md` generated in English, Korean, Japanese, Vietnamese, Hindi,
  Russian, etc. — proven by cross-language bad-case fixtures in the test
  suite.
  - `structural-checks.js` — individual check functions (`checkH2Count`,
    `checkH3Counts`, `checkH4Counts`, `checkMemoryFileUniqueness`,
    `checkMemoryScopedToSection8`, `checkSectionsHaveContent`,
    `checkCanonicalHeadings`) plus a fence-aware section splitter
    (`splitByH2`) that correctly ignores `##` lines inside ``` and
    `~~~` code blocks.
  - `index.js` — high-level `validate(path)` API and standalone CLI entry.
    Transparently strips a leading UTF-8 BOM (U+FEFF) from the input
    before running checks, so CLAUDE.md files written by Windows editors
    or cross-platform generators validate identically to those without
    a BOM (otherwise the first `## ` reads as `\ufeff## ` and silently
    under-counts by one).
  - `reporter.js` — human-readable report formatter with remediation
    guidance for every failure class.

- **`npx claudeos-core lint`** command. Runs the structural validator
  against `CLAUDE.md` at the project root. Exit code 0 on pass, 1 on fail
  — suitable for CI pipelines. The command renders per-failure remediation
  guidance so users can fix issues directly without re-running the full
  4-Pass pipeline.

- **`bin/commands/lint.js`** (new). Wraps the validator for CLI use;
  delegates to `claude-md-validator/` so the validator remains usable
  as a library from other contexts (future `init` auto-lint, CI action,
  etc.).

- **T1 — Canonical heading invariant (cross-repo title determinism).**
  Each of the 8 `## N.` section headings in every generated `CLAUDE.md`
  must contain the English canonical token for that section, regardless
  of the `--lang` output language. A native-language translation may be
  appended in parentheses but MUST NOT replace the English canonical as
  primary text. Required tokens:
  `§1=Role Definition, §2=Project Overview, §3=Build, §4=Core Architecture,
  §5=Directory Structure, §6=Standard, §7=DO NOT Read, §8=Memory`.
  The validator enforces this via `checkCanonicalHeadings` (IDs `T1-1`
  through `T1-8`), and the scaffold documents it as a mandatory format
  rule reinforced by Pass 3 POST-GEN CHECK step 4b. This closes a
  multi-repo discoverability gap discovered during `frontend-react-B`
  dogfooding: sibling projects generated §7 as `"DO NOT Read (직접 읽지
  말아야 할 파일)"` and `"읽지 말 것 (Files Not to Be Read Directly)"`
  respectively — both "equivalent in meaning" but breaking
  `grep "## 7. DO NOT Read"` across the organization's repos.

- **`content-validator [10/10]` — path-claim + MANIFEST drift.**
  A new check appended to the existing 9-stage validator in
  `content-validator/index.js`. Single check, two failure classes:
  - **`STALE_PATH`** — any `src/...\.(ts|tsx|js|jsx)` reference
    appearing in `.claude/rules/**/*.md` or
    `claudeos-core/standard/**/*.md` must resolve to a real file on
    disk. Fenced code blocks (``` and ~~~) and placeholder paths
    (`src/{domain}/feature.ts`) are excluded, matching the scaffold
    convention that placeholders stand for scaffold examples, not
    actual project paths.
  - **`STALE_SKILL_ENTRY`** — every skill path registered in
    `claudeos-core/skills/00.shared/MANIFEST.md` (extracted from
    backticked `claudeos-core/skills/...` references) must exist on
    disk. `MANIFEST.md` itself is excluded from the set to avoid
    self-reference false positives.
  - **`MANIFEST_DRIFT`** — every skill registered in MANIFEST must be
    mentioned somewhere in CLAUDE.md. The check looks at the whole
    body (not just §6 Skills) to avoid depending on sub-section
    heading wording, which varies by output language.
  The check is intentionally language-invariant: it uses literal
  file-path patterns and file-system existence, never parsing section
  headings or reasoning about Korean/Japanese/etc. text.

- **`bin/commands/init.js` — Guard 4 (non-blocking).** After Pass 4 and
  structural lint, init runs `content-validator` in a child process
  and surfaces the summary inline. If drift is detected, init prints a
  pointer to `stale-report.json` and the standalone command to re-run
  — but does NOT throw, unset `pass3-complete.json`, or abort the run.
  This is a deliberate choice: LLM hallucinations may not be
  deterministically fixable by re-running Pass 3, so a blocking guard
  would deadlock users in an `init --force` loop. The detection signal
  (non-zero `content-validator` exit code + stale-report entry) is
  sufficient for CI pipelines and human triage.

- **`pass-prompts/templates/common/pass3-footer.md` — Path fact
  grounding (MANDATORY).** Two new CRITICAL blocks added:
  - The parent-directory prefix anti-pattern (the exact
    `featureRoutePath.ts` case from frontend-react-B dogfooding) is
    documented with ✅/❌ examples and explanation of *why* the LLM
    mis-infers (TypeScript identifier name vs filename are
    independent — the constant `FEATURE_ROUTE_PATH` does not imply
    filename `featureRoutePath.ts`).
  - The MANIFEST ↔ CLAUDE.md §6 symmetry rule is stated explicitly,
    with post-generation enforcement noted (`content-validator [10/10]
    → MANIFEST_DRIFT`).

- **`plan-installer/scanners/scan-frontend.js` — Single-SPA detection
  rule.** The subapp scanner was designed for dual-platform layouts
  (same subapp implemented for two platforms, e.g., `src/pc/admin/`
  + `src/mobile/admin/` → `pc-admin`, `mobile-admin`). When applied
  to a single-SPA project (only one platform keyword matches, as in
  `frontend-react-B`'s `src/admin/...`), the scanner misinterpreted the
  SPA's architectural layers (`api`, `context`, `dto`, `routers`) as
  subapps and emitted them as pseudo-domains — both cluttering the
  domain plan and priming Pass 3 toward filename hallucinations with
  the platform-name prefix.
  - **New behavior**: before the subapp-emission loop, count the
    number of distinct platform keywords present in the project.
    When the count is ≤ 1, skip subapp emission entirely and let
    downstream scanners (pages, FSD, components, fallback) identify
    real feature domains within the single SPA.
  - **Opt-out**: `.claudeos-scan.json` accepts a new override
    `frontendScan.forceSubappSplit: true` to restore the legacy
    single-platform emission for projects that genuinely treat the
    lone platform's children as feature domains.
  - **No change to multi-platform behavior**: two or more distinct
    platform keywords (e.g., `pc` + `mobile`) trigger subapp
    emission exactly as before.

- **`bin/commands/init.js` — Pass 3 split-partial resume fix.** The
  orchestrator previously decided whether to invoke `runPass3Split`
  by checking only `fileExists(pass3-complete.json)`. Any existing
  marker — including partial markers from a prior run's timeout —
  fell into the "skip" branch, causing the remaining Pass 3 stages
  to never execute on re-run. The detection block at the top of
  that function already identified partial markers and logged
  "runPass3Split will resume" but the actual call was gated by the
  broken check, so the log was misleading.
  - Now the orchestrator inspects the marker body: if
    `mode === "split"` and `completedAt` is absent, `runPass3Split`
    is invoked and its existing `groupsCompleted` tracking resumes
    from the next unstarted stage. Only markers with `completedAt`
    set are skipped.
  - This repairs the dogfood case where Pass 3d-aux timed out
    mid-stream on `backend-java-spring`: on the next `init`, stages 3a-3c
    were correctly preserved but 3d-aux was silently skipped,
    leaving `claudeos-core/database/` and `claudeos-core/mcp-guide/`
    empty and the marker stuck in partial shape.

- **`tests/pass3-marker.test.js` — 6 new regression tests** covering
  the resume-decision classification function: absent marker → fresh
  run; split-partial (no `completedAt`) → resume; fully completed →
  skip; empty `groupsCompleted` still counts as partial; malformed
  JSON → safe skip; non-split mode → skip.

- **Pass 4 CLAUDE.md append retirement.** Changes span three files:
  - `pass-prompts/templates/common/pass4.md` — the "Append a new
    section to existing `CLAUDE.md`" instruction block is removed
    wholesale and replaced with a mandatory prohibition block
    ("CLAUDE.md MUST NOT BE MODIFIED") that names the exact
    validator errors ([S1], [M-*], [F2-*]) that this prohibition
    prevents, and explains that Section 8 in Pass 3's output is the
    single canonical home for the Common Rules table and the L4
    Memory table/workflow. The remaining output sections are
    renumbered (section 12 → 11). The Output Discipline section
    loses its "Do NOT overwrite CLAUDE.md content — **append only**"
    bullet, which is replaced with "Do NOT touch CLAUDE.md."
  - `bin/commands/init.js` — the two call sites of
    `appendClaudeMdL4Memory()` (inside `applyStaticFallback()` and
    inside the Pass 4 gap-fill path) are removed. The
    `gapResults` reporting no longer includes a `CLAUDE.md#(L4)`
    entry. The `require` destructure drops the function.
  - `lib/memory-scaffold.js` — `appendClaudeMdL4Memory()` is
    converted to a 3-line no-op that returns `true`
    unconditionally. The function's public signature, name, and
    module export are preserved so any external caller continues
    to work; an extensive deprecation comment documents why the
    behavior was retired and points at the validator errors it
    was causing. The `CLAUDE_MD_APPEND` template constant is left
    exported for test compatibility but is now unreferenced by
    production code.
  This fix closes the final regression surfaced by end-to-end
  dogfooding on `frontend-react-B`: the validator was correctly
  reporting an `S1` (9 sections) and four `M-*`/`F2-*` errors
  against a `CLAUDE.md` whose second memory table had been
  appended by Pass 4, not written by Pass 3. The fix keeps the
  validator strict and removes the duplication at its source.

- **`tests/pass4-claude-md-untouched.test.js`** (new, 5 tests). A
  dedicated suite guarding the retirement against regression. Tests
  cover: the `pass4.md` prompt no longer contains the "Append a new
  section" instruction and DOES contain the "MUST NOT BE MODIFIED"
  prohibition; `init.js` neither imports nor calls
  `appendClaudeMdL4Memory`; the retired function's contract (always
  returns `true`, never mutates `CLAUDE.md`) holds under happy path,
  missing-file, and empty/structured-input variants.
  Complementary updates: 8 legacy `appendClaudeMdL4Memory` tests in
  `tests/memory-scaffold.test.js` are consolidated into a single
  retirement contract test; 3 lang-aware tests in
  `tests/lang-aware-fallback.test.js` are rewritten to verify the
  lang-invariant no-op semantics; one `generatePrompts` test in
  `tests/pass4-prompt.test.js` is flipped from "prompt contains
  CLAUDE.md append instructions" to "prompt contains the
  prohibition and does NOT contain the legacy append header".

- **Pass 4 path fact grounding (MANDATORY).** `pass4.md` now includes
  `pass3a-facts.md` in its required-reads list at the top of the
  prompt (previously only `project-analysis.json` and
  `pass2-merged.json` were listed), and adds a full `## CRITICAL —
  Path fact grounding (MANDATORY)` section below the header. The
  section states the rule first — every `src/...` path written in a
  rule or standard file must appear verbatim in `pass3a-facts.md` or
  `pass2-merged.json` — then documents the three flagship
  hallucination anti-patterns observed in `frontend-react-B`
  dogfooding: Vite-convention assumption (`src/feature/main.tsx`),
  parent-directory prefix (`src/feature/routers/featureRoutePath.ts`),
  and plausible-but-unverified utility (`src/components/utils/classNameMaker.ts`).
  Each anti-pattern is accompanied by the concrete mechanism that
  caused it ("invented based on Vite's stock convention";
  "prepending the parent directory name to the filename"; etc.) so
  the LLM sees both the output to avoid and the reasoning to avoid.
  The positive pattern — "when in doubt, scope a rule to a
  directory (`src/admin/api/`) rather than inventing a filename" —
  is documented explicitly, and the section cross-references the
  downstream enforcement (`content-validator [10/10]` →
  `STALE_PATH`) so the LLM understands the validator will reject
  fabricated paths. Guarded in tests by a new `generatePrompts`
  assertion that all three anti-patterns, the MANDATORY tag, the
  positive pattern, and the validator cross-reference are present
  in the rendered pass4 prompt.

- **Orchestrator/sub-skill MANIFEST-drift exception.** Changes
  span two files:
  - `content-validator/index.js` — Stage 2 of the MANIFEST drift
    check (MANIFEST ↔ CLAUDE.md cross-reference) now recognizes
    the orchestrator/sub-skill layout pattern. A registered skill
    whose path matches
    `claudeos-core/skills/{category}/{parent-stem}/{NN}.{name}.md`
    is considered covered when CLAUDE.md mentions an orchestrator
    file anywhere under the same `{category}/` whose basename
    (minus any leading `NN.`) equals `{parent-stem}`. The
    exception is scoped narrowly: it applies ONLY to
    `MANIFEST_DRIFT`, and ONLY to sub-skills under a confirmed
    orchestrator match. Integrity checks continue to fire at full
    strength — `STALE_SKILL_ENTRY` for registered sub-skills
    whose files are missing from disk, and `MANIFEST_DRIFT` for
    standalone skills (sub-skill paths whose parent stem does not
    match any referenced orchestrator).
  - `pass-prompts/templates/common/pass3b-core-header.md` — a new
    "CLAUDE.md Section 6 — Skills sub-section (entry point only)"
    block tells Pass 3b to list only `MANIFEST.md` plus
    orchestrator files in Section 6, never to predict sub-skill
    filenames (which don't exist yet at Pass 3b time because
    Pass 3c hasn't run). The guidance explains both failure modes
    — hallucinated filenames and silent staleness — and cites the
    `content-validator` exception so the prompt-side and detector-
    side are consistent.
  This fix closes the final class of dogfood-observed errors on
  `backend-java-spring` (8 MANIFEST_DRIFT rows, all for
  `scaffold-crud-feature/0N.*.md` sub-skills) and the equivalent
  shape on `frontend-react-B` (8 rows under
  `scaffold-page-feature/0N.*.md`). The structural
  `CLAUDE.md §6 = entry, MANIFEST = registry` split also
  eliminates the recurring regeneration churn where adding or
  renaming a sub-skill in Pass 3c would otherwise have required
  CLAUDE.md to be rewritten.

- **`tests/content-validator.test.js` — 5 new orchestrator/sub-skill
  exception tests.** Coverage: (1) orchestrator mentioned +
  sub-skills registered → 0 drift (backend-java-spring replica);
  (2) orchestrator mentioned + one sub-skill file deleted → still
  emits 1 `STALE_SKILL_ENTRY` (integrity not suppressed);
  (3) orchestrator NOT mentioned → all 5 registered skills drift
  (control case — exception requires orchestrator reference);
  (4) sub-skill under a parent stem that does NOT match any
  referenced orchestrator → still drifts (guard against
  over-exception); (5) sibling layout — a standalone "playground"
  skill, not a sub-skill of the referenced orchestrator — still
  drifts (guard against conflating one-level-deep standalone
  skills with sub-skills).

- **Library-convention hallucination class (MSW / Vitest / Jest /
  RTL hotfix).** Extends the Fix A anti-pattern block in
  `pass4.md` and mirrors the same guidance into `pass3-footer.md`
  so Pass 3b and Pass 4 both observe the same rule when they
  generate `testing-strategy.md`, `styling-patterns.md`, or
  `state-management.md`. The block documents four concrete
  library-convention traps — `src/__mocks__/handlers.ts`,
  `src/test/setup.ts`, `src/test-utils.tsx`, `src/setupTests.ts` —
  and explicitly names the three trigger document types that
  most often produce this class of hallucination. The positive
  rule: if `pass3a-facts.md` has no concrete test/style/store
  file listed, describe guidance by role (a shared setup module
  under a test directory of your choice) rather than by name,
  and defer concrete paths until the files actually exist.
  Regression-guarded by expanded assertions in
  `tests/pass4-prompt.test.js` that verify all four MSW/testing
  anti-patterns, the library-ecosystem naming, the
  testing-specific positive pattern, and the
  pass3a-facts.md-based negation ("these paths do not exist")
  are all present in the rendered prompt.

- **`tests/content-validator.test.js`** (new, ~270 lines). 10
  regression tests across 3 describe blocks:
  - Path-claim positive and negative cases (hallucination detected;
    fenced examples, placeholders, and existing paths do not trigger).
  - MANIFEST drift scenarios (stale entry, drift, referenced skill,
    self-reference exclusion, absent MANIFEST).
  - Full frontend-react-B simulation: 2 STALE_PATH + 2 STALE_SKILL_ENTRY
    + 3 MANIFEST_DRIFT, asserted with exact counts to prevent silent
    regression as the validator evolves.

- **`tests/claude-md-validator.test.js`** — structural invariant tests
  parameterized across all 10 supported output languages. Coverage includes:
  valid fixtures for each `--lang` code; bad fixtures in 6 languages
  demonstrating identical error signatures (§9 anti-pattern detected
  byte-for-byte the same regardless of script); fence-aware section
  splitting against both ``` and ~~~ fences; table-row vs prose-mention
  disambiguation; file-not-found handling; and T1 title-determinism
  coverage (scaffold/validator token alignment, English-only acceptance,
  anti-pattern rejection, case-insensitivity, graceful skip when section
  count is wrong).

- **Language-independence proof fixtures** under `tests/fixtures/claude-md/`
  covering all 10 supported output languages:
  - Valid fixtures (same 8-section structure, different languages, all
    following the T1 canonical-heading format `## N. <English canonical>
    (<translation>)`): `valid-en.md`, `valid-ja.md`, `valid-zh-CN.md`,
    `valid-es.md`, `valid-vi.md`, `valid-hi.md`, `valid-ru.md`,
    `valid-fr.md`, `valid-de.md`, plus `frontend-react-A-fixed.md`
    (Korean, real dogfooding case with §9 removed and headings
    retrofitted to T1 format). Each passes the same 25 structural
    checks — empirical proof of language invariance across CJK,
    Cyrillic, Devanagari, Latin, and Vietnamese scripts.
  - Bad fixtures (same valid structure + §9 memory re-declaration
    appended): `frontend-react-A-bad.md` (Korean, real), `bad-ja.md`,
    `bad-zh-CN.md`, `bad-ru.md`, `bad-hi.md`, `bad-es.md`. All six
    produce a **byte-for-byte identical 9-error signature**
    (1 S1 + 4 M-* + 4 F2-*), confirming the validator detects the
    same anti-pattern independently of output language and script.

### Changed

- **`bin/cli.js`** — registers the `lint` command, help text updated,
  examples include the new command.

- **`bin/commands/init.js`** — automatically invokes the structural
  validator after Pass 4 completes. Failures are reported inline but
  do NOT abort the run; the generated content is preserved and the
  user is pointed at `npx claudeos-core lint` for full remediation
  guidance or `init --force` for regeneration. This design choice
  follows Rule B (idempotency): lint is informational at install time,
  advisory at lint time, blocking only in CI contexts.

- **`package.json`**:
  - `version` → 2.3.0.
  - `files` includes `claude-md-validator/` so the module ships with
    the npm package.
  - `scripts.lint` convenience alias for `node bin/cli.js lint`.
  - `scripts.test` pattern updated to `node --test tests/*.test.js`
    (was the bare directory form, which fails on Node 22+).

### Prevention layer (prompt-time improvements)

Detection alone (the validator above) catches §9 after it is already
written. v2.3.0 also reduces the probability that LLMs write §9 in the
first place, by reshaping the Pass 3 prompt so the structural signal is
less ambiguous. These changes are complementary to the validator: the
validator is the guaranteed safety net, the prompt improvements lower
how often that net is needed.

- **`plan-installer/prompt-generator.js`** — `demoteScaffoldMetaHeaders()`
  utility added. When embedding `claude-md-scaffold.md` into the Pass 3
  prompt, scaffold meta-section headings (`## Why this scaffold exists`,
  `## Hard constraints`, `## Per-section generation rules`,
  `## Validation checks`, `## Examples`, `## Usage from pass3 prompts`,
  etc.) are demoted from `##` to `###`. The demotion is code-block-aware:
  `##` lines inside ``` or ~~~ fences are preserved so the scaffold's
  Template structure example (`## 1. Role Definition` ... `## 8. Common
  Rules & Memory (L4)`) remains intact.

  Rationale: a pre-v2.3.0 Pass 3 prompt contained **40+ `##` headings**
  (scaffold meta + footer sections + phase instructions + 8 canonical
  example headings). The LLM, tasked with writing a CLAUDE.md whose
  target structure has exactly 8 `##` sections, was pattern-matching
  against a prompt that modeled `##` as a very common structural unit —
  an implicit signal that extra `##` sections were natural. After
  demotion the Pass 3 prompt contains approximately 12 `##` headings,
  of which **exactly 8 are the scaffold's canonical target inside the
  fenced Template example**. The LLM now sees "the ## level is used for
  exactly 8 things in this prompt, and those 8 things are the sections
  I must write" — a far cleaner mapping between prompt structure and
  desired output structure.

- **`pass-prompts/templates/common/pass3-footer.md`** —
  `POST-GENERATION CHECK` block rewritten as an imperative 5-STEP
  procedure (count → assert → repair → verify → external validation),
  with `LANGUAGE-INVARIANT and TITLE-INVARIANT` explicitly named as
  a core property. The repair step supplies a concrete action matrix
  keyed to the surplus section's content type (memory-file references →
  DELETE; rule-summary content → MERGE into Section 8 sub-section 1;
  procedural/enforcement content → MOVE to `.claude/rules/*`). STEP 5
  announces the v2.3.0+ external validator as a safety net while
  clarifying the LLM should not rely on it — structure must be correct
  at write time.

- **`pass-prompts/templates/common/pass3-footer.md`** — FORBIDDEN
  `##`-level section list rewritten to stop depending on an English-
  label blocklist. The new framing states the RULE first (no `##` may
  have a title whose semantic category is "rules", "memory", "L4",
  "guardrails", or any rephrasing), then gives concrete **translated
  examples in Korean, Japanese, and Chinese** (`메모리 (L4)`,
  `メモリ (L4)`, `记忆层 (L4)`, and analogues for Common Rules). The
  goal is to make the LLM's translation decision explicit: it must
  apply the forbidden rule to its translated heading, not just the
  English original. A DECISION RULE block at the end gives a 3-step
  check the LLM runs before writing any `##` heading.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** — the
  "L4 Memory Files (Re-declaration)" anti-pattern reference (which,
  by naming the anti-pattern explicitly, paradoxically risked priming
  the LLM to reproduce it — a "pink elephant" failure mode) was
  replaced with a positively-phrased "Section 8 single-occurrence
  rule": the L4 Memory Files table, Memory Workflow, and Common Rules
  meta-summary table each appear EXACTLY ONCE, with their canonical
  home named explicitly. Two `no "Re-declaration" duplicate` phrases
  in the validation checklist were similarly simplified to
  `appear EXACTLY ONCE in the whole document`.

- **`tests/prompt-generator.test.js`** — 3 new tests covering the
  demotion utility:
  - Meta-section `##` headers outside fences are demoted to `###`
  - `##` headers inside ``` and ~~~ fenced blocks are preserved
  - Real scaffold embedded into real pass3-prompt produces < 25 `##`
    headings total and preserves all 8 canonical example sections.

- **`tests/claude-md-validator.test.js`** — parameterized across all
  10 supported languages. 10 valid-fixture tests (one per `--lang` code)
  plus 5 bad-fixture tests (ko/ja/zh-CN/ru/hi/es each asserting the
  identical 9-error signature).

Total tests: **662. All pass.**
(v2.2.0 baseline 602 + v2.3.0 net additions 60 = 662. The "net"
accounting reflects that 8 legacy `appendClaudeMdL4Memory` behavior
tests were consolidated into a single no-op contract test when that
function was retired; the full set of new tests added across v2.3.0
totals 68 across path-claim verification, single-SPA scanner,
Pass 3 resume classification, Pass 4 CLAUDE.md immutability,
Pass 4 path fact grounding, and the orchestrator/sub-skill
MANIFEST-drift exception.)

### Why this matters

The §9 re-declaration anti-pattern was the flagship problem v2.2.0 aimed
to solve, and the scaffold + prompt-level blocklist reduced incidence
substantially. Dogfooding on a real Korean-output project produced a
`CLAUDE.md` with `## 9. 메모리 (L4)` anyway — the LLM successfully matched
`## 8. 공통 규칙 및 메모리 (L4)` as its Section 8, then created a §9
section whose title (`메모리 (L4)`) was not semantically recognized as
equivalent to the blocklisted English `"Memory Layer (L4)"`.

Extending the fix by maintaining per-language blocklists would create
unbounded maintenance surface: 10 supported languages × 6-8 forbidden
labels × every future phrasing variant. Each new language addition
would require re-auditing the entire translation table. Each miss
re-introduces the bug.

The v2.3.0 approach sidesteps this entirely. A post-generation code-level
validator that reasons about markdown syntax and literal file names does
not need a per-language dictionary. The same 22 checks run identically on
Korean, Japanese, English, or any future language added to the `--lang`
flag. Proof: the validator produces a byte-for-byte identical 9-error
signature when applied to synthesized Japanese §9 and the actual Korean
§9 that triggered this investigation. See the fixtures for reproducible
evidence.

This also aligns the final Pass of the pipeline with claudeos-core's core
principle **"LLMs guess, code confirms"**. Earlier passes already enforce
this: stack-detector confirms LLM-guessed ports via `.env.example` parsing
(v2.2.0), pass2-merged.json grounds the stack facts in real files (v2.0).
Pass 3/4 output structure was the remaining gap — LLM generates it, and
no code confirmed the result. v2.3.0 closes that gap without sacrificing
Pass 3/4's generative flexibility: LLM still writes content; code now
confirms the structural invariants hold.

v2.3.0 ships both a detection layer (the validator) and a prevention
layer (the prompt-time improvements listed under "Prevention layer"
above). The prevention layer reshapes the Pass 3 prompt so the LLM
sees a cleaner mapping between prompt structure and target output
structure — primarily by demoting scaffold meta-section `##` headers
to `###` when embedded, cutting the prompt's total `##` count from
40+ down to about 12, of which exactly 8 are the canonical section
examples the LLM must reproduce. This does not eliminate structural
drift (LLM output is probabilistic), but it reduces the rate at which
the detection layer has to fire. The two layers together form a belt-
and-suspenders design: prevention lowers baseline incidence, detection
guarantees a clear user-visible signal when incidence > 0.

### Migration

No regeneration required. v2.3.0 is purely additive — the validator
runs on existing v2.2.0-generated `CLAUDE.md` files and flags drift
where present.

- **For new projects**: `npx claudeos-core init --lang <code>` runs lint
  automatically at the end; inspect any flagged drift before committing.
- **For existing v2.2.0 projects**: `npx claudeos-core lint` runs the
  validator against the current `CLAUDE.md` and reports issues. No code
  changes to `CLAUDE.md`, `.claude/rules/`, or `claudeos-core/*` are made
  — the validator is read-only.
- **For projects with flagged drift**: regenerate via
  `npx claudeos-core init --force`, or hand-edit using the per-failure
  remediation guidance the validator emits.

CI-friendly exit codes: `lint` returns 0 on pass and 1 on fail, suitable
for a GitHub Actions step or pre-commit hook.

### Notes

- The validator is deliberately narrow in scope: it verifies *structural*
  invariants, not semantic correctness. Content quality (Section 1 Level-2
  abstraction discipline, Section 4 pattern-naming accuracy, etc.) remains
  the scaffold's and the LLM's responsibility. A future release may add
  complementary content-level checks.
- The table-row-based detector distinguishes the L4 Memory Files *table*
  declaration from prose mentions of memory filenames in Section 8's
  workflow steps. A prior iteration during implementation flagged every
  mention as a duplicate (false-positive on normal valid output); the
  final design matches only markdown table-row patterns (`| \`...memory/X\` |`),
  which produce clean true-positive signals on the real bad fixture and
  zero flags on all three good fixtures.
- Fenced code block handling in `splitByH2` was validated against the
  embedded scaffold in `pass3-prompt.md` itself, which contains an
  example CLAUDE.md structure (`## 1. Role Definition` ... `## 8. ...`)
  inside a ```markdown fence. Without fence-awareness, this would inflate
  any section count run against the prompt — a reminder that markdown
  validators must understand markdown, not just regex-match headings.

---

## [2.2.0] — 2026-04-21

Adds deterministic CLAUDE.md structure. Generated `CLAUDE.md` files now follow
an 8-section scaffold with fixed titles and order, driven by `pass-prompts/
templates/common/claude-md-scaffold.md`. Content within each section still
adapts to the project, but the structural skeleton no longer drifts between
projects or runs.

### Added

- **`pass-prompts/templates/common/claude-md-scaffold.md`** (new, ~630 lines).
  Single source of truth for CLAUDE.md structure. Defines the 8 sections
  (Role Definition / Project Overview / Build & Run Commands / Core
  Architecture / Directory Structure / Standard · Rules · Skills
  Reference / DO NOT Read / Common Rules & Memory (L4); titles are
  emitted in the project's output language), per-section generation
  rules, dynamic substitution variables (`{PROJECT_NAME}`,
  `{OUTPUT_LANG}`, `{PROJECT_CONTEXT}`), and a post-generation validation
  checklist. Section 8 has TWO required sub-sections: a Common Rules
  sub-section (meta-summary table of `paths: ["**/*"]` universal rules)
  and an L4 Memory sub-section (memory file table + workflow). All 12 stack-specific Pass 3 prompts
  now delegate CLAUDE.md structure to this scaffold and supply only
  stack-specific hints (2-4 lines each).

- **`lib/env-parser.js`** (new). Parses `.env*` files into structured
  `{port, host, apiTarget, vars, source}` used by stack-detector. Search
  order prefers `.env.example` (committed, canonical) over local `.env`
  variants. Port detection recognizes 16+ convention variable names across
  Vite, Next.js, Nuxt, Angular, Node, and Python frameworks. Exposes
  utilities (`parseEnvContent`, `extractPort`, `extractHost`,
  `extractApiTarget`, `readStackEnvInfo`) plus a sensitive-variable
  filter (`isSensitiveVarName`, `redactSensitiveVars`) that redacts
  values of PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/PRIVATE_KEY-style
  variables to a `***REDACTED***` sentinel before the vars map reaches
  any downstream consumer. DATABASE_URL is whitelisted for
  stack-detector back-compat. 39 unit tests in `tests/env-parser.test.js`
  (30 core + 9 redaction).

### Changed

- **All 12 Pass 3 prompts** (`angular/`, `java-spring/`, `kotlin-spring/`,
  `node-express/`, `node-fastify/`, `node-nestjs/`, `node-nextjs/`,
  `node-vite/`, `python-django/`, `python-fastapi/`, `python-flask/`,
  `vue-nuxt/`). Two separate changes per file:
  1. The previous 5-bullet CLAUDE.md generation block (`- Role definition`,
     `- Build & Run Commands`, `- Core architecture diagram`, `- {stack item}`,
     `- Standard/Skills/Guide reference table`) is replaced by a scaffold
     reference plus stack-specific hints. The `CRITICAL — CLAUDE.md Reference
     Table Completeness` warning above the block is also removed (the
     scaffold's validation checklist supersedes it).
  2. The `40.infra/*` `paths` frontmatter spec is split per-file. Previously
     all three infra rules (environment-config, logging-monitoring, cicd-
     deployment) received the same category-level `paths` value, which caused
     the logging-monitoring rule to never auto-load on source code edits
     (its `paths` only matched `.env`, `*.config.*`, `*.json`, `*.yml`,
     `Dockerfile*` — none of which are source files). Per-file paths now
     match each rule's actual guardrail target: environment-config → env/
     config files, logging-monitoring → source code extensions (`.ts`/`.tsx`/
     `.py`/`.java`/`.kt` per stack), cicd-deployment → CI YAML + source.

- **`pass-prompts/templates/common/pass3-footer.md`** — five new `CRITICAL`
  blocks added:
  - **`00.standard-reference.md` Composition**: scopes the mechanical
    standards index strictly. REQUIRES a forward reference to
    `claudeos-core/standard/00.core/04.doc-writing-guide.md` (generated
    by Pass 4 but indexed at Pass 3 time to prevent a gap between passes).
    FORBIDS a redundant "DO NOT Read / context waste" section inside
    `00.standard-reference.md` — that information belongs solely in
    CLAUDE.md Section 7, which is both more complete (includes project-
    specific build-output and external-module paths) and not reloaded
    on every edit. The 6 stacks (java-spring, kotlin-spring, node-express,
    node-nextjs, python-django, python-fastapi) whose Pass 3 prompts
    previously hardcoded a `## DO NOT Read` block in the reference file
    have been cleaned up.
  - **`.env` Is the Source of Truth for Runtime Configuration**: when
    `pass2-merged.json` contains `stack.envInfo`, ports/hosts/API targets
    declared in the project's `.env.example` MUST be used over framework
    defaults. Affects Section 2's table, Section 3's inline run-command
    comments, and any rule referencing port values (e.g., CORS origins
    in auth rules).
  - **Rule `paths` Must Match Rule Content**: enforces that each rule's
    `paths` frontmatter matches the file types its guardrails actually
    target. Explicitly prohibits copying `paths` across sibling rule files
    in the same category, and tells the LLM to re-verify "when should
    Claude Code auto-load this rule?" as the criterion for paths. Added
    because a category-level paths shortcut in earlier Pass 3 prompts
    caused the logging-monitoring rule to never match source code edits.
  - **CLAUDE.md Scaffold Compliance**: enforces the 8-section structure at
    generation time. Explicitly forbids adding sections with titles like
    "Required to Observe While Working", "Rules Summary", "Documentation
    Writing Rules", "AI Common Rules", "L4 Memory Integration Rules",
    "Common Rules", or any title whose category meaning is "rules"
    beyond the 8 fixed section names (the same blocklist is applied in
    every output language, matching on the translated equivalents).
    Adds a mandatory post-generation check (count `^## ` headings; must
    equal 8; merge surplus into the correct section or move to `rules/*`
    / `standard/*`). The expanded blocklist closes a rename loophole
    discovered during dogfooding on a Vite + React frontend project
    where the LLM appended a §9 whose title combined "Documentation
    Writing + AI Common Rules + Memory Layer (L4)" to collect
    rule-related content.
  - **CLAUDE.md Does Not Duplicate Rules**: clarifies that CLAUDE.md
    describes structure, not enforcement. Lists four categories of content
    that do NOT belong in CLAUDE.md (coding rules, domain-specific rules,
    multi-file sync rules, work procedures) and points each to its proper
    home in rules/standard/skills/guide.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** (in addition to
  the new-file Add above) was tightened after initial dogfooding:
  - Hard constraints section now leads with **"EXACTLY 8 SECTIONS. No more,
    no less."** plus a recovery procedure for surplus sections.
  - Section 6 Rules sub-section explicitly notes that the
    `.claude/rules/00.core/*` wildcard row already COVERS
    `51.doc-writing-rules.md` and `52.ai-work-rules.md` — eliminating the
    perceived need to create a separate section enumerating those rules.
  - Validation checks section lists common surplus section patterns with
    target destinations so the LLM can act rather than just detect.

- **`plan-installer/prompt-generator.js`** — embeds the scaffold inline
  into `pass3-prompt.md` at generation time. The 12 stack-specific Pass 3
  templates and `pass3-footer.md` both reference
  `pass-prompts/templates/common/claude-md-scaffold.md` by path, but that
  path is relative to the claudeos-core package, not the user project.
  The generator now reads the scaffold and inserts it between the Phase 1
  fact-table block and the stack-specific body, wrapped in explicit
  `# === EMBEDDED: claude-md-scaffold.md ===` markers so the LLM can locate
  it. Without this embed the scaffold references would point to a file
  Claude Code cannot resolve at runtime. Load is optional (`existsSafe`)
  so a missing scaffold does not crash generation — the rest of the
  prompt is still produced, just without the deterministic structure
  enforcement.

- **`plan-installer/stack-detector.js`** — now calls `readStackEnvInfo`
  before returning and attaches the result as `stack.envInfo` on
  project-analysis.json. When the project's `.env.example` (or fallback
  `.env`) declares a port AND no earlier detector won (Spring Boot
  application.yml still takes precedence), the parsed port is promoted
  to `stack.port`. This closes a long-standing gap where Vite projects
  that customized their dev port via `.env` (e.g., `VITE_DESKTOP_PORT=3000`)
  received the framework-default 5173 in CLAUDE.md.
  Host and API target values are also captured for downstream use.

- **`plan-installer/index.js`** — port resolution precedence documented
  in code comments. The existing `defaultPort` fallback chain (Vite 5173,
  Next.js 3000, Django 8000, etc.) is now explicitly labeled "last resort"
  and runs only when neither stack-detector's direct detection (Spring
  application.yml) nor the env-parser populated `stack.port`.

- **`pass-prompts/templates/common/claude-md-scaffold.md`** Section 2
  (Project Overview) and Section 3 (Build & Run Commands) rules now
  reference `stack.envInfo` as authoritative for port/host/API-target
  values. Section 2 requires env-annotated rows in the project overview
  table when the project declares them (e.g., `| Dev Server Port | 3000
  (VITE_DESKTOP_PORT) |`), and Section 3 requires inline port comments
  next to run commands to match the env-declared value. Framework defaults
  are explicitly labeled "last resort" in both rules.

### Why this matters

When claudeos-core was applied to three sibling projects in the same
organization (one Spring Boot backend, two Vite + React frontends), the
generated files were content-correct — standards, rules, and skills
accurately captured each project's patterns — but the `CLAUDE.md` files
had different section counts (8, 8, 9), different section names, and
different section orders. Claude Code reads CLAUDE.md first on every
session; inconsistent structure across repos made it harder for
developers (and Claude Code) to know where to look for a given piece of
information. v2.2.0 fixes the structure while leaving content
project-specific.

The removed "Required to Observe While Working" section was a symptom
of the same problem: different projects put different rules there, most
of which duplicated
content already in `.claude/rules/*` (auto-loaded) or `claudeos-core/
standard/*` (detailed patterns). Removing it eliminates a redundant
maintenance surface and reinforces the "one rule, one home" principle.

Dogfooding also uncovered a latent paths bug. The `40.infra/*` rules
shared a single category-level `paths` frontmatter that only matched
config/infra file extensions (`.env`, `*.config.*`, `*.json`, `*.yml`,
`Dockerfile*`). This meant the logging-monitoring rule — whose guardrails
cover `console.log` misuse, PII in logs, and `catch {}` swallowing —
never auto-loaded when editing `.ts`/`.tsx`/`.py`/`.java` files, i.e.,
exactly when it was needed. The rule body was correct; its activation
trigger was mis-scoped. v2.2.0 now specifies per-file `paths` in the Pass
3 prompts and adds a `Rule paths Must Match Rule Content` CRITICAL block
to the footer so future rules cannot inherit the wrong scope by default.

A third dogfooding finding exposed a different layer of the same
philosophy violation. The stack detector parsed Spring Boot's
`application.yml` for `server.port`, but for Node/Vite projects it
simply used a hardcoded framework default (Vite → 5173) whenever no
Spring-style config was found — even when the project declared its
actual port in `.env.example` (e.g., `VITE_DESKTOP_PORT=3000`). This
meant CLAUDE.md's §2 table and §3 run-command
comments showed the Vite theoretical default instead of what the project
actually runs. The root cause was structural: the detector had no
`.env` parser beyond a DATABASE_URL check for DB identification. v2.2.0
introduces `lib/env-parser.js` with convention-aware port/host/API-target
extraction, and the scaffold and footer now treat `.env.example` as the
canonical source of runtime configuration — framework defaults are
last-resort only. This also captures host and API-target values that
previously never appeared in generated CLAUDE.md at all.

A fourth dogfooding iteration on a Spring Boot backend project
(regenerated with the interim v2.2.0 scaffold that only allowed a single
Section 8 titled "Memory (L4)") found the LLM producing a §9 titled
"Common Rules & Memory (L4)" — even with the expanded blocklist from
the earlier frontend-project fix.
The §9 contained both (a) a meta-summary table of `paths: ["**/*"]`
rules (51.doc-writing-rules + 52.ai-work-rules) and (b) a restated L4
memory table labeled "L4 Memory Files (Re-declaration)". Close
inspection showed (a) was genuinely useful content the scaffold had no
legitimate home for — a developer-facing summary of which rules
auto-load on every edit, complementary to Section 6's directory index.
The LLM kept inventing §9 because the information it wanted to convey
was real. v2.2.0 resolves this by promoting Section 8 to "Common Rules
& Memory (L4)" with two required sub-sections: one for common rules
auto-loaded on every edit (meta-summary only, not rule bodies) and one
for L4 memory referenced on-demand. This acknowledges that "which rules
auto-load universally" is a legitimate meta-information category that
deserves a visible home, while keeping the always-8-sections contract
intact. The duplicate §9 "re-declaration" anti-pattern is now
explicitly named and forbidden in both the scaffold
and the footer.

Finally, the same backend-project inspection also surfaced two smaller
but real bugs in `00.standard-reference.md` generation. First, 6 of the
12 Pass 3 stack prompts hardcoded a `## DO NOT Read (context waste)`
section at the bottom of the reference file — a shadow of CLAUDE.md
Section 7 that was less complete (missed project-specific paths like
`build/` or external modules) and lived at the wrong layer: `00.standard-
reference.md` reloads on every edit via `paths: ["**/*"]`, while
Section 7 loads once per session. Second, `claudeos-core/standard/00.
core/04.doc-writing-guide.md` is generated by Pass 4 (Required output
#12) but never appeared in the Pass 3-generated reference index, creating
a gap the moment Pass 4 ran. v2.2.0 adds a `00.standard-reference.md
Composition` CRITICAL block to the footer that codifies: (a) always
include the Pass 4 forward reference, (b) never include a DO NOT Read
section (Section 7 is the single source of truth), (c) keep the per-
edit payload minimal (paths only, no descriptions — descriptions live
in Section 6 which is session-time budget). The 6 inline hardcoded
DO NOT Read blocks have been removed from the stack prompts and
replaced with explicit inline notes pointing to the footer rule.

Three additional risks surfaced during pre-release cross-checking
and were addressed in the same release cycle. **First**, the scaffold's
"Section 6 Rules: Always include 60.memory/*" directive, added during
Section 8 redesign, was not echoed in the 12 stack Pass 3 prompts'
rule-category listings — so the LLM received conflicting signals
(scaffold says include, stack prompt doesn't mention it). Real dogfooding
on the backend project confirmed the category was being omitted from
the generated CLAUDE.md §6 Rules table. v2.2.0 fixes both sides: each stack
Pass 3 prompt now explicitly lists `60.memory/*` as a forward-reference
rule category (generated by Pass 4, but indexed at Pass 3 time), and the
scaffold's Sub-section 2 guidance is strengthened with an example row
and a "mandatory — do NOT omit" note. **Second**, the existing Migration
guidance mentioned `--force` but did not explain why `npx claudeos-core
init` (without `--force`) silently fails to adopt v2.2.0 improvements on
upgrades. Under Rule B idempotency, existing generated files are skipped
as "already exists", meaning users running plain `init` on a v2.1.x
project see no visible change. v2.2.0 adds (a) a dedicated "upgrade
detected" warning in bin/commands/init.js that fires when a pre-v2.2.0
CLAUDE.md is detected before the resume/fresh prompt, and (b) an expanded
Migration section in CHANGELOG that makes the `--force` requirement and
preservation semantics (memory/ content kept, generated files replaced)
explicit. **Third**, the new `.env.example` → CLAUDE.md pipeline created
a theoretical pathway for accidentally committed secrets in `.env.example`
to be amplified into the project's public-facing documentation. Although
`.env.example` is conventionally a placeholder file, real-world projects
occasionally check in real values by mistake. v2.2.0 adds a
sensitive-variable filter (`lib/env-parser.js`: `isSensitiveVarName`,
`redactSensitiveVars`) that replaces values of variables matching
PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/PRIVATE_KEY patterns with a
`***REDACTED***` sentinel before the vars map reaches any downstream
consumer. Port/host/API-target extraction uses a whitelist of
config-relevant keys and is unaffected. The scaffold also gains an
explicit SECURITY directive forbidding reference to sensitive variables
in CLAUDE.md as defense-in-depth. `DATABASE_URL` remains unredacted
because stack-detector's DB identification path has depended on it since
v1.x — changing that would be a breaking change.

### Migration

Existing projects keep working. The prompt-generator change affects only
how `pass3-prompt.md` is assembled on the next `init` or `refresh` run —
installed standards, rules, skills, memory, and CLAUDE.md in existing
projects are not touched until the user regenerates.

**⚠️ Important: `--force` is REQUIRED to adopt v2.2.0 improvements.**

claudeos-core's Pass 3 runs under Rule B (idempotency): if a target file
already exists on disk, it is skipped during regeneration. This is
designed to protect hand-edited content from being overwritten, but it
means **a plain `npx claudeos-core init` on an existing v2.1.x project
will NOT apply v2.2.0 improvements** because the old files (CLAUDE.md,
`00.standard-reference.md`, `40.infra/*-rules.md`, memory rules, etc.)
will all be skipped as "already exists".

To actually adopt v2.2.0's improvements (8-section CLAUDE.md, per-file
`40.infra/*` paths, `.env.example`-based port accuracy, Section 8
redesign, forward-referenced `04.doc-writing-guide.md`, `60.memory/*`
row), regenerate via:

```
npx claudeos-core init --force
```

`--force` overwrites existing generated files while leaving untouched:
- Your source code
- `claudeos-core/memory/` content (decision-log, failure-patterns entries
  you've accumulated) — these are append-only and preserved
- Any non-generated files under the project root

If you want to preview changes first, regenerate into a scratch copy of
the project, diff the resulting files against your current ones, and
then decide whether to `--force` on the real project. Key files to
diff: `CLAUDE.md`, `.claude/rules/00.core/00.standard-reference.md`,
`.claude/rules/40.infra/02.logging-monitoring-rules.md` (paths change
is the most visible delta).

No manual edits are required after `--force`; the scaffold handles
everything. Hand-edited content in `claudeos-core/standard/**` that
you want preserved should be committed to version control before
running `--force` so you can diff/merge any overwrites.

### Notes

- 39 new tests added in `tests/env-parser.test.js` (30 core + 9 sensitive-
  variable redaction). All tests continue to pass: **563 pre-existing + 39
  new = 602 total**.
- No file-format breaking changes. Existing `claudeos-core/standard/`,
  `.claude/rules/`, and `claudeos-core/skills/` content in installed
  projects is unaffected — only the CLAUDE.md generated at the project
  root changes shape on regeneration. The `40.infra/*` rule `paths`
  values will update on next regeneration, which changes when those
  rules auto-load (more accurately scoped); the rule content itself
  does not change. `stack.envInfo` is a new additive field — older
  project-analysis.json files without it still work.
- Discovered via dogfooding on three real production projects:
  - Structural drift (3 different CLAUDE.md layouts) prompted the scaffold.
  - A Vite + React frontend project produced a §9 surplus section under
    a renamed title that bypassed the initial forbidden-sections blocklist
    — fixed by expanding the blocklist and adding the mandatory
    post-generation §-count check.
  - The `40.infra/*` paths mismatch surfaced when inspecting a generated
    `02.logging-monitoring-rules.md` and confirming via grep that its
    guardrails (source-code-level: PII logging, silent swallow, console
    use) could never auto-load given the file's own paths frontmatter
    (config-only).
  - The Vite port mismatch (5173 in CLAUDE.md when `.env.example`
    declared 3000) exposed the absence of any `.env` parsing in
    stack-detector beyond DATABASE_URL — prompted the new
    `lib/env-parser.js` utility and the `.env Is the Source of Truth`
    CRITICAL footer block.
  - A second Spring Boot backend regeneration against the interim
    scaffold produced §9 "Common Rules & Memory (L4)" despite the
    expanded blocklist, because the LLM's desired content (a
    meta-summary of `paths: ["**/*"]` universal rules, complementary to
    Section 6's directory index) had no legitimate home in the original
    8-section design. Resolved by redesigning Section 8 into two
    sub-sections — a Common Rules sub-section for the universal-rules
    meta-summary and an L4 Memory sub-section for the memory
    table/workflow. The "L4 Memory Files (Re-declaration)" anti-pattern
    (duplicate memory table inside a second section) is now explicitly
    named and forbidden.
  - Inspection of the same backend-project output showed a generated
    `00.standard-reference.md` carrying a hardcoded `## DO NOT Read
    (context waste)` section (a partial duplicate of CLAUDE.md Section 7)
    and missing `00.core/04.doc-writing-guide.md` (created later by
    Pass 4). Fixed in the 6 affected Pass 3 stack prompts and formalized
    as the `00.standard-reference.md Composition` CRITICAL block so
    future stacks cannot reintroduce either defect.
  - Pre-release cross-check found the scaffold's `60.memory/*` "Always
    include" directive was not mirrored in any of the 12 stack Pass 3
    prompts' rule-category listings, causing the backend project's
    CLAUDE.md §6 Rules table to omit `60.memory/*` entirely. Fixed by adding the
    forward-reference row to all 12 stack prompts and strengthening the
    scaffold's Sub-section 2 guidance with an example row and "mandatory"
    wording.
  - Pre-release cross-check flagged that a plain `npx claudeos-core init`
    on an existing v2.1.x project would silently skip v2.2.0 improvements
    under Rule B idempotency. Added a CLAUDE.md marker-based detection
    in `bin/commands/init.js` that warns about the `--force` requirement
    before the resume/fresh prompt, plus an expanded Migration section
    covering preservation semantics and preview workflow.
  - Pre-release cross-check identified that values in `.env.example`
    flow through to CLAUDE.md, creating a leak pathway for accidentally
    committed secrets. Added sensitive-variable redaction in
    `lib/env-parser.js` (PASSWORD/SECRET/TOKEN/API_KEY/CREDENTIAL/
    PRIVATE_KEY patterns replaced with `***REDACTED***` sentinel) plus
    a SECURITY directive in the scaffold as defense-in-depth.

---

## [2.1.2] — 2026-04-21

Post-release regression fix for v2.1.0 master plan removal cleanup.

### Fixed

- **`content-validator`: `plan/` directory no longer required.** On fresh
  v2.1.0+ projects `npx claudeos-core health` always failed because
  `content-validator/index.js` pushed a `MISSING: plan directory not found`
  error when `claudeos-core/plan/` was absent. Master plan generation was
  explicitly removed in v2.1.0 — `plan-validator` (v2.1.0 `Fixed`) and
  `manifest-generator` (v2.1.0 `Fixed`) were both updated to tolerate a
  missing `plan/` directory, but `content-validator` was missed during
  that cleanup. It now silently skips the plan/ check when the directory
  is absent (with an informational `plan/ not present (expected post-v2.1.0)`
  log line), matching the contract established by the other validators.
  The directory contents are still validated when present (legacy projects
  or user-authored plan files are unaffected).

### Notes

- All 563 existing tests continue to pass. No new tests added — the fix
  is a one-line behavior change (`errors.push(...)` → `console.log(...)`)
  with a comment documenting the v2.1.0 context, and regression risk is
  covered by routine `health` runs rather than an integration test.
- Discovered via dogfooding on a real Vite 6 + React 19 project: 62
  generated files, all Pass 1–4 stages succeeded, but `health` failed
  at content-validator. No other cleanup gaps found.

---

## [2.1.1] — 2026-04-20

Docs-only maintenance release. No runtime behavior or API changes.

### Changed

- **README: dropped `What's New in v2.1.0` section** from all 10 language
  READMEs (`README.md`, `README.ko.md`, `README.ja.md`, `README.zh-CN.md`,
  `README.es.md`, `README.vi.md`, `README.hi.md`, `README.ru.md`,
  `README.fr.md`, `README.de.md`). Post-release cleanup — the section's
  job is done once the release ships, and the same content is preserved
  in `CHANGELOG.md` for anyone who wants the historical detail.

- **README: dropped the `Real production case: 18-domain admin frontend
  (2026-04-20)` subsection** under _Auto-scaling by Project Size_ across
  all 10 language READMEs. The per-stage breakdown table (9 rows) and its
  surrounding prose are removed. The trailing empirical reference in the
  FAQ "What is Pass 3 split mode" answer (the `Empirically verified up
  to 18 domains × 101 files × 102 minutes …` sentence with its now-dead
  link) is also removed so no orphan reference remains.

### Notes

- Each README drops ~33 lines; total net change across translations is
  ~330 lines removed. No code, tests, prompts, or generated artifacts
  are touched — `npm pack` contents are identical to v2.1.0 apart from
  the README files and `package.json`/`package-lock.json` version bump.

---

## [2.1.0] — 2026-04-20

This release addresses the primary cause of `Prompt is too long` failures in
Pass 3 on large multi-module projects. The fix is structural: Pass 3 is
re-architected into multiple sequential `claude -p` calls with fresh context
each, so output-accumulation overflow is no longer possible regardless of
project size.

### Added

- **Phase 1 "Read Once, Extract Facts" prompt block** (always on). A new
  common block `pass-prompts/templates/common/pass3-phase1.md` is prepended
  to every generated `pass3-prompt.md`. It instructs Claude to read
  `pass2-merged.json` exactly once into a compact in-context fact table and
  reference that table for all subsequent file generation. The block defines
  five rules:
  - **Rule A** — Reference the fact table, don't re-read pass2-merged.json.
  - **Rule B** — Idempotent file writing (skip if target exists with real
    content), making Pass 3 safely re-runnable after interruption.
  - **Rule C** — Cross-file consistency enforced via the fact table as
    single source of truth.
  - **Rule D** — Output conciseness: one line (`[WRITE]`/`[SKIP]`) between
    file writes, no restating the fact table, no echoing file content.
    Addresses output-accumulation overflow where verbose narration between
    30-50 files adds 15-30K tokens of pure accumulation.
  - **Rule E** — Batch idempotent check: one `Glob` at PHASE 2 start
    instead of per-target `Read` calls.

- **`pass3-context.json` slim summary builder** (always on). A new file
  `claudeos-core/generated/pass3-context.json` is built after Pass 2 from
  `project-analysis.json` plus `pass2-merged.json` signals (size, top-level
  keys). Stays under 5 KB even for large projects vs. `pass2-merged.json`
  which can exceed 500 KB. Pass 3 prompts reference this as the preferred
  entry point, falling back to `pass2-merged.json` only for specific
  details (response wrapper method, util class FQN, MyBatis mapper path).
  Emits a warning when `pass2-merged.json` exceeds 300 KB.

- **Batch sub-division for large projects** (automatic, ≥16 domains).
  Stages 3b and 3c are sub-divided into batches of 15 domains each,
  preceded by dedicated `3b-core` / `3c-core` stages that handle
  project-wide common files. Ensures no single stage generates more than
  ~50 files, keeping output within the empirical safe range on projects
  up to 100+ domains. Batch count is `ceil(totalDomains / 15)`; domain
  order comes from `domain-groups.json` (size-balanced by plan-installer).

- **Split-mode partial marker protection**. `pass3-complete.json` gains
  `mode: "split"` and `groupsCompleted` array. A run that completes 3a+3b
  and crashes during 3c leaves a partial marker; on re-run, the stale-check
  detects the partial-marker shape and defers to the split runner's resume
  logic instead of deleting the marker — otherwise the run would restart
  from 3a and double the token cost.

- **7 regression tests** pinning the master plan no-op contract
  (`tests/master-plan-removal.test.js`).

- **`scaffoldSkillsManifest` gap-fill for Pass 4**. Auto-creates
  `claudeos-core/skills/00.shared/MANIFEST.md` with a minimal stub if
  Pass 3c omits it (the stack pass3.md templates list it among targets but
  without REQUIRED marking, so skill-sparse projects sometimes ended up
  with `.claude/rules/50.sync/03.skills-sync.md` pointing at a
  non-existent file). Idempotent: skips if the file already has real
  content (>20 chars).

### Changed

- **Pass 3 now always runs in split mode.** Each stage starts with a fresh
  context window; cross-stage consistency is preserved by `pass3a-facts.md`.
  No user-facing configuration — applies to every `npx claudeos-core init`
  run automatically.

  Stage structure:
  - **3a** — Read analysis files once, write `pass3a-facts.md` (5-10 KB
    distilled fact sheet).
  - **3b** — Generate `CLAUDE.md`, `standard/`, and `.claude/rules/`.
    Sub-divided into `3b-core` + `3b-1..N` on projects with ≥16 domains.
  - **3c** — Generate `skills/` and `guide/`. Sub-divided into `3c-core`
    + `3c-1..N` on projects with ≥16 domains.
  - **3d-aux** — Generate `database/` + `mcp-guide/` stubs.

  Single-batch projects keep flat `"3b"`/`"3c"` marker names
  (backward-compatible); multi-batch projects use `"3b-core"`, `"3b-1"`,
  etc. Resume works at stage granularity.

- **Stage count by project size** (1–15 domains: 4 stages; 16–30: 8; 31–45:
  10; 46–60: 12; 61–75: 14; 91–105: 18).

- `package-lock.json` synced to `2.1.0`. The v2.0.2 release had a stale
  lockfile at `2.0.0` which caused `npm ci` to fail lockfile integrity
  checks.

### Removed

- **Master plan generation** (`claudeos-core/plan/*-master.md` files).
  Master plans were an internal tool backup not consumed by Claude Code
  at runtime, and aggregating many files in a single Pass 3d session was
  a primary source of `Prompt is too long` failures on mid-sized projects.
  Claude Code runtime is unaffected — it reads `CLAUDE.md` + `rules/`
  directly. Use `git` for backup/restore instead.

- **Pass 3d sub-stages `3d-standard` / `3d-rules` / `3d-skills` /
  `3d-guide`**. Only `3d-aux` (database + mcp-guide stubs) remains as a
  fixed-size task independent of domain count.

- **`CLAUDEOS_PASS3_SPLIT` environment variable and single-call mode.**
  Single-call had failed reliably on projects with more than ~5 domains
  because output-accumulation overflow is not predictable from input size.
  Split mode is structurally immune and is now the only supported path.

- **`claudeos-core/plan/` directory creation in `init`**. Directory is no
  longer created during bootstrap (honors the master-plan-removal contract).

### Deprecated

- `scaffoldMasterPlans` in `lib/memory-scaffold.js` is kept as a
  backward-compatible no-op (returns `[]`, writes nothing). External
  callers keep working; no files are produced.

### Fixed

- `bootstrap.sh` line endings normalized from CRLF to LF. v2.0.2 shipped
  with CRLF which caused immediate `syntax error` on macOS/Linux when
  invoked via `bash claudeos-core-tools/bootstrap.sh`.

- `pass3-context-builder.js`: removed unused `p2Size` placeholder variable
  (refactoring leftover, no behavior change).

- `init.js`: Pass 4 progress ticker `totalExpected` corrected from 6 to 5
  to reflect master plan removal. The 6th slot was counting
  `plan/50.memory-master.md` which is no longer generated, making the
  progress bar appear stuck at 83% until the run completed.

- `manifest-generator`: removed stale `plan-manifest.json` generation.
  Master plans were removed in v2.1.0; a manifest with an empty `plans`
  array (62 B) was noise. Nothing reads it, nothing validates it.
  `sync-map.json` is retained (with empty `mappings`) for
  `sync-checker` backward compatibility.

- `plan-validator`: `plan-sync-status.json` is now skipped when the
  `plan/` directory is absent or empty. Previously wrote a 147 B
  all-zeros status file on every health check for master-plan-free
  projects. `stale-report.json` still records a passing no-op so
  `health-checker` reports a clean result.

- `plan-parser` placeholder filtering regression in sync-checker
  on projects with `<...>` style tokens in plan files.

- `cli.js`: `npx claudeos-core memory --help` now displays the memory
  subcommand help instead of the top-level usage. `parseArgs` previously
  promoted `--help` to a top-level command even when it appeared after a
  command name, so `memory --help` was indistinguishable from `--help`
  alone. The fix: `--help` only becomes the top-level command when no
  other command has been seen yet. `memory --help`, `memory -h` now
  route to the subcommand's own help.

- `memory score`: the first `score` run no longer leaves two `importance`
  lines in each entry. The previous implementation inserted the
  auto-scored line at the top but left the user's original
  `- importance: N` line below it, producing a file with two conflicting
  values per entry. `cmdScore` now strips every importance line
  (bold or plain) before inserting the new auto-scored line, so there is
  always exactly one importance line per entry and repeated `score` runs
  remain idempotent.

- `memory compact`: the Stage 1 summary marker is now a proper markdown
  list item (`- _Summarized on YYYY-MM-DD — original body dropped._`).
  Previously the marker was emitted as a bare italic string without the
  `- ` prefix, which broke the surrounding list in markdown renderers
  and caused `parseEntries` to misclassify it on subsequent compactions.
  The default `fixLine` fallback was also updated to `- (fix omitted)`
  for the same consistency reason.

### Test coverage

- 563 tests pass, 0 skip (3 runs confirmed no flakes). +165 tests vs v2.0.0
  across Pass 3 context builder, output accumulation, batch subdivision,
  master plan removal, scaffoldSkillsManifest, and memory score/compact
  formatting regression suites.

## [2.0.2] — 2026-04-20

### Fixed

- **Upgrade-path silent-skip regression for pre-v2.0.0 projects** — `npx claudeos-core health` permanently reported `content-validator: fail` with 9 × MISSING guide errors on projects that had been initialized on a pre-v2.0.0 release and then upgraded. Pass 3 wrote `pass3-complete.json` before the Pass 3 output-completeness guards (H1/H2) existed, so the marker was valid-looking on disk even though `claudeos-core/guide/` (and sometimes `standard/00.core/01.project-overview.md`, `skills/`, or `plan/`) had never been populated. On subsequent runs, `init.js` observed the marker + an existing CLAUDE.md, skipped Pass 3, and never regenerated the missing outputs — leaving the project in a stuck-fail state that only `--force` (which wipes `.claude/rules/` and loses manual edits) could recover. The Pass 3 stale-marker branch in `bin/commands/init.js` previously only detected externally-deleted CLAUDE.md; it now also drops the marker when any entry in `lib/expected-guides.js` is missing/BOM-aware-empty or when `findMissingOutputs()` (`lib/expected-outputs.js`) flags a missing standard sentinel / `skills/` / `plan/`. Mirrors the existing `dropStalePass4Marker` pattern (symmetric helper `dropStalePass3Marker` added) and reuses the same "unlink failure surfaces as `InitError` with Windows AV/file-lock guidance" contract so the recovery itself can't silently regress. Recovery is one-shot: next `init` re-runs Pass 3, which populates the missing outputs and writes a fresh marker gated by the v2.0.0 H1/H2 guards.

### Added

- **`tests/pass3-marker.test.js`** — Six new cases covering the stale-detection branches: (a) missing guide dir → drop, (b) single BOM-only guide file → drop, (c) guides present but `skills/` gone → drop, (d) guides present but standard sentinel missing → drop, (e) complete state preserves marker, (f) `init.js` source-parity tripwire asserting `dropStalePass3Marker` + both `EXPECTED_GUIDE_FILES` and `findMissingOutputs` references appear in the stale-check region (guards against refactors silently regressing to v2.0.1 behavior).

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