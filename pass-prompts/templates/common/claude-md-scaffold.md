# CLAUDE.md Scaffold Template (v2.2.0+)

This scaffold enforces structural determinism across all generated CLAUDE.md files.
CONTENT adapts to each project based on pass2-merged.json.
STRUCTURE is FIXED and MUST NOT be reordered, renamed, merged, or extended.

## Why this scaffold exists

Prior to v2.2.0, CLAUDE.md generation specified required CONTENT items but did not
fix the structure. LLM choices varied between runs and between projects, producing
inconsistent section counts, names, and ordering. This problem only became visible
when claudeos-core was applied to multiple projects in the same organization.

This scaffold makes CLAUDE.md generation deterministic:
- Section count: EXACTLY 8
- Section titles: FIXED (see below)
- Section order: FIXED
- Section formats: SPECIFIED per section

## Hard constraints

**EXACTLY 8 SECTIONS. No more, no less.**

Before finalizing CLAUDE.md, count `^## ` lines. The count MUST be 8.
If the count is 9 or more, merge surplus content into existing sections:
- Memory-related surplus → Section 8 sub-section 2 (L4 Memory)
- Common rules (51·52, doc-writing, ai-work) → Section 8 sub-section 1 (Common Rules)
- Rules-reference (directory index) → Section 6 (Standard / Rules / Skills Reference)
- Rule enumeration beyond those → MOVE to `.claude/rules/*` or `standard/*`, not CLAUDE.md

DO NOT:
- Add new top-level (`##`) sections beyond the 8 defined
- Remove any of the 8 sections (use minimal content if empty)
- Rename sections
- Change section order
- Merge the 8 sections with each other
- Create a `##`-level section whose name (or its translation in the
  target output language) has the semantic meaning of "Common Rules",
  "Required to Observe While Working", "Rules Summary", "Documentation
  Writing Rules", "AI Common Rules", "L4 Memory Integration Rules",
  or "Memory Layer" (as a standalone section), or any variation that
  collects rules, procedures, or memory content. "Common Rules" and
  "L4 Memory" each belong as a SUB-SECTION (`###`) inside Section 8,
  not as their own top-level `##` section.
  All other enforcement rule BODIES belong in `.claude/rules/*`
  (auto-loaded via paths glob) or `claudeos-core/standard/*`.
- Restate the L4 memory table or workflow twice under different headings
  — it appears exactly once, only in Section 8 sub-section 2.

## Section heading format (MANDATORY)

The 8 canonical section headings below (`## 1. Role Definition` through
`## 8. Common Rules & Memory (L4)`) use English as their canonical form.
When generating CLAUDE.md in a non-English output language, the English
canonical heading MUST remain the primary heading text AND a
native-language translation MUST be appended in parentheses.

This dual requirement exists for two reasons. First, multiple projects
in the same organization will have their CLAUDE.md files consumed
together (multi-repo grep, cross-repo navigation, side-by-side review).
When every project uses a different native-language translation for the
same section, even when the structure is otherwise identical,
discoverability breaks: `grep "## 7. DO NOT Read"` no longer matches
all siblings. Second, when the CONTENT below the heading is written in
the target language (e.g., Korean body), a Korean reader scanning the
document benefits from seeing a Korean gloss next to the English
canonical token — the heading reads both as a stable grep target AND as
an intelligible label. Run-to-run consistency matters too: gloss
inclusion must not vary between generations of the same project.

Format rule:
- Primary (REQUIRED): English canonical heading exactly as listed.
- Parenthetical (REQUIRED when `{OUTPUT_LANG}` != `en`, OMITTED when
  `{OUTPUT_LANG}` == `en`): native-language translation, added at the
  end in parentheses.

Canonical translations — use these verbatim when `{OUTPUT_LANG}` matches:

