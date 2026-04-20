## Pass 3a — FACT EXTRACTION (no file generation yet)

This is step 1 of 4 in Pass 3 split mode. Your ONLY task here is to read the
analysis JSON files and write a single `pass3a-facts.md` summary document.
**Do NOT generate CLAUDE.md, standard/, rules/, skills/, guide/, or plan/ in
this step.** Those come in later steps.

## Inputs (read each at most ONCE)

1. `claudeos-core/generated/pass3-context.json` — slim summary (start here)
2. `claudeos-core/generated/project-analysis.json` — structured stack/domain data
3. `claudeos-core/generated/pass2-merged.json` — full deep-analysis report

## Output

Write exactly one file: `claudeos-core/generated/pass3a-facts.md`

This file is the authoritative fact sheet that Pass 3b, 3c, and 3d will
reference. It must be complete enough that the later steps NEVER need to
re-open pass2-merged.json.

Required structure:

```markdown
# Pass 3 Fact Sheet

Generated at: <ISO timestamp>

## Stack

- Language: ...
- Language version: ...
- Framework: ...
- Framework version: ...
- Build tool: ...
- Package manager: ...
- Database: ...
- ORM: ...
- Frontend: ...
- Default port: ...

## Architecture

- CQRS: yes/no
- BFF: yes/no
- DDD (Aggregate Root): yes/no
- Multi-module: yes/no (if yes, list module names)
- Monorepo tool: ...
- Root package: ...

## Response Flow (CRITICAL — used for cross-file consistency)

- Wrapper layer: <Controller | Aggregator | Service>
- Wrapper method: <exact method name, e.g. `makeResponse`>
- Response util class: <FQN, e.g. `com.company.util.ApiResponseUtil`>
- Response util methods (exact names): `success`, `fail`, ...
- ResponseEntity usage pattern: ...

## Aggregator/Orchestrator Layer

- Exists: yes/no
- Naming convention: <e.g. `{Domain}Aggregator`>
- Return type: <ResponseEntity | DTO | VO>
- DTO ↔ VO conversion: <MapStruct | extension functions | manual>
- Dependency rule: <injects Service only | DAO allowed | ...>

## Data Access

- ORM approach: ...
- Repository/Mapper structure: ...
- MyBatis mapper XML path (verbatim, if applicable): ...
- Transaction strategy: ...

## Domains

List every detected domain with its key controller/service/DTO method names.
For each domain, list AT MOST 10 method signatures (exact names, not paraphrased).

### <domain-1>
- Controllers: `MethodA()`, `MethodB()`, ...
- Services: `doX()`, `doY()`, ...
- Key DTOs: `XRequest`, `XResponse`, ...

### <domain-2>
...

## Shared / Base Classes (must not be re-declared)

List FQNs of base classes and key utilities that generated code should
IMPORT, not redefine.

- `com.company.shared.base.BaseEntity`
- `com.company.shared.util.DateUtils`
- ...

## Naming Conventions

- Class naming: ...
- Package structure: ...
- DTO naming: ...
- URL pattern: ...
- DB table/column: ...
- Module naming: ...

## Authentication & Security

- Authentication method: <JWT | Session | OAuth2 | ...>
- Authorization pattern: <@PreAuthorize | SecurityConfig | ...>
- CORS configuration: ...

## Testing

- Test frameworks: ...
- Test naming convention: ...
- Mocking library: ...

## Build & Tooling

- Gradle/Maven DSL: ...
- Version catalog usage: ...
- Lint/format tools: ...

## Anti-patterns Detected (CRITICAL findings only)

- ...
- ...
```

## Rules for Pass 3a

1. **Read each input file AT MOST ONCE.** After reading, all fact extraction
   must be from your in-context memory of the file.
2. **Be terse.** This document will be loaded into every subsequent Pass 3
   step's context. Keep it under 10 KB. Use bullet lists, not prose.
3. **Exact values only.** Every class name, method name, package path, and
   file path must be verbatim from the analysis data. If a value is not
   captured in the analysis, write `(not in analysis)` — do NOT guess.
4. **Do NOT write any other files.** CLAUDE.md, standard/, rules/, etc.
   come in later Pass 3 steps. Writing them here is a bug.
5. **Do NOT read source code.** All information comes from the three JSON
   inputs. The source has already been analyzed in Pass 1 and Pass 2.

Once `pass3a-facts.md` is written, Pass 3a is complete.
