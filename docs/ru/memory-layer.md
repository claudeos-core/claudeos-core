# Memory Layer (L4)

Начиная с v2.0, ClaudeOS-Core пишет персистентный memory layer рядом с обычной документацией. Слой нужен долгоживущим проектам, где от Claude Code требуется:

1. Помнить архитектурные решения и их обоснование.
2. Учиться на повторяющихся ошибках.
3. Авто-продвигать частые failure-паттерны в постоянные rules.

Если ClaudeOS-Core нужен только для одноразовой генерации, этот слой можно игнорировать. Memory-файлы будут созданы, но без обновлений не разрастутся.

> Английский оригинал: [docs/memory-layer.md](../memory-layer.md). Русский перевод синхронизирован с английским.

---

## Что записывается

После завершения Pass 4 memory layer состоит из:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

У rule-файлов из `60.memory/` есть globs `paths:`, которые совпадают с файлами проекта, где должна подгружаться память. Когда Claude Code редактирует файл, попадающий в glob, соответствующий memory-файл подтягивается в контекст.

Это **on-demand загрузка**: память не всегда в контексте, а только когда релевантна. Так рабочий контекст Claude остаётся компактным.

---

## Четыре memory-файла

### `decision-log.md` — append-only архитектурные решения

Принимая не-очевидное техническое решение, дописываете блок (вручную или попросив Claude):

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Файл **растёт со временем**, авто-удаление не предусмотрено. Старые решения остаются ценным контекстом.

Автозагружаемое правило (`60.memory/01.decision-log.md`) велит Claude Code сверяться с этим файлом перед ответом на вопросы вроде «Почему мы сделали X именно так?».

### `failure-patterns.md` — повторяющиеся ошибки

Когда Claude Code снова и снова совершает одну и ту же ошибку (например, «Claude генерирует JPA, хотя проект на MyBatis»), сюда идёт запись:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

Поля `frequency` / `importance` / `last seen` управляют автоматическими решениями:

- **Compaction:** записи с `lastSeen > 60 days` И `importance < 3` удаляются.
- **Rule promotion:** записи с `frequency >= 3` всплывают как кандидаты для новых записей `.claude/rules/` через `memory propose-rules`. (Importance не фильтр, а лишь множитель confidence-score каждого предложения.)

Поля метаданных парсятся субкомандами `memory` через якорный regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`), так что строки полей должны выглядеть примерно как в примере выше. Отступы и курсивные вариации допускаются.

### `compaction.md` — лог компактации

Файл хранит историю компактации:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Каждый запуск `memory compact` перезаписывает только секцию `## Last Compaction`. Всё, что добавлено в другом месте файла, сохраняется.

### `auto-rule-update.md` — очередь предложенных правил

При запуске `memory propose-rules` Claude читает `failure-patterns.md` и дописывает сюда предложенный rule-контент:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

Просматриваете предложения, копируете нужные в реальные rule-файлы. **Команда propose-rules ничего не применяет автоматически** — это намеренно: правила, набросанные LLM, требуют человеческого ревью.

---

## Алгоритм компактации

Память растёт, но не разбухает. Четырёхстадийная компактация запускается командой:

```bash
npx claudeos-core memory compact
```

| Стадия | Триггер | Действие |
|---|---|---|
| 1 | `lastSeen > 30 days` И не preserved | Body сворачивается в одну строку «fix» + meta |
| 2 | Дубликаты heading | Объединение (frequency складываются, body = самый недавний) |
| 3 | `importance < 3` И `lastSeen > 60 days` | Удаляется |
| 4 | Файл > 400 строк | Обрезаются самые старые non-preserved записи |

**«Preserved» записи** переживают все стадии. Запись считается preserved, если выполняется хотя бы одно из условий:

- `importance >= 7`,
- `lastSeen < 30 days`,
- body содержит конкретный (не-glob) активный путь к правилу (например, `.claude/rules/10.backend/orm-rules.md`).

Проверка «active rule path» любопытна: если запись памяти ссылается на реально существующий rule-файл, она привязана к жизненному циклу этого правила. Пока правило существует, память остаётся.

Алгоритм компактации намеренно копирует человеческую кривую забывания: частое, недавнее, важное остаётся; редкое, старое, неважное угасает.

Код компактации см. в `bin/commands/memory.js` (функция `compactFile()`).

---

## Подсчёт importance

Запустите:

```bash
npx claudeos-core memory score
```

