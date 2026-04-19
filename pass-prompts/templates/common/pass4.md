# Pass 4 — L4 Memory & Feedback Layer

You are generating the initial scaffolding for the L4 Memory layer on top of the
existing ClaudeOS-Core output. Read these two files to understand the project:

- `{{PROJECT_ROOT}}/claudeos-core/generated/project-analysis.json`
- `{{PROJECT_ROOT}}/claudeos-core/generated/pass2-merged.json`

Then generate the files listed below **exactly as specified**. Do NOT invent
additional files. Do NOT modify existing Pass 3 output in `standard/`, `skills/`,
`guide/`, `plan/`, `database/`, `mcp-guide/`.

You **WILL** create new rule files in `.claude/rules/60.memory/`,
and **append** a new section to the existing `CLAUDE.md`.

**Language rule:** All generated content (rule descriptions, CLAUDE.md append section,
compaction categories, decision-log seeds) must be written in **{{LANG_NAME}}**.
Frontmatter keys (`name`, `paths`) and file paths remain in English.

Memory scaffold files (sections 1–4) follow these rules:
- **Headings and description text** may be written in **{{LANG_NAME}}**.
- **CLI-parsed keywords MUST remain in English** (the CLI parses these literally):
  - `## Last Compaction` (compaction.md section heading)
  - `frequency:`, `importance:`, `last seen:` (failure-patterns.md field keys)
  - `fix` or `solution` (failure-patterns.md fix line detection)
- **Title lines** (`# Decision Log`, `# Failure Patterns`, etc.) may be translated.
- **Instructional text** should be translated.

---

## Required output — L4 Memory (`{{PROJECT_ROOT}}/claudeos-core/memory/`)

### 1. `memory/decision-log.md`
Start with the template below, then **append 3–5 seed entries** extracted from
`pass2-merged.json` that represent foundational architectural decisions already
made in this codebase. Each seed entry must be grounded in evidence from
pass2-merged.json — do NOT invent decisions.
Write the **title** (`# Decision Log`), the **descriptive italics** below it, and the seed entry **body text** in **{{LANG_NAME}}**. Keep the format specification's inline code literal (`## YYYY-MM-DD — <Title>`, `Context / Options / Decision / Consequences`).

Template header (translate the title and italics):
```markdown
# Decision Log

_Permanent record of "why" behind design choices. Append-only._
_Format: `## YYYY-MM-DD — <Title>` then Context / Options / Decision / Consequences._
```

Seed entry format (for each of the 3–5 seeds, dated today in `YYYY-MM-DD` format
— use the current UTC date; do NOT leave a literal placeholder):
```markdown
## <YYYY-MM-DD> — <Short title of the architectural choice>

- **Context:** <what in pass2-merged.json this is grounded on>
- **Options considered:** <optional — list if pass2-merged mentions alternatives>
- **Decision:** <the pattern observed>
- **Consequences:** <what this locks in for future work>
```

### 2. `memory/failure-patterns.md`
Write the title and descriptive italics in **{{LANG_NAME}}**. Keep CLI commands (`npx claudeos-core memory score`) literal. In the `_Format:` italics line, keep the format keywords `Frequency`, `Last Seen`, `Importance`, `Fix` literal in English (these names reappear as parsed field keys `frequency:`, `last seen:`, `importance:`, `fix:` in actual entries, and the memory CLI parser depends on that spelling surviving). Baseline template (translate the prose parts):

```markdown
# Failure Patterns

_Recurring errors and their fixes. Importance auto-scored by `npx claudeos-core memory score`._
_Format: `## <pattern-id>` with Frequency / Last Seen / Importance / Fix._
```

Do NOT add any seed entries — this file fills up as failures are encountered.

### 3. `memory/compaction.md`
Write the full compaction strategy document. Adapt it to this project:
- Include a "Project-specific error categories" section listing 2–4 categories
  based on the detected stack (e.g., for Kotlin: "Kotlin compilation errors",
  "Gradle build failures"; for Python: "Import errors", "Virtualenv drift").
- Write the project-specific categories section in **{{LANG_NAME}}**.

**Translate into {{LANG_NAME}}**: the title (`# Compaction Strategy`), descriptive italics, all `##`/`###` section headings (`Preservation Priority`, `Stages`, `Stage 1 — Summarize aged entries`, `Stage 2 — Merge duplicate patterns`, `Stage 3 — Drop low-importance entries`, `Stage 4 — Enforce file size cap`, `Project-specific error categories`), and the prose explanations under each heading (including bullet-point explanations like "Keep: pattern-id, frequency, one-line fix summary").

