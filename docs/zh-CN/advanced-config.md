# Advanced Configuration — `.claudeos-scan.json`

对不寻常的项目布局,你可以在项目根放置一个 `.claudeos-scan.json` 文件,覆盖前端 scanner 的行为。

这是给高级用户的。大多数项目不需要 — 自动检测被设计为无配置即可工作。

> 英文原文: [docs/advanced-config.md](../advanced-config.md)。中文译文与英文同步。

---

## `.claudeos-scan.json` 做什么(以及不做什么)

**做:**
- 用额外的关键词或 skip 名扩展前端 scanner 的 platform/subapp 识别。
- 调整成为真实 subapp 的阈值。
- 在单平台项目中强制 subapp 产出。

**不做:**
- 强制特定栈(scanner 的栈检测先运行,且不可配置)。
- 添加自定义输出语言默认值。
- 全局配置忽略路径(前端 scanner 有自己内建的 ignore 列表)。
- 配置后端 scanner(Java、Kotlin、Python 等不读此文件)。
- 把文件标为"被保留"(没有此机制)。

如果你看到旧文档描述像 `stack`、`ignorePaths`、`preserve`、`defaultPort`、`language` 或 `subapps` 这样的字段 — 它们没有实现。实际支持的字段集很小,完全位于 `frontendScan` 之下。

---

## 文件格式

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

四个字段都可选。scanner 通过 `JSON.parse` 读取文件;如果文件缺失或 JSON 无效,扫描静默退回到默认值。

---

## 字段参考(前端 scanner)

### `frontendScan.platformKeywords` — 额外平台关键词(string array)

前端 scanner 检测 `src/{platform}/{subapp}/` 布局,其中 `{platform}` 匹配以下默认值之一:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

用 `platformKeywords` 来扩展(不是替换)默认列表:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

应用此覆盖后,`src/kiosk/checkout/` 会被识别为 platform-subapp 对,产出为域 `kiosk-checkout`。

**注意:** 缩写 `adm` 被有意从默认中排除(单独时太歧义)。如果你的项目用 `src/adm/` 作为 admin 层根,要么改名为 `admin`,要么把 `"adm"` 加到 `platformKeywords`。

### `frontendScan.skipSubappNames` — 额外要跳过的名字(string array)

scanner 在 subapp 级别跳过已知的基础设施 / 结构性目录名,以免它们被产出为域:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

用 `skipSubappNames` 扩展 skip 列表:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

应用此覆盖后,匹配这些名字的目录在 subapp 扫描时被忽略。

### `frontendScan.minSubappFiles` — 成为 subapp 的最小文件数(number,默认 2)

平台根下的单文件目录通常是偶然的 fixture 或占位符,不是真 subapp。默认最小为 2 个文件。如果你的项目结构不同,可覆盖:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

设为 `1` 会产出 1 文件 subapp(在 Pass 1 group plan 中可能产生噪音)。

### `frontendScan.forceSubappSplit` — opt out of single-SPA skip(boolean,默认 false)

scanner 有一项 **single-SPA skip 规则**:当整个项目中只匹配到一个平台关键词(例如项目有 `src/admin/api/`、`src/admin/dto/`、`src/admin/routers/` 而无其他平台),subapp 产出会被跳过,避免架构层碎片化。

这个默认对单平台 SPA 是对的,但对那些有意把单一平台的子目录用作功能域的项目是错的。要 opt out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

仅在你确信单一平台根的子目录确实是独立功能 subapp 时使用。

---

## 示例

### 添加自定义平台关键词

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

含 `src/embedded/dashboard/` 的项目现在会把 `embedded-dashboard` 产出为域。

### 跳过 vendored 或 legacy 目录

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

带这些名字的目录在扫描时被忽略,即便它们位于平台根下。

### 单平台项目仍想要 subapp 产出

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

绕过 single-SPA skip 规则。配合较高的 `minSubappFiles` 过滤噪音。

### NX Angular monorepo 跳过 legacy app

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner 已自动处理 NX monorepo。skip 列表把命名的 legacy app 排除在域列表之外。

---

## 此文件中有什么、没有什么

如果你找到旧文档描述了不在此列表的字段,那些字段不存在。读 `.claudeos-scan.json` 的实际代码在:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

仅此一处。后端 scanner 与 orchestrator 不读此文件。

如果你需要一个不存在的配置项,[开 issue](https://github.com/claudeos-core/claudeos-core/issues) 描述项目结构与你期望工具做的事。

---

## 另请参阅

- [stacks.md](stacks.md) — 自动检测默认拾取什么
- [troubleshooting.md](troubleshooting.md) — scanner 检测出错时
