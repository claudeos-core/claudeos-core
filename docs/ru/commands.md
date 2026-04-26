# CLI-команды

Каждая команда, каждый флаг, каждый exit-код, который ClaudeOS-Core реально поддерживает.

Эта страница — справочник. Если вы новичок, прочитайте сначала [Quick Start главного README](../../README.ru.md#quick-start).

Все команды запускаются через `npx claudeos-core <command>` (или `claudeos-core <command>`, если установлено глобально — см. [manual-installation.md](manual-installation.md)).

> Английский оригинал: [docs/commands.md](../commands.md). Русский перевод синхронизирован с английским.

---

## Глобальные флаги

Эти работают на каждой команде:

| Флаг | Эффект |
|---|---|
| `--help` / `-h` | Показать help. Когда поставлено после команды (например, `memory --help`), субкоманда обрабатывает свой help сама. |
| `--version` / `-v` | Печатает установленную версию. |
| `--lang <code>` | Язык вывода. Один из: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. По умолчанию: `en`. На данный момент потребляется только `init`. |
| `--force` / `-f` | Пропустить resume-prompt; удалить предыдущие результаты. На данный момент потребляется только `init`. |

Это полный список CLI-флагов. **Никаких `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` и т.п.** Если вы видели их в более старых docs — они нереальны: `bin/cli.js` парсит только эти четыре флага.

---

## Быстрая шпаргалка

| Команда | Когда использовать |
|---|---|
| `init` | Первый раз на проекте. Генерирует всё. |
| `lint` | После ручного редактирования `CLAUDE.md`. Запускает структурную валидацию. |
| `health` | Перед коммитом или в CI. Запускает четыре content/path-validator. |
| `restore` | Сохранённый plan → диск. (В основном no-op с v2.1.0; сохранено для обратной совместимости.) |
| `refresh` | Диск → сохранённый plan. (В основном no-op с v2.1.0; сохранено для обратной совместимости.) |
| `validate` | Запустить режим `--check` plan-validator. (В основном no-op с v2.1.0.) |
| `memory <sub>` | Обслуживание memory layer: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` оставлены, потому что безвредны на проектах, не использующих legacy plan-файлы. Если `plan/` не существует (default v2.1.0+), все они пропускают с информационными сообщениями.

---

## `init` — Сгенерировать набор документации

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Главная команда. Запускает [4-pass конвейер](architecture.md) от и до:

1. Сканер производит `project-analysis.json`.
2. Pass 1 анализирует каждую доменную группу.
3. Pass 2 объединяет домены в project-wide картину.
4. Pass 3 генерирует CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 scaffold-ит memory layer.

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

`init` — **resume-safe**. Если прервался (сетевой сбой, timeout, Ctrl-C), следующий запуск подхватит с последнего завершённого pass-маркера. Маркеры лежат в `claudeos-core/generated/`:

- `pass1-<group>.json` — выход Pass 1 по доменам
- `pass2-merged.json` — выход Pass 2
- `pass3-complete.json` — маркер Pass 3 (также отслеживает, какие sub-стадии split-режима завершились)
- `pass4-memory.json` — маркер Pass 4

Если маркер malformed (например, упал в середине записи и оставил `{"error":"timeout"}`), validator его отклоняет, и pass запускается заново.

Для частичного Pass 3 (split mode прерван между стадиями) механизм resume инспектирует тело маркера — если `mode === "split"` и `completedAt` отсутствует, Pass 3 переинвоцируется и возобновляется со следующей незапущенной стадии.

### Что делает `--force`

`--force` удаляет:
- Каждый `.json` и `.md` файл в `claudeos-core/generated/` (включая все четыре pass-маркера)
- Оставшийся каталог `claudeos-core/generated/.staged-rules/`, если предыдущий запуск упал в середине перемещения
- Всё в `.claude/rules/` (так что «zero-rules detection» Pass 3 не даст false-negative на устаревших rules)

`--force` **не** удаляет:
- Файлы `claudeos-core/memory/` (ваш decision log и failure patterns сохраняются)
- Файлы вне `claudeos-core/` и `.claude/`

**Ручные правки rules при `--force` теряются.** Это и есть trade-off — `--force` существует для «хочу чистый старт». Если хотите сохранить правки, перезапускайте без `--force`.

### Интерактивный vs не-интерактивный

Без `--lang`, `init` показывает интерактивный селектор языка (10 опций, стрелки или ввод цифры). В non-TTY средах (CI, piped input) селектор откатывается на readline, затем на не-интерактивный default, если ввода нет.

Без `--force`, если обнаружены существующие pass-маркеры, `init` показывает prompt Continue / Fresh. Передача `--force` пропускает этот prompt полностью.

---

## `lint` — Валидировать структуру `CLAUDE.md`

```bash
npx claudeos-core lint
```

Запускает `claude-md-validator` на `CLAUDE.md` вашего проекта. Быстро — без LLM-вызовов, только структурные проверки.

**Exit-коды:**
- `0` — Прошло.
- `1` — Провал. Хотя бы одна структурная проблема.

**Что проверяет** (полный список check-ID см. в [verification.md](verification.md)):

- Количество секций — ровно 8.
- В Section 4 — 3 или 4 H3 sub-section.
- В Section 6 — ровно 3 H3 sub-section.
- В Section 8 — ровно 2 H3 sub-section (Common Rules + L4 Memory) И ровно 2 H4 sub-sub-section (L4 Memory Files + Memory Workflow).
- Каждый canonical section heading должен содержать свой английский token (например, `Role Definition`, `Memory`), чтобы multi-repo grep работал независимо от `--lang`.
- Каждый из 4 memory-файлов появляется ровно в ОДНОЙ markdown-строке таблицы, ограниченной Section 8.

Validator — **language-invariant**: те же проверки работают на CLAUDE.md, сгенерированном с `--lang ko`, `--lang ja` или любым другим поддерживаемым языком.

Подходит для pre-commit хуков и CI.

---

## `health` — Запустить набор верификации

```bash
npx claudeos-core health
```

Оркестрирует **4 validator** (claude-md-validator запускается отдельно через `lint`):

| Порядок | Validator | Уровень | Что происходит на провале |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | Если упадёт, `sync-checker` пропускается. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (если manifest успешно). |
| 4 | `content-validator` | advisory | Появляется, но не блокирует. |
| 5 | `pass-json-validator` | warn | Появляется, но не блокирует. |

**Exit-коды:**
- `0` — Никаких находок уровня `fail`. Warning-и и advisory могут присутствовать.
- `1` — Хотя бы одна находка уровня `fail`.

Трёхуровневая severity (fail / warn / advisory) была добавлена, чтобы находки `content-validator` (которые часто дают false-positive в нестандартных layouts) не блокировали CI-конвейеры.

Подробности проверок каждого validator см. в [verification.md](verification.md).

---

## `restore` — Применить сохранённый plan на диск (legacy)

```bash
npx claudeos-core restore
```

Запускает `plan-validator` в режиме `--execute`: копирует содержимое из файлов `claudeos-core/plan/*.md` в локации, которые они описывают.

**Статус v2.1.0:** Генерация master plan была удалена. `claudeos-core/plan/` больше не создаётся автоматически. Если `plan/` не существует, эта команда логирует информационное сообщение и завершается чисто.

Команда оставлена для пользователей, которые вручную поддерживают plan-файлы для ad-hoc backup/restore. Безвредна для запуска на проекте v2.1.0+.

Создаёт `.bak` бэкап любого файла, который перезаписывает.

---

## `refresh` — Синхронизировать диск в сохранённый plan (legacy)

```bash
npx claudeos-core refresh
```

Обратное `restore`. Запускает `plan-validator` в режиме `--refresh`: читает текущее состояние файлов на диске и обновляет `claudeos-core/plan/*.md` под него.

**Статус v2.1.0:** То же, что `restore` — no-op, когда `plan/` отсутствует.

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

Запускает `plan-validator` в режиме `--check`: сообщает о различиях между `claudeos-core/plan/*.md` и диском, но ничего не модифицирует.

**Статус v2.1.0:** No-op, когда `plan/` отсутствует. Большинству пользователей следует запускать `health`, который вызывает `plan-validator` вместе с другими validator.

---

## `memory <subcommand>` — Обслуживание memory layer

```bash
npx claudeos-core memory <subcommand>
```

Три субкоманды. Они работают над файлами `claudeos-core/memory/`, написанными Pass 4 `init`. Если файлы отсутствуют, каждая субкоманда логирует `not found` и пропускает изящно (best-effort инструменты).

Подробности модели memory см. в [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Применяет 4-стадийную компактацию к `decision-log.md` и `failure-patterns.md`:

| Стадия | Триггер | Действие |
|---|---|---|
| 1 | `lastSeen > 30 days` И не preserved | Тело сворачивается в одну строку «fix» + meta |
| 2 | Дублированные heading | Объединяются (frequency складываются, body = самый недавний) |
| 3 | `importance < 3` И `lastSeen > 60 days` | Удаляются |
| 4 | Файл > 400 lines | Обрезаются самые старые non-preserved записи |

Записи с `importance >= 7`, `lastSeen < 30 days` или body, ссылающимся на конкретный (non-glob) активный rule-путь, авто-сохраняются.

После компактации заменяется только секция `## Last Compaction` файла `compaction.md` — всё остальное (ваши заметки) сохраняется.

### `memory score`

```bash
npx claudeos-core memory score
```

Пересчитывает оценки importance для записей в `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Удаляет любые существующие строки importance перед вставкой (предотвращает регрессии с дублированными строками). Новый score записывается обратно в body записи.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Читает `failure-patterns.md`, выбирает записи с frequency ≥ 3 и просит Claude набросать предложенный контент `.claude/rules/` для топ-кандидатов.

Confidence на кандидата:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance по умолчанию 0; capped at 6, если importance отсутствует)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = запись упоминает конкретный путь файла, существующий на диске.)

Вывод **дописывается в `claudeos-core/memory/auto-rule-update.md`** на ваш просмотр. **Не применяется автоматически** — вы решаете, какие предложения скопировать в реальные rule-файлы.

---

## Переменные окружения

| Переменная | Эффект |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Короткозамыкает translation-путь memory-scaffold; throw до вызова `claude -p`. Используется в CI и в зависящих от перевода тестах, чтобы им не нужна была реальная установка Claude CLI. Строгая семантика `=== "1"` — другие значения её не активируют. |
| `CLAUDEOS_ROOT` | Устанавливается автоматически `bin/cli.js` в корень проекта пользователя. Внутреннее — не override-ите. |

Это полный список. Никаких `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` и т.п. — их не существует.

---

## Exit-коды

| Код | Значение |
|---|---|
| `0` | Успех. |
| `1` | Validation failure (находка уровня `fail`) или `InitError` (например, отсутствует prerequisite, malformed marker, file lock). |
| Прочее | Поднялось из нижележащего Node-процесса или sub-tool — uncaught exceptions, ошибки записи и т.п. |

Специального exit-кода для «interrupted» нет — Ctrl-C просто завершает процесс. Перезапустите `init`, и механизм resume сделает остальное.

---

## Что запускает `npm test` (для контрибьюторов)

Если вы клонировали репозиторий и хотите запустить тесты локально:

```bash
npm test
```

Запускает `node tests/*.test.js` по 33 тест-файлам. Тестовый набор использует встроенный runner Node `node:test` (никаких Jest, никакой Mocha) и `node:assert/strict`.

Для одного тест-файла:

```bash
node tests/scan-java.test.js
```

CI запускает набор на Linux / macOS / Windows × Node 18 / 20. CI workflow устанавливает `CLAUDEOS_SKIP_TRANSLATION=1`, чтобы зависящие от перевода тесты не нуждались в `claude` CLI.

---

## См. также

- [architecture.md](architecture.md) — что `init` на самом деле делает внутри
- [verification.md](verification.md) — что проверяют validator
- [memory-layer.md](memory-layer.md) — над чем работают `memory`-субкоманды
- [troubleshooting.md](troubleshooting.md) — когда команды падают
