Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Page/routing structure (Nuxt file-based vs Vue Router)
   - Component writing conventions (SFC, <script setup>, Props/Emits)
   - Data fetching strategy (useFetch/useAsyncData vs client-side)
   - State management approach (Pinia, composables)
   - Error/loading handling patterns
   - Middleware usage

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - Auth: which domain
   - Real-time features: which domain
   - File upload: which domain
   - i18n: which domain
   - SEO optimization: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - File/directory naming (kebab-case, PascalCase)
   - Component file pattern (index.vue vs ComponentName.vue)
   - Composable naming (use* prefix)
   - Store naming conventions
   - Route/page naming patterns

6. Shared Types/Components List
   - Common UI components with EXACT import paths
   - Shared composables with exact import paths
   - Utility functions with EXACT import paths
   - Auto-import configuration (which composables/components are auto-imported)
   - Path aliases used in the project
   - Environment variable types
   - Constants/Enum management

7. Security/Authentication Patterns
   - Authentication approach (Nuxt Auth, custom middleware)
   - Route protection strategy (middleware, navigation guards)
   - CSRF/XSS prevention
   - Environment variable management (NUXT_PUBLIC_, VITE_)
   - Content security policy

8. Performance Patterns
   - SSR/SSG/SPA mode usage
   - Image optimization (nuxt/image)
   - Bundle optimization (dynamic import, tree shaking)
   - Caching strategy (Nitro cache, CDN)
   - Web Vitals status

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/component/E2E)
   - Mocking strategy (MSW, vi.mock)
   - Test naming conventions

10. Logging/Monitoring Strategy
    - Error tracking approach (Sentry, DataDog)
    - Analytics tools
    - Web Vitals monitoring

11. Code Quality Tools
    - Lint/Format tools (ESLint, Prettier, Biome)
    - Pre-commit hooks (husky, lint-staged)
    - TypeScript strict mode
    - CI integration status

12. Vue/Nuxt Architecture Patterns
    - Nuxt module usage (list of @nuxt/* and third-party modules)
    - Nitro server configuration (server routes, middleware, plugins)
    - Plugin system (Nuxt plugins, Vue plugins)
    - Composable organization (shared vs domain-specific)
    - Auto-import scope and configuration

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
