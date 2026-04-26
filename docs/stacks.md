# Supported Stacks

12 stacks, all auto-detected from your project files. **8 backend** + **4 frontend**.

This page describes how each stack is detected and what the per-stack scanner extracts. Use it to:

- Check whether your stack is supported.
- Understand what facts the scanner will pass to Claude before generating docs.
- See what to expect in `claudeos-core/generated/project-analysis.json`.

If your project structure is unusual, see [advanced-config.md](advanced-config.md) for `.claudeos-scan.json` overrides.

---

## How detection works

When `init` runs, the scanner opens these files at the project root in roughly this order:

| File | What it tells the scanner |
|---|---|
| `package.json` | Node.js project; framework via `dependencies` |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; framework via packages |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Vue/Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |

If none match, `init` stops with a clear error rather than guessing. (No prompt-the-LLM-to-figure-it-out fallback. Better to fail loud than to silently produce wrong docs.)

The scanner is in `plan-installer/stack-detector.js` if you want to read the actual detection logic.

---

## Backend stacks (8)

### Java / Spring Boot

**Detected when:** `build.gradle` or `pom.xml` contains `spring-boot-starter`. Java is identified separately from Kotlin via the Gradle plugin block.

**Architecture pattern detection.** The scanner classifies your project into **one of 5 patterns**:

| Pattern | Example structure |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Patterns are tried in order (A → B/D → E → C). The scanner also has two refinements: (1) **root-package detection** picks the longest package prefix that covers ≥80% of layer-bearing files (deterministic across re-runs); (2) **deep-sweep fallback** for Pattern B/D — when standard globs return zero files for a registered domain, the scanner re-globs `**/${domain}/**/*.java` and walks each file's path to find the nearest layer dir, catching cross-domain coupling layouts like `core/{otherDomain}/{layer}/{domain}/`.

**Extracted facts:**
- Stack, framework version, ORM (JPA / MyBatis / jOOQ)
- DB type (Postgres / MySQL / Oracle / MariaDB / H2 — H2 detection uses a `\bh2\b` word-boundary regex to avoid false-positives on `oauth2`, `cache2k`, etc.)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Domain list with file counts (controllers, services, mappers, dtos, MyBatis XML mappers)

The scanner is in `plan-installer/scanners/scan-java.js`.

---

### Kotlin / Spring Boot

**Detected when:** `build.gradle.kts` is present and the Kotlin plugin is applied alongside Spring Boot. Has a fully separate code path from Java — does not reuse Java patterns.

**Specifically detects:**
- **CQRS** — separate command/query packages
- **BFF** — backend-for-frontend pattern
- **Multi-module Gradle** — `settings.gradle.kts` with `include(":module")`
- **Shared query domains across modules** — `resolveSharedQueryDomains()` redistributes shared query module files via package/class-name decomposition

**ORMs supported:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Why Kotlin gets its own scanner:** the Java patterns don't fit Kotlin codebases well. Kotlin projects tend toward CQRS and multi-module setups that Java's pattern-A-through-E classification can't represent cleanly.

The scanner is in `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Detected when:** `express` is in `package.json` dependencies.

**Stack detector identifies:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB type, package manager (npm / yarn / pnpm), TypeScript usage.

**Domain discovery:** the shared Node.js scanner (`plan-installer/scanners/scan-node.js`) walks `src/*/` (or `src/modules/*/` if NestJS-style modules exist), counts files matching `controller|router|route|handler`, `service`, `dto|schema|type`, and entity/module/guard/pipe/interceptor patterns. The same scanner code path is used for Express, Fastify, and NestJS — the framework name determines which Pass 1 prompt is selected, not which scanner runs.

---

### Node / Fastify

**Detected when:** `fastify` is in dependencies.

Domain discovery uses the same shared `scan-node.js` scanner described above. Pass 1 uses a Fastify-specific prompt template that asks Claude to look for Fastify's plugin patterns and route schemas.

---

### Node / NestJS

**Detected when:** `@nestjs/core` is in dependencies.

Domain discovery uses the shared `scan-node.js` scanner. NestJS's standard `src/modules/<module>/` layout is detected automatically (preferred over `src/*/` when both exist) and each module becomes a domain. Pass 1 uses a NestJS-specific prompt template.

---

### Python / Django

**Detected when:** the substring `django` (lowercase) appears in `requirements.txt` or `pyproject.toml`. Standard package-manager declarations use lowercase, so this matches typical projects.

**Domain discovery:** the scanner walks `**/models.py` and treats each directory containing `models.py` as a Django app/domain. (It does not parse `INSTALLED_APPS` from `settings.py` — the on-disk `models.py` presence is the signal.)

**Per-domain stats:** counts files matching `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Detected when:** `fastapi` is in dependencies.

**Domain discovery:** glob `**/{router,routes,endpoints}*.py` — each unique parent directory becomes a domain. The scanner doesn't parse `APIRouter(...)` calls; the filename is the signal.

**ORMs detected by stack-detector:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Detected when:** `flask` is in dependencies.

**Domain discovery:** uses the same `**/{router,routes,endpoints}*.py` glob as FastAPI. If that yields nothing, the scanner falls back to `{app,src/app}/*/` directories.

**Flat-project fallback (v1.7.1):** If no domain candidates are found, the scanner looks for `{main,app}.py` at the project root and treats the project as a single-domain "app".

---

## Frontend stacks (4)

### Node / Next.js

**Detected when:** `next.config.{ts,js}` exists, OR `next` is in `package.json` dependencies.

**Detects routing convention:**

