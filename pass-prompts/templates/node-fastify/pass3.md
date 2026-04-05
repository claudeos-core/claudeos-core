Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Package Manager Consistency:
Check `stack.packageManager` in project-analysis.json (e.g., "pnpm", "yarn", "npm").
ALL generated files MUST use ONLY that detected package manager's commands.
NEVER mix npm/yarn/pnpm commands. Also check `scripts` field in the project's package.json
for actual script names.

CRITICAL — Cross-file Consistency:
Rules (.claude/rules/) and Standards (claudeos-core/standard/) MUST NOT contradict each other.
If a standard defines a specific pattern (e.g., import path, schema naming, hook usage),
the corresponding rule MUST use the same pattern.

CRITICAL — Code Example Accuracy:
ALL code examples in rules and standards MUST use EXACT method names, class names,
and signatures from pass2-merged.json analysis data.
Do NOT paraphrase, rename, or infer API names.
If a method signature is not captured in the analysis data,
write "See corresponding standard for exact API" instead of guessing.

CRITICAL — Response Flow Consistency:
Determine from pass2-merged.json which layer (route handler vs service/plugin) calls
the response wrapper. This MUST be identical across architecture.md, route-plugin-patterns.md,
response-exception.md, and all rules files. Do NOT describe different response flows in different files.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files.
Alternatively, add a note directing readers to .claude/rules/00.core/00.standard-reference.md.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (Fastify backend)
   - Build & Run Commands (use ONLY the detected packageManager)
   - Core architecture diagram (plugin-based)
   - DB table/collection naming
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, modules, server info
   - 00.core/02.architecture.md — Plugin architecture, request lifecycle, hooks flow
   - 00.core/03.naming-conventions.md — File/route/schema/plugin naming conventions
   - 10.backend-api/01.route-plugin-patterns.md — Route registration, plugin encapsulation, prefix
   - 10.backend-api/02.service-patterns.md — DI (decorators/awilix), business logic
   - 10.backend-api/03.data-access-patterns.md — ORM patterns, DB plugin lifecycle
   - 10.backend-api/04.response-exception.md — Response format, error handling, setErrorHandler
   - 10.backend-api/05.schema-validation.md — JSON Schema, TypeBox, shared schemas, serialization
   - 10.backend-api/06.hooks-lifecycle.md — Hook order, scope, authentication hooks
   - 30.security-db/01.security-auth.md — JWT, @fastify/auth, CORS, Rate Limit
   - 30.security-db/02.database-schema.md — Migrations, seeds, schema conventions
   - 30.security-db/03.common-utilities.md — Common utils, decorators, constants
   - 40.infra/01.environment-config.md — @fastify/env, configuration management
   - 40.infra/02.logging-monitoring.md — Pino config, serializers, monitoring
   - 40.infra/03.cicd-deployment.md — CI/CD pipeline, deployment strategy
   - 50.verification/01.development-verification.md — Build, startup, API testing
   - 50.verification/02.testing-strategy.md — fastify.inject(), plugin testing, mocking

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
     - `40.infra/*` rules: `paths: ["**/*.json", "**/*.env*", "**/config/**", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]`
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` as a directory of all standard files

4. .claude/rules/50.sync/ (3 sync rules)
   - 01.standard-sync.md
   - 02.rules-sync.md
   - 03.skills-sync.md

5. claudeos-core/skills/ (active domains only)
   - 10.backend-crud/01.scaffold-crud-feature.md (orchestrator)
   - 10.backend-crud/scaffold-crud-feature/01~08 (sub-skills: route, schema, service, plugin, repository, migration, test, index)
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
   - 10.standard-master.md
   - 20.rules-master.md
   - 21.sync-rules-master.md
   - 30.backend-skills-master.md
   - 40.guides-master.md

8. claudeos-core/database/
   - 01.schema-overview.md
   - 02.migration-guide.md

9. claudeos-core/mcp-guide/
   - 01.mcp-overview.md
