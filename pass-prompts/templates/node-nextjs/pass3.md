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
Determine from pass2-merged.json which layer handles response formatting (API Route handler vs
service/utility layer). This MUST be identical across architecture.md, api-routes.md,
and all rules files. Do NOT describe different response flows in different files.

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

   Stack-specific hints for this project (Next.js):
   - Project type for Section 1 PROJECT_CONTEXT: "Full-stack Web Application"
     (detect App Router vs Pages Router and reflect, e.g., "Next.js App Router-based")
   - Architecture diagram (Section 4): server components vs client components,
     data fetching (server actions / route handlers), middleware flow
   - Use ONLY the detected packageManager in Section 3
   - Section 5 tree: distinguish app/ (App Router) vs pages/ (Pages Router) as applicable
   - Detect codegen tools (orval, graphql-codegen, prisma generate) 
     and reflect in Section 5 emphasis ("Do Not Modify Manually")

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack, routing approach, deployment environment
   - 00.core/02.architecture.md — App Router structure, component hierarchy, data flow
   - 00.core/03.naming-conventions.md — File/component/hook/type naming conventions
   - 20.frontend/01.component-patterns.md — Component writing rules, Props patterns, reuse
   - 20.frontend/02.page-routing-patterns.md — Pages/layouts/dynamic routes/middleware
   - 20.frontend/03.data-fetching.md — RSC, Server Actions, TanStack Query, caching
   - 20.frontend/04.state-management.md — Global/server/URL/form state management
   - 20.frontend/05.styling-patterns.md — Styling rules, theming, responsive, accessibility
   - 10.backend/01.api-routes.md — Route Handlers, Server Actions patterns
   - 30.security-db/01.security-auth.md — NextAuth, middleware, environment variables, CSP
   - 40.infra/01.environment-config.md — Environment variables, next.config, build optimization
   - 40.infra/02.logging-monitoring.md — Error tracking, analytics tools, Web Vitals
   - 40.infra/03.cicd-deployment.md — CI/CD, Vercel/Docker deployment, preview
   - 80.verification/01.development-verification.md — Build, startup, Lighthouse
   - 80.verification/02.testing-strategy.md — Testing strategy, RTL, E2E, Storybook

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
     > For detailed patterns and examples, Read: claudeos-core/standard/20.frontend/01.component-patterns.md
     ```
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]` — always loaded (architecture, naming are universally needed)
     - `10.backend/*` rules: `paths: ["**/*"]` — always loaded (backend rules needed for any source editing)
     - `20.frontend/*` rules: `paths: ["**/*"]` — always loaded (frontend rules needed for any source editing)
     - `30.security-db/*` rules: `paths: ["**/*"]` — always loaded (cross-cutting concerns)
     - `40.infra/01.environment-config-rules.md` paths: `["**/.env*", "**/next.config.*", "**/*.json"]` — env / Next.js config
     - `40.infra/02.logging-monitoring-rules.md` paths: `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]` — source code where logs live
     - `40.infra/03.cicd-deployment-rules.md` paths: `["**/*.yml", "**/*.yaml", "**/Dockerfile*", "**/*.ts", "**/*.tsx"]` — CI config + source
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]` — loaded only when editing claudeos-core files
     - `60.memory/*` rules: forward reference — Pass 4 will generate 4 files (01.decision-log, 02.failure-patterns, 03.compaction, 04.auto-rule-update), each with file-specific `paths`. Pass 3 must STILL list ```.claude/rules/60.memory/*``` as a row in CLAUDE.md Section 6 Rules table so developers/Claude see the category exists.
     - `70.domains/*` rules (multi-domain projects only): per-domain rules at `.claude/rules/70.domains/{type}/{domain}-rules.md` (where `{type}` is `backend` or `frontend`, ALWAYS present even in single-stack projects for uniform layout + zero-migration future-proofing), each with a `paths:` glob scoped to that domain's source directories so the rule auto-loads only when editing files within the relevant domain. Folder name is PLURAL (`domains/`) — collection of N per-domain files — and each file inside uses the SINGULAR domain name (`{domain}-rules.md`). DO NOT use `60.domains/` (collides with `60.memory/`) and DO NOT skip the `{type}/` sub-folder. See pass3-footer.md "Per-domain folder convention" for the full rationale.
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
     ## Frontend UI
     - claudeos-core/standard/20.frontend/01.component-patterns.md
     - claudeos-core/standard/20.frontend/02.page-routing-patterns.md
     - claudeos-core/standard/20.frontend/03.data-fetching.md
     - claudeos-core/standard/20.frontend/04.state-management.md
     - claudeos-core/standard/20.frontend/05.styling-patterns.md
     ## Backend API
     - claudeos-core/standard/10.backend/01.api-routes.md
     ## Security & DB
     - claudeos-core/standard/30.security-db/01.security-auth.md
     ## Infra & Verification
     - claudeos-core/standard/40.infra/01.environment-config.md
     - claudeos-core/standard/40.infra/02.logging-monitoring.md
     - claudeos-core/standard/40.infra/03.cicd-deployment.md
     - claudeos-core/standard/80.verification/01.development-verification.md
     - claudeos-core/standard/80.verification/02.testing-strategy.md
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
   - 20.frontend-page/01.scaffold-page-feature.md (orchestrator)
   - 20.frontend-page/scaffold-page-feature/01~08 (sub-skills: page, layout, component, hook, api-route, test, style, index)
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
   - 01.schema-overview.md — DB schema description (if applicable)

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md — List of MCP servers in use, integration methods
