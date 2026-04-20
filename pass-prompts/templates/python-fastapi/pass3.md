Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Package Manager Consistency:
Check `stack.packageManager` in project-analysis.json (e.g., "poetry", "pipenv", "pip").
ALL generated files MUST use ONLY that detected package manager's commands.
For example, if packageManager is "poetry": use `poetry run`, `poetry add`, etc.
NEVER mix pip/poetry/pipenv commands. Also check actual script names in pyproject.toml or Makefile.

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
Determine from pass2-merged.json which layer (router/endpoint vs service/CRUD) calls
the response wrapper. This MUST be identical across architecture.md, router-endpoint-patterns.md,
response-exception.md, and all rules files. Do NOT describe different response flows in different files.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files, not just core.
Include all backend-api, security-db, infra, and verification standards.
Alternatively, add a note directing readers to .claude/rules/00.core/00.standard-reference.md
for the complete list.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (based on detected stack)
   - Build & Run Commands (pip/poetry, uvicorn, docker)
   - Core architecture diagram
   - Module structure
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, modules, server info
   - 00.core/02.architecture.md — Layer structure, request flow, directory structure
   - 00.core/03.naming-conventions.md — Module/schema/model/router naming conventions
   - 10.backend-api/01.router-endpoint-patterns.md — Router patterns + decorators
   - 10.backend-api/02.schema-pydantic-patterns.md — Pydantic conventions, validation
   - 10.backend-api/03.data-access-patterns.md — ORM, Repository, query optimization
   - 10.backend-api/04.response-exception.md — Response/error handling patterns
   - 10.backend-api/05.dependency-injection.md — Depends chain, lifecycle
   - 10.backend-api/06.middleware-patterns.md — CORS, custom middleware, order
   - 30.security-db/01.security-auth.md — JWT, OAuth2, CORS, Rate Limit
   - 30.security-db/02.database-schema.md — Alembic, schema conventions
   - 30.security-db/03.common-utilities.md — Common utils, dependency functions, constants
   - 40.infra/01.environment-config.md — pydantic-settings, environment variables
   - 40.infra/02.logging-monitoring.md — Logging standards, monitoring
   - 40.infra/03.cicd-deployment.md — CI/CD, Docker, uvicorn deployment
   - 50.verification/01.development-verification.md — pytest, startup, API testing
   - 50.verification/02.testing-strategy.md — Async testing, dependency overrides, mocking

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
     > For detailed patterns and examples, Read: claudeos-core/standard/10.backend-api/01.router-endpoint-patterns.md
     ```
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]` — always loaded (architecture, naming are universally needed)
     - `10.backend/*` rules: `paths: ["**/*"]` — always loaded (backend rules needed for any source editing)
     - `30.security-db/*` rules: `paths: ["**/*"]` — always loaded (cross-cutting concerns)
     - `40.infra/*` rules: `paths: ["**/*.toml", "**/*.env*", "**/config/**", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]` — loaded only for config/infra files
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
     - claudeos-core/standard/10.backend-api/01.router-endpoint-patterns.md
     - claudeos-core/standard/10.backend-api/02.schema-pydantic-patterns.md
     - claudeos-core/standard/10.backend-api/03.data-access-patterns.md
     - claudeos-core/standard/10.backend-api/04.response-exception.md
     - claudeos-core/standard/10.backend-api/05.dependency-injection.md
     - claudeos-core/standard/10.backend-api/06.middleware-patterns.md
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
     List only the standard files that were actually generated above.

4. .claude/rules/50.sync/ (3 sync rules — AI fallback reminders)
   - NOTE: These rules remind AI to run `npx claudeos-core refresh` after modifying standard/rules/skills files.
   - 01.standard-sync.md — Remind AI to update corresponding rule when standard is modified
   - 02.rules-sync.md — Remind AI to update corresponding standard when rules are modified
   - 03.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator)
   - 10.backend-crud/scaffold-crud-feature/01~08 (sub-skills: model, schema, router, crud, deps, migration, test, index)
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
   - 01.schema-overview.md — Table list, relationship description
   - 02.migration-guide.md — Alembic procedure, autogenerate, rollback

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
