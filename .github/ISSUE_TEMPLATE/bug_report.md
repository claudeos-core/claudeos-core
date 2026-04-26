---
name: Bug report
about: Report a defect in claudeos-core
title: "[bug] "
labels: ["bug"]
assignees: []
---

## Summary

<!-- One-sentence description of the problem. -->

## Environment

- `claudeos-core` version: <!-- run `npx claudeos-core --version` -->
- Node.js version: <!-- run `node --version` -->
- OS: <!-- Windows 11 / macOS 14 / Ubuntu 22.04 / etc. -->
- `claude` CLI version: <!-- run `claude --version` -->
- Project stack: <!-- e.g., Next.js 14 monorepo / Spring Boot 3.x / FastAPI / etc. -->

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

<!-- What should have happened. -->

## Actual Behavior

<!-- What actually happened. Include error message verbatim if any. -->

## Which pass failed?

<!-- Check the pass where the issue surfaced. -->

- [ ] Pre-flight (dependency check, language selection)
- [ ] Plan installer (stack detection / domain scanning)
- [ ] Pass 1 (per-domain analysis)
- [ ] Pass 2 (merge)
- [ ] Pass 3a (fact extraction)
- [ ] Pass 3b (CLAUDE.md + standard + rules)
- [ ] Pass 3c (skills + guide)
- [ ] Pass 3d (aux)
- [ ] Pass 4 (memory scaffolding)
- [ ] Post-pass lint (claude-md-validator / content-validator)

## Diagnostic Output

<!-- Paste relevant content from claudeos-core/generated/stale-report.json, or the failing pass output. Redact any private data. -->

```json

```

## Additional Context

<!-- Screenshots, related issues, suspected root cause. -->
