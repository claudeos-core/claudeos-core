# Расширенная конфигурация — `.claudeos-scan.json`

На нестандартных layouts проекта поведение frontend-сканера можно переопределить через файл `.claudeos-scan.json` в корне проекта.

Это для продвинутых пользователей. Большинству проектов он не нужен: авто-detection задумывался работать без конфигурации.

> Английский оригинал: [docs/advanced-config.md](../advanced-config.md). Русский перевод синхронизирован с английским.

---

## Что `.claudeos-scan.json` делает (и не делает)

**Делает:**
- Расширяет распознавание platform/subapp у frontend-сканера дополнительными ключевыми словами или skip-именами.
- Регулирует порог того, что считается реальным subapp.
- Принудительно эмитит subapp в single-platform проектах.

**НЕ делает:**
- Не форсирует конкретный стек (stack detection сканера запускается первым и не конфигурируется).
- Не задаёт кастомные default-ы выходного языка.
- Не настраивает ignored-пути глобально (у frontend-сканера свой встроенный ignore-список).
- Не настраивает backend-сканеры (Java, Kotlin, Python и т. д. этот файл не читают).
- Не помечает файлы как «сохранённые» (такого механизма нет).

Если в старых docs встречаются поля вроде `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language` или `subapps`, они не реализованы. Реальный поддерживаемый набор полей маленький и целиком сидит под `frontendScan`.

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

Все четыре поля опциональны. Сканер читает файл через `JSON.parse`; если файла нет или JSON невалиден, сканирование молча откатывается на defaults.

---

## Справочник полей (frontend сканер)

### `frontendScan.platformKeywords` — дополнительные platform-ключевые слова (массив строк)

Frontend-сканер ловит layouts `src/{platform}/{subapp}/`, где `{platform}` совпадает с одним из этих defaults:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Через `platformKeywords` можно расширить (не заменить) этот default-список:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

С таким override `src/kiosk/checkout/` распознается как пара platform-subapp и эмитится доменом `kiosk-checkout`.

**Примечание:** аббревиатура `adm` намеренно исключена из defaults (в изоляции слишком неоднозначна). Если в проекте `src/adm/` — корень admin-tier, либо переименуйте в `admin`, либо добавьте `"adm"` в `platformKeywords`.

### `frontendScan.skipSubappNames` — дополнительные имена для пропуска (массив строк)

Сканер пропускает известные имена инфраструктурных и структурных каталогов на уровне subapp, чтобы они не эмитились доменами:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Расширить skip-список можно через `skipSubappNames`:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

С таким override каталоги с этими именами будут игнорироваться при subapp-сканировании.

### `frontendScan.minSubappFiles` — минимум файлов для квалификации как subapp (число, default 2)

Каталог с единственным файлом под platform-корнем — обычно случайный fixture или placeholder, а не реальный subapp. Default-минимум — 2 файла. Если структура проекта другая, переопределите:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Поставив `1`, получите эмиссию однофайловых subapp-ов (скорее всего, лишний шум в Pass 1 group plan).

### `frontendScan.forceSubappSplit` — opt out из single-SPA skip (boolean, default false)

У сканера есть **single-SPA skip rule**: когда по проекту совпадает только ОДНО уникальное platform-ключевое слово (скажем, у проекта есть `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`, но других платформ нет), эмиссия subapp пропускается, чтобы не фрагментировать архитектурные слои.

Этот default корректен для single-platform SPA, но не подходит проектам, которые намеренно используют детей одной платформы как feature-домены. Чтобы opt-out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Включайте, только если уверены, что дети единственного platform-корня действительно независимые feature-subapp.

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

Проект с `src/embedded/dashboard/` теперь эмитит домен `embedded-dashboard`.

### Пропустить vendored или legacy-каталоги

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Каталоги с такими именами игнорируются при сканировании, даже если лежат под platform-корнем.

### Single-platform проект, которому нужна subapp-эмиссия

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Обходит single-SPA skip rule. Комбинируйте с высоким `minSubappFiles`, чтобы отфильтровать шум.

### NX Angular monorepo с пропуском legacy-приложений

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular-сканер уже сам обрабатывает NX monorepo. Skip-список держит названные legacy-приложения вне domain-списка.

---

## Что живёт в этом файле, а что нет

Если попался старый документ с полями вне этого списка, таких полей нет. Реальный код, читающий `.claudeos-scan.json`, лежит в:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

И только там. Backend-сканеры и orchestrator этот файл не читают.

Если не хватает какой-то опции конфигурации, [откройте issue](https://github.com/claudeos-core/claudeos-core/issues): опишите структуру проекта и желаемое поведение инструмента.

---

## См. также

- [stacks.md](stacks.md) — что подхватывает авто-detection по умолчанию
- [troubleshooting.md](troubleshooting.md) — когда detection сканера попадает не туда
