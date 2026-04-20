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

CRITICAL — CLAUDE.md Reference Table Completeness:
The reference table in CLAUDE.md MUST list ALL generated standard files.

Generation targets:

1. CLAUDE.md (project root)
   - Role definition (Angular frontend)
   - Build & Run Commands (ng serve, ng build, ng test — using detected packageManager)
   - Core architecture diagram (Module → Component → Service → HTTP)
   - State management approach
   - Standard/Skills/Guide reference table

2. claudeos-core/standard/ (active domains only)
   - 00.core/01.project-overview.md — Stack (Angular version, TypeScript version), project structure
   - 00.core/02.architecture.md — Module hierarchy, DI tree, data flow, lazy loading map
   - 00.core/03.naming-conventions.md — File/class/selector/module naming conventions
   - 20.frontend-ui/01.component-patterns.md — Component structure, lifecycle, OnPush, Signals, I/O
   - 20.frontend-ui/02.routing-patterns.md — Route config, lazy loading, guards, resolvers
   - 20.frontend-ui/03.service-di-patterns.md — Injectable, providers, injection tokens, inject()
   - 20.frontend-ui/04.rxjs-patterns.md — Observable management, operators, subscription cleanup
   - 20.frontend-ui/05.template-patterns.md — Directives, content projection, control flow (@if/@for)
   - 20.frontend-ui/06.form-patterns.md — Reactive/Template forms, validators, error handling
   - 20.frontend-ui/07.state-management.md — NgRx/NGXS/Signal Store patterns
   - 20.frontend-ui/08.http-patterns.md — HttpClient, interceptors, caching, error handling
   - 20.frontend-ui/09.styling-patterns.md — ViewEncapsulation, theming, responsive
   - 10.backend-api/01.api-integration.md — API service abstraction, interceptors (if backend exists)
   - 30.security-db/01.security-auth.md — Auth guards, JWT interceptor, route protection
   - 40.infra/01.environment-config.md — environment.ts, angular.json, build configuration
   - 40.infra/02.logging-monitoring.md — Error tracking, performance monitoring
   - 40.infra/03.cicd-deployment.md — CI/CD pipeline, ng build --configuration, Docker
   - 50.verification/01.development-verification.md — ng serve, ng build, Lighthouse
   - 50.verification/02.testing-strategy.md — TestBed, component harness, E2E strategy

   Each file MUST include:
   - Correct examples (code blocks in TypeScript)
   - Incorrect examples (code blocks showing common Angular mistakes)
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
     - `40.infra/*` rules: `paths: ["**/*.json", "**/*.env*", "**/angular.json", "**/Dockerfile*", "**/*.yml", "**/*.yaml"]`
     - `50.sync/*` rules: `paths: ["**/claudeos-core/**", "**/.claude/**"]`
   - MUST generate `.claude/rules/00.core/00.standard-reference.md` as a directory of all standard files

4. .claude/rules/50.sync/ (3 sync rules)
   - 01.standard-sync.md
   - 02.rules-sync.md
   - 03.skills-sync.md

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
