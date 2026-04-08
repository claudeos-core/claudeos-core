# ClaudeOS-Core

**Единственный инструмент, который сначала читает ваш исходный код, подтверждает стек и паттерны детерминированным анализом, а затем генерирует правила Claude Code, точно адаптированные к вашему проекту.**

```bash
npx claudeos-core init
```

ClaudeOS-Core читает вашу кодовую базу, извлекает все паттерны и генерирует полный набор Standards, Rules, Skills и Guides, адаптированных под _ваш_ проект. После этого, когда вы говорите Claude Code «Создай CRUD для заказов», он генерирует код, точно соответствующий вашим существующим паттернам.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Почему ClaudeOS-Core?

> Человек описывает проект → LLM генерирует документацию

ClaudeOS-Core:

> Код анализирует исходники → Код строит кастомный промпт → LLM генерирует документацию → Код верифицирует вывод

### Ключевая проблема: LLM угадывает. Код подтверждает.

Когда вы просите Claude «проанализировать проект», он **угадывает** стек, ORM, структуру доменов.

**ClaudeOS-Core не угадывает.** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### Результат

Другие инструменты создают «в целом хорошую» документацию.
ClaudeOS-Core создаёт документацию, которая знает, что ваш проект использует `ApiResponse.ok()` (а не `ResponseEntity.success()`), что MyBatis XML маппер находится в `src/main/resources/mybatis/mappers/` — потому что он прочитал ваш реальный код.

### Before & After

**Без ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**С ClaudeOS-Core**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

Эта разница накапливается. 10 задач/день × 20 минут экономии = **более 3 часов в день**.

---

## Поддерживаемые стеки

| Стек | Обнаружение | Глубина анализа |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 паттернов пакетов | 10 категорий, 59 подпунктов |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 категорий, 95 подпунктов |
| **Node.js / Express** | `package.json` | 9 категорий, 57 подпунктов |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 категорий, 68 подпунктов |
| **Next.js / React** | `package.json`, `next.config.*`, поддержка FSD | 9 категорий, 55 подпунктов |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 категорий, 58 подпунктов |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 категорий, 55 подпунктов |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 категорий, 58 подпунктов |
| **Node.js / Fastify** | `package.json` | 10 категорий, 62 подпункта |
| **Angular** | `package.json`, `angular.json` | 12 категорий, 78 подпунктов |

