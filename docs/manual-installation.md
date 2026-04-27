# Manual Installation

If you can't use `npx` (corporate firewall, air-gapped environment, locked-down CI), here's how to install and run ClaudeOS-Core manually.

For most users, `npx claudeos-core init` is enough — you don't need to read this page.

---

## Prerequisites (regardless of install method)

- **Node.js 18+** — verify with `node --version`. If older, upgrade via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), or your OS package manager.
- **Claude Code** — installed and authenticated. Verify with `claude --version`. See [Anthropic's official install guide](https://docs.anthropic.com/en/docs/claude-code).
- **Git repo (preferred)** — `init` checks for `.git/` and at least one of `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` at the project root.

---

## Option 1 — Global npm install

```bash
npm install -g claudeos-core
```

Verify:

```bash
claudeos-core --version
```

Then use without `npx`:

```bash
claudeos-core init
```

**Pros:** Standard, works on most setups.
**Cons:** Needs npm + write access to the global `node_modules`.

To upgrade later:

```bash
npm install -g claudeos-core@latest
```

To uninstall:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — Per-project devDependency

Add to your project's `package.json`:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.3"
  }
}
```

Install:

```bash
npm install
```

Use via npm scripts:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Then:

```bash
npm run claudeos:init
```

**Pros:** Pinned version per project; CI-friendly; no global pollution.
**Cons:** Bloats `node_modules` — though dependencies are minimal (just `glob` and `gray-matter`).

To uninstall from one project:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (for contributors)

For development or when you want to contribute:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Now `claudeos-core` is on your PATH globally, pointing at the cloned repo.

To use a local clone in another project:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros:** Edit the tool's source and immediately test changes.
**Cons:** Only useful for contributors. The link breaks if you move the cloned repo.

---

## Option 4 — Vendored / air-gapped

For environments without internet access:

**On a connected machine:**

```bash
npm pack claudeos-core
# Produces claudeos-core-2.4.3.tgz
```

**Transfer the `.tgz` to your air-gapped environment.**

**Install from the local file:**

```bash
npm install -g ./claudeos-core-2.4.3.tgz
```

You'll also need:
- Node.js 18+ already installed in the air-gapped environment.
- Claude Code already installed and authenticated.
- The `glob` and `gray-matter` npm packages bundled in the offline npm cache (or vendored by `npm pack`-ing them separately).

To get all transitive dependencies bundled, you can run `npm install --omit=dev` inside an unpacked copy of the tarball before transferring.

---

## Verifying installation

After any install method, verify all four prerequisites:

```bash
# Should print version (e.g., 2.4.3)
claudeos-core --version

# Should print Claude Code version
claude --version

# Should print Node version (must be 18+)
node --version

# Should print Help text
claudeos-core --help
```

If all four work, you're ready to run `claudeos-core init` in a project.

---

## Uninstalling

```bash
# If installed globally
npm uninstall -g claudeos-core

# If installed per-project
npm uninstall claudeos-core
```

To also remove the generated content from a project:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core only writes to `claudeos-core/`, `.claude/rules/`, and `CLAUDE.md`. Removing those three is enough to fully remove the generated content from a project.

---

## CI integration

For GitHub Actions, the official workflow uses `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

This is sufficient for most CI use cases — `npx` downloads the package on demand and caches it.

If your CI is air-gapped or you want a pinned version, use Option 2 (per-project devDependency) and:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

For other CI systems (GitLab, CircleCI, Jenkins, etc.), the pattern is the same: install Node, install Claude Code, authenticate, run `npx claudeos-core <command>`.

**`health` is the recommended CI check** — it's fast (no LLM calls) and covers the four runtime validators. For structural validation, also run `claudeos-core lint`.

---

## Troubleshooting installation

### "Command not found: claudeos-core"

Either it's not installed globally, or your PATH doesn't include npm's global bin.

```bash
npm config get prefix
# Make sure this path's bin/ directory is in your PATH
```

Or use `npx` instead:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

You're running ClaudeOS-Core from a directory that's not a project root. Either `cd` into your project, or use `npx` (which works from anywhere).

### "Node.js version not supported"

You have Node 16 or older. Upgrade to Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager — varies
```

### "Claude Code not found"

ClaudeOS-Core uses your local Claude Code installation. Install Claude Code first ([official guide](https://docs.anthropic.com/en/docs/claude-code)), then verify with `claude --version`.

If `claude` is installed but not on your PATH, fix your PATH — there's no override env variable.

---

## See also

- [commands.md](commands.md) — once installed, what to run
- [troubleshooting.md](troubleshooting.md) — runtime errors during `init`
