Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Route/Plugin registration style (shorthand vs full declaration, prefix conventions)
   - **Response flow**: Which layer wraps the response? (route handler vs service/plugin)
     Record the definitive answer. If an orchestration layer exists, describe it.
   - Schema validation approach (JSON Schema, TypeBox, fluent-json-schema)
   - Hook chain order and scope
   - Service/DI approach
   - Data access patterns (ORM, plugin-based DB access)
   - Error handling patterns

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Rate limiting: which domain
   - External API integration: which domain
   - Caching: which domain
   - Messaging: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - File/directory naming (kebab-case, camelCase, PascalCase)
   - Route file naming conventions
   - Plugin naming conventions
   - Schema naming conventions
   - Module/package structure conventions

6. Common Types/Utilities List
   - Shared type definition files with EXACT import paths
   - Shared schemas ($ref definitions) with EXACT locations
   - Utility functions with EXACT import paths
   - Path aliases used in the project
   - Constants/Enum management

7. Security/Authentication Patterns
   - JWT/session approach (fastify-jwt, @fastify/auth)
   - Hook-based authentication strategy
   - CORS configuration (@fastify/cors)
   - Rate Limiting (@fastify/rate-limit)
   - Per-environment security settings

8. Database Patterns
   - Table/collection naming conventions
   - Migration strategy
   - Seed data management
   - Audit columns (createdAt, updatedAt)
   - Connection lifecycle (onClose hook)

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - fastify.inject() usage patterns
   - Mocking strategy
   - DB test strategy
   - Plugin test strategy

10. Logging/Monitoring Strategy
    - Pino configuration
    - Log level policy
    - Serializer customization
    - Request/response logging

11. Performance Patterns
    - Schema-based serialization usage
    - Caching strategy
    - Connection pool configuration
    - Async processing status

12. Code Quality Tools
    - Lint/Format tools (ESLint, Prettier, Biome)
    - Pre-commit hooks (husky, lint-staged)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
