Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Module & Controller Patterns
   - @Module() structure (imports, controllers, providers, exports)
   - @Controller() decorator, route prefix conventions
   - @Get/@Post/@Put/@Patch/@Delete decorators, parameter decorators (@Body, @Param, @Query, @Headers)
   - Response handling (@Res() vs return value, interceptors, class-transformer serialization)
   - If a custom response wrapper/interceptor exists, record its EXACT class name, method signatures, and import path
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Does Controller call it directly, or does a Service/UseCase layer return the wrapped response?
     Record EXACTLY: "Controller wraps response" or "Service wraps response"
   - If a dedicated orchestration layer exists between Controller and Service (e.g., UseCase, Facade, Aggregator),
     record its name, responsibilities, and return type
   - Error handling (HttpException hierarchy, ExceptionFilter, @Catch())
   - @UseGuards() for authentication (JwtAuthGuard, RolesGuard, custom guards)
   - API documentation (@ApiTags, @ApiOperation, @ApiResponse, @ApiBearerAuth)
   - Pagination patterns (offset/limit, cursor, custom)
   - @Version() API versioning

2. Provider & Service Patterns
   - @Injectable() and dependency injection (constructor injection, custom providers, useFactory/useClass/useValue)
   - Module scoping (DEFAULT, REQUEST, TRANSIENT)
   - Transaction strategy (Prisma.$transaction, TypeORM QueryRunner, Sequelize.transaction)
   - Business exception handling (custom exception hierarchy extending HttpException)
   - Validation (@UsePipes, ValidationPipe, class-validator decorators)
   - Event handling (@OnEvent, EventEmitter2)
   - CQRS pattern usage (@nestjs/cqrs CommandBus/QueryBus/EventBus)

3. Data Access Patterns
   - ORM/query builder (Prisma, TypeORM, Sequelize, MikroORM, Mongoose)
   - Repository pattern (@InjectRepository, custom repository classes)
   - Query optimization (relations/eager/lazy loading, N+1 prevention)
   - Migration tools (Prisma Migrate, TypeORM Migration)
   - Seed data management
   - Connection management (TypeOrmModule.forRootAsync, PrismaModule)

4. DTO & Validation Patterns
   - class-validator decorators (@IsString, @IsNotEmpty, @IsEmail, @ValidateNested)
   - class-transformer decorators (@Expose, @Exclude, @Type, @Transform)
   - Request/Response DTO separation
   - Mapped types (PartialType, PickType, OmitType, IntersectionType)
   - Custom validation decorators
   - Enum/constants management
   - File entry pattern: is the main file `index.ts` or named by module (e.g., `users.controller.ts`)? Record exact convention
   - Import paths: record EXACT path aliases and import patterns (e.g., `@/modules/`, `@app/`, relative paths)

5. Middleware, Guard, Pipe, Interceptor Patterns
   - @Injectable() middleware (NestMiddleware) vs Express-style middleware
   - Guards (@CanActivate) — authentication, authorization, role-based
   - Pipes (ValidationPipe, ParseIntPipe, custom pipes)
   - Interceptors (logging, caching, timeout, response transformation)
   - Execution order (middleware → guard → interceptor(pre) → pipe → handler → interceptor(post) → filter)

6. Configuration & Environment Patterns
   - @nestjs/config (ConfigModule, ConfigService, registerAs)
   - Environment validation (Joi schema, class-validator)
   - Per-environment branching (development/staging/production)
   - Custom configuration namespaces

7. Logging Patterns
   - NestJS Logger vs external (winston, pino, nestjs-pino)
   - Log level policy
   - Structured logging (JSON format, correlation ID)
   - Request/response logging (LoggingInterceptor)

8. Testing Patterns
   - Test framework (Jest, Vitest)
   - Test.createTestingModule() usage
   - Mocking strategy (jest.mock, overrideProvider, custom TestModule)
   - E2E testing (supertest, @nestjs/testing)
   - Test data management (Factory, Fixture, Faker)
   - DB test strategy (in-memory, test container, separate DB)

9. Domain-Specific Patterns
   - File upload (@UseInterceptors(FileInterceptor), Multer, S3)
   - WebSocket (@WebSocketGateway, Socket.io)
   - Queue/job processing (@nestjs/bull, BullMQ)
   - External API integration (HttpModule/HttpService, Axios)
   - Caching (@nestjs/cache-manager, Redis, @CacheKey, @CacheTTL)
   - Microservices (@nestjs/microservices, Transport)
   - Scheduling (@nestjs/schedule, @Cron, @Interval)
   - Health checks (@nestjs/terminus)

10. Anti-patterns / Inconsistencies
    - Mixing NestJS patterns with raw Express patterns
    - Business logic in controllers (should be in services)
    - Circular dependencies
    - Missing @Injectable() on providers
    - Type safety issues (any abuse, missing types)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["users", "auth", "orders", "products"],
  "analysisPerDomain": {
    "users": {
      "representativeFiles": {
        "module": "users.module.ts",
        "controller": "users.controller.ts",
        "service": "users.service.ts",
        "repository": "users.repository.ts",
        "dto": "create-user.dto.ts"
      },
      "patterns": {
        "module": { ... },
        "controller": { ... },
        "service": { ... },
        "dataAccess": { ... },
        "dto": { ... },
        "middleware": { ... },
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
