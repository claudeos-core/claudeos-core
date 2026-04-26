# Расширенная конфигурация — `.claudeos-scan.json`

Для нестандартных layouts проекта вы можете переопределить поведение frontend-сканера через файл `.claudeos-scan.json` в корне проекта.

Это для продвинутых пользователей. Большинству проектов это не нужно — авто-detection спроектирован работать без конфигурации.

> Английский оригинал: [docs/advanced-config.md](../advanced-config.md). Русский перевод синхронизирован с английским.

---

## Что `.claudeos-scan.json` делает (и не делает)

**Делает:**
- Расширяет распознавание platform/subapp frontend-сканера дополнительными ключевыми словами или skip-именами.
- Регулирует порог того, что считается реальным subapp.
- Принудительно эмитит subapp в single-platform проектах.

**НЕ делает:**
- Не форсирует конкретный стек (stack detection сканера запускается первым и не конфигурируется).
- Не добавляет кастомные default-ы выходного языка.
- Не конфигурирует ignored-пути глобально (у frontend-сканера свой встроенный ignore-список).
- Не конфигурирует backend-сканеры (Java, Kotlin, Python и т.д. этот файл не читают).
- Не помечает файлы как «сохранённые» (такого механизма нет).

Если вы видели старые docs, описывающие поля вроде `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language` или `subapps` — они не реализованы. Реальный поддерживаемый набор полей маленький и весь под `frontendScan`.

---

## Формат файла

```json
{
  "frontendScan": {
    "platformKeywords": ["custom-platform"],
    "skipSubappNames": ["legacy-app"],
    "minSubappFiles": 3,
    "forceSubappSplit": false
  }
}
```

Все четыре поля опциональны. Сканер читает файл через `JSON.parse`; если файл отсутствует или JSON невалидный, сканирование молча откатывается на defaults.

---

## Справочник полей (frontend сканер)

### `frontendScan.platformKeywords` — дополнительные platform-ключевые слова (массив строк)

Frontend-сканер определяет layouts `src/{platform}/{subapp}/`, где `{platform}` совпадает с одним из этих defaults:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Используйте `platformKeywords`, чтобы расширить (не заменить) этот default-список:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

После этого override-а `src/kiosk/checkout/` будет распознан как пара platform-subapp и эмитен как домен `kiosk-checkout`.

**Примечание:** аббревиатура `adm` намеренно исключена из defaults (слишком неоднозначно в изоляции). Если ваш проект использует `src/adm/` как корень admin-tier, либо переименуйте в `admin`, либо добавьте `"adm"` в `platformKeywords`.

### `frontendScan.skipSubappNames` — дополнительные имена для пропуска (массив строк)

Сканер пропускает известные имена инфраструктурных / структурных каталогов на уровне subapp, чтобы они не эмитились как домены:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Используйте `skipSubappNames`, чтобы расширить skip-список:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

После этого override-а каталоги с такими именами будут игнорироваться при subapp-сканировании.

### `frontendScan.minSubappFiles` — минимум файлов, чтобы квалифицироваться как subapp (число, default 2)

Каталог из одного файла под platform-корнем — это обычно случайный fixture или placeholder, а не реальный subapp. Default-минимум — 2 файла. Override-ите, если структура проекта другая:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Установка в `1` эмитила бы 1-файловые subapp-ы (вероятно, шумно в Pass 1 group plan).

### `frontendScan.forceSubappSplit` — opt out из single-SPA skip (boolean, default false)

У сканера есть **single-SPA skip rule**: когда совпадает только ОДНО уникальное platform-ключевое слово по проекту (например, у проекта есть `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`, но нет других платформ), эмиссия subapp пропускается, чтобы избежать фрагментации архитектурных слоёв.

Этот default корректен для single-platform SPA, но неверен для проектов, которые намеренно используют детей одной платформы как feature-домены. Чтобы opt-out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Используйте только когда уверены, что дети вашего единственного platform-корня действительно независимые feature-subapp-ы.

---

## Примеры

### Добавить кастомные platform-ключевые слова

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

Проект с `src/embedded/dashboard/` теперь эмитит `embedded-dashboard` как домен.

### Пропустить vendored или legacy-каталоги

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Каталоги с такими именами игнорируются при сканировании, даже если лежат под platform-корнем.

### Single-platform проект, желающий subapp-эмиссии

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Обходит single-SPA skip rule. Комбинируйте с высоким `minSubappFiles`, чтобы фильтровать шум.

### NX Angular monorepo, пропускающее legacy-приложения

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular-сканер уже обрабатывает NX monorepo автоматически. Skip-список держит названные legacy-приложения вне domain-списка.

---

## Что живёт в этом файле, а что нет

Если вы нашли старый документ, описывающий поля не из этого списка — этих полей не существует. Реальный код, читающий `.claudeos-scan.json`, находится в:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

Это единственное место. Backend-сканеры и orchestrator этот файл не читают.

Если нужна опция конфигурации, которой нет, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues), описав структуру проекта и что бы вы хотели от инструмента.

---

## См. также

- [stacks.md](stacks.md) — что подхватывает авто-detection по умолчанию
- [troubleshooting.md](troubleshooting.md) — когда detection сканера срабатывает не туда
