## CRITICAL — Write path redirect for `.claude/rules/` (tool-access workaround)

Claude Code's sensitive-path policy blocks direct writes under `.claude/` from this subprocess, even with `--dangerously-skip-permissions`. To work around this safely, all rule files must be written to a staging directory and the Node.js orchestrator will move them after you finish.

**Rule (overrides every instruction below):**

> Whenever the instructions below tell you to WRITE a file whose path starts with `.claude/rules/`, write it to `claudeos-core/generated/.staged-rules/` instead, **preserving the subpath exactly**.

Examples (write-target redirect, **subpath preserved**):

| Instruction says to write | You MUST write to |
|---|---|
| `.claude/rules/00.core/00.standard-reference.md` | `claudeos-core/generated/.staged-rules/00.core/00.standard-reference.md` |
| `.claude/rules/10.backend/01.controller-rules.md` | `claudeos-core/generated/.staged-rules/10.backend/01.controller-rules.md` |
| `.claude/rules/50.sync/01.doc-sync.md` | `claudeos-core/generated/.staged-rules/50.sync/01.doc-sync.md` |
| `.claude/rules/60.memory/01.decision-log.md` | `claudeos-core/generated/.staged-rules/60.memory/01.decision-log.md` |

**Important clarifications:**

1. **Prose references stay as-is.** When the instructions or the file content you generate describe `.claude/rules/` as a concept ("Rules (.claude/rules/) and Standards...", "Each rule file in .claude/rules/ links to..."), keep that text literal. Only the **write-target file paths** are redirected. Generated file bodies will eventually live under `.claude/rules/`, so in-body references should point to the final location, not the staging location.
2. **Frontmatter `paths:` values stay as-is.** These are glob patterns scoped to project files (`"**/*"`, `"**/*.yml"`, etc.), not self-references.
3. **Do NOT attempt to write to `.claude/rules/` directly** — those writes will be refused by the tool.
4. **Create missing staging subdirectories as needed.** `claudeos-core/generated/` exists, but subpaths under `.staged-rules/` do not yet.
5. **This redirect applies to THIS Pass only.** Files written anywhere else (e.g. `claudeos-core/standard/`, `CLAUDE.md`, `claudeos-core/memory/`) are unaffected — write those to their intended paths as stated in the instructions below.

---
