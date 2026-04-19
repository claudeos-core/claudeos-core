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

Автоматически определяется: язык и версия, фреймворк и версия (включая Vite как SPA-фреймворк), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy и др.), база данных (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), пакетный менеджер (Gradle, Maven, npm, yarn, pnpm, pip, poetry), архитектура (CQRS, BFF — из имён модулей), мультимодульная структура (из settings.gradle), монорепозиторий (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**Вам не нужно ничего указывать. Всё определяется автоматически.**

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

Готово. Через 5–20 минут (Pass 1×N + Pass 2 + Pass 3 + Pass 4 memory scaffolding) вся документация будет сгенерирована и готова к использованию. CLI показывает прогресс-бар с процентом, прошедшим временем и ETA для каждого прохода.

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

# Guide, Plan, Database, MCP, Generated, Memory (v2.0.0: добавлена memory)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated,memory}
```

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
- `pass3-prompt.md` — промпт генерации (обёрнут директивой `staging-override.md` — см. примечание к Шагу 6)
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

#### Шаг 6: Pass 3 — Генерация всей документации

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `CLAUDE.md` должен существовать в корне проекта, маркер `claudeos-core/generated/pass3-complete.json` должен быть записан.

> **Примечание (v2.0.0):** Pass 3 сначала пишет файлы правил в `claudeos-core/generated/.staged-rules/`, потому что политика чувствительных путей Claude Code блокирует прямую запись в `.claude/`. Автоматический пайплайн (`npx claudeos-core init`) выполняет перемещение автоматически. Если вы запускаете этот шаг вручную, вам нужно переместить staged-дерево самостоятельно: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (сохраняя подпути).

#### Шаг 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `claudeos-core/memory/` должна содержать 4 файла (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` должна содержать 4 файла правил, `claudeos-core/plan/50.memory-master.md` должен существовать, и к `CLAUDE.md` должна быть добавлена секция `## Memory (L4)`. Маркер: `claudeos-core/generated/pass4-memory.json`.

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
    ├── [1] npm install                    ← Зависимости (~10с)
    ├── [2] Структура директорий           ← Создание папок (~1с)
    ├── [3] plan-installer (Node.js)       ← Сканирование проекта (~5с)
    │       ├── Автоопределение стека (multi-stack)
    │       ├── Извлечение списка доменов (тегирование: backend/frontend)
    │       ├── Разбиение на группы доменов (по типу)
    │       └── Выбор стек-специфических промптов (по типу)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Глубокий анализ кода (~2-8мин)
    │       ├── ⚙️ Backend-группы → backend-промпт
    │       └── 🎨 Frontend-группы → frontend-промпт
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Слияние анализа (~1мин)
    │       └── Консолидация ВСЕХ результатов Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Генерация всего (~3-5мин)
    │       └── Объединённый промпт (цели backend + frontend)
    │
    ├── [7] Pass 4 × 1  (claude -p)       ← Memory scaffolding (~30с)
    │       ├── Сидинг memory/ (decision-log, failure-patterns, …)
    │       ├── Генерация правил 60.memory/
    │       ├── Добавление секции "Memory (L4)" в CLAUDE.md
    │       └── Сборка плана 50.memory-master.md
    │
    └── [8] Верификация                    ← Автозапуск health-checker
```

### Почему 4 прохода?

**Pass 1** — единственный проход, читающий ваш исходный код. Он выбирает репрезентативные файлы по домену и извлекает паттерны по 55–95 категориям анализа (зависит от стека). Для больших проектов Pass 1 запускается несколько раз — по одному на группу доменов. В мульти-стек проектах (например, Java backend + React frontend) backend- и frontend-домены используют **разные промпты анализа**, адаптированные к каждому стеку.

**Pass 2** объединяет все результаты Pass 1 в единый анализ: общие паттерны (100% общие), паттерны большинства (50%+ общие), доменно-специфические паттерны, анти-паттерны по степени серьёзности и сквозные аспекты (именование, безопасность, БД, тестирование, логирование, производительность). Результаты backend и frontend сливаются воедино.

**Pass 3** берёт объединённый анализ и генерирует всю файловую экосистему (CLAUDE.md, rules, standards, skills, guides). Он никогда не читает исходный код — только JSON анализа. В мульти-стек режиме промпт генерации комбинирует backend- и frontend-цели, так что оба набора стандартов генерируются за один проход.

**Pass 4** создаёт каркас слоя L4 Memory: файлы персистентного командного знания (decision-log, failure-patterns, политика компакции, auto-rule-update) плюс правила `60.memory/`, которые указывают будущим сессиям, когда и как читать/записывать эти файлы. Слой памяти — это то, что позволяет Claude Code накапливать уроки между сессиями, а не открывать их заново каждый раз. Когда `--lang` не английский, статический контент фолбэка переводится через Claude перед записью.

---

## Структура сгенерированных файлов

```
your-project/
│
├── CLAUDE.md                          ← Точка входа Claude Code
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
│   │   ├── pass3-prompt.md            ← Промпт генерации (объединённый)
│   │   ├── pass4-prompt.md            ← Промпт memory scaffolding (v2.0.0)
│   │   ├── pass3-complete.json        ← Маркер завершения Pass 3 (пропуск при resume)
│   │   ├── pass4-memory.json          ← Маркер завершения Pass 4 (пропуск при resume)
│   │   ├── .i18n-cache-<lang>.json    ← Кэш переводов (неанглийский `--lang`)
│   │   └── .staged-rules/             ← Временная staging-директория для записей `.claude/rules/` (авто-перемещение + очистка)
│   ├── standard/                      ← Стандарты кодирования (15-19 файлов)
│   │   ├── 00.core/                   ← Обзор, архитектура, именование
│   │   ├── 10.backend-api/            ← API-паттерны (стек-специфические)
│   │   ├── 20.frontend-ui/            ← Frontend-паттерны (если обнаружены)
│   │   ├── 30.security-db/            ← Безопасность, схема БД, утилиты
│   │   ├── 40.infra/                  ← Конфиг, логирование, CI/CD
│   │   ├── 50.verification/           ← Верификация сборки, тестирование
│   │   └── 90.optional/               ← Опциональные конвенции (стек-специфические дополнения)
│   ├── skills/                        ← Skills для CRUD scaffolding
│   ├── guide/                         ← Онбординг, FAQ, troubleshooting (9 файлов)
│   ├── plan/                          ← Мастер-планы (backup/restore)
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

| Размер | Домены | Запусков Pass 1 | Всего `claude -p` | Расч. время |
|---|---|---|---|---|
| Малый | 1–4 | 1 | 4 (Pass 1 + 2 + 3 + 4) | ~5–6мин |
| Средний | 5–8 | 2 | 5 | ~8–9мин |
| Крупный | 9–16 | 3–4 | 6–7 | ~12–13мин |
| X-Крупный | 17+ | 5+ | 8+ | ~18мин+ |

Pass 4 (memory scaffolding) добавляет ~30с сверх проходов анализа. Для мульти-стек проектов (например, Java + React) backend- и frontend-домены считаются вместе. Проект с 6 backend + 4 frontend доменами = 10 суммарно, масштабируется как «Крупный».

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
| **manifest-generator** | Строит JSON метаданных (rule-manifest, sync-map, plan-manifest); индексирует 7 директорий включая `memory/` (`totalMemory` в summary) |
| **plan-validator** | Сравнивает блоки `<file>` из Master Plan с диском — 3 режима: check, refresh, restore |
| **sync-checker** | Обнаруживает незарегистрированные файлы (на диске, но не в плане) и осиротевшие записи — покрывает 7 директорий (`memory/` добавлена в v2.0.0) |
| **content-validator** | 9-секционная проверка качества — пустые файлы, отсутствующие ✅/❌ примеры, обязательные секции плюс целостность каркаса L4 memory (даты заголовков decision-log, обязательные поля failure-pattern, fence-aware парсинг) |
| **pass-json-validator** | Валидирует структуру JSON Pass 1–4 плюс completion-маркеры `pass3-complete.json` и `pass4-memory.json` |

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
| `claudeos-core/plan/` | Бэкапы Master Plan (~340KB). Используйте `npx claudeos-core refresh` для синхронизации. |
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
# Восстановить всё из Master Plan
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
```

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
Он вызывает `claude -p` 4–8 раз (Pass 1 × N + Pass 2 + Pass 3 + Pass 4). Это в пределах нормального использования Claude Code. Когда `--lang` не английский, путь статического фолбэка может вызвать несколько дополнительных `claude -p` для перевода; результаты кэшируются в `claudeos-core/generated/.i18n-cache-<lang>.json`, так что последующие запуски их переиспользуют.

**В: Стоит ли коммитить сгенерированные файлы в Git?**
Да, рекомендуется. Ваша команда может использовать одинаковые стандарты Claude Code. Подумайте о добавлении `claudeos-core/generated/` в `.gitignore` (JSON анализа регенерируется).

**В: Что насчёт проектов со смешанным стеком (например, Java backend + React frontend)?**
Полностью поддерживается. ClaudeOS-Core автоматически определяет оба стека, тегирует домены как `backend` или `frontend` и использует стек-специфические промпты анализа для каждого. Pass 2 сливает всё, а Pass 3 генерирует стандарты и backend, и frontend за один проход.

**В: Работает ли он с Turborepo / pnpm workspaces / Lerna-монорепо?**
Да. ClaudeOS-Core обнаруживает `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` или `package.json#workspaces` и автоматически сканирует файлы `package.json` в под-пакетах на фреймворк/ORM/БД-зависимости. Сканирование доменов покрывает паттерны `apps/*/src/` и `packages/*/src/`. Запускать из корня монорепо.

**В: Что происходит при повторном запуске?**
Если существуют предыдущие результаты Pass 1/2, интерактивный промпт позволяет выбрать: **Continue** (продолжить с места остановки) или **Fresh** (удалить всё и начать заново). Используйте `--force`, чтобы пропустить промпт и всегда начинать заново. Pass 3 всегда перезапускается. Предыдущие версии можно восстановить из Master Plans.

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
v2.0.0 добавил три Guard'а Pass 3 против silent-failure (Guard 3 покрывает два варианта incomplete-output: H2 для `guide/` и H1 для `standard/skills/plan`). Guard 1 («частичное перемещение staged-rules») и Guard 3 («неполный вывод — отсутствующие/пустые guide-файлы или отсутствующий standard-sentinel / пустые skills / пустой plan») не зависят от существующих правил, но Guard 2 («обнаружено ноль правил») зависит — он срабатывает, когда Claude игнорирует директиву `staging-override.md` и пытается писать напрямую в `.claude/` (где политика чувствительных путей Claude Code это блокирует). Устаревшие правила от предыдущего запуска дали бы Guard 2 false-negative — поэтому `--force`/`fresh` очищает `.claude/rules/`, чтобы обеспечить чистое обнаружение. **Ручные правки файлов правил будут потеряны** при `--force`/`fresh`; сделайте бэкап при необходимости.

**В: Что такое `claudeos-core/generated/.staged-rules/` и зачем она существует?**
Политика чувствительных путей Claude Code отказывает в прямой записи в `.claude/` из подпроцесса `claude -p` (даже с `--dangerously-skip-permissions`). v2.0.0 обходит это, заставляя промпты Pass 3/4 перенаправлять все записи `.claude/rules/` в staging-директорию; оркестратор на Node.js (не подпадающий под эту политику) затем перемещает staged-дерево в `.claude/rules/` после каждого прохода. Это прозрачно для пользователя — директория автосоздаётся, автоочищается и автоперемещается. Если предыдущий запуск упал в середине перемещения, следующий запуск очищает staging-директорию перед повтором.

---

## Структура шаблонов

```
pass-prompts/templates/
├── common/                  # Общий header/footer + pass4 + staging-override
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

`plan-installer` автоматически определяет ваш стек/стеки, затем собирает специфичные по типу промпты. NestJS, Vue/Nuxt, Vite SPA и Flask каждый используют выделенные шаблоны с категориями анализа, специфичными для фреймворка (например, `@Module`/`@Injectable`/Guards для NestJS; `<script setup>`/Pinia/useFetch для Vue; client-side routing/`VITE_` env для Vite; Blueprint/`app.factory`/Flask-SQLAlchemy для Flask). Для мульти-стек проектов генерируются отдельные `pass1-backend-prompt.md` и `pass1-frontend-prompt.md`, а `pass3-prompt.md` комбинирует цели генерации обоих стеков. Pass 4 использует общий шаблон `common/pass4.md` (memory scaffolding) независимо от стека.

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

**«Pass 3 finished but the following required output(s) are missing or empty» (v2.0.0)** — Сработал Guard 3 (H1): Claude обрезал ПОСЛЕ `claudeos-core/guide/`, но до (или во время) `claudeos-core/standard/`, `claudeos-core/skills/` или `claudeos-core/plan/`. Требования: (a) `standard/00.core/01.project-overview.md` существует и не пуст (sentinel, записываемый промптом Pass 3 каждого стека), (b) `skills/` имеет ≥1 непустой `.md`, (c) `plan/` имеет ≥1 непустой `.md`. `database/` и `mcp-guide/` намеренно исключены (некоторые стеки законно производят ноль файлов). Тот же путь восстановления, что у Guard 3 (H2): перезапустить `init`, или `--force`, если повторяется.

**«pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running» (v2.0.0)** — Info-лог, не ошибка. При resume `init` теперь парсит и валидирует `pass2-merged.json` (требуется ≥5 ключей верхнего уровня, зеркалируя порог `INSUFFICIENT_KEYS` из `pass-json-validator`). Скелет `{}` или некорректный JSON от предыдущего упавшего запуска автоматически удаляется, и Pass 2 перезапускается. Ручные действия не нужны — пайплайн самовосстанавливается. Если повторяется, проверьте `claudeos-core/generated/pass2-prompt.md` и попробуйте с `--force`.

**«Static fallback failed while translating to lang='ko'» (v2.0.0)** — Когда `--lang` не английский, Pass 4 / статический фолбэк / gap-fill все требуют `claude` CLI для перевода. Если перевод падает (CLI не аутентифицирован, тайм-аут сети или строгая валидация отклонила вывод: <40% длины, сломанные code-fence, потерянный frontmatter и т.д.), запуск прерывается вместо тихой записи на английском. Фикс: убедитесь, что `claude` аутентифицирован, или перезапустите с `--lang en`, чтобы пропустить перевод.

**«pass4-memory.json exists but memory/ is empty» (v2.0.0)** — Предыдущий запуск записал маркер, но пользователь (или cleanup-скрипт) удалил `claudeos-core/memory/`. CLI автоматически обнаруживает этот устаревший маркер и перезапускает Pass 4 на следующем `init`. Ручные действия не нужны.

**«pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4» (v2.0.0)** — Info-лог, не ошибка. Содержимое маркера Pass 4 теперь валидируется (`passNum === 4` + непустой массив `memoryFiles`), а не просто его наличие. Частичный сбой Claude, выдавший что-то вроде `{"error":"timeout"}` в теле маркера, раньше навсегда принимался бы как успех; теперь маркер удаляется, и Pass 4 автоматически перезапускается.

**«Could not delete stale pass3-complete.json / pass4-memory.json» InitError (v2.0.0)** — `init` обнаружил устаревший маркер (Pass 3: CLAUDE.md был удалён извне; Pass 4: memory/ пуста или тело маркера некорректно) и попытался его удалить, но вызов `unlinkSync` упал — обычно потому что Windows-антивирус или file-watcher (редактор, IDE-индексатор) держит файловый handle. Раньше это молча игнорировалось, из-за чего пайплайн пропускал проход и переиспользовал устаревший маркер. Теперь падает громко. Фикс: закройте редактор/AV-сканер, который мог держать файл открытым, затем перезапустите `npx claudeos-core init`.

**«CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation» InitError (v2.0.0)** — У вас установлена test-only env-переменная `CLAUDEOS_SKIP_TRANSLATION=1` в shell (вероятно, остаток от CI/test-настройки) И выбран неанглийский `--lang`. Эта env-переменная блокирует путь перевода, от которого зависят статический фолбэк Pass 4 и gap-fill для неанглийского вывода. `init` обнаруживает конфликт на этапе выбора языка и немедленно прерывается (вместо краша в середине Pass 4 с запутанной вложенной ошибкой). Фикс: либо `unset CLAUDEOS_SKIP_TRANSLATION` перед запуском, либо используйте `npx claudeos-core init --lang en`.

---

## Контрибьюции

Контрибьюции приветствуются! Области, где помощь нужна больше всего:

- **Новые шаблоны стеков** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Интеграция с IDE** — расширение VS Code, плагин IntelliJ
- **CI/CD-шаблоны** — GitLab CI, CircleCI, примеры Jenkins (GitHub Actions уже поставлен — см. `.github/workflows/test.yml`)
- **Покрытие тестами** — расширение тестового пакета (в настоящее время 489 тестов в 24 тестовых файлах, покрывающих сканеры, определение стека, группировку доменов, парсинг планов, генерацию промптов, CLI-селекторы, определение монорепо, определение Vite SPA, инструменты верификации, L4 memory scaffold, валидацию resume Pass 2, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + строгий stale-marker unlink), валидацию содержимого маркера Pass 4 + строгость stale-marker unlink, translation env-skip guard + early fail-fast + CI workflow, перемещение staged-rules, lang-aware translation fallback и структуру шаблона AI Work Rules)

См. [`CONTRIBUTING.md`](./CONTRIBUTING.md) для полного списка областей, стиля кода, конвенции коммитов и пошагового руководства по добавлению нового шаблона стека.

---

## Автор

Создано **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Лицензия

ISC
