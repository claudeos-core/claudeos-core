# Advanced Configuration — `.claudeos-scan.json`

Unusual project layouts के लिए frontend scanner का behavior project root पर `.claudeos-scan.json` file से override कर सकते हो.

> अंग्रेज़ी मूल: [docs/advanced-config.md](../advanced-config.md). हिन्दी अनुवाद अंग्रेज़ी के साथ sync में रखा गया है.

यह advanced users के लिए है. ज़्यादातर projects को ज़रूरत नहीं. Auto-detection बिना configuration के चलने के लिए ही बनी है.

---

## `.claudeos-scan.json` क्या करता है (और क्या नहीं)

**करता है:**
- Extra keywords या skip names से frontend scanner की platform/subapp recognition expand करता है.
- "Real subapp के रूप में क्या count हो" वाले thresholds adjust करता है.
- Single-platform projects में subapp emission force करता है.

**नहीं करता:**
- Specific stack force नहीं करता (scanner का stack detection पहले चलता है, non-configurable है).
- Custom output language defaults add नहीं करता.
- Globally ignored paths configure नहीं करता (frontend scanner की अपनी built-in ignore list है).
- Backend scanners configure नहीं करता (Java, Kotlin, Python वगैरह इस file को नहीं पढ़ते).
- Files को "preserved" mark नहीं करता (ऐसा कोई mechanism है ही नहीं).

`stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, या `subapps` जैसी fields describe करने वाले पुराने docs देखे हों, तो वो implement नहीं हैं. Actual supported field set छोटा है और पूरा `frontendScan` के अंदर रहता है.

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

चारों fields optional हैं. Scanner file को `JSON.parse` से पढ़ता है. File missing हो या invalid JSON हो, तो scanning silently defaults पर fallback कर देती है.

---

## Field reference (frontend scanner)

### `frontendScan.platformKeywords` — Extra platform keywords (string array)

Frontend scanner `src/{platform}/{subapp}/` layouts detect करता है, जहाँ `{platform}` इन defaults में से एक match करे:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

इस default list को expand (replace नहीं) करने के लिए `platformKeywords` use करो:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

इस override के बाद `src/kiosk/checkout/` platform-subapp pair के रूप में recognize होगा और domain `kiosk-checkout` के रूप में emit होगा.

**Note:** Abbreviation `adm` defaults से जानबूझकर बाहर रखा है (अकेले बहुत ambiguous है). Project `src/adm/` को admin tier root के रूप में use करता हो, तो या तो rename करके `admin` कर दो, या `platformKeywords` में `"adm"` add कर दो.

### `frontendScan.skipSubappNames` — Skip करने के लिए extra names (string array)

Scanner subapp level पर known infrastructure / structural directory names skip करता है, ताकि वो domains के रूप में emit न हों:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Skip list expand करने के लिए `skipSubappNames` use करो:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

इस override के बाद उन names से match होने वाली directories subapp scanning के दौरान ignore हो जाएँगी.

### `frontendScan.minSubappFiles` — Subapp qualify करने के लिए minimum files (number, default 2)

Platform root के अंदर single-file directory आमतौर पर accidental fixture या placeholder होती है, real subapp नहीं. Default minimum 2 files है. Project structure अलग हो तो override कर दो:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

इसे `1` set करने से 1-file subapps emit होंगे (Pass 1 group plan में noisy हो सकता है).

### `frontendScan.forceSubappSplit` — Single-SPA skip से opt out (boolean, default false)

Scanner में एक **single-SPA skip rule** है: project में सिर्फ एक platform keyword match हो (जैसे project में `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` हैं पर कोई अन्य platforms नहीं), तो architectural-layer fragmentation रोकने के लिए subapp emission skip हो जाती है.

यह default single-platform SPAs के लिए सही है लेकिन उन projects के लिए ग़लत जो जानबूझकर single platform के children को feature domains की तरह use करते हैं. Opt out करना हो तो:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

यह तब use करो जब confident हो कि single platform root के children actually independent feature subapps हैं.

---

## Examples

### Custom platform keywords add करो

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

`src/embedded/dashboard/` वाला project अब `embedded-dashboard` को domain के रूप में emit करेगा.

### Vendored या legacy directories skip करो

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

इन names वाली directories scanning के दौरान ignore हो जाती हैं, चाहे वो किसी platform root के अंदर हों.

### Single-platform project जो subapp emission फिर भी चाहता है

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Single-SPA skip rule bypass करता है. Noise filter करने के लिए higher `minSubappFiles` के साथ combine करो.

### NX Angular monorepo जो legacy apps skip करता है

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner NX monorepos पहले से automatically handle करता है. Skip list named legacy apps को domain list से बाहर रखती है.

---

## इस file में क्या रहता है vs क्या नहीं

इस list में न होने वाली fields describe करने वाला पुराना doc मिला हो, तो वो fields exist ही नहीं करतीं. `.claudeos-scan.json` पढ़ने वाला actual code यहाँ है:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

बस यही एकमात्र जगह है. Backend scanners और orchestrator इस file को नहीं पढ़ते.

कोई configuration option चाहिए जो मौजूद नहीं है, तो project structure और tool से क्या चाहते हो describe करते हुए [issue खोलो](https://github.com/claudeos-core/claudeos-core/issues).

---

## यह भी देखें

- [stacks.md](stacks.md) — auto-detection default में क्या pick करता है
- [troubleshooting.md](troubleshooting.md) — scanner detection ग़लत हो तब
