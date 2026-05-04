# Troubleshooting

Частые ошибки и способы их починить. Если вашей проблемы тут нет, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) с шагами воспроизведения.

> Английский оригинал: [docs/troubleshooting.md](../troubleshooting.md). Русский перевод синхронизирован с английским.

---

## Проблемы установки

### «Command not found: claudeos-core»

Не установлено глобально, либо global bin npm не в PATH.

**Вариант A — `npx` (рекомендую, без установки):**
```bash
npx claudeos-core init
```

**Вариант B — глобальная установка:**
```bash
npm install -g claudeos-core
claudeos-core init
```

Если ставили через npm, а всё равно «command not found», проверьте PATH:
```bash
npm config get prefix
# Убедитесь, что bin/-каталог под этим prefix-ом есть в PATH
```

### «Cannot find module 'glob'» и тому подобное

Запускаете ClaudeOS-Core за пределами корня проекта. Тут два варианта:

1. Сначала `cd` в проект.
2. Использовать `npx claudeos-core init` (работает из любого каталога).

### «Node.js version not supported»

ClaudeOS-Core требует Node.js 18+. Проверьте версию:

```bash
node --version
```

Обновите через [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) или package manager ОС.

---

## Pre-flight проверки

### «Claude Code not found»

ClaudeOS-Core использует локальную установку Claude Code. Сначала ставим её:

