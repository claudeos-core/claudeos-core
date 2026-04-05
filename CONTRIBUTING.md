# Contributing to ClaudeOS-Core

Thank you for your interest in contributing! Here's how you can help.

## Areas Where Help Is Needed

- **New stack templates** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **IDE integration** — VS Code extension, IntelliJ plugin
- **Test coverage** — Unit tests for verification tools
- **CI/CD templates** — GitHub Actions, GitLab CI integration examples
- **Custom template authoring** — User-defined pass1/pass2/pass3 templates

## What's Already Done (no longer needed)

- ~~Monorepo deep support~~ — Implemented (Turborepo, Nx, Lerna, pnpm workspaces)
- ~~Localization~~ — 10 languages available (EN, KO, ZH-CN, JA, ES, VI, HI, RU, FR, DE)
- ~~Kotlin / Spring Boot~~ — Implemented with CQRS, BFF, and multi-module monorepo support

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run the health checker: `node bin/cli.js health`
5. Commit: `git commit -m "feat: your feature description"`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

## Adding a New Stack Template

See `kotlin-spring/` as a reference implementation — it shows how to add CQRS/multi-module awareness on top of the standard 3-pass structure.

1. Create a new directory under `pass-prompts/templates/your-stack/`
2. Add `pass1.md`, `pass2.md`, `pass3.md` following the existing template structure
3. Update `detectStack()` in `plan-installer/index.js` to detect the new language/framework
4. Update `scanStructure()` to detect the new stack's domains
5. Update `selectTemplates()` in `plan-installer/index.js` to route to the new template
6. Update `README.md` Supported Stacks table
7. Add FAQ and Troubleshooting entries for the new stack

## Code Style

- Node.js CommonJS (`require`/`module.exports`)
- 2-space indentation
- Semicolons required
- `const` over `let` where possible

## Commit Message Convention

```
feat: add Ruby/Rails template
fix: correct Vue domain scanning
docs: update README for new stack
refactor: simplify splitDomainGroups
```

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