Пересчитывает importance для записей в `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Где `recency = max(0, 1 - daysSince(lastSeen) / 90)` (линейный спад за 90 дней).

Эффекты:
- Запись с `frequency = 3` и `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`.
- Запись с `frequency = 3` и `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`.

**Команда score удаляет ВСЕ существующие строки importance перед вставкой.** Это спасает от регрессий с дублирующимися строками при повторных запусках score.

---

## Продвижение в правила: `propose-rules`

Запустите:

```bash
npx claudeos-core memory propose-rules
```

Команда:

1. Читает `failure-patterns.md`.
2. Фильтрует записи с `frequency >= 3`.
3. Просит Claude набросать предложенный rule-контент для каждого кандидата.
4. Считает confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance по умолчанию 0; capped at 6, если importance отсутствует)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   где `anchored` означает, что запись ссылается на реальный путь файла на диске.
5. Записывает предложения в `auto-rule-update.md` для человеческого ревью.

**Значение evidence ограничено 6, когда importance отсутствует.** Без оценки importance одной только частоты не должно хватать, чтобы толкнуть sigmoid к высокой confidence. (Ограничивается вход sigmoid, а не количество предложений.)

---

## Типичный workflow

Для долгоживущего проекта ритм такой:

1. **Запустить `init` один раз**, чтобы настроить memory-файлы вместе со всем остальным.

2. **Использовать Claude Code как обычно несколько недель.** Замечать повторяющиеся ошибки (например, Claude всё время использует не ту обёртку response). Дописывать записи в `failure-patterns.md` — вручную или попросив Claude (правило в `60.memory/02.failure-patterns.md` подсказывает Claude, когда дописывать).

3. **Периодически запускать `memory score`**, чтобы освежить значения importance. Быстро и идемпотентно.

4. **Когда наберётся ~5+ паттернов с высоким score**, запустить `memory propose-rules` и получить набросанные правила.

5. **Просмотреть предложения** в `auto-rule-update.md`. Нужные — скопировать в постоянный rule-файл под `.claude/rules/`.

6. **Раз в месяц (или в плановом CI) запускать `memory compact`**, чтобы держать `failure-patterns.md` в рамках.

Под этот ритм четыре файла и сделаны. Пропуск любого шага не страшен: memory layer opt-in, и неиспользуемые файлы не мешают.

---

## Continuity сессий

CLAUDE.md Claude Code автоматически загружает в каждой сессии. Memory-файлы **по умолчанию не автозагружаются**: их подтягивают правила `60.memory/` по требованию, когда их glob `paths:` совпадает с текущим редактируемым файлом.

Значит, в свежей сессии Claude Code память не видна, пока вы не начнёте работать с релевантным файлом.

После срабатывания auto-compaction в Claude Code (около 85% контекста) Claude теряет осведомлённость о memory-файлах, даже если они были загружены раньше. Секция 8 CLAUDE.md содержит прозовой блок **Session Resume Protocol**, который напоминает Claude:

- Пересканировать `failure-patterns.md` на релевантные записи.
- Перечитать самые свежие записи `decision-log.md`.
- Пересопоставить правила `60.memory/` с открытыми в данный момент файлами.

Это **проза, а не enforcement**, но структурирована так, что Claude склонен ей следовать. Session Resume Protocol входит в canonical scaffold v2.3.2+ и сохраняется во всех 10 выходных языках.

---

## Когда пропустить memory layer

Memory layer полезен для:

- **Долгоживущих проектов** (месяцы и более).
- **Команд**: `decision-log.md` становится общей институциональной памятью и инструментом онбординга.
- **Проектов, где Claude Code вызывается ≥10×/день**: failure-паттерны накапливаются достаточно быстро, чтобы приносить пользу.

И это перебор для:

- Одноразовых скриптов, которые выкинете через неделю.
- Spike-проектов и прототипов.
- Туториалов и демо.

Memory-файлы всё равно создаются Pass 4, но без обновлений не растут. Никаких затрат на поддержку, если не пользуетесь.

Если активно НЕ хочется, чтобы memory-правила что-то автоматически подгружали (из-за стоимости контекста), есть два пути:

- Удалить правила `60.memory/`. Pass 4 не пересоздаст их при resume, только при `--force`.
- Или сузить globs `paths:` в каждом правиле так, чтобы они ничему не соответствовали.

---

## См. также

- [architecture.md](architecture.md) — Pass 4 в контексте конвейера
- [commands.md](commands.md) — справочник `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) — проверки `[9/9]` content-validator для memory
