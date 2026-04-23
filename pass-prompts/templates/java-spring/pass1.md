Read claudeos-core/generated/project-analysis.json and
perform a deep analysis of the following domains only: {{DOMAIN_GROUP}}

## MANDATORY: Configuration file verification (read before analysis)

Before analyzing domain source code, read the following configuration
files if they exist in the project root. The stack metadata in
`project-analysis.json` is produced by a regex-based static analyzer
and may be incomplete for modern Gradle/Maven projects. Reading these
files directly gives you the ground truth for Java version, server
port, active profile, datasource configuration, and logging setup.

Required reads (if the file exists):

1. **`build.gradle` or `build.gradle.kts`** (or **`pom.xml`** for Maven).
   Specifically check:
   - Java version: look inside `java { ... }`, `java { toolchain { ... } }`,
     `sourceCompatibility`, `targetCompatibility`, or `<java.version>` /
     `<maven.compiler.source>` in pom.xml. If the value is a variable
     reference (e.g., `sourceCompatibility = "${javaVersion}"`), resolve
     the variable inside `ext { ... }` or `<properties>`. Record the
     ACTUAL Java version — do NOT infer "Java 17+" from the Spring
     Boot version.
   - Spring Boot version: verify it matches `project-analysis.json`'s
     frameworkVersion field; if they disagree, trust the build file.
   - Dependencies that indicate specific patterns (MyBatis/iBatis/JPA,
     multiple DB drivers, Jasypt, JWT library, Logback extras).

2. **`application.yml` / `application.yaml` / `application.properties`
   and their profile variants** (`application-{profile}.{yml,yaml,properties}`).
   Specifically check:
   - Server port: look for `server.port`. Spring Boot accepts property
     placeholders with defaults like `port: ${G_PORT:8090}` — extract the
     default value (the post-colon number) as the ACTUAL port. Do NOT
     assume "port 8080" from the Spring Boot framework default.
   - Active profile(s): `spring.profiles.active` and `spring.profiles.group`.
   - Datasource: every `spring.datasource.*` block (multi-dialect projects
     declare more than one; a `group` profile block like
     `"local": "local,postgres"` reveals which DB is active per profile).
   - Logging configuration file reference: `logging.config` points to
     the real log setup (e.g., `classpath:logback-app.xml`). Read that
     file too to understand appenders, levels, and JDBC logging
     adapters like `log4jdbc`.

3. **Any referenced logging configuration files**: `logback*.xml`,
   `logback*.groovy`, `log4j*.xml`, `log4j*.properties`,
   `log4jdbc*.properties`. These reveal the actual logging framework
   in use (Logback is the Spring Boot default but legacy projects may
   use Log4j2 or mix with JDBC adapters).

When `project-analysis.json` and the configuration files disagree,
record the configuration-file value as the truth and note the
discrepancy in your analysis output. This is the path to eliminate
"Java 17+" / "port 8080" hallucinations observed in pre-v2.3.2 runs.

## Domain analysis

For each domain, select one representative file per layer, read its code, and analyze it.
Prioritize files with the richest patterns.

Analysis items (per domain):

