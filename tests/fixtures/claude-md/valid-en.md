# CLAUDE.md — sample-project

> Sample valid CLAUDE.md for validator tests (English).

## 1. Role Definition

As the senior developer for this repository, you are responsible for writing, modifying, and reviewing code. Responses must be written in English.
A Node.js Express REST API server on top of a PostgreSQL relational store.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | TypeScript 5.4 |
| Framework | Express 4.19 |
| Build Tool | tsc |
| Package Manager | npm |
| Server Port | 3000 (`PORT`) |
| Database | PostgreSQL 15 |
| ORM | Prisma 5 |
| Test Runner | Vitest |

## 3. Build & Run Commands

```bash
npm install
npm run dev                 # nodemon, port 3000
npm run build
npm test
```

Treat `package.json` scripts as the single source of truth.

## 4. Core Architecture

### Overall Structure

```
Client → Express Router → Service Layer → Prisma → PostgreSQL
```

### Data Flow

1. Request arrives at router.
2. Middleware validates auth.
3. Service performs business logic.
4. Prisma reads/writes DB.
5. Response serialized.

### Core Patterns

- **Layered**: router → service → repository.
- **DTO validation**: zod schemas at router boundary.
- **Error middleware**: centralized error handling.

## 5. Directory Structure

```
sample-project/
├─ src/
│  ├─ routes/
│  ├─ services/
│  └─ db/
└─ tests/
```

**Auto-generated**: none.
**Test scope**: `tests/` mirrors `src/`.
**Build output**: `dist/`.

## 6. Standard / Rules / Skills Reference

### Standard (Single Source of Truth)

| Path | Description |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Project overview |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | Doc writing guide (Pass 4 generated) |

### Rules (Auto-loaded Guardrails)

| Path | Description |
|---|---|
| `.claude/rules/00.core/*` | Core rules |
| `.claude/rules/60.memory/*` | L4 memory file guards (Pass 4 generated) |

### Skills (Automated Procedures)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (Files Not to Be Read Directly)

| Path | Reason |
|---|---|
| `claudeos-core/guide/` | Human-facing docs |
| `claudeos-core/generated/` | Internal metadata |
| `dist/` | Build output |
| `node_modules/` | Dependencies |

## 8. Common Rules & Memory (L4)

### Common Rules (auto-loaded on every edit)

| Rule File | Role | Core Enforcement |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Documentation rules | paths required, no hardcoding |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI work rules | fact-based, Read before edit |

For detailed guidance, Read `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### L4 Memory (on-demand reference)

Long-term context (decisions · failures · compaction · auto-proposals) is stored in `claudeos-core/memory/`.
Unlike rules that auto-load via `paths` glob, this layer is referenced **on-demand**.

#### L4 Memory Files

| File | Purpose | Behavior |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Why of design decisions | Append-only. Skim at session start. |
| `claudeos-core/memory/failure-patterns.md` | Repeated errors | Search at session start. |
| `claudeos-core/memory/compaction.md` | 4-stage compaction policy | Modify only when policy changes. |
| `claudeos-core/memory/auto-rule-update.md` | Rule change proposals | Review and accept. |

#### Memory Workflow

1. Scan failure-patterns at session start.
2. Skim recent decisions.
3. Record new decisions as append.
4. Register repeated errors with pattern-id.
5. Run compact when files approach 400 lines.
6. Review rule-update proposals.