| Code  | §1 | §2 | §3 | §4 | §5 | §6 | §7 | §8 |
|-------|----|----|----|----|----|----|----|----|
| `en`  | (no gloss — English is canonical) |
| `ko`  | (역할 정의) | (프로젝트 개요) | (빌드 및 실행 명령어) | (핵심 아키텍처) | (디렉터리 구조) | (Standard / Rules / Skills 참조) | (직접 읽지 말아야 할 파일) | (공통 규칙 및 메모리 (L4)) |
| `zh-CN` | (角色定义) | (项目概述) | (构建和运行命令) | (核心架构) | (目录结构) | (Standard / Rules / Skills 参考) | (请勿直接读取的文件) | (通用规则与内存 (L4)) |
| `ja`  | (役割定義) | (プロジェクト概要) | (ビルド＆実行コマンド) | (コアアーキテクチャ) | (ディレクトリ構造) | (Standard / Rules / Skills 参照) | (直接読まないファイル) | (共通ルール＆メモリ (L4)) |
| `es`  | (Definición del rol) | (Resumen del proyecto) | (Comandos de compilación y ejecución) | (Arquitectura central) | (Estructura de directorios) | (Referencia Standard / Rules / Skills) | (Archivos que NO se deben leer) | (Reglas comunes y memoria (L4)) |
| `vi`  | (Định nghĩa vai trò) | (Tổng quan dự án) | (Lệnh build và chạy) | (Kiến trúc cốt lõi) | (Cấu trúc thư mục) | (Tham chiếu Standard / Rules / Skills) | (Tệp KHÔNG được đọc) | (Quy tắc chung & bộ nhớ (L4)) |
| `hi`  | (भूमिका परिभाषा) | (परियोजना अवलोकन) | (बिल्ड और रन कमांड) | (मुख्य आर्किटेक्चर) | (निर्देशिका संरचना) | (Standard / Rules / Skills संदर्भ) | (न पढ़ने योग्य फ़ाइलें) | (सामान्य नियम और मेमोरी (L4)) |
| `ru`  | (Определение роли) | (Обзор проекта) | (Команды сборки и запуска) | (Основная архитектура) | (Структура каталогов) | (Справочник Standard / Rules / Skills) | (Файлы, которые НЕ следует читать) | (Общие правила и память (L4)) |
| `fr`  | (Définition du rôle) | (Aperçu du projet) | (Commandes de build et d'exécution) | (Architecture principale) | (Structure des répertoires) | (Référence Standard / Rules / Skills) | (Fichiers à NE PAS lire) | (Règles communes & mémoire (L4)) |
| `de`  | (Rollendefinition) | (Projektübersicht) | (Build- und Ausführungsbefehle) | (Kernarchitektur) | (Verzeichnisstruktur) | (Standard / Rules / Skills-Referenz) | (Nicht zu lesende Dateien) | (Gemeinsame Regeln & Speicher (L4)) |

Examples (ko output):

    ✅ `## 1. Role Definition (역할 정의)`
    ✅ `## 7. DO NOT Read (직접 읽지 말아야 할 파일)`
    ❌ `## 1. Role Definition`
        — gloss is required when OUTPUT_LANG != en
    ❌ `## 7. 읽지 말 것 (Files Not to Be Read Directly)`
        — English must be primary, not parenthetical
    ❌ `## 7. 읽지 말 것`
        — English canonical must appear as primary

Examples (ja output):

    ✅ `## 7. DO NOT Read (直接読まないファイル)`
    ❌ `## 7. DO NOT Read`
        — gloss is required when OUTPUT_LANG != en
    ❌ `## 7. 直接読まないファイル (DO NOT Read)`
        — English must be primary, not parenthetical

Examples (en output):

    ✅ `## 7. DO NOT Read`
    ❌ `## 7. DO NOT Read (Files Not to Be Read Directly)`
        — gloss must be OMITTED when OUTPUT_LANG == en
        (the English canonical already serves as the label)

For `{OUTPUT_LANG}` codes not in the table above, translate each
canonical heading semantically into the target language and append in
parentheses following the same pattern. The CONTENT below the heading
is written entirely in the target language regardless of the gloss.

DO:
- Adapt content within each section to project facts from pass2-merged.json
- Use placeholder values (`{PROJECT_CONTEXT}`, `{OUTPUT_LANG}`) where specified
- Follow per-section format rules
- When unsure where information belongs, consult the "Per-section generation rules"
  below. Anything not fitting the 8 sections belongs OUTSIDE CLAUDE.md.

## Template structure

Use the following structure EXACTLY:

```markdown
# CLAUDE.md — {PROJECT_NAME}

> {1-2 line project intro}

{!-- SECTION HEADING RULE (applies to all 8 ## headings below):
     The heading format "## N. English Canonical" shown in this scaffold
     is the en (English) form. For non-English OUTPUT_LANG, APPEND the
     canonical gloss in parentheses per the "Section heading format"
     table earlier in this scaffold.
     Example (ko): `## 1. Role Definition (역할 정의)`
     Example (en): `## 1. Role Definition`  (no gloss)
     --}

## 1. Role Definition

{!-- Line 1 below is in English for reference only. When OUTPUT_LANG != en,
     REPLACE with the canonical translation from "Section 1: Role Definition"
     rules further down in this scaffold. See the 10-language canonical list. --}
As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in {OUTPUT_LANG}.
{PROJECT_CONTEXT}.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | {language with version} |
| Framework | {framework with version} |
| ... (8-12 rows total) |

## 3. Build & Run Commands

{OPTIONAL: Top warning - [CRITICAL] for env requirements, or bold text for package manager rules}

```bash
# {install command with comment}
{install command}

# {dev/build/test commands with inline comments}
{command 1}          # {purpose / port / build engine}
{command 2}
...
```

{OPTIONAL: Bottom reference to single source of truth}

## 4. Core Architecture

### Overall Structure

{ASCII diagram in code block}

### Data Flow

{Arrow chain or numbered list of data flow steps}

### Core Patterns

- **{pattern name}**: {explanation}
- **{pattern name}**: {explanation}
- ... (3-5 bullets)

### Absent / Not Adopted (OPTIONAL — include only if project deliberately avoids categories)

- {Generic category} ({optional parenthetical examples})
- ...

## 5. Directory Structure

```
{project root or src/}/
├─ {dir}/       # {role}
├─ {dir}/       # {role}
│  └─ {subdir}/ # {role}
└─ ...
```

**{emphasis 1}**: {explanation}
**{emphasis 2}**: {explanation}
(Maximum 3 emphasis bullets below the tree)

## 6. Standard / Rules / Skills Reference

### Standard (Single Source of Truth)

| Path | Description |
|---|---|
| `claudeos-core/standard/{path}` | {1-line description} |
| ... (list ALL generated standard files individually) |

### Rules (Auto-loaded Guardrails)

