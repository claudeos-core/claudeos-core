Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Router/Controller Patterns
   - Routing approach (Express Router vs NestJS @Controller)
   - Middleware chain (auth, validation, error handler, registration order)
   - URL patterns (RESTful conventions, naming, versioning)
   - Parameter handling (req.body, req.params, req.query, @Body(), @Param(), @Query())
   - Response format (res.json, interceptor, class-transformer, custom wrapper)
   - If a custom response wrapper/helper exists, record its EXACT function/class name, EXACT method signatures, and EXACT import path. Do NOT guess — read the actual source.
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Does Controller/Router call it directly, or does a Service/UseCase layer return the wrapped response?
     Record EXACTLY: "Controller/Router wraps response" or "Service wraps response".
   - If a dedicated orchestration layer exists between Controller and Service (e.g., UseCase, Facade, Aggregator),
     record its name, responsibilities (DTO conversion, multi-service composition, response wrapping), and return type.
   - Error handling (try-catch, HttpException, ExceptionFilter, error middleware)
   - Authentication (Passport, JWT Guard, custom middleware)
   - API documentation (Swagger @ApiTags, @ApiOperation, JSDoc)
   - Pagination (offset/limit, cursor, custom)

2. Service Patterns
   - Dependency injection (NestJS @Injectable vs manual injection vs factory)
   - Transaction strategy (Prisma.$transaction, TypeORM QueryRunner, Sequelize.transaction, Knex transaction)
   - Business exception handling (custom Exception hierarchy, HttpException)
   - Validation (class-validator, Joi, Zod)
   - Event handling (EventEmitter, NestJS @OnEvent)

3. Data Access Patterns
   - ORM/query builder (Prisma, TypeORM, Sequelize, Knex, Drizzle, Mongoose)
   - Repository pattern usage
   - Query optimization (N+1 prevention, include/join/populate strategy)
   - Migration tools (Prisma Migrate, TypeORM Migration, Knex Migration, Mongoose versioning)
   - Seed data management
   - Connection management (pool, retry)
   - Dynamic query patterns

4. DTO/Type Patterns
   - Validation decorators (class-validator)
   - Schema definition (Zod, Joi, JSON Schema, Yup)
   - Request/Response type separation
   - TypeScript usage level (interface vs type vs class, Generic usage)
   - Serialization/deserialization (class-transformer, custom serializer)
   - Enum/constants management
   - File entry pattern: is the main file `index.ts` or named by module (e.g., `users.controller.ts`)? Record the exact convention.
   - Import paths: record EXACT path aliases and import patterns used (e.g., `@/modules/`, `@app/`, relative paths)

5. Configuration/Environment Patterns
   - Environment variable management (@nestjs/config, dotenv, envalid)
   - Per-environment branching (development/staging/production)
   - Configuration validation (Joi schema, Zod)
   - External config file structure

6. Logging Patterns
   - Logger usage (winston, pino, NestJS Logger, morgan)
   - Log level policy
   - Structured logging (JSON format, correlation ID)
   - Request/response logging (middleware/interceptor)

7. Testing Patterns
   - Test framework (Jest, Vitest, Mocha)
   - Test classification (unit/integration/E2E)
   - Mocking strategy (jest.mock, jest.spyOn, Test Module)
   - Test data management (Factory, Fixture, Faker)
   - Test naming conventions
   - DB test strategy (in-memory, test container, separate DB)

8. Domain-Specific Patterns
   - File upload (Multer, S3, presigned URL)
   - WebSocket/real-time (Socket.io, ws)
   - Queue/batch processing (Bull, BullMQ, Agenda)
   - External API integration (Axios, fetch, HttpService, got)
   - Caching (Redis, in-memory, cache-manager)
   - Event-driven (EventEmitter, CQRS, Saga)
   - Messaging (Kafka, RabbitMQ, SQS)
   - Internationalization (i18next, nestjs-i18n)
   - API versioning strategy
   - Rate Limiting

9. Anti-patterns / Inconsistencies
   - Code with differing styles within the domain
   - Patterns inconsistent with other domains
   - Legacy-looking patterns
   - Type safety issues (any abuse, missing types)
   - Performance issues (memory leaks, blocking I/O)
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
        "router": "users.router.ts",
        "controller": "users.controller.ts",
        "service": "users.service.ts",
        "repository": "users.repository.ts",
        "dto": "create-user.dto.ts"
      },
      "patterns": {
        "router": { ... },
        "service": { ... },
        "dataAccess": { ... },
        "dto": { ... },
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
