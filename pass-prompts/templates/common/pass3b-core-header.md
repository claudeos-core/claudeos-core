## Pass 3b — CLAUDE.md, standards, and rules (core generation)

This is step 2 of 4 in Pass 3 split mode. Inputs: the fact sheet you wrote
in Pass 3a, plus the stack-specific template body below.

## Inputs

1. `claudeos-core/generated/pass3a-facts.md` — the fact sheet from Pass 3a
   **(primary source — reference this for all consistency checks)**
2. `claudeos-core/generated/pass3-context.json` — slim structured summary
3. **DO NOT re-read** `pass2-merged.json` or `project-analysis.json`.
   All facts you need are in `pass3a-facts.md`. Re-reading the full analysis
   files during this step is the primary cause of context overflow.

## Scope of this step

Generate ONLY the following output categories:

- `CLAUDE.md` (project root)
- `claudeos-core/standard/` — all standard files per active domains
- `.claude/rules/` — all rule files (via staging directory, see staging-override)

**Do NOT generate in this step**:
- `claudeos-core/skills/` (Pass 3c)
- `claudeos-core/guide/` (Pass 3c)
- `claudeos-core/plan/` (Pass 3d)
- `claudeos-core/database/` (Pass 3d)
- `claudeos-core/mcp-guide/` (Pass 3d)

## Idempotent writes (resume-safe)

Before writing each file:

1. Use the Read tool to check if the target file exists.
2. If it EXISTS with more than 100 characters of real content:
   - Print `[SKIP] <path>`
   - Proceed to next target WITHOUT regenerating
3. If MISSING or <=100 characters, generate fresh using the fact sheet.

For staged rules, check BOTH:
- `claudeos-core/generated/.staged-rules/<subpath>` (staging)
- `.claude/rules/<subpath>` (final — moved by orchestrator after this step)

If either has content, skip.

## Cross-file consistency

Every claim about response flow, method names, class names, or file paths
MUST match the fact sheet exactly. If `pass3a-facts.md` says
`Wrapper layer: Controller`, then `architecture.md`,
`controller-patterns.md`, `response-exception.md`, and
`controller-rules.md` MUST all show Controller wrapping the response.

---

Below is the stack-specific generation guide. Apply these instructions within
the scope defined above.