| Path | Description |
|---|---|
| `.claude/rules/00.core/00.standard-reference.md` | Standard documentation index |
| `.claude/rules/{category}/*` | {what's enforced} |
| ... (use wildcards per category) |

### Skills (Automated Repeated-task Procedures)

- `claudeos-core/skills/00.shared/MANIFEST.md` — Skill registry
- `claudeos-core/skills/{path}` — {purpose}

## 7. DO NOT Read (Files Not to Be Read Directly)

| Path | Reason |
|---|---|
| `claudeos-core/guide/` | Human-oriented documentation. Key content already captured in rules files. |
| `claudeos-core/generated/` | Auto-generated metadata. Internal use only. |
| `claudeos-core/mcp-guide/` | Key content already captured in rules files. Internal use only. |
| {conventional build output} | {1-line reason} |

## 8. Common Rules & Memory (L4)

### Common Rules (auto-loaded on every edit)

Global guardrails applied automatically to every documentation and code edit. Loaded via `paths: ["**/*"]`.

| Rule File | Role | Core Enforcement |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Documentation writing rules | {1-line meta summary} |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI work rules | {1-line meta summary} |
{| additional paths-universal rules if any |}

For detailed guidance, Read `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### L4 Memory (on-demand reference)

Long-term context (decisions · failures · compaction · auto-proposals) is stored in `claudeos-core/memory/`.
Unlike rules that auto-load via `paths` glob, this layer is referenced **on-demand**.

#### L4 Memory Files

| File | Purpose | Behavior |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Permanent record of the "why" behind design choices | Append-only. Skim at session start; Read before any architectural change. Add a new entry when a decision is made. |
| `claudeos-core/memory/failure-patterns.md` | Repeated errors and their remedies | Searched at session start and whenever an error occurs. Record only when the pattern repeats (≥2 occurrences), the root cause is non-obvious, and the remedy is undocumented. |
| `claudeos-core/memory/compaction.md` | Declares the 4-stage compaction policy | Modify only when the policy itself changes. Execute compaction solely via `npx claudeos-core memory compact`. |
| `claudeos-core/memory/auto-rule-update.md` | Machine-generated rule change proposals | Review → Accept → Edit the rule → Record in `decision-log.md`. Do NOT edit this file directly. Regenerate via `npx claudeos-core memory propose-rules`. |

#### Memory Workflow

1. **Session start**: Scan `failure-patterns.md` to be aware of frequently occurring errors.
2. **Skim recent decisions**: Skim recent entries in `decision-log.md` to avoid overwriting architectural decisions that have already been agreed upon.
3. **Record new decisions**: When making a significant design decision (choosing between competing patterns, adopting or rejecting a library, fixing a convention, etc.), append to `decision-log.md`.
4. **Record repeated errors**: If the same error occurs ≥2 times and the root cause is non-obvious, register it in `failure-patterns.md` with a new pattern-id.
5. **Periodic compaction**: When a memory file approaches 400 lines or has not been tidied up for over a month, run `npx claudeos-core memory compact`.
6. **Review rule-update proposals**: Review proposals in `auto-rule-update.md` with confidence ≥ 0.70. When accepting, edit the corresponding rule file and log the decision in `decision-log.md`.

**Session Resume (after auto-compact or restart)**: Claude Code's auto-compact feature may truncate session context mid-work, and a restarted session starts with a fresh context window. When resuming work:

- **Re-scan** `failure-patterns.md` — error patterns referenced pre-compact may have been dropped from context.
- **Re-read the 3 most recent entries** of `decision-log.md` — new decisions may have been recorded during the truncated portion of the session.
- **Re-match rules by `paths` glob** for the current working files — CLAUDE.md is always loaded, but `paths`-conditional rules may not have been re-loaded after compact. Explicitly Read the relevant rule files if needed.
```

---

## Per-section generation rules

### Section 1: Role Definition

**Structure**: EXACTLY 2 lines.

**Line 1** (fixed meaning, EMIT IN THE TARGET OUTPUT LANGUAGE — do NOT copy the English reference verbatim unless `{OUTPUT_LANG}` is English):

The sentence below is the **semantic reference in English**. Translate it
fully into `{OUTPUT_LANG}`. The English text is NOT a literal template —
copying it verbatim for a non-English target produces the ironic bug of
writing "Responses must be written in Korean" in English.

English reference (semantic, for `en` output only):
```
As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in {OUTPUT_LANG}.
```

**Canonical translations** — emit these VERBATIM when `{OUTPUT_LANG}` matches
the target language. If `{OUTPUT_LANG}` is some other language not listed
here, translate the English reference following the same semantic
structure (senior developer + write/modify/review code + respond in target
language):

- `en` →
  `As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in English.`
- `ko` (한국어) →
  `이 리포지토리의 시니어 개발자로서 코드 작성, 수정, 리뷰를 책임진다. 응답은 한국어로 작성해야 한다.`
- `zh-CN` (简体中文) →
  `作为此仓库的高级开发者，负责代码的编写、修改和审查。回答必须使用简体中文。`
- `ja` (日本語) →
  `このリポジトリのシニア開発者として、コードの記述、修正、レビューを担当する。回答は日本語で記述すること。`
- `es` (Español) →
  `Como desarrollador senior de este repositorio, eres responsable de escribir, modificar y revisar código. Las respuestas deben estar escritas en español.`
- `vi` (Tiếng Việt) →
  `Với tư cách là lập trình viên cấp cao của kho lưu trữ này, bạn chịu trách nhiệm viết, sửa đổi và đánh giá mã. Các câu trả lời phải được viết bằng tiếng Việt.`
- `hi` (हिन्दी) →
  `इस रिपॉजिटरी के वरिष्ठ डेवलपर के रूप में, आप कोड लिखने, संशोधित करने और समीक्षा करने के लिए ज़िम्मेदार हैं। उत्तर हिन्दी में लिखे जाने चाहिए।`
- `ru` (Русский) →
  `Как старший разработчик этого репозитория, вы отвечаете за написание, изменение и проверку кода. Ответы должны быть написаны на русском языке.`
- `fr` (Français) →
  `En tant que développeur senior de ce dépôt, vous êtes responsable de l'écriture, de la modification et de la révision du code. Les réponses doivent être rédigées en français.`
- `de` (Deutsch) →
  `Als Senior-Entwickler dieses Repositorys sind Sie für das Schreiben, Ändern und Überprüfen von Code verantwortlich. Antworten müssen auf Deutsch verfasst werden.`

**Line 2** (`{PROJECT_CONTEXT}` — dynamically generated, Level 2 abstraction):

Generate `{PROJECT_CONTEXT}` as a single sentence combining:
- Stack name (generic form): `Java Spring Boot`, `React + Vite`, `Python Django`, `Node.js Express`, `Next.js App Router`
- Project type: "Backend Application", "Back Office SPA", "Front Office SPA", "REST API Server", "Full-stack Web Application"
- 1-2 architectural differentiators (using generic category terms)

**INCLUDE** (Level 2 — generic terms):
- Stack labels: "Java Spring Boot", "React + Vite"
- Architecture pattern names: "Layered Architecture", "Multi-entry", "Dual Build"
- Generic category terms: "Dual RDBMS", "XML-based SQL Mapper", "3-tier Authentication"

**EXCLUDE** (no hardcoding):
- Specific component names (PrimaryButton, ApiClient, AuthProvider)
- Specific product names (PostgreSQL, MariaDB, Redis, MyBatis, Prisma)
- Specific file paths (apiClient.ts, vite.config.desktop.ts)
- Specific counts (18 domains, 3 layers)
- Specific versions (React 19.1.0, Spring Boot 3.2)
- Specific domain names (admin, guide, orders)

**Source**: pass2-merged.json architecture/stack sections.

### Section 2: Project Overview

**Format**: 2-column table with 8-12 rows.

**Required rows** (adapt per stack; column labels and row titles are emitted in the target output language):
- Language (with version)
- Framework (with version; use "Not X" for disambiguation if needed)
- Build Tool or Package Manager
- Main library (UI library for frontend, ORM/SQL mapper for backend)
- Execution environment (server port / dev server port)
- External dependencies (backend server, DB, session store)

**Optional rows** (include if distinctive):
- SPA Entry (multi-entry projects)
- Build Structure (dual builds, special configurations)
- Test Status (if notable — e.g., "0% coverage")
- Development Status Caveat (in-progress migrations, MOCK data usage)
- Forbidden Package Manager (brief form, e.g., "npm (pnpm, yarn forbidden)")

**Environment variables** (REQUIRED when `stack.envInfo` exists in pass2-merged.json):

When the project declares environment variables (via `.env.example` or
`.env`), the table MUST reflect what the project actually declares, not
framework defaults. Specifically:

- **Port row**: use `stack.envInfo.port` or `stack.port` (both already
  resolved from the project's env file). Annotate with the env var name
  in parentheses. Example (emit row labels in target output language):
  `| Dev Server Port | 3000 (\`VITE_DESKTOP_PORT\`) |`
  NOT `| Dev Server Port | 5173 |` when the project declares 3000.
- **Host row** (if `stack.envInfo.host` exists): add a row showing the
  declared dev host. Example:
  `| Dev Server Host | \`localhost\` (\`VITE_DEV_HOST\`) |`
- **API target row** (if `stack.envInfo.apiTarget` exists): add a row
  showing the backend proxy/API target. Example:
  `| API Proxy Target | \`http://localhost:8080\` (\`VITE_API_TARGET\`) |`
- **Additional ports** (if `stack.envInfo.vars` contains multi-port
  patterns like `*_MOBILE_PORT`, `*_STORYBOOK_PORT`): inline them in the
  port row using ` · ` as separator, OR add dedicated rows.
- **Source file** (`stack.envInfo.source`, e.g., `.env.example`): do NOT
  include the source filename in the table itself — that metadata is for
  prompt-time attribution, not user-facing CLAUDE.md content. Use it only
  to verify which file the values came from.

General rule: if the project's env file declares something, the CLAUDE.md
table must match it. Framework defaults (Vite 5173, Next.js 3000, Django
8000) are LAST RESORT — only used when env files are silent.

**SECURITY — Do NOT include sensitive values in CLAUDE.md**:
- Only reference PORT / HOST / API_TARGET variables (the three scaffolded
  row types above). These are non-sensitive runtime configuration values.
- DO NOT populate table rows with values from variables named like
  `*_PASSWORD`, `*_SECRET`, `API_KEY`, `*_TOKEN`, `*_CREDENTIAL`,
  `PRIVATE_KEY`, `JWT_SECRET`, `CLIENT_SECRET`, etc. These are
  automatically redacted to `***REDACTED***` by env-parser anyway, but
  the scaffold explicitly forbids referencing them as a defense-in-depth.
- If `stack.envInfo.vars` contains a value equal to `***REDACTED***`,
  that variable was redacted for security. Treat it as non-existent for
  CLAUDE.md purposes — do NOT write the sentinel string into the table.
- Rationale: CLAUDE.md is committed to VCS and sometimes published. A
  misconfigured `.env.example` (containing real secrets by mistake) must
  not have those secrets amplified into project documentation.

**DO NOT INCLUDE** (belongs in other sections):
- Response wrapping style → Section 4
- Exception handling strategy → should go in rules/standard
- Encryption details → rules/standard
- Connection pool details → Section 4 or omit
- DB migration warnings → rules/standard
- Route guard details → Section 4

**Style**:
- Prefer specific versions (e.g., "5.8.3") but major-only is acceptable
- Negation allowed concisely: "Not Next.js", "TanStack Query Not Adopted"
- Use parentheses for clarifying annotations

**Source**: pass2-merged.json stack/tooling sections, including `stack.envInfo`.

### Section 3: Build & Run Commands

**Structure**: 3 parts.

**Part 1 (OPTIONAL)**: Top warning
- Use `**[CRITICAL] {warning}**` for environmental requirements (JDK version, runtime)
- Use **bold text** for package manager restrictions
- Examples (emit in target output language):
  - `**[CRITICAL] Java 21 required** — the system default Java may not be 21, so ...`
  - `This project standardizes on **npm** as its package manager. \`yarn\` / \`pnpm\` commands are forbidden.`

**Part 2 (REQUIRED)**: Single bash code block with 4-7 commands
- Include dependency install command
- Include dev/run command
- Include build command
- Include test command (if applicable)
- Include project-specific commands if critical (migration, codegen trigger)
- Add inline comments for: port number, build engine, purpose, current state warnings
- **Port comment accuracy**: When adding a port comment next to a dev/run
  command (e.g., `# dev server (port 3000)`), use the port from
  `stack.envInfo.port` or `stack.port` in pass2-merged.json. Do NOT write
  the framework's theoretical default (5173 for Vite, 3000 for Next.js,
  8000 for Django) if the project's env file declares a different value.

**Part 3 (OPTIONAL)**: Bottom reference
- Point to single source of truth: "Treat package.json's scripts as the single source of truth"
- Reference skill files for complex procedures
- Restate critical restrictions briefly

**Source**: pass2-merged.json scripts/buildTool/packageManager sections,
plus `stack.envInfo` for port accuracy.

### Section 4: Core Architecture

**Structure**: 3-4 sub-sections.

**Sub-section 1 (REQUIRED)**: `### Overall Structure` (emit heading in target output language)
- ASCII diagram in code block
- Choose shape based on project type:
  - Layered backend: vertical chain
  - Multi-entry frontend: boxes + tree
  - Single-app frontend: vertical tree
  - Microservices: boxes with arrows
- Under 15 lines

**Sub-section 2 (REQUIRED)**: `### Data Flow`
- Arrow chain (1-2 lines) for simple flows
- Numbered list (3+ steps) for complex flows with transformations

**Sub-section 3 (REQUIRED)**: `### Core Patterns`
- 3-5 bullets
- Each reflects a distinctive architectural decision
- Use bold prefix: `- **{pattern name}**: {explanation}`

**Sub-section 4 (OPTIONAL)**: `### Absent / Not Adopted`
- Include when pass2-merged.json reveals deliberate NON-adoption
- Common candidates: state management libs, server state cache, error tracking, route guards
- Each item: single line, generic category + parenthetical examples

**DO NOT INCLUDE**:
- Specific file paths (→ Section 5)
- Version numbers (→ Section 2)
- Build/run commands (→ Section 3)

### Section 5: Directory Structure

**Structure**: Tree diagram + up to 3 emphasis bullets below.

**Tree format**:
- Use UTF-8 box drawing: `├─`, `└─`, `│`
- Maximum 30-40 lines per tree
- For backend projects: separate trees for source packages vs resources
- For frontend/fullstack: single unified tree
- Include inline comments for key folders only
- Use placeholders where applicable: `{domain}/`, `{screen}/`, `{Table}`, `{DB}`

**Emphasis bullets (MAX 3)**:
Priority order:
1. Auto-generated / do-not-modify paths
2. Synchronization requirements (multi-file sync, dual-write)
3. Separation/sharing boundaries (device split, module boundaries)

Format: `**{category}**: {explanation}`

**If 4+ items seem necessary**, move overflow to rules/standard instead of cramming.

### Section 6: Standard / Rules / Skills Reference

**Structure**: EXACTLY 3 sub-sections.

**Sub-section 1**: `### Standard (Single Source of Truth)`
- Table format: `| Path | Description |` OR `| Area | Path |` (pick one, stay consistent)
- List EVERY generated standard file individually
- Description: 1-line
- Source: list of generated standard files

**Sub-section 2**: `### Rules (Auto-loaded Guardrails)`
- Table format OR bullet list (choose based on project size)
- Use WILDCARDS by category: `.claude/rules/{category}/*`
- Always include: `00.standard-reference.md`, `50.sync/*`, `60.memory/*`
  - **`60.memory/*` is mandatory** — the directory itself is created by
    Pass 4 (4 rule files: 01.decision-log, 02.failure-patterns, 03.compaction,
    04.auto-rule-update), but Section 6's Rules table MUST include a
    `.claude/rules/60.memory/*` row at Pass 3 generation time as a
    forward reference. This keeps the table's category index complete
    and tells Claude Code that L4 memory rules auto-load when editing
    the corresponding memory files. DO NOT omit it on the grounds that
    "Pass 4 hasn't run yet" — the row describes the CATEGORY, not the
    individual files.
- Description: what's enforced per category (not per file)
- **IMPORTANT**: `.claude/rules/00.core/*` wildcard row COVERS
  `51.doc-writing-rules.md`, `52.ai-work-rules.md`, and all other 00.core rules.
  Do NOT list these individually in Section 6 and do NOT create a separate
  `##`-level section ("Documentation Writing Rules", "AI Common Rules")
  for them — the wildcard already references them, and they are
  auto-loaded via their `paths` frontmatter. The DETAILED universal-rules
  table (with per-file meta-summary) belongs in Section 8 sub-section 1,
  not here. Section 6's role is the directory index; Section 8's role
  is the always-on layer summary. When a reader wants to see "what gets
  auto-loaded on every edit", they go to Section 8.
  Example row (emit text in target output language):
  `.claude/rules/00.core/*` | Project / Architecture / Naming /
  Documentation / AI-work rules (see §8 Common Rules table for the
  detailed enforcement of 51·52, which auto-load on every edit) |
  Example row for 60.memory:
  `.claude/rules/60.memory/*` | Auto-loaded when editing L4 memory
  files (decision-log · failure-patterns · compaction · auto-rule-update) |
  Example row for 70.domains (only when the project has multi-batch
  domain output — see "Per-domain folder convention" below):
  `.claude/rules/70.domains/*` | Auto-loaded when editing files within
  a specific domain (paths-scoped, one rule file per domain) |

**Per-domain folder convention (canonical, v2.4.0+)**:

When a project has multiple distinct domains and Pass 3 emits per-domain
output (typical for backends with ≥4 domains, multi-batch runs, or
projects where rules need domain-specific `paths` glob scoping), the
canonical folder is **`70.domains/{type}/`** (PLURAL collection +
ALWAYS-typed sub-folder), and each file inside uses the singular
domain name:

  - `claudeos-core/standard/70.domains/{type}/{domain}.md` — `{type}`
    is `backend` or `frontend`
  - `.claude/rules/70.domains/{type}/{domain}-rules.md` — per-domain rule
    (with `paths` frontmatter scoping to that domain's source directories)

The `{type}/` sub-folder is ALWAYS present, even in single-stack
projects (backend-only or frontend-only). Reasons: (1) zero file moves
when a single-stack project later adds the other stack, (2) no LLM
probabilistic drift between Pass 3 runs (one pattern always), (3) one
pattern for validators to recognize, (4) future-proof for new stack
types (mobile/cli/agent).

The Pass 3 orchestrator (`bin/commands/init.js`) classifies each domain
via `project-analysis.json` and emits per-domain target paths
explicitly in the batch scope note — you (the LLM) should follow the
explicit paths shown there.
  - `claudeos-core/skills/{category}/domains/{domain}.md` — per-domain
    skill notes (sub-folder under skill category, no number prefix
    because skills/ is a separate namespace from standard/rules)
  - `claudeos-core/skills/{category}/02.domains.md` — sibling
    ORCHESTRATOR for the `domains/` sub-folder (REQUIRED whenever
    `domains/` is populated). Mirrors the canonical pattern
    `01.scaffold-*-feature.md` ↔ `scaffold-*-feature/`: orchestrator
    file at category root + sub-folder of the same stem. Stem
    (`domains`) MUST match sub-folder name so `content-validator`'s
    standard orchestrator-stem matching covers the sub-skills
    directly without depending on the global-MANIFEST coverage
    fallback. The per-domain note files INSIDE `domains/` carry NO
    numeric prefix (`payment.md`, not `01.payment.md`) — domains are
    independent siblings without execution order, unlike the
    sequenced CRUD sub-skills (`01.dto.md` → `08.test.md`) where
    numbers encode the scaffolding step order.

The `70.` prefix sits AFTER `60.memory` (which is regression-guarded to
60) and BEFORE `90.optional`, giving per-domain content its own clean
slot in the rules numbering. The folder name is plural (`domains/`)
because it holds N files, one per project domain — matching the standard
filesystem convention `users/user.md`, `posts/post.md`. The other
numbered category folders (`00.core/`, `10.backend/`, etc.) are singular
because each represents ONE topic, not a collection.

DO NOT use `60.domains/` (collides with `60.memory/`) and DO NOT use
`70.domain/` (singular folder is incorrect for a collection).

**Sub-section 3**: `### Skills (Automated Repeated-task Procedures)`
- Bullet list
- Include ONLY skills that actually exist
- Always include: `00.shared/MANIFEST.md`
- Format: `path — purpose`

**DO NOT INCLUDE** (moves to Section 7):
- `claudeos-core/guide/` (go to Section 7)
- `claudeos-core/generated/` (go to Section 7)
- `claudeos-core/mcp-guide/` (go to Section 7)

### Section 7: DO NOT Read

**Structure**: 2-column table, 3-5 rows total.

**ALWAYS INCLUDE (3 common items)** (emit row text in target output language):
```
| claudeos-core/guide/      | Human-oriented documentation. Key content already captured in rules files. |
| claudeos-core/generated/  | Auto-generated metadata. Internal use only. |
| claudeos-core/mcp-guide/  | Key content already captured in rules files. Internal use only. |
```

**INCLUDE conventional build outputs** (detect from pass2-merged.json buildTool):
- Vite / Webpack / Rollup → `dist/`
- Next.js → `.next/`
- Gradle → `build/`
- Maven → `target/`
- Python → `__pycache__/`, `dist/`
- Storybook (if present) → `storybook-static/`

**DO NOT INCLUDE**:
- Auto-generated source code directories (generated-api-client/, dto/generate/, etc.) — handled in Section 5 emphasis
- Project-specific build variants (dist-guide/, dist-mobile/) — not conventional
- Project-specific documentation output paths
- Environment files (.env*) — handled by rules/40.infra/*

**TARGET ITEM COUNT**: 3-5 items.

### Section 8: Common Rules & Memory (L4)

**Structure**: 2 sub-sections.

**Rationale**: CLAUDE.md's Section 6 Rules table is a structural INDEX
("which rule files exist, grouped by category"). Section 8's first
sub-section serves a different purpose: it documents WHICH rules
auto-load on EVERY edit (i.e., the universal guardrails the developer
should keep mentally active), plus a meta-summary of what each enforces.
These two views are complementary, not redundant — Section 6 shows the
map, Section 8 sub-section 1 shows the always-on layer.

**Sub-section 1 (REQUIRED)**: `### Common Rules (auto-loaded on every edit)` (emit heading in target output language)

- 2-column or 3-column table. Recommended: `| Rule File | Role | Core Enforcement |`
- Include ONLY rules whose `paths` frontmatter is `["**/*"]` (universal
  auto-load). Typical entries:
  - `.claude/rules/00.core/51.doc-writing-rules.md`
  - `.claude/rules/00.core/52.ai-work-rules.md`
  - Any other `paths: ["**/*"]` rule generated for this stack.
- Each row's "Core Enforcement" column must be a META SUMMARY (one
  line, what the rule enforces at a high level), NOT a copy of the
  rule body.
  - ✅ "paths frontmatter required, no hardcoding, topic repetition is acknowledged as intentional reinforcement"
  - ❌ Copying 5 paragraphs from the rule file
