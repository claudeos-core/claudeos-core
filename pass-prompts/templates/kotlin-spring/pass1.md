Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.
For multi-module domains, analyze files from EACH module (command, query, bff) separately.

Analysis items (per domain):

1. Controller/Router Patterns
   - Class annotations (@RestController, @Controller, inheritance, RequestMapping)
   - Kotlin-specific syntax (suspend functions, coroutines in controllers)
   - Method mappings (@GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
   - URL patterns (RESTful conventions, naming, versioning)
   - Parameter binding (@RequestBody, @PathVariable, @RequestParam, @ModelAttribute)
   - Response format (ResponseEntity, custom response wrappers, sealed class responses)
   - If a custom response wrapper class exists, record its EXACT class name, EXACT method signatures (e.g., `success()`, `error()`), and EXACT import path. Do NOT guess or invent method names — read the actual source.
   - Error handling (try-catch, @ExceptionHandler, @ControllerAdvice, Result/Either pattern)
   - Authentication/authorization (@AuthenticationPrincipal, @PreAuthorize, SecurityContext)
   - API documentation (Swagger/SpringDoc annotations)
   - Pagination (Pageable, custom paging parameters, Slice vs Page)
   - **CQRS split**: How command controllers differ from query controllers
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Read the Controller source code and determine: does Controller call makeResponse/response wrapper directly,
     or does it receive an already-wrapped ResponseEntity from Aggregator/Service?
     Record EXACTLY ONE of: "Controller wraps response" or "Aggregator wraps response" or "Service wraps response".
     This is critical for cross-file consistency in Pass 3.
   - Controller dependency injection targets: Does Controller inject Aggregator? Service? Both?
     Record the EXACT injected class types.

2. Aggregator/Orchestrator Patterns (CRITICAL — analyze even if the layer has a different name)
   Many Kotlin Spring projects have a dedicated orchestration layer between Controller and Service.
   It may be called Aggregator, Facade, Orchestrator, UseCase, or similar.
   If this layer exists, it MUST be analyzed thoroughly.
   If it does not exist, record "No Aggregator layer — Controller calls Service directly".
   NOTE: This is DIFFERENT from DDD Aggregate Root (section 7). Aggregator = orchestration layer, Aggregate = domain modeling concept.

   - **Existence and naming**: Does a dedicated orchestration class exist between Controller and Service?
     Record the EXACT class name pattern (e.g., `{Domain}Aggregator`, `{Domain}Facade`).
   - **Class annotation**: @Component, @Service, or other?
   - **Responsibility scope** (record each as YES/NO with evidence):
     * DTO → VO conversion (inbound: request DTO to condition/param VO)
     * VO → DTO conversion (outbound: result VO to response DTO)
     * Conversion tool (MapStruct, manual extension functions, toEntity/toDto)
     * Response wrapping: Does Aggregator call makeResponse/response wrapper and return ResponseEntity?
       Or does it return plain DTO/VO and let Controller wrap?
       Record the EXACT return type of Aggregator methods.
     * Multi-service orchestration (calling 2+ services and composing results)
     * Exception handling within Aggregator (try-catch, or let it propagate to Controller?)
   - **Dependency rules**: What does Aggregator inject? (Service only? DAO allowed? Other Aggregators?)
   - **Return type pattern**: For EACH Aggregator method you read, record:
     the method signature, return type, and whether it calls any response wrapper utility.

3. BFF (Backend For Frontend) Patterns — if BFF module exists
   - Feign Client declarations (@FeignClient, configuration, fallback)
   - Response composition (aggregating responses from multiple backend services)
   - Request transformation (client request → backend request mapping)
   - Error propagation (how backend errors are translated for clients)
   - Caching at BFF level
   - Mobile vs Web differentiation (if separate BFF servers exist)

4. Service Patterns
   - Class annotations (@Service, @Transactional)
   - Kotlin-specific patterns (extension functions, scope functions let/run/apply/also)
   - Transaction strategy (class-level vs method-level, readOnly separation, propagation)
   - Dependency injection (constructor injection, @Autowired, Spring functional style)
   - Business exception handling (custom Exception hierarchy, sealed class exceptions)
   - Validation logic placement (within Service vs separate Validator)
   - Event handling (ApplicationEventPublisher, @EventListener, @TransactionalEventListener)
   - **CQRS split**: Command service vs Query service patterns

5. Data Access Patterns
   - ORM approach (JPA/Hibernate, MyBatis, Exposed, jOOQ, Spring Data JDBC)
   - MyBatis XML mapper location: check ACTUAL path under src/main/resources/ (e.g., mapper/{domain}/, mybatis/mappers/ — DO NOT assume default path)
   - Repository/Mapper interface structure (inheritance, custom methods)
   - Read/write DB separation (if applicable — separate datasource config)
   - Pagination approach (Pageable, custom, Slice)
   - Audit columns (createdAt/updatedAt/createdBy/updatedBy, @CreatedDate, @LastModifiedDate)
   - NULL handling strategy (Kotlin nullability vs DB null)
   - PK generation strategy (AUTO_INCREMENT, SEQUENCE, UUID, ULID, custom)
   - N+1 handling (fetch join, @EntityGraph, BatchSize, @Fetch)
   - Dynamic queries (Specification, QueryDSL, MyBatis dynamic SQL, Criteria API)

6. DTO/VO/Entity Patterns
   - Kotlin class types (data class, value class, sealed class, enum class)
   - Request/Response DTO separation rules
   - DTO naming conventions
   - **DTO vs VO distinction**: DTO (data transfer, mutable) vs VO (domain concept, immutable, equality by value)
   - VO usage patterns (value class for single-value VO, data class for multi-field VO)
   - VO examples: Money, Address, Email, PhoneNumber, DateRange, Quantity
   - VO location (domain layer vs shared-lib)
   - Nullable vs non-nullable field rules
   - Validation annotations (@field:NotNull, @field:NotBlank, @field:Size, custom)
   - Conversion approach (mapstruct-kotlin, manual extension functions, toEntity/toDto)
   - Serialization (Jackson Kotlin module, kotlinx.serialization)
   - Import paths: record EXACT package paths for shared classes (e.g., `com.company.shared.util.DateUtils`, not an invented path)
   - Utility class locations: record EXACT module and package where shared utilities live

7. Aggregate/Aggregate Root Patterns (DDD — distinct from Aggregator orchestration layer in section 2)
   - Aggregate boundary definition (which entities belong together)
   - Aggregate Root identification (entry point entity for the aggregate)
   - Aggregate Root patterns: enforce invariants, control child entity access
   - Repository per Aggregate Root (not per entity)
   - Inter-aggregate references (by ID only, not by object reference)
   - Domain event publishing from Aggregate Root
   - Aggregate size strategy (small aggregates vs large aggregates)
   - Aggregator service patterns (composing data from multiple aggregates/services)
   - Aggregator vs BFF distinction (internal aggregation vs client-facing composition)

8. Inter-Module Communication Patterns
   - Feign Client patterns (declaration, configuration, interceptors, error decoder)
   - Event/Pub-Sub patterns (Kafka, RabbitMQ, Spring Events, custom event bus)
   - Shared library usage (shared-lib classes, DTOs, utils used across modules)
   - Integration library patterns (integration-lib contracts, adapters)
   - Module boundary rules (what can/cannot be shared)

9. Configuration/Environment Patterns
   - Profile separation (local/dev/stg/prod)
   - Configuration loading (@ConfigurationProperties, @Value, Environment)
   - Multi-module config (shared vs per-module application.yml)
   - Build configuration (Gradle Kotlin DSL, dependency management, version catalogs)
   - External configuration (application.yml structure, environment variables)

10. Logging Patterns
   - Logger usage (SLF4J, Logback, kotlin-logging, mu-logging)
   - Companion object logger pattern
   - Log level policy
   - Structured logging (MDC, JSON format)
   - Request/response logging approach (interceptor, filter)

11. Testing Patterns
   - Test framework (JUnit 5, Kotest, MockK, AssertJ)
   - Kotlin-specific testing (shouldBe, slot, coEvery for coroutines)
   - Test classification (unit/integration/slice)
   - @SpringBootTest vs @WebMvcTest vs @DataJpaTest
   - Mocking strategy (MockK mockk/every/verify, @MockkBean)
   - Test data management (TestFixture, Builder pattern, Object Mother)
   - Test naming conventions (backtick method names, BDD style)

12. Domain-Specific Patterns
    - File upload/download (MultipartFile, S3)
    - Excel import/export (Apache POI, EasyExcel)
    - Bulk processing (Batch CUD, Spring Batch)
    - State transition logic (state machine, sealed class-based)
    - Scheduling (@Scheduled, Quartz)
    - External API integration (WebClient, RestClient, FeignClient, Retrofit)
    - Caching (@Cacheable, Redis, Caffeine)
    - Messaging (Kafka, RabbitMQ)
    - Internationalization (MessageSource, LocaleResolver)
    - Coroutines/async patterns (suspend functions, Flow, Deferred)

13. Anti-patterns / Inconsistencies
    - Code with differing styles within the domain
    - Patterns inconsistent between command and query modules
    - Java-style code in Kotlin (not using Kotlin idioms)
    - Nullable abuse (!! operator overuse, platform types)
    - Performance issues (N+1, unnecessary queries, blocking calls in coroutines)
    - Security issues (SQL Injection potential, missing authorization)
    - Module boundary violations (direct DB access from BFF, circular dependencies)
    - Aggregator boundary violations (Aggregator accessing DAO directly, Controller bypassing Aggregator)
    - Aggregate boundary violations (cross-aggregate direct references, oversized aggregates)
    - VO misuse (mutable VOs, VOs with identity, DTO used where VO should be)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["reservation", "payment", "iam", "channel"],
  "analysisPerDomain": {
    "reservation": {
      "modules": ["reservation-command-server", "common-query-server"],
      "serverTypes": ["command", "query"],  // omit if single-module (non-CQRS) project
      "representativeFiles": {
        "commandController": "servers/command/reservation-command-server/.../ReservationCommandController.kt",
        "queryController": "servers/query/common-query-server/.../ReservationQueryController.kt",
        "aggregator": "...ReservationAggregator.kt (or null if no Aggregator layer)",
        "commandService": "...ReservationCommandService.kt",
        "queryService": "...ReservationQueryService.kt",
        "repository": "...ReservationRepository.kt",
        "entity": "...Reservation.kt",
        "dto": "...ReservationRequest.kt",
        "vo": "...Money.kt (if exists)",
        "aggregate": "...ReservationAggregate.kt (if exists)"
      },
      "patterns": {
        "controller": {
          "command": { ... }, "query": { ... },
          "responseWrappingLayer": "Controller wraps response | Aggregator wraps response",
          "injectedDependencies": ["ReservationAggregator", "ExceptionHelper"]
        },
        "aggregator": {
          "exists": true,
          "className": "ReservationAggregator",
          "returnType": "ResponseEntity<...> | plain DTO",
          "callsMakeResponse": true,
          "responsibilities": ["DTO↔VO conversion", "multi-service orchestration"]
        },
        "bff": { ... },
        "service": { "command": { ... }, "query": { ... } },
        "dataAccess": { ... },
        "dto": { ... },
        "vo": { ... },
        "aggregate": { ... },
        "interModule": { ... },
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
    "responseFlowSummary": "Controller → Aggregator(DTO↔VO, orchestration) → Service → DAO. Response wrapping done by: Controller | Aggregator",
    "patterns": []
  }
}
