Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Page/routing structure (React Router / TanStack Router / custom)
   - Component writing conventions (functional, Props types, styling)
   - Data fetching strategy (TanStack Query, SWR, axios patterns)
   - State management approach
   - Error/loading handling patterns
   - Route guard/protection patterns

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - Auth: which domain
   - Real-time features: which domain
   - File upload: which domain
   - i18n: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - File/directory naming (kebab-case, PascalCase)
   - Component entry file pattern (index.tsx vs ComponentName.tsx — pick ONE that the project actually uses)
   - Component export pattern (default export vs named export)
   - Hook naming (use* prefix)
   - API function patterns

6. Shared Types/Components List
   - Common UI components with EXACT import paths
   - Shared hooks with exact import paths
   - Utility functions with EXACT import paths
   - Path aliases used in the project (e.g., `@/` -> `src/`)
   - Environment variable types
   - Constants/Enum management

7. Security/Authentication Patterns
   - Authentication approach (JWT, session, OAuth)
   - Route protection strategy
   - CSRF/XSS prevention
   - Environment variable management (VITE_ convention)

8. Database Patterns
   - API endpoint conventions
   - Request/response format
   - Error response handling

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/component/E2E)
   - Mocking strategy (MSW, vi.mock)
   - Storybook usage
   - Test naming conventions

10. Logging/Monitoring Strategy
    - Error tracking approach (Sentry, DataDog)
    - Analytics tools
    - Performance monitoring

11. Performance Patterns
    - Code splitting strategy (lazy, Suspense)
    - Bundle optimization (chunk splitting, tree shaking)
    - Image optimization
    - Caching strategy

12. Code Quality Tools
    - Lint/Format tools (ESLint, Prettier, Biome)
    - Pre-commit hooks (husky, lint-staged)
    - TypeScript strict mode
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
