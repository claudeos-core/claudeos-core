# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Автоматическая генерация документации Claude Code из вашего реального исходного кода.** CLI-инструмент, который статически анализирует ваш проект, а затем запускает 4-pass конвейер Claude для создания `.claude/rules/`, standards, skills и guides — так что Claude Code следует конвенциям **именно вашего** проекта, а не общим.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Что это такое?

Вы используете Claude Code. Он умный, но **не знает конвенций вашего проекта**:
- Ваша команда использует MyBatis, а Claude генерирует код для JPA.
- Ваша обёртка — `ApiResponse.ok()`, а Claude пишет `ResponseEntity.success()`.
- Ваши пакеты — `controller/order/`, а Claude создаёт `order/controller/`.

Поэтому вы тратите немалую часть времени на правку каждого сгенерированного файла.

**ClaudeOS-Core решает эту проблему.** Он сканирует ваш реальный исходный код, выясняет ваши конвенции и записывает полный набор правил в `.claude/rules/` — каталог, который Claude Code читает автоматически. В следующий раз, когда вы скажете *"Создай CRUD для заказов"*, Claude последует вашим конвенциям с первой попытки.

```
До:    Вы → Claude Code → "в целом хороший" код → правка вручную
После: Вы → Claude Code → код, соответствующий вашему проекту → используйте как есть
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
<summary><strong>📄 Что попадает в ваш <code>CLAUDE.md</code> (реальный фрагмент)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

Примечание: каждое утверждение выше основано на реальном исходном коде — имена классов, пути пакетов, ключи конфигурации и флаг dead-config извлечены сканером ещё до того, как Claude начал писать файл.

</details>

<details>
<summary><strong>🛡️ Реальное автоматически загружаемое правило (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

Glob `paths: ["**/*"]` означает, что Claude Code автоматически загружает это правило при редактировании любого файла в проекте. Примеры ✅/❌ берутся прямо из реальных конвенций этой кодовой базы и существующих паттернов багов.

</details>

<details>
<summary><strong>🧠 Автоматически сгенерированный сид <code>decision-log.md</code> (реальный фрагмент)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 заполняет `decision-log.md` архитектурными решениями, извлечёнными из `pass2-merged.json`, чтобы будущие сессии помнили *почему* кодовая база выглядит так, а не только *как* она выглядит.

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

| Если вы... | Это поможет вам... |
|---|---|
| **Соло-разработчик**, начинающий новый проект с Claude Code | Полностью пропустить фазу "учим Claude нашим конвенциям" |
| **Тимлид**, поддерживающий общие стандарты | Автоматизировать рутину поддержания `.claude/rules/` в актуальном состоянии |
| **Уже использующий Claude Code**, но устал править генерируемый код | Заставить Claude следовать ВАШИМ паттернам, а не "в целом хорошим" |

**Не подходит, если:** вы хотите универсальный preset bundle из agents/skills/rules, который работает с первого дня без шага сканирования (см. [docs/ru/comparison.md](docs/ru/comparison.md) — что под какие задачи подходит), либо ваш проект пока не вписывается в один из [поддерживаемых стеков](#supported-stacks).

---

## Как это работает?

ClaudeOS-Core инвертирует обычный workflow Claude Code:

```
Обычно:  Вы описываете проект → Claude угадывает ваш стек → Claude пишет docs
Здесь:   Код читает ваш стек → Код передаёт подтверждённые факты Claude → Claude пишет docs из фактов
```

Ключевая идея: **Node.js scanner сначала читает ваш исходный код** (детерминированно, без AI), а затем 4-pass конвейер Claude пишет документацию, ограниченную тем, что обнаружил сканер. Claude не может выдумать пути или фреймворки, которых на самом деле нет в вашем коде.

Полное описание архитектуры см. в [docs/ru/architecture.md](docs/ru/architecture.md).

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
