# ClaudeOS-Core

**Единственный инструмент, который сначала читает ваш исходный код, подтверждает стек и паттерны детерминированным анализом, а затем генерирует правила Claude Code, точно адаптированные к вашему проекту.**

```bash
npx claudeos-core init
```

ClaudeOS-Core читает вашу кодовую базу, извлекает каждый найденный паттерн и генерирует полный набор Standards, Rules, Skills и Guides, адаптированных под _ваш_ проект. После этого, когда вы говорите Claude Code «Создай CRUD для заказов», он производит код, точно соответствующий вашим существующим паттернам.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Почему ClaudeOS-Core?

Любой другой инструмент для Claude Code работает так:

> **Человек описывает проект → LLM генерирует документацию**

ClaudeOS-Core работает так:

> **Код анализирует ваш исходник → Код строит адаптированный промпт → LLM генерирует документацию → Код верифицирует вывод**

Это не мелкая разница. Вот почему это важно:

### Ключевая проблема: LLM угадывает. Код не угадывает.

Когда вы просите Claude «проанализировать этот проект», он **угадывает** ваш стек, ORM, структуру доменов.
Он может увидеть `spring-boot` в вашем `build.gradle`, но упустить, что вы используете MyBatis (а не JPA).
Он может обнаружить директорию `user/`, но не понять, что ваш проект использует layer-first упаковку (Pattern A), а не domain-first (Pattern B).

**ClaudeOS-Core не угадывает.** Прежде чем Claude увидит ваш проект, код на Node.js уже:

- Распарсил `build.gradle` / `package.json` / `pyproject.toml` и **подтвердил** ваш стек, ORM, БД и пакетный менеджер
- Просканировал структуру директорий и **подтвердил** список доменов с количеством файлов
- Классифицировал структуру вашего проекта в один из 5 Java-паттернов, Kotlin CQRS/BFF или Next.js App Router/FSD
- Разбил домены на оптимально размерные группы, помещающиеся в context window Claude
- Собрал стек-специфический промпт со всеми подтверждёнными фактами

К моменту, когда Claude получает промпт, угадывать больше нечего. Стек подтверждён. Домены подтверждены. Паттерн структуры подтверждён. Единственная работа Claude — сгенерировать документацию, соответствующую этим **подтверждённым фактам**.

### Результат

Другие инструменты создают «в целом хорошую» документацию.
ClaudeOS-Core создаёт документацию, которая знает, что ваш проект использует `ApiResponse.ok()` (а не `ResponseEntity.success()`), что ваши MyBatis XML-мапперы находятся в `src/main/resources/mybatis/mappers/`, и что ваша структура пакетов — `com.company.module.{domain}.controller` — потому что он прочитал ваш реальный код.

### До и после

**Без ClaudeOS-Core** — вы просите Claude Code создать Order CRUD:
```
❌ Использует JPA-style репозиторий (ваш проект использует MyBatis)
❌ Создаёт ResponseEntity.success() (ваш враппер — ApiResponse.ok())
❌ Размещает файлы в order/controller/ (ваш проект использует controller/order/)
❌ Генерирует английские комментарии (ваша команда пишет русские комментарии)
→ Вы тратите 20 минут на исправление каждого сгенерированного файла
```

**С ClaudeOS-Core** — `.claude/rules/` уже содержит ваши подтверждённые паттерны:
```
✅ Генерирует MyBatis mapper + XML (обнаружено из build.gradle)
✅ Использует ApiResponse.ok() (извлечено из вашего реального исходника)
✅ Размещает файлы в controller/order/ (Pattern A подтверждён сканированием структуры)
✅ Русские комментарии (применён --lang ru)
→ Сгенерированный код сразу соответствует конвенциям вашего проекта
```

Эта разница накапливается. 10 задач/день × 20 минут экономии = **более 3 часов/день**.

---

## Обеспечение качества после генерации (v2.3.0)

Генерация — это только половина задачи. Другая половина — **знать, что результат корректен** — во всех 10 выходных языках, во всех 11 шаблонах стеков, в проектах любого размера. v2.3.0 добавляет два детерминированных валидатора, которые запускаются после генерации и не зависят от самопроверок LLM.

### `claude-md-validator` — структурные инварианты

Каждый сгенерированный `CLAUDE.md` проверяется против 25 структурных инвариантов, использующих только языково-независимые сигналы: markdown-синтаксис (`^## `, `^### `), литеральные имена файлов (`decision-log.md`, `failure-patterns.md` — никогда не переводятся), количество секций, количество подсекций в секции, количество строк таблиц. Один и тот же валидатор байт в байт выносит одинаковый вердикт для `CLAUDE.md`, сгенерированного на английском, корейском, японском, вьетнамском, хинди, русском, испанском, китайском, французском или немецком.

Кросс-языковая гарантия проверяется test-фикстурами на всех 10 языках, включая bad-case фикстуры на 6 из этих языков, производящие идентичные сигнатуры ошибок. Когда инвариант падает на вьетнамском проекте, исправление такое же, как при падении на немецком проекте.

### `content-validator [10/10]` — проверка утверждений о путях и согласованность MANIFEST

Читает каждую ссылку на путь в обратных кавычках (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) из всех сгенерированных `.md`-файлов и сверяет их с реальной файловой системой. Ловит два класса сбоев LLM, которые раньше не обнаруживал ни один инструмент:

- **`STALE_PATH`** — когда Pass 3 или Pass 4 выдумывает правдоподобный, но несуществующий путь. Три канонических класса: (1) **ренормализация идентификатора в имя файла** — вывод имени файла из TypeScript-константы в ALL_CAPS или Java-аннотации, хотя реальный файл следует другой конвенции именования; (2) **выдумывание точки входа по конвенции фреймворка** — предположение стандартного файла входа (main-модуль Vite, app-router providers Next.js и т.п.) в проекте, выбравшем иную раскладку; (3) **выдумывание правдоподобно названной утилиты** — указание конкретного имени файла для хелпера, который «естественно существовал бы» в видимой директории.
- **`MANIFEST_DRIFT`** — когда `claudeos-core/skills/00.shared/MANIFEST.md` регистрирует skill, о котором `CLAUDE.md §6` не упоминает (или наоборот). Распознаёт общую схему orchestrator + sub-skills, где `CLAUDE.md §6` — точка входа, а `MANIFEST.md` — полный реестр; sub-skill'ы считаются покрытыми через их родительский orchestrator.

Валидатор парой работает с prompt-time-предотвращением в `pass3-footer.md` и `pass4.md`: блоки anti-pattern, документирующие конкретные классы галлюцинаций (префикс родительского каталога, конвенции библиотек Vite/MSW/Vitest/Jest/RTL), и явное positive guidance — ограничивать правила уровнем каталога, когда конкретного имени файла нет в `pass3a-facts.md`.

### Запуск валидации на любом проекте

```bash
npx claudeos-core health     # все валидаторы — единый вердикт go/no-go
npx claudeos-core lint       # только структурные инварианты CLAUDE.md (любой язык)
```

---

## Поддерживаемые стеки

| Стек | Обнаружение | Глубина анализа |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 паттернов пакетов | 10 категорий, 59 подпунктов |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, автоопределение CQRS/BFF | 12 категорий, 95 подпунктов |
| **Node.js / Express** | `package.json` | 9 категорий, 57 подпунктов |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 категорий, 68 подпунктов |
| **Next.js / React** | `package.json`, `next.config.*`, поддержка FSD | 9 категорий, 55 подпунктов |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 категорий, 58 подпунктов |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 категорий, 55 подпунктов |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 категорий, 58 подпунктов |
| **Node.js / Fastify** | `package.json` | 10 категорий, 62 подпункта |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 категорий, 55 подпунктов |
| **Angular** | `package.json`, `angular.json` | 12 категорий, 78 подпунктов |

