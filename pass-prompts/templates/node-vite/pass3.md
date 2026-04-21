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

   Stack-specific hints for this project (Vite + React SPA):
   - Project type for Section 1 PROJECT_CONTEXT: "SPA" 
     (reflect the actual character, e.g., Back Office / Front Office / Full-stack)
   - Architecture diagram (Section 4): client-side routing, state management, data flow
   - Detect multi-entry configs (vite.config.*.ts) and reflect in Section 2 / 4 / 5
   - Detect codegen tools (orval, openapi-generator) and reflect in Section 5 emphasis
     (auto-generated directories → "Do Not Modify Manually")

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
     - `40.infra/01.environment-config-rules.md` paths: `["**/*.env*", "**/vite.config.*", "**/*.json"]` — env / build config
     - `40.infra/02.logging-monitoring-rules.md` paths: `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]` — source code where logs live
     - `40.infra/03.cicd-deployment-rules.md` paths: `["**/*.yml", "**/*.yaml", "**/Dockerfile*", "**/*.ts", "**/*.tsx"]` — CI config + source with API origin / codegen references
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
     - `60.memory/*` rules: forward reference — Pass 4 will generate 4 files (01.decision-log, 02.failure-patterns, 03.compaction, 04.auto-rule-update), each with file-specific `paths`. Pass 3 must STILL list ```.claude/rules/60.memory/*``` as a row in CLAUDE.md Section 6 Rules table so developers/Claude see the category exists.
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` — directory of all standard files.

4. .claude/rules/50.sync/ (2 sync rules)
   - 01.doc-sync.md — Bidirectional standard ↔ rules sync reminder (both directions in ONE rule).
     Do NOT generate a separate 02.rules-sync.md mirror file — redundant.
     Express the mapping as a naming convention (standard/<N>.<dir>/<M>.<n>.md ↔
     .claude/rules/<N>.<dir>/<M>.<n>-rules.md), NOT a hardcoded file-to-file table.
   - 02.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

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
7. claudeos-core/database/
   - 01.schema-overview.md — API endpoint catalog, request/response schemas (if applicable)

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
