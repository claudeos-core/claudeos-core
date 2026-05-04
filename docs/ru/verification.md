# Верификация

Когда Claude закончил генерировать документацию, код проверяет вывод **5 отдельными validator**. Ни один из них не зовёт LLM, все проверки детерминированы.

Эта страница описывает, что проверяет каждый validator, как устроены severity-уровни и как читать вывод.

> Английский оригинал: [docs/verification.md](../verification.md). Русский перевод синхронизирован с английским.

---

## Зачем post-generation верификация

LLM не детерминированы. Даже с промптами, инжектирующими факты ([allowlist путей к исходникам](architecture.md#промпты-с-инжекцией-фактов-предотвращают-галлюцинации)), Claude всё равно может:

- Пропустить обязательную секцию под давлением контекста.
- Процитировать путь, почти-но-не-совсем совпадающий с allowlist (скажем, `src/feature/routers/featureRoutePath.ts`, выдуманный из имени родительского каталога и TypeScript-константы).
- Породить несогласованные cross-reference между standards и rules.
- Повторно объявить содержимое Section 8 где-то ещё в CLAUDE.md.

Validator ловят такой тихо-сломанный вывод до того, как docs уйдут в работу.

---

## 5 validator

### 1. `claude-md-validator` — структурные инварианты

Валидирует `CLAUDE.md` по набору структурных проверок (таблица ниже перечисляет семейства check-ID; общее число индивидуальных reportable ID отличается, потому что `checkSectionsHaveContent` и `checkCanonicalHeadings` эмитят по одному на section и т. д.). Лежит в `claude-md-validator/`.

**Запускается через:**
```bash
npx claudeos-core lint
```

(Через `health` не запускается, см. [Почему две точки входа](#почему-две-точки-входа-lint-vs-health) ниже.)

**Что проверяет:**

| Check ID | Что enforced |
|---|---|
| `S1` | Количество секций — ровно 8 |
| `S2-N` | В каждой секции ≥2 непустых строк тела |
| `S-H3-4` | В Section 4 — 3 или 4 H3 sub-section |
| `S-H3-6` | В Section 6 — ровно 3 H3 sub-section |
| `S-H3-8` | В Section 8 — ровно 2 H3 sub-section |
| `S-H4-8` | В Section 8 — ровно 2 H4 heading (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Каждый из 4 memory-файлов (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) появляется ровно в ОДНОЙ markdown-строке таблицы |
| `F2-<file>` | Строки таблицы memory-файлов ограничены Section 8 |
| `T1-1` … `T1-8` | Каждый `## N.` section heading содержит свой английский canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) — case-insensitive substring match |

**Почему language-invariant:** validator никогда не матчит переведённую прозу в заголовках. Он смотрит только на markdown-структуру (уровни заголовков, количества, порядок) и английские canonical token. Те же проверки срабатывают на CLAUDE.md, сгенерированном на любом из 10 поддерживаемых языков.

**Почему это важно на практике:** CLAUDE.md, сгенерированные с `--lang ja` и `--lang en`, выглядят для человека совершенно по-разному, но `claude-md-validator` выдаёт побайтово идентичные pass/fail verdict на обоих. Никаких per-language словарей.

### 2. `content-validator` — проверки путей и manifest

Валидирует **содержимое** сгенерированных файлов (не структуру CLAUDE.md). Лежит в `content-validator/`.

**10 проверок** (первые 9 помечены `[N/9]` в console-выводе; 10-ю добавили позже и пометили `[10/10]`. Эту асимметрию специально сохранили в коде, чтобы существующие CI-greps продолжали работать):

| Проверка | Что enforced |
|---|---|
| `[1/9]` CLAUDE.md существует, ≥100 chars, содержит требуемые ключевые слова section (10-language aware) |
| `[2/9]` Файлы `.claude/rules/**/*.md` имеют YAML frontmatter с ключом `paths:`, без пустых файлов |
| `[3/9]` Файлы `claudeos-core/standard/**/*.md` ≥200 chars и содержат примеры ✅/❌ + markdown-таблицу (Kotlin standards также проверяются на наличие блоков ` ```kotlin `) |
| `[4/9]` Файлы `claudeos-core/skills/**/*.md` непустые; orchestrator + MANIFEST присутствуют |
| `[5/9]` `claudeos-core/guide/` имеет все 9 ожидаемых файлов, каждый непустой (BOM-aware проверка пустоты) |
| `[6/9]` Файлы `claudeos-core/plan/` непустые (informational начиная с v2.1.2 — `plan/` больше не создаётся автоматически) |
| `[7/9]` Файлы `claudeos-core/database/` существуют (warning, если отсутствуют) |
| `[8/9]` Файлы `claudeos-core/mcp-guide/` существуют (warning, если отсутствуют) |
| `[9/9]` 4 файла `claudeos-core/memory/` существуют + структурная валидация (decision-log ISO-дата, failure-pattern обязательные поля, compaction маркер `## Last Compaction`) |
| `[10/10]` Path-claim верификация + MANIFEST drift (3 sub-класса — см. ниже) |

**Sub-классы проверки `[10/10]`:**

| Класс | Что ловит |
|---|---|
| `STALE_PATH` | Любая ссылка `src/...\.(ts|tsx|js|jsx)` в `.claude/rules/**` или `claudeos-core/standard/**` обязана указывать на реальный файл. Fenced code blocks и placeholder-пути (`src/{domain}/feature.ts`) исключены. |
| `STALE_SKILL_ENTRY` | Каждый skill-путь, зарегистрированный в `claudeos-core/skills/00.shared/MANIFEST.md`, должен существовать на диске. |
| `MANIFEST_DRIFT` | Каждый зарегистрированный skill должен быть упомянут в `CLAUDE.md` (с **исключением orchestrator/sub-skill**: Pass 3b пишет Section 6 до того, как Pass 3c создаст sub-skills, так что перечислять каждый sub-skill структурно невозможно). |

Исключение orchestrator/sub-skill: зарегистрированный sub-skill в `{category}/{parent-stem}/{NN}.{name}.md` считается покрытым, если orchestrator в `{category}/*{parent-stem}*.md` упомянут в CLAUDE.md.

**Severity:** content-validator работает на уровне **advisory**: видно в выводе, но не блокирует CI. Логика: повторный запуск Pass 3 не всегда лечит галлюцинации LLM, и блокировка загнала бы пользователей в петли `--force`. Сигнала обнаружения (non-zero exit + запись в `stale-report`) хватает для CI-конвейеров и ручного триажа.

### 3. `pass-json-validator` — well-formedness выходов pass-ов

Проверяет, что JSON-файлы, которые пишет каждый pass, well-formed и содержат ожидаемые ключи. Лежит в `pass-json-validator/`.

**Валидируемые файлы:**

| Файл | Обязательные ключи |
|---|---|
| `project-analysis.json` | 5 обязательных ключей (stack, domains и т.д.) |
| `domain-groups.json` | 4 обязательных ключа |
| `pass1-*.json` | 4 обязательных ключа + объект `analysisPerDomain` |
| `pass2-merged.json` | 10 общих секций (всегда) + 2 backend секции (когда backend stack) + 1 kotlin base + 2 kotlin CQRS секции (когда применимо). Fuzzy match с картой семантических алиасов; число top-level ключей <5 = ERROR, <9 = WARNING; обнаружение пустых значений. |
| `pass3-complete.json` | Наличие маркера + структура |
| `pass4-memory.json` | Структура маркера: object, `passNum === 4`, непустой массив `memoryFiles` |

Проверка pass2 **stack-aware**: читает `project-analysis.json`, определяет backend/kotlin/cqrs и подстраивает ожидаемый набор секций.

**Severity:** работает на уровне **warn-only**: поднимает проблемы, но CI не валит.

### 4. `plan-validator` — Plan ↔ disk консистентность (legacy)

Сравнивает файлы `claudeos-core/plan/*.md` с диском. Лежит в `plan-validator/`.

**3 режима:**
- `--check` (по умолчанию): только обнаружение drift
- `--refresh`: обновить plan-файлы по содержимому диска
- `--execute`: применить содержимое plan к диску (создаёт `.bak` бэкапы)

**Статус v2.1.0:** генерацию master plan убрали в v2.1.0. `claudeos-core/plan/` больше не создаётся автоматически через `init`. Когда `plan/` отсутствует, validator пропускает работу с информационными сообщениями.

Оставлен в наборе validator для тех, кто вручную поддерживает plan-файлы для ad-hoc backup.

**Безопасность:** path traversal заблокирован: `isWithinRoot(absPath)` отбрасывает пути, выходящие за корень проекта через `../`.

**Severity:** работает на уровне **fail**, когда обнаружен реальный drift. No-op, когда `plan/` отсутствует.

### 5. `sync-checker` — Disk ↔ Master Plan консистентность

Проверяет, что файлы, зарегистрированные в `sync-map.json` (его пишет `manifest-generator`), совпадают с реальными файлами на диске. Двусторонняя проверка по 7 отслеживаемым каталогам. Лежит в `sync-checker/`.

**Двухшаговая проверка:**

1. **Disk → Plan:** обходит 7 отслеживаемых каталогов (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Сообщает о файлах, которые есть на диске, но не зарегистрированы в `sync-map.json`.
2. **Plan → Disk:** сообщает о путях, зарегистрированных в `sync-map.json`, которых на диске уже нет (orphaned).

**Exit code:** только orphaned-файлы вызывают exit 1. Unregistered-файлы — informational (в проекте v2.1.0+ по умолчанию ноль зарегистрированных путей, так что это обычный кейс).

**Severity:** работает на уровне **fail** для orphaned-файлов. Чистый skip, когда в `sync-map.json` нет mapping-ов.

---

## Severity-уровни

Не каждая проваленная проверка одинаково серьёзна. `health-checker` оркестрирует runtime-validator с трёхуровневой severity:

| Уровень | Символ | Поведение |
|---|---|---|
| **fail** | `❌` | Блокирует завершение. CI выходит non-zero. Чинить обязательно. |
| **warn** | `⚠️` | Видно в выводе, но не блокирует. Стоит разобраться. |
| **advisory** | `ℹ️` | Глянуть позже. Часто false positive на нестандартных layouts. |

**Примеры по уровням:**

- **fail:** plan-validator увидел реальный drift, sync-checker нашёл orphaned-файлы, отсутствует обязательный guide-файл.
- **warn:** pass-json-validator нашёл некритичный пробел в схеме.
- **advisory:** `STALE_PATH` content-validator пометил путь, который реально существует, но в `.gitignore` (false positive в части проектов).

Трёхуровневую систему добавили, чтобы находки `content-validator` (склонные давать false positive на нестандартных layouts) не валили CI-конвейеры. Без неё каждое advisory блокировало бы сборку, а повторный запуск `init` не всегда лечит галлюцинации LLM.

Сводная строка показывает разбивку:
```
All systems operational (1 advisory, 1 warning)
```

---

## Почему две точки входа: `lint` vs `health`

```bash
npx claudeos-core lint     # только claude-md-validator
npx claudeos-core health   # 4 других validator
```

**Почему разделено?**

`claude-md-validator` находит **структурные** проблемы: неверное число секций, повторно объявленную таблицу memory-файлов, отсутствие английского token в canonical heading. Это сигналы, что **CLAUDE.md надо регенерировать**, а не мягкие предупреждения для разбора. Перезапуск `init` (с `--force` при необходимости) и есть фикс.

Остальные validator находят **content**-проблемы: пути, записи manifest, пробелы схемы. Их можно просмотреть и поправить руками, не регенерируя всё.

Раз `lint` отдельно, его можно прицепить к pre-commit хукам (быстро, только структурно), не таща за собой более медленные content-проверки.

---

## Запуск валидации

```bash
# Структурная валидация CLAUDE.md
npx claudeos-core lint

# Набор из 4 validator
npx claudeos-core health
```

Для CI рекомендуется `health`. Он по-прежнему быстрый (никаких LLM-вызовов) и покрывает всё, кроме структурных проверок CLAUDE.md, которые большинству CI-конвейеров не нужно гонять на каждом коммите.

Для pre-commit хуков `lint` достаточно быстр, чтобы запускать его на каждом коммите.

---

## Формат вывода

По умолчанию validator выдают human-readable вывод:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` пишет машиночитаемые артефакты в `claudeos-core/generated/`:

- `rule-manifest.json` — список файлов + frontmatter из gray-matter + stat
- `sync-map.json` — зарегистрированные mapping-и путей (с v2.1.0+ по умолчанию пустой массив)
- `stale-report.json` — сведённые находки всех validator

---

## CI-интеграция

Минимальный пример GitHub Actions:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Exit code non-zero только для находок уровня `fail`. `warn` и `advisory` печатаются, но сборку не валят.

Официальный CI workflow (в `.github/workflows/test.yml`) гоняется на `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Когда validator помечает что-то, с чем вы не согласны

False-positive бывают, особенно на нестандартных layouts проекта (gitignored сгенерированные файлы, кастомные шаги сборки, выводящие в нестандартные пути и т. п.).

**Чтобы подавить обнаружение для конкретного файла**, посмотрите [advanced-config.md](advanced-config.md): какие override-ы `.claudeos-scan.json` доступны.

**Если validator неправ системно** (а не только в вашем проекте), [откройте issue](https://github.com/claudeos-core/claudeos-core/issues): эти проверки настраиваются со временем по реальным сообщениям.

---

## См. также

- [architecture.md](architecture.md) — где validator стоят в конвейере
- [commands.md](commands.md) — справочник команд `lint` и `health`
- [troubleshooting.md](troubleshooting.md) — что значат конкретные ошибки validator
