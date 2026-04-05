Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Router/Controller style (routing, middleware, response format)
   - **Response flow**: Which layer wraps the response? (Controller/Router vs Service/UseCase)
     Record the definitive answer. If an orchestration layer (UseCase, Facade) exists, describe it.
   - Service dependency injection strategy
   - Data access patterns (ORM, Repository)
   - DTO/type definition rules
   - Error handling patterns
   - Middleware chain order

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Queue/batch: which domain
   - External API integration: which domain
   - Caching: which domain
   - Event/CQRS: which domain
   - Messaging: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - File/directory naming (kebab-case, camelCase, PascalCase)
   - File entry pattern (index.ts vs module-named files — pick ONE that the project actually uses)
   - DTO/type naming conventions
   - Route URL patterns
   - Module/package structure conventions

6. Common Types/Interfaces List
   - Shared type definition files with EXACT import paths
   - Utility functions with EXACT import paths
   - Path aliases used in the project (e.g., `@/` → `src/`)
   - Utility types
   - Environment variable types
   - Constants/Enum management

7. Security/Authentication Patterns
   - JWT/session approach
   - Guard/middleware authentication strategy
   - CORS configuration
   - Rate Limiting
   - Per-environment security settings

8. Database Patterns
   - Table/collection naming conventions
   - Migration strategy
   - Seed data management
   - Audit columns (createdAt, updatedAt, deletedAt)
   - Index/constraints

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - Mocking strategy
   - Test naming conventions
   - DB test strategy

10. Logging/Monitoring Strategy
    - Logger standard
    - Log level policy
    - Structured logging approach
    - Request/response logging

11. Performance Patterns
    - Caching strategy
    - Query optimization status
    - Async processing status
    - Connection pool configuration

12. Code Quality Tools
    - Lint/Format tools (ESLint, Prettier, Biome)
    - Pre-commit hooks (husky, lint-staged)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
