Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Router/Endpoint style (decorators, response models, status codes)
   - **Response flow**: Which layer wraps the response? (router/endpoint vs service/CRUD)
     Record the definitive answer. If an orchestration layer (UseCase, Facade) exists, describe it.
   - Schema/Pydantic conventions (BaseModel, validation)
   - Data access patterns (ORM, session management)
   - Dependency injection chain (Depends)
   - Error handling patterns
   - Middleware chain

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Background tasks: which domain
   - External API: which domain
   - Caching: which domain
   - Messaging: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - Module/package naming (snake_case)
   - Schema/Model naming conventions
   - Router URL patterns
   - File structure conventions

6. Common Models/Utilities List
   - Base model fields with EXACT import paths (e.g., `from app.core.base import BaseModel`)
   - Shared dependency functions with EXACT module paths
   - Utility functions with EXACT import paths
   - Constants/Enum management with EXACT locations

7. Security/Authentication Patterns
   - Authentication method (JWT Bearer, OAuth2PasswordBearer)
   - Depends-based authorization check
   - CORS configuration
   - Rate Limiting
   - Environment variable management

8. Database Patterns
   - Table naming (__tablename__)
   - Alembic migration strategy
   - Seed data management
   - Audit fields (created_at, updated_at)
   - Async DB access patterns
   - Index/constraints

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - Dependency override strategy
   - Async testing approach
   - Fixture/Factory strategy
   - Mocking strategy

10. Logging/Monitoring Strategy
    - Logger standard
    - Log level policy
    - Structured logging approach
    - Request/response logging

11. Performance Patterns
    - Caching strategy
    - Async processing status
    - Connection pool configuration
    - Query optimization

12. Code Quality Tools
    - Lint/Format tools (ruff, black, isort, mypy)
    - Pre-commit hooks
    - Type Checking (mypy, pyright)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
