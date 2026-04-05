Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Module/Component structure (NgModule vs standalone, decorator conventions)
   - Change detection strategy (Default vs OnPush)
   - Service/DI approach (providedIn, injection patterns)
   - RxJS operator conventions (subscription management, error handling)
   - Routing conventions (lazy loading, guards)
   - Template conventions (structural directives, control flow)
   - Form approach (Reactive vs Template-driven)

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Animations: which domain
   - i18n: which domain
   - SSR: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - File naming (*.component.ts, *.service.ts, *.module.ts, *.pipe.ts)
   - Class naming (PascalCase + suffix: Component, Service, Module, Pipe, Directive, Guard)
   - Selector naming (app-prefix, kebab-case)
   - Module organization conventions
   - Route URL patterns

6. Shared Services/Components List
   - Shared module exports with EXACT import paths
   - Core services with EXACT import paths
   - Common components (UI library) with EXACT import paths
   - Path aliases used in the project (e.g., `@app/` -> `src/app/`, `@core/`, `@shared/`)
   - Environment types
   - Constants/Enum management

7. Security/Authentication Patterns
   - Authentication approach (JWT, session, OAuth2)
   - Route guard strategy (canActivate, functional guards)
   - HTTP interceptor auth patterns
   - CORS configuration
   - Content Security Policy

8. State Management Patterns
   - NgRx / NGXS / Signal Store — which is used
   - State structure conventions
   - Action/Effect patterns
   - Selector conventions
   - Component Store usage

9. Testing Strategy Summary
   - Test coverage level
   - Test classification (unit/integration/E2E)
   - TestBed configuration patterns
   - Mocking strategy (spies, stubs, HttpClientTestingModule)
   - Test naming conventions
   - Component harness usage

10. Styling Strategy
    - CSS methodology
    - ViewEncapsulation strategy
    - Theming approach (CSS variables, Angular Material)
    - Responsive patterns

11. Performance Patterns
    - OnPush change detection adoption
    - Lazy loading coverage
    - TrackBy usage in *ngFor
    - Bundle optimization (tree shaking, code splitting)
    - Preloading strategies

12. Code Quality Tools
    - Lint/Format (ESLint, angular-eslint, Prettier)
    - Angular CLI schematics
    - Strict mode (strict TypeScript, strict templates)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
