# Troubleshooting

Распространённые ошибки и как их исправить. Если вашей проблемы здесь нет, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) с шагами воспроизведения.

> Английский оригинал: [docs/troubleshooting.md](../troubleshooting.md). Русский перевод синхронизирован с английским.

---

## Проблемы установки

### «Command not found: claudeos-core»

Не установлено глобально, либо global bin npm-а не на PATH.

**Вариант A — Использовать `npx` (рекомендуется, без установки):**
```bash
npx claudeos-core init
```

**Вариант B — Установить глобально:**
```bash
npm install -g claudeos-core
claudeos-core init
```

Если установлено через npm, но всё ещё «command not found», проверьте PATH:
```bash
npm config get prefix
# Убедитесь, что bin/-каталог под этим prefix-ом в вашем PATH
```

### «Cannot find module 'glob'» или подобное

Вы запускаете ClaudeOS-Core снаружи корня проекта. Либо:

1. `cd` в проект сначала.
2. Используйте `npx claudeos-core init` (работает из любого каталога).

### «Node.js version not supported»

ClaudeOS-Core требует Node.js 18+. Проверьте версию:

```bash
node --version
```

Обновите через [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) или package manager ОС.

---

## Pre-flight проверки

### «Claude Code not found»

ClaudeOS-Core использует вашу локальную установку Claude Code. Установите сначала её:

