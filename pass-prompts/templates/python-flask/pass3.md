Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Package Manager Consistency:
Check `stack.packageManager` in project-analysis.json (e.g., "poetry", "pipenv", "pip").
ALL generated files MUST use ONLY that detected package manager's commands.
NEVER mix pip/poetry/pipenv commands. Also check actual script names in pyproject.toml or Makefile.

CRITICAL — Cross-file Consistency:
Rules (.claude/rules/) and Standards (claudeos-core/standard/) MUST NOT contradict each other.

CRITICAL — Code Example Accuracy:
ALL code examples in rules and standards MUST use EXACT method names, class names,
and signatures from pass2-merged.json analysis data.
Do NOT paraphrase, rename, or infer API names.

CRITICAL — Response Flow Consistency:
Determine from pass2-merged.json which layer (route handler vs service layer) formats
the response. This MUST be identical across architecture.md, route-patterns.md,
and all rules files.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (based on detected stack — Flask)
   - Build & Run Commands (pip/poetry, flask run, gunicorn, docker)
   - Core architecture diagram (application factory, Blueprint structure)
   - Module structure
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, modules, server info
   - 00.core/02.architecture.md — Application factory, Blueprint hierarchy, request flow
   - 00.core/03.naming-conventions.md — Module/model/blueprint/route naming conventions
   - 10.backend-api/01.route-blueprint-patterns.md — Blueprint structure, route decorators, request/response handling
   - 10.backend-api/02.model-schema-patterns.md — SQLAlchemy models, marshmallow/WTForms serialization
   - 10.backend-api/03.service-patterns.md — Service layer, business logic separation
   - 10.backend-api/04.response-error-patterns.md — Response formatting, error handlers, custom exceptions
   - 30.security-db/01.security-auth.md — Authentication, CSRF, session management, environment variables
   - 30.security-db/02.database-patterns.md — SQLAlchemy patterns, migrations, relationships
   - 40.infra/01.environment-config.md — Config classes, environment variables, extension initialization
   - 40.infra/02.logging-monitoring.md — app.logger, request logging, error tracking
   - 40.infra/03.cicd-deployment.md — CI/CD, gunicorn, Docker deployment
   - 50.verification/01.development-verification.md — Build, startup, flask run
   - 50.verification/02.testing-strategy.md — pytest, test_client, fixtures, DB testing

   Each file MUST include:
   - Correct examples (code blocks)
   - Incorrect examples (code blocks)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained)
   - Include 5-15 lines of key rules with concrete examples
   - Do NOT use @import
   - Each rule file MUST end with a `## Reference` section linking to the corresponding standard
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]`
     - `10.backend/*` rules: `paths: ["**/*"]`
     - `30.security-db/*` rules: `paths: ["**/*"]`
     - `40.infra/*` rules: `paths: ["**/*.json", "**/*.env*", "**/*.cfg", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]`
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — directory of all standard files

4. .claude/rules/50.sync/ (3 sync rules)
   - 01.standard-sync.md
   - 02.rules-sync.md
   - 03.skills-sync.md

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator)
   - 10.backend-crud/scaffold-crud-feature/01~08 (sub-skills: blueprint, routes, model, schema, service, migration, test, index)
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

7. claudeos-core/plan/ (Master Plan)
   - 10.standard-master.md — CLAUDE.md + all standard/ files as <file> blocks
   - 20.rules-master.md — All rules/ (except sync) as <file> blocks
   - 21.sync-rules-master.md — All sync rules (code block format)
   - 30.backend-skills-master.md — All backend skills as <file> blocks
   - 40.guides-master.md — All guide/ files as <file> blocks

8. claudeos-core/database/
   - 01.schema-overview.md — DB schema, model relationships, migration guide

9. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — MCP server integration
