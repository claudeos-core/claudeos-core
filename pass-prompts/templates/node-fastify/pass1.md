Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Route/Plugin Patterns
   - Route registration (fastify.register, route shorthand get/post/put/delete/patch)
   - Plugin architecture (fastify-plugin, encapsulation, prefix, decorators)
   - URL patterns (RESTful conventions, naming, versioning, prefix)
   - Parameter handling (request.params, request.query, request.body, request.headers)
   - Response format (reply.send, reply.code, serialization, custom response wrappers)
   - If a custom response wrapper/helper exists, record its EXACT function/class name, EXACT method signatures, and EXACT import path. Do NOT guess — read the actual source.
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Does the route handler call it directly, or does a Service/plugin layer return the wrapped response?
     Record EXACTLY: "Route handler wraps response" or "Service wraps response".
   - If a dedicated orchestration layer exists between route handlers and services (e.g., UseCase, Facade),
     record its name, responsibilities, and return type.
   - Error handling (setErrorHandler, @fastify/sensible, custom error classes, onError hook)
   - Authentication (fastify-jwt, @fastify/auth, @fastify/passport, custom preValidation hooks)
   - API documentation (@fastify/swagger, @fastify/swagger-ui, route schema)
   - Pagination (offset/limit, cursor, custom)

2. Schema Validation Patterns
   - JSON Schema usage (route-level schema: body, querystring, params, response)
   - TypeBox (@sinclair/typebox) usage for type-safe schemas
   - fluent-json-schema usage
   - Shared schema definitions ($ref, addSchema)
   - Serialization schemas (response schema for fast serialization)
   - Ajv configuration and custom keywords

3. Hook Patterns
   - Lifecycle hooks (onRequest, preParsing, preValidation, preHandler, preSerialization, onSend, onResponse, onError)
   - Hook scope (global vs route-level vs plugin-scoped)
   - Authentication/authorization hooks
   - Logging hooks
   - Request decoration (fastify.decorateRequest)

4. Service/Business Logic Patterns
   - Dependency injection approach (plugin decorators, manual injection, awilix, @fastify/awilix)
   - Transaction strategy (Prisma.$transaction, Knex transaction, etc.)
   - Business exception handling (custom error classes, Boom-like errors, @fastify/sensible)
   - Validation beyond schema (business rules)
   - Event handling (EventEmitter, custom event bus)

5. Data Access Patterns
   - ORM/query builder (Prisma, TypeORM, Knex, Drizzle, Mongoose, MikroORM)
   - Database plugin (@fastify/postgres, @fastify/mysql, @fastify/mongodb)
   - Repository pattern usage
   - Query optimization (N+1 prevention, eager loading)
   - Migration tools (Prisma Migrate, Knex Migration)
   - Connection management (plugin lifecycle, onClose hook)

6. Configuration/Environment Patterns
   - Environment variable management (@fastify/env, dotenv, env-schema)
   - Configuration schema validation
   - Per-environment branching (development/staging/production)
   - Fastify server options (logger, trustProxy, bodyLimit)

7. Logging Patterns
   - Pino integration (built-in Fastify logger)
   - Log level configuration
   - Request/response logging (built-in request logging)
   - Serializers (custom serializers for request/response/error)
   - Child loggers (request.log)

8. Testing Patterns
   - Test framework (tap, Jest, Vitest, node:test)
   - fastify.inject() for HTTP testing (light-my-request)
   - Plugin testing strategy
   - Test lifecycle (build/close app per test)
   - Mocking strategy
   - DB test strategy

9. Domain-Specific Patterns
   - File upload (@fastify/multipart, S3, presigned URL)
   - WebSocket (@fastify/websocket)
   - Rate limiting (@fastify/rate-limit)
   - Caching (@fastify/caching, Redis)
   - CORS (@fastify/cors)
   - Static files (@fastify/static)
   - Messaging (Kafka, RabbitMQ, BullMQ)
   - Server-Sent Events

10. Anti-patterns / Inconsistencies
    - Blocking the event loop (sync operations in handlers)
    - Not using schema validation (missing performance benefit)
    - Plugin encapsulation violations
    - Inconsistent error handling across routes
    - Type safety issues (any abuse, missing types)
    - Security issues (injection, missing authorization)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["users", "auth", "orders", "products"],
  "analysisPerDomain": {
    "users": {
      "representativeFiles": {
        "route": "routes/users.ts",
        "schema": "schemas/users.ts",
        "service": "services/users.service.ts",
        "plugin": "plugins/db.ts"
      },
      "patterns": {
        "route": { ... },
        "schema": { ... },
        "hooks": { ... },
        "service": { ... },
        "dataAccess": { ... },
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
