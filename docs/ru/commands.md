# CLI-команды

Каждая команда, каждый флаг, каждый exit-код, который ClaudeOS-Core реально поддерживает.

Эта страница — справочник. Новичкам стоит сначала прочитать [Quick Start в главном README](../../README.ru.md#быстрый-старт).

Все команды запускаются через `npx claudeos-core <command>` (или `claudeos-core <command>` при глобальной установке, см. [manual-installation.md](manual-installation.md)).

> Английский оригинал: [docs/commands.md](../commands.md). Русский перевод синхронизирован с английским.

---

## Глобальные флаги

Работают с любой командой:

| Флаг | Эффект |
|---|---|
| `--help` / `-h` | Показать справку. Если идёт после команды (например, `memory --help`), субкоманда сама обрабатывает свой help. |
| `--version` / `-v` | Печатает установленную версию. |
| `--lang <code>` | Язык вывода. Один из: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. По умолчанию `en`. Сейчас читается только командой `init`. |
| `--force` / `-f` | Пропустить resume-prompt и удалить предыдущие результаты. Сейчас читается только командой `init`. |

Полный список CLI-флагов. **Никаких `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` и т. п.** Если такие флаги встречаются в старых docs, это вымысел: `bin/cli.js` парсит ровно эти четыре флага.

---

## Быстрая шпаргалка

| Команда | Когда использовать |
|---|---|
| `init` | Первый запуск на проекте. Генерирует всё. |
| `lint` | После ручной правки `CLAUDE.md`. Запускает структурную валидацию. |
| `health` | Перед коммитом или в CI. Запускает четыре content/path-validator. |
| `restore` | Сохранённый plan → диск. (С v2.1.0 в основном no-op, оставлено ради обратной совместимости.) |
| `refresh` | Диск → сохранённый plan. (С v2.1.0 в основном no-op, оставлено ради обратной совместимости.) |
| `validate` | Запустить plan-validator в режиме `--check`. (С v2.1.0 в основном no-op.) |
| `memory <sub>` | Обслуживание memory layer: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` оставлены потому, что безвредны на проектах без legacy plan-файлов. Если `plan/` отсутствует (default с v2.1.0+), все три пропускают работу с информационным сообщением.

---

## `init` — Сгенерировать набор документации

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Главная команда. Прогоняет [4-pass конвейер](architecture.md) от начала до конца:

1. Сканер выдаёт `project-analysis.json`.
2. Pass 1 анализирует каждую доменную группу.
3. Pass 2 сводит домены в project-wide картину.
4. Pass 3 генерирует CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 разворачивает memory layer.

**Примеры:**

```bash
# Первый раз, английский вывод
npx claudeos-core init

# Первый раз, корейский вывод
npx claudeos-core init --lang ko

# Перегенерировать всё с нуля
npx claudeos-core init --force
```

### Resume-безопасность

`init` — **resume-safe**. После обрыва (сетевой сбой, timeout, Ctrl-C) следующий запуск подхватит работу с последнего завершённого pass-маркера. Маркеры лежат в `claudeos-core/generated/`:

- `pass1-<group>.json` — выход Pass 1 по доменам
- `pass2-merged.json` — выход Pass 2
- `pass3-complete.json` — маркер Pass 3 (также отслеживает, какие sub-стадии split-режима завершились)
- `pass4-memory.json` — маркер Pass 4

Если маркер битый (скажем, упал посреди записи и оставил `{"error":"timeout"}`), validator его отклоняет, и pass запустится заново.

Для частичного Pass 3 (split mode оборвался между стадиями) resume инспектирует тело маркера: если `mode === "split"` и `completedAt` отсутствует, Pass 3 запустится повторно и продолжит со следующей незапущенной стадии.

### Что делает `--force`

`--force` удаляет:
- Каждый `.json` и `.md` файл в `claudeos-core/generated/` (включая все четыре pass-маркера)
- Каталог `claudeos-core/generated/.staged-rules/`, если предыдущий запуск упал посреди перемещения
- Всё в `.claude/rules/` (чтобы «zero-rules detection» Pass 3 не дал false-negative на устаревших rules)

`--force` **не** удаляет:
- Файлы `claudeos-core/memory/` (decision log и failure patterns сохраняются)
- Файлы вне `claudeos-core/` и `.claude/`

**Ручные правки rules при `--force` теряются.** Это сознательный trade-off: `--force` существует ради «хочу чистый старт». Чтобы сохранить правки, перезапускайте без `--force`.

### Интерактивный vs не-интерактивный

Без `--lang` команда `init` показывает интерактивный селектор языка (10 опций, стрелки или ввод цифры). В non-TTY средах (CI, piped input) селектор откатывается на readline, а затем на не-интерактивный default, если ввода нет.

Без `--force` при обнаружении существующих pass-маркеров `init` спрашивает Continue / Fresh. Передача `--force` полностью пропускает этот prompt.

---

## `lint` — Валидировать структуру `CLAUDE.md`

```bash
npx claudeos-core lint
```

Прогоняет `claude-md-validator` по `CLAUDE.md` вашего проекта. Быстро: никаких LLM-вызовов, только структурные проверки.

**Exit-коды:**
- `0` — Прошло.
- `1` — Провал. Хотя бы одна структурная проблема.

**Что проверяет** (полный список check-ID см. в [verification.md](verification.md)):

- Количество секций — ровно 8.
- В Section 4 — 3 или 4 H3 sub-section.
- В Section 6 — ровно 3 H3 sub-section.
- В Section 8 — ровно 2 H3 sub-section (Common Rules + L4 Memory) и ровно 2 H4 sub-sub-section (L4 Memory Files + Memory Workflow).
- Каждый canonical section heading содержит свой английский token (`Role Definition`, `Memory` и т. д.), чтобы multi-repo grep работал независимо от `--lang`.
- Каждый из 4 memory-файлов появляется ровно в ОДНОЙ markdown-строке таблицы, ограниченной Section 8.

Validator **language-invariant**: одни и те же проверки проходят на CLAUDE.md, сгенерированном с `--lang ko`, `--lang ja` или любым другим поддерживаемым языком.

Подходит для pre-commit хуков и CI.

---

## `health` — Запустить набор верификации

```bash
npx claudeos-core health
```

Оркестрирует **4 validator** (claude-md-validator запускается отдельно через `lint`):

| Порядок | Validator | Уровень | Что происходит при провале |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | Если упадёт, `sync-checker` пропустится. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (если manifest успешно). |
| 4 | `content-validator` | advisory | Видно в выводе, но не блокирует. |
| 5 | `pass-json-validator` | warn | Видно в выводе, но не блокирует. |

**Exit-коды:**
- `0` — Никаких находок уровня `fail`. Warning и advisory могут присутствовать.
- `1` — Хотя бы одна находка уровня `fail`.

Трёхуровневую severity (fail / warn / advisory) добавили, чтобы находки `content-validator` (часто дающие false-positive на нестандартных layouts) не валили CI-конвейеры.

Подробности проверок каждого validator см. в [verification.md](verification.md).

---

## `restore` — Применить сохранённый plan на диск (legacy)

```bash
npx claudeos-core restore
```

Запускает `plan-validator` в режиме `--execute`: копирует содержимое из файлов `claudeos-core/plan/*.md` в локации, которые они описывают.

**Статус v2.1.0:** генерацию master plan удалили. `claudeos-core/plan/` больше не создаётся автоматически. Если `plan/` отсутствует, команда логирует информационное сообщение и завершается чисто.

Команда оставлена для тех, кто вручную поддерживает plan-файлы для ad-hoc backup/restore. На проекте v2.1.0+ безвредна.

Перед перезаписью любого файла создаёт `.bak` бэкап.

---

## `refresh` — Синхронизировать диск в сохранённый plan (legacy)

```bash
npx claudeos-core refresh
```

Обратное `restore`. Запускает `plan-validator` в режиме `--refresh`: читает текущее состояние файлов на диске и подгоняет `claudeos-core/plan/*.md` под него.

**Статус v2.1.0:** то же, что и `restore` — no-op, когда `plan/` отсутствует.

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

Запускает `plan-validator` в режиме `--check`: сообщает о различиях между `claudeos-core/plan/*.md` и диском, ничего не меняя.

**Статус v2.1.0:** no-op, когда `plan/` отсутствует. Большинству лучше запускать `health`, который вызывает `plan-validator` вместе с остальными validator.

---

## `memory <subcommand>` — Обслуживание memory layer

```bash
npx claudeos-core memory <subcommand>
```

Три субкоманды. Все работают с файлами `claudeos-core/memory/`, которые пишет Pass 4 в `init`. Если файлы отсутствуют, каждая субкоманда логирует `not found` и аккуратно завершается (best-effort инструменты).

Подробности модели memory см. в [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Применяет 4-стадийную компактацию к `decision-log.md` и `failure-patterns.md`:

| Стадия | Триггер | Действие |
|---|---|---|
| 1 | `lastSeen > 30 days` и не preserved | Тело сворачивается в одну строку «fix» + meta |
| 2 | Дублированные heading | Объединяются (frequency складываются, body = самый свежий) |
| 3 | `importance < 3` и `lastSeen > 60 days` | Удаляются |
| 4 | Файл > 400 lines | Обрезаются самые старые non-preserved записи |

Записи с `importance >= 7`, `lastSeen < 30 days` или body, ссылающимся на конкретный (non-glob) активный rule-путь, сохраняются автоматически.

После компактации меняется только секция `## Last Compaction` файла `compaction.md`, остальное (ваши заметки) остаётся нетронутым.

### `memory score`

```bash
npx claudeos-core memory score
```

Пересчитывает оценки importance для записей в `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Удаляет существующие строки importance перед вставкой (защита от регрессий с дубликатами). Новый score пишется обратно в body записи.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Читает `failure-patterns.md`, отбирает записи с frequency ≥ 3 и просит Claude набросать черновик `.claude/rules/` для топ-кандидатов.

Confidence на кандидата:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance по умолчанию 0; capped at 6, если importance отсутствует)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = запись упоминает конкретный путь, который реально есть на диске.)

Вывод **дописывается в `claudeos-core/memory/auto-rule-update.md`** на просмотр. **Автоматически ничего не применяется**, какие предложения переносить в реальные rule-файлы — решаете сами.

---

## Переменные окружения

| Переменная | Эффект |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Короткозамыкает translation-путь memory-scaffold; throw до вызова `claude -p`. Применяется в CI и в зависящих от перевода тестах, чтобы обойтись без реальной установки Claude CLI. Семантика строгая, `=== "1"`: другие значения её не активируют. |
| `CLAUDEOS_ROOT` | Автоматически выставляется `bin/cli.js` в корень проекта пользователя. Внутреннее, не переопределяйте. |

Полный список. Никаких `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` и т. п. — их не существует.

---

## Exit-коды

| Код | Значение |
|---|---|
| `0` | Успех. |
| `1` | Validation failure (находка уровня `fail`) или `InitError` (отсутствие prerequisite, битый marker, file lock и т. п.). |
| Прочее | Прилетело из нижележащего Node-процесса или sub-tool: uncaught exceptions, ошибки записи и т. п. |

Специального exit-кода для «interrupted» нет: Ctrl-C просто завершает процесс. Перезапустите `init`, дальше всё сделает механизм resume.

---

## Что запускает `npm test` (для контрибьюторов)

Если клонировали репозиторий и хотите прогнать тесты локально:

```bash
npm test
```

Запускает `node tests/*.test.js` по 33 тест-файлам. Набор использует встроенный runner Node `node:test` (никакого Jest, никакой Mocha) и `node:assert/strict`.

Один тест-файл:

```bash
node tests/scan-java.test.js
```

CI прогоняет набор на Linux / macOS / Windows × Node 18 / 20. CI workflow выставляет `CLAUDEOS_SKIP_TRANSLATION=1`, чтобы зависящим от перевода тестам не требовался `claude` CLI.

---

## См. также

- [architecture.md](architecture.md) — что `init` на самом деле делает внутри
- [verification.md](verification.md) — что проверяют validator
- [memory-layer.md](memory-layer.md) — с чем работают `memory`-субкоманды
- [troubleshooting.md](troubleshooting.md) — когда команды падают
