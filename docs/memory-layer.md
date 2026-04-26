# Memory Layer (L4)

After v2.0, ClaudeOS-Core writes a persistent memory layer alongside the regular documentation. This is for long-running projects where you want Claude Code to:

1. Remember architectural decisions and their rationale.
2. Learn from recurring failures.
3. Auto-promote frequent failure patterns into permanent rules.

If you only use ClaudeOS-Core for one-shot generation, you can ignore this layer entirely. The memory files are written but won't grow if you don't update them.

---

## What gets written

After Pass 4 completes, the memory layer consists of:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

The `60.memory/` rule files have `paths:` globs that match the project files where the memory should be loaded. When Claude Code is editing a file matching a glob, the corresponding memory file is loaded into context.

This is **on-demand loading** — memory isn't always in context, only when relevant. That keeps Claude's working context lean.

---

## The four memory files

### `decision-log.md` — append-only architectural decisions

When you make a non-obvious technical decision, you (or Claude, prompted by you) append a block:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

This file **grows over time**. It's not auto-deleted. Old decisions remain valuable context.

The auto-loaded rule (`60.memory/01.decision-log.md`) tells Claude Code to consult this file before answering questions like "Why did we structure X this way?"

### `failure-patterns.md` — recurring mistakes

When Claude Code makes a recurring mistake (e.g., "Claude keeps generating JPA when our project uses MyBatis"), an entry goes here:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

The `frequency` / `importance` / `last seen` fields drive automated decisions:

- **Compaction:** entries with `lastSeen > 60 days` AND `importance < 3` get dropped.
- **Rule promotion:** entries with `frequency >= 3` are surfaced as candidates for new `.claude/rules/` entries via `memory propose-rules`. (Importance is not a filter — it just affects the confidence score of each proposal.)

The metadata fields are parsed by the `memory` subcommands using anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) so the field lines must look roughly like the example above. Indented or italicized variations are tolerated.

### `compaction.md` — compaction log

This file tracks compaction history:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Only the `## Last Compaction` section is overwritten on each `memory compact` run. Anything you add elsewhere in the file is preserved.

### `auto-rule-update.md` — proposed-rule queue

When you run `memory propose-rules`, Claude reads `failure-patterns.md` and appends proposed rule content here:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

You review the proposals, copy the ones you want into actual rule files. **The propose-rules command does not auto-apply** — that's intentional, since LLM-drafted rules need human review.

---

## Compaction algorithm

The memory grows but doesn't bloat. Four-stage compaction runs when you call:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body collapsed to a 1-line "fix" + meta |
| 2 | Duplicate headings | Merged (frequencies summed, body = most recent) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Dropped |
| 4 | File > 400 lines | Trim oldest non-preserved entries |

**"Preserved" entries** survive all stages. An entry is preserved if any of:

- `importance >= 7`
- `lastSeen < 30 days`
- The body contains a concrete (non-glob) active rule path (e.g., `.claude/rules/10.backend/orm-rules.md`)

The "active rule path" check is interesting: if a memory entry references a real, currently-existing rule file, the entry is anchored to that rule's lifecycle. As long as the rule exists, the memory stays.

The compaction algorithm is a deliberate mimicry of human forgetting curves — frequent, recent, important things stay; rare, old, unimportant things fade.

For the compaction code, see `bin/commands/memory.js` (`compactFile()` function).

---

## Importance scoring

Run:

```bash
npx claudeos-core memory score
```

Recomputes importance for entries in `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Where `recency = max(0, 1 - daysSince(lastSeen) / 90)` (linear decay over 90 days).

Effects:
- An entry with `frequency = 3` and `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- An entry with `frequency = 3` and `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`

**The score command strips ALL existing importance lines before insertion.** This prevents duplicate-line regressions when re-running score multiple times.

---

## Rule promotion: `propose-rules`

Run:

```bash
npx claudeos-core memory propose-rules
```

This:

1. Reads `failure-patterns.md`.
2. Filters entries with `frequency >= 3`.
3. Asks Claude to draft proposed rule content for each candidate.
4. Computes confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   where `anchored` means the entry references a real file path on disk.
5. Writes the proposals into `auto-rule-update.md` for human review.

**The evidence value is capped at 6 when importance is missing** — without an importance score, frequency alone shouldn't be enough to push the sigmoid toward high confidence. (This caps the input to the sigmoid, not the number of proposals.)

---

## Typical workflow

For a long-running project, the rhythm looks like:

1. **Run `init` once** to set up the memory files alongside everything else.

2. **Use Claude Code normally for a few weeks.** Notice recurring mistakes (e.g., Claude keeps using the wrong response wrapper). Append entries to `failure-patterns.md` — either manually or by asking Claude to do it (the rule in `60.memory/02.failure-patterns.md` instructs Claude when to append).

3. **Periodically run `memory score`** to refresh importance values. This is fast and idempotent.

4. **When you have ~5+ high-score patterns**, run `memory propose-rules` to get drafted rules.

5. **Review the proposals** in `auto-rule-update.md`. For each one you want, copy the content into a permanent rule file under `.claude/rules/`.

6. **Run `memory compact` periodically** (once a month, or in scheduled CI) to keep `failure-patterns.md` bounded.

This rhythm is what the four files are designed for. Skipping any step is fine — the memory layer is opt-in, and unused files don't get in the way.

---

## Session continuity

CLAUDE.md is auto-loaded by Claude Code each session. The memory files are **not auto-loaded by default** — they're loaded on demand by the `60.memory/` rules when their `paths:` glob matches the file Claude is currently editing.

This means: in a fresh Claude Code session, memory isn't visible until you start working on a relevant file.

After Claude Code's auto-compaction runs (around 85% of context), Claude loses awareness of memory files even if they were loaded earlier. The CLAUDE.md Section 8 includes a **Session Resume Protocol** prose block that reminds Claude to:

- Re-scan `failure-patterns.md` for relevant entries.
- Re-read the most recent entries of `decision-log.md`.
- Re-match `60.memory/` rules against currently open files.

This is **prose, not enforced** — but the prose is structured so Claude tends to follow it. The Session Resume Protocol is part of the v2.3.2+ canonical scaffold and is preserved across all 10 output languages.

---

## When to skip the memory layer

The memory layer adds value for:

- **Long-lived projects** (months or longer).
- **Teams** — `decision-log.md` becomes a shared institutional memory and onboarding tool.
- **Projects where Claude Code is invoked ≥10×/day** — failure patterns accumulate fast enough to be useful.

It's overkill for:

- One-off scripts you'll discard in a week.
- Spike or prototype projects.
- Tutorials or demos.

The memory files are still written by Pass 4, but if you don't update them, they don't grow. There's no maintenance burden if you're not using it.

If you actively don't want the memory rules auto-loading anything (for context cost reasons), you can:

- Delete the `60.memory/` rules — Pass 4 won't recreate them on resume, only on `--force`.
- Or narrow the `paths:` globs in each rule so they match nothing.

---

## See also

- [architecture.md](architecture.md) — Pass 4 in the pipeline context
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` reference
- [verification.md](verification.md) — content-validator's `[9/9]` memory checks
