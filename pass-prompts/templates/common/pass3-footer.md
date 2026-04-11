
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

CRITICAL — Skill Orchestrator Completeness:
The orchestrator file (e.g., 01.scaffold-page-feature.md, 01.scaffold-crud-feature.md)
MUST list ALL sub-skill files in its execution order table with no gaps.
Every sub-skill file generated in the scaffold directory MUST have a corresponding row.
Do NOT skip any number in the sequence.

After completion, run the following commands in order:
1. npx claudeos-core health
