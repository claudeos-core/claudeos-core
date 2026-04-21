Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Package Manager Consistency:
Check `stack.packageManager` in project-analysis.json (e.g., "pnpm", "yarn", "npm").
ALL generated files MUST use ONLY that detected package manager's commands.
For example, if packageManager is "pnpm": use `pnpm run build`, `pnpm run dev`, `pnpm install`, etc.
NEVER mix npm/yarn/pnpm commands. Also check `scripts` field in the project's package.json
for actual script names (e.g., "eslint" not "lint", "typecheck" not "tsc --noEmit").

CRITICAL — Cross-file Consistency:
Rules (.claude/rules/) and Standards (claudeos-core/standard/) MUST NOT contradict each other.
If a standard defines a specific pattern (e.g., import path, file naming, API usage),
the corresponding rule MUST use the same pattern. Before generating each rule file,
verify it is consistent with the related standard file.

CRITICAL — Code Example Accuracy:
ALL code examples in rules and standards MUST use EXACT method names, class names,
and signatures from pass2-merged.json analysis data.
Do NOT paraphrase, rename, or infer API names.
If a method signature is not captured in the analysis data,
write "See corresponding standard for exact API" instead of guessing.

CRITICAL — Response Flow Consistency:
Determine from pass2-merged.json which layer (Controller/Router vs Service/UseCase) calls
the response wrapper. This MUST be identical across architecture.md, controller/router-patterns.md,
response-exception.md, and controller-rules.md. Do NOT describe different response flows in different files.

Generation targets:

