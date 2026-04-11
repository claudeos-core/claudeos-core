Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Route/Blueprint style (decorators, response format, status codes)
   - **Response flow**: Which layer wraps the response? (route handler vs service layer)
     Record the definitive answer. If an orchestration layer exists, describe it.
   - Model/serialization conventions (SQLAlchemy, marshmallow)
   - Data access patterns (session management, queries)
   - Application factory structure (create_app, extensions)
   - Error handling patterns
   - Before/after request hooks

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - WebSocket: which domain
   - Background tasks: which domain
   - External API: which domain
   - Caching: which domain
   - Template rendering: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - Module/package naming (snake_case)
   - Blueprint naming conventions
   - Model/schema naming conventions
   - Route URL patterns
   - File structure conventions

6. Common Models/Utilities List
   - Base model mixins with EXACT import paths
   - Shared utility functions with EXACT module paths
   - Constants/Enum management with EXACT locations
   - Extension instances (db, login_manager, etc.)

7. Security/Authentication Patterns
   - Authentication method (flask-login, flask-jwt-extended, custom)
   - Authorization decorators (login_required, custom)
   - CSRF protection
   - CORS configuration
   - Environment variable management

8. Database Patterns
   - Table naming (__tablename__)
   - Migration strategy (Flask-Migrate)
   - Seed data management
   - Audit fields (created_at, updated_at)
   - Relationship patterns
   - Index/constraints

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - Test client setup (app.test_client)
   - Fixture/Factory strategy
   - Mocking strategy
   - DB test strategy

10. Logging/Monitoring Strategy
    - Logger standard (app.logger vs custom)
    - Log level policy
    - Request/response logging

11. Performance Patterns
    - Caching strategy (Flask-Caching)
    - Connection pool configuration
    - Query optimization
    - Static file serving

12. Code Quality Tools
    - Lint/Format tools (ruff, black, isort, mypy, flake8)
    - Pre-commit hooks
    - Type Checking (mypy, pyright)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
