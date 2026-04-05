Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. View Patterns
   - View type (FBV vs CBV vs ViewSet vs GenericAPIView)
   - URL configuration (urlpatterns, Router registration, namespace)
   - Parameter handling (request.data, serializer, query_params, kwargs)
   - Response format (Response, JsonResponse, TemplateResponse)
   - If a custom response wrapper/mixin exists, record its EXACT class name, EXACT method signatures, and EXACT import path. Do NOT guess — read the actual source.
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Does the View/ViewSet call it directly, or does a service layer return the wrapped response?
     Record EXACTLY: "View wraps response" or "Service wraps response".
   - If a dedicated orchestration layer exists between View and Model (e.g., Service, UseCase),
     record its name, responsibilities, and return type.
   - Error handling (exception_handler, DRF exceptions, custom exceptions)
   - Authentication (permission_classes, authentication_classes)
   - API documentation (drf-spectacular, drf-yasg, @extend_schema)
   - Pagination (PageNumberPagination, CursorPagination, LimitOffsetPagination)
   - Filtering/search (django-filter, SearchFilter, OrderingFilter)
   - API versioning (URL, Header, Namespace)

2. Serializer/Form Patterns
   - Serializer type (ModelSerializer, Serializer, HyperlinkedSerializer)
   - Validation (validate_*, validators, UniqueValidator)
   - Nested serializers (depth, manual nesting, writable nested)
   - Form usage (ModelForm, Form, Formset)
   - Field customization (SerializerMethodField, to_representation)

3. Model Patterns
   - Model structure (AbstractModel, inheritance, Proxy, Multi-table)
   - Field types and options (null, blank, default, choices, validators)
   - Manager customization (custom QuerySet, soft delete)
   - QuerySet methods (annotate, aggregate, select_related, prefetch_related)
   - Signal usage (pre_save, post_save, pre_delete)
   - Meta options (ordering, verbose_name, constraints, indexes, unique_together)
   - N+1 handling (select_related, prefetch_related)

4. Business Logic Patterns
   - Architecture (Fat Model vs Service Layer vs Domain Service)
   - Transactions (transaction.atomic, select_for_update, savepoint)
   - Celery tasks (shared_task, retry, priority)
   - Utility/helper functions with EXACT import paths (e.g., `from apps.common.utils import format_date`)
   - Event handling (django-signals, custom event bus)
   - Import paths: record EXACT import conventions used in the project (relative vs absolute, app prefix)

5. Configuration/Environment Patterns
   - Settings separation (base/local/staging/production)
   - Environment variable management (django-environ, python-decouple, os.environ)
   - Configuration validation
   - App configuration (AppConfig, ready())

6. Logging Patterns
   - Logger usage (Django logging, structlog)
   - Log level policy
   - Structured logging
   - Request/response logging (middleware)

7. Testing Patterns
   - Test framework (pytest-django, unittest, factory_boy)
   - Test classification (unit/integration/E2E)
   - Fixture/Factory strategy (factory_boy, FactoryBoy, pytest fixture)
   - APITestCase vs TestCase
   - DB test strategy (TransactionTestCase, test DB)
   - Mocking (unittest.mock, pytest-mock, responses)
   - Test naming conventions

8. Admin Patterns
   - ModelAdmin customization (list_display, search_fields, filters)
   - Inline usage
   - Custom actions
   - Admin permission management

9. Domain-Specific Patterns
   - File upload (FileField, ImageField, S3, django-storages)
   - WebSocket (Django Channels, ASGI)
   - Async processing (Celery, async views, django-rq)
   - External API integration (requests, httpx, aiohttp)
   - Caching (Django cache framework, Redis, per-view cache)
   - Management Commands
   - Internationalization (gettext, i18n middleware)
   - Messaging (Kafka, RabbitMQ, Celery broker)
   - API versioning
   
10. Anti-patterns / Inconsistencies
    - Code with differing styles within the domain
    - Fat Views (business logic concentrated in views)
    - N+1 query problems
    - Legacy-looking patterns
    - Security issues (SQL Injection, missing authorization, CSRF)
    - Performance issues (unnecessary queries, memory)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["users", "orders", "products", "payments"],
  "analysisPerDomain": {
    "users": {
      "representativeFiles": {
        "view": "users/views.py",
        "serializer": "users/serializers.py",
        "model": "users/models.py",
        "url": "users/urls.py",
        "admin": "users/admin.py"
      },
      "patterns": {
        "view": { ... },
        "serializer": { ... },
        "model": { ... },
        "businessLogic": { ... },
        "config": { ... },
        "logging": { ... },
        "testing": { ... },
        "admin": { ... }
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
