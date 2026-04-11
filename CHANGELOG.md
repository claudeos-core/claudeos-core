# Changelog

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