Read claudeos-core/generated/project-analysis.json and
claudeos-core/generated/pass2-merged.json, then
generate all ClaudeOS-Core files based on the analysis results.

Do not read the original source code again. Reference only the analysis results.

CRITICAL — Package Manager Consistency:
Check `stack.packageManager` in project-analysis.json (e.g., "npm", "yarn", "pnpm").
ALL generated files MUST use ONLY that detected package manager's commands.
Also check `angular.json` for actual CLI commands and project names.

CRITICAL — Cross-file Consistency:
Rules (.claude/rules/) and Standards (claudeos-core/standard/) MUST NOT contradict each other.

CRITICAL — Code Example Accuracy:
ALL code examples MUST use EXACT method names, class names, and signatures from pass2-merged.json.
Do NOT paraphrase, rename, or infer API names.

CRITICAL — Data Flow Consistency:
Determine from pass2-merged.json how data flows between components, services, and state management.
This MUST be identical across architecture.md, component-patterns.md, http-patterns.md,
state-management.md, and all rules files. Do NOT describe different data flows in different files.

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

   Stack-specific hints for this project (Angular):
   - Project type for Section 1 PROJECT_CONTEXT: "Angular-based SPA" or the actual character of the project
   - Architecture diagram (Section 4): Module → Component → Service → HTTP layers
   - State management approach goes in Section 4 Core Patterns
   - Use ng commands (ng serve, ng build, ng test) in Section 3

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack (Angular version, TypeScript version), project structure
   - 00.core/02.architecture.md — Module hierarchy, DI tree, data flow, lazy loading map
   - 00.core/03.naming-conventions.md — File/class/selector/module naming conventions
   - 20.frontend/01.component-patterns.md — Component structure, lifecycle, OnPush, Signals, I/O
   - 20.frontend/02.routing-patterns.md — Route config, lazy loading, guards, resolvers
   - 20.frontend/03.service-di-patterns.md — Injectable, providers, injection tokens, inject()
   - 20.frontend/04.rxjs-patterns.md — Observable management, operators, subscription cleanup
   - 20.frontend/05.template-patterns.md — Directives, content projection, control flow (@if/@for)
   - 20.frontend/06.form-patterns.md — Reactive/Template forms, validators, error handling
   - 20.frontend/07.state-management.md — NgRx/NGXS/Signal Store patterns
   - 20.frontend/08.http-patterns.md — HttpClient, interceptors, caching, error handling
   - 20.frontend/09.styling-patterns.md — ViewEncapsulation, theming, responsive
   - 10.backend/01.api-integration.md — API service abstraction, interceptors (if backend exists)
   - 30.security-db/01.security-auth.md — Auth guards, JWT interceptor, route protection
   - 40.infra/01.environment-config.md — environment.ts, angular.json, build configuration
   - 40.infra/02.logging-monitoring.md — Error tracking, performance monitoring
   - 40.infra/03.cicd-deployment.md — CI/CD pipeline, ng build --configuration, Docker
   - 80.verification/01.development-verification.md — ng serve, ng build, Lighthouse
   - 80.verification/02.testing-strategy.md — TestBed, component harness, E2E strategy

   Each file MUST include:
   - Correct examples (✅ code blocks in TypeScript)
   - Incorrect examples (❌ code blocks showing common Angular mistakes)
   - Key rules summary table

3. .claude/rules/ (active domains only)
   - Write the full rule content directly in each file (self-contained)
   - Include 5-15 lines of key rules with concrete Angular examples
   - Do NOT use @import
   - Each rule file MUST end with a `## Reference` section
   - `paths:` frontmatter per rule category:
     - `00.core/*` rules: `paths: ["**/*"]`
     - `20.frontend/*` rules: `paths: ["**/*"]`
     - `30.security-db/*` rules: `paths: ["**/*"]`
     - `40.infra/01.environment-config-rules.md` paths: `["**/*.env*", "**/angular.json", "**/environments/**", "**/*.json"]` — env / Angular workspace config
     - `40.infra/02.logging-monitoring-rules.md` paths: `["**/*.ts", "**/*.html"]` — source code where logs live
     - `40.infra/03.cicd-deployment-rules.md` paths: `["**/*.yml", "**/*.yaml", "**/Dockerfile*", "**/*.ts"]` — CI config + source
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
     - `60.memory/*` rules: forward reference — Pass 4 will generate 4 files (01.decision-log, 02.failure-patterns, 03.compaction, 04.auto-rule-update), each with file-specific `paths`. Pass 3 must STILL list ```.claude/rules/60.memory/*``` as a row in CLAUDE.md Section 6 Rules table so developers/Claude see the category exists.
     - `70.domains/*` rules (multi-domain projects only): per-domain rules at `.claude/rules/70.domains/{type}/{domain}-rules.md` (where `{type}` is `backend` or `frontend`, ALWAYS present even in single-stack projects for uniform layout + zero-migration future-proofing), each with a `paths:` glob scoped to that domain's source directories so the rule auto-loads only when editing files within the relevant domain. Folder name is PLURAL (`domains/`) — collection of N per-domain files — and each file inside uses the SINGULAR domain name (`{domain}-rules.md`). DO NOT use `60.domains/` (collides with `60.memory/`) and DO NOT skip the `{type}/` sub-folder. See pass3-footer.md "Per-domain folder convention" for the full rationale.
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` as a directory of all standard files

4. .claude/rules/50.sync/ (2 sync rules)
   - 01.doc-sync.md — Bidirectional standard ↔ rules sync reminder (both directions in ONE rule).
     Do NOT generate a separate 02.rules-sync.md mirror file — redundant.
     Express the mapping as a naming convention (standard/<N>.<dir>/<M>.<n>.md ↔
     .claude/rules/<N>.<dir>/<M>.<n>-rules.md), NOT a hardcoded file-to-file table.
   - 02.skills-sync.md — Remind AI to update MANIFEST.md when skills are modified

5. claudeos-core/skills/ (active domains only)
   - 20.frontend-page/01.scaffold-feature-module.md (orchestrator — Angular feature module scaffolding)
   - 20.frontend-page/scaffold-page-feature/01~08 (sub-skills: module, component, service, routing, template, test, style, index)
   - 00.shared/MANIFEST.md (skill registry)

6. claudeos-core/guide/ (all)
   - 01.onboarding/01.overview.md
   - 01.onboarding/02.quickstart.md
   - 01.onboarding/03.glossary.md (include Angular-specific terms: NgModule, Directive, Pipe, Guard, Resolver, Interceptor, Signal)
   - 02.usage/01.faq.md
   - 02.usage/02.real-world-examples.md (include feature module creation example)
   - 02.usage/03.do-and-dont.md (include Angular-specific anti-patterns)
   - 03.troubleshooting/01.troubleshooting.md
   - 04.architecture/01.file-map.md
   - 04.architecture/02.pros-and-cons.md
7. claudeos-core/database/
   - 01.schema-overview.md — API schema description (if applicable)

8. claudeos-core/mcp-guide/
   - 01.mcp-overview.md
