# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Заставьте Claude Code следовать конвенциям _именно вашего_ проекта с первой попытки — а не общим дефолтам.**

Детерминированный Node.js scanner сначала читает ваш код; затем 4-pass конвейер Claude пишет полный набор — `CLAUDE.md` + автоматически загружаемые `.claude/rules/` + standards + skills + L4 memory. 10 языков вывода, 5 post-generation validator-ов и явный path allowlist, не позволяющий LLM выдумывать файлы или фреймворки, отсутствующие в вашем коде.

Работает на [**12 стеках**](#supported-stacks) (включая monorepo) — одна команда `npx`, без конфигурации, resume-safe, идемпотентно.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Что это такое?

Вы используете Claude Code. Он мощный, но каждая сессия начинается с нуля — у него нет памяти о том, как устроен _ваш_ проект. Поэтому он откатывается на «в целом хорошие» дефолты, которые редко совпадают с тем, что реально делает ваша команда:

- Ваша команда использует **MyBatis**, а Claude генерирует JPA-репозитории.
- Ваша обёртка для ответов — `ApiResponse.ok()`, а Claude пишет `ResponseEntity.success()`.
- Ваши пакеты — layer-first (`controller/order/`), а Claude создаёт domain-first (`order/controller/`).
- Ваши ошибки идут через централизованный middleware, а Claude разбрасывает `try/catch` по каждому endpoint.

Хочется иметь набор `.claude/rules/` для каждого проекта — Claude Code автоматически загружает его в каждой сессии — но писать эти rules вручную для каждого нового repo занимает часы, и они расходятся с кодом по мере его эволюции.

**ClaudeOS-Core пишет их за вас, прямо из вашего реального исходного кода.** Детерминированный Node.js scanner сначала читает ваш проект (стек, ORM, layout пакетов, конвенции, пути файлов). Затем 4-pass конвейер Claude превращает извлечённые факты в полный набор документации:

- **`CLAUDE.md`** — индекс проекта, который Claude читает в каждой сессии
- **`.claude/rules/`** — автоматически загружаемые rules по категориям (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — справочные документы («почему» за каждым rule)
- **`claudeos-core/skills/`** — переиспользуемые паттерны (CRUD scaffolding, шаблоны страниц)
- **`claudeos-core/memory/`** — decision log + failure patterns, растущие вместе с проектом

Поскольку scanner передаёт Claude явный path allowlist, LLM **не может выдумать файлы или фреймворки, которых нет в вашем коде**. Пять post-generation validator-ов (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) проверяют вывод до отправки — language-invariant, поэтому одни и те же правила применяются независимо от того, генерируете ли вы на английском, русском или одном из 8 других языков.

```
До:    Вы → Claude Code → "в целом хороший" код → ручные правки каждый раз
После: Вы → Claude Code → код, соответствующий ВАШЕМУ проекту → используйте как есть
```

---

## Демонстрация на реальном проекте

Запуск на [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Результат: **75 generated files**, общее время **53 минуты**, все validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Вывод терминала (текстовая версия, для поиска и копирования)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>📄 Что попадает в ваш <code>CLAUDE.md</code> (реальный фрагмент — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

Каждое значение выше — точные координаты зависимостей, имя файла `dev.db`, имя миграции `V1__create_tables.sql`, «no JPA» — извлечено сканером из `build.gradle` / `application.properties` / дерева исходников ещё до того, как Claude начал писать файл. Ничего не угадано.

</details>

<details>
<summary><strong>🛡️ Реальное автоматически загружаемое правило (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

Glob `paths: ["**/*"]` означает, что Claude Code автоматически загружает это правило при редактировании любого файла в проекте. Каждое имя класса, путь пакета и exception handler в правиле берутся прямо из просканированного кода — включая реальные `CustomizeExceptionHandler` и `JacksonCustomizations` этого проекта.

</details>

<details>
<summary><strong>🧠 Автоматически сгенерированный сид <code>decision-log.md</code> (реальный фрагмент)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 заполняет `decision-log.md` архитектурными решениями, извлечёнными из `pass2-merged.json`, чтобы будущие сессии помнили *почему* кодовая база выглядит так, как выглядит — не только *как* она выглядит. Каждый рассмотренный вариант («JPA/Hibernate», «MyBatis-Plus») и каждое следствие основаны на реальном блоке зависимостей `build.gradle`.

</details>

---

## Quick Start

**Предварительные требования:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) установлен и аутентифицирован.

```bash
# 1. Перейдите в корень проекта
cd my-spring-boot-project

# 2. Запустите init (анализирует код и просит Claude написать rules)
npx claudeos-core init

# 3. Готово. Откройте Claude Code и начните кодить — rules уже загружены.
```

**Что вы получаете** после завершения `init`:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code загружает автоматически
│       ├── 00.core/              (общие rules — именование, архитектура)
│       ├── 10.backend/           (backend stack rules, если есть)
│       ├── 20.frontend/          (frontend stack rules, если есть)
│       ├── 30.security-db/       (конвенции безопасности и БД)
│       ├── 40.infra/             (env, логирование, CI/CD)
│       ├── 50.sync/              (напоминания о синхронизации документации — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (rules по доменам, type = backend|frontend)
│       └── 80.verification/      (стратегия тестирования + напоминания о верификации сборки)
├── claudeos-core/
│   ├── standard/                 ← Справочные документы (зеркалят структуру категорий)
│   │   ├── 00.core/              (обзор проекта, архитектура, именование)
│   │   ├── 10.backend/           (backend reference — если backend stack)
│   │   ├── 20.frontend/          (frontend reference — если frontend stack)
│   │   ├── 30.security-db/       (security & DB reference)
│   │   ├── 40.infra/             (env / логирование / CI-CD reference)
│   │   ├── 70.domains/{type}/    (reference по доменам)
│   │   ├── 80.verification/      (build / startup / testing reference — standard only)
│   │   └── 90.optional/          (специфика стека — standard only)
│   ├── skills/                   (повторно используемые паттерны, которые Claude может применить)
│   ├── guide/                    (how-to гайды для типовых задач)
│   ├── database/                 (обзор схемы, гайд по миграциям)
│   ├── mcp-guide/                (заметки по интеграции MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (индекс, который Claude читает первым)
```

Категории, разделяющие одинаковый числовой prefix между `rules/` и `standard/`, представляют одну и ту же концептуальную область (например, `10.backend` rules ↔ `10.backend` standards). Категории только-для-rules: `50.sync` (напоминания о синхронизации документации) и `60.memory` (Pass 4 memory). Категория только-для-standard: `90.optional` (специфика стека без принуждения). Все остальные prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`) присутствуют И в `rules/`, И в `standard/`. Теперь Claude Code знает ваш проект.

---

## Кому это подходит?

| Если вы... | Боль, которую это снимает |
|---|---|
| **Соло-разработчик**, начинающий новый проект с Claude Code | «Учить Claude нашим конвенциям каждую сессию» — больше нет. `CLAUDE.md` + 8-категорийные `.claude/rules/` сгенерированы за один проход. |
| **Тимлид**, поддерживающий общие стандарты в нескольких repo | `.claude/rules/` расходятся по мере того, как люди переименовывают пакеты, меняют ORM или response wrapper. ClaudeOS-Core пере-синхронизирует детерминированно — один и тот же вход → byte-identical вывод, без diff-шума. |
| **Уже использующий Claude Code**, но устал править генерируемый код | Неправильный response wrapper, неправильный layout пакетов, JPA вместо MyBatis, `try/catch` повсюду, когда у вас централизованный middleware. Scanner извлекает ваши реальные конвенции; каждый pass Claude работает с явным path allowlist. |
| **Onboarding на новый repo** (существующий проект, вход в команду) | Запустите `init` на repo и получите живую architecture map: stack-таблица в CLAUDE.md, rules по слоям с примерами ✅/❌, decision log, заполненный «почему» за крупными выборами (JPA vs MyBatis, REST vs GraphQL и т. д.). Прочитать 5 файлов лучше, чем 5000 файлов исходников. |
| **Работающий на корейском / японском / китайском / ещё 7 языках** | Большинство генераторов rules для Claude Code — только английский. ClaudeOS-Core пишет полный набор на **10 языках** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) с **byte-identical структурной валидацией** — одинаковый verdict `claude-md-validator` независимо от языка вывода. |
| **Работающий на monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend- и frontend-домены анализируются в одном запуске разными промптами; `apps/*/` и `packages/*/` обходятся автоматически; per-stack rules emit-ятся под `70.domains/{type}/`. |
| **Контрибьютор OSS или экспериментатор** | Вывод gitignore-friendly — `claudeos-core/` это ваш локальный рабочий каталог, отправлять нужно только `CLAUDE.md` + `.claude/`. Resume-safe при прерывании; идемпотентно при повторных запусках (ваши ручные правки rules сохраняются без `--force`). |

**Не подходит, если:** вы хотите универсальный preset bundle из agents/skills/rules, который работает с первого дня без шага сканирования (см. [docs/ru/comparison.md](docs/ru/comparison.md) — что под какие задачи подходит), либо ваш проект пока не вписывается в один из [поддерживаемых стеков](#supported-stacks), либо вам нужен только один `CLAUDE.md` (встроенного `claude /init` достаточно — нет необходимости устанавливать ещё один инструмент).

---

## Как это работает?

ClaudeOS-Core инвертирует обычный workflow Claude Code:

```
Обычно:  Вы описываете проект → Claude угадывает ваш стек → Claude пишет docs
Здесь:   Код читает ваш стек → Код передаёт подтверждённые факты Claude → Claude пишет docs из фактов
```

Конвейер выполняется в **три стадии**, с кодом по обе стороны от LLM-вызова:

**1. Шаг A — Scanner (детерминированно, без LLM).** Node.js scanner обходит корень проекта, читает `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, парсит файлы `.env*` (с redaction чувствительных переменных вроде `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), классифицирует архитектурный паттерн (5 паттернов Java A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), обнаруживает домены и строит явный allowlist всех существующих путей к исходникам. Вывод: `project-analysis.json` — единственный source of truth для всего, что следует дальше.

**2. Шаг B — 4-Pass Claude конвейер (ограничен фактами шага A).**
- **Pass 1** читает репрезентативные файлы по группам доменов и извлекает ~50–100 конвенций на домен — response wrapper, logging library, error handling, naming convention, test pattern. Запускается один раз на группу доменов (`max 4 domains, 40 files per group`), так что context никогда не переполняется.
- **Pass 2** объединяет весь per-domain анализ в общую картину проекта и разрешает разногласия, выбирая доминирующую конвенцию.
- **Pass 3** пишет `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — разбит на стадии (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide), так что промпт каждой стадии помещается в context window LLM, даже когда `pass2-merged.json` большой. Sub-divides 3b/3c в batch-и по ≤15 доменов для проектов с ≥16 доменами.
- **Pass 4** заполняет L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) и добавляет универсальные scaffold rules. Pass 4 **запрещено модифицировать `CLAUDE.md`** — Section 8 Pass 3 авторитетна.

**3. Шаг C — Верификация (детерминированно, без LLM).** Пять validator-ов проверяют вывод:
- `claude-md-validator` — 25 структурных проверок `CLAUDE.md` (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant). Language-invariant: тот же verdict независимо от `--lang`.
- `content-validator` — 10 content-проверок, включая path-claim верификацию (`STALE_PATH` ловит выдуманные ссылки `src/...`) и MANIFEST drift detection.
- `pass-json-validator` — well-formedness JSON Pass 1/2/3/4 + stack-aware section count.
- `plan-validator` — консистентность plan ↔ disk (legacy, в основном no-op с v2.1.0).
- `sync-checker` — консистентность регистраций disk ↔ `sync-map.json` по 7 отслеживаемым каталогам.

Три уровня severity (`fail` / `warn` / `advisory`), так что warning-и не блокируют CI на LLM-галлюцинациях, которые пользователь может починить вручную.

Инвариант, связывающий всё вместе: **Claude может цитировать только пути, реально существующие в вашем коде**, потому что шаг A передаёт ему конечный allowlist. Если LLM всё-таки попытается что-то выдумать (редко, но случается на определённых seed), шаг C ловит это до отправки docs.

Подробности по pass-ам, marker-based resume, обходной путь staged-rules для блока чувствительных путей `.claude/` в Claude Code и внутренности обнаружения стека — см. [docs/ru/architecture.md](docs/ru/architecture.md).

---

## Supported Stacks

12 стеков, автоматически определяемых по файлам вашего проекта:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack проекты (например, Spring Boot backend + Next.js frontend) работают «из коробки».

Правила обнаружения и то, что извлекает каждый сканер, см. в [docs/ru/stacks.md](docs/ru/stacks.md).

---

## Повседневный workflow

Три команды покрывают ~95% использования:

```bash
# Первый раз на проекте
npx claudeos-core init

# После того как вы вручную отредактировали standards или rules
npx claudeos-core lint

# Health-check (запускайте перед коммитом или в CI)
npx claudeos-core health
```

Ещё две — для обслуживания memory layer:

```bash
# Компактация лога failure-patterns (запускайте периодически)
npx claudeos-core memory compact

# Продвижение частых failure pattern в предложенные rules
npx claudeos-core memory propose-rules
```

Полные опции каждой команды см. в [docs/ru/commands.md](docs/ru/commands.md).

---

## Чем это отличается

Большинство инструментов документации Claude Code генерируют по описанию (вы рассказываете инструменту, инструмент рассказывает Claude). ClaudeOS-Core генерирует из вашего реального исходного кода (инструмент читает, инструмент сообщает Claude, что подтверждено, Claude пишет только подтверждённое).

Три конкретных следствия:

1. **Детерминированное обнаружение стека.** Тот же проект + тот же код = тот же вывод. Никакого «Claude в этот раз бросил кубик иначе».
2. **Никаких выдуманных путей.** Промпт Pass 3 явно перечисляет каждый разрешённый путь к исходникам; Claude не может процитировать несуществующий путь.
3. **Multi-stack-aware.** Backend и frontend домены используют разные analysis prompts в одном запуске.

Бок о бок сравнение scope с другими инструментами см. в [docs/ru/comparison.md](docs/ru/comparison.md). Сравнение про **что делает каждый инструмент**, а не **что лучше** — большинство дополняют друг друга.

---

## Верификация (post-generation)

После того как Claude напишет docs, код их проверяет. Пять отдельных validator:

| Validator | Что проверяет | Запускается через |
|---|---|---|
| `claude-md-validator` | Структурные инварианты CLAUDE.md (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Реальное существование заявленных путей; согласованность manifest | `health` (advisory) |
| `pass-json-validator` | Выводы Pass 1 / 2 / 3 / 4 — well-formed JSON | `health` (warn) |
| `plan-validator` | Сохранённый plan совпадает с тем, что на диске | `health` (fail-on-error) |
| `sync-checker` | Файлы на диске совпадают с регистрациями `sync-map.json` (детекция orphaned/unregistered) | `health` (fail-on-error) |

`health-checker` оркестрирует четыре runtime-validator с трёхуровневой severity (fail / warn / advisory) и завершается с подходящим кодом для CI. `claude-md-validator` запускается отдельно через команду `lint`, поскольку структурный drift — это сигнал переинициализации, а не мягкое предупреждение. Запускайте в любой момент:

```bash
npx claudeos-core health
```

Подробное описание проверок каждого validator см. в [docs/ru/verification.md](docs/ru/verification.md).

---

## Memory Layer (опционально, для долгоживущих проектов)

Начиная с v2.0, ClaudeOS-Core пишет папку `claudeos-core/memory/` с четырьмя файлами:

- `decision-log.md` — append-only «почему мы выбрали X вместо Y»
- `failure-patterns.md` — повторяющиеся ошибки с оценками frequency/importance
- `compaction.md` — как memory автоматически компактируется со временем
- `auto-rule-update.md` — паттерны, которые должны стать новыми rules

Можно запустить `npx claudeos-core memory propose-rules`, чтобы попросить Claude изучить недавние failure patterns и предложить новые rules.

Модель memory и жизненный цикл см. в [docs/ru/memory-layer.md](docs/ru/memory-layer.md).

---

## FAQ

**В: Нужен ли мне Claude API ключ?**
О: Нет. ClaudeOS-Core использует ваш существующий Claude Code — он отправляет промпты в `claude -p` на вашей машине. Никаких дополнительных аккаунтов.

**В: Перезапишет ли это мой существующий CLAUDE.md или `.claude/rules/`?**
О: Первый запуск на свежем проекте: создаёт. Перезапуск без `--force` сохраняет ваши правки — pass-маркеры предыдущего запуска обнаруживаются, и pass-ы пропускаются. Перезапуск с `--force` стирает и регенерирует всё (ваши правки теряются — в этом и смысл `--force`). См. [docs/ru/safety.md](docs/ru/safety.md).

**В: Мой стек не поддерживается. Можно добавить?**
О: Да. Новый стек требует ~3 prompt-шаблона + domain scanner. См. [CONTRIBUTING.md](CONTRIBUTING.md) — гайд из 8 шагов.

**В: Как сгенерировать docs на корейском (или другом языке)?**
О: `npx claudeos-core init --lang ko`. Поддерживается 10 языков: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**В: Работает ли это с monorepo?**
О: Да — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) и npm/yarn workspaces (`package.json#workspaces`) определяются stack-detector. Каждое приложение получает собственный анализ. Другие layout monorepo (например, NX) специально не определяются, но универсальные паттерны `apps/*/` и `packages/*/` всё равно подбираются per-stack сканерами.

**В: Что, если Claude Code сгенерирует rules, с которыми я не согласен?**
О: Редактируйте напрямую. Затем запустите `npx claudeos-core lint`, чтобы убедиться, что CLAUDE.md по-прежнему структурно валиден. Ваши правки сохраняются при последующих запусках `init` (без `--force`) — механизм resume пропускает pass-ы, у которых есть маркеры.

**В: Куда сообщать о багах?**
О: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). По вопросам безопасности — [SECURITY.md](SECURITY.md).

---

## Документация

| Тема | Читать |
|---|---|
| Как работает 4-pass конвейер (глубже, чем диаграмма) | [docs/ru/architecture.md](docs/ru/architecture.md) |
| Визуальные диаграммы (Mermaid) архитектуры | [docs/ru/diagrams.md](docs/ru/diagrams.md) |
| Обнаружение стека — что ищет каждый сканер | [docs/ru/stacks.md](docs/ru/stacks.md) |
| Memory layer — decision logs и failure patterns | [docs/ru/memory-layer.md](docs/ru/memory-layer.md) |
| Все 5 validator подробно | [docs/ru/verification.md](docs/ru/verification.md) |
| Все CLI-команды и опции | [docs/ru/commands.md](docs/ru/commands.md) |
| Ручная установка (без `npx`) | [docs/ru/manual-installation.md](docs/ru/manual-installation.md) |
| Override-ы сканера — `.claudeos-scan.json` | [docs/ru/advanced-config.md](docs/ru/advanced-config.md) |
| Безопасность: что сохраняется при re-init | [docs/ru/safety.md](docs/ru/safety.md) |
| Сравнение со схожими инструментами (scope, не качество) | [docs/ru/comparison.md](docs/ru/comparison.md) |
| Ошибки и восстановление | [docs/ru/troubleshooting.md](docs/ru/troubleshooting.md) |

---

## Вклад в проект

Вклад приветствуется — добавление поддержки стека, улучшение промптов, исправление багов. См. [CONTRIBUTING.md](CONTRIBUTING.md).

Кодекс поведения и политику безопасности см. в [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) и [SECURITY.md](SECURITY.md).

## Лицензия

[ISC](LICENSE) — свободно для любого использования, включая коммерческое.

---

<sub>Создано с заботой [@claudeos-core](https://github.com/claudeos-core). Если это сэкономило вам время, ⭐ на GitHub помогает сохранять видимость проекта.</sub>
