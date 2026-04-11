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
ALL code examples in rules and standards MUST use EXACT method names, class names,
and signatures from pass2-merged.json analysis data.
Do NOT paraphrase, rename, or infer API names.

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (based on detected stack — Vite + React SPA)
   - Build & Run Commands (use ONLY the detected packageManager)
   - Core architecture diagram (client-side SPA, routing, state management)
   - Directory structure description
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, routing approach, deployment environment
   - 00.core/02.architecture.md — SPA structure, component hierarchy, data flow
   - 00.core/03.naming-conventions.md — File/component/hook/type naming conventions
   - 20.frontend-ui/01.component-patterns.md — Component writing rules, Props patterns, reuse
   - 20.frontend-ui/02.page-routing-patterns.md — Client-side routing, layouts, route guards, lazy loading
   - 20.frontend-ui/03.data-fetching.md — API client, TanStack Query/SWR, caching, error handling
   - 20.frontend-ui/04.state-management.md — Global/server/URL/form state management
   - 20.frontend-ui/05.styling-patterns.md — Styling rules, theming, responsive, accessibility
   - 30.security-db/01.security-auth.md — Auth patterns, token management, route protection, environment variables
   - 40.infra/01.environment-config.md — Environment variables (VITE_ prefix), vite.config, build optimization
   - 40.infra/02.logging-monitoring.md — Error tracking, analytics tools, performance monitoring
   - 40.infra/03.cicd-deployment.md — CI/CD, static hosting deployment (Nginx, S3, Vercel, Netlify)
   - 50.verification/01.development-verification.md — Build, startup, dev server
   - 50.verification/02.testing-strategy.md — Testing strategy (Vitest, RTL, E2E, Storybook)

   Each file MUST include:
   - Correct examples (code blocks)
   - Incorrect examples (code blocks)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained, no external references)
   - Include 5-15 lines of key rules with concrete examples
   - Do NOT use @import — it is not a Claude Code feature and does not work
   - Each rule file MUST end with a `## Reference` section linking to the corresponding standard file(s):
     ```
     ## Reference
     > For detailed patterns and examples, Read: claudeos-core/standard/20.frontend-ui/01.component-patterns.md
     ```
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]`
     - `20.frontend/*` rules: `paths: ["**/*"]`
     - `30.security-db/*` rules: `paths: ["**/*"]`
     - `40.infra/*` rules: `paths: ["**/*.json", "**/*.env*", "**/vite.config.*", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]`
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — directory of all standard files.

4. .claude/rules/50.sync/ (3 sync rules)
   - 01.standard-sync.md — Remind AI to update plan/10 when standard is modified
   - 02.rules-sync.md — Remind AI to update plan/20 when rules is modified
   - 03.skills-sync.md — Remind AI to update plan/30 when skills is modified

5. claudeos-core/skills/ (active domains only)
   - 20.frontend-page/01.scaffold-page-feature.md (orchestrator)
   - 20.frontend-page/scaffold-page-feature/01~08 (sub-skills: page, layout, component, hook, api-client, test, style, index)
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
   - 01.schema-overview.md — API endpoint catalog, request/response schemas (if applicable)

9. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
