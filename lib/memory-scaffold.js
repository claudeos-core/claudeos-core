/**
 * ClaudeOS-Core — Memory / Rule scaffold
 *
 * Creates initial L4 memory/ files, L4 rule files, and appends L4
 * reference section to CLAUDE.md.
 *
 * Shared between Pass 4 generation fallback and the memory CLI command.
 * All writes are idempotent-safe: callers decide whether to overwrite.
 */

const path = require("path");
const fs = require("fs");
const { ensureDir, existsSafe, writeFileSafe, readFileSafe } = require("./safe-fs");

// ─── Language labels — single source of truth: lib/language-config.js ──
// Re-aliased as LANG_LABELS for the translation prompt context.
const { LANGUAGES: LANG_LABELS } = require("./language-config");

// ─── Translation cache ─────────────────────────────────────────
// Cache translated content on disk under claudeos-core/generated/ so
// repeated init runs don't re-translate the same static content.
// Cache file: fallback-cache-<lang>.json with shape { "<contentKey>": "<translatedText>" }.
// contentKey is a stable identifier like "MEMORY_FILES.decision-log.md" or
// "RULE_FILES_60.01.decision-log.md".
//
// Cache location is derived from the first directory argument passed to the
// scaffold functions (e.g. memoryDir ends with "claudeos-core/memory", so the
// cache root is its sibling "claudeos-core/generated/").
function cachePathFor(anyClaudeOsCoreDir, lang) {
  // Walk up until we find a directory named "claudeos-core" or hit filesystem root.
  let cur = path.resolve(anyClaudeOsCoreDir);
  let steps = 0;
  while (path.basename(cur) !== "claudeos-core" && cur !== path.dirname(cur) && steps < 10) {
    cur = path.dirname(cur);
    steps++;
  }
  // If we found claudeos-core, use its generated/ sibling. Otherwise, fall back
  // to a temp-style cache inside the passed dir.
  if (path.basename(cur) === "claudeos-core") {
    return path.join(cur, "generated", `fallback-cache-${lang}.json`);
  }
  return path.join(anyClaudeOsCoreDir, `.fallback-cache-${lang}.json`);
}

function readCache(cacheFile) {
  try {
    if (!existsSafe(cacheFile)) return {};
    return JSON.parse(readFileSafe(cacheFile, "{}")) || {};
  } catch (_e) {
    return {};
  }
}

function writeCache(cacheFile, cache) {
  try {
    ensureDir(path.dirname(cacheFile));
    writeFileSafe(cacheFile, JSON.stringify(cache, null, 2));
  } catch (_e) { /* best-effort */ }
}

// Translate English static content to the requested language via Claude CLI.
//
// Behavior contract:
//   - lang === "en" or unset  → return English content as-is (no Claude call)
//   - lang is supported       → MUST translate. If translation fails, THROW an
//                                error with a clear message. We do NOT silently
//                                fall back to English, because the user
//                                explicitly chose a non-English lang and mixing
//                                English into that output is a correctness
//                                regression (bug #21).
//   - lang is unknown/invalid → throw (defensive — CLI should have validated)
//
// A disk cache (claudeos-core/generated/fallback-cache-<lang>.json) skips
// re-translation across init runs.
function translateIfNeeded(englishContent, lang, contentKey, cacheFile) {
  if (!lang || lang === "en") return englishContent;
  if (!LANG_LABELS[lang]) {
    throw new Error(
      `memory-scaffold: unsupported lang='${lang}'. ` +
      `Supported: ${Object.keys(LANG_LABELS).join(", ")}`
    );
  }

  // M2: CI / deterministic-test escape hatch. When
  // CLAUDEOS_SKIP_TRANSLATION=1 is set, throw instead of shelling out to
  // `claude -p`. This makes the "translation fails without real Claude CLI"
  // test family pass deterministically on dev machines where the CLI IS
  // authenticated (previously the tests shelled out, got real translations,
  // and their `assert.throws` fired). CI environments set this env var in
  // their test step so they don't need `claude` installed at all.
  if (process.env.CLAUDEOS_SKIP_TRANSLATION === "1") {
    throw new Error(
      `memory-scaffold: translation skipped for lang='${lang}' ` +
      `(CLAUDEOS_SKIP_TRANSLATION=1). Unset this env var to translate via \`claude -p\`.`
    );
  }

  // Cache hit → return immediately
  const cache = readCache(cacheFile);
  if (cache[contentKey] && typeof cache[contentKey] === "string" && cache[contentKey].trim().length > 0) {
    return cache[contentKey];
  }

  // Lazy-load CLI utils to avoid a circular dependency at module-load time.
  let runClaudeCapture;
  try {
    ({ runClaudeCapture } = require("../bin/lib/cli-utils"));
  } catch (e) {
    throw new Error(
      `memory-scaffold: translation required for lang='${lang}' but CLI utils ` +
      `could not be loaded: ${e.message}`
    );
  }
  if (typeof runClaudeCapture !== "function") {
    throw new Error(
      `memory-scaffold: translation required for lang='${lang}' but ` +
      `runClaudeCapture is not available`
    );
  }

  const langLabel = LANG_LABELS[lang];
  // Visible progress — translation can take 5-20s per file, user should see it.
  process.stdout.write(`    🌐 Translating ${contentKey} → ${lang}...`);
  const t0 = Date.now();

  try {
    return performTranslation(englishContent, lang, langLabel, contentKey, cache, cacheFile, runClaudeCapture, t0);
  } catch (err) {
    // Close the progress line before the exception bubbles up
    process.stdout.write(` ❌\n`);
    throw err;
  }
}