1. CLAUDE.md (project root)

   Follow the scaffold EXACTLY:
   → `pass-prompts/templates/common/claude-md-scaffold.md`

   The scaffold enforces an 8-section deterministic structure:
   1. Role Definition → 2. Project Overview → 3. Build & Run Commands →
   4. Core Architecture → 5. Directory Structure → 6. Standard / Rules / Skills Reference →
   7. DO NOT Read → 8. Common Rules & Memory (L4)

   All section titles, order, and formats are FIXED by the scaffold.
   Content within each section adapts to this project based on pass2-merged.json.
   The scaffold's validation checklist MUST pass.

   Stack-specific hints for this project (Node.js Express):
   - Project type for Section 1 PROJECT_CONTEXT: "API Server" or the actual character of the project
   - Architecture diagram (Section 4): middleware → route → controller → service layers
   - Use ONLY the detected packageManager in Section 3 (never mix npm/yarn/pnpm)
   - DB naming conventions: belong in standard/00.core/03.naming-conventions.md (not CLAUDE.md)

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, modules, API server info
   - 00.core/02.architecture.md — Layer structure, request flow, directory structure
   - 00.core/03.naming-conventions.md — File/variable/type naming conventions
   - 10.backend-api/01.router-controller-patterns.md — Routing patterns + middleware
   - 10.backend-api/02.service-patterns.md — DI, transactions, business logic
   - 10.backend-api/03.data-access-patterns.md — ORM patterns, query optimization
   - 10.backend-api/04.response-exception.md — Response/error handling patterns
   - 10.backend-api/05.validation-dto.md — Validation, DTO patterns
   - 10.backend-api/06.middleware-interceptor.md — Middleware, Guard, Interceptor
   - 30.security-db/01.security-auth.md — JWT, Guard, CORS, Rate Limit
   - 30.security-db/02.database-schema.md — Migrations, seeds, schema conventions
   - 30.security-db/03.common-utilities.md — Common utils, helpers, constants
   - 40.infra/01.environment-config.md — Environment variables, config management
   - 40.infra/02.logging-monitoring.md — Logging standards, monitoring, alerts
   - 40.infra/03.cicd-deployment.md — CI/CD pipeline, deployment strategy
   - 50.verification/01.development-verification.md — Build, startup, API testing
   - 50.verification/02.testing-strategy.md — Testing strategy, mocking, coverage

   Each file MUST include:
   - Correct examples (✅ code blocks)
   - Incorrect examples (❌ code blocks)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained, no external references)
   - Include 5-15 lines of key rules with concrete examples
   - Do NOT use @import — it is not a Claude Code feature and does not work
   - Each rule file MUST end with a `## Reference` section linking to the corresponding standard file(s):
     ```
     ## Reference
     > For detailed patterns and examples, Read: claudeos-core/standard/10.backend-api/01.router-controller-patterns.md
     ```
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]` — always loaded (architecture, naming are universally needed)
     - `10.backend/*` rules: `paths: ["**/*"]` — always loaded (backend rules needed for any source editing)
     - `30.security-db/*` rules: `paths: ["**/*"]` — always loaded (cross-cutting concerns)
     - `40.infra/01.environment-config-rules.md` paths: `["**/.env*", "**/config/**", "**/*.json"]` — env / config files
     - `40.infra/02.logging-monitoring-rules.md` paths: `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]` — source code where logs live
     - `40.infra/03.cicd-deployment-rules.md` paths: `["**/*.yml", "**/*.yaml", "**/Dockerfile*", "**/*.ts", "**/*.js"]` — CI config + source
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]` — loaded only when editing claudeos-core files
     - `60.memory/*` rules: forward reference — Pass 4 will generate 4 files (01.decision-log, 02.failure-patterns, 03.compaction, 04.auto-rule-update), each with file-specific `paths`. Pass 3 must STILL list ```.claude/rules/60.memory/*``` as a row in CLAUDE.md Section 6 Rules table so developers/Claude see the category exists.
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — a directory of all standard files. This is NOT a "read all" instruction. Claude should Read ONLY the standards relevant to the current task. Structure it as:
     ```
     ---
     paths:
       - "**/*"
     ---
     # Standard Documents Directory
     Below is the complete list of standard files. Read ONLY the ones relevant to your current task — do NOT read all files.
     Each rule file in .claude/rules/ links to its corresponding standard in the ## Reference section. Follow those links first.
     This directory is for discovering standards that have no corresponding rule file.
     ## Core
     - claudeos-core/standard/00.core/01.project-overview.md
     - claudeos-core/standard/00.core/02.architecture.md
     - claudeos-core/standard/00.core/03.naming-conventions.md
     - claudeos-core/standard/00.core/04.doc-writing-guide.md
     ## Backend API
     - claudeos-core/standard/10.backend-api/01.router-controller-patterns.md
     - claudeos-core/standard/10.backend-api/02.service-patterns.md
     - claudeos-core/standard/10.backend-api/03.data-access-patterns.md
     - claudeos-core/standard/10.backend-api/04.response-exception.md
     - claudeos-core/standard/10.backend-api/05.validation-dto.md
     - claudeos-core/standard/10.backend-api/06.middleware-interceptor.md
     ## Security & DB
     - claudeos-core/standard/30.security-db/01.security-auth.md
     - claudeos-core/standard/30.security-db/02.database-schema.md
     - claudeos-core/standard/30.security-db/03.common-utilities.md
     ## Infra & Verification
     - claudeos-core/standard/40.infra/01.environment-config.md
     - claudeos-core/standard/40.infra/02.logging-monitoring.md
     - claudeos-core/standard/40.infra/03.cicd-deployment.md
     - claudeos-core/standard/50.verification/01.development-verification.md
     - claudeos-core/standard/50.verification/02.testing-strategy.md
     ```
     List only the standard files that were actually generated above. NOTE: `00.core/04.doc-writing-guide.md` is a FORWARD REFERENCE — Pass 4 will generate it; include it anyway. Do NOT add a "DO NOT Read" section here — that information lives in CLAUDE.md Section 7 (the single source of truth).

4. .claude/rules/50.sync/ (2 sync rules — AI fallback reminders)
   - NOTE: These rules remind AI to run `npx claudeos-core refresh` after modifying standard/rules/skills files.
   - 01.doc-sync.md — Bidirectional standard ↔ rules sync reminder (both directions in ONE rule).
     Do NOT generate a separate 02.rules-sync.md mirror file — redundant.
     Express the mapping as a naming convention (standard/<N>.<dir>/<M>.<n>.md ↔
     .claude/rules/<N>.<dir>/<M>.<n>-rules.md), NOT a hardcoded file-to-file table.
   - 02.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator)
   - 10.backend-crud/scaffold-crud-feature/01~08 (sub-skills: router, controller, service, repository, dto, migration, test, index)
   - 00.shared/MANIFEST.md (skill registry)

6. claudeos-core/guide/ (all)
   - 01.onboarding/01.overview.md
   - 01.onboarding/02.quickstart.md
   - 01.onboarding/03.glossary.md
   - 02.usage/01.faq.md
   - 02.usage/02.real-world-examples.md
   - 02.usage/03.do-and-dont.md
   - 03.troubleshooting/01.troubleshooting.md
   - 04.architecture/01.file-map.md
   - 04.architecture/02.pros-and-cons.md
7. claudeos-core/database/
   - 01.schema-overview.md — Table/collection list, relationship description
   - 02.migration-guide.md — Migration procedure, rollback methods

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