- End with a 1-line reference: "For detailed guidance, Read `claudeos-core/standard/...`"
  when a corresponding standard file exists.

**Sub-section 2 (REQUIRED)**: `### L4 Memory (on-demand reference)` (emit heading in target output language)

Intro (1-2 sentences, fixed template — emit in target output language):
```
Long-term context (decisions · failures · compaction · auto-proposals) is stored in `claudeos-core/memory/`.
Unlike rules that auto-load via `paths` glob, this layer is referenced **on-demand**.
```

Table: `#### L4 Memory Files` — FIXED 4-row table
- decision-log.md — Append-only. Permanent record of the "why" behind design choices.
- failure-patterns.md — Repeated errors and their remedies (conditions: ≥2 occurrences, non-obvious root cause, undocumented remedy).
- compaction.md — 4-stage compaction policy.
- auto-rule-update.md — Machine-generated rule change proposals (regenerate via `npx claudeos-core memory propose-rules`).

Workflow: `#### Memory Workflow` — FIXED 6-step numbered list
1. Session start — failure-patterns scan
2. Skim recent decisions — decision-log recent
3. Record new decisions — decision-log append
4. Record repeated errors — failure-patterns add
5. Periodic compaction — memory compact command
6. Review rule-update proposals — auto-rule-update review

