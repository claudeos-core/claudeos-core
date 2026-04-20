## Pass 3c — Skills and Guides

This is step 3 of 4 in Pass 3 split mode.

## Inputs

1. `claudeos-core/generated/pass3a-facts.md` — **authoritative fact sheet**
2. `claudeos-core/generated/pass3-context.json` — slim structured summary
3. Already-generated files (for consistency reference, read on-demand ONLY):
   - `CLAUDE.md`
   - `claudeos-core/standard/**/*.md`
   - `.claude/rules/**/*.md`

**DO NOT re-read** `pass2-merged.json` or `project-analysis.json`.
Read generated standards/rules only when you need to cite a specific
section name or file path in a skill or guide.

## Scope of this step

Generate ONLY:

- `claudeos-core/skills/` — orchestrator skill + sub-skills
  - `10.backend-crud/scaffold-crud-feature/` (if backend present)
  - `20.frontend-page/scaffold-page-feature/` (if frontend present)
  - `50.testing/` (if applicable)
  - `00.shared/` (shared skills)
- `claudeos-core/guide/` — all 9 expected guide files:
  - `01.onboarding/*.md`
  - `02.usage/*.md`
  - `03.troubleshooting/*.md`
  - `04.architecture/*.md`

## Idempotent writes

Same rule as Pass 3b: Read the target first, skip if exists with >100 chars.
Skills with sub-skills: check both the orchestrator `SKILL.md` AND each
sub-skill `SKILL.md` file independently.

## Cross-file consistency

Skills generate code templates (scaffold outputs). These templates MUST
use EXACT class/method names from the fact sheet. If a scaffold-crud-feature
generates a controller stub, that stub's response handling MUST match
the wrapper layer recorded in `pass3a-facts.md`.

Guide files reference standards and rules. Use the standards/rules file
paths and section headings that were actually written by Pass 3b —
read those files if needed to cite accurately. Do NOT invent section names.

---

Below is the stack-specific generation guide for skills and guides:

