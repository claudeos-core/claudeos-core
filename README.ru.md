# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**CLI-инструмент, который читает реальный исходный код вашего проекта и на его основе сам собирает `CLAUDE.md` и `.claude/rules/`. Внутри: сканер на Node.js, четырёхпроходный пайплайн на базе Claude и пять валидаторов. Поддерживаются 12 стеков и 10 языков, а пути, которых нет в коде, инструмент не выдумывает.**

```bash
npx claudeos-core init
```

Работает на [**12 стеках**](#supported-stacks), включая монорепозитории. Одна команда без конфигурации, безопасная при прерывании, идемпотентная при повторных запусках.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Что это?

В каждой новой сессии Claude Code откатывается к дефолтам фреймворка. Команда сидит на **MyBatis**, а Claude всё равно пишет JPA. В коде обёртка `ApiResponse.ok()`, а Claude подставляет `ResponseEntity.success()`. Пакеты разложены по слоям, а Claude собирает структуру по доменам. Можно, конечно, написать `.claude/rules/` руками для каждого репозитория — только код развивается, и правила почти сразу отстают от реальности.

**ClaudeOS-Core пересобирает их предсказуемо, прямо из исходного кода проекта.** Сначала сканер на Node.js разбирает проект и вытаскивает стек, ORM, раскладку пакетов, реальные пути к файлам. Затем четырёхпроходный пайплайн на Claude пишет полный комплект документации: `CLAUDE.md`, автоматически подгружаемые `.claude/rules/`, стандарты, навыки. Всё это происходит строго внутри явного allowlist путей — за его пределы LLM выйти не может. И прежде чем результат окажется у вас, его проверяют пять валидаторов.

В итоге одинаковый вход даёт побайтово одинаковый выход на любом из 10 языков, а пути, которых нет в коде, в документации не появляются. Подробности — ниже, в разделе [В чём отличие](#в-чём-отличие).

Для долгоживущих проектов рядом разворачивается [Memory Layer](#memory-layer-опционально-для-долгосрочных-проектов).

---

## Посмотреть на реальном проекте

Прогнали на [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app): Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 исходных файлов. На выходе — **75 сгенерированных файлов** за **53 минуты**, все валидаторы зелёные ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Вывод терминала (текстовая версия для поиска и копирования)</strong></summary>

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
<summary><strong>Что в итоге попадает в ваш <code>CLAUDE.md</code> (реальный фрагмент — Section 1 + 2)</strong></summary>

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

Каждое значение в этой таблице — точные координаты зависимостей, имя файла `dev.db`, название миграции `V1__create_tables.sql`, пометка «no JPA» — сканер вычитал из `build.gradle`, `application.properties` и дерева исходников ещё до того, как Claude взялся за файл. Ничего не угадано.

</details>

<details>
<summary><strong>Реальное автоматически подгружаемое правило (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

Глоб `paths: ["**/*"]` означает, что Claude Code будет автоматически подтягивать это правило при редактировании любого файла в проекте. Имена классов, пакеты и обработчики исключений в правиле взяты прямо из просканированных исходников, поэтому в нём фигурируют реальные `CustomizeExceptionHandler` и `JacksonCustomizations` именно из этого проекта.

</details>

<details>
<summary><strong>Сид автоматически сгенерированного <code>decision-log.md</code> (реальный фрагмент)</strong></summary>

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

Pass 4 заранее засевает `decision-log.md` архитектурными решениями из `pass2-merged.json`. Так в следующих сессиях видно не только _как_ устроен код, но и _почему_ он устроен именно так. Альтернативы («JPA/Hibernate», «MyBatis-Plus») и их последствия — прямо из блока зависимостей `build.gradle`.

</details>

---

## Протестировано на

ClaudeOS-Core поставляется с эталонными бенчмарками на реальных open-source проектах. Если вы запускали инструмент на публичном репозитории, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues), и мы добавим запись в эту таблицу.

| Проект | Стек | Scanned → Generated | Статус |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ все 5 валидаторов прошли |

---

## Быстрый старт

**Что нужно заранее:** Node.js 18+, установленный и авторизованный [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# 1. Перейдите в корень проекта
cd my-spring-boot-project

# 2. Запустите init (разбирает код и поручает Claude написать правила)
npx claudeos-core init

# 3. Готово. Открывайте Claude Code и работайте — правила уже подгружены.
```

После того как `init` отработает, в проекте окажется примерно следующее:

```
your-project/
├── .claude/
│   └── rules/                    ← Подгружается Claude Code автоматически
│       ├── 00.core/              (общие правила — нейминг, архитектура)
│       ├── 10.backend/           (правила бэкенд-стека, если есть)
│       ├── 20.frontend/          (правила фронтенд-стека, если есть)
│       ├── 30.security-db/       (соглашения по безопасности и БД)
│       ├── 40.infra/             (env, логирование, CI/CD)
│       ├── 50.sync/              (напоминания о синхронизации документации — только rules)
│       ├── 60.memory/            (правила памяти — Pass 4, только rules)
│       ├── 70.domains/{type}/    (правила по доменам, type = backend|frontend)
│       └── 80.verification/      (стратегия тестирования + напоминания о проверке сборки)
├── claudeos-core/
│   ├── standard/                 ← Справочные документы (структура категорий зеркалит rules)
│   │   ├── 00.core/              (обзор проекта, архитектура, нейминг)
│   │   ├── 10.backend/           (справка по бэкенду — если есть бэкенд-стек)
│   │   ├── 20.frontend/          (справка по фронтенду — если есть фронтенд-стек)
│   │   ├── 30.security-db/       (справка по безопасности и БД)
│   │   ├── 40.infra/             (справка по env / логированию / CI-CD)
│   │   ├── 70.domains/{type}/    (справка по доменам)
│   │   ├── 80.verification/      (справка по сборке / запуску / тестам — только standard)
│   │   └── 90.optional/          (стек-специфичные дополнения — только standard)
│   ├── skills/                   (повторно используемые паттерны для Claude)
│   ├── guide/                    (how-to для типичных задач)
│   ├── database/                 (обзор схемы, гайд по миграциям)
│   ├── mcp-guide/                (заметки по интеграции с MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (индекс, который Claude читает первым)
```

Категории с одним и тем же числовым префиксом в `rules/` и `standard/` относятся к одной теме (например, правила `10.backend` ↔ стандарты `10.backend`). Только в rules живут `50.sync` (напоминания о синхронизации документации) и `60.memory` (память Pass 4). Только в standard — `90.optional` (стек-специфичные материалы без принудительного применения). Остальные префиксы (`00`, `10`, `20`, `30`, `40`, `70`, `80`) есть и там, и там. С этого момента Claude Code знает проект.

---

## Кому это нужно?

| Вы... | Какую боль это снимает |
|---|---|
| **Соло-разработчик**, начинающий новый проект на Claude Code | «Объяснять Claude свои соглашения каждую сессию» — больше не надо. `CLAUDE.md` и `.claude/rules/` из 8 категорий собираются за один проход. |
| **Тимлид**, отвечающий за общие стандарты в нескольких репозиториях | Правила в `.claude/rules/` устаревают, как только переименовываются пакеты, меняются ORM или обёртки ответов. ClaudeOS-Core пересобирает их детерминированно: на одном входе всегда побайтово одинаковый выход, поэтому в diff нет шума. |
| **Уже использует Claude Code**, но устал чинить сгенерированный код | Не та обёртка ответа, не та раскладка пакетов, JPA вместо MyBatis, `try/catch` россыпью при том, что в проекте есть централизованный middleware. Сканер достаёт ваши настоящие соглашения, а каждый проход Claude работает только в рамках явного allowlist путей. |
| **Подключается к новому репозиторию** (готовый проект, выход в команду) | Запустите `init` — и получите живую карту архитектуры: таблицу стека в CLAUDE.md, правила по слоям с примерами ✅/❌, decision log с ответом на вопрос «почему» по ключевым решениям (JPA vs MyBatis, REST vs GraphQL и т. д.). Прочитать пять файлов быстрее, чем пять тысяч исходников. |
| **Пишет на корейском, японском, китайском или ещё на 7 языках** | Большинство генераторов правил для Claude Code умеют только в английский. ClaudeOS-Core выпускает полный комплект на **10 языках** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) и применяет одинаковую структурную проверку независимо от языка вывода — `claude-md-validator` выдаёт один и тот же вердикт на всех. |
| **Работает с монорепозиторием** (Turborepo, pnpm/yarn workspaces, Lerna) | За один запуск разбираются и бэкенд, и фронтенд, причём с отдельными промптами. Каталоги `apps/*/` и `packages/*/` обходятся автоматически, а правила по стекам складываются в `70.domains/{type}/`. |
| **Контрибьютит в OSS или экспериментирует** | Результат удобно класть под gitignore: `claudeos-core/` — это локальная рабочая директория, а в репозиторий нужно отправлять только `CLAUDE.md` и `.claude/`. После прерывания запуск можно продолжить, повторный запуск безопасен (ваши ручные правки в правилах сохраняются без `--force`). |

**Скорее не подойдёт, если:** хочется готовый универсальный набор агентов, навыков и правил, который работает с первого дня без шага сканирования (что для каких задач подходит — см. [docs/ru/comparison.md](docs/ru/comparison.md)); ваш проект пока не попадает ни в один из [поддерживаемых стеков](#supported-stacks); нужен только один файл `CLAUDE.md` (тогда хватает встроенного `claude /init`, ставить ещё один инструмент незачем).

---

## Как это работает?

ClaudeOS-Core переворачивает привычный сценарий работы с Claude Code:

```
Обычно:    Вы описываете проект   → Claude угадывает стек     → Claude пишет документацию
Здесь:     Код читает ваш стек    → Код передаёт Claude факты → Claude пишет документацию по фактам
```

Пайплайн состоит из **трёх стадий**: детерминированный код стоит и до LLM, и после неё.

**1. Step A — Scanner (детерминированно, без LLM).** Сканер на Node.js обходит корень проекта, читает `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml`, разбирает файлы `.env*` (чувствительные переменные `PASSWORD/SECRET/TOKEN/JWT_SECRET/...` при этом редактируются), классифицирует архитектурный паттерн (5 паттернов Java A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), находит домены и собирает явный allowlist путей всех существующих исходных файлов. На выходе — `project-analysis.json`, единый источник истины для всех последующих шагов.

**2. Step B — четырёхпроходный пайплайн на Claude (опирается на факты из Step A).**
- **Pass 1** читает по группе доменов представительные файлы и достаёт по 50–100 соглашений на домен: обёртки ответов, библиотеки логирования, обработку ошибок, нейминг, паттерны тестов. Запускается по разу на каждую группу доменов (`max 4 domains, 40 files per group`), поэтому контекст не переполняется.
- **Pass 2** сводит результаты по доменам в общую картину проекта и при расхождениях оставляет преобладающее соглашение.
- **Pass 3** пишет `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, навыки и руководства. Работа разбита на этапы (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide), благодаря чему каждый промпт укладывается в окно контекста LLM, даже когда `pass2-merged.json` получился крупным. Если доменов 16 и больше, 3b/3c дополнительно дробятся на батчи по 15 доменов.
- **Pass 4** заполняет L4-слой памяти (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) и добавляет универсальные scaffold-правила. При этом Pass 4 **не имеет права трогать `CLAUDE.md`**: за этот файл отвечает Section 8 из Pass 3.

**3. Step C — Verification (детерминированно, без LLM).** Результат проверяют пять валидаторов:
- `claude-md-validator` — 25 структурных проверок `CLAUDE.md` (8 секций, количество H3/H4, уникальность memory-файлов, инвариант канонических заголовков T1). Не зависит от языка: вердикт одинаковый при любом `--lang`.
- `content-validator` — 10 контентных проверок, включая верификацию упоминаемых путей (`STALE_PATH` ловит выдуманные ссылки на `src/...`) и обнаружение дрейфа MANIFEST.
- `pass-json-validator` — корректность JSON выходов Pass 1/2/3/4 и количество секций с учётом стека.
- `plan-validator` — соответствие плана и состояния диска (легаси, начиная с v2.1.0 практически no-op).
- `sync-checker` — соответствие диска и регистраций в `sync-map.json` по 7 отслеживаемым каталогам.

Уровней важности три (`fail` / `warn` / `advisory`), поэтому предупреждения никогда не блокируют CI из-за галлюцинаций LLM, которые легко поправить руками.

Главный инвариант, на котором всё держится: **Claude может ссылаться только на пути, реально существующие в коде**, потому что на вход ему уходит конечный allowlist из Step A. Если LLM всё-таки попытается что-то выдумать (редко, но на отдельных запусках случается), Step C это перехватит ещё до того, как документация дойдёт до пользователя.

Подробности по каждому проходу, resume на маркерах, обходной механизм staged-rules для блокировки записи в `.claude/` со стороны Claude Code и внутренности детектора стеков — в [docs/ru/architecture.md](docs/ru/architecture.md).

---

## Supported Stacks

12 стеков, которые определяются автоматически по файлам проекта:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Многостековые проекты (например, Spring Boot на бэкенде и Next.js на фронтенде) поддерживаются из коробки.

Правила детекции и то, что вытаскивает каждый сканер, описаны в [docs/ru/stacks.md](docs/ru/stacks.md).

---

## Ежедневный рабочий процесс

Для примерно 95% случаев хватает трёх команд:

```bash
# Первый запуск на проекте
npx claudeos-core init

# После ручных правок в стандартах или правилах
npx claudeos-core lint

# Health-check (перед коммитом или в CI)
npx claudeos-core health
```

Полный список опций для каждой команды смотрите в [docs/ru/commands.md](docs/ru/commands.md). Команды слоя памяти (`memory compact`, `memory propose-rules`) разобраны ниже, в разделе [Memory Layer](#memory-layer-опционально-для-долгосрочных-проектов).

---

## В чём отличие

Большинство инструментов документации для Claude Code исходят из вашего описания: вы рассказываете инструменту, инструмент пересказывает Claude. ClaudeOS-Core идёт от исходного кода: инструмент читает код, передаёт Claude уже подтверждённые факты, а Claude пишет только то, что подтверждено.

На практике это даёт три конкретных эффекта:

1. **Детерминированная детекция стека.** Тот же проект и тот же код всегда дают тот же результат. Никаких «в этот раз Claude как-то иначе всё интерпретировал».
2. **Выдуманных путей не появляется.** В промпте Pass 3 явно перечислены все разрешённые пути в исходниках, поэтому Claude не может сослаться на то, чего нет.
3. **Учёт нескольких стеков сразу.** В рамках одного запуска бэкенд- и фронтенд-домены анализируются разными промптами.

Сравнение по охвату с другими инструментами есть в [docs/ru/comparison.md](docs/ru/comparison.md). Это сравнение про то, **что делает каждый инструмент**, а не про то, **какой из них лучше**: в большинстве случаев они дополняют друг друга.

---

## Проверка (после генерации)

Когда Claude закончил писать документацию, за дело снова берётся код и проверяет результат. Пять независимых валидаторов:

| Валидатор | Что проверяет | Кем запускается |
|---|---|---|
| `claude-md-validator` | Структурные инварианты CLAUDE.md (8 секций, не зависит от языка) | `claudeos-core lint` |
| `content-validator` | Реальное существование упоминаемых путей и согласованность manifest | `health` (advisory) |
| `pass-json-validator` | Корректность JSON выходов Pass 1 / 2 / 3 / 4 | `health` (warn) |
| `plan-validator` | Соответствие сохранённого плана состоянию диска | `health` (fail-on-error) |
| `sync-checker` | Соответствие файлов на диске записям в `sync-map.json` (поиск orphaned/unregistered) | `health` (fail-on-error) |

Четыре runtime-валидатора оркестрирует `health-checker` с тремя уровнями важности (fail / warn / advisory), а наружу отдаётся exit-код, удобный для CI. `claude-md-validator` вынесен в отдельную команду `lint`: структурный сдвиг — это сигнал к re-init, а не мягкое предупреждение. Запустить можно в любой момент:

```bash
npx claudeos-core health
```

Подробный список проверок каждого валидатора — в [docs/ru/verification.md](docs/ru/verification.md).

---

## Memory Layer (опционально, для долгосрочных проектов)

Кроме основного пайплайна, ClaudeOS-Core поднимает каталог `claudeos-core/memory/` — для проектов, где контекст должен жить дольше одной сессии. Слой опциональный: если хватает `CLAUDE.md` и правил, его можно спокойно игнорировать.

Внутри четыре файла, и все их пишет Pass 4:

- `decision-log.md` — append-only журнал «почему выбрали X, а не Y»; засевается из `pass2-merged.json`.
- `failure-patterns.md` — повторяющиеся ошибки с оценками frequency / importance.
- `compaction.md` — описание того, как память автоматически уплотняется со временем.
- `auto-rule-update.md` — паттерны, которые стоит превратить в новые правила.

Поддерживать слой со временем помогают две команды:

```bash
# Уплотнить лог failure-patterns (запускайте периодически)
npx claudeos-core memory compact

# Превратить часто встречающиеся failure-паттерны в предложенные правила
npx claudeos-core memory propose-rules
```

Модель памяти и её жизненный цикл подробно описаны в [docs/ru/memory-layer.md](docs/ru/memory-layer.md).

---

## FAQ

**Q: Нужен ли API-ключ Claude?**
A: Нет. ClaudeOS-Core использует уже установленный Claude Code и просто отправляет промпты в `claude -p` на вашей машине. Дополнительные аккаунты не нужны.

**Q: Перезапишет ли инструмент уже существующий CLAUDE.md или `.claude/rules/`?**
A: На чистом проекте создаст с нуля. При повторном запуске без `--force` правки сохраняются: инструмент находит маркеры предыдущих проходов и пропускает их. С `--force` всё стирается и собирается заново — правки исчезают, в этом и весь смысл флага. Подробнее — в [docs/ru/safety.md](docs/ru/safety.md).

**Q: Моего стека нет в списке. Можно добавить свой?**
A: Можно. На новый стек обычно нужны примерно три шаблона промптов и доменный сканер. Пошаговое руководство из 8 шагов есть в [CONTRIBUTING.md](CONTRIBUTING.md).

**Q: Как сгенерировать документацию на русском (или другом языке)?**
A: `npx claudeos-core init --lang ru`. Поддерживается 10 языков: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: Работает ли это с монорепозиториями?**
A: Да. Stack-detector распознаёт Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) и npm/yarn workspaces (`package.json#workspaces`); каждое приложение получает собственный анализ. Другие раскладки монорепо (например, NX) отдельно не детектируются, но привычные `apps/*/` и `packages/*/` стек-сканеры подхватят и так.

**Q: Что делать, если Claude Code сгенерировал правила, с которыми я не согласен?**
A: Правьте прямо в файлах. Потом запустите `npx claudeos-core lint` — он проверит, что структура CLAUDE.md осталась валидной. Правки переживут последующие запуски `init` без `--force`: механизм resume пропускает проходы, у которых уже есть маркеры.

**Q: Где сообщать о багах?**
A: В [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Вопросы безопасности — см. [SECURITY.md](SECURITY.md).

---

## Если это сэкономило вам время

⭐ на GitHub помогает проекту оставаться заметным и облегчает другим разработчикам его поиск. Issues, PR и шаблоны под новые стеки — приветствуются, подробности в [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Документация

| Тема | Где почитать |
|---|---|
| Как устроен 4-проходный пайплайн (глубже, чем диаграмма) | [docs/ru/architecture.md](docs/ru/architecture.md) |
| Визуальные диаграммы архитектуры (Mermaid) | [docs/ru/diagrams.md](docs/ru/diagrams.md) |
| Детекция стеков — на что смотрит каждый сканер | [docs/ru/stacks.md](docs/ru/stacks.md) |
| Слой памяти — decision log и failure patterns | [docs/ru/memory-layer.md](docs/ru/memory-layer.md) |
| Все 5 валидаторов в деталях | [docs/ru/verification.md](docs/ru/verification.md) |
| Все CLI-команды и их опции | [docs/ru/commands.md](docs/ru/commands.md) |
| Ручная установка (без `npx`) | [docs/ru/manual-installation.md](docs/ru/manual-installation.md) |
| Переопределения сканера — `.claudeos-scan.json` | [docs/ru/advanced-config.md](docs/ru/advanced-config.md) |
| Безопасность: что сохраняется при повторном init | [docs/ru/safety.md](docs/ru/safety.md) |
| Сравнение со схожими инструментами (по охвату, не по качеству) | [docs/ru/comparison.md](docs/ru/comparison.md) |
| Ошибки и восстановление | [docs/ru/troubleshooting.md](docs/ru/troubleshooting.md) |

---

## Участие в проекте

Контрибьюции приветствуются: добавление новых стеков, улучшение промптов, фиксы багов. Подробности в [CONTRIBUTING.md](CONTRIBUTING.md).

Кодекс поведения и политика безопасности — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) и [SECURITY.md](SECURITY.md).

## Лицензия

[ISC License](LICENSE). Свободно для любого использования, включая коммерческое. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Поддерживается командой [claudeos-core](https://github.com/claudeos-core). Issues и PR — на <https://github.com/claudeos-core/claudeos-core>.</sub>
