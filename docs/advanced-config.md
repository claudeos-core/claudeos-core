# Advanced Configuration — `.claudeos-scan.json`

For unusual project layouts, you can override the frontend scanner's behavior via a `.claudeos-scan.json` file at your project root.

This is for advanced users. Most projects don't need it — auto-detection is designed to work without configuration.

---

## What `.claudeos-scan.json` does (and doesn't)

**Does:**
- Extends the frontend scanner's platform/subapp recognition with additional keywords or skip names.
- Adjusts the threshold for what counts as a real subapp.
- Forces subapp emission in single-platform projects.

**Does NOT:**
- Force a specific stack (the scanner's stack detection runs first and is non-configurable).
- Add custom output language defaults.
- Configure ignored paths globally (frontend scanner has its own built-in ignore list).
- Configure backend scanners (Java, Kotlin, Python, etc. don't read this file).
- Mark files as "preserved" (no such mechanism exists).

If you've seen older docs describing fields like `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, or `subapps` — those are not implemented. The actual supported field set is small and lives entirely under `frontendScan`.

---

## File format

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

All four fields are optional. The scanner reads the file via `JSON.parse`; if the file is missing or invalid JSON, scanning silently falls back to defaults.

---

## Field reference (frontend scanner)

### `frontendScan.platformKeywords` — additional platform keywords (string array)

The frontend scanner detects `src/{platform}/{subapp}/` layouts where `{platform}` matches one of these defaults:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Use `platformKeywords` to extend (not replace) this default list:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

After this override, `src/kiosk/checkout/` will be recognized as a platform-subapp pair and emitted as the domain `kiosk-checkout`.

**Note:** the abbreviation `adm` is deliberately excluded from defaults (too ambiguous in isolation). If your project uses `src/adm/` as an admin tier root, either rename to `admin` or add `"adm"` to `platformKeywords`.

### `frontendScan.skipSubappNames` — additional names to skip (string array)

The scanner skips known infrastructure / structural directory names at the subapp level so they aren't emitted as domains:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Use `skipSubappNames` to extend the skip list:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

After this override, directories matching those names will be ignored during subapp scanning.

### `frontendScan.minSubappFiles` — minimum files to qualify as a subapp (number, default 2)

A single-file directory under a platform root is usually an accidental fixture or placeholder, not a real subapp. The default minimum is 2 files. Override if your project structure differs:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Setting this to `1` would emit 1-file subapps (likely noisy in the Pass 1 group plan).

### `frontendScan.forceSubappSplit` — opt out of single-SPA skip (boolean, default false)

The scanner has a **single-SPA skip rule**: when only ONE distinct platform keyword matches across the project (e.g., the project has `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` but no other platforms), subapp emission is skipped to prevent architectural-layer fragmentation.

This default is correct for single-platform SPAs but wrong for projects that intentionally use a lone platform's children as feature domains. To opt out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Use this only when you're confident the children of your single platform root really are independent feature subapps.

---

## Examples

### Add custom platform keywords

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

A project with `src/embedded/dashboard/` will now emit `embedded-dashboard` as a domain.

### Skip vendored or legacy directories

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Directories with these names are ignored during scanning, even if they sit under a platform root.

### Single-platform project that wants subapp emission anyway

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Bypasses the single-SPA skip rule. Combine with a high `minSubappFiles` to filter out noise.

### NX Angular monorepo skipping legacy apps

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

The Angular scanner already handles NX monorepos automatically. The skip list keeps named legacy apps out of the domain list.

---

## What lives in this file vs. what doesn't

If you've found an older doc describing fields not in this list, those fields don't exist. The actual code that reads `.claudeos-scan.json` is in:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

That's the only place. Backend scanners and the orchestrator don't read this file.

If you need a configuration option that doesn't exist, [open an issue](https://github.com/claudeos-core/claudeos-core/issues) describing the project structure and what you'd want the tool to do.

---

## See also

- [stacks.md](stacks.md) — what auto-detection picks up by default
- [troubleshooting.md](troubleshooting.md) — when scanner detection misfires