**Session Resume block** (RECOMMENDED, follows the 6-step numbered list
as prose — not a new H4 subsection). Opens with bold label
`**Session Resume (after auto-compact or restart)**:` followed by a
3-bullet list covering: re-scan `failure-patterns.md`, re-read the 3
most recent entries of `decision-log.md`, and re-match rules by `paths`
glob for current working files. This block addresses Claude Code's
auto-compact behavior that may truncate session context mid-work.

New CLAUDE.md generation (`npx claudeos-core init`) emits this block
by default. Existing CLAUDE.md files without it remain structurally
valid — the validator does not enforce Session Resume presence, only
that if present it follows the prose-not-H4 form.

The Session Resume block MUST NOT be a `####` subsection — the Section
8 structural validator enforces EXACTLY 2 `####` headings (L4 Memory
Files + Memory Workflow). Session Resume is prose inside the Memory
Workflow section, not a sibling heading.

**Section 8 single-occurrence rule** (enforces the "one canonical home"
principle):
- The L4 Memory Files table appears EXACTLY ONCE in the entire document
  — inside sub-section 2 (`L4 Memory`). No other location.
- The Memory Workflow (6-step numbered list) appears EXACTLY ONCE — same
  location, after the L4 Memory Files table.
- The Common Rules meta-summary table appears EXACTLY ONCE — inside
  sub-section 1. No sibling, no echo, no restatement.

