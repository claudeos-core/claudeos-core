Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Controller style (annotations, URL patterns, response format)
   - **Response flow**: Which layer wraps the response? (Controller vs Aggregator)
     This MUST be recorded as a single definitive answer based on actual code analysis.
   - CQRS split conventions (command controller vs query controller differences)
   - Aggregator/Orchestrator patterns (existence, responsibilities, return types)
   - Service transaction strategy (propagation, readOnly)
   - Data access patterns (ORM approach, Repository/Mapper structure)
   - DTO/VO/Entity rules (data class conventions, VO immutability, nullable rules, naming)
   - Aggregate patterns (boundary definition, Aggregate Root identification, repository-per-aggregate)
   - Error handling patterns (exception hierarchy, @ControllerAdvice)
   - Kotlin idiom usage (extension functions, scope functions, null safety)

2. Aggregator/Orchestrator Layer Summary (CRITICAL — merge from all domains)
   NOTE: Aggregator (orchestration layer) is DIFFERENT from DDD Aggregate Root (domain modeling).
   - Does an Aggregator/Facade/Orchestrator layer exist? (YES/NO per domain)
   - Aggregator naming convention (e.g., {Domain}Aggregator)
   - **Response wrapping responsibility** (CRITICAL):
     Record the definitive answer: "Controller calls makeResponse" or "Aggregator calls makeResponse".
   - Aggregator return type (ResponseEntity vs plain DTO vs VO)
   - DTO ↔ VO conversion approach (MapStruct, extension functions, manual)
   - Multi-service orchestration patterns
   - Aggregator dependency rules (injects Service only? DAO allowed?)

3. Majority Patterns (shared by 50%+ of domains)
   - Specify which domains share them

4. Domain-Specific Patterns (unique to a single domain)
   - File upload: which domain
   - Excel: which domain
   - Bulk processing: which domain
   - State transitions: which domain
   - Scheduling: which domain
   - External integrations: which domain
   - Messaging: which domain
   - Coroutines/async: which domain

5. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)
   - CQRS boundary violations (e.g., query module writing data)
   - Module boundary violations (e.g., direct DB access from BFF)
   - Aggregate boundary violations (cross-aggregate direct references, oversized aggregates)
   - VO misuse (mutable VOs, VOs with identity, DTO used where VO should be)

6. Naming Conventions Summary
   - Package structure conventions (per module type)
   - Class/method naming conventions (Kotlin style)
   - DTO/VO naming conventions (Request/Response/Command/Query, VO naming rules)
   - URL pattern conventions
   - DB table/column naming
   - Module naming conventions (what suffix: -server, -lib, -adapter)

7. Common Classes/Utilities List
   - Shared library (shared-lib) key classes and utilities with EXACT package paths (e.g., `com.company.shared.util.DateUtils`)
   - Integration library (integration-lib) contracts and adapters with EXACT package paths
   - Base classes (must not be redeclared) with EXACT fully-qualified class names
   - Shared constants/Enum management with EXACT locations
   - Common extension functions with EXACT file locations

8. BFF Patterns Summary
   - Feign Client declaration conventions
   - Response composition patterns (aggregation strategy, Aggregator service usage)
   - Aggregator vs BFF distinction (internal service aggregation vs client-facing composition)
   - Error propagation rules (backend → BFF → client)
   - BFF-specific middleware/filters
   - Mobile vs Web BFF differences (if applicable)

9. Security/Authentication Patterns
   - Authentication method (JWT, Session, OAuth2)
   - Authorization check method (@PreAuthorize, SecurityConfig, IAM server role)
   - CORS configuration
   - Per-environment security settings
   - Inter-module auth (Feign interceptors, internal tokens)

10. Database Patterns
   - Table naming conventions
   - Migration strategy (Flyway, Liquibase, manual)
   - Audit column specification
   - PK generation strategy
   - Index/constraint conventions
   - Read/Write DB separation configuration

11. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/slice)
   - Mocking strategy (MockK patterns)
   - Test naming conventions (backtick style, BDD)
   - Test data management
   - Per-module test strategy (command tests vs query tests vs BFF tests)

12. Logging/Monitoring Strategy
   - Logger standard (kotlin-logging, SLF4J)
   - Log level policy
   - Structured logging approach
   - Request/response logging
   - Distributed tracing (if applicable)

13. Performance Patterns
   - Caching strategy (per module)
   - Query optimization status
   - Coroutine/async usage status
   - Connection pool configuration
   - Feign client timeout/retry configuration

14. Build & Module Patterns
   - Gradle Kotlin DSL conventions
   - Dependency management (version catalogs, BOM)
   - Module dependency rules (who depends on whom)
   - Shared dependency extraction patterns

15. Code Quality Tools (infer from configuration/build analysis in Pass 1)
   - Lint/Format tools (ktlint, detekt, Spotless)
   - Code review rules
   - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
