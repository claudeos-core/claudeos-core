# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Deterministic CLI, который автоматически генерирует `CLAUDE.md` + `.claude/rules/` из вашего реального исходного кода — Node.js scanner + 4-pass Claude pipeline + 5 validator. 12 stack, 10 языков, никаких invented path.**

```bash
npx claudeos-core init
```

Работает на [**12 stack**](#supported-stacks) (включая monorepo) — одна команда, без конфигурации, resume-safe, idempotent.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Что это?

Claude Code в каждой сессии откатывается на framework-значения по умолчанию. Ваша команда использует **MyBatis**, а Claude пишет JPA. Ваш wrapper — это `ApiResponse.ok()`, а Claude пишет `ResponseEntity.success()`. Ваши пакеты организованы layer-first, а Claude генерирует domain-first. Ручное написание `.claude/rules/` для каждого репозитория решает проблему — пока код не эволюционирует и ваши правила не начнут drift.

**ClaudeOS-Core регенерирует их детерминированно, из вашего реального исходного кода.** Сначала читает Node.js scanner (stack, ORM, package layout, пути к файлам). Затем 4-pass Claude pipeline пишет полный набор — `CLAUDE.md` + автоматически загружаемые `.claude/rules/` + standards + skills — ограниченный явным path allowlist, из которого LLM не может вырваться. Пять validator проверяют результат до того, как он будет отгружен.

Итог: тот же вход → byte-identical вывод, на любом из 10 языков, без invented path. (Подробности ниже в [В чём отличие](#в-чём-отличие).)

Для долгосрочных проектов засевается отдельный [Memory Layer](#memory-layer-опционально-для-долгосрочных-проектов).

---

## Посмотреть на реальном проекте

Запуск на [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Результат: **75 generated files**, общее время **53 минуты**, все validator ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Вывод терминала (текстовая версия, для поиска и копирования)</strong></summary>

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
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
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
<summary><strong>Что попадает в ваш <code>CLAUDE.md</code> (реальный фрагмент — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

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

Все значения выше — точные dependency-координаты, имя файла `dev.db`, имя миграции `V1__create_tables.sql`, "no JPA" — извлечены scanner из `build.gradle` / `application.properties` / дерева исходников до того, как Claude напишет файл. Ничего не угадывается.

</details>

<details>
<summary><strong>Реальное автоматически загружаемое rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

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

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

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

Glob `paths: ["**/*"]` означает, что Claude Code автоматически загружает это rule всякий раз, когда вы редактируете любой файл в проекте. Каждое имя класса, путь пакета и exception handler в rule приходят напрямую из отсканированного исходного кода — включая реальные `CustomizeExceptionHandler` и `JacksonCustomizations` проекта.

</details>

<details>
<summary><strong>Автоматически сгенерированный seed для <code>decision-log.md</code> (реальный фрагмент)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 засевает `decision-log.md` архитектурными решениями, извлечёнными из `pass2-merged.json`, чтобы будущие сессии помнили *почему* кодовая база выглядит так, как выглядит — а не только *как* она выглядит. Каждая опция ("JPA/Hibernate", "MyBatis-Plus") и каждое последствие основаны на реальном dependency-блоке `build.gradle`.

</details>

---

## Протестировано на

ClaudeOS-Core поставляется с reference-бенчмарками на реальных OSS-проектах. Если вы использовали его на публичном репозитории, пожалуйста, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) — мы добавим его в эту таблицу.

| Проект | Stack | Scanned → Generated | Статус |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ все 5 validator пройдены |

---

## Быстрый старт

**Требования:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) установлен и аутентифицирован.

```bash
# 1. Перейдите в корень вашего проекта
cd my-spring-boot-project

# 2. Запустите init (это проанализирует код и попросит Claude написать rules)
npx claudeos-core init

# 3. Готово. Откройте Claude Code и начинайте писать код — ваши rules уже загружены.
```

**Что вы получаете** после завершения `init`:

```
your-project/
├── .claude/
│   └── rules/                    ← Автоматически загружается Claude Code
│       ├── 00.core/              (общие rules — нейминг, архитектура)
│       ├── 10.backend/           (backend stack rules, если есть)
│       ├── 20.frontend/          (frontend stack rules, если есть)
│       ├── 30.security-db/       (соглашения по безопасности и БД)
│       ├── 40.infra/             (env, логирование, CI/CD)
│       ├── 50.sync/              (напоминания о doc-sync — только rules)
│       ├── 60.memory/            (memory rules — Pass 4, только rules)
│       ├── 70.domains/{type}/    (rules по доменам, type = backend|frontend)
│       └── 80.verification/      (стратегия тестирования + напоминания о build verification)
├── claudeos-core/
│   ├── standard/                 ← Reference-документы (зеркалят структуру категорий)
│   │   ├── 00.core/              (обзор проекта, архитектура, нейминг)
│   │   ├── 10.backend/           (backend reference — если есть backend stack)
│   │   ├── 20.frontend/          (frontend reference — если есть frontend stack)
│   │   ├── 30.security-db/       (reference по безопасности и БД)
│   │   ├── 40.infra/             (env / логирование / CI-CD reference)
│   │   ├── 70.domains/{type}/    (reference по доменам)
│   │   ├── 80.verification/      (build / startup / testing reference — только standard)
│   │   └── 90.optional/          (стек-специфичные дополнения — только standard)
│   ├── skills/                   (повторно используемые паттерны, которые Claude может применять)
│   ├── guide/                    (how-to гайды для типовых задач)
│   ├── database/                 (обзор схемы, гайд по миграциям)
│   ├── mcp-guide/                (заметки об интеграции MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (индекс, который Claude читает первым)
```

Категории, разделяющие один и тот же числовой prefix между `rules/` и `standard/`, представляют одну и ту же концептуальную область (например, `10.backend` rules ↔ `10.backend` standards). Только-rules категории: `50.sync` (напоминания о doc sync) и `60.memory` (Pass 4 memory). Только-standard категория: `90.optional` (стек-специфичные дополнения без enforcement). Все остальные prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`) встречаются и в `rules/`, и в `standard/`. Теперь Claude Code знает ваш проект.

---

## Кому это нужно?

| Вы... | Какую боль это убирает |
|---|---|
| **Solo-разработчик**, начинающий новый проект с Claude Code | "Учить Claude моим соглашениям каждую сессию" — ушло. `CLAUDE.md` + 8-категорийные `.claude/rules/` генерируются за один проход. |
| **Тимлид**, поддерживающий общие стандарты по разным репозиториям | `.claude/rules/` дрейфуют, когда люди переименовывают пакеты, переключают ORM или меняют response wrapper. ClaudeOS-Core re-sync-ит детерминированно — тот же вход, byte-identical вывод, без diff-шума. |
| **Уже использует Claude Code**, но устал чинить сгенерированный код | Неправильный response wrapper, неправильный package layout, JPA вместо вашего MyBatis, разбросанный `try/catch` там, где у вас централизованный middleware. Scanner извлекает ваши реальные соглашения; каждый Claude pass работает против явного path allowlist. |
| **Onboarding в новый репо** (существующий проект, присоединение к команде) | Запустите `init` на репозитории, получите живую карту архитектуры: stack-таблица в CLAUDE.md, rules по слоям с ✅/❌ примерами, decision log, засеянный "почему" за крупными решениями (JPA vs MyBatis, REST vs GraphQL и т.д.). Прочитать 5 файлов лучше, чем читать 5,000 файлов исходников. |
| **Работаете на корейском / японском / китайском / ещё 7 языках** | Большинство генераторов rules для Claude Code только на английском. ClaudeOS-Core пишет полный набор на **10 языках** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) с **byte-identical structural validation** — тот же вердикт `claude-md-validator` независимо от языка вывода. |
| **Работаете в monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend + frontend домены анализируются за один прогон с отдельными prompt; `apps/*/` и `packages/*/` обходятся автоматически; стек-специфичные rules emit-ятся под `70.domains/{type}/`. |
| **Контрибьютите в OSS или экспериментируете** | Вывод gitignore-friendly — `claudeos-core/` это ваша локальная рабочая dir, отгружать нужно только `CLAUDE.md` + `.claude/`. Resume-safe при прерывании; idempotent при повторном запуске (ваши ручные правки в rules сохраняются без `--force`). |

**Не подходит, если:** вам нужен one-size-fits-all preset bundle agents/skills/rules, который работает с первого дня без шага сканирования (см. [docs/ru/comparison.md](docs/ru/comparison.md), что куда подходит); ваш проект пока не соответствует ни одному из [поддерживаемых stack](#supported-stacks); или вам нужен только один `CLAUDE.md` (встроенного `claude /init` достаточно — нет нужды устанавливать ещё один инструмент).

---

## Как это работает?

ClaudeOS-Core инвертирует обычный workflow Claude Code:

```
Обычно:    Вы описываете проект → Claude угадывает ваш stack → Claude пишет docs
Здесь:     Код читает ваш stack → Код передаёт подтверждённые факты Claude → Claude пишет docs из фактов
```

Pipeline выполняется в **три этапа**, с кодом по обе стороны вызова LLM:

**1. Step A — Scanner (deterministic, без LLM).** Node.js scanner обходит корень проекта, читает `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, парсит файлы `.env*` (с redaction чувствительных переменных `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), классифицирует архитектурный паттерн (5 паттернов Java A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), обнаруживает домены и строит явный allowlist всех существующих путей к исходным файлам. Вывод: `project-analysis.json` — единственный source of truth для последующих шагов.

**2. Step B — 4-Pass Claude pipeline (ограничен фактами Step A).**
- **Pass 1** читает репрезентативные файлы по группам доменов и извлекает ~50–100 соглашений на домен — response wrapper, библиотеки логирования, обработка ошибок, соглашения по неймингу, паттерны тестов. Запускается один раз на группу доменов (`max 4 domains, 40 files per group`), так что context никогда не переполняется.
- **Pass 2** объединяет весь анализ по доменам в общую картину проекта и разрешает разногласия, выбирая доминирующее соглашение.
- **Pass 3** пишет `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — разбит на этапы (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide), так что prompt каждого этапа помещается в context window LLM, даже когда `pass2-merged.json` большой. Sub-divid-ит 3b/3c в batch по ≤15 доменов для проектов с ≥16 доменами.
- **Pass 4** засевает L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) и добавляет универсальные scaffold rules. Pass 4 **запрещено модифицировать `CLAUDE.md`** — Section 8 от Pass 3 авторитетна.

**3. Step C — Verification (deterministic, без LLM).** Пять validator проверяют вывод:
- `claude-md-validator` — 25 структурных проверок `CLAUDE.md` (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant). Language-invariant: тот же вердикт независимо от `--lang`.
- `content-validator` — 10 content-проверок, включая верификацию path-claim (`STALE_PATH` ловит выдуманные ссылки `src/...`) и обнаружение MANIFEST drift.
- `pass-json-validator` — корректность JSON-вывода Pass 1/2/3/4 + stack-aware подсчёт секций.
- `plan-validator` — согласованность plan ↔ disk (legacy, в основном no-op с v2.1.0).
- `sync-checker` — согласованность регистрации disk ↔ `sync-map.json` по 7 отслеживаемым директориям.

Три уровня severity (`fail` / `warn` / `advisory`), так что warning никогда не блокируют CI из-за hallucination LLM, которые пользователь может починить вручную.

Связующий инвариант: **Claude может цитировать только пути, которые реально существуют в вашем коде**, потому что Step A передаёт ему конечный allowlist. Если LLM всё-таки пытается что-то выдумать (редко, но случается на определённых seed), Step C ловит это до отгрузки docs.

Подробности по этапам, marker-based resume, обходной путь staged-rules для блока чувствительных путей `.claude/` в Claude Code, и внутренности stack detection — см. [docs/ru/architecture.md](docs/ru/architecture.md).

---

## Supported Stacks

12 stack, авто-определяются из файлов вашего проекта:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack проекты (например, Spring Boot backend + Next.js frontend) работают из коробки.

Правила определения и что извлекает каждый scanner — см. [docs/ru/stacks.md](docs/ru/stacks.md).

---

## Ежедневный рабочий процесс

Три команды покрывают ~95% использования:

```bash
# Первый раз на проекте
npx claudeos-core init

# После того, как вы вручную отредактировали standards или rules
npx claudeos-core lint

# Health check (запускайте перед коммитами или в CI)
npx claudeos-core health
```

Полные опции каждой команды — см. [docs/ru/commands.md](docs/ru/commands.md). Команды memory layer (`memory compact`, `memory propose-rules`) описаны в секции [Memory Layer](#memory-layer-опционально-для-долгосрочных-проектов) ниже.

---

## В чём отличие

Большинство инструментов документации Claude Code генерируют из описания (вы говорите инструменту, инструмент говорит Claude). ClaudeOS-Core генерирует из вашего реального исходного кода (инструмент читает, инструмент сообщает Claude, что подтверждено, Claude пишет только подтверждённое).

Три конкретных следствия:

1. **Deterministic stack detection.** Тот же проект + тот же код = тот же вывод. Никаких "Claude в этот раз бросил кости иначе".
2. **No invented paths.** Pass 3 prompt явно перечисляет каждый разрешённый путь к исходникам; Claude не может цитировать пути, которых не существует.
3. **Multi-stack aware.** Backend и frontend домены используют разные prompt анализа в одном прогоне.

Side-by-side сравнение по scope с другими инструментами — см. [docs/ru/comparison.md](docs/ru/comparison.md). Сравнение о том, **что делает каждый инструмент**, а не **какой лучше** — большинство дополняют друг друга.

---

## Проверка (после генерации)

После того, как Claude написал docs, код их верифицирует. Пять отдельных validator:

| Validator | Что проверяет | Запускается |
|---|---|---|
| `claude-md-validator` | Структурные инварианты CLAUDE.md (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Реально ли существуют path-утверждения; согласованность manifest | `health` (advisory) |
| `pass-json-validator` | Хорошо ли сформированы JSON-выводы Pass 1 / 2 / 3 / 4 | `health` (warn) |
| `plan-validator` | Совпадает ли сохранённый plan с тем, что на диске | `health` (fail-on-error) |
| `sync-checker` | Совпадают ли файлы на диске с регистрациями `sync-map.json` (детекция orphaned/unregistered) | `health` (fail-on-error) |

`health-checker` оркестрирует четыре runtime validator с трёхуровневой severity (fail / warn / advisory) и завершается с подходящим кодом для CI. `claude-md-validator` запускается отдельно через команду `lint`, потому что структурный drift — это сигнал re-init, а не soft warning. Запускайте в любое время:

```bash
npx claudeos-core health
```

Подробности проверок каждого validator — см. [docs/ru/verification.md](docs/ru/verification.md).

---

## Memory Layer (опционально, для долгосрочных проектов)

Помимо описанного выше scaffolding pipeline, ClaudeOS-Core засевает папку `claudeos-core/memory/` для проектов, где context переживает одну сессию. Это опционально — можете игнорировать, если вам нужны только `CLAUDE.md` + rules.

Четыре файла, все пишутся Pass 4:

- `decision-log.md` — append-only "почему мы выбрали X вместо Y", засеян из `pass2-merged.json`
- `failure-patterns.md` — повторяющиеся ошибки с оценками frequency/importance
- `compaction.md` — как memory автоматически компактируется со временем
- `auto-rule-update.md` — паттерны, которые должны стать новыми rules

Две команды поддерживают этот слой со временем:

```bash
# Компактировать лог failure-patterns (запускайте периодически)
npx claudeos-core memory compact

# Продвинуть частые failure-паттерны в предложенные rules
npx claudeos-core memory propose-rules
```

Модель memory и lifecycle — см. [docs/ru/memory-layer.md](docs/ru/memory-layer.md).

---

## FAQ

**Q: Нужен ли мне Claude API-ключ?**
A: Нет. ClaudeOS-Core использует вашу существующую установку Claude Code — он передаёт prompt в `claude -p` на вашей машине. Дополнительные аккаунты не нужны.

**Q: Перезапишет ли это мой существующий CLAUDE.md или `.claude/rules/`?**
A: Первый запуск на новом проекте: создаёт их. Повторный запуск без `--force` сохраняет ваши правки — pass-маркеры предыдущего запуска обнаруживаются и passes пропускаются. Повторный запуск с `--force` стирает и регенерирует всё (ваши правки теряются — это и есть смысл `--force`). См. [docs/ru/safety.md](docs/ru/safety.md).

**Q: Мой stack не поддерживается. Могу ли я добавить?**
A: Да. Новые stack требуют ~3 prompt-шаблона + domain scanner. См. [CONTRIBUTING.md](CONTRIBUTING.md) с гайдом из 8 шагов.

**Q: Как сгенерировать docs на корейском (или другом языке)?**
A: `npx claudeos-core init --lang ko`. Поддерживается 10 языков: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: Работает ли это с monorepo?**
A: Да — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) и npm/yarn workspaces (`package.json#workspaces`) определяются stack-detector. Каждое приложение получает свой анализ. Другие layout monorepo (например, NX) не определяются специально, но общие паттерны `apps/*/` и `packages/*/` всё равно подхватываются стек-специфичными scanner.

**Q: Что если Claude Code сгенерирует rules, с которыми я не согласен?**
A: Редактируйте их напрямую. Затем запустите `npx claudeos-core lint`, чтобы убедиться, что CLAUDE.md по-прежнему структурно валиден. Ваши правки сохраняются при последующих запусках `init` (без `--force`) — механизм resume пропускает passes, чьи маркеры существуют.

**Q: Куда сообщать о багах?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). По вопросам безопасности — см. [SECURITY.md](SECURITY.md).

---

## Если это сэкономило вам время

⭐ на GitHub поддерживает видимость проекта и помогает другим его найти. Issue, PR и контрибьюшены stack-шаблонов приветствуются — см. [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Документация

| Тема | Читать здесь |
|---|---|
| Как работает 4-pass pipeline (глубже, чем диаграмма) | [docs/ru/architecture.md](docs/ru/architecture.md) |
| Визуальные диаграммы архитектуры (Mermaid) | [docs/ru/diagrams.md](docs/ru/diagrams.md) |
| Stack detection — что ищет каждый scanner | [docs/ru/stacks.md](docs/ru/stacks.md) |
| Memory layer — decision log и failure patterns | [docs/ru/memory-layer.md](docs/ru/memory-layer.md) |
| Все 5 validator подробно | [docs/ru/verification.md](docs/ru/verification.md) |
| Каждая CLI-команда и опция | [docs/ru/commands.md](docs/ru/commands.md) |
| Ручная установка (без `npx`) | [docs/ru/manual-installation.md](docs/ru/manual-installation.md) |
| Scanner overrides — `.claudeos-scan.json` | [docs/ru/advanced-config.md](docs/ru/advanced-config.md) |
| Безопасность: что сохраняется при re-init | [docs/ru/safety.md](docs/ru/safety.md) |
| Сравнение со схожими инструментами (scope, не качество) | [docs/ru/comparison.md](docs/ru/comparison.md) |
| Ошибки и восстановление | [docs/ru/troubleshooting.md](docs/ru/troubleshooting.md) |

---

## Участие в проекте

Контрибьюшены приветствуются — добавление поддержки stack, улучшение prompt, исправление багов. См. [CONTRIBUTING.md](CONTRIBUTING.md).

Кодекс поведения и политика безопасности — см. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) и [SECURITY.md](SECURITY.md).

## Лицензия

[ISC License](LICENSE). Свободно для любого использования, включая коммерческое. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Поддерживается командой [claudeos-core](https://github.com/claudeos-core). Issue и PR на <https://github.com/claudeos-core/claudeos-core>.</sub>