**Out-of-scope content** (do NOT place under Section 8):
- Project-specific memory details — those go inside `memory/*.md` files
- Master plan references — `plan/` was removed in v2.1.0

**Language**: Use `{OUTPUT_LANG}` throughout this section. All headings,
table column labels, intro sentences, and workflow step labels shown
above in English MUST be emitted in the target output language.

---

## Dynamic substitution variables

| Variable | Source | Example |
|---|---|---|
| `{PROJECT_NAME}` | pass2-merged.json `project.name` or directory name | `my-backend-api` |
| `{OUTPUT_LANG}` | Target output language resolved from the CLI `--lang` flag | `en`, `ko`, `ja`, `zh-CN`, ... (10 supported) |
| `{PROJECT_CONTEXT}` | LLM-generated Level 2 description | See Section 1 rules |

---

## Validation checks (post-generation)

**MANDATORY FINAL CHECK — count `^## ` lines in the generated CLAUDE.md.**
The count MUST be exactly 8. If it is 9 or more, a surplus section was created
— locate it and either merge its content into the correct section from 1-8, 
move it to `.claude/rules/*` or `standard/*`, or delete it entirely if it
duplicates existing rules. Then recount.

Common surplus sections that MUST be removed/merged (match by
semantic meaning in ANY output language — the English labels below
are canonical, target-language renderings are equivalent):
- "Common Rules" (as a `##` section) → move content to Section 8
  sub-section 1 ("Common Rules (auto-loaded on every edit)")