- [Официальный гайд установки](https://docs.anthropic.com/en/docs/claude-code)
- Проверка: `claude --version`

Если `claude` установлен, но не на PATH, исправьте PATH вашего shell — переменной окружения override-а нет.

### «Could not detect stack»

Сканер не смог идентифицировать framework вашего проекта. Причины:

- Нет `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` в корне проекта.
- Ваш стек не входит в [12 поддерживаемых стеков](stacks.md).
- Кастомный layout, не соответствующий правилам авто-detection.

**Фикс:** убедитесь, что в корне проекта есть один из распознаваемых файлов. Если стек поддерживается, но layout необычен — см. [advanced-config.md](advanced-config.md) — override-ы `.claudeos-scan.json`.

### «Authentication test failed»

`init` запускает быстрый `claude -p "echo ok"` для проверки аутентификации Claude Code. Если это падает:

```bash
claude --version           # Должно напечатать версию
claude -p "say hi"         # Должно напечатать ответ
```

Если `-p` возвращает auth-ошибку, следуйте auth flow Claude Code. ClaudeOS-Core не может починить Claude auth за вас.

---

## Runtime-проблемы init

### Init виснет или долго работает

Pass 1 на большом проекте занимает время. Диагностика:

1. **Работает ли Claude Code?** Запустите `claude --version` в другом терминале.
2. **Нормальная ли сеть?** Каждый pass вызывает Claude Code, который вызывает Anthropic API.
3. **Очень ли большой проект?** Авто-применяется domain group splitting (4 домена / 40 файлов на группу), так что проект из 24 доменов запустит Pass 1 шесть раз.

Если застряло надолго без вывода (без продвижения progress-тикера), убейте (Ctrl-C) и резюмируйте:

```bash
npx claudeos-core init   # Резюмирует с последнего завершённого pass-маркера
```

Механизм resume перезапускает только pass-ы, которые не завершились.

### Ошибки «Prompt is too long» от Claude

Это значит, что у Pass 3 закончился context window. Митигации, которые инструмент уже применяет:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — автоматически.
- **Domain group splitting** — авто-применяется, когда домены > 4 или файлы > 40 на группу.
- **Batch sub-division** — для ≥16 доменов 3b/3c делятся на батчи по ≤15 доменов.

Если всё равно упираетесь в лимиты контекста, проект исключительно большой. Текущие варианты:

1. Разделить проект на отдельные каталоги и запустить `init` в каждом.
2. Добавить агрессивные override-ы `frontendScan.platformKeywords` через `.claudeos-scan.json`, чтобы пропустить несущественные subapp-ы.
3. [Открыть issue](https://github.com/claudeos-core/claudeos-core/issues) — может потребоваться новый override для вашего случая.

Флага «форсировать более агрессивный split» сверх того, что уже автоматически, нет.

### Init падает на середине

Инструмент **resume-safe**. Просто перезапустите:

```bash
npx claudeos-core init
```

Подхватит с последнего завершённого pass-маркера. Работа не теряется.

Если хотите чистый старт (удалить все маркеры и регенерировать всё), используйте `--force`:

```bash
npx claudeos-core init --force
```

Внимание: `--force` удаляет ручные правки `.claude/rules/`. Подробности см. в [safety.md](safety.md).

### Windows: ошибки «EBUSY» или file-lock

File-locking в Windows строже, чем в Unix. Причины:

- Antivirus сканирует файлы посреди записи.
- IDE держит файл открытым с эксклюзивным lock.
- Предыдущий `init` упал и оставил устаревший handle.

Фиксы (по порядку):

1. Закройте IDE, повторите.
2. Отключите real-time сканирование antivirus для папки проекта (или whitelist путь проекта).
3. Перезагрузите Windows (очищает устаревшие handle).
4. Если стабильно — запустите из WSL2.

Логика перемещения `lib/staged-rules.js` откатывается с `renameSync` на `copyFileSync + unlinkSync`, обрабатывая большинство помех antivirus автоматически. Если всё равно упираетесь в lock-ошибки, staged-файлы остаются в `claudeos-core/generated/.staged-rules/` для инспекции — перезапустите `init`, чтобы повторить перемещение.

### Cross-volume rename failures (Linux/macOS)

`init` может потребоваться атомарно переименовывать через mount-точки (например, `/tmp` в проект на другом диске). Инструмент откатывается на copy-then-delete автоматически — действий не нужно.

Если видите стабильные сбои перемещения, проверьте, что есть write-доступ к `claudeos-core/generated/.staged-rules/` и `.claude/rules/`.

---

## Проблемы валидации

### «STALE_PATH: file does not exist»

Путь, упомянутый в standards/skills/guides, не указывает на реальный файл. Причины:

- Pass 3 галлюцинировал путь (например, выдумал `featureRoutePath.ts` из родительского каталога + имени TypeScript-константы).
- Вы удалили файл, но docs всё ещё на него ссылаются.
- Файл gitignored, но allowlist сканера его содержал.

**Фикс:**

```bash
npx claudeos-core init --force
```

Регенерирует Pass 3 / 4 со свежим allowlist.

Если путь намеренно gitignored и хотите, чтобы сканер его игнорировал — см. [advanced-config.md](advanced-config.md) — что реально поддерживает `.claudeos-scan.json` (поддерживаемый набор полей маленький).

Если `--force` не помогает (повторный запуск может ретриггерить ту же галлюцинацию на редких LLM-сидах), отредактируйте офендящий файл вручную и удалите плохой путь. Validator на уровне **advisory**, так что это не блокирует CI — можно отгрузить и поправить позже.

### «MANIFEST_DRIFT: registered skill not in CLAUDE.md»

Skills, зарегистрированные в `claudeos-core/skills/00.shared/MANIFEST.md`, должны быть упомянуты где-то в CLAUDE.md. У validator есть **исключение orchestrator/sub-skill** — sub-skills считаются покрытыми, когда упомянут их orchestrator.

**Фикс:** если orchestrator sub-skill действительно не упомянут в CLAUDE.md, запустите `init --force`, чтобы регенерировать. Если orchestrator упомянут, а validator всё равно помечает — это баг validator; пожалуйста, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) с путями файлов.

### «Section 8 has wrong number of H4 sub-sections»

`claude-md-validator` требует ровно 2 `####` heading под Section 8 (L4 Memory Files / Memory Workflow).

Вероятные причины:

- Вы вручную отредактировали CLAUDE.md и сломали структуру Section 8.
- Сработал pre-v2.3.0 Pass 4 и дописал Section 9.
- Вы апгрейдитесь с pre-v2.2.0 версии (8-секционный scaffold ещё не enforced).

**Фикс:**

```bash
npx claudeos-core init --force
```

Это регенерирует CLAUDE.md чисто. Memory-файлы сохраняются при `--force` (перезаписываются только сгенерированные файлы).

### «T1: section heading missing English canonical token»

Каждый `## N.` section heading должен содержать свой английский canonical token (например, `## 1. Role Definition` или `## 1. Определение роли (Role Definition)`). Это нужно, чтобы multi-repo grep работал независимо от `--lang`.

**Фикс:** отредактируйте heading, чтобы включить английский token в скобках, или запустите `init --force`, чтобы регенерировать (scaffold v2.3.0+ enforced эту конвенцию автоматически).

---

## Проблемы memory layer

### «Memory file growing too large»

Запустите компактацию:

```bash
npx claudeos-core memory compact
```

Применяет 4-стадийный алгоритм компактации. Подробности по каждой стадии см. в [memory-layer.md](memory-layer.md).

### «propose-rules suggests rules I disagree with»

Вывод — это черновик для ревью, не авто-применяется. Просто откажитесь от того, что не нужно:

- Отредактируйте `claudeos-core/memory/auto-rule-update.md` напрямую, удалив отвергаемые предложения.
- Или вообще пропустите шаг применения — ваш `.claude/rules/` не меняется, пока вы вручную не скопируете предложенный контент в rule-файлы.

### `memory <subcommand>` говорит «not found»

Memory-файлы отсутствуют. Они создаются Pass 4 `init`. Если их удалили:

```bash
npx claudeos-core init --force
```

Или, если хотите только пересоздать memory-файлы без перезапуска всего, у инструмента нет команды single-pass-replay. `--force` — это путь.

---

## Проблемы CI

### Тесты проходят локально, но падают в CI

Самые вероятные причины:

1. **В CI нет установленного `claude`.** Зависящие от перевода тесты выходят через `CLAUDEOS_SKIP_TRANSLATION=1`. Официальный CI workflow устанавливает эту env-переменную; если ваш форк нет, поставьте.

2. **Path-нормализация (Windows).** Кодовая база нормализует Windows backslashes в forward slashes во многих местах, но тесты могут спотыкаться на тонких различиях. Официальный CI запускается на Windows + Linux + macOS, так что большинство проблем ловятся — если видите Windows-специфичный сбой, это может быть реальный баг.

3. **Версия Node.** Тесты запускаются на Node 18 + 20. Если вы на Node 16 или 22, можете встретить несовместимости — пиньте 18 или 20 для CI-паритета.

### `health` выходит 0 в CI, но я ожидал non-zero

`health` выходит non-zero только на находках уровня **fail**. **warn** и **advisory** печатаются, но не блокируют.

Если хотите падать на advisory (например, чтобы быть строгим к `STALE_PATH`), встроенного флага нет — нужно греппить вывод и выходить соответственно:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Получение помощи

Если ничего из перечисленного не подходит:

1. **Зафиксируйте точное сообщение об ошибке.** Ошибки ClaudeOS-Core включают пути файлов и идентификаторы — это помогает воспроизвести.
2. **Проверьте issue-tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — ваш issue, возможно, уже сообщён.
3. **Откройте новый issue** с указанием: ОС, версия Node, версия Claude Code (`claude --version`), стек проекта и вывод ошибки. По возможности приложите `claudeos-core/generated/project-analysis.json` (чувствительные переменные авто-маскированы).

По вопросам безопасности см. [SECURITY.md](../../SECURITY.md) — не открывайте публичные issue для уязвимостей.

---

## См. также

- [safety.md](safety.md) — что делает `--force` и что сохраняет
- [verification.md](verification.md) — что значат находки validator
- [advanced-config.md](advanced-config.md) — override-ы `.claudeos-scan.json`
