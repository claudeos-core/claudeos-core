# Safety: What Gets Preserved on Re-init

A common worry: *"I customized my `.claude/rules/`. If I run `npx claudeos-core init` again, will I lose my edits?"*

**Short answer:** It depends on whether you use `--force`.

This page explains exactly what happens when you re-run, what gets touched, and what doesn't.

---

## The two paths through re-init

When you re-run `init` on a project that already has output, one of two things happens:

### Path 1 — Resume (default, no `--force`)

`init` reads existing pass markers (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) in `claudeos-core/generated/`.

For each pass, if the marker exists and is structurally valid, the pass is **skipped**. If all four markers are valid, `init` exits early — it has nothing to do.

**Effect on your edits:** anything you've manually edited is left alone. No passes run, no files are written.

This is the recommended path for most "I'm just re-checking" workflows.

### Path 2 — Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` deletes pass markers and rules, then runs the full 4-pass pipeline from scratch. **Manual edits to rules are lost.** This is intentional — `--force` is the escape hatch for "I want a clean re-generation."

What `--force` deletes:
- All `.json` and `.md` files under `claudeos-core/generated/` (the four pass markers + scanner output)
- The leftover `claudeos-core/generated/.staged-rules/` directory if any prior run crashed mid-move
- Everything under `.claude/rules/`