1. Controller Patterns
   - Class annotations (@Controller vs @RestController, inheritance)
   - Method mappings (@GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
   - URL patterns (RESTful conventions, naming conventions, versioning)
   - Parameter binding (@RequestBody, @PathVariable, @RequestParam, @ModelAttribute, @RequestHeader)
   - Response format (ResponseEntity, custom response wrappers, direct return)
   - If a custom response wrapper class exists, record its EXACT class name, EXACT method signatures (e.g., `success()`, `error()`), and EXACT import path. Do NOT guess or invent method names — read the actual source.
   - **Response wrapping layer (CRITICAL)**: Which layer ACTUALLY calls the response wrapper?
     Read the Controller source code and determine: does Controller call makeResponse/response wrapper directly,
     or does it receive an already-wrapped ResponseEntity from Aggregator/Service?
     Record EXACTLY ONE of: "Controller wraps response" or "Aggregator wraps response" or "Service wraps response".
     This is critical for cross-file consistency in Pass 3.
   - Controller dependency injection targets: Does Controller inject Aggregator? Service? Both?
     Record the EXACT injected class types (e.g., "injects {Domain}Aggregator + ExceptionHelper only").
   - Error handling (try-catch patterns, @ExceptionHandler, @ControllerAdvice)
   - Authentication/authorization (@AuthenticationPrincipal, @PreAuthorize, SecurityContext)
   - API documentation (Swagger/SpringDoc annotations)
   - Pagination (Pageable, custom paging parameters)

2. Aggregator/Orchestrator Patterns (CRITICAL — analyze even if the layer has a different name)
   Many Java projects have a dedicated orchestration layer between Controller and Service.
   It may be called Aggregator, Facade, Orchestrator, UseCase, or similar.
   If this layer exists, it MUST be analyzed thoroughly. If it does not exist, record "No Aggregator layer — Controller calls Service directly".

   - **Existence and naming**: Does a dedicated orchestration class exist between Controller and Service?
     Record the EXACT class name pattern (e.g., `{Domain}Aggregator`, `{Domain}Facade`).
   - **Class annotation**: @Component, @Service, or other?
   - **Responsibility scope** (record each as YES/NO with evidence):
     * DTO → VO conversion (inbound: request DTO to condition/param VO)
     * VO → DTO conversion (outbound: result VO to response DTO)
     * Conversion tool (MapStruct, ModelMapper, manual)
     * Response wrapping: Does Aggregator call makeResponse/response wrapper and return ResponseEntity?
       Or does it return plain DTO/VO and let Controller wrap?
       Record the EXACT return type of Aggregator methods (e.g., `ResponseEntity<ApiResponse<T>>` vs `OrderDetailResponseDTO`).
     * Multi-service orchestration (calling 2+ services and composing results)
     * Exception handling within Aggregator (try-catch, or let it propagate to Controller?)
   - **Dependency rules**: What does Aggregator inject? (Service only? DAO allowed? Other Aggregators?)
   - **Return type pattern**: For EACH Aggregator method you read, record:
     the method signature, return type, and whether it calls any response wrapper utility.

3. Service Patterns
   - Class annotations (@Service, @Transactional)
   - Transaction strategy (class-level vs method-level, readOnly separation, propagation)
   - Dependency injection (constructor injection, @RequiredArgsConstructor, @Autowired)
   - Business exception handling (custom Exception hierarchy, exception message management)
   - Validation logic placement (within Service vs separate Validator)
   - Event handling (ApplicationEventPublisher, @EventListener)

4. Data Access Patterns
   - ORM approach (MyBatis XML/Annotation, JPA/Hibernate, QueryDSL, JDBC Template)
   - MyBatis XML mapper location: check ACTUAL path under src/main/resources/ (e.g., mapper/{domain}/, mybatis/mappers/, mybatis/mappers/{schema}/ — DO NOT assume default path)
   - Repository/Mapper interface structure (inheritance, custom methods)
   - Read/write separation
   - Pagination approach (Pageable, PageHelper, RowBounds, custom)
   - Audit columns (createdAt/updatedAt/createdBy/updatedBy, @CreatedDate, @LastModifiedDate)
   - NULL handling strategy
   - PK generation strategy (AUTO_INCREMENT, SEQUENCE, UUID, custom ID generation)
   - N+1 problem handling (fetch join, @EntityGraph, BatchSize)
   - Dynamic queries (Specification, QueryDSL, MyBatis <if>/<choose>)

5. DTO/VO/Entity Patterns
   - Class structure (inheritance, Base class, Record usage)
   - Lombok usage scope (@Getter, @Setter, @Builder, @Data, @Value)
   - Request/Response DTO separation rules
   - DTO naming conventions
   - **DTO vs VO distinction**: DTO (data transfer, mutable) vs VO (domain concept, immutable, equality by value)
   - VO usage patterns (Java Record as VO, @Value with Lombok, custom equals/hashCode)
   - VO location (domain layer vs shared module)
   - Field type conventions (Boolean handling, date types, Enum management)
   - Validation annotations (@NotNull, @NotBlank, @Size, @Pattern, custom)
   - Conversion approach (MapStruct, ModelMapper, manual conversion)
   - Import paths: record EXACT package paths for shared/utility classes
   - Utility class locations: record EXACT package where shared utilities live

6. Interceptor/Filter/AOP Patterns
   - HandlerInterceptor usage
   - Filter chain (SecurityFilterChain, custom Filters)
   - AOP usage (@Aspect, logging, performance measurement, auditing)
   - Middleware registration order

7. Configuration/Environment Patterns
   - Profile separation (local/dev/stg/prod)
   - Configuration loading (@ConfigurationProperties, @Value, Environment)
   - Multi-module structure
   - External configuration (application.yml structure, environment variables)

8. Logging Patterns
   - Logger usage (SLF4J, Logback, Log4j2)
   - Log level policy
   - Structured logging (MDC, JSON format)
   - Request/response logging approach

9. Testing Patterns
   - Test framework (JUnit 5, Mockito, AssertJ)
   - Test classification (unit/integration/slice)
   - @SpringBootTest vs @WebMvcTest vs @DataJpaTest
   - Mocking strategy (@MockBean, @Mock, @InjectMocks)
   - Test data management (TestFixture, Builder pattern)
   - Test naming conventions

10. Domain-Specific Patterns
   - File upload/download (MultipartFile, S3)
   - Excel import/export (Apache POI, EasyExcel)
   - Bulk processing (Batch CUD, Spring Batch)
   - State transition logic (state machine, Enum-based)
   - Scheduling (@Scheduled, Quartz)
   - External API integration (RestTemplate, WebClient, FeignClient, RestClient)
   - Caching (@Cacheable, Redis, Caffeine)
   - Messaging (Kafka, RabbitMQ)
   - Internationalization (MessageSource, LocaleResolver)
   - API versioning strategy

11. Anti-patterns / Inconsistencies
    - Code with differing styles within the domain
    - Patterns inconsistent with other domains
    - Legacy-looking patterns
    - Performance issues (N+1, unnecessary queries, memory waste)
    - Security issues (SQL Injection potential, missing authorization)
    - Aggregator boundary violations (Aggregator accessing DAO directly, Controller bypassing Aggregator)

Do not create or modify source files. Analysis only.
Save results to claudeos-core/generated/pass1-{{PASS_NUM}}.json in the following format:

{
  "analyzedAt": "ISO timestamp",
  "passNum": {{PASS_NUM}},
  "domains": ["user", "order", "product", "system"],
  "analysisPerDomain": {
    "user": {
      "representativeFiles": {
        "controller": "UserController.java",
        "aggregator": "UserAggregator.java (or null if no Aggregator layer)",
        "service": "UserService.java",
        "repository": "UserRepository.java or UserMapper.java",
        "entity": "User.java",
        "dto": "UserRequestDto.java"
      },
      "patterns": {
        "controller": {
          "responseWrappingLayer": "Controller wraps response | Aggregator wraps response",
          "injectedDependencies": ["UserAggregator", "ExceptionHelper"],
          "...": "..."
        },
        "aggregator": {
          "exists": true,
          "className": "UserAggregator",
          "annotation": "@Component | @Service",
          "returnType": "ResponseEntity<...> | plain DTO",
          "callsMakeResponse": true,
          "responsibilities": ["DTO↔VO conversion", "multi-service orchestration", "response wrapping"],
          "injectedDependencies": ["UserService", "MemberService"]
        },
        "service": { ... },
        "dataAccess": { ... },
        "dto": { ... },
        "interceptorAop": { ... },
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
