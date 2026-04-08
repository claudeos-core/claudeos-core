Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Module structure (@Module imports, providers, exports conventions)
   - Controller style (@Controller, decorators, parameter handling)
   - **Response flow**: Which layer wraps the response? (Controller vs Service/UseCase)
     Record the definitive answer. If an orchestration layer exists, describe it.
   - Service dependency injection strategy (@Injectable, custom providers)
   - Data access patterns (ORM, Repository injection)
   - DTO/validation rules (class-validator, class-transformer, mapped types)
   - Error handling patterns (ExceptionFilter, HttpException hierarchy)
   - Guard/Interceptor/Pipe execution order

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Queue/job processing: which domain
   - External API integration: which domain
   - Caching: which domain
   - CQRS: which domain
   - Microservices: which domain
   - Scheduling: which domain

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
   - Path aliases used in the project
   - Custom decorators with EXACT names
   - Environment variable types
   - Constants/Enum management

7. Security/Authentication Patterns
   - JWT strategy (PassportModule, JwtModule)
   - Guard hierarchy (AuthGuard, RolesGuard, custom guards)
   - CORS configuration
   - Rate Limiting (@nestjs/throttler)
   - Per-environment security settings

8. Database Patterns
   - Table/collection naming conventions
   - Migration strategy
   - Seed data management
   - Audit columns (createdAt, updatedAt, deletedAt)
   - Soft delete patterns
   - Index/constraints

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - Test.createTestingModule patterns
   - Mocking strategy (overrideProvider, jest.mock)
   - Test naming conventions
   - DB test strategy

10. Logging/Monitoring Strategy
    - Logger standard (NestJS Logger vs pino/winston)
    - Log level policy
    - Structured logging approach
    - LoggingInterceptor patterns

11. Performance Patterns
    - Caching strategy (@CacheKey, @CacheTTL, cache-manager)
    - Query optimization status
    - Async processing (Bull queues, scheduling)
    - Connection pool configuration

12. Code Quality Tools
    - Lint/Format tools (ESLint, Prettier, Biome)
    - Pre-commit hooks (husky, lint-staged)
    - CI integration status

13. NestJS Architecture Patterns
    - Module organization (feature modules, shared modules, global modules)
    - Dynamic modules (forRoot/forRootAsync, forFeature)
    - Custom providers (useFactory, useClass, useValue, useExisting)
    - Circular dependency resolution (forwardRef)
    - Lifecycle hooks (OnModuleInit, OnModuleDestroy, OnApplicationBootstrap)

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
