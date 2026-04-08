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

CRITICAL — Code Example Accuracy:
ALL code examples MUST use EXACT method names, class names, and signatures from pass2-merged.json.
Do NOT paraphrase, rename, or infer API names.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (Vue/Nuxt frontend developer)
   - Build & Run Commands (use ONLY the detected packageManager)
   - Core architecture diagram
   - Directory structure description
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, routing approach, deployment environment
   - 00.core/02.architecture.md — Nuxt/Vue structure, component hierarchy, data flow, Nitro server
   - 00.core/03.naming-conventions.md — File/component/composable/store naming conventions
   - 20.frontend-ui/01.component-patterns.md — SFC, <script setup>, Props/Emits, slots, provide/inject
   - 20.frontend-ui/02.page-routing-patterns.md — Pages/layouts/dynamic routes/middleware/definePageMeta
   - 20.frontend-ui/03.data-fetching.md — useFetch, useAsyncData, $fetch, server routes, caching
   - 20.frontend-ui/04.state-management.md — Pinia stores, composables, useState, form state
   - 20.frontend-ui/05.styling-patterns.md — Scoped styles, CSS Modules, Tailwind/UnoCSS, theming
   - 10.backend-api/01.server-routes.md — Nitro server routes (server/api/), H3 event handlers
   - 30.security-db/01.security-auth.md — Auth, middleware protection, environment variables
   - 40.infra/01.environment-config.md — Runtime config, nuxt.config.ts, Nitro presets
   - 40.infra/02.logging-monitoring.md — Error tracking, analytics, Web Vitals
   - 40.infra/03.cicd-deployment.md — CI/CD, deployment (Vercel/Netlify/Docker), preview
   - 50.verification/01.development-verification.md — Build, startup, Lighthouse
   - 50.verification/02.testing-strategy.md — Vitest, @vue/test-utils, E2E, @nuxt/test-utils

   Each file MUST include:
   - Correct examples (✅ code blocks)
   - Incorrect examples (❌ code blocks)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained)
   - Include 5-15 lines of key rules with concrete examples
   - Do NOT use @import
   - Each rule file MUST end with a `## Reference` section
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]`
     - `10.backend/*` rules: `paths: ["**/*"]`
     - `20.frontend/*` rules: `paths: ["**/*"]`
     - `30.security-db/*` rules: `paths: ["**/*"]`
     - `40.infra/*` rules: `paths: ["**/*.json", "**/*.env*", "**/nuxt.config.*", "**/vite.config.*", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]`
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — directory of all standard files

4. .claude/rules/50.sync/ (3 sync rules)
   - 01.standard-sync.md
   - 02.rules-sync.md
   - 03.skills-sync.md

5. claudeos-core/skills/ (active domains only)
   - 20.frontend-page/01.scaffold-page-feature.md (orchestrator)
   - 20.frontend-page/scaffold-page-feature/01~08 (sub-skills: page, layout, component, composable, server-route, test, style, index)
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
   - 30.frontend-skills-master.md — All frontend skills as <file> blocks
   - 40.guides-master.md — All guide/ files as <file> blocks

8. claudeos-core/database/
   - 01.schema-overview.md — DB schema description (if applicable)

9. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
