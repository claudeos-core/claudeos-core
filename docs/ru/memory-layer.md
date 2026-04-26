# Memory Layer (L4)

После v2.0 ClaudeOS-Core пишет персистентный memory layer рядом с обычной документацией. Это для долгоживущих проектов, где вы хотите, чтобы Claude Code:

1. Помнил архитектурные решения и их обоснование.
2. Учился на повторяющихся ошибках.
3. Авто-продвигал частые failure-паттерны в постоянные rules.

Если вы используете ClaudeOS-Core только для одноразовой генерации, этот слой можно полностью игнорировать. Memory-файлы пишутся, но не растут, если вы их не обновляете.

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

Файлы правил `60.memory/` имеют globs `paths:`, которые совпадают с файлами проекта, где должна быть загружена память. Когда Claude Code редактирует файл, совпадающий с glob, соответствующий memory-файл загружается в контекст.

Это **on-demand загрузка** — память не всегда в контексте, только когда релевантна. Это держит рабочий контекст Claude худым.

---

## Четыре memory-файла

### `decision-log.md` — append-only архитектурные решения

Когда вы принимаете не-очевидное техническое решение, вы (или Claude по вашему запросу) дописываете блок:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Этот файл **растёт со временем**. Он не авто-удаляется. Старые решения остаются ценным контекстом.

Автозагружаемое правило (`60.memory/01.decision-log.md`) говорит Claude Code сверяться с этим файлом, прежде чем отвечать на вопросы вроде «Почему мы сделали X таким образом?»

### `failure-patterns.md` — повторяющиеся ошибки

Когда Claude Code совершает повторяющуюся ошибку (например, «Claude продолжает генерировать JPA, хотя проект использует MyBatis»), сюда идёт запись:

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
- **Rule promotion:** записи с `frequency >= 3` всплывают как кандидаты для новых записей `.claude/rules/` через `memory propose-rules`. (Importance не фильтр — она лишь влияет на confidence-score каждого предложения.)

Поля метаданных парсятся субкомандами `memory` через якорный regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`), так что строки полей должны выглядеть примерно как пример выше. Отступы и курсивные вариации допускаются.

### `compaction.md` — лог компактации

Этот файл отслеживает историю компактации:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Только секция `## Last Compaction` перезаписывается на каждом запуске `memory compact`. Всё, что вы добавили в другом месте файла, сохраняется.

### `auto-rule-update.md` — очередь предложенных правил

Когда вы запускаете `memory propose-rules`, Claude читает `failure-patterns.md` и дописывает сюда предложенный rule-контент:

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

Вы просматриваете предложения, копируете нужные в реальные rule-файлы. **Команда propose-rules не применяет ничего автоматически** — это намеренно, поскольку LLM-набросанные правила требуют человеческого ревью.

---

## Алгоритм компактации

Память растёт, но не разбухает. Четырёхстадийная компактация запускается при вызове:

```bash
npx claudeos-core memory compact
```

| Стадия | Триггер | Действие |
|---|---|---|
| 1 | `lastSeen > 30 days` И не preserved | Body сворачивается в одну строку «fix» + meta |
| 2 | Дубликаты heading | Объединение (frequency складываются, body = самый недавний) |
| 3 | `importance < 3` И `lastSeen > 60 days` | Удаляется |
| 4 | Файл > 400 строк | Обрезаются самые старые non-preserved записи |

**«Preserved» записи** переживают все стадии. Запись считается preserved, если выполняется любое из:

- `importance >= 7`
- `lastSeen < 30 days`
- Body содержит конкретный (non-glob) активный путь к правилу (например, `.claude/rules/10.backend/orm-rules.md`)

Проверка «active rule path» интересная: если запись памяти ссылается на реально существующий файл правила, запись привязана к жизненному циклу этого правила. Пока правило существует, память остаётся.

