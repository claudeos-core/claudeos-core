<!--
Thanks for contributing to claudeos-core!
Please fill out the sections below. Delete sections that don't apply.
-->

## Summary

<!-- 1-3 bullet points: what this PR changes and why. -->

-
-

## Type of Change

- [ ] Bug fix (non-breaking, restores expected behavior)
- [ ] Feature (non-breaking, adds functionality)
- [ ] Breaking change (alters existing CLI flag / output format / template structure)
- [ ] Documentation only (README / CHANGELOG / templates)
- [ ] Refactor / internal cleanup (no behavior change)
- [ ] Test-only change

## Component(s) Touched

- [ ] CLI (`bin/`)
- [ ] Plan installer / scanners (`plan-installer/`)
- [ ] Validators (`claude-md-validator/`, `content-validator/`, `pass-json-validator/`)
- [ ] Templates (`pass-prompts/templates/`)
- [ ] Shared libs (`lib/`)
- [ ] Tests (`tests/`)
- [ ] Documentation (`README*.md`, `CHANGELOG.md`)

## Test Plan

<!-- How was this verified? -->

- [ ] `npm test` passes locally
- [ ] New tests added for the change (cite file names)
- [ ] Manual verification on a real project (`npx claudeos-core init` against a sample stack)
- [ ] N/A (docs / cleanup only)

Test count before → after: <!-- e.g., 721 → 724 -->

## Backwards Compatibility

<!-- Does this break any existing behavior? -->

- [ ] No breaking changes
- [ ] Breaking change (describe migration path below)

## Checklist

- [ ] Code follows project conventions (CommonJS, 2-space indent, `feat:` / `fix:` / `docs:` commit prefix)
- [ ] No new dependencies added (or justification provided in description)
- [ ] CHANGELOG updated under the appropriate version heading (English only)
- [ ] No secrets, credentials, or private project names introduced
- [ ] Templates remain English-first (i18n only via `lang-instructions.json` / `language-config.js`)

## Related Issues

<!-- Closes #N, refs #M -->