Автоматически определяется: язык и версия, фреймворк и версия (включая Vite как SPA-фреймворк), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy и др.), база данных (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), пакетный менеджер (Gradle, Maven, npm, yarn, pnpm, pip, poetry), архитектура (CQRS, BFF — из имён модулей), мультимодульная структура (из settings.gradle), монорепозиторий (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **конфигурация runtime из `.env.example`** (v2.2.0 — извлечение port/host/API-target из 16+ соглашений имён переменных во фреймворках Vite · Next.js · Nuxt · Angular · Node · Python).

**Вам не нужно ничего указывать. Всё определяется автоматически.**

### Конфигурация runtime на основе `.env` (v2.2.0)

v2.2.0 добавляет `lib/env-parser.js`, чтобы генерируемый `CLAUDE.md` отражал то, что проект действительно декларирует, а не дефолты фреймворка.

- **Порядок поиска**: `.env.example` (канонический, закоммиченный) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. Вариант `.example` побеждает, потому что он является developer-neutral shape-of-truth, а не локальными переопределениями одного контрибьютора.
- **Распознаваемые соглашения имён port-переменных**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / generic `PORT`. Framework-специфичные имена побеждают generic `PORT`, когда присутствуют оба.
- **Host и API target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` и т.д.
- **Приоритет**: Spring Boot `application.yml` `server.port` по-прежнему выигрывает (framework-native config), затем `.env`-декларированный порт, затем framework default (Vite 5173, Next.js 3000, Django 8000 и т.д.) в качестве последнего средства.
- **Редактирование чувствительных переменных**: значения переменных, соответствующих паттернам `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT`, заменяются на `***REDACTED***` до того, как достигнут любого downstream-генератора. Defense-in-depth против случайно закоммиченных секретов в `.env.example`. `DATABASE_URL` явно внесён в whitelist для back-compat идентификации БД в stack-detector.

### Обнаружение Java-доменов (5 паттернов с фолбэком)

| Приоритет | Паттерн | Структура | Пример |
|---|---|---|---|
| A | Layer-first | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domain-first | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Префикс модуля | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Гексагональный | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Плоский | `controller/*.java` | `controller/UserController.java` → извлекает `user` из имени класса |

Домены только с сервисами (без контроллеров) также обнаруживаются через директории `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Пропускаются: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` и т.д.

### Обнаружение доменов Kotlin мультимодульных проектов

Для проектов Kotlin с Gradle-мультимодульной структурой (например, CQRS-монорепо):

| Шаг | Действие | Пример |
|---|---|---|
| 1 | Сканирование `settings.gradle.kts` на `include()` | Находит 14 модулей |
| 2 | Определение типа модуля из имени | `reservation-command-server` → тип: `command` |
| 3 | Извлечение домена из имени модуля | `reservation-command-server` → домен: `reservation` |
| 4 | Группировка одного домена по модулям | `reservation-command-server` + `common-query-server` → 1 домен |
| 5 | Определение архитектуры | Есть модули `command` + `query` → CQRS |

Поддерживаемые типы модулей: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Общие библиотеки (`shared-lib`, `integration-lib`) определяются как специальные домены.

### Обнаружение фронтенд-доменов

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **Разделение RSC/Client**: Обнаруживает паттерн `client.tsx`, отслеживает разделение Server/Client-компонентов
- **Нестандартные вложенные пути**: Обнаруживает pages, components и FSD-слои под путями `src/*/` (например, `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Обнаружение platform-/tier-split (v2.0.0)**: Распознаёт раскладки `src/{platform}/{subapp}/` — `{platform}` может быть device-/target-ключевым словом (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) или ключевым словом уровня доступа (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Выдаёт один домен на пару `(platform, subapp)` с именем `{platform}-{subapp}` и отдельными счётчиками routes/components/layouts/hooks на каждый домен. Работает одновременно для Angular, Next.js, React и Vue (мульти-расширение glob `{tsx,jsx,ts,js,vue}`). Требует ≥2 исходных файла на subapp, чтобы избежать шумных доменов из 1 файла.
- **Platform-split для монорепо (v2.0.0)**: Platform-сканирование также сопоставляет `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm-workspace с `src/`) и `{apps,packages}/{platform}/{subapp}/` (workspaces без обёртки `src/`).
- **Fallback E — файл routes (v2.0.0)**: Когда основные сканеры + Fallback A–D все возвращают 0, делается glob `**/routes/*.{tsx,jsx,ts,js,vue}` с группировкой по имени родительской директории `routes`. Улавливает проекты React Router с файловым роутингом (CRA/Vite + `react-router`), не соответствующие Next.js `page.tsx` или FSD-раскладкам. Общие имена родителей (`src`, `app`, `pages`) отфильтровываются.
- **Config-фолбэк**: Определяет Next.js/Vite/Nuxt из файлов конфигурации, когда их нет в `package.json` (поддержка монорепо)
- **Глубокий фолбэк по директориям**: Для проектов React/CRA/Vite/Vue/RN сканирует `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` на любой глубине
- **Общие ignore-списки (v2.0.0)**: Все сканеры используют общие `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) и `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`), чтобы сборочные выводы и тестовые фикстуры не раздували счётчики файлов по доменам.

### Переопределения сканеров (v2.0.0)

Положите опциональный `.claudeos-scan.json` в корне проекта, чтобы расширить дефолты сканеров без редактирования тулкита. Все поля **аддитивные** — записи пользователя расширяют дефолты, никогда не заменяют их:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Поле | Дефолт | Назначение |
|---|---|---|
| `platformKeywords` | встроенный список выше | Дополнительные ключевые слова `{platform}` для platform-сканирования (например, `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | только структурные директории | Дополнительные имена subapp, исключаемые из выдачи доменов platform-сканером |
| `minSubappFiles` | `2` | Переопределение минимального количества файлов, после которого subapp становится доменом |

Отсутствующий файл или некорректный JSON → тихо откатывается на дефолты (без краша). Типичное использование: opt-in короткого сокращения (`adm`, `bo`), которое встроенный список исключает как слишком неоднозначное, или повышение `minSubappFiles` для шумных монорепо.

---

## Быстрый старт

### Требования

- **Node.js** v18+
- **Claude Code CLI** (установлен и аутентифицирован)

### Установка

```bash
cd /your/project/root

# Вариант A: npx (рекомендуется — установка не нужна)
npx claudeos-core init

# Вариант B: глобальная установка
npm install -g claudeos-core
claudeos-core init

# Вариант C: проектная devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# Вариант D: git clone (для разработки/контрибьюций)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Кросс-платформенно (PowerShell, CMD, Bash, Zsh — любой терминал)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (только Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Язык вывода (10 языков)

Когда вы запускаете `init` без `--lang`, появляется интерактивный селектор — используйте стрелки или цифровые клавиши для выбора:

```
╔══════════════════════════════════════════════════╗
║  Выберите язык сгенерированных документов         ║
╚══════════════════════════════════════════════════╝

  Сгенерированные файлы (CLAUDE.md, Standards, Rules,
  Skills, Guides) будут написаны на русском языке.

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
  ❯  8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Движение  1-0 Переход  Enter Выбрать  ESC Отмена
```

Описание меняется на выбранный язык при навигации. Чтобы пропустить селектор, передайте `--lang` напрямую:

```bash
npx claudeos-core init --lang ko    # Корейский
npx claudeos-core init --lang ja    # Японский
npx claudeos-core init --lang en    # Английский (по умолчанию)
```

> **Примечание:** Это задаёт язык только для сгенерированных файлов документации. Анализ кода (Pass 1–2) всегда выполняется на английском; сгенерированный вывод (Pass 3) пишется на выбранном вами языке. Примеры кода внутри сгенерированных файлов сохраняют оригинальный синтаксис языка программирования.

Готово. Через 10 минут (малый проект) — 2 часа (монорепо из 60+ доменов) вся документация будет сгенерирована и готова к использованию. CLI показывает прогресс-бар с процентом, прошедшим временем и ETA для каждого прохода. См. [Автомасштабирование по размеру проекта](#автомасштабирование-по-размеру-проекта) для детального времени по размерам проекта.

### Ручная пошаговая установка

Если вам нужен полный контроль над каждой фазой — или если автоматический пайплайн падает на каком-то шаге — вы можете запустить каждую стадию вручную. Это также полезно для понимания того, как ClaudeOS-Core работает внутри.

#### Шаг 1: Клонирование и установка зависимостей

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Шаг 2: Создание структуры директорий

```bash
# Rules (v2.0.0: добавлена 60.memory)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: добавлена memory; v2.1.0: удалена plan)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **Примечание v2.1.0:** Директория `claudeos-core/plan/` больше не создаётся. Генерация master plan удалена, потому что master plans были внутренним бэкапом, который Claude Code никогда не читал в рантайме, а их агрегация вызывала отказы `Prompt is too long`. Используйте `git` для бэкапа/восстановления.

#### Шаг 3: Запуск plan-installer (анализ проекта)

Сканирует ваш проект, определяет стек, находит домены, разбивает их на группы и генерирует промпты.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Вывод (в `claudeos-core/generated/`):**
- `project-analysis.json` — обнаруженный стек, домены, информация о фронтенде
- `domain-groups.json` — группы доменов для Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — промпты анализа
- `pass2-prompt.md` — промпт слияния
- `pass3-prompt.md` — шаблон промпта Pass 3 с предвставленным блоком Phase 1 «Read Once, Extract Facts» (Rules A–E). Автоматический пайплайн разбивает Pass 3 на несколько стадий в рантайме; этот шаблон подаётся каждой стадии.
- `pass3-context.json` — облегчённая сводка проекта (< 5 KB, собирается после Pass 2), которую промпты Pass 3 предпочитают вместо полного `pass2-merged.json` (v2.1.0)
- `pass4-prompt.md` — промпт L4 memory scaffolding (v2.0.0; использует тот же `staging-override.md` для записей правил `60.memory/`)

Вы можете изучить эти файлы, чтобы проверить точность обнаружения перед продолжением.

#### Шаг 4: Pass 1 — Глубокий анализ кода (по группам доменов)

Запустите Pass 1 для каждой группы доменов. Проверьте `domain-groups.json` на количество групп.

```bash
# Проверить количество групп
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Запустить Pass 1 для каждой группы (замените домены и номер группы)
# Примечание: v1.6.1+ использует Node.js String.replace() вместо perl — perl
# больше не требуется, а семантика replacement-функции предотвращает regex-инъекции
# из символов $/&/$1, которые могут появиться в именах доменов.
#
# Для группы 1:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Для группы 2 (если есть):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Для фронтенд-групп замените pass1-backend-prompt.md → pass1-frontend-prompt.md
```

**Проверка:** `ls claudeos-core/generated/pass1-*.json` должен показать по одному JSON на группу.

#### Шаг 5: Pass 2 — Слияние результатов анализа

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `claudeos-core/generated/pass2-merged.json` должен существовать с 9+ ключами верхнего уровня.

#### Шаг 6: Pass 3 — Генерация всей документации (разбита на несколько стадий)

**Примечание v2.1.0:** Pass 3 **всегда запускается в split-режиме** автоматическим пайплайном. Каждая стадия — это отдельный вызов `claude -p` со свежим context window, поэтому переполнение из-за накопления вывода структурно невозможно независимо от размера проекта. Шаблон `pass3-prompt.md` собирается для каждой стадии с директивой `STAGE:`, которая говорит Claude, какой подмножество файлов выдать. Для ручного режима самый простой путь всё ещё — подать полный шаблон и позволить Claude сгенерировать всё за один вызов, но это надёжно только на малых проектах (≤5 доменов). Для всего крупнее используйте `npx claudeos-core init`, чтобы split-раннер управлял оркестрацией стадий.

**Single-call режим (только малые проекты, ≤5 доменов):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Постадийный режим (рекомендуется для всех размеров проекта):**

Автоматический пайплайн запускает эти стадии. Список стадий:

| Стадия | Записывает | Примечания |
|---|---|---|
| `3a` | `pass3a-facts.md` (дистиллированный fact sheet 5–10 KB) | Читает `pass2-merged.json` один раз; последующие стадии ссылаются на этот файл |
| `3b-core` | `CLAUDE.md`, общие `standard/`, общие `.claude/rules/` | Кросс-проектные файлы; без доменно-специфичного вывода |
| `3b-1..N` | Доменно-специфичные `standard/60.domains/*.md` + правила доменов | Батч ≤15 доменов на стадию (авто-деление при ≥16 доменов) |
| `3c-core` | `guide/` (9 файлов), `skills/00.shared/MANIFEST.md`, оркестраторы `skills/*/` | Общие skills и все user-facing гайды |
| `3c-1..N` | Доменные sub-skills под `skills/20.frontend-page/scaffold-page-feature/` | Батч ≤15 доменов на стадию |
| `3d-aux` | `database/`, `mcp-guide/` | Фиксированного размера, независимо от количества доменов |

Для проекта с 1–15 доменами это разворачивается в 4 стадии (`3a`, `3b-core`, `3c-core`, `3d-aux` — без разбиения на батчи). Для 16–30 доменов разворачивается в 8 стадий (`3b` и `3c` каждая делится на 2 батча). См. [Автомасштабирование по размеру проекта](#автомасштабирование-по-размеру-проекта) для полной таблицы.

**Проверка:** `CLAUDE.md` должен существовать в корне проекта, а маркер `claudeos-core/generated/pass3-complete.json` должен быть записан. В split-режиме маркер содержит `mode: "split"` и массив `groupsCompleted`, перечисляющий каждую завершённую стадию — логика частичного маркера использует это, чтобы возобновить с нужной стадии после краша, а не перезапускать с `3a` (что удвоило бы расход токенов).

> **Примечание о staging:** Pass 3 сначала пишет файлы правил в `claudeos-core/generated/.staged-rules/`, потому что политика чувствительных путей Claude Code блокирует прямую запись в `.claude/`. Автоматический пайплайн выполняет перемещение автоматически после каждой стадии. Если вы запускаете стадию вручную, вам нужно переместить staged-дерево самостоятельно: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (сохраняя подпути).

#### Шаг 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `claudeos-core/memory/` должна содержать 4 файла (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` должна содержать 4 файла правил, и к `CLAUDE.md` должна быть добавлена секция `## Memory (L4)`. Маркер: `claudeos-core/generated/pass4-memory.json`.

> **Gap-fill в v2.1.0:** Pass 4 также гарантирует существование `claudeos-core/skills/00.shared/MANIFEST.md`. Если Pass 3c его пропустил (возможно на проектах с малым количеством skills, потому что шаблоны `pass3.md` стеков перечисляют `MANIFEST.md` среди целей генерации без отметки REQUIRED), gap-fill создаёт минимальную заглушку, чтобы `.claude/rules/50.sync/02.skills-sync.md` (путь v2.2.0 — количество sync-правил сокращено с 3 до 2, `03` стал `02`) всегда имел валидную целевую ссылку. Идемпотентно: пропускается, если файл уже имеет реальное содержимое (>20 символов).

> **Примечание:** Если `claude -p` падает или `pass4-prompt.md` отсутствует, автоматический пайплайн использует статический фолбэк через `lib/memory-scaffold.js` (с переводом через Claude, когда `--lang` не английский). Статический фолбэк запускается только внутри `npx claudeos-core init` — ручной режим требует успеха Pass 4.

#### Шаг 8: Запуск инструментов верификации

```bash
# Генерация метаданных (требуется перед другими проверками)
node claudeos-core-tools/manifest-generator/index.js

# Запустить все проверки
node claudeos-core-tools/health-checker/index.js

# Или запустить отдельные проверки:
node claudeos-core-tools/plan-validator/index.js --check # Согласованность Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Незарегистрированные/осиротевшие файлы
node claudeos-core-tools/content-validator/index.js     # Проверки качества файлов (вкл. секцию memory/ [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Проверки JSON Pass 1–4 + completion-маркеров
```

#### Шаг 9: Проверка результатов

```bash
# Подсчёт сгенерированных файлов
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# Проверить CLAUDE.md
head -30 CLAUDE.md

# Проверить один стандартный файл
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Проверить правила
ls .claude/rules/*/
```

> **Совет:** Если какой-то шаг падает, вы можете исправить проблему и перезапустить только этот шаг. Результаты Pass 1/2 кэшируются — если `pass1-N.json` или `pass2-merged.json` уже существует, автоматический пайплайн их пропускает. Используйте `npx claudeos-core init --force`, чтобы удалить предыдущие результаты и начать с чистого листа.

### Начало использования

```
# В Claude Code — просто спрашивайте естественно:
"Создай CRUD для домена order"
"Добавь API аутентификации пользователя"
"Отрефактори этот код под паттерны проекта"

# Claude Code автоматически ссылается на ваши сгенерированные Standards, Rules и Skills.
```

---

## Как это работает — 4-Pass пайплайн

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Зависимости (~10с)
    ├── [2] Структура директорий               ← Создание папок (~1с)
    ├── [3] plan-installer (Node.js)           ← Сканирование проекта (~5с)
    │       ├── Автоопределение стека (multi-stack)
    │       ├── Извлечение списка доменов (тегирование: backend/frontend)
    │       ├── Разбиение на группы доменов (по типу)
    │       ├── Сборка pass3-context.json (облегчённая сводка, v2.1.0)
    │       └── Выбор стек-специфических промптов (по типу)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Глубокий анализ кода (~2-8мин)
    │       ├── ⚙️ Backend-группы → backend-промпт
    │       └── 🎨 Frontend-группы → frontend-промпт
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Слияние анализа (~1мин)
    │       └── Консолидация ВСЕХ результатов Pass 1 в pass2-merged.json
    │
    ├── [6] Pass 3 (split-режим, v2.1.0)       ← Генерация всего
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Извлечение фактов (~5-10мин)
    │       │       └── Читает pass2-merged.json один раз → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + общие standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← Доменные standards/rules (≤15 доменов/батч)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Гайды + общие skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Доменные sub-skills (≤15 доменов/батч)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← Заглушки database/ + mcp-guide/
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30с-5мин)
    │       ├── Сидинг memory/ (decision-log, failure-patterns, …)
    │       ├── Генерация правил 60.memory/
    │       ├── Добавление секции "Memory (L4)" в CLAUDE.md
    │       └── Gap-fill: гарантировать skills/00.shared/MANIFEST.md (v2.1.0)
    │
    └── [8] Верификация                        ← Автозапуск health-checker
```

### Почему 4 прохода?

**Pass 1** — единственный проход, читающий ваш исходный код. Он выбирает репрезентативные файлы по домену и извлекает паттерны по 55–95 категориям анализа (зависит от стека). Для больших проектов Pass 1 запускается несколько раз — по одному на группу доменов. В мульти-стек проектах (например, Java backend + React frontend) backend- и frontend-домены используют **разные промпты анализа**, адаптированные к каждому стеку.

**Pass 2** объединяет все результаты Pass 1 в единый анализ: общие паттерны (100% общие), паттерны большинства (50%+ общие), доменно-специфические паттерны, анти-паттерны по степени серьёзности и сквозные аспекты (именование, безопасность, БД, тестирование, логирование, производительность). Результаты backend и frontend сливаются воедино.

**Pass 3** (split-режим, v2.1.0) берёт объединённый анализ и генерирует всю файловую экосистему (CLAUDE.md, rules, standards, skills, guides) через несколько последовательных вызовов `claude -p`. Ключевое наблюдение: переполнение из-за накопления вывода непредсказуемо по размеру входа — single-call Pass 3 нормально работал на проектах в 2 домена и стабильно падал около 5 доменов, а граница сбоев смещалась в зависимости от того, насколько многословным оказался каждый файл. Split-режим полностью обходит это — каждая стадия стартует со свежим context window и пишет ограниченный подмножество файлов. Кросс-стейджевая согласованность (главное преимущество single-call подхода) сохраняется через `pass3a-facts.md` — дистиллированный fact sheet размером 5–10 KB, на который ссылается каждая последующая стадия.

Шаблон промпта Pass 3 также включает блок **Phase 1 «Read Once, Extract Facts»** с пятью правилами, ещё больше ограничивающими объём вывода:

- **Rule A** — Ссылайтесь на fact table; не перечитывайте `pass2-merged.json`.
- **Rule B** — Идемпотентная запись файлов (пропуск, если цель существует с реальным содержимым), что делает Pass 3 безопасно перезапускаемым после прерывания.
- **Rule C** — Межфайловая согласованность обеспечивается через fact table как единственный источник истины.
- **Rule D** — Сжатость вывода: одна строка (`[WRITE]`/`[SKIP]`) между записями файлов, без повторения fact table, без эха содержимого файлов.
- **Rule E** — Батчевая идемпотентная проверка: один `Glob` в начале PHASE 2 вместо per-target `Read` вызовов.

В **v2.2.0** Pass 3 также встраивает в промпт детерминированный CLAUDE.md scaffold (`pass-prompts/templates/common/claude-md-scaffold.md`). Это фиксирует заголовки и порядок 8 секций верхнего уровня, так что сгенерированный `CLAUDE.md` больше не дрейфует между проектами, при этом содержимое каждой секции по-прежнему адаптируется к проекту. Новый `.env` parser stack-detector-а (`lib/env-parser.js`) поставляет `stack.envInfo` в промпт, чтобы строки port/host/API target соответствовали тому, что проект фактически объявляет, а не framework-дефолтам.

В **v2.2.0** Pass 3 также встраивает в промпт детерминированный CLAUDE.md scaffold (`pass-prompts/templates/common/claude-md-scaffold.md`). Это фиксирует заголовки и порядок 8 секций верхнего уровня, так что сгенерированный `CLAUDE.md` больше не дрейфует между проектами, при этом содержимое каждой секции по-прежнему адаптируется к проекту. Новый `.env` parser stack-detector-а (`lib/env-parser.js`) поставляет `stack.envInfo` в промпт, чтобы строки port/host/API target соответствовали тому, что проект фактически объявляет, а не framework-дефолтам.

**Pass 4** создаёт каркас слоя L4 Memory: файлы персистентного командного знания (decision-log, failure-patterns, политика компакции, auto-rule-update) плюс правила `60.memory/`, которые указывают будущим сессиям, когда и как читать/записывать эти файлы. Слой памяти — это то, что позволяет Claude Code накапливать уроки между сессиями, а не открывать их заново каждый раз. Когда `--lang` не английский, статический контент фолбэка переводится через Claude перед записью. v2.1.0 добавляет gap-fill для `skills/00.shared/MANIFEST.md` на случай, если Pass 3c его пропустил.

---

## Структура сгенерированных файлов

```
your-project/
│
├── CLAUDE.md                          ← Точка входа Claude Code (детерминированная 8-секционная структура, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Правила, срабатывающие по glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Правила напоминания о синхронизации
│       └── 60.memory/                 ← Правила on-demand-scope для L4 memory (v2.0.0)
│
├── claudeos-core/                     ← Основная выходная директория
│   ├── generated/                     ← JSON анализа + динамические промпты + Pass-маркеры (gitignore)
│   │   ├── project-analysis.json      ← Информация о стеке (multi-stack)
│   │   ├── domain-groups.json         ← Группы с type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Backend-промпт анализа
│   │   ├── pass1-frontend-prompt.md   ← Frontend-промпт анализа (если обнаружен)
│   │   ├── pass2-prompt.md            ← Промпт слияния
│   │   ├── pass2-merged.json          ← Вывод Pass 2 (потребляется только Pass 3a)
│   │   ├── pass3-context.json         ← Облегчённая сводка (< 5 KB) для Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Шаблон промпта Pass 3 (с предвставленным блоком Phase 1)
│   │   ├── pass3a-facts.md            ← Fact sheet, записываемый Pass 3a, читаемый 3b/3c/3d (v2.1.0)
│   │   ├── pass4-prompt.md            ← Промпт memory scaffolding (v2.0.0)
│   │   ├── pass3-complete.json        ← Маркер завершения Pass 3 (split-режим: включает groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Маркер завершения Pass 4 (пропуск при resume)
│   │   ├── rule-manifest.json         ← Индекс файлов для инструментов верификации
│   │   ├── sync-map.json              ← Маппинг Plan ↔ disk (пустой в v2.1.0; сохранён для совместимости sync-checker)
│   │   ├── stale-report.json          ← Консолидированные результаты верификации
│   │   ├── .i18n-cache-<lang>.json    ← Кэш переводов (неанглийский `--lang`)
│   │   └── .staged-rules/             ← Временная staging-директория для записей `.claude/rules/` (авто-перемещение + очистка)
│   ├── standard/                      ← Стандарты кодирования (15-19 файлов + per-domain в 60.domains/)
│   │   ├── 00.core/                   ← Обзор, архитектура, именование
│   │   ├── 10.backend-api/            ← API-паттерны (стек-специфические)
│   │   ├── 20.frontend-ui/            ← Frontend-паттерны (если обнаружены)
│   │   ├── 30.security-db/            ← Безопасность, схема БД, утилиты
│   │   ├── 40.infra/                  ← Конфиг, логирование, CI/CD
│   │   ├── 50.verification/           ← Верификация сборки, тестирование
│   │   ├── 60.domains/                ← Per-domain стандарты (записываются Pass 3b-N, v2.1.0)
│   │   └── 90.optional/               ← Опциональные конвенции (стек-специфические дополнения)
│   ├── skills/                        ← Skills для CRUD/page scaffolding
│   │   └── 00.shared/MANIFEST.md      ← Единственный источник истины для зарегистрированных skills
│   ├── guide/                         ← Онбординг, FAQ, troubleshooting (9 файлов)
│   ├── database/                      ← Схема БД, гайд миграций
│   ├── mcp-guide/                     ← Гайд интеграции MCP-сервера
│   └── memory/                        ← L4: знания команды (4 файла) — коммитить
│       ├── decision-log.md            ← "Почему" за дизайн-решениями
│       ├── failure-patterns.md        ← Повторяющиеся ошибки и фиксы (auto-score — `npx claudeos-core memory score`)
│       ├── compaction.md              ← Стратегия 4-stage компакции (запустить `npx claudeos-core memory compact`)
│       └── auto-rule-update.md        ← Предложения по улучшению правил (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← Этот тулкит (не модифицировать)
```

Каждый standard-файл включает ✅ правильные примеры, ❌ неправильные примеры и сводную таблицу правил — всё извлечено из ваших реальных паттернов кода, а не из общих шаблонов.

> **Примечание v2.1.0:** `claudeos-core/plan/` больше не генерируется. Master plans были внутренним бэкапом, который Claude Code не потреблял в рантайме, а их агрегация в Pass 3 была основной причиной переполнения из-за накопления вывода. Используйте `git` для бэкапа/восстановления. Проекты, обновляющиеся с v2.0.x, могут безопасно удалить любую существующую директорию `claudeos-core/plan/`.

### Рекомендации по gitignore

**Коммитить** (командное знание — предназначено для обмена):
- `CLAUDE.md` — точка входа Claude Code
- `.claude/rules/**` — автозагружаемые правила
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — сгенерированная документация
- `claudeos-core/memory/**` — история решений, паттерны ошибок, предложения правил

**НЕ коммитить** (регенерируемые артефакты сборки):

```gitignore
# ClaudeOS-Core — сгенерированный анализ и кэш переводов
claudeos-core/generated/
```

Директория `generated/` содержит JSON анализа (`pass1-*.json`, `pass2-merged.json`), промпты (`pass1/2/3/4-prompt.md`), Pass-маркеры завершения (`pass3-complete.json`, `pass4-memory.json`), кэш переводов (`.i18n-cache-<lang>.json`) и временную staging-директорию (`.staged-rules/`) — всё пересобирается повторным запуском `npx claudeos-core init`.

---

## Автомасштабирование по размеру проекта

Split-режим Pass 3 масштабирует количество стадий по количеству доменов. Разбиение на батчи включается при 16 доменах, чтобы удерживать вывод каждой стадии под ~50 файлами — это эмпирически безопасный диапазон для `claude -p` до того, как начинается переполнение из-за накопления вывода.

| Размер проекта | Домены | Стадий Pass 3 | Всего `claude -p` | Расч. время |
|---|---|---|---|---|
| Малый | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 стадии Pass 3 + Pass 4) | ~10–15 мин |
| Средний | 5–15 | 4 | 8–9 | ~25–45 мин |
| Крупный | 16–30 | **8** (3b, 3c каждая делится на 2 батча) | 11–12 | **~60–105 мин** |
| X-Крупный | 31–45 | 10 | 13–14 | ~100–150 мин |
| XX-Крупный | 46–60 | 12 | 15–16 | ~150–200 мин |
| XXX-Крупный | 61+ | 14+ | 17+ | 200 мин+ |

Формула количества стадий (при разбиении на батчи): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, где `N = ceil(totalDomains / 15)`.

Pass 4 (memory scaffolding) добавляет от ~30 секунд до 5 минут сверху, в зависимости от того, запускается ли Claude-driven генерация или статический фолбэк. Для мульти-стек проектов (например, Java + React) backend- и frontend-домены считаются вместе. Проект с 6 backend + 4 frontend доменами = 10 суммарно = уровень «Средний».

---

## Инструменты верификации

ClaudeOS-Core включает 5 встроенных инструментов верификации, автоматически запускаемых после генерации:

```bash
# Запустить все проверки сразу (рекомендуется)
npx claudeos-core health

# Отдельные команды
npx claudeos-core validate     # Сравнение Plan ↔ disk
npx claudeos-core refresh      # Синхронизация Disk → Plan
npx claudeos-core restore      # Восстановление Plan → Disk

# Или использовать node напрямую (пользователи git clone)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Инструмент | Функция |
|---|---|
| **manifest-generator** | Строит JSON метаданных (`rule-manifest.json`, `sync-map.json`, инициализирует `stale-report.json`); индексирует 7 директорий, включая `memory/` (`totalMemory` в summary). v2.1.0: `plan-manifest.json` больше не генерируется, поскольку master plans были удалены. |
| **plan-validator** | Валидирует блоки `<file>` из master plan против диска для проектов, у которых всё ещё есть `claudeos-core/plan/` (legacy upgrade-случай). v2.1.0: пропускает эмиссию `plan-sync-status.json`, когда `plan/` отсутствует или пуст — `stale-report.json` всё равно записывает проходящий no-op. |
| **sync-checker** | Обнаруживает незарегистрированные файлы (на диске, но не в плане) и осиротевшие записи — покрывает 7 директорий (`memory/` добавлена в v2.0.0). Завершается чисто, когда `sync-map.json` не имеет маппингов (состояние по умолчанию в v2.1.0). |
| **content-validator** | 9-секционная проверка качества — пустые файлы, отсутствующие ✅/❌ примеры, обязательные секции плюс целостность каркаса L4 memory (даты заголовков decision-log, обязательные поля failure-pattern, fence-aware парсинг) |
| **pass-json-validator** | Валидирует структуру JSON Pass 1–4 плюс completion-маркеры `pass3-complete.json` (split-mode shape, v2.1.0) и `pass4-memory.json` |

---

## Как Claude Code использует вашу документацию

ClaudeOS-Core генерирует документацию, которую Claude Code действительно читает — вот как:

### Что Claude Code читает автоматически

| Файл | Когда | Гарантировано |
|---|---|---|
| `CLAUDE.md` | В начале каждого диалога | Всегда |
| `.claude/rules/00.core/*` | При редактировании любого файла (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/10.backend/*` | При редактировании любого файла (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/20.frontend/*` | При редактировании любого фронтенд-файла (ограничено путями компонентов/страниц/стилей) | Условно |
| `.claude/rules/30.security-db/*` | При редактировании любого файла (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/40.infra/*` | Только при редактировании config/infra-файлов (ограниченные пути) | Условно |
| `.claude/rules/50.sync/*` | Только при редактировании claudeos-core-файлов (ограниченные пути) | Условно |
| `.claude/rules/60.memory/*` | При редактировании `claudeos-core/memory/*` (ограничено путями memory) — инструктирует **как** читать/записывать on-demand memory-слой | Условно (v2.0.0) |

### Что Claude Code читает по запросу через ссылки в правилах

Каждый файл правила ссылается на соответствующий standard через секцию `## Reference`. Claude читает только релевантный для текущей задачи standard:

- `claudeos-core/standard/**` — паттерны кода, ✅/❌ примеры, конвенции именования
- `claudeos-core/database/**` — схема БД (для запросов, мапперов, миграций)
- `claudeos-core/memory/**` (v2.0.0) — слой командного знания L4; **не** автозагружается (был бы слишком шумным для каждого диалога). Вместо этого правила `60.memory/*` указывают Claude, *когда* читать эти файлы: в начале сессии (обзор свежего `decision-log.md` + high-importance `failure-patterns.md`), и append-on-demand при принятии решений или столкновении с повторяющимися ошибками.

`00.standard-reference.md` служит каталогом всех standard-файлов для обнаружения стандартов, у которых нет соответствующего правила.

### Что Claude Code НЕ читает (экономит контекст)

Эти папки явно исключены через секцию `DO NOT Read` в правиле standard-reference:

| Папка | Почему исключена |
|---|---|
| `claudeos-core/plan/` | Бэкапы Master Plan из legacy-проектов (v2.0.x и ранее). Не генерируется в v2.1.0. Если присутствует, Claude Code не загружает её автоматически — только чтение по запросу. |
| `claudeos-core/generated/` | JSON метаданных сборки, промпты, Pass-маркеры, кэш переводов, `.staged-rules/`. Не для кодинга. |
| `claudeos-core/guide/` | Онбординг-гайды для людей. |
| `claudeos-core/mcp-guide/` | Документация MCP-сервера. Не для кодинга. |
| `claudeos-core/memory/` (автозагрузка) | **Автозагрузка отключена** by design — раздула бы контекст на каждом диалоге. Вместо этого читается on-demand через правила `60.memory/*` (например, скан `failure-patterns.md` в начале сессии). Всегда коммитьте эти файлы. |

---

## Ежедневный рабочий процесс

### После установки

```
# Просто пользуйтесь Claude Code как обычно — он автоматически ссылается на ваши стандарты:
"Создай CRUD для домена order"
"Добавь API обновления профиля пользователя"
"Отрефактори этот код под паттерны проекта"
```

### После ручного редактирования стандартов

```bash
# После редактирования файлов стандартов или правил:
npx claudeos-core refresh

# Проверить согласованность всего
npx claudeos-core health
```

### Когда документация повреждена

```bash
# Рекомендация v2.1.0: используйте git для восстановления (так как master plans
# больше не генерируются). Коммитьте сгенерированные документы регулярно, чтобы
# можно было откатить отдельные файлы без регенерации:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (проекты v2.0.x с всё ещё присутствующим claudeos-core/plan/):
npx claudeos-core restore
```

### Обслуживание Memory-слоя (v2.0.0)

Слой L4 Memory (`claudeos-core/memory/`) накапливает командное знание между сессиями. Три CLI-подкоманды поддерживают его в здоровом состоянии:

```bash
# Compact: применить политику 4-stage компакции (периодически — например, ежемесячно)
npx claudeos-core memory compact
#   Stage 1: резюмировать устаревшие записи (>30 дней, тело → одна строка)
#   Stage 2: слить дубликаты заголовков (частоты суммируются, последний фикс сохраняется)
#   Stage 3: удалить low-importance + устаревшее (importance <3 И lastSeen >60 дней)
#   Stage 4: применить лимит 400 строк на файл (старейшие low-importance удаляются первыми)

# Score: пересчитать ранги записей failure-patterns.md по importance
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), ограничено 10
#   Запускать после добавления нескольких новых failure-паттернов

# Propose-rules: выявить кандидатов на добавление правил из повторяющихся ошибок
npx claudeos-core memory propose-rules
#   Читает записи failure-patterns.md с frequency ≥ 3
#   Вычисляет confidence (сигмоида на взвешенных доказательствах × anchor-множитель)
#   Пишет предложения в memory/auto-rule-update.md (НЕ автоприменяются)
#   Confidence ≥ 0.70 заслуживает серьёзного рассмотрения; принять → редактировать правило + логировать решение

# v2.1.0: `memory --help` теперь маршрутизирует к справке подкоманды (раньше показывался top-level)
npx claudeos-core memory --help
```

> **Фиксы v2.1.0:** `memory score` больше не оставляет дублирующие строки `importance` после первого прогона (раньше auto-scored строка добавлялась сверху, а оригинальная plain-строка оставалась ниже). Маркер summary для Stage 1 в `memory compact` теперь является корректным markdown-элементом списка (`- _Summarized on ..._`), поэтому рендерится чисто и корректно повторно парсится при последующих компакциях.

Когда писать в memory (Claude делает это по запросу, но можно редактировать и вручную):
- **`decision-log.md`** — добавить новую запись при выборе между конкурирующими паттернами, выборе библиотеки, определении командной конвенции или решении НЕ делать что-то. Только append; никогда не редактировать исторические записи.
- **`failure-patterns.md`** — добавлять при **втором появлении** повторяющейся ошибки или неочевидной root cause. Первичные ошибки не требуют записи.
- `compaction.md` и `auto-rule-update.md` — генерируются/управляются указанными выше CLI-подкомандами; не редактировать вручную.

### Интеграция CI/CD

```yaml
# Пример GitHub Actions
- run: npx claudeos-core validate
# Exit code 1 блокирует PR

# Опционально: ежемесячное обслуживание memory (отдельный cron-workflow)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## Чем это отличается?

### vs. другие инструменты Claude Code

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Подход** | Код анализирует первым, затем LLM генерирует | Предсобранные Config-пресеты | LLM проектирует Agent-команды | LLM генерирует Spec-документы | LLM пишет CLAUDE.md |
| **Читает ваш исходный код** | ✅ Детерминированный статический анализ | ❌ | ❌ | ❌ (LLM читает) | ❌ (LLM читает) |
| **Определение стека** | Код подтверждает (ORM, БД, build-tool, pkg-manager) | Н/Д (стек-агностично) | LLM угадывает | LLM угадывает | LLM угадывает |
| **Определение доменов** | Код подтверждает (Java 5 паттернов, Kotlin CQRS, Next.js FSD) | Н/Д | LLM угадывает | Н/Д | Н/Д |
| **Одинаковый проект → одинаковый результат** | ✅ Детерминированный анализ | ✅ (статические файлы) | ❌ (LLM варьируется) | ❌ (LLM варьируется) | ❌ (LLM варьируется) |
| **Обработка крупных проектов** | Разбиение на группы доменов (4 домена / 40 файлов на группу) | Н/Д | Без разбиения | Без разбиения | Лимит context window |
| **Вывод** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ файлов) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec-документов | CLAUDE.md (1 файл) |
| **Место вывода** | `.claude/rules/` (автозагружается Claude Code) | `.claude/` разное | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Верификация после генерации** | ✅ 5 автоматических валидаторов | ❌ | ❌ | ❌ | ❌ |
| **Мультиязычный вывод** | ✅ 10 языков | ❌ | ❌ | ❌ | ❌ |
| **Мульти-стек** | ✅ Backend + Frontend одновременно | ❌ Стек-агностично | ❌ | ❌ | Частично |
| **Персистентный memory-слой** | ✅ L4 — decision log + failure patterns + auto-scored предложения правил (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Оркестрация агентов** | ❌ | ✅ 28 агентов | ✅ 6 паттернов | ❌ | ❌ |

### Ключевое различие одним предложением

**Другие инструменты дают Claude «в целом хорошие инструкции». ClaudeOS-Core даёт Claude «инструкции, извлечённые из вашего реального кода».**

Именно поэтому Claude Code перестаёт генерировать JPA-код в вашем MyBatis-проекте,
перестаёт использовать `success()`, когда ваша кодовая база использует `ok()`,
и перестаёт создавать директории `user/controller/`, когда ваш проект использует `controller/user/`.

### Взаимодополняющее, не конкурирующее

ClaudeOS-Core фокусируется на **проектно-специфичных правилах и стандартах**.
Другие инструменты фокусируются на **оркестрации агентов и workflow**.

Вы можете использовать ClaudeOS-Core для генерации правил вашего проекта, а затем ECC или Harness поверх для агент-команд и автоматизации workflow. Они решают разные задачи.

---

## FAQ

**В: Модифицирует ли он мой исходный код?**
Нет. Создаёт только `CLAUDE.md`, `.claude/rules/` и `claudeos-core/`. Ваш существующий код никогда не модифицируется.

**В: Сколько это стоит?**
Он вызывает `claude -p` несколько раз на протяжении 4 проходов. В split-режиме v2.1.0 только Pass 3 разворачивается в 4–14+ стадий в зависимости от размера проекта (см. [Автомасштабирование](#автомасштабирование-по-размеру-проекта)). Типичный малый проект (1–15 доменов) использует в сумме 8–9 вызовов `claude -p`; 18-доменный проект использует 11; 60-доменный проект использует 15–17. Каждая стадия запускается со свежим context window — per-call стоимость токенов в действительности ниже, чем была у single-call Pass 3, потому что ни одна стадия не должна удерживать всё дерево файлов в одном контексте. Когда `--lang` не английский, путь статического фолбэка может вызвать несколько дополнительных `claude -p` для перевода; результаты кэшируются в `claudeos-core/generated/.i18n-cache-<lang>.json`, так что последующие запуски их переиспользуют. Это в пределах нормального использования Claude Code.

**В: Что такое Pass 3 split-режим и зачем он был добавлен в v2.1.0?**
До v2.1.0 Pass 3 делал один вызов `claude -p`, который должен был выдать всё сгенерированное дерево файлов (`CLAUDE.md`, стандарты, правила, skills, гайды — обычно 30–60 файлов) в одном ответе. Это работало на малых проектах, но стабильно падало с ошибкой `Prompt is too long` (переполнение из-за накопления вывода) около 5 доменов. Отказ не был предсказуем по размеру входа — он зависел от того, насколько многословным оказался каждый сгенерированный файл, и мог случаться на одном и том же проекте эпизодически. Split-режим структурно обходит проблему: Pass 3 разбивается на последовательные стадии (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), каждая из которых — отдельный вызов `claude -p` со свежим context window. Кросс-стейджевая согласованность сохраняется через `pass3a-facts.md` — дистиллированный fact sheet размером 5–10 KB, на который ссылается каждая последующая стадия вместо повторного чтения `pass2-merged.json`. Маркер `pass3-complete.json` несёт массив `groupsCompleted`, так что краш во время `3c-2` возобновляется с `3c-2` (а не с `3a`), избегая двойного расхода токенов.
**В: Стоит ли коммитить сгенерированные файлы в Git?**
Да, рекомендуется. Ваша команда может использовать одинаковые стандарты Claude Code. Подумайте о добавлении `claudeos-core/generated/` в `.gitignore` (JSON анализа регенерируется).

**В: Что насчёт проектов со смешанным стеком (например, Java backend + React frontend)?**
Полностью поддерживается. ClaudeOS-Core автоматически определяет оба стека, тегирует домены как `backend` или `frontend` и использует стек-специфические промпты анализа для каждого. Pass 2 сливает всё, а Pass 3 генерирует стандарты и backend, и frontend на своих split-стадиях — backend-домены идут в одни батчи 3b/3c, frontend-домены — в другие, и все они ссылаются на один и тот же `pass3a-facts.md` для согласованности.

**В: Работает ли он с Turborepo / pnpm workspaces / Lerna-монорепо?**
Да. ClaudeOS-Core обнаруживает `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` или `package.json#workspaces` и автоматически сканирует файлы `package.json` в под-пакетах на фреймворк/ORM/БД-зависимости. Сканирование доменов покрывает паттерны `apps/*/src/` и `packages/*/src/`. Запускать из корня монорепо.

**В: Что происходит при повторном запуске?**
Если существуют предыдущие результаты Pass 1/2, интерактивный промпт позволяет выбрать: **Continue** (продолжить с места остановки) или **Fresh** (удалить всё и начать заново). Используйте `--force`, чтобы пропустить промпт и всегда начинать заново. В split-режиме v2.1.0 resume Pass 3 работает на уровне гранулярности стадий — если прогон упал во время `3c-2`, следующий `init` возобновляется с `3c-2`, а не перезапускается с `3a` (что удвоило бы расход токенов). Маркер `pass3-complete.json` записывает `mode: "split"` плюс массив `groupsCompleted`, чтобы управлять этой логикой.

**В: Получает ли NestJS свой собственный шаблон или использует Express?**
NestJS использует выделенный шаблон `node-nestjs` с NestJS-специфичными категориями анализа: декораторы `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI-контейнер, CQRS-паттерны и `Test.createTestingModule`. Express-проекты используют отдельный шаблон `node-express`.

**В: Что насчёт проектов Vue / Nuxt?**
Vue/Nuxt использует выделенный шаблон `vue-nuxt`, покрывающий Composition API, `<script setup>`, defineProps/defineEmits, Pinia-store, `useFetch`/`useAsyncData`, Nitro server routes и `@nuxt/test-utils`. Проекты Next.js/React используют шаблон `node-nextjs`.

**В: Поддерживает ли он Kotlin?**
Да. ClaudeOS-Core автоматически обнаруживает Kotlin из `build.gradle.kts` или kotlin-плагина в `build.gradle`. Он использует выделенный шаблон `kotlin-spring` с Kotlin-специфичным анализом (data class, sealed class, coroutines, extension functions, MockK и др.).

**В: Что насчёт CQRS / BFF архитектуры?**
Полностью поддерживается для Kotlin мультимодульных проектов. ClaudeOS-Core читает `settings.gradle.kts`, определяет типы модулей (command, query, bff, integration) из имён модулей и группирует один домен между Command/Query модулями. Сгенерированные стандарты включают отдельные правила для command-контроллеров vs query-контроллеров, BFF/Feign паттерны и конвенции межмодульной коммуникации.

**В: Что насчёт Gradle мультимодульных монорепо?**
ClaudeOS-Core сканирует все подмодули (`**/src/main/kotlin/**/*.kt`) независимо от глубины вложенности. Типы модулей выводятся из конвенций именования (например, `reservation-command-server` → домен: `reservation`, тип: `command`). Общие библиотеки (`shared-lib`, `integration-lib`) также обнаруживаются.

**В: Что такое слой L4 Memory (v2.0.0)? Стоит ли коммитить `claudeos-core/memory/`?**
Да — **всегда коммитьте** `claudeos-core/memory/`. Это персистентное командное знание: `decision-log.md` записывает *почему* за архитектурными решениями (только append), `failure-patterns.md` регистрирует повторяющиеся ошибки с оценками importance, чтобы будущие сессии их избегали, `compaction.md` определяет политику 4-stage компакции, а `auto-rule-update.md` собирает машинно-сгенерированные предложения по улучшению правил. В отличие от правил (автозагружаемых по пути), memory-файлы **on-demand** — Claude читает их, только когда правила `60.memory/*` его направляют (например, скан высокоимпортных failures в начале сессии). Это держит стоимость контекста низкой, сохраняя долгосрочное знание.

**В: Что если Pass 4 падает?**
Автоматический пайплайн (`npx claudeos-core init`) имеет статический фолбэк: если `claude -p` падает или `pass4-prompt.md` отсутствует, он создаёт каркас memory-слоя напрямую через `lib/memory-scaffold.js`. Когда `--lang` не английский, статический фолбэк **обязан** переводить через `claude` CLI — если и это падает, запуск прерывается с `InitError` (без тихого английского фолбэка). Перезапустите, когда `claude` аутентифицирован, или используйте `--lang en`, чтобы пропустить перевод. Результаты перевода кэшируются в `claudeos-core/generated/.i18n-cache-<lang>.json`, так что последующие запуски их переиспользуют.

**В: Что делают `memory compact` / `memory score` / `memory propose-rules`?**
См. секцию [Обслуживание Memory-слоя](#обслуживание-memory-слоя-v200) выше. Кратко: `compact` запускает 4-stage политику (резюмирование устаревшего, слияние дубликатов, удаление устаревшего low-importance, применение лимита 400 строк); `score` пересчитывает ранги `failure-patterns.md` по importance (frequency × recency); `propose-rules` выводит кандидатов на добавление правил из повторяющихся ошибок в `auto-rule-update.md` (не автоприменяется — просмотреть и принять/отклонить вручную).

**В: Почему `--force` (или режим resume «fresh») удаляет `.claude/rules/`?**
v2.0.0 добавил три Guard'а Pass 3 против silent-failure (Guard 3 покрывает два варианта incomplete-output: H2 для `guide/` и H1 для `standard/skills`). Guard 1 («частичное перемещение staged-rules») и Guard 3 («неполный вывод — отсутствующие/пустые guide-файлы или отсутствующий standard-sentinel / пустые skills») не зависят от существующих правил, но Guard 2 («обнаружено ноль правил») зависит — он срабатывает, когда Claude игнорирует директиву `staging-override.md` и пытается писать напрямую в `.claude/` (где политика чувствительных путей Claude Code это блокирует). Устаревшие правила от предыдущего запуска дали бы Guard 2 false-negative — поэтому `--force`/`fresh` очищает `.claude/rules/`, чтобы обеспечить чистое обнаружение. **Ручные правки файлов правил будут потеряны** при `--force`/`fresh`; сделайте бэкап при необходимости. (Примечание v2.1.0: Guard 3 H1 больше не проверяет `plan/`, поскольку master plans больше не генерируются.)

**В: Что такое `claudeos-core/generated/.staged-rules/` и зачем она существует?**
Политика чувствительных путей Claude Code отказывает в прямой записи в `.claude/` из подпроцесса `claude -p` (даже с `--dangerously-skip-permissions`). v2.0.0 обходит это, заставляя промпты Pass 3/4 перенаправлять все записи `.claude/rules/` в staging-директорию; оркестратор на Node.js (не подпадающий под эту политику) затем перемещает staged-дерево в `.claude/rules/` после каждого прохода. Это прозрачно для пользователя — директория автосоздаётся, автоочищается и автоперемещается. Если предыдущий запуск упал в середине перемещения, следующий запуск очищает staging-директорию перед повтором. В split-режиме v2.1.0 stage-раннер перемещает staged-правила в `.claude/rules/` после каждой стадии (не только в конце), так что краш в середине Pass 3 всё равно оставляет правила предыдущих завершённых стадий на месте.

**В: Можно ли запускать Pass 3 вручную вместо `npx claudeos-core init`?**
Да для малых проектов (≤5 доменов) — инструкции для single-call ручного режима в [Шаге 6](#шаг-6-pass-3--генерация-всей-документации-разбита-на-несколько-стадий) всё ещё работают. Для более крупных проектов следует использовать `npx claudeos-core init`, потому что split-раннер — это то, что оркестрирует постадийное выполнение со свежими контекстами, обрабатывает разбиение на батчи при ≥16 доменов, записывает корректную форму маркера `pass3-complete.json` (`mode: "split"` + `groupsCompleted`) и перемещает staged-правила между стадиями. Воспроизвести эту оркестрацию вручную возможно, но утомительно. Если у вас есть причина запускать стадии вручную (например, отладка конкретной стадии), можно подставить шаблон `pass3-prompt.md` с соответствующей директивой `STAGE:` и подать его `claude -p` напрямую — но не забудьте переместить `.staged-rules/` после каждой стадии и обновить маркер самостоятельно.

**В: Мой проект — апгрейд с v2.0.x, и у него есть существующая директория `claudeos-core/plan/`. Что делать?**
Ничего не требуется — инструменты v2.1.0 игнорируют `plan/`, когда она отсутствует или пуста, а `plan-validator` всё ещё обрабатывает legacy-проекты с заполненными директориями `plan/` для обратной совместимости. Вы можете безопасно удалить `claudeos-core/plan/`, если не нуждаетесь в бэкапах master plan (история git всё равно лучший бэкап). Если вы сохраните `plan/`, запуск `npx claudeos-core init` не будет её обновлять — новый контент не агрегируется в master plans в v2.1.0. Инструменты верификации обрабатывают оба случая чисто.

---

## Структура шаблонов

```
pass-prompts/templates/
├── common/                  # общие header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Роль + директива формата вывода (все pass)
│   ├── pass3-footer.md       # Инструкция health-check после Pass 3 + 5 CRITICAL блоков guardrail (v2.2.0)
│   ├── pass3-phase1.md       # Блок "Read Once, Extract Facts" с Rule A-E (v2.1.0)
│   ├── pass4.md              # Промпт скаффолдинга памяти (v2.0.0)
│   ├── staging-override.md   # Перенаправляет записи .claude/rules/** в .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # Детерминированный шаблон CLAUDE.md из 8 секций (v2.2.0)
│   └── lang-instructions.json # Директивы вывода по языкам (10 языков)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` автоматически определяет ваш стек/стеки, затем собирает специфичные по типу промпты. NestJS, Vue/Nuxt, Vite SPA и Flask каждый используют выделенные шаблоны с категориями анализа, специфичными для фреймворка (например, `@Module`/`@Injectable`/Guards для NestJS; `<script setup>`/Pinia/useFetch для Vue; client-side routing/`VITE_` env для Vite; Blueprint/`app.factory`/Flask-SQLAlchemy для Flask). Для мульти-стек проектов генерируются отдельные `pass1-backend-prompt.md` и `pass1-frontend-prompt.md`, а `pass3-prompt.md` комбинирует цели генерации обоих стеков. В v2.1.0 шаблон Pass 3 дополняется `common/pass3-phase1.md` (блок «Read Once, Extract Facts» с Rules A–E) перед тем, как нарезаться по стадиям split-режима. Pass 4 использует общий шаблон `common/pass4.md` (memory scaffolding) независимо от стека.

**В v2.2.0**, промпт Pass 3 также встраивает inline `common/claude-md-scaffold.md` (детерминированный шаблон CLAUDE.md из 8 секций) между блоком phase1 и stack-specific телом — это фиксирует структуру секций, так что генерируемые CLAUDE.md не дрейфуют между проектами, а содержимое всё ещё адаптируется к каждому проекту. Шаблоны написаны **English-first**; инъекция языка из `lang-instructions.json` указывает LLM переводить заголовки секций и прозу на целевой выходной язык во время emit.

---

## Поддержка монорепо

ClaudeOS-Core автоматически обнаруживает JS/TS монорепо-настройки и сканирует под-пакеты на зависимости.

**Поддерживаемые маркеры монорепо** (автообнаружение):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Запуск из корня монорепо** — ClaudeOS-Core читает `apps/*/package.json` и `packages/*/package.json` для обнаружения фреймворк/ORM/БД-зависимостей в под-пакетах:

```bash
cd my-monorepo
npx claudeos-core init
```

**Что обнаруживается:**
- Зависимости из `apps/web/package.json` (например, `next`, `react`) → frontend-стек
- Зависимости из `apps/api/package.json` (например, `express`, `prisma`) → backend-стек
- Зависимости из `packages/db/package.json` (например, `drizzle-orm`) → ORM/БД
- Пользовательские пути workspace из `pnpm-workspace.yaml` (например, `services/*`)

**Сканирование доменов также покрывает раскладки монорепо:**
- `apps/api/src/modules/*/` и `apps/api/src/*/` для backend-доменов
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` для frontend-доменов
- `packages/*/src/*/` для доменов shared-пакетов

```
my-monorepo/                    ← Запускайте здесь: npx claudeos-core init
├── turbo.json                  ← Автообнаружение как Turborepo
├── apps/
│   ├── web/                    ← Next.js обнаружен из apps/web/package.json
│   │   ├── app/dashboard/      ← Frontend-домен обнаружен
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express обнаружен из apps/api/package.json
│       ├── src/modules/users/  ← Backend-домен обнаружен
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle обнаружен из packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Примечание:** Для Kotlin/Java монорепо обнаружение мультимодулей использует `settings.gradle.kts` (см. [Обнаружение доменов Kotlin мультимодульных проектов](#обнаружение-доменов-kotlin-мультимодульных-проектов) выше) и не требует маркеров JS-монорепо.

## Устранение неполадок

**«claude: command not found»** — Claude Code CLI не установлен или не в PATH. См. [документацию Claude Code](https://code.claude.com/docs/en/overview).

**«npm install failed»** — Версия Node.js может быть слишком старой. Требуется v18+.

**«0 domains detected»** — Структура вашего проекта может быть нестандартной. См. паттерны обнаружения выше для вашего стека.

**«0 domains detected» в Kotlin-проекте** — Убедитесь, что ваш проект имеет `build.gradle.kts` (или `build.gradle` с kotlin-плагином) в корне, а исходные файлы находятся под `**/src/main/kotlin/`. Для мультимодульных проектов убедитесь, что `settings.gradle.kts` содержит `include()`-выражения. Одномодульные Kotlin-проекты (без `settings.gradle`) также поддерживаются — домены извлекаются из структуры package/class под `src/main/kotlin/`.

**«Language detected as java instead of kotlin»** — ClaudeOS-Core проверяет сначала корневой `build.gradle(.kts)`, затем build-файлы подмодулей. Если корневой build-файл использует плагин `java` без `kotlin`, но подмодули используют Kotlin, инструмент проверяет до 5 build-файлов подмодулей как фолбэк. Если всё равно не обнаружено, убедитесь, что хотя бы один `build.gradle.kts` содержит `kotlin("jvm")` или `org.jetbrains.kotlin`.

**«CQRS not detected»** — Обнаружение архитектуры полагается на имена модулей, содержащие ключевые слова `command` и `query`. Если ваши модули используют другое именование (например, `write-server`, `read-server`), архитектура CQRS не будет автоматически обнаружена. Вы можете вручную скорректировать сгенерированные промпты после запуска plan-installer.

**«Pass 3 produced 0 rule files under .claude/rules/» (v2.0.0)** — Сработал Guard 2: Claude проигнорировал директиву `staging-override.md` и попытался писать напрямую в `.claude/`, где политика чувствительных путей Claude Code блокирует запись. Перезапустите с `npx claudeos-core init --force`. Если ошибка повторяется, проверьте `claudeos-core/generated/pass3-prompt.md`, чтобы убедиться, что блок `staging-override.md` находится в начале.

**«Pass 3 finished but N rule file(s) could not be moved from staging» (v2.0.0)** — Сработал Guard 1: перемещение staging попало на временную блокировку файла (обычно Windows-антивирус или file-watcher). Маркер НЕ записан, так что следующий запуск `init` автоматически повторит Pass 3. Просто перезапустите `npx claudeos-core init`.

**«Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty» (v2.0.0)** — Сработал Guard 3 (H2): Claude обрезал ответ на середине после записи CLAUDE.md + rules, но до завершения (или начала) секции `claudeos-core/guide/` (ожидается 9 файлов). Также срабатывает на файле только с BOM или только с пробелами (заголовок был записан, но тело было обрезано). Без этого guard маркер завершения всё равно был бы записан, оставив `guide/` перманентно пустым на последующих запусках. Маркер здесь НЕ записывается, так что следующий запуск `init` повторит Pass 3 с теми же результатами Pass 2. Если повторяется, перезапустите с `npx claudeos-core init --force`, чтобы регенерировать с нуля.

**«Pass 3 finished but the following required output(s) are missing or empty» (v2.0.0, обновлено в v2.1.0)** — Сработал Guard 3 (H1): Claude обрезал ПОСЛЕ `claudeos-core/guide/`, но до (или во время) `claudeos-core/standard/` или `claudeos-core/skills/`. Требования: (a) `standard/00.core/01.project-overview.md` существует и не пуст (sentinel, записываемый промптом Pass 3 каждого стека), (b) `skills/` имеет ≥1 непустой `.md`. `database/` и `mcp-guide/` намеренно исключены (некоторые стеки законно производят ноль файлов). `plan/` больше не проверяется начиная с v2.1.0 (master plans были удалены). Тот же путь восстановления, что у Guard 3 (H2): перезапустить `init`, или `--force`, если повторяется.

**«Pass 3 split stage crashed partway through (v2.1.0)»** — Когда одна из split-стадий (например, `3b-1`, `3c-2`) падает в середине прогона, stage-level маркер НЕ записывается, но завершённые стадии ЗАПИСЫВАЮТСЯ в `pass3-complete.json.groupsCompleted`. Следующий запуск `init` читает этот массив и возобновляется с первой незавершённой стадии, пропуская всю ранее выполненную работу. Вам не нужно делать ничего вручную — просто перезапустите `npx claudeos-core init`. Если resume продолжает падать на одной и той же стадии, проверьте `claudeos-core/generated/pass3-prompt.md` на некорректное содержимое, затем попробуйте `--force` для полного перезапуска. Форма `pass3-complete.json` (`mode: "split"`, `groupsCompleted: [...]`) стабильна; отсутствующий или некорректный маркер приводит к повторному запуску всего Pass 3 с `3a`.

**«Pass 3 stale marker (shape mismatch) — treating as incomplete» (v2.1.0)** — `pass3-complete.json` от pre-v2.1.0 single-call прогона интерпретируется по новым правилам split-режима. Проверка формы ищет `mode: "split"` и массив `groupsCompleted`; если что-то из этого отсутствует, маркер трактуется как частичный, и Pass 3 перезапускается в split-режиме. Если вы обновились с v2.0.x, это ожидаемо один раз — следующий прогон запишет корректную форму маркера. Действий не требуется.

**«pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running» (v2.0.0)** — Info-лог, не ошибка. При resume `init` теперь парсит и валидирует `pass2-merged.json` (требуется ≥5 ключей верхнего уровня, зеркалируя порог `INSUFFICIENT_KEYS` из `pass-json-validator`). Скелет `{}` или некорректный JSON от предыдущего упавшего запуска автоматически удаляется, и Pass 2 перезапускается. Ручные действия не нужны — пайплайн самовосстанавливается. Если повторяется, проверьте `claudeos-core/generated/pass2-prompt.md` и попробуйте с `--force`.

**«Static fallback failed while translating to lang='ko'» (v2.0.0)** — Когда `--lang` не английский, Pass 4 / статический фолбэк / gap-fill все требуют `claude` CLI для перевода. Если перевод падает (CLI не аутентифицирован, тайм-аут сети или строгая валидация отклонила вывод: <40% длины, сломанные code-fence, потерянный frontmatter и т.д.), запуск прерывается вместо тихой записи на английском. Фикс: убедитесь, что `claude` аутентифицирован, или перезапустите с `--lang en`, чтобы пропустить перевод.

**«pass4-memory.json exists but memory/ is empty» (v2.0.0)** — Предыдущий запуск записал маркер, но пользователь (или cleanup-скрипт) удалил `claudeos-core/memory/`. CLI автоматически обнаруживает этот устаревший маркер и перезапускает Pass 4 на следующем `init`. Ручные действия не нужны.

**«pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4» (v2.0.0)** — Info-лог, не ошибка. Содержимое маркера Pass 4 теперь валидируется (`passNum === 4` + непустой массив `memoryFiles`), а не просто его наличие. Частичный сбой Claude, выдавший что-то вроде `{"error":"timeout"}` в теле маркера, раньше навсегда принимался бы как успех; теперь маркер удаляется, и Pass 4 автоматически перезапускается.

**«Could not delete stale pass3-complete.json / pass4-memory.json» InitError (v2.0.0)** — `init` обнаружил устаревший маркер (Pass 3: CLAUDE.md был удалён извне; Pass 4: memory/ пуста или тело маркера некорректно) и попытался его удалить, но вызов `unlinkSync` упал — обычно потому что Windows-антивирус или file-watcher (редактор, IDE-индексатор) держит файловый handle. Раньше это молча игнорировалось, из-за чего пайплайн пропускал проход и переиспользовал устаревший маркер. Теперь падает громко. Фикс: закройте редактор/AV-сканер, который мог держать файл открытым, затем перезапустите `npx claudeos-core init`.

**«CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation» InitError (v2.0.0)** — У вас установлена test-only env-переменная `CLAUDEOS_SKIP_TRANSLATION=1` в shell (вероятно, остаток от CI/test-настройки) И выбран неанглийский `--lang`. Эта env-переменная блокирует путь перевода, от которого зависят статический фолбэк Pass 4 и gap-fill для неанглийского вывода. `init` обнаруживает конфликт на этапе выбора языка и немедленно прерывается (вместо краша в середине Pass 4 с запутанной вложенной ошибкой). Фикс: либо `unset CLAUDEOS_SKIP_TRANSLATION` перед запуском, либо используйте `npx claudeos-core init --lang en`.

**Предупреждение «⚠️ v2.2.0 upgrade detected» (v2.2.0)** — Существующий `CLAUDE.md` был сгенерирован pre-v2.2.0 версией. Regeneration в default resume mode пропустит existing файлы согласно Rule B idempotency, поэтому структурные улучшения v2.2.0 (8-секционный CLAUDE.md scaffold, per-file paths в `40.infra/*`, точность порта на основе `.env.example`, редизайн Section 8 `Common Rules & Memory (L4)` (редизайн с двумя под-секциями: Common Rules · L4 Memory), строка правил `60.memory/*`, forward-referenced `04.doc-writing-guide.md`) НЕ будут применены. Fix: перезапустите с `npx claudeos-core init --force`. Это перезапишет generated файлы (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`), сохраняя при этом `claudeos-core/memory/` (накопленные decision-log, failure-patterns — append-only). Сделайте commit проекта перед `--force`, если хотите сделать diff перезаписей.

**Port в CLAUDE.md отличается от `.env.example` (v2.2.0)** — Новый `.env` parser stack-detector-а (`lib/env-parser.js`) сначала читает `.env.example` (canonical, committed), затем варианты `.env` как fallback. Распознаваемые port-переменные: `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT` и т.д. Для Spring Boot `server.port` из `application.yml` по-прежнему имеет приоритет над `.env` (framework-native config выигрывает). Если проект использует нестандартное имя env-переменной, переименуйте её в распознаваемое соглашение или создайте issue для расширения `PORT_VAR_KEYS`. Framework-дефолты (Vite 5173, Next.js 3000, Django 8000) используются только когда и direct detection, и `.env` молчат.

**Secret-значения redacted как `***REDACTED***` в generated docs (v2.2.0)** — Ожидаемое поведение. `.env` parser v2.2.0 автоматически redact-ит значения переменных, соответствующих паттернам `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY`, до того как они достигнут любого генератора. Это defense-in-depth против случайно закоммиченных секретов в `.env.example`. `DATABASE_URL` сохраняется as-is для back-compat идентификации DB в stack-detector. Если вы видите `***REDACTED***` где-либо в generated `CLAUDE.md`, это баг — redacted-значения не должны попадать в таблицу; пожалуйста, создайте issue. Non-sensitive runtime config (port, host, API target, NODE_ENV и т.д.) проходит без изменений.

---

## Контрибьюции

Контрибьюции приветствуются! Области, где помощь нужна больше всего:

- **Новые шаблоны стеков** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Интеграция с IDE** — расширение VS Code, плагин IntelliJ
- **CI/CD-шаблоны** — GitLab CI, CircleCI, примеры Jenkins (GitHub Actions уже поставлен — см. `.github/workflows/test.yml`)
- **Покрытие тестами** — расширение тестового пакета (в настоящее время 602 теста в 30 тестовых файлах, покрывающих сканеры, определение стека, группировку доменов, парсинг планов, генерацию промптов, CLI-селекторы, определение монорепо, определение Vite SPA, инструменты верификации, L4 memory scaffold, валидацию resume Pass 2, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + строгий stale-marker unlink), Pass 3 split-mode разбиение на батчи, Pass 3 partial-marker resume (v2.1.0), валидацию содержимого маркера Pass 4 + строгость stale-marker unlink + scaffoldSkillsManifest gap-fill (v2.1.0), translation env-skip guard + early fail-fast + CI workflow, перемещение staged-rules, lang-aware translation fallback, regression-сюиту удаления master plan (v2.1.0), регрессию форматирования memory score/compact (v2.1.0) структуру шаблона AI Work Rules и извлечение port/host/API-target парсером `.env` + redaction чувствительных переменных (v2.2.0))

См. [`CONTRIBUTING.md`](./CONTRIBUTING.md) для полного списка областей, стиля кода, конвенции коммитов и пошагового руководства по добавлению нового шаблона стека.

---

## Автор

Создано **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Лицензия

ISC