Алгоритм компактации — намеренное копирование человеческой кривой забывания: частое, недавнее, важное остаётся; редкое, старое, неважное угасает.

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
- Запись с `frequency = 3` и `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Запись с `frequency = 3` и `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`

**Команда score удаляет ВСЕ существующие строки importance перед вставкой.** Это предотвращает регрессии с дублированными строками при повторных запусках score.

---

## Продвижение в правила: `propose-rules`

Запустите:

```bash
npx claudeos-core memory propose-rules
```

Это:

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

**Значение evidence ограничено 6, когда importance отсутствует** — без оценки importance одной только частоты не должно быть достаточно, чтобы толкнуть sigmoid к высокой confidence. (Это ограничивает вход sigmoid, а не количество предложений.)

---

## Типичный workflow

Для долгоживущего проекта ритм выглядит так:

1. **Запустить `init` один раз**, чтобы настроить memory-файлы вместе со всем остальным.

2. **Использовать Claude Code нормально несколько недель.** Замечать повторяющиеся ошибки (например, Claude продолжает использовать неправильную обёртку response). Дописывать записи в `failure-patterns.md` — либо вручную, либо попросив Claude (правило в `60.memory/02.failure-patterns.md` говорит Claude, когда дописывать).

3. **Периодически запускать `memory score`**, чтобы освежить значения importance. Это быстро и идемпотентно.

4. **Когда у вас ~5+ паттернов с высоким score**, запустить `memory propose-rules`, чтобы получить набросанные правила.

5. **Просмотреть предложения** в `auto-rule-update.md`. Для каждого нужного скопировать содержимое в постоянный rule-файл под `.claude/rules/`.

6. **Запускать `memory compact` периодически** (раз в месяц или в плановом CI), чтобы держать `failure-patterns.md` ограниченным.

Этот ритм — то, для чего предназначены четыре файла. Пропуск любого шага нормален — memory layer opt-in, и неиспользуемые файлы не мешают.

---

## Continuity сессий

CLAUDE.md автоматически загружается Claude Code в каждой сессии. Memory-файлы **по умолчанию не автозагружаются** — они загружаются по требованию правилами `60.memory/`, когда их glob `paths:` совпадает с файлом, который Claude сейчас редактирует.

Это значит: в свежей сессии Claude Code память не видна, пока вы не начнёте работать на релевантном файле.

После того как сработает auto-compaction Claude Code (около 85% контекста), Claude теряет осведомлённость о memory-файлах, даже если они были загружены ранее. Section 8 CLAUDE.md включает прозовой блок **Session Resume Protocol**, который напоминает Claude:

- Пере-сканировать `failure-patterns.md` на релевантные записи.
- Перечитать самые недавние записи `decision-log.md`.
- Пере-сопоставить правила `60.memory/` с открытыми в данный момент файлами.

Это **проза, не enforced** — но проза структурирована так, что Claude склонен ей следовать. Session Resume Protocol — часть canonical scaffold v2.3.2+ и сохраняется через все 10 выходных языков.

---

## Когда пропустить memory layer

Memory layer добавляет ценность для:

- **Долгоживущих проектов** (месяцы и более).
- **Команд** — `decision-log.md` становится разделяемой институциональной памятью и инструментом онбординга.
- **Проектов, где Claude Code вызывается ≥10×/день** — failure-паттерны накапливаются достаточно быстро, чтобы быть полезными.

Это перебор для:

- Одноразовых скриптов, которые вы выкинете через неделю.
- Spike-проектов или прототипов.
- Туториалов или демо.

Memory-файлы всё равно пишутся Pass 4, но если вы их не обновляете, они не растут. Никаких затрат на поддержку, если не используете.

Если вы активно НЕ хотите, чтобы memory-правила что-то автоматически загружали (по причинам стоимости контекста), можно:

- Удалить правила `60.memory/` — Pass 4 не пересоздаст их при resume, только при `--force`.
- Или сузить globs `paths:` в каждом правиле, чтобы они ничему не соответствовали.

---

## См. также

- [architecture.md](architecture.md) — Pass 4 в контексте конвейера
- [commands.md](commands.md) — справочник `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) — проверки `[9/9]` content-validator для memory
