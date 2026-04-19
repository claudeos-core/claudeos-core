# Contributing to ClaudeOS-Core

Thank you for your interest in contributing! Here's how you can help.

## Areas Where Help Is Needed

- **New stack templates** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **IDE integration** — VS Code extension, IntelliJ plugin
- **CI/CD templates** — GitLab CI, CircleCI, Jenkins examples (GitHub Actions already shipped — see `.github/workflows/test.yml`)
- **Custom template authoring** — User-defined pass1/pass2/pass3 templates for niche stacks
- **Verification coverage** — Additional content-validator checks, stack-specific lint rules

## What's Already Done (no longer needed)

- ~~Monorepo support~~ — Turborepo, pnpm workspaces, Lerna, npm/yarn workspaces
- ~~Localization~~ — 10 languages (EN, KO, ZH-CN, JA, ES, VI, HI, RU, FR, DE)
- ~~Kotlin / Spring Boot~~ — CQRS, BFF, multi-module support
- ~~Flask / FastAPI / Django dedicated templates~~ — each uses its own `pass1/2/3.md`
- ~~NestJS / Fastify / Vite dedicated templates~~ — no longer sharing `node-express`
- ~~L4 Memory layer (v2.0.0)~~ — Pass 4 + `60.memory/` rules + `memory/` files
- ~~GitHub Actions CI~~ — `.github/workflows/test.yml` (ubuntu × windows × macOS, Node 18/20)

## Getting Started

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm test   # 489 tests, ~2s
```

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run the full test suite: `npm test`
5. Sanity-check on a sample project (optional): `npx . init --lang en` in a test directory
6. Commit: `git commit -m "feat: your feature description"`
7. Push: `git push origin feature/your-feature`
8. Open a Pull Request

## Testing

- **Runner:** built-in Node test runner (`node --test tests/*.test.js`), no Jest/Mocha dependency.
- **Current:** 489 tests across 24 files. CI runs the full matrix (ubuntu × windows × macOS × Node 18/20).
- **Offline / no `claude` CLI:** the 5 tests in `tests/lang-aware-fallback.test.js` assert that translation throws when Claude is unavailable. The test file sets `process.env.CLAUDEOS_SKIP_TRANSLATION = "1"` at module top to make this deterministic regardless of CLI availability. CI also sets it at the job level in `.github/workflows/test.yml`.
- **Adding new tests:** prefer a dedicated file (`tests/your-feature.test.js`). Use `os.tmpdir()` + `fs.rmSync(dir, {recursive: true, force: true})` cleanup, consistent with existing suites (see `tests/pass3-guards.test.js` for the canonical pattern).
- **Integration tests:** `tests/verification-tools.test.js` spawns the CLI tools against temp project fixtures — follow that pattern for any new verification tool.

## Adding a New Stack Template

Reference implementations:
- Simple single-stack backend: `pass-prompts/templates/python-flask/`
- Complex backend with architecture variants: `pass-prompts/templates/kotlin-spring/` (CQRS, multi-module)
- Frontend-only SPA: `pass-prompts/templates/node-vite/` (no backend, client-side routing)

**Steps:**

1. **Create template prompts** — `pass-prompts/templates/your-stack/{pass1.md, pass2.md, pass3.md}`. Follow sibling stacks for structure. Pass 4 uses shared `common/pass4.md` so you don't need a stack-specific memory prompt.
2. **Add a domain scanner** — `plan-installer/scanners/scan-{language}.js` exporting a function that returns `{domains, rootPackage?}`. See `scan-java.js` (5 patterns + fallback) or `scan-python.js` (framework-aware) for patterns.
3. **Wire scanner into dispatcher** — `plan-installer/structure-scanner.js` — add a case in `scanStructure()` for your language.
4. **Update stack detection** — `plan-installer/stack-detector.js` — extend `detectStack()` to identify the framework from manifest files (`package.json`, `Gemfile`, `go.mod`, etc.).
5. **Route to template** — `plan-installer/domain-grouper.js` — extend `selectTemplates()` to map `framework: "your-framework"` to the template directory name.
6. **Set active-domain categories** — `plan-installer/domain-grouper.js` — extend `determineActiveDomains()` so the right standard categories apply (backend / frontend / security-db / infra / verification).
7. **Add tests** — extend `tests/stack-detector.test.js`, add `tests/scan-YOUR-LANGUAGE.test.js`, extend `tests/domain-grouper.test.js`.
8. **Update docs** — `README.md` "Supported Stacks" table + FAQ / Troubleshooting entries + `CHANGELOG.md` entry.

## Code Style

- Node.js CommonJS (`require`/`module.exports`), no TypeScript
- 2-space indentation, semicolons required
- `const` over `let` where possible
- Custom `InitError` class for user-facing failures; named catch variable (`catch (_e)`) when the error is intentionally ignored
- Windows compatibility: normalize paths with `path.join` + `.replace(/\\/g, "/")` before passing to `glob` (backslashes break glob patterns on Windows)
- BOM-aware text checks: `String.prototype.trim` does NOT remove U+FEFF — use `.replace(/^\uFEFF/, "").trim()` when checking for empty content

## Commit Message Convention

```
feat: add Ruby/Rails template
fix: correct Vue domain scanning on Windows
docs: update README for new stack
refactor: simplify splitDomainGroups
test: add coverage for scan-rust.js
```

CHANGELOG entries should be written in English regardless of the output language of generated docs.

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
