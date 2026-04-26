# Architecture — 4-Pass конвейер

Этот документ объясняет, как `claudeos-core init` работает от начала до конца. Если вы просто хотите использовать инструмент, [главного README](../../README.ru.md) достаточно — этот документ нужен, чтобы понять, *почему* дизайн именно такой.

Если вы ни разу не запускали инструмент, [запустите его сначала один раз](../../README.ru.md#quick-start). Концепции ниже усвоятся гораздо быстрее, когда вы уже видели вывод.

> Английский оригинал: [docs/architecture.md](../architecture.md). Русский перевод синхронизирован с английским.

---

## Главная идея — «Код подтверждает, Claude создаёт»

Большинство инструментов, генерирующих документацию для Claude Code, работают в один шаг:

```
Ваше описание  →  Claude  →  CLAUDE.md / rules / standards
```

Claude вынужден угадывать ваш стек, ваши конвенции, вашу доменную структуру. Угадывает он хорошо, но это всё равно угадывание. ClaudeOS-Core инвертирует этот подход:

```
Ваш исходный код
       ↓
[Step A: Код читает]      ← Node.js scanner, детерминированно, без AI
       ↓
project-analysis.json     ← подтверждённые факты: стек, домены, пути
       ↓
[Step B: Claude пишет]    ← 4-pass LLM конвейер, ограниченный фактами
       ↓
[Step C: Код проверяет]   ← 5 validator, запуск автоматически
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**Код делает то, что должно быть точным** (ваш стек, ваши пути файлов, ваша доменная структура).
**Claude делает то, что должно быть выразительным** (объяснения, конвенции, проза).
Они не пересекаются и не перепроверяют друг друга.

Почему это важно: LLM не может выдумать пути или фреймворки, которых на самом деле нет в коде. Промпт Pass 3 явно передаёт Claude allowlist путей из сканера. Если Claude попытается процитировать путь не из списка, post-generation `content-validator` это поймает.

---

## Step A — Сканер (детерминированный)

До того как Claude вообще будет вызван, Node.js процесс обходит ваш проект и пишет `claudeos-core/generated/project-analysis.json`. Этот файл — единственный источник истины для всего, что следует дальше.

### Что читает сканер

Сканер берёт сигналы из этих файлов в корне проекта:

| Файл | Что он сообщает сканеру |
|---|---|
| `package.json` | Node.js проект; framework через `dependencies` |
| `pom.xml` | Java/Maven проект |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle проект |
| `pyproject.toml` / `requirements.txt` | Python проект; framework через пакеты |
| `angular.json` | Angular проект |
| `nuxt.config.{ts,js}` | Nuxt проект |
| `next.config.{ts,js}` | Next.js проект |
| `vite.config.{ts,js}` | Vite проект |
| `.env*` файлы | Runtime-конфигурация (port, host, DB URL — см. ниже) |

Если ничего не подходит, `init` останавливается с понятной ошибкой, а не угадывает.

### Что сканер пишет в `project-analysis.json`

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — для Java — один из 5 паттернов (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Для Kotlin — определение CQRS / BFF / multi-module. Для frontend — App Router / Pages Router / FSD layouts плюс паттерны `components/*/`, с многоступенчатыми fallback-ами.
- **Domain list** — найден обходом дерева каталогов, с количеством файлов на домен. Сканер выбирает один-два репрезентативных файла на домен для чтения в Pass 1.
- **Source path allowlist** — каждый путь к исходному файлу, существующий в вашем проекте. Промпты Pass 3 включают этот список явно, чтобы Claude нечего было угадывать.
- **Monorepo structure** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) и npm/yarn workspaces (`package.json#workspaces`), если присутствуют. NX явно не определяется; универсальные паттерны `apps/*/` и `packages/*/` всё равно подбираются per-stack сканерами.
- **`.env` snapshot** — port, host, API target, чувствительные переменные замаскированы. Порядок поиска см. в [stacks.md](stacks.md).

У сканера **нет вызовов LLM**. Тот же проект + тот же код = тот же `project-analysis.json`, каждый раз.

Подробности по стекам (что извлекает каждый сканер и как) см. в [stacks.md](stacks.md).

---

## Step B — 4-pass конвейер Claude

У каждого pass-а своя задача. Они выполняются последовательно: Pass N читает выход Pass (N-1) как небольшой структурированный файл (а не весь полный вывод всех предыдущих pass-ов).

### Pass 1 — Глубокий анализ по доменам

**Input:** `project-analysis.json` + репрезентативный файл из каждого домена.

**Что делает:** Читает репрезентативные файлы и извлекает паттерны по десяткам категорий анализа на стек (обычно 50–100+ пунктов уровня bullet, в зависимости от стека — самым насыщенным является CQRS-aware шаблон Kotlin/Spring, самыми компактными — облегчённые шаблоны Node.js). Например: «Использует ли этот controller `@RestController` или `@Controller`? Какая обёртка response? Какая библиотека логирования?»

**Output:** `pass1-<group-N>.json` — по одному файлу на доменную группу.

Для крупных проектов Pass 1 запускается несколько раз — по одному вызову на доменную группу. Правило группировки — **не более 4 доменов и 40 файлов на группу**, автоматически применяется в `plan-installer/domain-grouper.js`. Проект из 12 доменов запустит Pass 1 три раза.

Этот split существует, потому что context window Claude ограничен. Попытка втиснуть 12 доменов в один промпт либо переполнит контекст, либо заставит LLM пробежаться поверхностно. Split удерживает каждый pass сфокусированным.

### Pass 2 — Cross-domain merge

**Input:** Все файлы `pass1-*.json`.

**Что делает:** Объединяет их в единую project-wide картину. Когда два домена расходятся (например, один говорит, что обёртка response — `success()`, другой — `ok()`), Pass 2 выбирает доминирующую конвенцию и фиксирует расхождение.

**Output:** `pass2-merged.json` — обычно 100–400 KB.

### Pass 3 — Генерация документации (split mode)

**Input:** `pass2-merged.json`.

**Что делает:** Пишет реальную документацию. Это самый тяжёлый pass — он создаёт ~40–50 markdown-файлов в CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` и `claudeos-core/mcp-guide/`.

**Output:** Все пользовательские файлы, организованные в структуру каталогов, показанную в [главном README](../../README.ru.md#quick-start).

Чтобы выход каждой стадии оставался в context window Claude (вход pass2-merged большой, а сгенерированный выход ещё больше), Pass 3 **всегда разделяется на стадии** — даже для маленьких проектов. Split применяется безусловно; в маленьких проектах просто меньше per-domain батчей:

| Stage | Что пишет |
|---|---|
| **3a** | Маленькая «таблица фактов» (`pass3a-facts.md`), извлечённая из `pass2-merged.json`. Выступает как сжатый input для последующих стадий — им не нужно перечитывать большой merged-файл. |
| **3b-core** | Генерирует `CLAUDE.md` (индекс, который Claude Code читает первым) + основную часть `claudeos-core/standard/`. |
| **3b-N** | Файлы rule и standard по доменам (одна стадия на группу ≤15 доменов). |
| **3c-core** | Генерирует orchestrator-файлы `claudeos-core/skills/` + `claudeos-core/guide/`. |
| **3c-N** | Файлы skill по доменам. |
| **3d-aux** | Генерирует вспомогательный контент в `claudeos-core/database/` и `claudeos-core/mcp-guide/`. |

Для очень крупных проектов (≥16 доменов) 3b и 3c дополнительно делятся на батчи. Каждый батч получает свежее context window.

После того как все стадии успешно завершатся, пишется маркер `pass3-complete.json`. Если `init` прервётся посередине, следующий запуск читает маркер и возобновляет с следующей незапущенной стадии — завершённые стадии не перезапускаются.

### Pass 4 — Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Что делает:** Генерирует L4 memory layer плюс универсальные scaffold rules. Все scaffold-записи — **skip-if-exists**, поэтому повторный запуск Pass 4 ничего не перезаписывает.

- `claudeos-core/memory/` — 4 markdown-файла (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 rule-файла (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`), которые автоматически загружают memory-файлы, когда Claude Code редактирует соответствующие области
- `.claude/rules/00.core/51.doc-writing-rules.md` и `52.ai-work-rules.md` — универсальные общие rules (Pass 3 генерирует project-specific `00.core` rules вроде `00.standard-reference.md`; Pass 4 добавляет эти два «зарезервированных» файла, если их ещё нет)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — мета-гайд по написанию дополнительных rules. Числовой prefix автоматически назначается как `Math.max(existing-numbers) + 1`, обычно `04` или `05` в зависимости от того, что Pass 3 уже там написал.

**Output:** Memory-файлы + маркер `pass4-memory.json`.

Важно: **Pass 4 не модифицирует `CLAUDE.md`.** Pass 3 уже написал Section 8 (которая ссылается на memory-файлы). Повторное изменение CLAUDE.md здесь повторно объявило бы содержимое Section 8 и вызвало бы ошибки validator. Это enforced промптом и проверяется тестом `tests/pass4-claude-md-untouched.test.js`.

Подробности по каждому memory-файлу и жизненному циклу см. в [memory-layer.md](memory-layer.md).

---

## Step C — Верификация (детерминированная, post-Claude)

После завершения Claude код Node.js проверяет вывод по 5 validator. **Ни один из них не вызывает LLM** — все проверки детерминированы.

| Validator | Что проверяет |
|---|---|
| `claude-md-validator` | Структурные проверки `CLAUDE.md` (количество top-level section, количество H3/H4 на section, уникальность/scope строк таблицы memory-файлов, T1 canonical heading tokens). Language-invariant — те же проверки проходят для всех 10 выходных языков. |
| `content-validator` | 10 content-уровневых проверок: необходимые файлы существуют, пути, упомянутые в standards/skills, реальны, MANIFEST согласован. |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 JSON-выходы well-formed и содержат ожидаемые ключи. |
| `plan-validator` | (Legacy) Сравнивает сохранённые plan-файлы с диском. Генерация master plan была удалена в v2.1.0, так что сейчас это в основном no-op — оставлено для обратной совместимости. |
| `sync-checker` | Файлы на диске в отслеживаемых каталогах совпадают с регистрациями `sync-map.json` (orphaned vs unregistered). |

У них **3 уровня severity**:

- **fail** — Блокирует завершение, в CI exit non-zero. Что-то структурно сломано.
- **warn** — Появляется в выводе, но не блокирует. Стоит разобраться.
- **advisory** — Просмотрите позже. Часто false positive в нестандартных layouts проекта (например, gitignored файлы помечены как «missing»).

Полный список проверок по validator см. в [verification.md](verification.md).

Validator оркестрируются двумя способами:

1. **`claudeos-core lint`** — запускает только `claude-md-validator`. Быстро, только структурно. Используйте после ручного редактирования CLAUDE.md.
2. **`claudeos-core health`** — запускает остальные 4 validator (claude-md-validator вынесен намеренно — структурный drift в CLAUDE.md является сигналом re-init, а не мягким предупреждением). Рекомендуется в CI.

---

## Почему эта архитектура важна

### Промпты с инжекцией фактов предотвращают галлюцинации

Когда работает Pass 3, промпт выглядит примерно так (упрощённо):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

У Claude нет возможности выдумать путь. Ограничение — **позитивное** (whitelist), а не негативное («не выдумывай») — разница важна, потому что LLM лучше следуют конкретным позитивным ограничениям, чем абстрактным негативным.

Если несмотря на это Claude всё же процитирует выдуманный путь, проверка `content-validator [10/10]` в конце пометит его как `STALE_PATH`. Пользователь увидит предупреждение до того, как docs пойдут в ход.

### Resume-safe через маркеры

Каждый pass пишет файл-маркер (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) при успешном завершении. Если `init` прерывается (сетевой сбой, timeout, Ctrl-C), следующий запуск читает маркеры и продолжает с того места, где остановился прошлый. Работа не теряется.

Маркер Pass 3 также отслеживает, **какие sub-стадии** завершены, поэтому частичный Pass 3 (например, 3b закончилась, 3c упала на середине) возобновится со следующей стадии, а не с 3a.

### Идемпотентные перезапуски

Запуск `init` на проекте, в котором rules уже есть, **не перезаписывает** молча ручные правки.

Механизм: система разрешений Claude Code блокирует запись subprocess-ом в `.claude/`, даже с `--dangerously-skip-permissions`. Поэтому Pass 3/4 получают инструкцию писать rule-файлы в `claudeos-core/generated/.staged-rules/`. После каждого pass-а Node.js orchestrator (на который ограничения Claude Code не распространяются) перемещает staged файлы в `.claude/rules/`.

На практике это значит: **на свежем проекте перезапуск всё пересоздаёт. На проекте, где вы вручную редактировали rules, перезапуск с `--force` регенерирует с нуля (правки теряются — в этом и смысл `--force`). Без `--force` срабатывает механизм resume и запускаются только незавершённые pass-ы.**

Полную историю сохранения см. в [safety.md](safety.md).

### Language-invariant верификация

Validator не сопоставляют переведённый текст заголовков. Они сопоставляют **структурную форму** (уровни заголовков, количества, порядок). Это означает, что один и тот же `claude-md-validator` выдаёт побайтово идентичные verdict-ы на CLAUDE.md, сгенерированном на любом из 10 поддерживаемых языков. Никаких per-language словарей. Никакой нагрузки на поддержку при добавлении нового языка.

---

## Производительность — чего ожидать

Конкретное время сильно зависит от:
- Размера проекта (число файлов исходников, число доменов)
- Сетевой задержки до API Anthropic
- Какая модель Claude выбрана в конфиге Claude Code

Грубый ориентир:

| Шаг | Время на маленьком проекте (<200 files) | Время на среднем проекте (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 секунд | 10–30 секунд |
| Step B (4 Claude pass) | Несколько минут | 10–30 минут |
| Step C (validators) | < 5 секунд | 10–20 секунд |

На больших проектах wall clock в основном определяется Pass 1, поскольку он запускается по одному разу на доменную группу. Проект из 24 доменов = 6 вызовов Pass 1 (24 / 4 доменов на группу).

Если нужна точная цифра — запустите один раз на своём проекте; это единственный честный ответ.

---

## Где находится код каждого шага

| Шаг | Файл |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| Per-stack scanner | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Сборка промпта | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass-шаблоны | `pass-prompts/templates/<stack>/pass{1,2,3}.md` per stack; `pass-prompts/templates/common/pass4.md` общий |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## Дальше читать

- [stacks.md](stacks.md) — что извлекает каждый сканер по стеку
- [memory-layer.md](memory-layer.md) — Pass 4 подробно
- [verification.md](verification.md) — все 5 validator
- [diagrams.md](diagrams.md) — та же архитектура в виде Mermaid-картинок
- [comparison.md](comparison.md) — чем это отличается от других инструментов Claude Code
