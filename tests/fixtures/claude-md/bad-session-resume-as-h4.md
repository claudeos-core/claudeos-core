# CLAUDE.md — sample-project-sr-bad

> Negative fixture: Session Resume incorrectly placed as a third H4 heading under Section 8.
> Expected: validator reports [S-H4-8] (section 8 must have exactly 2 #### headings, found 3).

## 1. Role Definition

As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code.
A Node.js Express REST API server on top of a PostgreSQL relational store.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | TypeScript 5.4 |
| Framework | Express 4.19 |

## 3. Build & Run Commands

```bash
npm install
```

## 4. Core Architecture

### Overall Structure

Layered.

### Data Flow

Request → response.

### Core Patterns

Layered, DTO validation, error middleware.

## 5. Directory Structure

```
src/
```

## 6. Standard / Rules / Skills Reference

### Standard

| Path | Description |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Overview |

### Rules

| Path | Description |
|---|---|
| `.claude/rules/00.core/*` | Core rules |

### Skills

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read

| Path | Reason |
|---|---|
| `node_modules/` | Dependencies |

## 8. Common Rules & Memory (L4)

### Common Rules (auto-loaded on every edit)

| Rule File | Role | Core Enforcement |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Doc rules | paths required |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI rules | Read before edit |

### L4 Memory (on-demand reference)

Long-term context is stored in `claudeos-core/memory/`.

#### L4 Memory Files

| File | Purpose | Behavior |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Why | Append-only |
| `claudeos-core/memory/failure-patterns.md` | Errors | Scan at start |
| `claudeos-core/memory/compaction.md` | Policy | Modify on policy change |
| `claudeos-core/memory/auto-rule-update.md` | Proposals | Review |

#### Memory Workflow

1. Scan failure-patterns at session start.
2. Skim recent decisions.
3. Record new decisions as append.
4. Register repeated errors with pattern-id.
5. Run compact when files approach 400 lines.
6. Review rule-update proposals.

#### Session Resume (after auto-compact or restart)

This is INCORRECTLY placed as a third H4 subsection. The validator should reject it.

- Re-scan failure-patterns.md.
- Re-read decision-log.md recent entries.
- Re-match rules paths.
