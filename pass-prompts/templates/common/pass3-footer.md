
CRITICAL — No Hallucination Guard:
You may ONLY reference technologies that are explicitly present in the two files you read:
project-analysis.json (stack detection results) and pass2-merged.json (code analysis results).
If a library, framework, tool, or pattern does NOT appear in either of these files,
you MUST NOT mention it, generate code examples for it, or assume it exists — not in
standards, rules, skills, guides, database docs, or CLAUDE.md.
Do NOT infer or guess technologies from other detected technologies.
Examples of violations:
- Writing "React Query caching" when pass2-merged.json has no TanStack Query / React Query entry
- Adding "Zustand store pattern" when pass2-merged.json has no Zustand usage
- Generating "Prisma schema" examples when project-analysis.json ORM is not Prisma
- Assuming React Query exists because Orval was detected (inference is NOT detection)
When in doubt, omit. Missing content is fixable; hallucinated content erodes trust.

CRITICAL — No Domain-Specific Hardcoding:
All generated documentation in claudeos-core/standard/, .claude/rules/, and claudeos-core/skills/
MUST use generic, reusable patterns — NEVER hardcode project-specific domain names, table names,
URL paths, or class names as examples.
Use placeholder patterns instead:
- Table names: `{prefix}_{table_name}` not a specific table like `user_account`
- URL paths: `{domain}/{resource}` not a specific path like `/notice/getList`
- DTO names: `{Action}{Entity}ReqDto` not a specific class like `GetNoticeListReqDto`
- Domain keys: `{DOMAIN_KEY}` not a specific code like `NOTICE`
Allowed exceptions:
- Project-wide common fields that appear across ALL domains (e.g., audit columns, base classes)
- Framework/infrastructure names (e.g., `BaseEntity`, `SecurityConfig`)
- Listing existing domain names only when explaining how to ADD NEW ones (configuration examples)
Reason: These documents are project-wide COMMON rules. If specific domain names appear,
developers working on other domains may ignore the rules as irrelevant to them.

CRITICAL — Skill Orchestrator Completeness:
The orchestrator file (e.g., 01.scaffold-page-feature.md, 01.scaffold-crud-feature.md)
MUST list ALL sub-skill files in its execution order table with no gaps.
Every sub-skill file generated in the scaffold directory MUST have a corresponding row.
Do NOT skip any number in the sequence.

After completion, run the following commands in order:
1. npx claudeos-core health
