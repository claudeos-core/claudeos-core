Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Build Tool Consistency:
Check `stack.buildTool` and `stack.packageManager` in project-analysis.json.
ALL generated files MUST use the detected build tool's commands (e.g., Gradle or Maven).
NEVER mix Gradle/Maven commands. Also verify actual task names from build files.

CRITICAL — Cross-file Consistency:
Rules (.claude/rules/) and Standards (claudeos-core/standard/) MUST NOT contradict each other.
If a standard defines a specific pattern (e.g., import path, file naming, API usage),
the corresponding rule MUST use the same pattern. Before generating each rule file,
verify it is consistent with the related standard file.

CRITICAL — Code Example Accuracy:
ALL code examples in rules and standards MUST use EXACT method names, class names,
and signatures from pass2-merged.json analysis data.
Do NOT paraphrase, rename, or infer API names. If pass2-merged.json records
`ApiResponseUtil.success()`, use `success()` — NOT `ok()`, NOT `respond()`.
If a method signature is not captured in the analysis data,
write "See corresponding standard for exact API" instead of guessing.

CRITICAL — MyBatis Mapper Path Accuracy:
When documenting MyBatis mapper XML paths (in CLAUDE.md, standards, or guide files),
use the EXACT path from pass2-merged.json analysis data.
Do NOT assume `src/main/resources/mapper/{domain}/` as default.
Real projects may use non-standard paths such as:
  - `src/main/resources/mybatis/mappers/` (flat)
  - `src/main/resources/mybatis/mappers/{schema}/` (schema-prefixed)
  - `src/main/resources/mybatis/mappers/{datasource}/` (multi-datasource)
If the analysis data contains the actual mapper path, use it verbatim.
If not captured, write "Check src/main/resources/ for actual mapper XML location"
instead of guessing.

CRITICAL — Response Flow Consistency (MOST COMMON SOURCE OF ERRORS):
Determine from pass2-merged.json which layer (Controller vs Aggregator vs Service) calls
the response wrapper (e.g., makeResponse(), ResponseEntity.ok()).
This answer MUST be identical across ALL generated files:
  - 02.architecture.md (request flow diagram and layer responsibility table)
  - 01.controller-patterns.md (Controller response handling section)
  - 04.response-exception.md (response wrapping examples)
  - controller-rules.md (response rule)
  - scaffold-crud-feature skills (generated code templates)
If pass2-merged.json says "Controller calls makeResponse", then EVERY file must show
Controller calling makeResponse. Do NOT write that Aggregator returns ResponseEntity
in one file and Controller calls makeResponse in another.
Similarly, if an Aggregator/Orchestrator layer exists, its responsibilities
(DTO↔VO conversion, multi-service orchestration, response wrapping or not)
MUST be described identically across architecture.md, controller-patterns.md,
response-exception.md, and all skills files.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files, not just core.
Include all backend-api, security-db, infra, and verification standards.
Alternatively, add a note directing readers to .claude/rules/00.core/00.standard-reference.md
for the complete list.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (based on detected stack)
   - Build & Run Commands (Gradle/Maven)
   - Core architecture diagram
   - DB table naming conventions
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, modules, API server info
   - 00.core/02.architecture.md — Layer structure, request flow, package structure
   - 00.core/03.naming-conventions.md — Class/DTO/Entity/table naming conventions
   - 10.backend-api/01.controller-patterns.md — Controller writing rules + examples
   - 10.backend-api/02.service-patterns.md — Transactions, DI, business logic patterns
   - 10.backend-api/03.data-access-patterns.md — ORM patterns (tailored to detected MyBatis/JPA/QueryDSL)
   - 10.backend-api/04.response-exception.md — Response/error handling patterns
   - 10.backend-api/05.dto-validation.md — DTO writing rules, Validation
   - 10.backend-api/06.interceptor-filter-aop.md — Middleware, AOP, logging interceptors
   - 20.frontend-ui/* — (generate only if frontend detected)
   - 30.security-db/01.security-auth.md — Authentication, authorization, CORS
   - 30.security-db/02.database-schema.md — DDL, migrations, audit columns
   - 30.security-db/03.common-utilities.md — Common utilities, constants, Base classes
   - 40.infra/01.environment-config.md — Profiles, environment variables, configuration management
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
     > For detailed patterns and examples, Read: claudeos-core/standard/10.backend-api/01.controller-patterns.md
     ```
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]` — always loaded (architecture, naming are universally needed)
     - `10.backend/*` rules: `paths: ["**/*"]` — always loaded (backend rules needed for any source editing)
     - `30.security-db/*` rules: `paths: ["**/*"]` — always loaded (cross-cutting concerns)
     - `40.infra/*` rules: `paths: ["**/*.yml", "**/*.yaml", "**/*.properties", "**/config/**", "**/*.gradle*", "**/Dockerfile*", "**/.env*"]` — loaded only for config/infra files
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]` — loaded only when editing claudeos-core files
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
     ## Backend API
     - claudeos-core/standard/10.backend-api/01.controller-patterns.md
     - claudeos-core/standard/10.backend-api/02.service-patterns.md
     - claudeos-core/standard/10.backend-api/03.data-access-patterns.md
     - claudeos-core/standard/10.backend-api/04.response-exception.md
     - claudeos-core/standard/10.backend-api/05.dto-validation.md
     - claudeos-core/standard/10.backend-api/06.interceptor-filter-aop.md
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
     ## DO NOT Read (context waste)
     - claudeos-core/generated/ — Build metadata. Not for coding reference.
     - claudeos-core/guide/ — Onboarding/usage guides for humans. Not for coding reference.
     - claudeos-core/mcp-guide/ — MCP server integration docs. Not for coding reference.
     ```
     List only the standard files that were actually generated above. Include frontend standards only if frontend was detected.

4. .claude/rules/50.sync/ (3 sync rules — AI fallback reminders)
   - NOTE: These rules remind AI to run `npx claudeos-core refresh` after modifying standard/rules/skills files.
   - 01.standard-sync.md — Remind AI to update corresponding rule when standard is modified
   - 02.rules-sync.md — Remind AI to update corresponding standard when rules are modified
   - 03.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator)
   - 10.backend-crud/scaffold-crud-feature/01~08 (sub-skills: controller, service, repository, entity, dto, migration, test, index)
   - 20.frontend-page/* (only if frontend detected)
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
7. claudeos-core/database/ (DB documentation)
   - 01.schema-overview.md — Table list, ER diagram description
   - 02.migration-guide.md — Migration procedure, rollback methods

8. claudeos-core/mcp-guide/ (MCP server integration guide)
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