**Keep literal (do NOT translate)**: the `## Last Compaction` heading (CLI-parsed verbatim), all inline code values (`importance >= 7`, `lastSeen`, `frequency = sum`, `fix`, `rule-manifest.json`, `decision-log.md`, `failure-patterns.md`), and all CLI commands (`npx claudeos-core memory compact`).

Baseline template (translate per above, then append the project-specific section at the end):
```markdown
# Compaction Strategy

_4-stage compaction rules for `decision-log.md` and `failure-patterns.md`._
_Run via `npx claudeos-core memory compact`._

## Preservation Priority
Entries are preserved if ANY of:
- `importance >= 7`
- `lastSeen` within 30 days
- Referenced by an active rule (path listed in rule-manifest.json)

## Stages

### Stage 1 — Summarize aged entries
Entries older than 30 days with no recent reference are summarized:
- Keep: pattern-id, frequency, one-line fix summary
- Drop: verbose context, full stack traces

### Stage 2 — Merge duplicate patterns
Failure entries with the same root cause are merged:
- `frequency = sum`
- `lastSeen = max`
- `fix` unified to the most recent working solution

### Stage 3 — Drop low-importance entries
Entries with `importance < 3` AND `lastSeen > 60 days` are removed.

### Stage 4 — Enforce file size cap
Each target file is capped at 400 lines.
When exceeded, the oldest (by `lastSeen`) low-importance entries are dropped first.

## Project-specific error categories
<2–4 categories based on the detected stack, written in {{LANG_NAME}}>

## Last Compaction
(never — run `npx claudeos-core memory compact`)
```

### 4. `memory/auto-rule-update.md`
Write the title, descriptive italics, "How to apply" heading, the 3 how-to-apply steps, the "Proposals" heading, and the placeholder line in **{{LANG_NAME}}**. Keep CLI commands (`npx claudeos-core memory propose-rules`), file references (`decision-log.md`), and inline code literal. Baseline template (translate the prose parts):

```markdown
# Auto Rule Update Proposals

_Generated by `npx claudeos-core memory propose-rules`._
_Each proposal: failure pattern → affected rule → diff → confidence._

## How to apply
1. Review each proposal below.
2. If accepted, edit the affected rule file and commit.
3. Move the accepted proposal into `decision-log.md` as a record.

## Proposals
(none yet — run `npx claudeos-core memory propose-rules` after accumulating failure patterns)
```

---

## Required output — Rules (`.claude/rules/`)

Generate 6 rule files. Each file must include YAML frontmatter (`name`, `paths`) and markdown body.
**Frontmatter values stay in English; all body text (bullet points, descriptions, section headings like `## Reference`) MUST be written in {{LANG_NAME}}.** Keep literal in English: file paths, CLI commands, inline code (`` `...` ``), and the CLI-parsed field names (`frequency:`, `last seen:`, `importance:`, `fix:`) when they appear in examples.

