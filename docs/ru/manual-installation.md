# Ручная установка

Если `npx` использовать не получается (корпоративный firewall, air-gapped окружение, заблокированный CI), вот как поставить и запустить ClaudeOS-Core вручную.

Большинству хватит `npx claudeos-core init`, и эту страницу читать не придётся.

> Английский оригинал: [docs/manual-installation.md](../manual-installation.md). Русский перевод синхронизирован с английским.

---

## Предварительные требования (независимо от способа установки)

- **Node.js 18+** — проверьте через `node --version`. Если старее, обновите через [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) или системный package manager.
- **Claude Code** — установлен и залогинен. Проверьте `claude --version`. Подробности в [официальном гайде Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Git-репозиторий (желательно)** — `init` проверяет наличие `.git/` и хотя бы одного из `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` в корне проекта.

---

## Вариант 1 — Глобальная npm-установка

```bash
npm install -g claudeos-core
```

Проверка:

```bash
claudeos-core --version
```

Затем используйте без `npx`:

```bash
claudeos-core init
```

**Плюсы:** стандартный путь, работает на большинстве setup-ов.
**Минусы:** нужен npm и write-доступ к глобальному `node_modules`.

Чтобы обновиться позже:

```bash
npm install -g claudeos-core@latest
```

Чтобы удалить:

```bash
npm uninstall -g claudeos-core
```

---

## Вариант 2 — Per-project devDependency

Добавьте в `package.json` проекта:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

Установите:

```bash
npm install
```

Используйте через npm-скрипты:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Затем:

```bash
npm run claudeos:init
```

**Плюсы:** pinned-версия per-project, CI-friendly, без глобального загрязнения.
**Минусы:** раздувает `node_modules`, хотя зависимостей минимум (только `glob` и `gray-matter`).

Чтобы удалить из одного проекта:

```bash
npm uninstall claudeos-core
```

---

## Вариант 3 — Clone & link (для контрибьюторов)

Для разработки или если хотите контрибьютить:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Теперь `claudeos-core` глобально доступен в PATH и указывает на склонированный репозиторий.

Чтобы подключить локальный clone к другому проекту:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Плюсы:** правишь исходники инструмента и сразу тестируешь изменения.
**Минусы:** актуально только для контрибьюторов. Link ломается, если перенести склонированный репозиторий.

---

## Вариант 4 — Vendored / air-gapped

Для окружений без интернета:

**На подключённой машине:**

```bash
npm pack claudeos-core
# Производит claudeos-core-2.4.4.tgz
```

**Перенесите `.tgz` в air-gapped окружение.**

**Установите из локального файла:**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

Дополнительно потребуется:
- Node.js 18+ уже установлен в air-gapped окружении.
- Claude Code уже установлен и залогинен.
- npm-пакеты `glob` и `gray-matter` лежат в офлайн npm-кеше (или vendored отдельным `npm pack`).

Чтобы все транзитивные зависимости попали в bundle, можно запустить `npm install --omit=dev` внутри распакованной копии tarball перед переносом.

---

## Проверка установки

После любого метода установки прогоните все четыре prerequisite:

```bash
# Должно напечатать версию (например, 2.4.4)
claudeos-core --version

# Должно напечатать версию Claude Code
claude --version

# Должно напечатать версию Node (нужно 18+)
node --version

# Должен напечатать help-текст
claudeos-core --help
```

Если все четыре отрабатывают, можно запускать `claudeos-core init` в проекте.

---

## Удаление

```bash
# Если установлено глобально
npm uninstall -g claudeos-core

# Если установлено per-project
npm uninstall claudeos-core
```

Чтобы заодно убрать сгенерированный контент из проекта:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core пишет только в `claudeos-core/`, `.claude/rules/` и `CLAUDE.md`. Этих трёх удалений хватит, чтобы полностью вычистить сгенерированный контент.

---

## CI-интеграция

Для GitHub Actions официальный workflow использует `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Этого хватает большинству CI-кейсов: `npx` качает пакет по требованию и кеширует его.

Если CI air-gapped или нужна pinned-версия, берите Вариант 2 (per-project devDependency) плюс:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Для других CI (GitLab, CircleCI, Jenkins и т. д.) шаблон тот же: установить Node, установить Claude Code, залогиниться, запустить `npx claudeos-core <command>`.

**`health` — рекомендуемая CI-проверка**: быстрая (без LLM-вызовов) и покрывает четыре runtime-validator. Для структурной валидации запускайте ещё и `claudeos-core lint`.

---

## Troubleshooting установки

### «Command not found: claudeos-core»

Либо нет глобальной установки, либо PATH не включает npm global bin.

```bash
npm config get prefix
# Проверьте, что bin/-каталог под этим prefix-ом есть в PATH
```

Или используйте `npx`:

```bash
npx claudeos-core <command>
```

### «Cannot find module 'glob'»

Вы запускаете ClaudeOS-Core не из корня проекта. Либо `cd` в корень, либо запускайте через `npx` (работает откуда угодно).

### «Node.js version not supported»

Node 16 или старше. Обновитесь до Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# системный package manager — зависит от ОС
```

### «Claude Code not found»

ClaudeOS-Core опирается на вашу локальную установку Claude Code. Сначала поставьте Claude Code ([официальный гайд](https://docs.anthropic.com/en/docs/claude-code)), затем проверьте через `claude --version`.

Если `claude` установлен, но не в PATH, поправьте PATH: переменной окружения для override нет.

---

## См. также

- [commands.md](commands.md) — что запускать после установки
- [troubleshooting.md](troubleshooting.md) — runtime-ошибки во время `init`
