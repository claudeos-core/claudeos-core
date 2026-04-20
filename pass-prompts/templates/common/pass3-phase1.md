## PHASE 1 — Read Once, Extract Facts (DO THIS FIRST, EXACTLY ONCE)

Before generating ANY file, read the following inputs EXACTLY ONCE:
1. `claudeos-core/generated/project-analysis.json` — structured stack & domain data
2. `claudeos-core/generated/pass2-merged.json` — deep analysis merged report
3. `claudeos-core/generated/pass3-context.json` (if it exists) — pre-computed slim summary; prefer this when available

Then extract the following facts into your working memory. You will reference
this table for EVERY subsequent file generation. Fill in concrete values
(not placeholders) wherever pass2-merged.json provides them; use `(not in analysis — see source)` otherwise.

| Fact | Value |
|---|---|
| Language + Version | ? |
| Framework + Version | ? |
| Build tool | ? |
| Package manager | ? |
| Database / ORM | ? |
| Frontend (if any) | ? |
| Architecture flags (CQRS / BFF / DDD / multi-module) | ? |
| Module list (if multi-module) | ? |
| **Response wrapper LAYER** (Controller / Aggregator / Service) | ? |
| **Response wrapper METHOD** (exact name, e.g. `makeResponse`, `ResponseEntity.ok`) | ? |
| **Response util class** (exact FQN, e.g. `com.company.util.ApiResponseUtil`) | ? |
| Exact method names on response util (e.g. `success`, `ok`, `fail` — verbatim) | ? |
| MyBatis mapper XML path (verbatim, if MyBatis detected) | ? |
| Aggregator/Orchestrator layer exists? | ? |
| Aggregator naming convention (e.g. `{Domain}Aggregator`) | ? |
| Detected domains (flat list) | ? |
| Per-domain key API methods (terse — 3-5 per domain max) | ? |
| Base/shared classes (FQN, must not be re-declared) | ? |
| Shared util package root (e.g. `com.company.shared.util`) | ? |
| Authentication method (JWT / Session / OAuth2 / etc.) | ? |

## PHASE 2 — Generate Files (using the fact table above)

Proceed to generate files based on the instructions below.

### Rule A — Reference, don't re-read

Once the fact table is filled in PHASE 1, **DO NOT re-read `pass2-merged.json`
or `pass3-context.json`**. All cross-file consistency checks must use the
fact table as the authoritative source.

If you find yourself about to `Read pass2-merged.json` again during Phase 2:
STOP. Reference the fact table. If a detail is missing from the fact table,
add it to the table ONCE (by reading the relevant JSON file ONCE), then
reference the table from then on.

**Why this matters**: pass2-merged.json on large multi-module projects can be
50-500 KB. Re-reading it 10-20 times while generating 30+ files is the #1
cause of `Prompt is too long` failures in Pass 3. The fact table above is
your compact in-context cache.

### Rule B — Idempotent file writing (resume-safe)

Before writing ANY target file, check whether it already exists:

1. Use the Read tool on the target path.
2. If the file EXISTS and has more than 100 characters of real content:
   - Print `[SKIP] <path> — already generated`
   - Proceed to the next target WITHOUT regenerating
   - DO NOT re-read analysis JSON files for a skipped target
3. If the file is MISSING or has 100 characters or fewer, generate it fresh.

For staged rules (`.claude/rules/*` → `claudeos-core/generated/.staged-rules/*`):
- Check BOTH the staging path (`claudeos-core/generated/.staged-rules/<subpath>`)
  AND the final path (`.claude/rules/<subpath>`).
- If EITHER already has content, skip.

This makes Pass 3 safely re-runnable after any interruption — a crash or
timeout at file 31 of 50 does not mean restarting from scratch.

### Rule C — Cross-file consistency via the fact table

When generating any file that references another file's contents (e.g.
`architecture.md` referencing `controller-patterns.md`), use ONLY the values
from the fact table. Never invent method names, class names, or signatures
not present in the table.

If the fact table says `Response wrapper LAYER = Controller`, then
`architecture.md`, `controller-patterns.md`, `response-exception.md`,
`controller-rules.md`, and ALL skills files MUST show Controller wrapping
the response. Inconsistencies here are the #1 quality complaint in Pass 3
output — the fact table exists specifically to prevent them.

### Rule D — Output conciseness (prevents context overflow mid-generation)

Pass 3 generates 30-50+ files in one session. Every token of narration between
file writes accumulates in the conversation context and eventually causes
`Prompt is too long` failures around file 30-40. To prevent this:

1. **Between file writes, output AT MOST one short line** — either
   `[WRITE] <path>` or `[SKIP] <path> — already exists`. No paragraphs,
   no "Now I will generate...", no "This file contains...".
2. **Do NOT restate the fact table** between files. It is already in your
   in-context memory from PHASE 1.
3. **Do NOT re-explain design decisions** between files. If a decision was
   recorded in the fact table or in an earlier file you wrote this session,
   reference it by name, do not re-derive it.
4. **Each file's content itself should be focused** — write what the project
   needs, not exhaustive commentary. If a markdown file would exceed ~300 lines,
   split it by creating additional files with numbered prefixes rather than
   producing one giant file.
5. **Do NOT echo file content back in your response after writing.** The Write
   tool confirms success; there is no need to say "I have written the following
   content: ...".

The failure mode to avoid: writing file 25, then explaining what you just wrote
in 200 words, then writing file 26, then explaining again. After 40 files that
verbose pattern alone adds 15-30K tokens of pure narration — enough to overflow
context on top of the actual file contents.

### Rule E — Batch idempotent checks at the start

Instead of calling `Read` on every target file individually right before
writing it (which doubles the number of tool calls and accumulates Read
response content in context), do this ONCE at the start of PHASE 2:

1. Use `Glob` on each output root (`claudeos-core/standard/**/*.md`,
   `.claude/rules/**/*.md`, etc.) to get a single list of already-existing files.
2. Keep that list in your working memory alongside the fact table.
3. For each target file, check the list (not the filesystem) — if present and
   non-trivially sized, emit `[SKIP]` and move on.
4. Only call `Read` on a specific target file if you have a concrete reason
   to inspect its content.

Rule E makes Rule B idempotency much cheaper in tool call count and context.

---