### 5. `.claude/rules/00.core/51.doc-writing-rules.md`
Frontmatter: `name: Document Writing Rules`, `paths: ["**/*"]`
Body (write in **{{LANG_NAME}}**) must cover:
- [CRITICAL] Rules file paths frontmatter required — every `.claude/rules/` file must have `paths` in frontmatter, do not propose narrowing `**/*` to specific patterns
- [CRITICAL] No domain-specific or path hardcoding in rules; use generic placeholder patterns
- [CRITICAL] Code examples must mirror actual project structure (verify directory paths before writing examples)
- Topic repetition across rules/standard is intentional reinforcement, not duplication
- Planned references (paths that don't yet exist) are forward declarations; do not flag them as missing
- `## Reference` section at the end linking to corresponding standard files

### 6. `.claude/rules/00.core/52.ai-work-rules.md`
Frontmatter: `name: AI Work Rules`, `paths: ["**/*"]`
Body (write in **{{LANG_NAME}}**) must cover:
- Accuracy over token saving; verify before claiming
- 13 hallucination prevention patterns (see memory-scaffold static fallback for reference list)
- No unsolicited suggestions; ask when unsure
- Memory vs Rules — no duplication judgment (Memory is on-demand, Rules are auto-loaded)
- Planned references — no "missing" judgment
- Code/document generation accuracy — check actual source before guessing field names

### 7. `.claude/rules/60.memory/01.decision-log.md`
Frontmatter: `name: Decision Log`, `paths: ["claudeos-core/memory/decision-log.md"]`
Body (write in **{{LANG_NAME}}**): read timing (session start + before architectural changes), write timing
(competing patterns / library choice / convention / NOT doing something),
entry format (ISO date heading + Context / Options / Decision / Consequences),
append-only rule.

### 8. `.claude/rules/60.memory/02.failure-patterns.md`
Frontmatter: `name: Failure Patterns`, `paths: ["claudeos-core/memory/failure-patterns.md"]`
Body (write in **{{LANG_NAME}}**): read timing (session start + encountering an error), write timing (2nd occurrence +
non-obvious root cause + undocumented workaround), entry format with
**frequency**, **last seen**, **symptoms**, **root cause**, **fix** fields (keep these field names literal in English when showing example entries; prose explanations around them translate).
Never delete entries manually — use `npx claudeos-core memory compact`.

### 9. `.claude/rules/60.memory/03.compaction.md`
Frontmatter: `name: Compaction Strategy`, `paths: ["claudeos-core/memory/compaction.md"]`
Body (write in **{{LANG_NAME}}**): reference to the 4 stages and preservation rules. Do NOT edit unless intentionally
changing the compaction policy; do NOT run compaction logic manually — always use the CLI.

### 10. `.claude/rules/60.memory/04.auto-rule-update.md`
Frontmatter: `name: Auto Rule Update`, `paths: ["claudeos-core/memory/auto-rule-update.md"]`
Body (write in **{{LANG_NAME}}**): machine-generated proposals; review → accept → edit rule → record in decision-log.
Proposals with confidence >= 0.70 deserve serious consideration. Do NOT edit proposals directly.

---

## Required output — Master plan (`{{PROJECT_ROOT}}/claudeos-core/plan/`)

### 11. `plan/50.memory-master.md`
Master plan aggregating all 4 memory files using the `<file path="...">` format.
Include the full content of each memory file (including the seed decision-log entries
and project-specific compaction categories).

Write the plan's **title** (e.g., `# 50. Memory Master Plan`) and any **introductory sentence** before the `<file>` blocks in **{{LANG_NAME}}**. Inside each `<file path="...">` block, include the already-translated memory file content verbatim — do NOT re-translate or modify it.

---

## Required output — CLAUDE.md append

### 12. Append a new section to existing `CLAUDE.md`

Do NOT overwrite existing CLAUDE.md content — **append only** at the end.
The new section must include the `(L4)` marker in its top heading (the marker
is language-independent so the CLI fallback can detect it). For example, English:
`## Memory (L4)`, Korean: `## 메모리 (L4)`.

Include:
- Common rules table (references to `00.core/51.doc-writing-rules.md` and `52.ai-work-rules.md`)
- L4 Memory table with 4 files (decision-log, failure-patterns, compaction, auto-rule-update)
  — include Purpose and Action columns
- Master plan reference (`claudeos-core/plan/50.memory-master.md`)
- Memory workflow (6 numbered steps: scan failure-patterns at session start →
  skim recent decision-log → record decisions → record repeat errors →
  periodic `memory compact` → review `auto-rule-update.md` proposals)

Write this section in **{{LANG_NAME}}**, but keep the `(L4)` heading marker,
file paths, and CLI command names in English.

---

## Required output — Standard (`{{PROJECT_ROOT}}/claudeos-core/standard/00.core/`)

### 13. `claudeos-core/standard/00.core/XX.doc-writing-guide.md`
Scan `claudeos-core/standard/00.core/` for existing numbered files. Use the **next sequential number**
(e.g., if `01`, `02`, `03` exist, create `04.doc-writing-guide.md`).

This is the **detailed guide** corresponding to `.claude/rules/00.core/51.doc-writing-rules.md`.
Write entirely in **{{LANG_NAME}}**.

Body must cover:
1. **Document layer structure** — table with Layer/Path/Role/Loading for CLAUDE.md, Rules, Standard, Skills, Memory, Master Plan. Include a relationship diagram showing CLAUDE.md → Rules → Standard flow.
2. **Rules file writing rules** — paths frontmatter required, paths scope settings table, file structure template with `## Reference` section. Do not propose narrowing `**/*`.
3. **Standard file writing rules** — long files are normal, file naming (`number.name.md`), register in `00.standard-reference.md`.
4. **Skills file writing rules** — MANIFEST.md registration, paths frontmatter in generated rules, verify reference paths.
5. **Planned references** — paths that don't yet exist are forward declarations. Do not label as missing/stale/dead.
6. **Multi-layer defensive rule placement is intentional** — repetition across Rules files is reinforcement, not duplication. Do not propose consolidation.
7. **Topic repetition is not duplication** — same topic in CLAUDE.md + Rules + Standard serves different layer/domain roles. Trivial expression differences are not inconsistency risks.
8. **No domain-specific hardcoding** — use generic placeholder patterns.
9. **No system absolute path hardcoding** — use relative paths, include ❌/✅ examples.
10. **Code examples must follow project conventions** — verify directory structure, follow project naming conventions.
11. **Change synchronization procedure** — table showing Standard→Rules+Plan, Rules→Plan, Skills→MANIFEST+Plan sync targets.

---

## Completion marker

After all files are written, create:

`{{PROJECT_ROOT}}/claudeos-core/generated/pass4-memory.json`

```json
{
  "analyzedAt": "<ISO timestamp>",
  "passNum": 4,
  "memoryFiles": [
    "claudeos-core/memory/decision-log.md",
    "claudeos-core/memory/failure-patterns.md",
    "claudeos-core/memory/compaction.md",
    "claudeos-core/memory/auto-rule-update.md"
  ],
  "ruleFiles": [
    ".claude/rules/00.core/51.doc-writing-rules.md",
    ".claude/rules/00.core/52.ai-work-rules.md",
    ".claude/rules/60.memory/01.decision-log.md",
    ".claude/rules/60.memory/02.failure-patterns.md",
    ".claude/rules/60.memory/03.compaction.md",
    ".claude/rules/60.memory/04.auto-rule-update.md"
  ],
  "planFiles": [
    "claudeos-core/plan/50.memory-master.md"
  ],
  "standardFiles": [
    "claudeos-core/standard/00.core/XX.doc-writing-guide.md"
  ],
  "claudeMdAppended": true,
  "seededDecisions": <integer count of seed entries written to decision-log.md>
}
```

---

## Guardrails

- Do NOT modify existing Pass 3 output files in `claudeos-core/standard/` (except adding the new doc-writing-guide),
  `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`,
  `claudeos-core/mcp-guide/`.
- Do NOT modify existing `.claude/rules/00.core/00.*` through `.claude/rules/00.core/02.*` files (Pass 3 output).
- Do NOT modify existing `.claude/rules/10.backend/` through `.claude/rules/50.sync/` files.
- DO create `.claude/rules/00.core/51.doc-writing-rules.md` and `.claude/rules/00.core/52.ai-work-rules.md` (Pass 4 output).
- DO create `claudeos-core/standard/00.core/XX.doc-writing-guide.md` with the next sequential number (Pass 4 output).
- Do NOT overwrite existing CLAUDE.md content — **append only**.
- Do NOT translate CLI-parsed keywords in memory files: `## Last Compaction`, `frequency:`, `importance:`, `last seen:`, `fix`, `solution`.
- DO translate all other text in memory files (titles, descriptions, instructions) into **{{LANG_NAME}}**.
- DO write rule files (sections 5–10), standard file (section 13), and CLAUDE.md append section in **{{LANG_NAME}}**.
- Keep seed decision-log entries **grounded** in pass2-merged.json only. No hallucination.
- Use the current date (UTC, YYYY-MM-DD) for dated headings — substitute the real date,
  never leave `<YYYY-MM-DD>` or any placeholder-looking token as literal text.

---

## Output discipline (CRITICAL)

Do your work by writing files with the Write tool. When you finish, **end the conversation with a single short line only** — specifically:

```
Pass 4 complete.
```

Do NOT print a summary of what you created. Do NOT list the files you wrote. Do NOT report files that you "failed" to write because of tool errors or permission issues — those errors are visible in the tool result stream already, and duplicating them in prose confuses the init pipeline downstream.

The init orchestrator verifies completion by checking that `{{PROJECT_ROOT}}/claudeos-core/generated/pass4-memory.json` exists — nothing you print to the console affects that check. A verbose summary is at best redundant, and at worst (e.g. when you say "failed to create X" but the file actually got written) actively misleads the user. Stay silent and trust the marker file.
