Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - View style (FBV/CBV/ViewSet, URL patterns, response format)
   - **Response flow**: Which layer wraps the response? (View/ViewSet vs Service layer)
     Record the definitive answer. If an orchestration layer (Service, UseCase) exists, describe it.
   - Serializer conventions
   - Model structure (AbstractModel, field rules)
   - Error handling patterns
   - Transaction strategy

2. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

3. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - Celery tasks: which domain
   - WebSocket: which domain
   - External API: which domain
   - Caching: which domain
   - Admin customization: which domain
   - Management Command: which domain
   - Messaging: which domain

4. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

5. Naming Conventions Summary
   - App/module naming (snake_case)
   - Model/Serializer/View naming
   - URL pattern conventions
   - Test file structure

6. Common Models/Utilities List
   - Abstract model fields with EXACT import paths (e.g., `from apps.common.models import BaseModel`)
   - Shared Manager/QuerySet with EXACT module locations
   - Utility functions with EXACT import paths
   - Constants/Enum management with EXACT locations

7. Security/Authentication Patterns
   - Authentication method (JWT, Session, Token, OAuth2)
   - Permission class strategy
   - CORS configuration
   - Environment variable management
   - CSRF policy

8. Database Patterns
   - Table naming (db_table, verbose_name)
   - Migration strategy (squash, revert)
   - Fixture/seed management
   - Audit fields (created_at, updated_at)
   - Index/constraints
   - Soft delete patterns

9. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/E2E)
   - Factory/Fixture strategy
   - Mocking strategy
   - DB test strategy
   - Test naming conventions

10. Logging/Monitoring Strategy
    - Logger standard
    - Log level policy
    - Structured logging
    - Request/response logging

11. Performance Patterns
    - Caching strategy
    - Query optimization status (select_related, prefetch_related)
    - Async processing status
    - DB connection management

12. Code Quality Tools
    - Lint/Format tools (ruff, black, isort, flake8, mypy)
    - Pre-commit hooks
    - Type Checking (mypy, pyright)
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
