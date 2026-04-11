Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Route/Blueprint Patterns
   - Blueprint structure (Blueprint registration, url_prefix, naming)
   - Route decorators (@app.route, @bp.route with methods)
   - URL patterns and naming conventions
   - View function structure (function-based vs class-based MethodView)
   - Request handling (request.args, request.form, request.json, request.files)
   - Response patterns (jsonify, make_response, Response, redirect, abort)
   - If a custom response wrapper exists, record its EXACT function/class name, EXACT import path
   - **Response wrapping layer (CRITICAL)**: Which layer formats the response?
     Does the route handler call it directly, or does a service layer return formatted data?
   - Error handling (errorhandler, abort, custom exception classes)
   - Authentication (flask-login, flask-jwt-extended, custom decorators)
   - API documentation (flask-restx, flask-smorest, flasgger)
   - Pagination patterns

2. Data Model Patterns
   - ORM (SQLAlchemy, Flask-SQLAlchemy, Peewee)
   - Model structure (db.Model, relationships, mixins)
   - Serialization (marshmallow, flask-marshmallow, manual to_dict)
   - Form validation (WTForms, Flask-WTF, manual)
   - Request/Response schema separation
   - Enum/constant management

3. Data Access Patterns
   - Session management (db.session, scoped_session)
   - Repository/DAO pattern vs direct model queries
   - Migration (Flask-Migrate / Alembic)
   - Query optimization (eager loading, lazy loading)
   - Connection management (pool, teardown_appcontext)
   - Transaction management

4. Application Structure Patterns
   - Application factory (create_app)
   - Configuration (app.config, from_object, from_envvar)
   - Extension initialization (db.init_app, login_manager.init_app)
   - Context (application context, request context, g, current_app)
   - Before/after request hooks (before_request, after_request, teardown_request)
   - Import paths: record EXACT import conventions
   - Utility function locations: record EXACT module paths

5. Configuration/Environment Patterns
   - Environment variable management (python-dotenv, os.environ)
   - Config classes (DevelopmentConfig, ProductionConfig)
   - Per-environment branching
   - Secret management (SECRET_KEY, database URL)

6. Logging Patterns
   - Logger usage (app.logger, structlog, loguru, logging)
   - Log level policy
   - Request/response logging
   - Error logging

7. Testing Patterns
   - Test framework (pytest, unittest)
   - Test client (app.test_client, pytest fixtures)
   - Application factory testing (create_app with test config)
   - Fixture management (conftest, client fixture)
   - DB test strategy (test DB, SQLite in-memory, transaction rollback)
   - Mocking (unittest.mock, pytest-mock, responses)

8. Domain-Specific Patterns
   - Template rendering (Jinja2, render_template) vs JSON API
   - File upload (request.files, werkzeug FileStorage)
   - Background tasks (Celery, RQ, APScheduler)
   - WebSocket (Flask-SocketIO)
   - External API integration (requests, httpx)
   - Caching (Flask-Caching, Redis)
   - Session management (server-side, Flask-Session)
   - CSRF protection (Flask-WTF CSRFProtect)

9. Anti-patterns / Inconsistencies
   - Circular imports
   - Missing application factory
   - Global state misuse
   - Missing error handlers
   - Security issues (injection, missing CSRF, debug mode in production)
   - Performance issues (blocking I/O, N+1 queries)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["auth", "users", "orders", "products"],
  "analysisPerDomain": {
    "users": {
      "representativeFiles": {
        "routes": "app/users/routes.py",
        "models": "app/users/models.py",
        "forms": "app/users/forms.py",
        "services": "app/users/services.py"
      },
      "patterns": {
        "routes": { ... },
        "models": { ... },
        "dataAccess": { ... },
        "appStructure": { ... },
        "config": { ... },
        "logging": { ... },
        "testing": { ... }
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
