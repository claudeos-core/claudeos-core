# Troubleshooting

Common errors and how to fix them. If your problem isn't here, [open an issue](https://github.com/claudeos-core/claudeos-core/issues) with the steps to reproduce.

---

## Installation issues

### "Command not found: claudeos-core"

You haven't installed it globally, or npm's global bin isn't on your PATH.

**Option A — Use `npx` (recommended, no install):**
```bash
npx claudeos-core init
```

**Option B — Install globally:**
```bash
npm install -g claudeos-core
claudeos-core init
```

If npm-installed but still "command not found", check your PATH:
```bash
npm config get prefix
# Verify the bin/ directory under this prefix is in your PATH
```

### "Cannot find module 'glob'" or similar

You're running ClaudeOS-Core from outside a project root. Either:

1. `cd` into your project first.
2. Use `npx claudeos-core init` (works from any directory).

### "Node.js version not supported"

ClaudeOS-Core requires Node.js 18+. Check your version:

```bash
node --version
```

Upgrade via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), or your OS package manager.

---

## Pre-flight checks

### "Claude Code not found"

ClaudeOS-Core uses your local Claude Code installation. Install it first:

- [Official installation guide](https://docs.anthropic.com/en/docs/claude-code)
- Verify: `claude --version`

If `claude` is installed but not on PATH, fix your shell's PATH — there's no override env variable.

### "Could not detect stack"

The scanner couldn't identify your project's framework. Causes:

- No `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` at the project root.
- Your stack isn't in [the 12 supported stacks](stacks.md).
- Custom layout that doesn't match auto-detection rules.

**Fix:** verify the project root has one of the recognized files. If your stack is supported but your layout is unusual, see [advanced-config.md](advanced-config.md) for `.claudeos-scan.json` overrides.

### "Authentication test failed"

`init` runs a quick `claude -p "echo ok"` to verify Claude Code is authenticated. If this fails:

```bash
claude --version           # Should print version
claude -p "say hi"         # Should print a response
```

If `-p` returns an auth error, follow Claude Code's auth flow. ClaudeOS-Core can't fix Claude auth on your behalf.

---

## Init runtime issues

### Init hangs or takes a long time

Pass 1 on a large project takes a while. Diagnostics:

1. **Is Claude Code working?** Run `claude --version` in another terminal.
2. **Is the network OK?** Each pass calls Claude Code, which calls the Anthropic API.
3. **Is your project very large?** Domain group splitting auto-applies (4 domains / 40 files per group), so a 24-domain project runs Pass 1 six times.

If it's stuck for a long time with no output (no progress ticker advance), kill it (Ctrl-C) and resume:

```bash
npx claudeos-core init   # Resumes from last completed pass marker
```

The resume mechanism only re-runs passes that didn't complete.

### "Prompt is too long" errors from Claude

This means Pass 3 ran out of context window. Mitigations the tool already applies:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — automatic.
- **Domain group splitting** — auto-applied when domains > 4 or files > 40 per group.
- **Batch sub-division** — for ≥16 domains, 3b/3c sub-divide into batches of ≤15 domains each.

If you still hit context limits despite this, the project is exceptionally large. The current options are:

1. Split your project into separate directories and run `init` in each one.
2. Add aggressive `frontendScan.platformKeywords` overrides via `.claudeos-scan.json` to skip non-essential subapps.
3. [Open an issue](https://github.com/claudeos-core/claudeos-core/issues) — we may need a new override for your case.

There is no flag to "force more aggressive splitting" beyond what's already automatic.

### Init fails partway through

The tool is **resume-safe**. Just re-run:

```bash
npx claudeos-core init
```

It picks up from the last completed pass marker. No work lost.

If you want a clean slate (delete all markers and re-generate everything), use `--force`:

```bash
npx claudeos-core init --force
```

Be aware: `--force` deletes manual edits to `.claude/rules/`. See [safety.md](safety.md) for details.

### Windows: "EBUSY" or file-lock errors

Windows file locking is stricter than Unix. Causes:

- Antivirus scanning files mid-write.
- An IDE has a file open with exclusive lock.
- A previous `init` crashed and left a stale handle.

Fixes (try in order):

1. Close your IDE, retry.
2. Disable antivirus's real-time scan for the project folder (or whitelist the project path).
3. Restart Windows (clears stale handles).
4. If persistent, run from WSL2 instead.

The `lib/staged-rules.js` move logic falls back from `renameSync` to `copyFileSync + unlinkSync` to handle most antivirus interference automatically. If you still hit lock errors, the staged files remain in `claudeos-core/generated/.staged-rules/` for inspection — re-run `init` to retry the move.

### Cross-volume rename failures (Linux/macOS)

`init` may need to atomically rename across mount points (e.g., `/tmp` to your project on a different disk). The tool falls back to copy-then-delete automatically — no action needed.

If you see persistent move failures, check that you have write access to both `claudeos-core/generated/.staged-rules/` and `.claude/rules/`.

---

## Validation issues

### "STALE_PATH: file does not exist"

A path mentioned in standards/skills/guides doesn't resolve to an actual file. Causes:

- Pass 3 hallucinated a path (e.g., invented `featureRoutePath.ts` from a parent dir + a TypeScript constant name).
- You deleted a file but the docs still reference it.
- The file is gitignored but the scanner's allowlist had it.

**Fix:**

```bash
npx claudeos-core init --force
```

This regenerates Pass 3 / 4 with a fresh allowlist.

If the path is intentionally gitignored and you want the scanner to ignore it, see [advanced-config.md](advanced-config.md) for what `.claudeos-scan.json` actually supports (the supported field set is small).

If `--force` doesn't fix it (re-running can re-trigger the same hallucination on rare LLM seeds), edit the offending file by hand and remove the bad path. The validator runs at **advisory** tier, so this won't block CI — you can ship and fix later.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

Skills registered in `claudeos-core/skills/00.shared/MANIFEST.md` should be mentioned somewhere in CLAUDE.md. The validator has an **orchestrator/sub-skill exception** — sub-skills are considered covered when their orchestrator is mentioned.

**Fix:** if a sub-skill's orchestrator is genuinely not mentioned in CLAUDE.md, run `init --force` to regenerate. If the orchestrator IS mentioned and the validator still flags it, that's a validator bug — please [open an issue](https://github.com/claudeos-core/claudeos-core/issues) with the file paths.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` requires exactly 2 `####` headings under Section 8 (L4 Memory Files / Memory Workflow).

Likely causes:

- You manually edited CLAUDE.md and broke Section 8's structure.
- A pre-v2.3.0 Pass 4 ran and appended a Section 9.
- You're upgrading from a pre-v2.2.0 version (8-section scaffold not yet enforced).

**Fix:**

```bash
npx claudeos-core init --force
```

This regenerates CLAUDE.md cleanly. Memory files are preserved across `--force` (only generated files are overwritten).

### "T1: section heading missing English canonical token"

Each `## N.` section heading must contain its English canonical token (e.g., `## 1. Role Definition` or `## 1. 역할 정의 (Role Definition)`). This is to keep multi-repo grep working regardless of `--lang`.

**Fix:** edit the heading to include the English token in parentheses, or run `init --force` to regenerate (the v2.3.0+ scaffold enforces this convention automatically).

---

## Memory layer issues

### "Memory file growing too large"

Run compaction:

```bash
npx claudeos-core memory compact
```

This applies the 4-stage compaction algorithm. See [memory-layer.md](memory-layer.md) for what each stage does.

### "propose-rules suggests rules I disagree with"

The output is a draft for review, not auto-applied. Just decline what you don't want:

- Edit `claudeos-core/memory/auto-rule-update.md` directly to remove proposals you reject.
- Or skip the apply step entirely — your `.claude/rules/` is unchanged unless you copy proposed content into rule files manually.

### `memory <subcommand>` says "not found"

Memory files are missing. They're created by Pass 4 of `init`. If they were deleted:

```bash
npx claudeos-core init --force
```

Or, if you only want the memory files re-created without re-running everything, the tool doesn't have a single-pass-replay command. `--force` is the path.

---

## CI issues

### Tests pass locally but fail in CI

Most likely reasons:

1. **CI doesn't have `claude` installed.** Translation-dependent tests bail out via `CLAUDEOS_SKIP_TRANSLATION=1`. The official CI workflow sets this env var; if your fork doesn't, set it.

2. **Path normalization (Windows).** The codebase normalizes Windows backslashes to forward slashes in many places, but tests can trip on subtle differences. The official CI runs on Windows + Linux + macOS so most issues are caught — if you see a Windows-specific failure, it may be a real bug.

3. **Node version.** Tests are run on Node 18 + 20. If you're on Node 16 or 22, you may hit incompatibilities — pin to 18 or 20 for CI parity.

### `health` exits 0 in CI but I expected non-zero

`health` exits non-zero only on **fail**-tier findings. **warn** and **advisory** print but don't block.

If you want to fail on advisories (e.g., to be strict about `STALE_PATH`), there's no built-in flag — you'd need to grep the output and exit accordingly:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Getting help

If none of the above fits:

1. **Capture the exact error message.** ClaudeOS-Core errors include file paths and identifiers — these help reproduce.
2. **Check the issue tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — your issue may already be reported.
3. **Open a new issue** with: OS, Node version, Claude Code version (`claude --version`), project stack, and the error output. If possible, include `claudeos-core/generated/project-analysis.json` (sensitive vars are auto-redacted).

For security issues, see [SECURITY.md](../SECURITY.md) — do not open public issues for vulnerabilities.

---

## See also

- [safety.md](safety.md) — what `--force` does and what it preserves
- [verification.md](verification.md) — what the validator findings mean
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` overrides
