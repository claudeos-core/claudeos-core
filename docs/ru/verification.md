# Верификация

После того как Claude закончит генерировать документацию, код проверяет вывод по **5 отдельным validator**. Ни один из них не вызывает LLM — все проверки детерминированы.

Эта страница описывает, что проверяет каждый validator, как работают severity-уровни и как читать вывод.

> Английский оригинал: [docs/verification.md](../verification.md). Русский перевод синхронизирован с английским.

---

## Зачем post-generation верификация

LLM не детерминированы. Даже с промптами, инжектирующими факты ([allowlist путей к исходникам](architecture.md#промпты-с-инжекцией-фактов-предотвращают-галлюцинации)), Claude всё ещё может:

- Пропустить обязательную секцию под давлением контекста.
- Процитировать путь, почти-но-не-совсем совпадающий с allowlist (например, `src/feature/routers/featureRoutePath.ts`, выдуманный из родительского каталога + имени TypeScript константы).
- Сгенерировать несогласованные cross-reference между standards и rules.
- Повторно объявить содержимое Section 8 где-то ещё в CLAUDE.md.

Validator ловят такие тихо-плохие выходы до того, как docs пойдут в работу.

---

## 5 validator

### 1. `claude-md-validator` — структурные инварианты

Валидирует `CLAUDE.md` по набору структурных проверок (таблица ниже перечисляет семейства check-ID — общее число индивидуальных reportable ID отличается, поскольку `checkSectionsHaveContent` и `checkCanonicalHeadings` эмитят по одному на section и т.д.). Находится в `claude-md-validator/`.

**Запускается через:**
```bash
npx claudeos-core lint
```

(Не запускается через `health` — см. [Почему две точки входа](#почему-две-точки-входа-lint-vs-health) ниже.)

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

**Почему language-invariant:** validator никогда не сопоставляет переведённую прозу в заголовках. Он сопоставляет только markdown-структуру (уровни заголовков, количества, порядок) и английские canonical token. Те же проверки проходят на CLAUDE.md, сгенерированном на любом из 10 поддерживаемых языков.

**Почему это важно на практике:** CLAUDE.md, сгенерированный с `--lang ja`, и тот, что с `--lang en`, для человека выглядят совершенно по-разному, но `claude-md-validator` выдаёт побайтово идентичные pass/fail verdict-ы на обоих. Никакой поддержки per-language словарей.

### 2. `content-validator` — проверки путей и manifest

Валидирует **содержимое** сгенерированных файлов (не структуру CLAUDE.md). Находится в `content-validator/`.

**10 проверок** (первые 9 помечены `[N/9]` в console-выводе; 10-я была добавлена позже и помечена `[10/10]` — эта асимметрия сохранена в коде, чтобы существующие CI-greps продолжали работать):

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
| `STALE_PATH` | Любая ссылка `src/...\.(ts|tsx|js|jsx)` в `.claude/rules/**` или `claudeos-core/standard/**` должна указывать на реальный файл. Fenced code blocks и placeholder-пути (`src/{domain}/feature.ts`) исключены. |
| `STALE_SKILL_ENTRY` | Каждый skill-путь, зарегистрированный в `claudeos-core/skills/00.shared/MANIFEST.md`, должен существовать на диске. |
| `MANIFEST_DRIFT` | Каждый зарегистрированный skill должен быть упомянут в `CLAUDE.md` (с **исключением orchestrator/sub-skill** — Pass 3b пишет Section 6 до того, как Pass 3c создаст sub-skills, так что перечислять каждый sub-skill структурно невозможно). |

Исключение orchestrator/sub-skill: зарегистрированный sub-skill в `{category}/{parent-stem}/{NN}.{name}.md` считается покрытым, когда orchestrator в `{category}/*{parent-stem}*.md` упомянут в CLAUDE.md.

**Severity:** content-validator работает на уровне **advisory** — появляется в выводе, но не блокирует CI. Аргументация: повторный запуск Pass 3 не гарантированно исправляет галлюцинации LLM, так что блокировка загнала бы пользователей в петли `--force`. Сигнала обнаружения (non-zero exit + запись в `stale-report`) достаточно для CI-конвейеров и человеческого триажа.

### 3. `pass-json-validator` — well-formedness выходов pass-ов

Валидирует, что JSON-файлы, написанные каждым pass-ом, well-formed и содержат ожидаемые ключи. Находится в `pass-json-validator/`.

**Валидируемые файлы:**

| Файл | Обязательные ключи |
|---|---|
| `project-analysis.json` | 5 обязательных ключей (stack, domains и т.д.) |
| `domain-groups.json` | 4 обязательных ключа |
| `pass1-*.json` | 4 обязательных ключа + объект `analysisPerDomain` |
| `pass2-merged.json` | 10 общих секций (всегда) + 2 backend секции (когда backend stack) + 1 kotlin base + 2 kotlin CQRS секции (когда применимо). Fuzzy match с картой семантических алиасов; количество top-level ключей <5 = ERROR, <9 = WARNING; обнаружение пустых значений. |
| `pass3-complete.json` | Наличие маркера + структура |
| `pass4-memory.json` | Структура маркера: object, `passNum === 4`, непустой массив `memoryFiles` |

Проверка pass2 — **stack-aware**: читает `project-analysis.json`, чтобы определить backend/kotlin/cqrs и подстроить, какие секции ожидаются.

**Severity:** работает на уровне **warn-only** — поднимает проблемы, но не блокирует CI.

### 4. `plan-validator` — Plan ↔ disk консистентность (legacy)

Сравнивает файлы `claudeos-core/plan/*.md` с диском. Находится в `plan-validator/`.

**3 режима:**
- `--check` (по умолчанию): только обнаружение drift
- `--refresh`: обновление plan-файлов с диска
- `--execute`: применение содержимого plan к диску (создаёт `.bak` бэкапы)

**Статус v2.1.0:** Генерация master plan была удалена в v2.1.0. `claudeos-core/plan/` больше не создаётся автоматически через `init`. Когда `plan/` отсутствует, этот validator пропускает с информационными сообщениями.

Оставлен в наборе validator для пользователей, которые вручную поддерживают plan-файлы для ad-hoc backup-целей.

**Безопасность:** path traversal заблокирован — `isWithinRoot(absPath)` отклоняет пути, выходящие за корень проекта через `../`.

**Severity:** работает на уровне **fail**, когда обнаружен реальный drift. No-op, когда `plan/` отсутствует.

### 5. `sync-checker` — Disk ↔ Master Plan консистентность

Проверяет, что файлы, зарегистрированные в `sync-map.json` (написанном `manifest-generator`), совпадают с реальными файлами на диске. Двусторонняя проверка по 7 отслеживаемым каталогам. Находится в `sync-checker/`.

**Двухшаговая проверка:**

1. **Disk → Plan:** Обходит 7 отслеживаемых каталогов (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Сообщает о файлах, которые есть на диске, но не зарегистрированы в `sync-map.json`.
2. **Plan → Disk:** Сообщает о путях, зарегистрированных в `sync-map.json`, которых больше нет на диске (orphaned).

**Exit code:** Только orphaned-файлы вызывают exit 1. Unregistered-файлы — informational (в проекте v2.1.0+ по умолчанию ноль зарегистрированных путей, так что это обычный случай).

**Severity:** работает на уровне **fail** для orphaned-файлов. Чистый skip, когда `sync-map.json` не имеет mapping-ов.

---

## Severity-уровни

Не каждая проваленная проверка одинаково серьёзна. `health-checker` оркестрирует runtime-validator с трёхуровневой severity:

| Уровень | Символ | Поведение |
|---|---|---|
| **fail** | `❌` | Блокирует завершение. CI выходит non-zero. Должно быть исправлено. |
| **warn** | `⚠️` | Появляется в выводе, но не блокирует. Стоит разобраться. |
| **advisory** | `ℹ️` | Просмотрите позже. Часто false positive в нестандартных layouts. |

**Примеры по уровням:**

- **fail:** plan-validator обнаружил реальный drift; sync-checker нашёл orphaned-файлы; обязательный guide-файл отсутствует.
- **warn:** pass-json-validator нашёл некритичный пробел схемы.
- **advisory:** `STALE_PATH` content-validator пометил путь, который существует, но gitignored (false positive в некоторых проектах).

Трёхуровневая система была добавлена, чтобы находки `content-validator` (которые могут давать false positive в нестандартных layouts) не блокировали CI-конвейеры. Без неё каждое advisory блокировало бы — а повторный запуск `init` ненадёжно исправляет галлюцинации LLM.

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

`claude-md-validator` находит **структурные** проблемы — неправильное число секций, повторно объявленную таблицу memory-файлов, отсутствующий английский token в canonical heading. Это сигналы того, что **CLAUDE.md нужно регенерировать**, а не мягкие предупреждения для разбора. Перезапуск `init` (с `--force`, если нужно) — это и есть фикс.

Остальные validator находят **content**-проблемы — пути, записи manifest, пробелы схемы. Их можно просмотреть и поправить руками, не регенерируя всё.

Хранение `lint` отдельно означает, что его можно использовать в pre-commit хуках (быстро, только структурно), не таща с собой более медленные content-проверки.

---

## Запуск валидации

```bash
# Запустить структурную валидацию CLAUDE.md
npx claudeos-core lint

# Запустить набор из 4 validator
npx claudeos-core health
```

Для CI рекомендуется `health`. Он по-прежнему быстрый (без LLM-вызовов) и покрывает всё, кроме структурных проверок CLAUDE.md, которые большинству CI-конвейеров не нужно проверять на каждом коммите.

Для pre-commit хуков `lint` достаточно быстр, чтобы запускать его на каждом коммите.

---

## Формат вывода

Validator по умолчанию выдают human-readable вывод:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` пишет машиночитаемые артефакты в `claudeos-core/generated/`:

- `rule-manifest.json` — список файлов + frontmatter из gray-matter + stat
- `sync-map.json` — зарегистрированные mapping-и путей (v2.1.0+: пустой массив по умолчанию)
- `stale-report.json` — консолидированные находки от всех validator

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

Exit code non-zero только для находок уровня `fail`. `warn` и `advisory` печатаются, но не валят сборку.

Официальный CI workflow (в `.github/workflows/test.yml`) запускается на `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Когда validator помечает что-то, с чем вы не согласны

False-positive случаются, особенно в нестандартных layouts проекта (например, gitignored сгенерированные файлы, кастомные шаги сборки, выводящие в нестандартные пути).

**Чтобы подавить обнаружение для конкретного файла**, см. [advanced-config.md](advanced-config.md) — какие override-ы `.claudeos-scan.json` доступны.

**Если validator неправ на общем уровне** (а не только для вашего проекта), [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) — эти проверки настраиваются со временем по реальным сообщениям.

---

## См. также

- [architecture.md](architecture.md) — где validator стоят в конвейере
- [commands.md](commands.md) — справочник команд `lint` и `health`
- [troubleshooting.md](troubleshooting.md) — что значат конкретные ошибки validator