What `--force` does **not** delete:
- `claudeos-core/memory/` files (your decision log and failure patterns are preserved)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. (these are overwritten by Pass 3, but not deleted up front — anything Pass 3 doesn't regenerate stays)
- Files outside `claudeos-core/` and `.claude/`
- Your CLAUDE.md (Pass 3 overwrites it as part of normal generation)

**Why `.claude/rules/` is wiped under `--force` but other directories aren't:** Pass 3 has a "zero-rules detection" guard that fires when `.claude/rules/` is empty, used to decide whether to skip the per-domain rules stage. If stale rules from a prior run are present, the guard would false-negative and the new rules wouldn't generate.

---

## Why `.claude/rules/` exists at all (the staging mechanism)

This is the most-asked question, so it gets its own section.

Claude Code has a **sensitive-path policy** that blocks subprocess writes to `.claude/`, even when the subprocess runs with `--dangerously-skip-permissions`. This is a deliberate safety boundary in Claude Code itself.

ClaudeOS-Core's Pass 3 and Pass 4 are subprocess invocations of `claude -p`, so they cannot write directly into `.claude/rules/`. The workaround:

1. The pass prompt instructs Claude to write all rule files into `claudeos-core/generated/.staged-rules/` instead.
2. After the pass finishes, the **Node.js orchestrator** (which is *not* subject to Claude Code's permission policy) walks the staging tree and moves each file into `.claude/rules/`, preserving sub-paths.
3. On full success, the staging directory is removed.
4. On partial failure (a file lock or cross-volume rename error), the staging directory is **preserved** so you can inspect what didn't make it across, and the next `init` run retries.

The mover is in `lib/staged-rules.js`. It uses `fs.renameSync` first, falling back to `fs.copyFileSync + fs.unlinkSync` on Windows cross-volume / antivirus file-lock errors.

**What you actually see:** in normal flow, `.staged-rules/` is created and emptied within a single `init` run — you may never notice it. If a run crashes mid-stage, you'll find files there on the next `init`, and `--force` cleans them up.

---

## What's preserved when

| File category | Without `--force` | With `--force` |
|---|---|---|
| Manual edits to `.claude/rules/` | ✅ Preserved (no passes re-run) | ❌ Lost (directory wiped) |
| Manual edits to `claudeos-core/standard/` | ✅ Preserved (no passes re-run) | ❌ Overwritten by Pass 3 if it regenerates the same files |
| Manual edits to `claudeos-core/skills/` | ✅ Preserved | ❌ Overwritten by Pass 3 |
| Manual edits to `claudeos-core/guide/` | ✅ Preserved | ❌ Overwritten by Pass 3 |
| Manual edits to `CLAUDE.md` | ✅ Preserved | ❌ Overwritten by Pass 3 |
| `claudeos-core/memory/` files | ✅ Preserved | ✅ Preserved (`--force` does not delete memory) |
| Files outside `claudeos-core/` and `.claude/` | ✅ Never touched | ✅ Never touched |
| Pass markers (`generated/*.json`) | ✅ Preserved (used for resume) | ❌ Deleted (forces full re-run) |

**The honest summary:** ClaudeOS-Core does not have a diff-and-merge layer. There's no "review changes before applying" prompt. The preservation story is binary: either re-run only what's missing (default) or wipe and regenerate (`--force`).

If you've made significant manual edits and need to integrate new tool-generated content, the recommended workflow is:

1. Commit your edits to git first.
2. Run `npx claudeos-core init --force` on a separate branch.
3. Use `git diff` to see what changed.
4. Manually merge whatever you want from each side.

This is a chunky workflow on purpose. The tool deliberately doesn't try to auto-merge — getting that wrong would silently corrupt rules in subtle ways.

---

## Pre-v2.2.0 upgrade detection

When you run `init` on a project with a CLAUDE.md generated by an older version (pre-v2.2.0, before the 8-section scaffold became enforced), the tool detects this via heading count (`^## ` heading count ≠ 8 — language-independent heuristic) and emits a warning:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

The warning is informational. The tool continues normally — you can ignore it if you want to keep the older format. But on `--force`, the structural upgrade applies and `claude-md-validator` will pass.

**Memory files are preserved across `--force` upgrades.** Only generated files are overwritten.

---

## Pass 4 immutability (v2.3.0+)

A specific subtlety: **Pass 4 does not touch `CLAUDE.md`.** Pass 3's Section 8 already authors all required L4 memory file references. If Pass 4 also wrote to CLAUDE.md, it would re-declare Section 8 content, creating the `[S1]`/`[M-*]`/`[F2-*]` validator errors.

This is enforced both ways:
- The Pass 4 prompt explicitly says "CLAUDE.md MUST NOT BE MODIFIED."
- The `appendClaudeMdL4Memory()` function in `lib/memory-scaffold.js` is a 3-line no-op (returns true unconditionally, makes no writes).
- Regression test `tests/pass4-claude-md-untouched.test.js` enforces this contract.

**What you should know as a user:** if you re-run a pre-v2.3.0 project where the old Pass 4 appended a Section 9 to CLAUDE.md, you'll see `claude-md-validator` errors. Run `npx claudeos-core init --force` to regenerate cleanly.

---

## What the `restore` command does

```bash
npx claudeos-core restore
```

`restore` runs `plan-validator` in `--execute` mode. Historically it copied content from `claudeos-core/plan/*.md` files into the locations they describe.

**v2.1.0 status:** Master plan generation was removed in v2.1.0. `claudeos-core/plan/` is no longer auto-created by `init`. Without `plan/` files, `restore` is a no-op — it logs an informational message and exits cleanly.

The command is kept for users who hand-maintain plan files for ad-hoc backup/restore. If you want a real backup, use git.

---

## Recovery patterns

### "I deleted some files outside ClaudeOS's workflow"

```bash
npx claudeos-core init --force
```

Re-runs Pass 3 / Pass 4 from scratch. The deleted files are regenerated. Your manual edits to other files are lost (because `--force`) — combine with git for safety.

### "I want to remove a specific rule"

Just delete the file. The next `init` (without `--force`) won't re-create it because Pass 3's resume marker will skip the entire pass.

If you want it re-created on the next `init --force`, you don't need to do anything — the regeneration is automatic.

If you want it permanently deleted (never regenerated), you need to keep the project pinned to its current state and not run `--force` again. There's no built-in "do not regenerate this file" mechanism.

### "I want to permanently customize a generated file"

The tool doesn't have HTML-style begin/end markers for custom regions. Two options:

1. **Don't run `--force` on this project** — your edits are preserved indefinitely under default-resume.
2. **Fork the prompt template** — modify `pass-prompts/templates/<stack>/pass3.md` in your own copy of the tool, install your fork, and the regenerated file will reflect your customizations.

For simple project-specific overrides, option 1 is usually enough.

---

## What the validators check (after re-init)

After `init` finishes (whether resumed or `--force`), the validators run automatically:

- `claude-md-validator` — runs separately via `lint`
- `health-checker` — runs the four content/path validators

If something is wrong (missing files, broken cross-references, fabricated paths), you'll see the validator output. See [verification.md](verification.md) for the check list.

The validators don't fix anything — they report. You read the report, then decide whether to re-run `init` or to fix manually.

---

## Trust through testing

The "preserve user edits" path (resume without `--force`) is exercised by integration tests under `tests/init-command.test.js` and `tests/pass3-marker.test.js`.

The CI runs across Linux / macOS / Windows × Node 18 / 20.

If you find a case where ClaudeOS-Core lost your edits in a way that contradicts this doc, that's a bug. [Report it](https://github.com/claudeos-core/claudeos-core/issues) with reproduction steps.

---

## See also

- [architecture.md](architecture.md) — the staging mechanism in context
- [commands.md](commands.md) — `--force` and other flags
- [troubleshooting.md](troubleshooting.md) — recovery from specific errors