- **App Router** (Next.js 13+) — `app/` directory with `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) — `pages/` directory
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**Scanner extracts:**
- Routing mode (App Router / Pages Router / FSD)
- RSC vs Client component counts (Next.js App Router — by counting files whose name contains `client.` such as `client.tsx`, not by parsing `"use client"` directives inside source)
- Domain list from `app/` or `pages/` (and `src/features/` etc. for FSD)

State management, styling, and data-fetching libraries are not detected at the scanner level. Pass 1 prompts ask Claude to look for those patterns in the source code instead.

---

### Node / Vite

**Detected when:** `vite.config.{ts,js}` exists, OR `vite` is in dependencies.

Default port is `5173` (Vite convention) — applied as a last-resort fallback. The scanner doesn't parse `vite.config` for `server.port`; if your project declares a port in `.env*`, the env-parser picks it up first.

The stack detector identifies Vite itself; the underlying UI framework — when not React (the default fallback) — is identified by the LLM in Pass 1 from the source code, not by the scanner.

---

### Angular

**Detected when:** `angular.json` is present, OR `@angular/core` is in dependencies.

**Detects:**
- **Feature module** structure — `src/app/<feature>/`
- **Monorepo workspaces** — generic `apps/*/src/app/*/` and `packages/*/src/app/*/` patterns (works for NX layouts even though `nx.json` itself isn't an explicit detection signal)

Default port is `4200` (Angular convention) — applied as a last-resort fallback. The scanner reads `angular.json` only for stack detection, not for port extraction; if your project declares the port in a `.env*` file, the env-parser picks it up first.

---

### Vue / Nuxt

**Detected when:** `nuxt.config.{ts,js}` exists for Nuxt, OR `vue` is in dependencies for plain Vue.

The scanner identifies the framework and runs the frontend domain extraction (App/Pages/FSD/components patterns). Nuxt version and module detection (Pinia, VueUse, etc.) is delegated to Pass 1 — Claude reads the source and identifies what's used, rather than the scanner pattern-matching `package.json`.

---

## Multi-stack projects

A project with both backend and frontend (e.g., Spring Boot in `backend/` + Next.js in `frontend/`) is fully supported.

Each stack runs its **own scanner** with its **own analysis prompt**. The merged Pass 2 output covers both stacks. Pass 3 generates separate rule and standard files for each, organized into:

```
.claude/rules/
├── 10.backend/                  ← Spring Boot rules
├── 20.frontend/                 ← Next.js rules
└── 70.domains/
    ├── backend/                 ← per-backend-domain
    └── frontend/                ← per-frontend-domain

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

The `70.domains/{type}/` typing is **always-on** — even if your project is single-stack, the layout uses `70.domains/backend/` (or `frontend/`). This keeps the convention uniform: when a single-stack project later adds a second stack, no migration is needed.

**Multi-stack detection** picks up:
- A monorepo manifest at the project root: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- A root `package.json` with a `workspaces` field

When a monorepo is detected, the scanner walks `apps/*/package.json` and `packages/*/package.json` (plus any custom workspace globs from the manifest), merges the dependency lists, and runs both backend and frontend scanners as needed.

---

## Frontend platform-split detection

Some frontend projects organize by platform (PC, mobile, admin) at the top level:

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

The scanner detects `src/{platform}/{subapp}/` and emits each `{platform}-{subapp}` as a separate domain. Default platform keywords:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Add custom keywords via `frontendScan.platformKeywords` in `.claudeos-scan.json` (see [advanced-config.md](advanced-config.md)).

**Single-SPA skip rule (v2.3.0):** If only ONE platform keyword matches across the project tree (e.g., the project has `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` with no other platforms), subapp emission is skipped. Otherwise, architectural layers (`api`, `dto`, `routers`) would be falsely emitted as feature domains.

To force subapp emission anyway, set `frontendScan.forceSubappSplit: true` in `.claudeos-scan.json`. See [advanced-config.md](advanced-config.md).

---

## `.env` extraction (v2.2.0+)

The scanner reads `.env*` files for runtime configuration so generated docs reflect your real port, host, and DB URL.

**Search order** (first match wins):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Sensitive-variable redaction:** keys matching `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, etc. are auto-redacted to `***REDACTED***` before being copied into `project-analysis.json`. **Exception:** `DATABASE_URL` is whitelisted because the scanner needs the protocol to detect the DB type.

**Port resolution precedence:**
1. Spring Boot `application.yml` `server.port`
2. `.env` port keys (16+ convention keys checked, ordered by specificity — Vite-specific first, generic `PORT` last)
3. Stack default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

The parser is in `lib/env-parser.js`. Tests are in `tests/env-parser.test.js`.

---

## What the scanner produces — `project-analysis.json`

After Step A finishes, you'll find this file at `claudeos-core/generated/project-analysis.json`. Top-level keys (varies by stack):

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

You can read this file directly to see exactly what the scanner extracted from your project.

---

## Adding a new stack

The scanner architecture is modular. Adding a new stack requires:

1. A `plan-installer/scanners/scan-<stack>.js` file (domain extraction logic).
2. Three Claude prompt templates: `pass1.md`, `pass2.md`, `pass3.md` under `pass-prompts/templates/<stack>/`.
3. Stack-detection rules added to `plan-installer/stack-detector.js`.
4. Routing into the dispatcher in `bin/commands/init.js`.
5. Tests with a fixture project under `tests/fixtures/<stack>/`.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full guide and reference implementations to copy from.

---

## Override scanner behavior

If your project has unusual structure or the auto-detection picks the wrong stack, drop a `.claudeos-scan.json` file at your project root.

See [advanced-config.md](advanced-config.md) for the available override fields.
