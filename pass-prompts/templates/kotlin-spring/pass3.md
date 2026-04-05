Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Build Tool Consistency:
Check `stack.buildTool` and `stack.packageManager` in project-analysis.json.
ALL generated files MUST use the detected build tool's commands (e.g., Gradle tasks).
NEVER mix Gradle/Maven commands. Also verify actual task names from build.gradle(.kts).

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
Similarly, if an Aggregator/Orchestrator layer exists (DIFFERENT from DDD Aggregate Root),
its responsibilities (DTO↔VO conversion, multi-service orchestration, response wrapping or not)
MUST be described identically across architecture.md, controller-patterns.md,
response-exception.md, and all skills files.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files, not just core.
Include all backend-api, security-db, infra, and verification standards.
Alternatively, add a note directing readers to .claude/rules/00.core/00.standard-reference.md
for the complete list.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (Kotlin + Spring Boot + multi-module, mention CQRS if detected)
   - Build & Run Commands (Gradle tasks per module, e.g., :servers:command:reservation-command-server:bootRun)
   - Multi-module architecture diagram (BFF → Feign → Command/Query → DB)
   - Module list with ports and roles
   - DB table naming conventions
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack (Kotlin version, Spring Boot version), module list, server ports
   - 00.core/02.architecture.md — CQRS architecture, BFF layer, request flow (Client → BFF → Feign → Command/Query → DB), module dependency diagram
   - 00.core/03.naming-conventions.md — Kotlin class/file/package naming, DTO naming (Command vs Query DTOs), module naming
   - 10.backend-api/01.controller-patterns.md — Command controller vs Query controller rules + examples
   - 10.backend-api/02.service-patterns.md — Transactions, DI, Kotlin idioms, command/query service separation
   - 10.backend-api/03.data-access-patterns.md — ORM patterns (tailored to detected JPA/MyBatis/Exposed), read/write DB config
   - 10.backend-api/04.response-exception.md — Response/error handling patterns, sealed class exceptions
   - 10.backend-api/05.dto-vo-validation.md — Kotlin data class DTO rules, VO patterns (value class, immutability, equality by value), DTO vs VO usage guide, validation, nullable rules
   - 10.backend-api/06.aggregate-patterns.md — Aggregate boundary definition, Aggregate Root rules, repository-per-aggregate, inter-aggregate references (by ID only), domain event publishing, Aggregator service patterns (SKIP if no DDD/Aggregate patterns detected in pass2-merged.json)
   - 10.backend-api/07.bff-feign-patterns.md — BFF controller patterns, Feign Client conventions, response composition, error propagation (SKIP if project-analysis.json shows no BFF/CQRS architecture)
   - 10.backend-api/08.inter-module-communication.md — Feign contracts, Pub/Sub events, shared library usage rules (SKIP if single-module project without multi-module in project-analysis.json)
   - 20.frontend-ui/* — (generate only if frontend detected)
   - 30.security-db/01.security-auth.md — Authentication, authorization, CORS, inter-module auth
   - 30.security-db/02.database-schema.md — DDL, migrations, audit columns, read/write DB separation
   - 30.security-db/03.common-utilities.md — Shared-lib utilities, extension functions, constants, Base classes
   - 40.infra/01.environment-config.md — Profiles, multi-module config, Gradle Kotlin DSL, environment variables
   - 40.infra/02.logging-monitoring.md — kotlin-logging standards, structured logging, distributed tracing
   - 40.infra/03.cicd-deployment.md — CI/CD pipeline, Docker/K8s per module, deployment strategy
   - 50.verification/01.development-verification.md — Build, startup (per module), API testing
   - 50.verification/02.testing-strategy.md — Testing strategy (MockK, Kotest), per-module test approach

   Each file MUST include:
   - Correct examples (✅ code blocks in Kotlin)
   - Incorrect examples (❌ code blocks showing common mistakes)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained, no external references)
   - Include 5-15 lines of key rules with concrete examples
   - Do NOT use @import — it is not a Claude Code feature and does not work
   - CQRS-specific rules: include command/query separation rules directly in the rule file content
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
     - claudeos-core/standard/10.backend-api/05.dto-vo-validation.md
     - claudeos-core/standard/10.backend-api/06.aggregate-patterns.md (if generated)
     - claudeos-core/standard/10.backend-api/07.bff-feign-patterns.md (if generated)
     - claudeos-core/standard/10.backend-api/08.inter-module-communication.md (if generated)
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
     - claudeos-core/plan/ — Master Plan backup files. Never read during coding.
     - claudeos-core/generated/ — Build metadata. Not for coding reference.
     - claudeos-core/guide/ — Onboarding/usage guides for humans. Not for coding reference.
     - claudeos-core/mcp-guide/ — MCP server integration docs. Not for coding reference.
     ```
     List only the standard files that were actually generated above. Include frontend standards only if frontend was detected.

4. .claude/rules/50.sync/ (3 sync rules — AI fallback reminders)
   - NOTE: These rules remind AI to run `npx claudeos-core refresh` after modifying standard/rules/skills files.
   - 01.standard-sync.md — Remind AI to update plan/10 when standard is modified
   - 02.rules-sync.md — Remind AI to update plan/20 when rules is modified
   - 03.skills-sync.md — Remind AI to update plan/30 when skills is modified

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator — CQRS-aware: creates both command and query modules)
   - 10.backend-crud/scaffold-crud-feature/01.command-controller.md
   - 10.backend-crud/scaffold-crud-feature/02.command-service.md
   - 10.backend-crud/scaffold-crud-feature/03.query-controller.md
   - 10.backend-crud/scaffold-crud-feature/04.query-service.md
   - 10.backend-crud/scaffold-crud-feature/05.repository.md
   - 10.backend-crud/scaffold-crud-feature/06.entity.md
   - 10.backend-crud/scaffold-crud-feature/07.dto-vo.md (DTO and VO scaffolding — includes value class VO template)
   - 10.backend-crud/scaffold-crud-feature/08.bff-endpoint.md (SKIP if no BFF architecture detected)
   - 10.backend-crud/scaffold-crud-feature/09.feign-client.md (SKIP if no BFF/multi-module detected)
   - 10.backend-crud/scaffold-crud-feature/10.migration.md
   - 10.backend-crud/scaffold-crud-feature/11.test.md
   - 10.backend-crud/scaffold-crud-feature/12.aggregate.md (Aggregate Root template — SKIP if no DDD/Aggregate patterns detected)
   - 10.backend-crud/scaffold-crud-feature/13.index.md
   - 20.frontend-page/* (only if frontend detected)
   - 00.shared/MANIFEST.md (skill registry)

6. claudeos-core/guide/ (all)
   - 01.onboarding/01.overview.md
   - 01.onboarding/02.quickstart.md
   - 01.onboarding/03.glossary.md (include CQRS/BFF/Feign/Aggregate/AggregateRoot/VO terminology)
   - 02.usage/01.faq.md
   - 02.usage/02.real-world-examples.md (include multi-module CRUD example)
   - 02.usage/03.do-and-dont.md (include CQRS boundary rules)
   - 03.troubleshooting/01.troubleshooting.md
   - 04.architecture/01.file-map.md (show all modules and their relationships)
   - 04.architecture/02.pros-and-cons.md

7. claudeos-core/plan/ (Master Plan — insert full file content in <file> blocks)
   - 10.standard-master.md — CLAUDE.md + all standard/ files as <file> blocks
   - 20.rules-master.md — All rules/ (except sync) as <file> blocks
   - 21.sync-rules-master.md — All sync rules (code block format)
   - 30.backend-skills-master.md — All backend skills as <file> blocks
   - 31.frontend-skills-master.md — All frontend skills as <file> blocks (if frontend detected)
   - 40.guides-master.md — All guide/ files as <file> blocks

8. claudeos-core/database/ (DB documentation)
   - 01.schema-overview.md — Table list, ER diagram description, read/write DB separation
   - 02.migration-guide.md — Migration procedure, rollback methods

9. claudeos-core/mcp-guide/ (MCP server integration guide)
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
