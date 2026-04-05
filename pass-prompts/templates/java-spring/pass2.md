Read all pass1-*.json files from the claudeos-core/generated/ directory and
merge all domain analysis results into a single unified report.

Merge items:

1. Universal Patterns (shared by 100% of all domains)
   - Controller style (annotations, URL patterns, response format)
   - **Response flow**: Which layer wraps the response? (Controller vs Aggregator)
     This MUST be recorded as a single definitive answer based on actual code analysis.
   - Aggregator/Orchestrator patterns (existence, responsibilities, return types)
   - Service transaction strategy (propagation, readOnly)
   - Data access patterns (ORM approach, Repository/Mapper structure)
   - DTO/Entity rules (inheritance, Lombok, naming)
   - Error handling patterns (exception hierarchy, @ControllerAdvice)
   - Interceptor/Filter/AOP patterns

2. Aggregator/Orchestrator Layer Summary (CRITICAL — merge from all domains)
   - Does an Aggregator/Facade/Orchestrator layer exist? (YES/NO per domain, summarize)
   - Aggregator naming convention (e.g., {Domain}Aggregator)
   - Aggregator annotation (@Component vs @Service)
   - **Response wrapping responsibility** (CRITICAL):
     Record the definitive answer: "Controller calls makeResponse" or "Aggregator calls makeResponse".
     If mixed across domains, list which domains use which pattern.
   - Aggregator return type (ResponseEntity vs plain DTO vs VO)
   - DTO ↔ VO conversion approach (MapStruct, manual, etc.)
   - Multi-service orchestration patterns
   - Aggregator dependency rules (injects Service only? DAO allowed?)
   - Aggregator boundary violations found in anti-patterns

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

5. Anti-pattern Summary
   - Consolidate all inconsistencies found across domains
   - Classify by severity (CRITICAL / HIGH / MEDIUM / LOW)

6. Naming Conventions Summary
   - Package structure conventions
   - Class/method naming conventions
   - DTO/Entity naming conventions
   - URL pattern conventions
   - DB table/column naming

7. Common Classes/Utilities List
   - Base class fields (must not be redeclared) with EXACT fully-qualified class names
   - Shared utility classes with EXACT package paths (e.g., `com.company.common.util.DateUtils`)
   - Constants/Enum management approach with EXACT locations

8. Security/Authentication Patterns
   - Authentication method (JWT, Session, OAuth2)
   - Authorization check method (@PreAuthorize, SecurityConfig)
   - CORS configuration
   - Per-environment security settings

9. Database Patterns
   - Table naming conventions
   - Migration strategy (Flyway, Liquibase, manual)
   - Audit column specification
   - PK generation strategy
   - Index/constraint conventions

10. Testing Strategy Summary
   - Test coverage level
   - Test classification system (unit/integration/slice)
   - Mocking strategy
   - Test naming conventions
   - Test data management

11. Logging/Monitoring Strategy
    - Logger standard
    - Log level policy
    - Structured logging approach
    - Request/response logging

12. Performance Patterns
    - Caching strategy
    - Query optimization status
    - Async processing status
    - Connection pool configuration

13. Code Quality Tools
    - Lint/Format tools (Checkstyle, SpotBugs, PMD, Spotless)
    - Code review rules
    - CI integration status

Do not generate code. Merge only.
Save results to claudeos-core/generated/pass2-merged.json.