- "L4 Memory Integration Rules" / "Memory Layer (L4)" (as a `##`
  section) → merge into Section 8 sub-section 2; delete duplicate
  tables/workflows
- "Documentation Writing Rules" / "AI Common Rules" (as standalone
  `##` sections) → move as rows into Section 8 sub-section 1's
  common-rules table
- "Required to Observe While Working" / "Rules Summary" → move
  enforcement content to `.claude/rules/*`, not CLAUDE.md
- Any section whose title has the semantic meaning of "rules" beyond
  Section 8's "Common Rules & Memory (L4)" top-level title

Before finalizing, verify:

- [ ] **Exactly 8 `##` top-level sections (count them!)**
- [ ] Section titles match the FIXED set (Role Definition, Project
      Overview, Build & Run Commands, Core Architecture, Directory
      Structure, Standard / Rules / Skills Reference, DO NOT Read,
      Common Rules & Memory (L4)) — rendered in the target output
      language with equivalent meaning and order
- [ ] **Section heading gloss rule:**
      If `{OUTPUT_LANG}` != `en`, EVERY one of the 8 `##` headings MUST
      carry the parenthetical native-language gloss from the canonical
      table in "Section heading format". Example (ko):
      `## 1. Role Definition (역할 정의)`, `## 7. DO NOT Read (직접 읽지 말아야 할 파일)`.
      If any heading is missing its gloss while `{OUTPUT_LANG}` != `en`,
      the output is NON-COMPLIANT — add the gloss before finalizing.