- [Официальный гайд установки](https://docs.anthropic.com/en/docs/claude-code).
- Проверка: `claude --version`.

Если `claude` установлен, но не в PATH, поправьте PATH своего shell. Override через переменную окружения не предусмотрен.

### «Could not detect stack»

Сканер не смог опознать фреймворк проекта. Причины:

- В корне проекта нет `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml`.
- Стек не входит в [12 поддерживаемых](stacks.md).
- Кастомный layout, не подходящий под правила авто-detection.

**Фикс:** убедитесь, что в корне проекта есть один из распознаваемых файлов. Если стек поддерживается, но layout необычный, смотрите [advanced-config.md](advanced-config.md) — override-ы `.claudeos-scan.json`.

### «Authentication test failed»

`init` запускает быстрый `claude -p "echo ok"`, чтобы проверить аутентификацию Claude Code. Если падает:

```bash
claude --version           # Должно напечатать версию
claude -p "say hi"         # Должно напечатать ответ
```

Если `-p` возвращает auth-ошибку, идите по auth flow Claude Code. ClaudeOS-Core не починит Claude auth за вас.

---

## Runtime-проблемы init

### Init виснет или долго работает

Pass 1 на большом проекте занимает время. Диагностика:

1. **Работает ли Claude Code?** Запустите `claude --version` в другом терминале.
2. **Нормальная сеть?** Каждый pass дёргает Claude Code, который дёргает Anthropic API.
3. **Очень большой проект?** Авто-применяется domain group splitting (4 домена / 40 файлов на группу), так что проект из 24 доменов запустит Pass 1 шесть раз.

Если зависло надолго без вывода (тикер прогресса не движется), убейте (Ctrl-C) и продолжите:

```bash
npx claudeos-core init   # Резюмирует с последнего завершённого pass-маркера
```

Механизм resume перезапускает только незавершённые pass-ы.

### Ошибки «Prompt is too long» от Claude

Значит, у Pass 3 закончился context window. Что инструмент уже делает для смягчения:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — автоматически.
- **Domain group splitting** — срабатывает, когда доменов > 4 или файлов > 40 на группу.
- **Batch sub-division** — для ≥16 доменов 3b/3c делятся на батчи по ≤15 доменов.

Если всё равно упираетесь в лимиты контекста, проект исключительно большой. Варианты сейчас такие:

1. Разделить проект на отдельные каталоги и запустить `init` в каждом.
2. Добавить агрессивные override-ы `frontendScan.platformKeywords` в `.claudeos-scan.json`, чтобы пропустить несущественные subapp-ы.
3. [Открыть issue](https://github.com/claudeos-core/claudeos-core/issues) — возможно, нужен новый override под ваш случай.

Флага «форсировать более агрессивный split» сверх того, что уже работает автоматически, нет.

### Init падает на середине

Инструмент **resume-safe**. Просто перезапускайте:

```bash
npx claudeos-core init
```

Подхватит с последнего завершённого pass-маркера. Работа не теряется.

Нужен чистый старт (стереть все маркеры и регенерировать всё)? Используйте `--force`:

```bash
npx claudeos-core init --force
```

Внимание: `--force` удаляет ручные правки `.claude/rules/`. Подробности в [safety.md](safety.md).

### Windows: ошибки «EBUSY» или file-lock

File-locking в Windows строже, чем в Unix. Причины:

- Antivirus сканирует файл посреди записи.
- IDE держит файл открытым с эксклюзивным lock.
- Предыдущий `init` упал и оставил устаревший handle.

Фиксы (по порядку):

1. Закройте IDE, повторите.
2. Отключите real-time сканирование antivirus для папки проекта (или добавьте путь в whitelist).
3. Перезагрузите Windows (очищает устаревшие handle).
4. Если воспроизводится стабильно — запускайте из WSL2.

Логика перемещения в `lib/staged-rules.js` откатывается с `renameSync` на `copyFileSync + unlinkSync` и автоматически обходит большинство помех от антивируса. Если lock-ошибки всё равно лезут, staged-файлы остаются в `claudeos-core/generated/.staged-rules/` для инспекции; перезапустите `init`, чтобы повторить перемещение.

### Cross-volume rename failures (Linux/macOS)

`init` иногда требуется атомарно переименовать файл через mount-точку (например, из `/tmp` в проект на другом диске). Инструмент сам откатывается на copy-then-delete, делать ничего не нужно.

Если видите стабильные сбои перемещения, проверьте, что есть write-доступ к `claudeos-core/generated/.staged-rules/` и `.claude/rules/`.

---

## Проблемы валидации

### «STALE_PATH: file does not exist»

Путь, упомянутый в standards/skills/guides, ведёт в никуда. Причины:

- Pass 3 нагаллюцинировал путь (например, придумал `featureRoutePath.ts` из родительского каталога и имени TypeScript-константы).
- Файл удалили, но docs всё ещё на него ссылаются.
- Файл в gitignore, но в allowlist сканера он попал.

**Фикс:**

```bash
npx claudeos-core init --force
```

Перегенерирует Pass 3 / 4 со свежим allowlist.

Если путь намеренно gitignored и хочется, чтобы сканер его игнорировал, смотрите [advanced-config.md](advanced-config.md) — что реально поддерживает `.claudeos-scan.json` (набор полей небольшой).

Если `--force` не помогает (повторный запуск может ретриггерить ту же галлюцинацию на редких LLM-сидах), отредактируйте офендящий файл вручную и уберите плохой путь. Валидатор уровня **advisory**, CI не блокирует — можно отгрузить и поправить позже.

### «MANIFEST_DRIFT: registered skill not in CLAUDE.md»

Skills, зарегистрированные в `claudeos-core/skills/00.shared/MANIFEST.md`, должны быть где-то упомянуты в CLAUDE.md. У валидатора есть **исключение orchestrator/sub-skill**: sub-skills считаются покрытыми, если упомянут их orchestrator.

**Фикс:** если orchestrator sub-skill действительно не упомянут в CLAUDE.md, запустите `init --force` для регенерации. Если orchestrator упомянут, а валидатор всё равно ругается, это баг валидатора — [откройте issue](https://github.com/claudeos-core/claudeos-core/issues) с путями файлов.

### «Section 8 has wrong number of H4 sub-sections»

`claude-md-validator` требует ровно 2 `####` heading под Section 8 (L4 Memory Files / Memory Workflow).

Вероятные причины:

- Вы вручную правили CLAUDE.md и сломали структуру Section 8.
- Отработал pre-v2.3.0 Pass 4 и дописал Section 9.
- Апгрейдитесь с pre-v2.2.0 версии, где 8-секционный scaffold ещё не был обязательным.

**Фикс:**

```bash
npx claudeos-core init --force
```

Регенерирует CLAUDE.md начисто. Memory-файлы при `--force` сохраняются (перезаписываются только сгенерированные файлы).

### «T1: section heading missing English canonical token»

Каждый `## N.` section heading должен содержать свой английский canonical token (например, `## 1. Role Definition` или `## 1. Определение роли (Role Definition)`). Это нужно, чтобы multi-repo grep работал независимо от `--lang`.

**Фикс:** отредактируйте heading, добавив английский token в скобках, или запустите `init --force` для регенерации (scaffold v2.3.0+ соблюдает эту конвенцию автоматически).

---

## Проблемы memory layer

### «Memory file growing too large»

Запустите компактацию:

```bash
npx claudeos-core memory compact
```

Применяет 4-стадийный алгоритм компактации. Подробности по каждой стадии в [memory-layer.md](memory-layer.md).

### «propose-rules suggests rules I disagree with»

Вывод — черновик для ревью, ничего не авто-применяется. Просто откажитесь от ненужного:

- Отредактируйте `claudeos-core/memory/auto-rule-update.md` напрямую, удалив отвергнутые предложения.
- Или вообще пропустите шаг применения. `.claude/rules/` не меняется, пока вы вручную не скопируете предложенный контент в rule-файлы.

### `memory <subcommand>` говорит «not found»

Memory-файлов нет. Их создаёт Pass 4 в `init`. Если файлы удалили:

```bash
npx claudeos-core init --force
```

Если хотите только пересоздать memory-файлы без перезапуска всего, отдельной команды single-pass-replay в инструменте нет. Путь один — `--force`.

---

## Проблемы CI

### Тесты проходят локально, но падают в CI

Самые вероятные причины:

1. **В CI нет установленного `claude`.** Тесты, зависящие от перевода, выходят через `CLAUDEOS_SKIP_TRANSLATION=1`. Официальный CI workflow эту env-переменную ставит; если ваш форк её не ставит — добавьте.

2. **Path-нормализация (Windows).** Кодовая база много где нормализует Windows backslashes в forward slashes, но тесты могут спотыкаться на тонких различиях. Официальный CI прогоняется на Windows + Linux + macOS, так что большинство проблем ловится — если видите Windows-специфичный сбой, возможно, это реальный баг.

3. **Версия Node.** Тесты запускаются на Node 18 + 20. На Node 16 или 22 могут вылезти несовместимости. Пиньте 18 или 20 для паритета с CI.

### `health` возвращает 0 в CI, а я ждал non-zero

`health` возвращает non-zero только на находках уровня **fail**. **warn** и **advisory** печатаются, но не блокируют.

Если хочется падать на advisory (скажем, для строгости по `STALE_PATH`), встроенного флага нет — придётся греппить вывод и выходить самостоятельно:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Получение помощи

Если ничего из перечисленного не подошло:

1. **Зафиксируйте точное сообщение об ошибке.** Ошибки ClaudeOS-Core содержат пути файлов и идентификаторы, это помогает воспроизвести.
2. **Проверьте issue-tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Возможно, ваш issue уже зарегистрирован.
3. **Откройте новый issue**, указав: ОС, версия Node, версия Claude Code (`claude --version`), стек проекта и вывод ошибки. По возможности приложите `claudeos-core/generated/project-analysis.json` (чувствительные переменные авто-маскируются).

По вопросам безопасности смотрите [SECURITY.md](../../SECURITY.md). Не открывайте публичные issue для уязвимостей.

---

## См. также

- [safety.md](safety.md) — что делает `--force` и что сохраняет
- [verification.md](verification.md) — что значат находки validator
- [advanced-config.md](advanced-config.md) — override-ы `.claudeos-scan.json`