// Extracted from translateIfNeeded so the caller can wrap the work in
// try/catch-with-log-cleanup without duplicating the logic.
function performTranslation(englishContent, lang, langLabel, contentKey, cache, cacheFile, runClaudeCapture, t0) {

  // Translation prompt. Rules are strict because Claude's default behaviour
  // is to over-paraphrase and sometimes drop code fences or frontmatter.
  const prompt = `You are a professional technical translator. Translate the Markdown document below into ${langLabel}.

=== ABSOLUTE RULES (violating any of these is a failure) ===

1. PRESERVE Markdown structure BYTE-FOR-BYTE:
   - Headings: same level (#, ##, ###, ####), same number, same order.
   - Code fences: \`\`\` and ~~~ blocks — content inside code fences is NEVER translated. Preserve verbatim.
   - Inline code: \`...\` — preserve verbatim (do not translate).
   - Tables: keep the | separators and column count identical.
   - Lists: preserve bullet style (-, *, 1.) and indentation.
   - Bold/italic: **...**, *...*, _..._ — preserve markers, translate text inside.
   - Blockquotes (>): preserve.
   - Horizontal rules (---): preserve.
   - Blank lines: preserve count and position.

2. PRESERVE LITERALLY (DO NOT translate, DO NOT transliterate):
   - YAML frontmatter keys: \`name:\`, \`paths:\`, \`---\` markers.
     (The VALUE of \`name:\` MAY be translated if it's a human label.)
   - All file paths: \`claudeos-core/memory/\`, \`.claude/rules/60.memory/\`, etc.
   - All CLI commands: \`npx claudeos-core memory compact\`, \`npm install\`, etc.
   - Path glob patterns: \`"**/*"\`, \`"src/**/*.java"\`, etc.
   - CLI-parsed field keywords (these are parsed by code, translating breaks the tool):
     * \`frequency:\`, \`count:\`, \`last seen:\`, \`importance:\` (failure-pattern fields)
     * \`fix\`, \`solution\` (fix-field keywords)
     * \`## Last Compaction\` (section heading parsed verbatim)
     * \`(L4)\` token in headings (language-independent marker)
   - Code identifiers, class names, method names, package names.
   - URLs and email addresses.

3. TRANSLATION QUALITY:
   - Translate prose, comments, descriptions, table cell text, explanations.
   - Use natural, professional ${langLabel}. NOT machine-translated style.
   - Keep the document's tone (this is developer documentation — be precise and concise).
   - Domain terms (e.g. "entry", "anchor", "confidence") should use natural ${langLabel} equivalents, not awkward literal translations.

4. OUTPUT FORMAT:
   - Output ONLY the translated Markdown document.
   - NO preamble ("Here is the translation:", etc.).
   - NO postamble ("Let me know if...", etc.).
   - NO wrapping the output in a code fence.
   - The FIRST character of your response must be the first character of the translated document.
   - The LAST character of your response must be the last character of the translated document.

=== DOCUMENT TO TRANSLATE ===
${englishContent}
=== END DOCUMENT ===

Translate now. Output only the translated document.`;

  const raw = runClaudeCapture(prompt, { timeout: 180000 });
  if (raw === null || typeof raw !== "string") {
    throw new Error(
      `memory-scaffold: Claude CLI call failed while translating '${contentKey}' to ${lang}. ` +
      `Ensure \`claude\` CLI is available and authenticated.`
    );
  }

  // Strip any stray "=== ... ===" markers or common preamble Claude may echo.
  let cleaned = raw
    .replace(/^===\s*DOCUMENT TO TRANSLATE\s*===\s*\n?/m, "")
    .replace(/\n?===\s*END DOCUMENT\s*===\s*$/m, "")
    .replace(/^---\s*BEGIN DOCUMENT\s*---\s*\n?/m, "")
    .replace(/\n?---\s*END DOCUMENT\s*---\s*$/m, "")
    .replace(/^\s*Here is the translation[^\n]*\n/i, "")
    .replace(/^\s*```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/, "")
    .trim();

  // Validation: must have non-trivial content
  if (cleaned.length < Math.max(50, englishContent.length * 0.4)) {
    throw new Error(
      `memory-scaffold: translation of '${contentKey}' to ${lang} is suspiciously short ` +
      `(got ${cleaned.length} chars, expected at least ${Math.max(50, Math.floor(englishContent.length * 0.4))}). ` +
      `Claude may have refused or returned only a preamble.`
    );
  }

  // Validation: preserve key structural elements
  const origHeadings = (englishContent.match(/^#{1,6}\s+/gm) || []).length;
  const newHeadings = (cleaned.match(/^#{1,6}\s+/gm) || []).length;
  if (origHeadings >= 3 && newHeadings < Math.ceil(origHeadings * 0.6)) {
    throw new Error(
      `memory-scaffold: translation of '${contentKey}' to ${lang} lost too many headings ` +
      `(orig=${origHeadings}, new=${newHeadings}). Translation quality rejected.`
    );
  }

  const origFences = (englishContent.match(/^```/gm) || []).length;
  const newFences = (cleaned.match(/^```/gm) || []).length;
  if (origFences > 0 && newFences !== origFences) {
    throw new Error(
      `memory-scaffold: translation of '${contentKey}' to ${lang} broke code fences ` +
      `(orig=${origFences}, new=${newFences}). Translation quality rejected.`
    );
  }

  // Validation: CLI-parsed keywords must survive verbatim (they are parsed by
  // the memory CLI — if translated they break the tool silently).
  const MUST_PRESERVE = ["frequency:", "last seen:", "importance:", "(L4)"];
  for (const kw of MUST_PRESERVE) {
    if (englishContent.includes(kw) && !cleaned.includes(kw)) {
      throw new Error(
        `memory-scaffold: translation of '${contentKey}' to ${lang} lost required ` +
        `keyword '${kw}' which must be preserved literally (CLI parser depends on it).`
      );
    }
  }

  // Validation: frontmatter boundary markers must match original count
  const origFrontmatter = (englishContent.match(/^---\s*$/gm) || []).length;
  const newFrontmatter = (cleaned.match(/^---\s*$/gm) || []).length;
  if (origFrontmatter > 0 && newFrontmatter !== origFrontmatter) {
    throw new Error(
      `memory-scaffold: translation of '${contentKey}' to ${lang} broke YAML frontmatter ` +
      `markers (orig=${origFrontmatter}, new=${newFrontmatter}).`
    );
  }

  // Success — save to cache for future init runs
  cache[contentKey] = cleaned;
  writeCache(cacheFile, cache);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  process.stdout.write(` ✅ (${elapsed}s)\n`);

  return cleaned;
}

// ─── L4 Memory files ───────────────────────────────────────────
const MEMORY_FILES = {
  "decision-log.md": `# Decision Log

_Permanent record of "why" behind design choices. Append-only._
_Format: \`## YYYY-MM-DD — <Title>\` then Context / Options / Decision / Consequences._
`,

  "failure-patterns.md": `# Failure Patterns

_Recurring errors and their fixes. Importance auto-scored by \`npx claudeos-core memory score\`._
_Format: \`## <pattern-id>\` with Frequency / Last Seen / Importance / Fix._
`,

  "compaction.md": `# Compaction Strategy

_4-stage compaction rules for \`decision-log.md\` and \`failure-patterns.md\`._
_Run via \`npx claudeos-core memory compact\`._

## Preservation Priority
Entries are preserved if ANY of:
- \`importance >= 7\`
- \`lastSeen\` within 30 days
- Referenced by an active rule (path listed in rule-manifest.json)

## Stages

### Stage 1 — Summarize aged entries
Entries older than 30 days with no recent reference are summarized:
- Keep: pattern-id, frequency, one-line fix summary
- Drop: verbose context, full stack traces

### Stage 2 — Merge duplicate patterns
Failure entries with the same root cause are merged:
- \`frequency = sum\`
- \`lastSeen = max\`
- \`fix\` unified to the most recent working solution

### Stage 3 — Drop low-importance entries
Entries with \`importance < 3\` AND \`lastSeen > 60 days\` are removed.

### Stage 4 — Enforce file size cap
Each target file is capped at 400 lines.
When exceeded, the oldest (by \`lastSeen\`) low-importance entries are dropped first.

## Last Compaction
(never — run \`npx claudeos-core memory compact\`)
`,

  "auto-rule-update.md": `# Auto Rule Update Proposals

_Generated by \`npx claudeos-core memory propose-rules\`._
_Each proposal: failure pattern → affected rule → diff → confidence._

## How to apply
1. Review each proposal below.
2. If accepted, edit the affected rule file and commit.
3. Move the accepted proposal into \`decision-log.md\` as a record.

## Proposals
(none yet — run \`npx claudeos-core memory propose-rules\` after accumulating failure patterns)
`,
};

// ─── 00.core additional rule files (always scaffolded) ─────────
const RULE_FILES_00 = {
  "51.doc-writing-rules.md": `---
name: Document Writing Rules
paths:
  - "**/*"
---

# Standard / Rules / Skills Document Writing Rules

## [CRITICAL] Rules File paths Frontmatter Required

Every file in \`.claude/rules/\` MUST include a \`paths\` field in its YAML frontmatter. Without \`paths\`, Claude Code cannot determine when to load the rule.

- Set \`paths\` to match the **file patterns where the rule is actually needed**.
- Example: document writing rules → \`"**/claudeos-core/**"\`, \`"**/.claude/**"\` (not needed during code editing)
- Example: coding conventions → \`"**/*"\` (applies to all code)
- Do NOT propose narrowing core rules from \`"**/*"\` to specific patterns like \`src/**/*.tsx\` — this increases management complexity and risks rules not loading when needed.

## [CRITICAL] No Domain-Specific Hardcoding

When adding or modifying rules in \`claudeos-core/standard/\`, \`.claude/rules/\`, or \`claudeos-core/skills/\`, **never hardcode project-specific domain names**. Always write in generic, reusable patterns.

### Prohibited

- Specific table names (e.g., \`user_account\`, \`st_ntc_base\`)
- Specific URL paths (e.g., \`/notice/getList\`, \`/api/v1/orders\`)
- Specific domain codes (e.g., \`NOTICE\`, \`ORDER\`, \`SYSTEM\`)
- Specific DTO/Entity class names (e.g., \`GetOrderListReqDto\`)

### Correct Approach

| Item | Wrong | Correct |
|------|-------|---------|
| Path key | \`ORDER: /api/orders\` | \`{DOMAIN_KEY}: /{category}/{domain}\` |
| Table | \`user_account\` | \`{prefix}_{table_name}\` |
| URL | \`/notice/getList\` | \`/{domain}/{action}\` |
| DTO | \`GetOrderListReqDto\` | \`{Action}{Entity}ReqDto\` |

### Allowed Exceptions

- **Project-wide common fields**: audit columns, base classes, and fields used across ALL domains
- **Framework/infrastructure names**: \`BaseEntity\`, \`SecurityConfig\`, framework annotations
- **Existing domain listing**: only when explaining how to ADD NEW domains (configuration examples)

### Rationale

These documents are project-wide **common rules**. If specific domain names appear, developers working on other domains may ignore the rules as irrelevant. All developers must follow the same rules — write generically.

## [CRITICAL] No System Absolute Path Hardcoding

**Never hardcode system absolute paths** (\`/Users/xxx/\`, \`/home/xxx/\`, \`C:\\\\Users\\\\xxx\\\\\`) in documents. User names and machine-specific paths are environment-dependent. Always use the current working directory or project-relative paths instead.

## [CRITICAL] Code Examples Must Reflect Actual Project Structure

When writing code examples in documents (file paths, import statements, directory tree diagrams), **verify against the actual project structure** before writing. Do not guess or invent fictional paths. If unsure, check the real directory layout first.

## Reference
- claudeos-core/standard/00.core/*doc-writing-guide.md
`,

  "52.ai-work-rules.md": `---
name: AI Work Rules
paths:
  - "**/*"
---

# AI Work Rules

> **IMPORTANT: Rules that AI must follow in this project.**

## Accuracy First

- **Accuracy over token saving.** Never skip file verification or code validation steps.
- **Always read and judge critical facts directly** (file paths, version numbers, API signatures, schema definitions). Sub-agents can explore and summarize, but their summaries must not replace direct verification of facts that affect the code you write.
- **Verify file paths before writing them in documents.** Never record a path that does not exist on disk.
- **No flattery, no exaggeration.** If uncertain, say "verification needed" — do not be confidently wrong.

## Safety & Security

> **CRITICAL: These rules override every other rule in this file. Violations cause data loss, security breaches, or unauthorized publication.**

- **Destructive commands require explicit user confirmation in this conversation.** Never run \`rm -rf\`, \`git reset --hard\`, \`git push --force\`, \`git branch -D\`, \`git clean -fd\`, \`DROP TABLE\`/\`TRUNCATE\`, \`npm publish\`/\`mvn deploy\`/\`pip publish\`, migration \`down\`/\`revert\` commands, or equivalents without the user explicitly approving the exact command. Authorization for one destructive command is NOT general authorization — re-confirm each time.
- **Never echo, log, write to comments, or commit values from secret files.** Files: \`.env*\`, \`secrets/\`, \`*.pem\`, \`*.key\`, \`id_rsa*\`, credentials JSON, service account files. Reference secrets by variable name only (e.g., \`process.env.DB_PASSWORD\`, not the actual value). Never quote secret values in error messages, chat responses, or test fixtures.

## Hallucination Prevention

Before analysis or evaluation, review this table and do not repeat these patterns.

| # | Prohibited Pattern | Explanation |
|---|-------------------|-------------|
| 1 | Labeling DO NOT Read files as "token waste" or "unnecessary" | Blocked from reading ≠ unnecessary. DO NOT Read means "AI should not read directly", not "the file has no value" |
| 2 | Labeling intentional design as "inefficient" or "redundant" | Ask "why was it designed this way?" before suggesting changes |
| 3 | Labeling intentional summary-to-detail layering as "duplication" | Multi-layer design (anchor → rules → standard) is intentional — each layer has a different density and role |
| 4 | Judging source values as "serious inconsistency" without checking the primary source | Always verify against the actual source file |
| 5 | Repeating a hallucination already recorded in this project | Check this table + \`memory/failure-patterns.md\` before analysis |
| 6 | Proposing path scoping changes for intentional \`**/*\` designs | Confirm the intent first |
| 7 | Labeling code examples in rules as "excessive" | Code examples are essential for AI-assisted code generation — they reduce hallucination risk regardless of audience experience |
| 8 | Making quantitative judgments based on unverified numbers, then reversing when challenged | No speculation-based quantitative claims |
| 9 | Judging a standard document as "low practical value" without reading it | No judgment before verification |
| 10 | Proposing to merge/reduce same-layer intentional duplication | Different perspectives on the same topic in different files is intentional. Rule accessibility > token saving |
| 11 | Suggesting an import or package name without verifying it exists in the dependency manifest | Hallucinated module/named export. Verify by reading \`package.json\` / \`pom.xml\` / \`build.gradle\` / \`pyproject.toml\` / \`requirements.txt\` before recommending an import |
| 12 | Mixing API signatures from different major versions of the same library | Verify by checking the manifest AND lockfile for the exact installed version (lockfile pins the truth): \`package-lock.json\`/\`pnpm-lock.yaml\`/\`yarn.lock\`, \`gradle.lockfile\`/\`gradle/libs.versions.toml\`, \`poetry.lock\`/\`Pipfile.lock\`/\`uv.lock\`, or fall back to the manifest (\`pom.xml\`/\`build.gradle\`/\`package.json\`/\`pyproject.toml\`) |
| 13 | Editing one environment config file without checking sibling parity | Verify by \`Glob\` for the config family before a partial edit. Backend: \`.env*\`, \`application-*.yml/.properties\`, \`*settings.py\`. Frontend: \`environment*.ts\` (Angular), \`next.config.*\`, \`vite.config.*\`, \`nuxt.config.*\`, \`.env.local\`/\`.env.production\` |
| 14 | Mixing server/client component boundaries (SSR frameworks) — using client-only APIs (\`useState\`, \`useEffect\`, \`window\`, \`localStorage\`) in a server component, or server-only operations (DB access, secret reads, filesystem) in a client component | Read the file's boundary directive before adding code: Next.js App Router (\`"use client"\` opt-in), Nuxt (server vs client composables), Remix (\`loader\`/\`action\` exports). N/A for pure SPA or pure backend projects |
| 15 | Inventing component prop names or function arguments without reading the target's interface | Read the target's prop type definition (\`interface Props\`, \`defineProps<>\`, function signature) or method signature before invoking. Hallucinated props may compile in loose-TS code and crash at runtime |
| 16 | Hardcoding API keys, tokens, passwords, or DB credentials in source code — even in tests, examples, fixtures, or commit messages | Verify by \`Grep\` for patterns like \`(api[_-]?key\|token\|password\|secret)\\s*=\\s*["']\\w+["']\` before committing. Use env vars (\`process.env.X\`/\`os.getenv("X")\`/\`@Value("\${X}")\`), secret managers, or \`.env.example\` placeholders instead |
| 17 | Editing historical database migration files after they've been applied | Migration files (\`migrations/V*.sql\` (Flyway), \`alembic/versions/*.py\`, \`db/migrate/*.rb\` (Rails), \`prisma/migrations/*/migration.sql\`, \`migrations/*.ts\` (TypeORM)) are append-only once applied. Add a NEW migration to revert/modify; never edit historical ones. Verify by checking migration history (\`flyway info\`, \`alembic history\`, \`prisma migrate status\`) before editing |

**Core Principle:**
- Do not label a system built by the designer as "inefficient", "redundant", or "needs optimization" — **confirm the intent first**
- When evaluating system structure, first ask "why was it built this way?"
- Before pointing out problems, check whether they are already solved or intentionally designed

## No Unsolicited Work

- **Do not make unsolicited suggestions.** If uncertain, ask instead of suggesting. *Exception: factual errors in this project's own docs (wrong file paths, dead references, internally contradicting rules) should be reported even if not asked. Distinguish factual errors (report) from stylistic preferences (stay silent).*
- **Do not modify onboarding/guide documents (\`claudeos-core/guide/\`) unless specifically requested.**
- Do not clean up surrounding code during bug fixes, or add unnecessary refactoring during feature additions.
- **Empty directories may be intentional placeholders — verify markers before flagging or removing.** Markers of intent: a \`.gitkeep\` / \`KEEP_EMPTY.md\` file inside, the directory listed in CLAUDE.md as planned, or referenced by an active plan/standard/skills document. If none of these exist, an empty directory may be neglect — ask the user before deleting.
- **\`plan/\` master documents are internal sync management tools.** Do not suggest removing them. "DO NOT Read" means "AI should not read directly", not "the file is unnecessary".
- **Do not duplicate into memory what is already directly verifiable in code, config files, or rule documents.** Configuration values, paths, and names already recorded in CLAUDE.md, rules, or standard must not be redundantly stored in memory. Examples — backend: port numbers, pool sizes, handler names, transaction propagation modes; frontend: dev server port, build output dir, env var prefix (\`VITE_\`/\`NEXT_PUBLIC_\`/\`REACT_APP_\`), route definitions, bundle size budgets.
- **Do not directly read internal document directories (\`guide/\`, \`plan/\`, \`generated/\`, \`mcp-guide/\`) for routine context loading.** \`.claude/rules/\` and \`claudeos-core/standard/\` already contain the essential content. *Exception: read directly when the user explicitly asks about these contents, or when debugging an issue requires inspecting them.*
- **Established codebase conventions take precedence over textbook-ideal patterns.** Propose modernization, refactoring, or "current best practices" migration ONLY when the user explicitly requests it (e.g., "modernize", "migrate to v3", "refactor to current best practices"). Otherwise, follow the existing pattern even if you would write it differently in a greenfield project.

## Project Architecture — Hands Off

This project uses the CLAUDE.md → rules → standard 3-layer architecture, plus a separate L4 Memory layer. Understand these design principles:

- **Cross-layer summary/detail duplication is intentional.** Each layer has a different role: CLAUDE.md (anchor/index, always loaded) → rules (detailed rules, conditionally loaded by path) → standard (original specification, referenced when needed). The same topic across layers is layer-appropriate density, not duplication.
- **Same-layer duplication across files is also intentional.** Each file covers a different perspective (DB design, code implementation, DTO design, etc.). Do not propose "consolidating into one file because it's the same layer".
- **Memory (\`claudeos-core/memory/\`, on-demand) and Rules (\`.claude/rules/\`, auto-loaded by path match) are never simultaneously loaded by default.** Similar content between them is NOT duplication. Do not propose "memory cleanup", "dedupe memory vs rules", or "consolidate memory into rules" — they have different roles (on-demand history/context vs auto-loaded enforcement).
- **Multi-rule load provides reinforcement.** Do not label co-loaded defensive rules as "redundant" — the reinforcement effect is intentional and the context cost is negligible.
- **Rules \`paths: ["**/*"]\` — do not propose conditional path conversion for core rules.** When developing new features (no matching files exist yet), conditional paths would prevent rules from loading, risking non-standard code generation.
- **\`00.standard-reference.md\` index additions — avoid unless specifically requested.** Each rules file already links to its corresponding standard via the \`## Reference\` section. Adding paths to the index only consumes additional tokens per conversation.
- **Minor wording or item count differences across layers are NOT "inconsistency risks".** If no information is missing, trivial expression differences are not a problem.

## Planned References — No "Missing" Judgment

- Paths and directories referenced in CLAUDE.md, Rules, Standard, or Skills documents **may not yet exist on disk**.
- These are **planned references for future implementation** — intentional forward declarations.
- Do NOT label them as "missing", "inconsistent", "stale", or "needs deletion". *Exception: if a referenced path appears in 3+ documents and doesn't exist on disk, it may be a typo masquerading as a planned reference — flag for human review (consistent with §"No Unsolicited Work" Exception for factual errors in own docs).*
- Do NOT propose removing or modifying these references. Preserve them as-is.

## Code/Document Generation Accuracy

- **Before writing new code, read 2-3 neighboring files in the same directory for existing patterns** — naming conventions, error handling, logging style, import order, return type idioms, test structure. Match what you find rather than introducing new patterns. Greenfield/textbook idioms come second to in-codebase consistency.
- **Do not guess framework class/type/component shapes — check actual source code.** Backend: base classes, DTOs, entity field naming, repository method signatures. Frontend: component prop interfaces, store/state shapes (Pinia/Redux/Zustand), API response types, route param types, CSS module class names.
- **When modifying skills/standard/rules/memory documents, keep related files in sync.** If a standard changes, update its rule file; if a skill changes, update \`MANIFEST.md\`. If CLAUDE.md summary sections cover the same topic, update them together.
`,
};

// ─── L4 Rule files (English static fallback) ────────────────
const RULE_FILES_60 = {
  "01.decision-log.md": `---
name: Decision Log
paths:
  - "claudeos-core/memory/decision-log.md"
---

# Decision Log (\`memory/decision-log.md\`)

Permanent, append-only record of architectural decisions and their rationale.
Commit this file to version control — it is team knowledge.

## Read timing

- **Session start** — skim recent entries to understand past design rationale.
- **Before suggesting architectural changes** — check if a prior decision already addressed this.

## Write timing

Append a new entry when:
- Choosing between competing patterns
- Selecting a library or framework
- Defining a convention the team must follow
- Deciding NOT to do something

## Entry format

\`\`\`markdown
## YYYY-MM-DD — <Short title>

- **Context:** why this decision was needed
- **Options considered:** what alternatives existed
- **Decision:** what was chosen and why
- **Consequences:** what this locks in, trade-offs accepted
\`\`\`

## Rules

- Always use the actual current date (UTC, YYYY-MM-DD).
- Never edit or delete existing entries. This is append-only.
- Keep entries concise — 5~10 lines max.
`,

  "02.failure-patterns.md": `---
name: Failure Patterns
paths:
  - "claudeos-core/memory/failure-patterns.md"
---

# Failure Patterns (\`memory/failure-patterns.md\`)

Registry of recurring errors, their root causes, and fixes.
Importance is auto-scored by \`npx claudeos-core memory score\` (frequency x recency).
Commit this file — it prevents the team from hitting the same errors repeatedly.

## Read timing

- **Session start** — scan high-importance entries (importance >= 7).
- **When encountering an error** — search this file first. Apply the recorded fix if a match exists.

## Write timing

Append when:
- You encounter an error for the **second time**.
- You discover a non-obvious root cause.
- A workaround exists that is not documented elsewhere.

## Entry format

\`\`\`markdown
## <pattern-id>

- **frequency:** 1
- **last seen:** YYYY-MM-DD
- **symptoms:** what the error looks like
- **root cause:** why it happens
- **fix:** step-by-step resolution
\`\`\`

## Rules

- Use a descriptive \`pattern-id\`.
- When encountering a known pattern again, increment \`frequency\` and update \`last seen\`.
- Never delete entries manually — use \`npx claudeos-core memory compact\`.
`,

  "03.compaction.md": `---
name: Compaction Strategy
paths:
  - "claudeos-core/memory/compaction.md"
---

# Compaction Strategy (\`memory/compaction.md\`)

Reference document defining the 4-stage compaction policy.
Executed by \`npx claudeos-core memory compact\`.

## Rules

- Do NOT edit unless intentionally changing the compaction policy.
- Do NOT run compaction logic manually — always use the CLI command.

## 4 stages (reference)

1. **Summarize aged** — entries >30 days, body replaced with one-line summary
2. **Merge duplicates** — same heading, frequency summed, latest fix kept
3. **Drop low-importance** — importance <3 AND lastSeen >60 days removed
4. **Enforce cap** — 400 lines max per file, oldest low-importance entries dropped first

## Preservation

Entries preserved if ANY of: importance >= 7, lastSeen within 30 days, referenced by active rule.
`,

  "04.auto-rule-update.md": `---
name: Auto Rule Update
paths:
  - "claudeos-core/memory/auto-rule-update.md"
---

# Auto Rule Update (\`memory/auto-rule-update.md\`)

Machine-generated rule improvement proposals based on recurring failure patterns (frequency >= 3).
Generated by \`npx claudeos-core memory propose-rules\`.

## Read timing

- **When proposals exist** — review them before starting work.

## Action workflow

1. Read the proposal: which failure pattern triggered it, which rule is affected, confidence score.
2. If accepted: edit the affected rule file to address the pattern.
3. After editing: move the accepted proposal into \`decision-log.md\` as a permanent record.
4. If rejected: add a brief note explaining why.

## Rules

- Do NOT edit proposals directly — they are machine-generated references.
- Proposals with confidence >= 0.70 deserve serious consideration.
`,
};

// ─── CLAUDE.md append block (English static fallback) ──────────
const CLAUDE_MD_APPEND = `
## Memory (L4)

This project uses the ClaudeOS-Core L4 Memory layer for persistent team knowledge.

### Common rules (\`.claude/rules/00.core/\`)

| File | Purpose |
|---|---|
| \`51.doc-writing-rules.md\` | Rules paths frontmatter, no domain/path hardcoding, code examples must reflect actual structure |
| \`52.ai-work-rules.md\` | AI accuracy, hallucination prevention, 3-layer design, memory vs rules separation, planned references |

### L4 Memory — persistent team knowledge (\`claudeos-core/memory/\`)

Detailed rules: \`.claude/rules/60.memory/\` (4 rules).

| File | Purpose | Action |
|---|---|---|
| \`decision-log.md\` | "Why" behind architectural choices | Read at session start; append when making decisions |
| \`failure-patterns.md\` | Recurring errors & fixes (auto-scored) | Scan at session start; append on repeat errors |
| \`compaction.md\` | 4-stage compaction policy reference | Read-only (edit only to change policy) |
| \`auto-rule-update.md\` | Rule improvement proposals (freq >= 3) | Review proposals; accept -> edit rule + record in decision-log |

### Memory workflow

1. Scan \`memory/failure-patterns.md\` at session start -> avoid known pitfalls
2. Skim recent \`memory/decision-log.md\` entries -> understand past design rationale
3. Record decisions -> append to \`memory/decision-log.md\`
4. Record repeat errors (2nd occurrence) -> append to \`memory/failure-patterns.md\`
5. Periodically run \`npx claudeos-core memory compact\` to enforce the 4-stage compaction policy
6. When \`auto-rule-update.md\` has proposals with confidence >= 0.70, review and act
`;

// ─── Scaffold functions ────────────────────────────────────────

function scaffoldMemory(memoryDir, { overwrite = false, lang = "en" } = {}) {
  ensureDir(memoryDir);
  const cacheFile = cachePathFor(memoryDir, lang);
  const results = [];
  for (const [name, body] of Object.entries(MEMORY_FILES)) {
    const full = path.join(memoryDir, name);
    if (!overwrite && existsSafe(full)) {
      results.push({ file: name, status: "skipped" });
      continue;
    }
    const content = translateIfNeeded(body, lang, `MEMORY_FILES.${name}`, cacheFile);
    const ok = writeFileSafe(full, content);
    results.push({ file: name, status: ok ? "written" : "error" });
  }
  return results;
}

/**
 * Scaffold L4 memory rule files + 00.core common rules (English static fallback).
 * Used when Pass 4 Claude prompt fails or is unavailable.
 * 00.core rules are always scaffolded (gap-fill only, never overwrite Pass 3 output).
 */
function scaffoldRules(rulesBaseDir, { overwrite = false, lang = "en" } = {}) {
  const cacheFile = cachePathFor(rulesBaseDir, lang);
  const results = [];
  const dirs = {
    "00.core": RULE_FILES_00,
    "60.memory": RULE_FILES_60,
  };
  for (const [dirName, files] of Object.entries(dirs)) {
    const dir = path.join(rulesBaseDir, dirName);
    ensureDir(dir);
    for (const [name, body] of Object.entries(files)) {
      const full = path.join(dir, name);
      if (!overwrite && existsSafe(full)) {
        results.push({ file: `${dirName}/${name}`, status: "skipped" });
        continue;
      }
      const content = translateIfNeeded(body, lang, `RULE_FILES.${dirName}.${name}`, cacheFile);
      const ok = writeFileSafe(full, content);
      results.push({ file: `${dirName}/${name}`, status: ok ? "written" : "error" });
    }
  }
  return results;
}

/**
 * Append L4 Memory section to CLAUDE.md (English static fallback).
 * Only appends if the section marker is not already present.
 * Uses a language-independent marker ("L4 Memory" / "Memory (L4)") that
 * survives translation of the heading into other languages.
 * @param {string} claudeMdPath - full path to CLAUDE.md
 * @returns {boolean} true if appended or already present
 */
function appendClaudeMdL4Memory(claudeMdPath, { lang = "en" } = {}) {
  // Heading pattern: lines starting with `##` (or more) that contain `(L4)`.
  // Using a heading-scoped regex avoids false positives when the user has
  // written `(L4)` elsewhere in body text (e.g. "Layer 4 load balancer (L4)").
  // The language-independent `(L4)` token still allows translated headings
  // like `## 메모리 (L4)`, `## メモリ (L4)` to be recognised.
  const MARKER_REGEX = /^#{2,}\s+.*\(L4\)/m;
  if (!existsSafe(claudeMdPath)) return false;
  const existing = readFileSafe(claudeMdPath);
  if (MARKER_REGEX.test(existing)) return true;
  const cacheFile = cachePathFor(path.dirname(claudeMdPath), lang);
  const appendBlock = translateIfNeeded(CLAUDE_MD_APPEND, lang, "CLAUDE_MD_APPEND", cacheFile);
  const appended = existing.trimEnd() + "\n" + appendBlock;
  return writeFileSafe(claudeMdPath, appended);
}

/**
 * Scaffold master plan file for L4 Memory.
 *
 * DEPRECATED: master plan generation was removed from claudeos-core because
 * master plans are internal tool backup files that are not consumed by Claude
 * Code at runtime, and generating them required aggregating many files in a
 * single session (which could trigger "Prompt is too long" on mid-sized
 * projects). This function is now a no-op that returns an empty result list.
 * Kept as an export for backward compatibility with existing callers.
 *
 * @param {string} planDir - path to claudeos-core/plan/ (unused)
 * @param {string} memoryDir - path to claudeos-core/memory/ (unused)
 * @param {object} [opts] (unused)
 * @returns {Array} always empty (no-op)
 */
function scaffoldMasterPlans(_planDir, _memoryDir, _opts = {}) {
  return [];
}

// ─── Standard doc-writing-guide (English static fallback) ───
const STANDARD_DOC_WRITING_GUIDE = `# Standard / Rules / Skills Document Writing Guide

> This document is the detailed guide for writing and modifying ClaudeOS documentation (Standard, Rules, Skills).
> For enforcement rules (loaded automatically), see: .claude/rules/00.core/51.doc-writing-rules.md

---

## 1. Document Layer Structure

| Layer | Path | Role | Loading |
|-------|------|------|---------|
| CLAUDE.md | \`CLAUDE.md\` | Entry point overview | Auto-loaded every conversation |
| Rules | \`.claude/rules/\` | Enforcement summary | Conditionally loaded by \`paths\` pattern match |
| Standard | \`claudeos-core/standard/\` | Detailed guide | Manually Read via Rules \`## Reference\` links |
| Skills | \`claudeos-core/skills/\` | Scaffolding automation | Registered in MANIFEST.md |
| Memory | \`claudeos-core/memory/\` | Persistent team knowledge | On-demand Read only |

### Layer relationships

\`\`\`
CLAUDE.md (overview) → Rules (enforcement) → Standard (detailed)
                                               ↑ Reference link
\`\`\`

- **CLAUDE.md ↔ Rules ↔ Standard content overlap is NOT duplication.** Each layer has a different role and density.
- **Memory and Rules/CLAUDE.md content overlap is NOT duplication.** Memory is on-demand loaded, Rules are auto-loaded. Different loading mechanisms.

---

## 2. Rules File Writing Rules

### [CRITICAL] paths frontmatter required

Every \`.claude/rules/\` file MUST have \`paths\` in YAML frontmatter. Without it, Claude Code cannot determine when to load the rule.

\`\`\`markdown
---
paths:
  - "**/*"
---
# Rule Title
\`\`\`

### paths scope settings

| Scope | paths | Examples |
|-------|-------|---------|
| All code files | \`"**/*"\` | Architecture, naming, coding conventions |
| Document files only | \`"**/claudeos-core/**"\`, \`"**/.claude/**"\` | Document writing rules |
| Config files only | \`"**/*.json"\`, \`"**/*.env*"\`, \`"**/*.yml"\` | Environment/config rules |
| Specific directory | \`"**/claudeos-core/**"\`, \`"**/.claude/**"\` | Sync rules |

Do NOT propose narrowing core rules \`"**/*"\` to specific patterns — this increases management complexity and risks rules not loading when needed.

### Rules file structure

\`\`\`markdown
---
paths:
  - "pattern"
---
# Rule Title

- Rule items (bullet points)
- Code examples recommended

## Reference
- claudeos-core/standard/XX.category/YY.name.md
\`\`\`

- **Write concisely**: detailed content goes in Standard, Rules are enforcement summary only.
- **\`## Reference\` required**: always link to the corresponding Standard document.
- Do not judge short Rules files as "needs expansion".

---

## 3. Standard File Writing Rules

- Standard files are detailed guides — **long files are normal**. Do not judge as "too large" or "needs splitting".
- File naming: \`number.name.md\` (e.g., \`01.project-overview.md\`)
- When adding a new Standard, also add it to the \`00.standard-reference.md\` list.

---

## 4. Skills File Writing Rules

- When adding a new skill, register it in \`skills/00.shared/MANIFEST.md\`.
- If a skill generates Rules files, those Rules MUST include \`paths\` frontmatter.
- Reference paths in skill templates must be verified against actual project files.

---

## 5. Planned References

Paths and directories referenced in documents may not yet exist on disk. These are **planned references for future implementation**.

Do NOT label them as:
- "missing", "MISSING", "inconsistency" — planned item, normal
- "needs deletion", "stale", "dead reference" — future addition, preserve
- "needs correction", "path error" — intentional reference, no change needed

When discovered during review/audit, **do not report as issues — preserve as-is**.

---

## 5-1. Multi-Layer Defensive Rule Placement is Intentional

The same defensive rules (no duplication judgment, no planned reference deletion, no speculation, etc.) are **intentionally repeated across multiple Rules files**. Do NOT judge this as "duplication → needs consolidation".

### Design intent

Each Rules file is loaded in a different work context (standard reference lookup, general coding, document editing). Repeating defensive principles ensures they are active in each context.

Even when multiple files are loaded simultaneously:
- **Reinforcement effect**: repeated exposure increases AI compliance
- **Independent context preservation**: each file is self-contained in its context

### Prohibited

- Do not report this placement as an optimization target in context analysis
- "Co-loaded therefore redundant" is a hallucination
- Do not propose "consolidate into 52.ai-work-rules.md and replace others with references"

---

## 5-2. Do Not Over-Report Topic Repetition as "Duplication" or "Inconsistency Risk"

The same topic (directory structure, API rules, environment variables, path aliases, state management, etc.) may be mentioned in CLAUDE.md and multiple Rules files. This is because **each occurrence serves a different layer role (overview vs enforcement) or domain role (architecture vs security vs config)** — it is not duplication.

### Prohibited

- Do not report tens-of-lines repetition as a "context optimization issue"
- Do not produce "removing duplication saves N lines/bytes" analysis
- Do not over-report trivial expression differences (comment phrasing, item count differences) as "inconsistency risk"
- If no information is missing, it is not a problem

---

## 6. No Domain-Specific Hardcoding

When adding or modifying rules in \`claudeos-core/standard/\`, \`.claude/rules/\`, or \`claudeos-core/skills/\`, **never hardcode project-specific domain names**. Always write in generic, reusable patterns.

### Rationale

These documents are project-wide **common rules**. If specific domain names appear, developers working on other domains may ignore the rules as irrelevant.

---

## 6-1. No System Absolute Path Hardcoding

**Never hardcode system absolute paths** (\`/Users/xxx/\`, \`/home/xxx/\`, \`C:\\\\Users\\\\xxx\\\\\`) in documents.

- ❌ \`/Users/developer/projects/my-app/src/...\`
- ✅ \`current working directory\` or project-relative path (\`src/...\`)

### Rationale

Absolute paths are specific to one developer's local environment and cannot be used in other environments. Always use relative paths or generic expressions to ensure document portability.

---

## 6-2. Code Examples Must Follow Project Conventions

When writing code examples in documents (file paths, import statements, directory tree diagrams), **follow the project's naming conventions**. Specifically:

- **Directory structure examples must reflect actual project structure** — do not guess or invent fictional paths
- **Follow the project's file naming convention** — check existing files before writing examples
- **Verify paths exist** before including them in documentation

### Rationale

If document examples differ from actual code conventions, developers following the Standard may write incorrectly named code. Examples are normative — they must match the real project.

---

## 7. Change Synchronization Procedure

After modifying documents, always synchronize related files:

| Changed | Sync target |
|---------|-------------|
| Standard modified | Corresponding Rules file |
| Rules modified | Corresponding Standard (\`## Reference\` link still valid?) |
| Skills modified | \`MANIFEST.md\` |
| Document added | \`00.standard-reference.md\` list |

After changes, directly verify related files (Rules ↔ Standard) and update consistently.
`;

/**
 * Scaffold doc-writing-guide standard file.
 * Scans 00.core/ for the next available number.
 * @param {string} standardCoreDir - path to claudeos-core/standard/00.core/
 * @param {object} [opts]
 * @param {boolean} [opts.overwrite=false]
 * @returns {{ file: string, status: string }}
 */
function scaffoldDocWritingGuide(standardCoreDir, { overwrite = false, lang = "en" } = {}) {
  ensureDir(standardCoreDir);

  // Check if doc-writing-guide already exists (any number)
  const existing = fs.readdirSync(standardCoreDir)
    .filter(f => f.endsWith(".doc-writing-guide.md"));
  if (existing.length > 0 && !overwrite) {
    return { file: existing[0], status: "skipped" };
  }

  // Find next available number
  const nums = fs.readdirSync(standardCoreDir)
    .map(f => parseInt(f.match(/^(\d+)\./)?.[1], 10))
    .filter(n => !isNaN(n));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const fileName = `${String(nextNum).padStart(2, "0")}.doc-writing-guide.md`;

  const target = existing.length > 0 && overwrite
    ? path.join(standardCoreDir, existing[0])
    : path.join(standardCoreDir, fileName);

  const cacheFile = cachePathFor(standardCoreDir, lang);
  const content = translateIfNeeded(STANDARD_DOC_WRITING_GUIDE, lang, "STANDARD_DOC_WRITING_GUIDE", cacheFile);
  const ok = writeFileSafe(target, content);
  return { file: path.basename(target), status: ok ? "written" : "error" };
}

// ─── Skills MANIFEST stub (English static fallback) ────────
// Pass 3c is expected to generate claudeos-core/skills/00.shared/MANIFEST.md,
// but the stack pass3.md templates list it among generation targets without
// marking it REQUIRED. On frontend-only or skill-sparse projects Claude may
// omit it, leaving .claude/rules/50.sync/03.skills-sync.md (which names
// MANIFEST.md as the single source of truth for skill registration) pointing
// at a non-existent file. This gap-fill creates a minimal stub in Pass 4 if
// the file is missing after Pass 3 completes — same contract as
// scaffoldDocWritingGuide (skip if exists, write English or translated stub).
const SKILLS_MANIFEST_STUB = `# Skill Registry

_Single source of truth for registered skills in this project._
_Referenced by: \`.claude/rules/50.sync/03.skills-sync.md\`_

## How to register a skill

When adding a new skill under \`claudeos-core/skills/\`, append an entry below
with its path, purpose, and the orchestrator file that invokes it.

## Registered skills

| Skill | Orchestrator | Purpose |
|-------|-------------|---------|
| _(none registered yet)_ | — | — |

## Sync contract

- When a skill file is added/renamed/deleted under \`claudeos-core/skills/\`,
  update this manifest in the same commit.
- When this manifest is modified, \`.claude/rules/50.sync/03.skills-sync.md\`
  is NOT modified — it references this file by path, not by content.
`;

/**
 * Create claudeos-core/skills/00.shared/MANIFEST.md if absent.
 * Skip-safe: returns { status: "skipped" } when the file already exists with
 * any non-trivial content.
 *
 * @param {string} skillsSharedDir - absolute path to .../claudeos-core/skills/00.shared
 * @param {object} [opts]
 * @param {boolean} [opts.overwrite=false]
 * @param {string}  [opts.lang="en"]
 * @returns {{ file: string, status: string }}
 */
function scaffoldSkillsManifest(skillsSharedDir, { overwrite = false, lang = "en" } = {}) {
  ensureDir(skillsSharedDir);
  const target = path.join(skillsSharedDir, "MANIFEST.md");
  if (existsSafe(target) && !overwrite) {
    // Guard against Pass 3c producing an empty MANIFEST.md — only skip if it
    // has real content (> 20 chars, trimming BOM/whitespace).
    const current = readFileSafe(target, "");
    const stripped = current.replace(/^\uFEFF/, "").trim();
    if (stripped.length > 20) return { file: "MANIFEST.md", status: "skipped" };
  }
  const cacheFile = cachePathFor(skillsSharedDir, lang);
  const content = translateIfNeeded(SKILLS_MANIFEST_STUB, lang, "SKILLS_MANIFEST_STUB", cacheFile);
  const ok = writeFileSafe(target, content);
  return { file: "MANIFEST.md", status: ok ? "written" : "error" };
}

module.exports = {
  MEMORY_FILES,
  RULE_FILES_00,
  RULE_FILES_60,
  CLAUDE_MD_APPEND,
  STANDARD_DOC_WRITING_GUIDE,
  SKILLS_MANIFEST_STUB,
  scaffoldMemory,
  scaffoldRules,
  appendClaudeMdL4Memory,
  scaffoldMasterPlans,
  scaffoldDocWritingGuide,
  scaffoldSkillsManifest,
};