Автоматическое определение: язык и версия, фреймворк и версия, ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy и др.), база данных (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), пакетный менеджер (Gradle, Maven, npm, yarn, pnpm, pip, poetry), архитектура (CQRS, BFF — определяется из имён модулей), мультимодульная структура (из settings.gradle), монорепозиторий (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**Вам не нужно ничего указывать. Всё определяется автоматически.**


### Обнаружение Java-доменов (5 паттернов с фолбэком)

| Приоритет | Паттерн | Структура | Пример |
|---|---|---|---|
| A | Слой-первый | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Домен-первый | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Модуль-префикс | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Гексагональный | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Плоский | `controller/*.java` | `controller/UserController.java` → извлекает `user` из имени класса |

Домены только с сервисами (без контроллеров) тоже обнаруживаются через директории `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Пропускаются: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` и т.д.


### Обнаружение доменов Kotlin мультимодульных проектов

Для проектов Kotlin с Gradle мультимодульной структурой (например: CQRS монорепо):

| Шаг | Действие | Пример |
|---|---|---|
| 1 | Сканирование `settings.gradle.kts` на наличие `include()` | Найдено 14 модулей |
| 2 | Определение типа модуля по имени | `reservation-command-server` → тип: `command` |
| 3 | Извлечение домена из имени модуля | `reservation-command-server` → домен: `reservation` |
| 4 | Группировка одного домена по модулям | `reservation-command-server` + `common-query-server` → 1 домен |
| 5 | Определение архитектуры | Есть модули `command` + `query` → CQRS |

Поддерживаемые типы модулей: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Общие библиотеки (`shared-lib`, `integration-lib`) обнаруживаются как специальные домены.

### Обнаружение фронтенд-доменов

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client разделение**: Обнаружение паттерна `client.tsx`, отслеживание разделения Server/Client
- **Фолбэк конфигурации**: Обнаружение Next.js/Vite/Nuxt из конфиг-файлов (поддержка monorepo)
- **Фолбэк глубоких директорий**: Для React/CRA/Vite/Vue/RN проектов сканирует `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` на любой глубине

---

## Быстрый старт

### Предварительные требования

- **Node.js** v18+
- **Claude Code CLI** (установлен и авторизован)

### Установка

```bash
cd /your/project/root

# Вариант A: npx (рекомендуется — установка не нужна)
npx claudeos-core init

# Вариант B: глобальная установка
npm install -g claudeos-core
claudeos-core init

# Вариант C: devDependency проекта
npm install --save-dev claudeos-core
npx claudeos-core init

# Вариант D: git clone (для разработки/контрибуции)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Кроссплатформенный (PowerShell, CMD, Bash, Zsh — любой терминал)
node claudeos-core-tools/bin/cli.js init

# Только Linux/macOS (только Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Язык вывода (10 языков)

При запуске `init` без `--lang` появляется интерактивный селектор (стрелки или цифровые клавиши):

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Сгенерированные файлы (CLAUDE.md, Standards, Rules,
  Skills, Guides) будут написаны на русском языке.

     1. en     — English
     ...
  ❯  8. ru     — Русский (Russian)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

При навигации описание переключается на соответствующий язык. Чтобы пропустить селектор:

```bash
npx claudeos-core init --lang ru    # Русский
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **Примечание:** Эта настройка изменяет только язык генерируемых файлов документации. Анализ кода (Pass 1–2) всегда выполняется на английском; только результат генерации (Pass 3) пишется на выбранном языке.

Это всё. Через 5–18 минут вся документация сгенерирована и готова к использованию. CLI показывает время каждого Pass и общее время в баннере завершения.

### Ручная пошаговая установка

Если вы хотите полностью контролировать каждый этап — или если автоматический пайплайн сбоит на каком-то шаге — можно запустить каждый этап вручную. Это также полезно для понимания внутренней работы ClaudeOS-Core.

#### Step 1: Клонирование и установка зависимостей

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Создание структуры каталогов

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: Запуск plan-installer (анализ проекта)

Сканирует ваш проект, определяет стек, находит домены, разделяет на группы и генерирует промпты.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Вывод (`claudeos-core/generated/`):**
- `project-analysis.json` — обнаруженный стек, домены, информация о фронтенде
- `domain-groups.json` — группы доменов для Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — промпты анализа
- `pass2-prompt.md` — промпт объединения
- `pass3-prompt.md` — промпт генерации

Вы можете проверить эти файлы для верификации точности определения перед продолжением.

#### Step 4: Pass 1 — Глубокий анализ кода по группам доменов

Запустите Pass 1 для каждой группы доменов. Проверьте `domain-groups.json` для количества групп.

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# Для фронтенд-групп используйте pass1-frontend-prompt.md
```

**Проверка:** `ls claudeos-core/generated/pass1-*.json` должен показать по одному JSON на группу.

#### Step 5: Pass 2 — Объединение результатов анализа

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `claudeos-core/generated/pass2-merged.json` должен существовать с 9+ ключами верхнего уровня.

#### Step 6: Pass 3 — Генерация всей документации

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Проверка:** `CLAUDE.md` должен существовать в корне проекта.

#### Step 7: Запуск инструментов проверки

```bash
# Генерация метаданных (обязательно перед другими проверками)
node claudeos-core-tools/manifest-generator/index.js

# Запуск всех проверок
node claudeos-core-tools/health-checker/index.js

# Или запуск отдельных проверок:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: Проверка результатов

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Совет:** Если какой-то шаг не удался, можно перезапустить только этот шаг. Результаты Pass 1/2 кешируются — если `pass1-N.json` или `pass2-merged.json` уже существует, автоматический пайплайн их пропускает. Используйте `npx claudeos-core init --force`, чтобы удалить предыдущие результаты и начать заново.

### Начинайте использовать

```
# В Claude Code — просто говорите естественным языком:
"Создай CRUD для домена заказов"
"Добавь API аутентификации пользователей"
"Рефакторинг этого кода по паттернам проекта"

# Claude Code автоматически ссылается на сгенерированные Standards, Rules и Skills.
```

---

## Как это работает — 3-Pass конвейер

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Зависимости (~10с)
    ├── [2] Структура директорий           ← Создание папок (~1с)
    ├── [3] plan-installer (Node.js)       ← Сканирование проекта (~5с)
    │       ├── Автоопределение стека (мульти-стек)
    │       ├── Извлечение списка доменов (теги: backend/frontend)
    │       ├── Разделение на группы доменов (по типу)
    │       └── Выбор промптов под стек (по типу)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Глубокий анализ кода (~2-8 мин)
    │       ├── ⚙️ Backend-группы → backend-промпт
    │       └── 🎨 Frontend-группы → frontend-промпт
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Слияние анализа (~1 мин)
    │       └── Консолидация ВСЕХ результатов Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Генерация всего (~3-5 мин)
    │       └── Объединённый промпт (цели backend + frontend)
    │
    └── [7] Валидация                      ← Автозапуск health checker
```

### Почему 3 Pass?

**Pass 1** — единственный pass, который читает исходный код. Он выбирает репрезентативные файлы по доменам и извлекает паттерны по 55–95 категориям анализа (по стеку). Для крупных проектов Pass 1 запускается несколько раз — по одному на группу доменов. В мульти-стек проектах (например: Java backend + React frontend) backend и frontend используют **разные промпты анализа**, адаптированные под каждый стек.

**Pass 2** объединяет все результаты Pass 1 в единый анализ: общие паттерны (100% совпадение), мажоритарные паттерны (50%+), доменно-специфичные паттерны, анти-паттерны по степени серьёзности и сквозные аспекты (именование, безопасность, БД, тестирование, логирование, производительность).

**Pass 3** берёт объединённый анализ и генерирует всю файловую экосистему. Он никогда не читает исходный код — только JSON анализа. В мульти-стек режиме промпт генерации объединяет цели backend и frontend, чтобы оба набора стандартов были сгенерированы за один pass.

---

## Структура сгенерированных файлов

```
your-project/
│
├── CLAUDE.md                          ← Точка входа Claude Code
│
├── .claude/
│   └── rules/                         ← Glob-триггерные правила
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Правила напоминания о синхронизации
│
├── claudeos-core/                     ← Основная директория вывода
│   ├── generated/                     ← JSON анализа + динамические промпты
│   ├── standard/                      ← Стандарты кода (15-19 файлов)
│   ├── skills/                        ← Skills скаффолдинга CRUD
│   ├── guide/                         ← Онбординг, FAQ, устранение неполадок (9 файлов)
│   ├── plan/                          ← Master Plans (бэкап/восстановление)
│   ├── database/                      ← Схема БД, руководство миграции
│   └── mcp-guide/                     ← Руководство интеграции MCP-сервера
│
└── claudeos-core-tools/               ← Этот тулкит (не изменять)
```

Каждый файл стандарта включает ✅ правильные примеры, ❌ неправильные примеры и таблицу сводки правил — всё выведено из ваших реальных паттернов кода, а не из шаблонов.

---

## Автомасштабирование по размеру проекта

| Размер | Домены | Запуски Pass 1 | Всего `claude -p` | Ожидаемое время |
|---|---|---|---|---|
| Малый | 1–4 | 1 | 3 | ~5 мин |
| Средний | 5–8 | 2 | 4 | ~8 мин |
| Большой | 9–16 | 3–4 | 5–6 | ~12 мин |
| Очень большой | 17+ | 5+ | 7+ | ~18 мин+ |

Для мульти-стек проектов (например: Java + React) домены backend и frontend считаются вместе. 6 backend + 4 frontend = 10 доменов, масштабируется как «Большой».

---

## Инструменты валидации

ClaudeOS-Core включает 5 встроенных инструментов проверки, автоматически запускаемых после генерации:

```bash
# Запустить все проверки сразу (рекомендуется)
npx claudeos-core health

# Отдельные команды
npx claudeos-core validate     # Сравнение Plan ↔ диск
npx claudeos-core refresh      # Синхронизация Диск → Plan
npx claudeos-core restore      # Восстановление Plan → Диск
```

| Инструмент | Что делает |
|---|---|
| **manifest-generator** | Создаёт JSON метаданных (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Сравнивает блоки `<file>` Master Plan с диском — 3 режима: check, refresh, restore |
| **sync-checker** | Обнаруживает незарегистрированные файлы (на диске, но не в плане) и осиротевшие записи |
| **content-validator** | Проверяет качество файлов — пустые файлы, отсутствующие примеры ✅/❌, обязательные секции |
| **pass-json-validator** | Проверяет структуру JSON Pass 1–3, обязательные ключи и полноту секций |

---

## Как Claude Code использует вашу документацию

Вот как Claude Code фактически читает документацию, сгенерированную ClaudeOS-Core:

### Автоматически читаемые файлы

| Файл | Когда | Гарантия |
|---|---|---|
| `CLAUDE.md` | При начале каждого разговора | Всегда |
| `.claude/rules/00.core/*` | При редактировании файлов (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/10.backend/*` | При редактировании файлов (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/30.security-db/*` | При редактировании файлов (`paths: ["**/*"]`) | Всегда |
| `.claude/rules/40.infra/*` | Только при редактировании config/infra файлов (ограниченные paths) | Условно |
| `.claude/rules/50.sync/*` | Только при редактировании claudeos-core файлов (ограниченные paths) | Условно |

### Файлы, читаемые по запросу через ссылки в правилах

Каждый файл правил ссылается на соответствующий standard в секции `## Reference`. Claude читает только standard, релевантный текущей задаче:

- `claudeos-core/standard/**` — Паттерны кодирования, примеры ✅/❌, соглашения об именах
- `claudeos-core/database/**` — Схема БД (для запросов, мапперов, миграций)

`00.standard-reference.md` служит каталогом для обнаружения standards без соответствующего правила.

### Файлы, которые НЕ читаются (экономия контекста)

Явно исключены через секцию `DO NOT Read` правила standard-reference:

| Папка | Причина исключения |
|---|---|
| `claudeos-core/plan/` | Резервные копии Master Plan (~340КБ). Используйте `npx claudeos-core refresh` для синхронизации. |
| `claudeos-core/generated/` | JSON метаданных сборки. Не для кодирования. |
| `claudeos-core/guide/` | Руководства для людей. |
| `claudeos-core/mcp-guide/` | Документация MCP сервера. Не для кодирования. |

---

## Повседневный рабочий процесс

### После установки

```
# Просто используйте Claude Code как обычно — он автоматически ссылается на ваши стандарты:
"Создай CRUD для домена заказов"
"Добавь API обновления профиля пользователя"
"Рефакторинг этого кода по паттернам проекта"
```

### После ручного редактирования стандартов

```bash
# После редактирования файлов standard или rules:
npx claudeos-core refresh

# Проверить консистентность
npx claudeos-core health
```

### Когда документация повреждена

```bash
# Восстановить всё из Master Plan
npx claudeos-core restore
```

### Интеграция CI/CD

```yaml
# Пример GitHub Actions
- run: npx claudeos-core validate
# Код выхода 1 блокирует PR
```

---

## Чем отличается?

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**В: Изменяет ли он мой исходный код?**
Нет. Создаются только `CLAUDE.md`, `.claude/rules/` и `claudeos-core/`. Ваш существующий код никогда не изменяется.

**В: Сколько это стоит?**
Вызывает `claude -p` 3–7 раз. Это в рамках обычного использования Claude Code.

**В: Нужно ли коммитить сгенерированные файлы в Git?**
Рекомендуется. Ваша команда может использовать одни и те же стандарты Claude Code. Рассмотрите добавление `claudeos-core/generated/` в `.gitignore` (JSON анализа можно перегенерировать).

**В: Что с проектами смешанного стека (например: Java backend + React frontend)?**
Полная поддержка. ClaudeOS-Core автоматически определяет оба стека, помечает домены как `backend` или `frontend` и использует специфические промпты анализа для каждого. Pass 2 объединяет всё, а Pass 3 генерирует стандарты backend и frontend за один проход.

**В: Что происходит при повторном запуске?**
Если предыдущие результаты Pass 1/2 существуют, интерактивный промпт позволяет выбрать: **Continue** (продолжить с места остановки) или **Fresh** (удалить всё и начать заново). Используйте `--force`, чтобы пропустить промпт и всегда начинать заново. Pass 3 всегда перезапускается. Предыдущие версии можно восстановить из Master Plans.

**В: Работает ли с Turborepo / pnpm workspaces / Lerna monorepo?**
Да. ClaudeOS-Core определяет `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` или `package.json#workspaces` и автоматически сканирует `package.json` подпакетов для обнаружения зависимостей фреймворков/ORM/БД. Сканирование доменов охватывает паттерны `apps/*/src/` и `packages/*/src/`. Запускайте из корня monorepo.

**В: Использует ли NestJS собственный шаблон или шаблон Express?**
NestJS использует выделенный шаблон `node-nestjs` с NestJS-специфичными категориями анализа: декораторы `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI-контейнер, паттерны CQRS и `Test.createTestingModule`. Проекты Express используют отдельный шаблон `node-express`.

**В: Как насчёт проектов Vue / Nuxt?**
Vue/Nuxt использует выделенный шаблон `vue-nuxt`, охватывающий Composition API, `<script setup>`, defineProps/defineEmits, хранилища Pinia, `useFetch`/`useAsyncData`, серверные маршруты Nitro и `@nuxt/test-utils`. Проекты Next.js/React используют шаблон `node-nextjs`.

**В: Поддерживается ли Kotlin?**
Да. ClaudeOS-Core автоматически определяет Kotlin из `build.gradle.kts` или плагина kotlin в `build.gradle`. Используется специальный шаблон `kotlin-spring` с Kotlin-специфичным анализом (data class, sealed class, корутины, функции-расширения, MockK и т.д.).

**В: Как насчёт архитектуры CQRS / BFF?**
Полностью поддерживается для Kotlin мультимодульных проектов. ClaudeOS-Core читает `settings.gradle.kts`, определяет типы модулей (command, query, bff, integration) из их имён и группирует одинаковые домены по модулям Command/Query. Сгенерированные стандарты включают отдельные правила для command-контроллеров и query-контроллеров, паттерны BFF/Feign и соглашения о межмодульном взаимодействии.

**В: Как насчёт Gradle мультимодульных monorepo?**
ClaudeOS-Core сканирует все подмодули (`**/src/main/kotlin/**/*.kt`) независимо от глубины вложенности. Типы модулей определяются из соглашений об именовании (например, `reservation-command-server` → домен: `reservation`, тип: `command`). Общие библиотеки (`shared-lib`, `integration-lib`) также обнаруживаются.

---

## Структура шаблонов

```
pass-prompts/templates/
├── common/                  # Общий заголовок/футер
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` автоматически определяет ваш стек(и) и собирает типо-специфичные промпты. NestJS и Vue/Nuxt используют выделенные шаблоны с фреймворк-специфичными категориями анализа (например, `@Module`/`@Injectable`/Guards для NestJS, `<script setup>`/Pinia/useFetch для Vue). Для мульти-стек проектов генерируются отдельные `pass1-backend-prompt.md` и `pass1-frontend-prompt.md`, а `pass3-prompt.md` объединяет цели генерации обоих стеков.

---

## Поддержка Monorepo

ClaudeOS-Core автоматически определяет JS/TS monorepo-структуры и сканирует подпакеты для обнаружения зависимостей.

**Поддерживаемые маркеры monorepo** (определяются автоматически):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Запускайте из корня monorepo** — ClaudeOS-Core читает `apps/*/package.json` и `packages/*/package.json` для обнаружения зависимостей фреймворков/ORM/БД по всем подпакетам:

```bash
cd my-monorepo
npx claudeos-core init
```

**Что обнаруживается:**
- Зависимости из `apps/web/package.json` (например, `next`, `react`) — frontend-стек
- Зависимости из `apps/api/package.json` (например, `express`, `prisma`) — backend-стек
- Зависимости из `packages/db/package.json` (например, `drizzle-orm`) — ORM/БД
- Пользовательские пути воркспейсов из `pnpm-workspace.yaml` (например, `services/*`)

**Сканирование доменов также охватывает monorepo-структуры:**
- `apps/api/src/modules/*/` и `apps/api/src/*/` для backend-доменов
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` для frontend-доменов
- `packages/*/src/*/` для доменов общих пакетов

```
my-monorepo/                    ← Запускайте здесь: npx claudeos-core init
├── turbo.json                  ← Автоопределение как Turborepo
├── apps/
│   ├── web/                    ← Next.js определён из apps/web/package.json
│   │   ├── app/dashboard/      ← Frontend-домен обнаружен
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express определён из apps/api/package.json
│       ├── src/modules/users/  ← Backend-домен обнаружен
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle определён из packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Примечание:** Для Kotlin/Java monorepo мультимодульное определение использует `settings.gradle.kts` (см. [Обнаружение доменов Kotlin мультимодульных проектов](#обнаружение-доменов-kotlin-мультимодульных-проектов) выше) и не требует JS monorepo-маркеров.

## Устранение неполадок

**"claude: command not found"** — Claude Code CLI не установлен или не в PATH. Смотрите [документацию Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — Версия Node.js может быть слишком старой. Требуется v18+.

**"0 domains detected"** — Структура вашего проекта может быть нестандартной. Смотрите паттерны обнаружения в [корейской документации](./README.ko.md#트러블슈팅) для вашего стека.

**«0 доменов обнаружено» в Kotlin-проекте** — Убедитесь, что в корне проекта есть `build.gradle.kts` (или `build.gradle` с плагином kotlin), а исходные файлы находятся в `**/src/main/kotlin/`. Для мультимодульных проектов `settings.gradle.kts` должен содержать операторы `include()`. Одномодульные Kotlin-проекты (без `settings.gradle`) также поддерживаются — домены извлекаются из структуры пакетов/классов в `src/main/kotlin/`.

**«Язык определён как java вместо kotlin»** — ClaudeOS-Core сначала проверяет корневой `build.gradle(.kts)`, затем файлы сборки подмодулей. Убедитесь, что хотя бы один содержит `kotlin("jvm")` или `org.jetbrains.kotlin`.

**«CQRS не обнаружен»** — Определение архитектуры зависит от наличия ключевых слов `command` и `query` в именах модулей. Если ваши модули используют другие имена, можно вручную скорректировать сгенерированные промпты.

---

## Участие в разработке

Контрибуции приветствуются! Области, где больше всего нужна помощь:

- **Новые шаблоны стеков** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Глубокая поддержка монорепо** — Отдельные корни подпроектов, обнаружение воркспейсов
- **Покрытие тестами** — Расширение набора тестов (сейчас 256 тестов, покрывающих все сканеры, обнаружение стека, группировку доменов, парсинг планов, генерацию промптов, селекторы CLI, обнаружение monorepo и инструменты проверки)

---

## Автор

Создано **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Лицензия

ISC
