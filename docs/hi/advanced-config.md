# Advanced Configuration — `.claudeos-scan.json`

असामान्य project layouts के लिए, आप अपने project root पर एक `.claudeos-scan.json` फ़ाइल के माध्यम से frontend scanner के व्यवहार को override कर सकते हैं।

> अंग्रेज़ी मूल: [docs/advanced-config.md](../advanced-config.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

यह advanced users के लिए है। अधिकांश projects को इसकी आवश्यकता नहीं — auto-detection बिना configuration के काम करने के लिए designed है।

---

## `.claudeos-scan.json` क्या करता है (और क्या नहीं)

**करता है:**
- अतिरिक्त keywords या skip names के साथ frontend scanner की platform/subapp recognition को विस्तारित करता है।
- थ्रेशोल्ड को adjust करता है कि वास्तविक subapp के रूप में क्या गिना जाता है।
- single-platform projects में subapp emission को force करता है।

**नहीं करता:**
- एक विशिष्ट stack को force करता है (scanner का stack detection पहले चलता है और non-configurable है)।
- Custom आउटपुट language defaults जोड़ता है।
- Globally ignored paths configure करता है (frontend scanner में अपनी built-in ignore list है)।
- Backend scanners को configure करता है (Java, Kotlin, Python आदि इस फ़ाइल को नहीं पढ़ते)।
- फ़ाइलों को "preserved" के रूप में mark करता है (ऐसा कोई तंत्र मौजूद नहीं है)।

यदि आपने `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, या `subapps` जैसी fields का वर्णन करने वाले पुराने docs देखे हैं — वे implemented नहीं हैं। वास्तविक समर्थित field set छोटा है और पूरी तरह से `frontendScan` के तहत रहता है।

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

सभी चार fields optional हैं। Scanner फ़ाइल को `JSON.parse` के माध्यम से पढ़ता है; यदि फ़ाइल missing है या invalid JSON है, तो scanning चुपचाप defaults पर fallback होती है।

---

## Field reference (frontend scanner)

### `frontendScan.platformKeywords` — अतिरिक्त platform keywords (string array)

Frontend scanner `src/{platform}/{subapp}/` layouts का पता लगाता है जहाँ `{platform}` इन defaults में से एक से मेल खाता है:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

इस default list को विस्तारित करने (replace नहीं) के लिए `platformKeywords` का उपयोग करें:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

इस override के बाद, `src/kiosk/checkout/` को platform-subapp pair के रूप में पहचाना जाएगा और domain `kiosk-checkout` के रूप में emit किया जाएगा।

**ध्यान दें:** abbreviation `adm` को defaults से जानबूझकर बाहर रखा गया है (अकेले बहुत ambiguous)। यदि आपका project `src/adm/` को admin tier root के रूप में उपयोग करता है, तो या तो इसका नाम बदलकर `admin` करें या `platformKeywords` में `"adm"` जोड़ें।

### `frontendScan.skipSubappNames` — skip करने के लिए अतिरिक्त नाम (string array)

Scanner subapp स्तर पर ज्ञात infrastructure / structural directory names को skip करता है ताकि वे domains के रूप में emit न हों:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

skip list को विस्तारित करने के लिए `skipSubappNames` का उपयोग करें:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

इस override के बाद, उन नामों से मेल खाने वाली directories subapp scanning के दौरान ignore की जाएँगी।

### `frontendScan.minSubappFiles` — subapp के रूप में योग्य होने के लिए न्यूनतम फ़ाइलें (number, default 2)

एक platform root के तहत एक single-file directory आम तौर पर एक accidental fixture या placeholder होती है, वास्तविक subapp नहीं। Default न्यूनतम 2 फ़ाइलें हैं। यदि आपकी project संरचना अलग है तो override करें:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

इसे `1` पर सेट करने से 1-file subapps emit होंगे (Pass 1 group plan में संभवतः noisy)।

### `frontendScan.forceSubappSplit` — single-SPA skip से opt out (boolean, default false)

Scanner में एक **single-SPA skip rule** है: जब project में केवल एक platform keyword मेल खाता है (उदाहरण: project में `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` है लेकिन कोई अन्य platforms नहीं), तो architectural-layer fragmentation को रोकने के लिए subapp emission छोड़ दिया जाता है।

यह default single-platform SPAs के लिए सही है लेकिन उन projects के लिए गलत है जो जानबूझकर एक अकेले platform के children को feature domains के रूप में उपयोग करते हैं। opt out करने के लिए:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

इसका उपयोग केवल तब करें जब आप confident हों कि आपके single platform root के children वास्तव में स्वतंत्र feature subapps हैं।

---

## उदाहरण

### Custom platform keywords जोड़ें

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

`src/embedded/dashboard/` वाला एक project अब `embedded-dashboard` को domain के रूप में emit करेगा।

### Vendored या legacy directories skip करें

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

इन नामों वाली directories scanning के दौरान ignore की जाती हैं, भले ही वे एक platform root के तहत बैठें।

### Single-platform project जो वैसे भी subapp emission चाहता है

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

single-SPA skip rule को bypass करता है। noise को filter करने के लिए उच्च `minSubappFiles` के साथ combine करें।

### Legacy apps skip करने वाला NX Angular monorepo

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner पहले से ही NX monorepos को स्वचालित रूप से संभालता है। skip list named legacy apps को domain list से बाहर रखती है।

---

## इस फ़ाइल में क्या रहता है vs क्या नहीं

यदि आपने इस सूची में नहीं होने वाली fields का वर्णन करने वाला पुराना doc पाया है, वे fields मौजूद नहीं हैं। `.claudeos-scan.json` को पढ़ने वाला वास्तविक code यहाँ है:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

यह एकमात्र जगह है। Backend scanners और orchestrator इस फ़ाइल को नहीं पढ़ते।

यदि आपको एक configuration option चाहिए जो मौजूद नहीं है, तो project संरचना और टूल को क्या करना चाहते हैं इसका वर्णन करते हुए [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues)।

---

## यह भी देखें

- [stacks.md](stacks.md) — auto-detection default रूप से क्या उठाता है
- [troubleshooting.md](troubleshooting.md) — जब scanner detection गलत होती है
