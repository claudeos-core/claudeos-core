Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Router/Endpoint Patterns
   - Router structure (APIRouter, include_router, prefix, tags)
   - Path decorators (@router.get, @router.post, @router.put, @router.delete)
   - Parameter handling (Path, Query, Body, Header, Cookie, Depends)
   - Response model (response_model, status_code, response_class)
   - If a custom response wrapper/schema exists, record its EXACT class name, EXACT method signatures, and EXACT import path. Do NOT guess — read the actual source.
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Does the router/endpoint call it directly, or does a service/CRUD layer return the wrapped response?
     Record EXACTLY: "Router wraps response" or "Service wraps response".
   - If a dedicated orchestration layer exists between router and service (e.g., UseCase, Facade),
     record its name, responsibilities, and return type.
   - Error handling (HTTPException, exception_handler, custom exceptions)
   - Authentication (Depends-based JWT/OAuth2, Security schemes)
   - API documentation (auto OpenAPI, tags, summary, description, deprecated)
   - Pagination (offset/limit, cursor, custom)
   - API versioning (prefix, router separation)

2. Schema/Pydantic Patterns
   - Pydantic model structure (BaseModel, inheritance, Generic)
   - Validation (@field_validator, @model_validator, BeforeValidator)
   - Request/Response schema separation
   - Config (model_config, from_attributes, json_schema_extra)
   - Optional/Union field handling
   - Enum/Literal usage
   - Nested models

3. Data Access Patterns
   - ORM (SQLAlchemy 2.0, Tortoise ORM, SQLModel, Beanie/Motor)
   - Session management (get_db, AsyncSession, contextmanager)
   - Repository/CRUD pattern (Generic Repository, abstraction level)
   - Migration (Alembic, autogenerate, manual)
   - Query optimization (eager loading, selectinload, joinedload)
   - Connection management (pool, retry, async)
   - Dynamic query/filtering

4. Dependency Injection Patterns
   - Depends chain (auth, DB session, permissions, config)
   - Dependency hierarchy (nested Depends)
   - Custom dependency functions/classes
   - Lifecycle events (lifespan, startup/shutdown)
   - Import paths: record EXACT import conventions (e.g., `from app.core.deps import get_db`, not invented paths)
   - Utility function locations: record EXACT module paths for shared utilities
   - Dependency overrides (for testing)

5. Configuration/Environment Patterns
   - Environment variable management (pydantic-settings, python-dotenv)
   - Settings class structure (@lru_cache, singleton)
   - Per-environment branching (development/staging/production)
   - Configuration validation

6. Logging Patterns
   - Logger usage (structlog, loguru, logging)
   - Log level policy
   - Structured logging (JSON format, correlation ID)
   - Request/response logging (middleware)
   - Async logging

7. Testing Patterns
   - Test framework (pytest, pytest-asyncio, httpx)
   - Test classification (unit/integration/E2E)
   - Test client (TestClient, AsyncClient)
   - Dependency override strategy
   - Fixture management (conftest, factory)
   - DB test strategy (test DB, SQLite in-memory, transaction rollback)
   - Mocking (unittest.mock, pytest-mock, responses, respx)

8. Middleware Patterns
   - CORS Middleware
   - Custom middleware (logging, auth, performance measurement)
   - Middleware registration order
   - Starlette Middleware usage

9. Domain-Specific Patterns
   - File upload (UploadFile, S3, presigned URL)
   - WebSocket (websocket endpoint)
   - Background tasks (BackgroundTasks, Celery, ARQ, Dramatiq)
   - External API integration (httpx, aiohttp)
   - Caching (Redis, fastapi-cache, aiocache)
   - Event-driven (async/await, pub/sub)
   - Messaging (Kafka, RabbitMQ, aio-pika)
   - Internationalization
   - Rate Limiting (slowapi)
   - GraphQL (Strawberry)

10. Anti-patterns / Inconsistencies
    - Sync/async mixing
    - Missing type hints
    - Depends overuse or non-use
    - Legacy-looking patterns
    - Security issues (injection, missing authorization)
    - Performance issues (blocking I/O, N+1)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["users", "auth", "orders", "products"],
  "analysisPerDomain": {
    "users": {
      "representativeFiles": {
        "router": "app/users/router.py",
        "schema": "app/users/schemas.py",
        "model": "app/users/models.py",
        "crud": "app/users/crud.py",
        "deps": "app/users/deps.py"
      },
      "patterns": {
        "router": { ... },
        "schema": { ... },
        "dataAccess": { ... },
        "dependency": { ... },
        "config": { ... },
        "logging": { ... },
        "testing": { ... },
        "middleware": { ... }
      },
      "specialPatterns": [],
      "antiPatterns": []
    }
  },
  "crossDomainCommon": {
    "description": "Patterns commonly used across domains in this group",
    "patterns": []
  }
}