- [ ] **English gloss-absence rule:**
      If `{OUTPUT_LANG}` == `en`, headings MUST NOT carry a parenthetical
      gloss (the English canonical already serves as the label).
      `## 7. DO NOT Read` is correct; `## 7. DO NOT Read (Files Not to Be
      Read Directly)` is incorrect for `en` output.
- [ ] Section order is correct
- [ ] No sections renamed, merged, or split
- [ ] No sections added beyond the 8
- [ ] Section 1 is 2 lines
- [ ] Section 1 Line 1 is in `{OUTPUT_LANG}` — matches the canonical
      translation in "Section 1: Role Definition" rules (if
      `{OUTPUT_LANG}` is one of the 10 canonical codes). If Line 1
      contains the English phrase "As the senior developer" while
      `{OUTPUT_LANG}` is NOT `en`, the translation was skipped — fix it.
- [ ] Section 2 is 8-12 rows table
- [ ] Section 5 has at most 3 emphasis bullets below tree
- [ ] Section 6 has EXACTLY 3 sub-sections (Standard / Rules / Skills)
- [ ] Section 6 Rules row for `00.core/*` includes a reference pointing
      to Section 8's Common Rules table for auto-loaded rules
- [ ] Section 7 has the 3 common claudeos-core/* entries
- [ ] Section 8 has EXACTLY 2 sub-sections (Common Rules + L4 Memory)
- [ ] Section 8 sub-section 1 (Common Rules) lists ONLY rules with `paths: ["**/*"]`
- [ ] Section 8 sub-section 1 meta-summary column is 1 line per row, NOT a rule-body copy
- [ ] Section 8 sub-section 2 L4 memory table has exactly 4 rows
- [ ] Section 8 sub-section 2 workflow has exactly 6 steps
- [ ] Section 8 L4 table and workflow appear EXACTLY ONCE in the whole document
- [ ] Section 1 PROJECT_CONTEXT contains NO hardcoded component/product names

---

## Examples

### Example: Section 1 for different stacks

⚠️ **Language note:** The English examples below show the SEMANTIC
structure only. Line 1 of Section 1 MUST be emitted in `{OUTPUT_LANG}` —
use the canonical translations from "Section 1: Role Definition" rules
above. Line 2 (PROJECT_CONTEXT) should also be written in
`{OUTPUT_LANG}`, keeping technical identifiers (framework names, pattern
names, stack labels) in their standard English form where idiomatic.

**Java Spring Boot backend**:
```
As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in {OUTPUT_LANG}.
A Java Spring Boot backend application with a layered architecture, implemented on top of a dual RDBMS with an XML-based SQL mapper and a read/write mapper split.
```

**React + Vite Back Office SPA**:
```
As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in {OUTPUT_LANG}.
A React + Vite Back Office SPA that, on top of multiple HTML entry points and per-domain page separation, follows a 3-tier authentication approach combining API response normalization, session guards, and button-level permission checks.
```

**Python Django API**:
```
As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in {OUTPUT_LANG}.
A Python Django REST API server providing a multi-tenant structure on top of an RDBMS + cache layer, including an asynchronous task queue.
```

---

## Usage from pass3 prompts

Pass 3b prompts for each stack MUST reference this scaffold:

```
CLAUDE.md generation MUST follow the scaffold at:
`pass-prompts/templates/common/claude-md-scaffold.md`

Section structure, titles, and order are FIXED.
Content within each section adapts to this project based on pass2-merged.json.
```

The scaffold supersedes any previous CLAUDE.md generation instructions.
