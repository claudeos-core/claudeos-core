# Ручная установка

Если вы не можете использовать `npx` (корпоративный firewall, air-gapped окружение, заблокированный CI), вот как установить и запустить ClaudeOS-Core вручную.

Большинству пользователей достаточно `npx claudeos-core init` — эту страницу читать не нужно.

> Английский оригинал: [docs/manual-installation.md](../manual-installation.md). Русский перевод синхронизирован с английским.

---

## Предварительные требования (независимо от способа установки)

- **Node.js 18+** — проверьте через `node --version`. Если старее, обновите через [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) или package manager вашей ОС.
- **Claude Code** — установлен и аутентифицирован. Проверьте `claude --version`. См. [официальный гайд установки Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Git-репозиторий (предпочтительно)** — `init` проверяет наличие `.git/` и хотя бы одного из `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` в корне проекта.

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

**Плюсы:** Стандартно, работает на большинстве setup-ов.
**Минусы:** Нужны npm + write-доступ к глобальному `node_modules`.

Чтобы обновить позже:

```bash
npm install -g claudeos-core@latest
```

Чтобы удалить:

```bash
npm uninstall -g claudeos-core
```

---

## Вариант 2 — Per-project devDependency

Добавьте в `package.json` вашего проекта:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
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

**Плюсы:** Pinned версия per-project; CI-friendly; никакого глобального загрязнения.
**Минусы:** Раздувает `node_modules` — хотя зависимостей минимум (только `glob` и `gray-matter`).

Чтобы удалить из одного проекта:

```bash
npm uninstall claudeos-core
```

---

## Вариант 3 — Clone & link (для контрибьюторов)

Для разработки или когда хотите контрибьютить:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Теперь `claudeos-core` глобально на вашем PATH, указывает на склонированный репозиторий.

Чтобы использовать локальный clone в другом проекте:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Плюсы:** Редактируйте исходники инструмента и сразу тестируйте изменения.
**Минусы:** Полезно только контрибьюторам. Link ломается, если переместить склонированный репозиторий.

---

## Вариант 4 — Vendored / air-gapped

Для окружений без интернета:

**На подключённой машине:**

```bash
npm pack claudeos-core
# Производит claudeos-core-2.4.0.tgz
```

**Перенесите `.tgz` в air-gapped окружение.**

**Установите из локального файла:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

Также понадобятся:
- Node.js 18+ уже установлен в air-gapped окружении.
- Claude Code уже установлен и аутентифицирован.
- npm-пакеты `glob` и `gray-matter` пропакованы в офлайн npm-кеше (или vendored через отдельный `npm pack`).

Чтобы все транзитивные зависимости попали в bundle, можно запустить `npm install --omit=dev` внутри распакованной копии tarball-а перед переносом.

---

## Проверка установки

После любого метода установки проверьте все четыре prerequisite:

```bash
# Должно напечатать версию (например, 2.4.0)
claudeos-core --version

# Должно напечатать версию Claude Code
claude --version

# Должно напечатать версию Node (должна быть 18+)
node --version

# Должен напечатать help-текст
claudeos-core --help
```

Если все четыре работают, вы готовы запускать `claudeos-core init` в проекте.

---

## Удаление

```bash
# Если установлено глобально
npm uninstall -g claudeos-core

# Если установлено per-project
npm uninstall claudeos-core
```

Чтобы также удалить сгенерированный контент из проекта:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core пишет только в `claudeos-core/`, `.claude/rules/` и `CLAUDE.md`. Удалить эти три достаточно, чтобы полностью убрать сгенерированный контент из проекта.

---

## CI-интеграция

Для GitHub Actions официальный workflow использует `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Этого достаточно для большинства CI-кейсов — `npx` качает пакет по требованию и кеширует его.

Если ваш CI air-gapped или нужна pinned-версия, используйте Вариант 2 (per-project devDependency) и:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Для других CI-систем (GitLab, CircleCI, Jenkins и т.д.) паттерн тот же: установить Node, установить Claude Code, аутентифицироваться, запустить `npx claudeos-core <command>`.

**`health` — рекомендуемая CI-проверка** — она быстрая (без LLM-вызовов) и покрывает четыре runtime-validator. Для структурной валидации запускайте также `claudeos-core lint`.

---

## Troubleshooting установки

### «Command not found: claudeos-core»

Либо не установлено глобально, либо ваш PATH не включает npm global bin.

```bash
npm config get prefix
# Убедитесь, что bin/-каталог под этим prefix-ом в вашем PATH
```

Или используйте `npx`:

```bash
npx claudeos-core <command>
```

### «Cannot find module 'glob'»

Вы запускаете ClaudeOS-Core из каталога, который не корень проекта. Либо `cd` в проект, либо используйте `npx` (работает откуда угодно).

### «Node.js version not supported»

У вас Node 16 или старше. Обновите до Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# package manager ОС — варьируется
```

### «Claude Code not found»

ClaudeOS-Core использует вашу локальную установку Claude Code. Установите Claude Code сначала ([официальный гайд](https://docs.anthropic.com/en/docs/claude-code)), затем проверьте через `claude --version`.

Если `claude` установлен, но не на PATH, исправьте PATH — переменной окружения override-а нет.

---

## См. также

- [commands.md](commands.md) — что запускать, когда установлено
- [troubleshooting.md](troubleshooting.md) — runtime-ошибки во время `init`
