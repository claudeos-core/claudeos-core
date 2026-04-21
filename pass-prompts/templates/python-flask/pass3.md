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

   Stack-specific hints for this project (Python Flask):
   - Project type for Section 1 PROJECT_CONTEXT: "Lightweight Web Application" or "REST API Server"
     (reflect the application factory pattern and Blueprint structure)
   - Architecture diagram (Section 4): application factory → Blueprint → route → service,
     request lifecycle
   - Section 3 commands: pip/poetry install, flask run (dev), gunicorn (production), docker
   - Module structure: reflect in Section 5 tree (blueprints/, models/, services/)
   - Detect SQLAlchemy/marshmallow/WTForms and reflect in Section 2

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
     - `40.infra/01.environment-config-rules.md` paths: `["**/.env*", "**/config.py", "**/config/**", "**/*.cfg", "**/*.toml"]` — env / Flask config
     - `40.infra/02.logging-monitoring-rules.md` paths: `["**/*.py"]` — source code where logs live
     - `40.infra/03.cicd-deployment-rules.md` paths: `["**/*.yml", "**/*.yaml", "**/Dockerfile*", "**/*.py"]` — CI / deploy config + source
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
     - `60.memory/*` rules: forward reference — Pass 4 will generate 4 files (01.decision-log, 02.failure-patterns, 03.compaction, 04.auto-rule-update), each with file-specific `paths`. Pass 3 must STILL list ```.claude/rules/60.memory/*``` as a row in CLAUDE.md Section 6 Rules table so developers/Claude see the category exists.
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — directory of all standard files

4. .claude/rules/50.sync/ (2 sync rules)
   - 01.doc-sync.md — Bidirectional standard ↔ rules sync reminder (both directions in ONE rule).
     Do NOT generate a separate 02.rules-sync.md mirror file — redundant.
     Express the mapping as a naming convention (standard/<N>.<dir>/<M>.<n>.md ↔
     .claude/rules/<N>.<dir>/<M>.<n>-rules.md), NOT a hardcoded file-to-file table.
   - 02.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

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
7. claudeos-core/database/
   - 01.schema-overview.md — DB schema, model relationships, migration guide

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — MCP server integration
