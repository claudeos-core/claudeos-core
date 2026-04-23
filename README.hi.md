# ClaudeOS-Core

**एकमात्र टूल जो पहले आपका सोर्स कोड पढ़ता है, deterministic एनालिसिस से स्टैक और पैटर्न कन्फर्म करता है, फिर आपके प्रोजेक्ट के लिए सटीक Claude Code रूल्स जेनरेट करता है।**

```bash
npx claudeos-core init
```

ClaudeOS-Core आपका कोडबेस पढ़ता है, हर पैटर्न को एक्सट्रैक्ट करता है, और _आपके_ प्रोजेक्ट के लिए कस्टमाइज़्ड Standards, Rules, Skills और Guides का पूरा सेट जेनरेट करता है। इसके बाद, जब आप Claude Code को "ऑर्डर के लिए CRUD बनाओ" कहते हैं, तो यह आपके मौजूदा पैटर्न से बिल्कुल मेल खाने वाला कोड जेनरेट करता है।

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## ClaudeOS-Core क्यों?

हर दूसरा Claude Code टूल ऐसे काम करता है:

> **इंसान प्रोजेक्ट का वर्णन करता है → LLM डॉक्यूमेंटेशन जेनरेट करता है**

ClaudeOS-Core ऐसे काम करता है:

> **कोड सोर्स का विश्लेषण करता है → कोड कस्टम प्रॉम्प्ट बनाता है → LLM डॉक्यूमेंटेशन जेनरेट करता है → कोड आउटपुट को वेरिफाई करता है**

यह छोटा अंतर नहीं है। यह क्यों मायने रखता है:

### मूल समस्या: LLM अनुमान लगाता है। कोड नहीं।

जब आप Claude से "इस प्रोजेक्ट का विश्लेषण करो" कहते हैं, तो यह आपके स्टैक, ORM, डोमेन स्ट्रक्चर का **अनुमान** लगाता है।
यह आपके `build.gradle` में `spring-boot` देख सकता है, लेकिन इस बात से चूक सकता है कि आप MyBatis (JPA नहीं) इस्तेमाल करते हैं।
यह `user/` डायरेक्टरी देख सकता है लेकिन नहीं समझ पाता कि आपका प्रोजेक्ट layer-first पैकेजिंग (Pattern A) इस्तेमाल करता है, domain-first (Pattern B) नहीं।

**ClaudeOS-Core अनुमान नहीं लगाता।** Claude के आपके प्रोजेक्ट को देखने से पहले, Node.js कोड ने पहले ही:

- `build.gradle` / `package.json` / `pyproject.toml` को पार्स किया और आपके स्टैक, ORM, DB, और पैकेज मैनेजर को **कन्फर्म** किया
- आपके डायरेक्टरी स्ट्रक्चर को स्कैन किया और फ़ाइल काउंट के साथ आपकी डोमेन सूची को **कन्फर्म** किया
- आपके प्रोजेक्ट स्ट्रक्चर को 5 Java पैटर्न, Kotlin CQRS/BFF, या Next.js App Router/FSD में से एक में **वर्गीकृत** किया
- डोमेन को Claude के कॉन्टेक्स्ट विंडो में फिट होने वाले इष्टतम आकार के समूहों में विभाजित किया
- सभी कन्फर्म किए गए तथ्यों के साथ एक स्टैक-विशिष्ट प्रॉम्प्ट को असेंबल किया

जब तक Claude प्रॉम्प्ट प्राप्त करता है, अनुमान लगाने के लिए कुछ नहीं बचा होता। स्टैक कन्फर्म। डोमेन कन्फर्म। स्ट्रक्चर पैटर्न कन्फर्म। Claude का एकमात्र काम इन **कन्फर्म किए गए तथ्यों** से मेल खाने वाला डॉक्यूमेंटेशन जेनरेट करना है।

### परिणाम

अन्य टूल "सामान्य रूप से अच्छा" डॉक्यूमेंटेशन बनाते हैं।
ClaudeOS-Core ऐसा डॉक्यूमेंटेशन बनाता है जो जानता है कि आपका प्रोजेक्ट `ApiResponse.ok()` इस्तेमाल करता है (`ResponseEntity.success()` नहीं), कि आपके MyBatis XML मैपर `src/main/resources/mybatis/mappers/` में रहते हैं, और कि आपका पैकेज स्ट्रक्चर `com.company.module.{domain}.controller` है — क्योंकि इसने आपका वास्तविक कोड पढ़ा है।

### Before & After

**ClaudeOS-Core के बिना** — आप Claude Code से Order CRUD बनाने के लिए कहते हैं:
```
❌ JPA-style repository इस्तेमाल करता है (आपका प्रोजेक्ट MyBatis इस्तेमाल करता है)
❌ ResponseEntity.success() बनाता है (आपका wrapper ApiResponse.ok() है)
❌ order/controller/ में फ़ाइलें रखता है (आपका प्रोजेक्ट controller/order/ इस्तेमाल करता है)
❌ अंग्रेज़ी कमेंट्स जेनरेट करता है (आपकी टीम हिन्दी कमेंट्स लिखती है)
→ आप जेनरेट की गई हर फ़ाइल को ठीक करने में 20 मिनट खर्च करते हैं
```

**ClaudeOS-Core के साथ** — `.claude/rules/` में पहले से ही आपके कन्फर्म पैटर्न हैं:
```
✅ MyBatis mapper + XML जेनरेट करता है (build.gradle से डिटेक्ट)
✅ ApiResponse.ok() इस्तेमाल करता है (आपके वास्तविक सोर्स से एक्सट्रैक्ट)
✅ controller/order/ में फ़ाइलें रखता है (Pattern A स्ट्रक्चर स्कैन से कन्फर्म)
✅ हिन्दी कमेंट्स (--lang hi लागू)
→ जेनरेट किया गया कोड तुरंत आपके प्रोजेक्ट कन्वेंशन से मेल खाता है
```

यह अंतर संचयी है। प्रतिदिन 10 कार्य × 20 मिनट बचत = **प्रतिदिन 3+ घंटे**।

---

## जेनरेशन के बाद गुणवत्ता सुनिश्चिति (v2.3.0)

जेनरेशन समस्या का सिर्फ आधा हिस्सा है। दूसरा आधा है **यह जानना कि आउटपुट सही है** — 10 आउटपुट भाषाओं में, 11 स्टैक टेम्प्लेट्स में, किसी भी आकार के प्रोजेक्ट्स में। v2.3.0 दो deterministic validators जोड़ता है जो जेनरेशन के बाद चलते हैं और LLM के स्वयं-जांच पर निर्भर नहीं करते।

### `claude-md-validator` — स्ट्रक्चरल इनवेरिएंट्स

हर जेनरेट किया गया `CLAUDE.md` 25 स्ट्रक्चरल इनवेरिएंट्स के खिलाफ चेक किया जाता है, जो केवल भाषा-निरपेक्ष सिग्नल्स का उपयोग करते हैं: markdown syntax (`^## `, `^### `), कभी अनुवादित नहीं होने वाले literal फ़ाइल नाम (`decision-log.md`, `failure-patterns.md`), section count, प्रत्येक section के sub-section count, और table-row count। यही validator, byte-by-byte, अंग्रेज़ी, कोरियाई, जापानी, वियतनामी, हिंदी, रूसी, स्पेनिश, चीनी, फ्रेंच, या जर्मन में जेनरेट किए गए `CLAUDE.md` पर समान निर्णय देता है।

Cross-language गारंटी को सभी 10 भाषाओं में test fixtures द्वारा सत्यापित किया जाता है, जिसमें उन भाषाओं में से 6 में bad-case fixtures शामिल हैं जो समान error signatures उत्पन्न करती हैं। जब एक वियतनामी प्रोजेक्ट पर invariant विफल होता है, तो fix वही है जो जर्मन प्रोजेक्ट पर विफल होने पर होता है।

### `content-validator [10/10]` — path-claim सत्यापन और MANIFEST स्थिरता

सभी जेनरेट की गई `.md` फ़ाइलों से हर backticked path reference (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) पढ़ता है और उन्हें वास्तविक file system के खिलाफ सत्यापित करता है। दो क्लास की LLM failures पकड़ता है जो पहले कोई tool detect नहीं करता था:

- **`STALE_PATH`** — जब Pass 3 या Pass 4 एक plausible-but-nonexistent path गढ़ देता है। तीन प्रमुख वर्ग: (1) **पहचानकर्ता से फ़ाइलनाम पुनर्सामान्यीकरण** — ALL_CAPS TypeScript constant या Java annotation से फ़ाइलनाम infer करना जबकि वास्तविक फ़ाइल एक अलग नामकरण परंपरा का पालन करती है; (2) **फ़्रेमवर्क-परंपरागत प्रवेश बिंदु कल्पना** — एक अलग लेआउट चुनने वाले प्रोजेक्ट में मानक प्रवेश फ़ाइल (Vite का main मॉड्यूल, Next.js app-router providers, आदि) की मौजूदगी मान लेना; (3) **सुनने में सही लगने वाली उपयोगिता कल्पना** — दिखाई देने वाली directory के अंतर्गत "स्वाभाविक रूप से मौजूद होने वाले" helper के लिए एक विशिष्ट फ़ाइलनाम का उल्लेख करना।
- **`MANIFEST_DRIFT`** — जब `claudeos-core/skills/00.shared/MANIFEST.md` एक skill रजिस्टर करता है जिसका `CLAUDE.md §6` में उल्लेख नहीं है (या इसके विपरीत)। सामान्य orchestrator + sub-skills layout को पहचानता है, जहाँ `CLAUDE.md §6` एक entry point है और `MANIFEST.md` पूर्ण registry है — sub-skills को उनके parent orchestrator के माध्यम से cover माना जाता है।

Validator को `pass3-footer.md` और `pass4.md` में prompt-time prevention के साथ जोड़ा गया है: विशिष्ट hallucination classes (parent-directory prefix, Vite/MSW/Vitest/Jest/RTL library conventions) को document करने वाले anti-pattern blocks, और स्पष्ट positive guidance कि जब `pass3a-facts.md` में एक concrete filename नहीं है, तो rule को directory-scope से scope करें।

### किसी भी प्रोजेक्ट पर validation चलाएँ

```bash
npx claudeos-core health     # सभी validators — एक single go/no-go verdict
npx claudeos-core lint       # केवल CLAUDE.md structural invariants (किसी भी भाषा में)
```

---

## सपोर्टेड स्टैक्स

| स्टैक | डिटेक्शन | विश्लेषण गहराई |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 पैकेज पैटर्न | 10 कैटेगरी, 59 सब-आइटम |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 कैटेगरी, 95 सब-आइटम |
| **Node.js / Express** | `package.json` | 9 कैटेगरी, 57 सब-आइटम |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 कैटेगरी, 68 सब-आइटम |
| **Next.js / React** | `package.json`, `next.config.*`, FSD सपोर्ट | 9 कैटेगरी, 55 सब-आइटम |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 कैटेगरी, 58 सब-आइटम |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 कैटेगरी, 55 सब-आइटम |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 कैटेगरी, 58 सब-आइटम |
| **Node.js / Fastify** | `package.json` | 10 कैटेगरी, 62 सब-आइटम |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 कैटेगरी, 55 सब-आइटम |
| **Angular** | `package.json`, `angular.json` | 12 कैटेगरी, 78 सब-आइटम |

ऑटो-डिटेक्ट: भाषा और वर्शन, फ्रेमवर्क और वर्शन (Vite को SPA फ्रेमवर्क के रूप में शामिल), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, आदि), डेटाबेस (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), पैकेज मैनेजर (Gradle, Maven, npm, yarn, pnpm, pip, poetry), आर्किटेक्चर (CQRS, BFF — मॉड्यूल नामों से पता लगाया), मल्टी-मॉड्यूल संरचना (settings.gradle से पता लगाया), मोनोरेपो (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **`.env.example` runtime कॉन्फ़िगरेशन** (v2.2.0 — Vite · Next.js · Nuxt · Angular · Node · Python framework के 16+ convention variable नामों से port/host/API-target निकाला जाता है)।

**आपको कुछ भी स्पेसिफाई करने की ज़रूरत नहीं। सब कुछ ऑटोमैटिकली डिटेक्ट होता है।**

### `.env`-driven runtime कॉन्फ़िगरेशन (v2.2.0)

v2.2.0 में `lib/env-parser.js` जोड़ा गया है ताकि जेनरेटेड `CLAUDE.md` framework defaults के बजाय वह दर्शाए जो project वास्तव में declare करता है।

- **Search क्रम**: `.env.example` (canonical, committed) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`। `.example` variant जीतता है क्योंकि यह developer-neutral shape-of-truth है, किसी एक contributor का local override नहीं।
- **पहचाने जाने वाले port variable conventions**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / generic `PORT`। जब दोनों मौजूद हों, तो framework-specific नाम generic `PORT` पर जीतते हैं।
- **Host और API target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` आदि।
- **Precedence**: Spring Boot `application.yml` `server.port` अभी भी जीतता है (framework-native config), फिर `.env`-declared port, फिर last resort के रूप में framework default (Vite 5173, Next.js 3000, Django 8000, आदि)।
- **Sensitive-variable redaction**: `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` patterns से match होने वाले variables के values किसी भी downstream generator तक पहुंचने से पहले `***REDACTED***` से replace कर दिए जाते हैं। `.env.example` में accidentally committed secrets के खिलाफ defense-in-depth। `DATABASE_URL` stack-detector DB-identification back-compat के लिए explicitly whitelisted है।

### Java डोमेन डिटेक्शन (5 पैटर्न, फॉलबैक के साथ)

| प्राथमिकता | पैटर्न | संरचना | उदाहरण |
|---|---|---|---|
| A | लेयर-फर्स्ट | `controller/{domain}/` | `controller/user/UserController.java` |
| B | डोमेन-फर्स्ट | `{domain}/controller/` | `user/controller/UserController.java` |
| D | मॉड्यूल प्रीफ़िक्स | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/हेक्सागोनल | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | फ्लैट | `controller/*.java` | `controller/UserController.java` → क्लास नाम से `user` एक्सट्रैक्ट |

बिना Controller वाले सर्विस-ओनली डोमेन भी `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` डायरेक्टरी के ज़रिए डिटेक्ट होते हैं। स्किप: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` आदि।

### Kotlin मल्टी-मॉड्यूल डोमेन डिटेक्शन

Gradle मल्टी-मॉड्यूल संरचना वाले Kotlin प्रोजेक्ट्स (जैसे: CQRS मोनोरेपो) के लिए:

| स्टेप | क्या करता है | उदाहरण |
|---|---|---|
| 1 | `settings.gradle.kts` में `include()` स्कैन | 14 मॉड्यूल मिले |
| 2 | नाम से मॉड्यूल प्रकार डिटेक्ट | `reservation-command-server` → type: `command` |
| 3 | मॉड्यूल नाम से डोमेन एक्सट्रैक्ट | `reservation-command-server` → domain: `reservation` |
| 4 | समान डोमेन को मॉड्यूल्स में समूह | `reservation-command-server` + `common-query-server` → 1 डोमेन |
| 5 | आर्किटेक्चर डिटेक्ट | `command` + `query` मॉड्यूल्स हैं → CQRS |

सपोर्टेड मॉड्यूल प्रकार: `command`, `query`, `bff`, `integration`, `standalone`, `library`। साझा लाइब्रेरीज़ (`shared-lib`, `integration-lib`) विशेष डोमेन के रूप में डिटेक्ट होती हैं।

### फ्रंटएंड डोमेन डिटेक्शन

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split**: `client.tsx` पैटर्न डिटेक्ट करता है, Server/Client कॉम्पोनेंट अलगाव ट्रैक करता है
- **ग़ैर-मानक नेस्टेड पाथ**: `src/*/` पाथ के नीचे pages, components, और FSD layers डिटेक्ट करता है (जैसे: `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Platform/tier-split डिटेक्शन (v2.0.0)**: `src/{platform}/{subapp}/` लेआउट पहचानता है — `{platform}` एक device/target कीवर्ड (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) या access-tier कीवर्ड (`admin`, `cms`, `backoffice`, `back-office`, `portal`) हो सकता है। हर `(platform, subapp)` जोड़ी के लिए एक डोमेन `{platform}-{subapp}` नाम के साथ उत्पन्न करता है, जिसमें routes/components/layouts/hooks के लिए प्रति-डोमेन काउंट होते हैं। Angular, Next.js, React, और Vue पर एक साथ चलता है (multi-extension glob `{tsx,jsx,ts,js,vue}`)। नॉइज़ी 1-file डोमेन से बचने के लिए प्रति subapp ≥2 सोर्स फ़ाइलें ज़रूरी।
- **मोनोरेपो प्लेटफ़ॉर्म split (v2.0.0)**: प्लेटफ़ॉर्म स्कैन `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace with `src/`) और `{apps,packages}/{platform}/{subapp}/` (`src/` wrapper के बिना workspaces) से भी मैच करता है।
- **Fallback E — routes-file (v2.0.0)**: जब primary scanners + Fallback A–D सभी 0 लौटाते हैं, `**/routes/*.{tsx,jsx,ts,js,vue}` को glob करता है और `routes` की parent डायरेक्टरी नाम से समूह बनाता है। React Router file-routing प्रोजेक्ट्स (CRA/Vite + `react-router`) को पकड़ता है जो Next.js `page.tsx` या FSD लेआउट से मेल नहीं खाते। जेनरिक parent नाम (`src`, `app`, `pages`) फ़िल्टर किए जाते हैं।
- **Config fallback**: `package.json` में न होने पर भी `next.config.*`, `vite.config.*` आदि से Next.js/Vite/Nuxt डिटेक्ट करता है (मोनोरेपो सपोर्ट)
- **Deep directory fallback**: React/CRA/Vite/Vue/RN प्रोजेक्ट्स के लिए `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` को किसी भी गहराई पर स्कैन करता है
- **साझा ignore लिस्ट (v2.0.0)**: सभी scanners `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) और `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`) साझा करते हैं ताकि build outputs और test fixtures प्रति-डोमेन फ़ाइल काउंट को न बढ़ाएँ।

### Scanner Overrides (v2.0.0)

टूलकिट को संपादित किए बिना scanner defaults को विस्तारित करने के लिए अपने प्रोजेक्ट रूट पर एक वैकल्पिक `.claudeos-scan.json` डालें। सभी फ़ील्ड **additive** हैं — user entries defaults का विस्तार करते हैं, बदलते नहीं:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| फ़ील्ड | डिफ़ॉल्ट | उद्देश्य |
|---|---|---|
| `platformKeywords` | ऊपर की built-in लिस्ट | प्लेटफ़ॉर्म स्कैन के लिए अतिरिक्त `{platform}` कीवर्ड (जैसे: `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | केवल संरचनात्मक dirs | प्लेटफ़ॉर्म-स्कैन डोमेन उत्सर्जन से बाहर करने के लिए अतिरिक्त subapp नाम |
| `minSubappFiles` | `2` | subapp के डोमेन बनने से पहले आवश्यक न्यूनतम फ़ाइल काउंट को override करें |

फ़ाइल गायब या malformed JSON → चुपचाप defaults पर fallback (कोई crash नहीं)। सामान्य उपयोग: एक छोटा संक्षिप्त नाम (`adm`, `bo`) opt-in करें जिसे built-in लिस्ट बहुत अस्पष्ट होने के कारण बाहर रखती है, या नॉइज़ी मोनोरेपो के लिए `minSubappFiles` बढ़ाएँ।

---

## क्विक स्टार्ट

### पूर्व-आवश्यकताएँ

- **Node.js** v18+
- **Claude Code CLI** (इंस्टॉल और ऑथेंटिकेटेड)

### इंस्टॉलेशन

```bash
cd /your/project/root

# विकल्प A: npx (अनुशंसित — इंस्टॉल की ज़रूरत नहीं)
npx claudeos-core init

# विकल्प B: ग्लोबल इंस्टॉल
npm install -g claudeos-core
claudeos-core init

# विकल्प C: प्रोजेक्ट devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# विकल्प D: git clone (विकास/योगदान के लिए)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# क्रॉस-प्लेटफ़ॉर्म (PowerShell, CMD, Bash, Zsh — कोई भी terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (केवल Bash)
bash claudeos-core-tools/bootstrap.sh
```

### आउटपुट भाषा (10 भाषाएँ)

जब आप `init` को `--lang` के बिना चलाते हैं, तो एक इंटरैक्टिव सिलेक्टर दिखाई देता है — arrow keys या number keys का उपयोग करें:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  जेनरेट की गई फ़ाइलें (CLAUDE.md, Standards, Rules,
  Skills, Guides) हिन्दी में लिखी जाएँगी।

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
  ❯  7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

नेविगेट करते समय विवरण चुनी गई भाषा में बदल जाता है। सिलेक्टर को छोड़ने के लिए, सीधे `--lang` पास करें:

```bash
npx claudeos-core init --lang ko    # Korean
npx claudeos-core init --lang ja    # Japanese
npx claudeos-core init --lang en    # English (डिफ़ॉल्ट)
```

> **नोट:** यह केवल जेनरेट की गई डॉक्यूमेंटेशन फ़ाइलों की भाषा सेट करता है। कोड विश्लेषण (Pass 1–2) हमेशा अंग्रेज़ी में चलता है; जेनरेट किया गया आउटपुट (Pass 3) आपकी चुनी हुई भाषा में लिखा जाता है। जेनरेट की गई फ़ाइलों के भीतर कोड उदाहरण अपनी मूल प्रोग्रामिंग भाषा सिंटैक्स में रहते हैं।

बस इतना ही। 10 मिनट (छोटा प्रोजेक्ट) से लेकर 2 घंटे (60+ डोमेन मोनोरेपो) तक, सभी डॉक्यूमेंटेशन जेनरेट हो जाते हैं और उपयोग के लिए तैयार हैं। CLI हर pass के लिए percentage, elapsed time, और ETA के साथ एक progress bar दिखाता है। प्रोजेक्ट आकार के अनुसार विस्तृत timing के लिए [प्रोजेक्ट आकार द्वारा ऑटो-स्केलिंग](#प्रोजेक्ट-आकार-द्वारा-ऑटो-स्केलिंग) देखें।

### मैनुअल स्टेप-बाय-स्टेप इंस्टॉलेशन

यदि आप हर चरण पर पूर्ण नियंत्रण चाहते हैं — या यदि automated pipeline किसी चरण पर विफल हो जाता है — तो आप हर चरण को मैन्युअली चला सकते हैं। यह ClaudeOS-Core के आंतरिक कार्य को समझने के लिए भी उपयोगी है।

#### Step 1: Clone करें और डिपेंडेंसी इंस्टॉल करें

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: डायरेक्टरी स्ट्रक्चर बनाएँ

```bash
# Rules (v2.0.0: 60.memory जोड़ा गया)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: memory जोड़ा गया; v2.1.0: plan हटा दिया गया)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **v2.1.0 नोट:** `claudeos-core/plan/` डायरेक्टरी अब नहीं बनाई जाती। Master plan generation हटा दिया गया क्योंकि master plans एक आंतरिक backup थे जिन्हें Claude Code runtime पर कभी नहीं पढ़ता था, और उन्हें aggregate करना `Prompt is too long` विफलताओं को trigger करता था। इसके बजाय backup/restore के लिए `git` का उपयोग करें।

#### Step 3: plan-installer चलाएँ (प्रोजेक्ट विश्लेषण)

यह आपके प्रोजेक्ट को स्कैन करता है, स्टैक डिटेक्ट करता है, डोमेन खोजता है, उन्हें समूहों में विभाजित करता है, और प्रॉम्प्ट जेनरेट करता है।

```bash
node claudeos-core-tools/plan-installer/index.js
```

**आउटपुट (`claudeos-core/generated/` में):**
- `project-analysis.json` — डिटेक्ट किया गया स्टैक, डोमेन, फ्रंटएंड जानकारी
- `domain-groups.json` — Pass 1 के लिए डोमेन समूह
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — विश्लेषण प्रॉम्प्ट
- `pass2-prompt.md` — merge प्रॉम्प्ट
- `pass3-prompt.md` — Pass 3 प्रॉम्प्ट template जिसमें Phase 1 "Read Once, Extract Facts" block (Rules A–E) prepend किया गया है। Automated pipeline runtime पर Pass 3 को कई stages में split करती है; यह template हर stage को feed करती है।
- `pass3-context.json` — Pass 2 के बाद build किया गया slim project summary (< 5 KB) जिसे Pass 3 prompts पूरे `pass2-merged.json` के बजाय preferentially पढ़ते हैं (v2.1.0)
- `pass4-prompt.md` — L4 memory scaffolding प्रॉम्प्ट (v2.0.0; `60.memory/` rule writes के लिए वही `staging-override.md` उपयोग करता है)

आप आगे बढ़ने से पहले डिटेक्शन सटीकता को सत्यापित करने के लिए इन फ़ाइलों की जाँच कर सकते हैं।

#### Step 4: Pass 1 — गहन कोड विश्लेषण (प्रति डोमेन समूह)

हर डोमेन समूह के लिए Pass 1 चलाएँ। समूहों की संख्या के लिए `domain-groups.json` देखें।

```bash
# देखें कि कितने समूह हैं
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# हर समूह के लिए Pass 1 चलाएँ (डोमेन और समूह संख्या बदलें)
# नोट: v1.6.1+ perl के बजाय Node.js String.replace() का उपयोग करता है — perl अब
# आवश्यक नहीं है, और replacement-function semantics डोमेन नामों में दिखाई देने वाले
# $/&/$1 वर्णों से regex injection को रोकते हैं।
#
# समूह 1 के लिए:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# समूह 2 के लिए (यदि मौजूद है):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# फ्रंटएंड समूहों के लिए, pass1-backend-prompt.md → pass1-frontend-prompt.md स्वैप करें
```

**सत्यापित करें:** `ls claudeos-core/generated/pass1-*.json` हर समूह के लिए एक JSON दिखाना चाहिए।

#### Step 5: Pass 2 — विश्लेषण परिणामों को merge करें

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**सत्यापित करें:** `claudeos-core/generated/pass2-merged.json` 9+ top-level keys के साथ मौजूद होना चाहिए।

#### Step 6: Pass 3 — सभी डॉक्यूमेंटेशन जेनरेट करें (कई stages में split)

**v2.1.0 नोट:** Pass 3 को automated pipeline द्वारा **हमेशा split mode में चलाया जाता है**। हर stage एक fresh context window के साथ एक अलग `claude -p` कॉल है, इसलिए प्रोजेक्ट आकार की परवाह किए बिना output-accumulation overflow संरचनात्मक रूप से असंभव है। `pass3-prompt.md` template प्रति-stage एक `STAGE:` directive के साथ assemble किया जाता है जो Claude को बताता है कि किन फ़ाइलों का subset emit करना है। मैनुअल मोड के लिए, सबसे सरल path अभी भी पूरी template को feed करना और Claude को एक ही कॉल में सब कुछ जेनरेट करने देना है — लेकिन यह केवल छोटे प्रोजेक्ट्स (≤5 डोमेन) पर ही विश्वसनीय है। इससे बड़े किसी भी प्रोजेक्ट के लिए `npx claudeos-core init` का उपयोग करें ताकि split runner stage orchestration संभाले।

**Single-call mode (केवल छोटे प्रोजेक्ट्स, ≤5 डोमेन):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Stage-by-stage mode (सभी प्रोजेक्ट आकारों के लिए अनुशंसित):**

Automated pipeline इन stages को चलाती है। Stage सूची है:

| Stage | लिखता है | नोट्स |
|---|---|---|
| `3a` | `pass3a-facts.md` (5–10 KB distilled fact sheet) | `pass2-merged.json` को एक बार पढ़ता है; बाद के stages इस फ़ाइल को reference करते हैं |
| `3b-core` | `CLAUDE.md`, common `standard/`, common `.claude/rules/` | Cross-project फ़ाइलें; कोई domain-specific output नहीं |
| `3b-1..N` | Domain-specific `standard/60.domains/*.md` + domain rules | प्रति stage ≤15 डोमेन का batch (≥16 डोमेन पर auto-divided) |
| `3c-core` | `guide/` (9 फ़ाइलें), `skills/00.shared/MANIFEST.md`, `skills/*/` orchestrators | साझा skills और सभी user-facing guides |
| `3c-1..N` | `skills/20.frontend-page/scaffold-page-feature/` के अंतर्गत domain sub-skills | प्रति stage ≤15 डोमेन का batch |
| `3d-aux` | `database/`, `mcp-guide/` | Fixed-size, domain count से स्वतंत्र |

1–15 डोमेन प्रोजेक्ट के लिए यह 4 stages तक विस्तारित होता है (`3a`, `3b-core`, `3c-core`, `3d-aux` — कोई batch sub-division नहीं)। 16–30 डोमेन के लिए यह 8 stages तक विस्तारित होता है (`3b` और `3c` प्रत्येक 2 batches में sub-divided)। पूरी तालिका के लिए [प्रोजेक्ट आकार द्वारा ऑटो-स्केलिंग](#प्रोजेक्ट-आकार-द्वारा-ऑटो-स्केलिंग) देखें।

**सत्यापित करें:** `CLAUDE.md` आपके प्रोजेक्ट रूट में मौजूद होना चाहिए, और `claudeos-core/generated/pass3-complete.json` marker लिखा जाना चाहिए। Split mode में, marker में `mode: "split"` और एक `groupsCompleted` array होता है जो हर finished stage को list करता है — partial-marker logic इसका उपयोग crash के बाद `3a` से restart करने के बजाय सही stage से resume करने के लिए करती है (जो token cost को दोगुना कर देता)।

> **Staging नोट:** Pass 3 पहले rule फ़ाइलें `claudeos-core/generated/.staged-rules/` में लिखता है क्योंकि Claude Code की sensitive-path policy `.claude/` में सीधे writes को block करती है। Automated pipeline हर stage के बाद move स्वचालित रूप से संभालती है। यदि आप एक stage मैन्युअली चलाते हैं, तो आपको staged tree को स्वयं move करना होगा: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (subpaths को preserve करें)।

#### Step 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**सत्यापित करें:** `claudeos-core/memory/` में 4 फ़ाइलें (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) होनी चाहिए, `.claude/rules/60.memory/` में 4 rule फ़ाइलें होनी चाहिए, और `CLAUDE.md` में एक `## Memory (L4)` section append होना चाहिए। Marker: `claudeos-core/generated/pass4-memory.json`।

> **v2.1.0 gap-fill:** Pass 4 यह भी सुनिश्चित करता है कि `claudeos-core/skills/00.shared/MANIFEST.md` मौजूद है। यदि Pass 3c ने इसे छोड़ दिया (skill-sparse प्रोजेक्ट्स पर संभव क्योंकि stack `pass3.md` templates `MANIFEST.md` को generation targets में list करते हैं बिना REQUIRED मार्क किए), तो gap-fill एक minimal stub बनाता है ताकि `.claude/rules/50.sync/02.skills-sync.md` (v2.2.0 पथ — sync rule की संख्या 3 से घटकर 2 हुई, `03` अब `02` है) के पास हमेशा एक valid reference target हो। Idempotent: यदि फ़ाइल में पहले से real content (>20 chars) है तो skip करता है।

> **नोट:** यदि `claude -p` विफल हो जाता है या `pass4-prompt.md` गायब है, तो automated pipeline `lib/memory-scaffold.js` के माध्यम से static scaffold पर fallback करता है (जब `--lang` गैर-अंग्रेज़ी होता है तो Claude-driven translation के साथ)। Static fallback केवल `npx claudeos-core init` के अंदर चलता है — मैनुअल मोड के लिए Pass 4 का सफल होना ज़रूरी है।

#### Step 8: सत्यापन टूल चलाएँ

```bash
# मेटाडेटा जेनरेट करें (अन्य जाँचों से पहले आवश्यक)
node claudeos-core-tools/manifest-generator/index.js

# सभी जाँच चलाएँ
node claudeos-core-tools/health-checker/index.js

# या व्यक्तिगत जाँच चलाएँ:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk consistency
node claudeos-core-tools/sync-checker/index.js          # अपंजीकृत/orphan फ़ाइलें
node claudeos-core-tools/content-validator/index.js     # फ़ाइल गुणवत्ता जाँच (memory/ section [9/9] सहित)
node claudeos-core-tools/pass-json-validator/index.js   # Pass 1–4 JSON + completion marker जाँच
```

#### Step 9: परिणाम सत्यापित करें

```bash
# जेनरेट की गई फ़ाइलें गिनें
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# CLAUDE.md जाँचें
head -30 CLAUDE.md

# एक standard फ़ाइल जाँचें
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Rules जाँचें
ls .claude/rules/*/
```

> **टिप:** यदि कोई चरण विफल हो जाता है, तो आप समस्या ठीक कर सकते हैं और केवल उस चरण को फिर से चला सकते हैं। Pass 1/2 परिणाम cached हैं — यदि `pass1-N.json` या `pass2-merged.json` पहले से मौजूद है, तो automated pipeline उन्हें skip करता है। पिछले परिणाम हटाने और नए सिरे से शुरू करने के लिए `npx claudeos-core init --force` का उपयोग करें।

### उपयोग शुरू करें

```
# Claude Code में — बस स्वाभाविक रूप से पूछें:
"order डोमेन के लिए एक CRUD बनाओ"
"user authentication API जोड़ो"
"इस कोड को प्रोजेक्ट पैटर्न से मेल खाने के लिए refactor करो"

# Claude Code स्वचालित रूप से आपके जेनरेट किए गए Standards, Rules, और Skills को reference करता है।
```

---

## यह कैसे काम करता है — 4-Pass Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← डिपेंडेंसीज़ (~10s)
    ├── [2] डायरेक्टरी संरचना                  ← फ़ोल्डर बनाएँ (~1s)
    ├── [3] plan-installer (Node.js)           ← प्रोजेक्ट स्कैन (~5s)
    │       ├── स्टैक auto-detect (multi-stack aware)
    │       ├── डोमेन सूची एक्सट्रैक्ट (tagged: backend/frontend)
    │       ├── डोमेन समूहों में विभाजित (प्रति प्रकार)
    │       ├── pass3-context.json build करें (slim summary, v2.1.0)
    │       └── स्टैक-विशिष्ट प्रॉम्प्ट चुनें (प्रति प्रकार)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← गहन कोड विश्लेषण (~2-8min)
    │       ├── ⚙️ Backend समूह → backend-विशिष्ट प्रॉम्प्ट
    │       └── 🎨 Frontend समूह → frontend-विशिष्ट प्रॉम्प्ट
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← विश्लेषण merge (~1min)
    │       └── सभी Pass 1 परिणाम pass2-merged.json में समेकित
    │
    ├── [6] Pass 3 (split mode, v2.1.0)        ← सब कुछ जेनरेट
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Fact extraction (~5-10min)
    │       │       └── pass2-merged.json एक बार पढ़ें → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + common standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← Domain standards/rules (≤15 डोमेन/batch)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + shared skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Domain sub-skills (≤15 डोमेन/batch)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← database/ + mcp-guide/ stubs
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30s-5min)
    │       ├── memory/ seed करें (decision-log, failure-patterns, …)
    │       ├── 60.memory/ rules जेनरेट करें
    │       ├── CLAUDE.md में "Memory (L4)" section append करें
    │       └── Gap-fill: skills/00.shared/MANIFEST.md सुनिश्चित करें (v2.1.0)
    │
    └── [8] सत्यापन                             ← health checker ऑटो-रन
```

### 4 Pass क्यों?

**Pass 1** एकमात्र pass है जो आपका सोर्स कोड पढ़ता है। यह प्रति डोमेन प्रतिनिधि फ़ाइलें चुनता है और 55–95 विश्लेषण श्रेणियों (प्रति स्टैक) में पैटर्न एक्सट्रैक्ट करता है। बड़े प्रोजेक्ट्स के लिए, Pass 1 कई बार चलता है — प्रति डोमेन समूह एक। Multi-stack प्रोजेक्ट्स (जैसे Java backend + React frontend) में, backend और frontend डोमेन हर स्टैक के अनुरूप **अलग-अलग विश्लेषण प्रॉम्प्ट** का उपयोग करते हैं।

**Pass 2** सभी Pass 1 परिणामों को एक एकीकृत विश्लेषण में merge करता है: सामान्य पैटर्न (100% साझा), बहुमत पैटर्न (50%+ साझा), डोमेन-विशिष्ट पैटर्न, गंभीरता के अनुसार anti-patterns, और cross-cutting concerns (naming, security, DB, testing, logging, performance)। Backend और frontend परिणाम एक साथ merge होते हैं।

**Pass 3** (split mode, v2.1.0) merged विश्लेषण लेता है और पूरा फ़ाइल ecosystem (CLAUDE.md, rules, standards, skills, guides) कई क्रमिक `claude -p` कॉल्स में जेनरेट करता है। मुख्य अंतर्दृष्टि यह है कि output-accumulation overflow input size से predictable नहीं है: single-call Pass 3 2-डोमेन प्रोजेक्ट्स पर ठीक काम करता था और ~5 डोमेन पर विश्वसनीय रूप से विफल होता था, और failure boundary इस पर निर्भर करती थी कि हर फ़ाइल कितनी verbose हो। Split mode इसे पूरी तरह से bypass करता है — हर stage एक नए context window के साथ शुरू होता है और फ़ाइलों का bounded subset लिखता है। Cross-stage consistency (जो single-call approach का मुख्य लाभ था) `pass3a-facts.md` द्वारा संरक्षित होती है, एक 5–10 KB distilled fact sheet जिसे हर बाद का stage reference करता है।

Pass 3 prompt template में एक **Phase 1 "Read Once, Extract Facts" block** भी शामिल है जिसमें पाँच rules हैं जो output volume को और constrain करते हैं:

- **Rule A** — fact table को reference करें; `pass2-merged.json` दोबारा न पढ़ें।
- **Rule B** — Idempotent file writing (यदि target real content के साथ मौजूद है तो skip करें), जिससे Pass 3 interruption के बाद safely re-runnable बनता है।
- **Rule C** — Cross-file consistency को fact table के माध्यम से single source of truth के रूप में enforce किया जाता है।
- **Rule D** — Output conciseness: फ़ाइल writes के बीच एक line (`[WRITE]`/`[SKIP]`), fact table को दोहराना नहीं, फ़ाइल content को echo नहीं।
- **Rule E** — Batch idempotent check: per-target `Read` calls के बजाय PHASE 2 start पर एक `Glob`।

**v2.2.0** में, Pass 3 एक deterministic CLAUDE.md scaffold (`pass-prompts/templates/common/claude-md-scaffold.md`) को prompt में inline embed करता है। यह 8 top-level section titles और order को fix करता है ताकि generated `CLAUDE.md` projects के बीच drift न हो, जबकि हर section का content per-project adapt होता रहे। stack-detector का नया `.env` parser (`lib/env-parser.js`) prompt को `stack.envInfo` supply करता है ताकि port/host/API target rows framework defaults के बजाय project द्वारा actually declare किए गए values से match करें।

**Pass 4** L4 Memory layer को scaffold करता है: स्थायी टीम ज्ञान फ़ाइलें (decision-log, failure-patterns, compaction policy, auto-rule-update) साथ ही `60.memory/` rules जो भविष्य के sessions को बताते हैं कि उन फ़ाइलों को कब और कैसे पढ़ना/लिखना है। Memory layer वह है जो Claude Code को sessions में सबक संचित करने की अनुमति देता है, बजाय हर बार उन्हें फिर से खोजने के। जब `--lang` गैर-अंग्रेज़ी होता है, तो fallback static सामग्री लिखे जाने से पहले Claude के माध्यम से अनुवादित होती है। v2.1.0 यदि Pass 3c ने `skills/00.shared/MANIFEST.md` को omit किया हो तो उसके लिए एक gap-fill जोड़ता है।

---

## जेनरेट की गई फ़ाइल संरचना

```
your-project/
│
├── CLAUDE.md                          ← Claude Code entry point (deterministic 8-section structure, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Glob-triggered rules
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Sync रिमाइंडर rules
│       └── 60.memory/                 ← L4 memory on-demand scope rules (v2.0.0)
│
├── claudeos-core/                     ← मुख्य आउटपुट डायरेक्टरी
│   ├── generated/                     ← विश्लेषण JSON + डायनामिक प्रॉम्प्ट + Pass markers (इसे gitignore करें)
│   │   ├── project-analysis.json      ← स्टैक जानकारी (multi-stack aware)
│   │   ├── domain-groups.json         ← type: backend/frontend के साथ समूह
│   │   ├── pass1-backend-prompt.md    ← Backend विश्लेषण प्रॉम्प्ट
│   │   ├── pass1-frontend-prompt.md   ← Frontend विश्लेषण प्रॉम्प्ट (यदि डिटेक्ट)
│   │   ├── pass2-prompt.md            ← Merge प्रॉम्प्ट
│   │   ├── pass2-merged.json          ← Pass 2 output (केवल Pass 3a द्वारा consumed)
│   │   ├── pass3-context.json         ← Pass 3 के लिए slim summary (< 5 KB) (v2.1.0)
│   │   ├── pass3-prompt.md            ← Pass 3 प्रॉम्प्ट template (Phase 1 block prepended)
│   │   ├── pass3a-facts.md            ← Pass 3a द्वारा लिखा गया fact sheet, 3b/3c/3d द्वारा पढ़ा गया (v2.1.0)
│   │   ├── pass4-prompt.md            ← Memory scaffolding प्रॉम्प्ट (v2.0.0)
│   │   ├── pass3-complete.json        ← Pass 3 completion marker (split mode: groupsCompleted शामिल, v2.1.0)
│   │   ├── pass4-memory.json          ← Pass 4 completion marker (resume पर skip)
│   │   ├── rule-manifest.json         ← सत्यापन टूल्स के लिए फ़ाइल index
│   │   ├── sync-map.json              ← Plan ↔ disk mapping (v2.1.0 में empty; sync-checker compat के लिए रखा गया)
│   │   ├── stale-report.json          ← Consolidated सत्यापन परिणाम
│   │   ├── .i18n-cache-<lang>.json    ← अनुवाद cache (गैर-अंग्रेज़ी `--lang`)
│   │   └── .staged-rules/             ← `.claude/rules/` writes के लिए transient staging dir (ऑटो-moved + cleaned)
│   ├── standard/                      ← Coding standards (15-19 फ़ाइलें + 60.domains/ में per-domain)
│   │   ├── 00.core/                   ← Overview, architecture, naming
│   │   ├── 10.backend-api/            ← API पैटर्न (stack-specific)
│   │   ├── 20.frontend-ui/            ← Frontend पैटर्न (यदि डिटेक्ट)
│   │   ├── 30.security-db/            ← Security, DB schema, utilities
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Build verification, testing
│   │   ├── 60.domains/                ← Per-domain standards (Pass 3b-N द्वारा लिखा गया, v2.1.0)
│   │   └── 90.optional/               ← वैकल्पिक conventions (stack-specific extras)
│   ├── skills/                        ← CRUD/page scaffolding skills
│   │   └── 00.shared/MANIFEST.md      ← registered skills के लिए single source of truth
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 फ़ाइलें)
│   ├── database/                      ← DB schema, migration guide
│   ├── mcp-guide/                     ← MCP server integration guide
│   └── memory/                        ← L4: टीम ज्ञान (4 फ़ाइलें) — इन्हें commit करें
│       ├── decision-log.md            ← डिज़ाइन निर्णयों के पीछे "क्यों"
│       ├── failure-patterns.md        ← आवर्ती त्रुटियाँ और fix (ऑटो-scored — `npx claudeos-core memory score`)
│       ├── compaction.md              ← 4-stage compaction रणनीति (`npx claudeos-core memory compact` चलाएँ)
│       └── auto-rule-update.md        ← Rule सुधार प्रस्ताव (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← यह toolkit (संशोधित न करें)
```

हर standard फ़ाइल में ✅ सही उदाहरण, ❌ ग़लत उदाहरण, और rules सारांश तालिका शामिल होते हैं — सभी आपके वास्तविक कोड पैटर्न से derived, सामान्य टेम्पलेट से नहीं।

> **v2.1.0 नोट:** `claudeos-core/plan/` अब जेनरेट नहीं होती। Master plans एक आंतरिक backup थे जिन्हें Claude Code runtime पर consume नहीं करता था, और Pass 3 में उन्हें aggregate करना output-accumulation overflow का एक प्रमुख कारण था। इसके बजाय backup/restore के लिए `git` का उपयोग करें। v2.0.x से upgrade करने वाले प्रोजेक्ट्स किसी भी मौजूदा `claudeos-core/plan/` डायरेक्टरी को सुरक्षित रूप से हटा सकते हैं।

### Gitignore सिफ़ारिशें

**Commit करें** (टीम ज्ञान — साझा किया जाना चाहिए):
- `CLAUDE.md` — Claude Code entry point
- `.claude/rules/**` — ऑटो-लोडेड rules
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — जेनरेट की गई डॉक्यूमेंटेशन
- `claudeos-core/memory/**` — निर्णय इतिहास, failure patterns, rule प्रस्ताव

**Commit न करें** (पुनर्जेनरेट करने योग्य build artifacts):

```gitignore
# ClaudeOS-Core — जेनरेट किया गया विश्लेषण और अनुवाद cache
claudeos-core/generated/
```

`generated/` डायरेक्टरी में विश्लेषण JSON (`pass1-*.json`, `pass2-merged.json`), प्रॉम्प्ट (`pass1/2/3/4-prompt.md`), Pass completion markers (`pass3-complete.json`, `pass4-memory.json`), translation cache (`.i18n-cache-<lang>.json`), और transient staging डायरेक्टरी (`.staged-rules/`) होते हैं — सभी `npx claudeos-core init` को फिर से चलाकर फिर से बनाए जा सकते हैं।

---

## प्रोजेक्ट आकार द्वारा ऑटो-स्केलिंग

Pass 3 का split mode डोमेन काउंट के साथ stage काउंट को scale करता है। Batch sub-division 16 डोमेन पर kick in होता है ताकि हर stage का output ~50 फ़ाइलें से नीचे रहे, जो `claude -p` के लिए output-accumulation overflow शुरू होने से पहले empirical safe range है।

| प्रोजेक्ट आकार | डोमेन | Pass 3 Stages | कुल `claude -p` | अनुमानित समय |
|---|---|---|---|---|
| छोटा | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + Pass 3 के 4 stages + Pass 4) | ~10–15 min |
| मध्यम | 5–15 | 4 | 8–9 | ~25–45 min |
| बड़ा | 16–30 | **8** (3b, 3c प्रत्येक 2 batches में split) | 11–12 | **~60–105 min** |
| X-बड़ा | 31–45 | 10 | 13–14 | ~100–150 min |
| XX-बड़ा | 46–60 | 12 | 15–16 | ~150–200 min |
| XXX-बड़ा | 61+ | 14+ | 17+ | 200 min+ |

Stage count सूत्र (batch होने पर): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, जहाँ `N = ceil(totalDomains / 15)`।

Pass 4 (memory scaffolding) ऊपर से ~30 सेकंड से 5 मिनट जोड़ता है, इस पर निर्भर करता है कि Claude-driven generation या static fallback चलता है। Multi-stack प्रोजेक्ट्स (जैसे Java + React) के लिए, backend और frontend डोमेन एक साथ गिने जाते हैं। 6 backend + 4 frontend डोमेन वाला प्रोजेक्ट = 10 कुल = मध्यम tier।

---

## सत्यापन टूल्स

ClaudeOS-Core में 5 built-in सत्यापन टूल्स शामिल हैं जो generation के बाद स्वचालित रूप से चलते हैं:

```bash
# सभी जाँच एक साथ चलाएँ (अनुशंसित)
npx claudeos-core health

# व्यक्तिगत कमांड
npx claudeos-core validate     # Plan ↔ disk तुलना
npx claudeos-core refresh      # Disk → Plan sync
npx claudeos-core restore      # Plan → Disk restore

# या सीधे node का उपयोग करें (git clone उपयोगकर्ताओं के लिए)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| टूल | क्या करता है |
|---|---|
| **manifest-generator** | मेटाडेटा JSON बनाता है (`rule-manifest.json`, `sync-map.json`, `stale-report.json` initialize); 7 डायरेक्टरीज़ को index करता है जिनमें `memory/` (summary में `totalMemory`) शामिल है। v2.1.0: `plan-manifest.json` अब जेनरेट नहीं होती क्योंकि master plans हटा दिए गए हैं। |
| **plan-validator** | Master plan `<file>` blocks को disk से उन प्रोजेक्ट्स के लिए validate करता है जिनके पास अभी भी `claudeos-core/plan/` है (legacy upgrade case)। v2.1.0: जब `plan/` absent या empty हो तो `plan-sync-status.json` emission skip करता है — `stale-report.json` अभी भी एक passing no-op रिकॉर्ड करता है। |
| **sync-checker** | अपंजीकृत फ़ाइलें (disk पर लेकिन plan में नहीं) और orphan entries का पता लगाता है — 7 डायरेक्टरीज़ को कवर करता है (v2.0.0 में `memory/` जोड़ा गया)। जब `sync-map.json` में कोई mappings न हों तो cleanly exit करता है (v2.1.0 default state)। |
| **content-validator** | 9-section गुणवत्ता जाँच — empty फ़ाइलें, missing ✅/❌ उदाहरण, आवश्यक sections, साथ ही L4 memory scaffold integrity (decision-log heading तिथियाँ, failure-pattern आवश्यक फ़ील्ड, fence-aware parsing) |
| **pass-json-validator** | Pass 1–4 JSON संरचना के साथ `pass3-complete.json` (split-mode shape, v2.1.0) और `pass4-memory.json` completion markers को सत्यापित करता है |

---

## Claude Code आपकी डॉक्यूमेंटेशन का उपयोग कैसे करता है

ClaudeOS-Core ऐसी डॉक्यूमेंटेशन जेनरेट करता है जिसे Claude Code वास्तव में पढ़ता है — यहाँ कैसे:

### Claude Code स्वचालित रूप से क्या पढ़ता है

| फ़ाइल | कब | गारंटीड |
|---|---|---|
| `CLAUDE.md` | हर conversation शुरू होने पर | हमेशा |
| `.claude/rules/00.core/*` | जब कोई भी फ़ाइल संपादित की जाती है (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/10.backend/*` | जब कोई भी फ़ाइल संपादित की जाती है (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/20.frontend/*` | जब कोई frontend फ़ाइल संपादित की जाती है (component/page/style paths तक scoped) | सशर्त |
| `.claude/rules/30.security-db/*` | जब कोई भी फ़ाइल संपादित की जाती है (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/40.infra/*` | केवल तब जब config/infra फ़ाइलें संपादित की जाती हैं (scoped paths) | सशर्त |
| `.claude/rules/50.sync/*` | केवल तब जब claudeos-core फ़ाइलें संपादित की जाती हैं (scoped paths) | सशर्त |
| `.claude/rules/60.memory/*` | जब `claudeos-core/memory/*` संपादित की जाती है (memory paths तक scoped) — on-demand memory layer को **कैसे** पढ़ें/लिखें इसके निर्देश देता है | सशर्त (v2.0.0) |

### Claude Code rule references के माध्यम से on-demand क्या पढ़ता है

हर rule फ़ाइल `## Reference` section के माध्यम से अपने संबंधित standard से link करती है। Claude वर्तमान task के लिए केवल प्रासंगिक standard पढ़ता है:

- `claudeos-core/standard/**` — coding पैटर्न, ✅/❌ उदाहरण, naming conventions
- `claudeos-core/database/**` — DB schema (queries, mappers, migrations के लिए)
- `claudeos-core/memory/**` (v2.0.0) — L4 team knowledge layer; ऑटो-लोडेड **नहीं** (हर conversation पर बहुत नॉइज़ी होगा)। इसके बजाय, `60.memory/*` rules Claude को बताते हैं *कब* इन फ़ाइलों को Read करें: session शुरू होने पर (हाल की `decision-log.md` + उच्च-importance `failure-patterns.md` skim करें), और निर्णय लेते समय या आवर्ती त्रुटियों का सामना करते समय append-on-demand करें।

`00.standard-reference.md` उन standards को खोजने के लिए सभी standard फ़ाइलों की directory के रूप में कार्य करता है जिनके पास कोई संबंधित rule नहीं है।

### Claude Code क्या नहीं पढ़ता (context बचाता है)

ये folders standard-reference rule में `DO NOT Read` section के माध्यम से स्पष्ट रूप से बाहर रखे गए हैं:

| Folder | क्यों बाहर रखा गया |
|---|---|
| `claudeos-core/plan/` | Legacy प्रोजेक्ट्स (v2.0.x और पहले) से Master plan backups। v2.1.0 में जेनरेट नहीं होता। यदि मौजूद है, Claude Code इसे स्वचालित रूप से load नहीं करेगा — केवल read-on-demand। |
| `claudeos-core/generated/` | Build metadata JSON, prompts, Pass markers, translation cache, `.staged-rules/`। Coding के लिए नहीं। |
| `claudeos-core/guide/` | मनुष्यों के लिए onboarding guides। |
| `claudeos-core/mcp-guide/` | MCP server docs। Coding के लिए नहीं। |
| `claudeos-core/memory/` (auto-load) | **Auto-load disabled** डिज़ाइन द्वारा — हर conversation पर context बढ़ा देगा। इसके बजाय `60.memory/*` rules के माध्यम से on-demand पढ़ें (जैसे `failure-patterns.md` का session-start scan)। हमेशा इन फ़ाइलों को commit करें। |

---

## दैनिक वर्कफ़्लो

### इंस्टॉलेशन के बाद

```
# Claude Code को सामान्य रूप से उपयोग करें — यह स्वचालित रूप से आपके standards को reference करता है:
"order डोमेन के लिए एक CRUD बनाओ"
"user profile update API जोड़ो"
"इस कोड को प्रोजेक्ट पैटर्न से मेल खाने के लिए refactor करो"
```

### Standards को मैन्युअली संपादित करने के बाद

```bash
# standards या rules फ़ाइलें संपादित करने के बाद:
npx claudeos-core refresh

# सत्यापित करें कि सब कुछ सुसंगत है
npx claudeos-core health
```

### जब डॉक्स corrupt हो जाते हैं

```bash
# v2.1.0 सिफ़ारिश: restore के लिए git का उपयोग करें (क्योंकि master plans अब
# जेनरेट नहीं होते)। अपने जेनरेट किए गए docs को नियमित रूप से commit करें ताकि
# आप बिना regenerate किए विशिष्ट फ़ाइलों को rollback कर सकें:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (v2.0.x प्रोजेक्ट्स जिनमें claudeos-core/plan/ अभी भी मौजूद है):
npx claudeos-core restore
```

### Memory Layer रखरखाव (v2.0.0)

L4 Memory layer (`claudeos-core/memory/`) sessions में टीम ज्ञान संचित करता है। तीन CLI subcommands इसे स्वस्थ रखते हैं:

```bash
# Compact: 4-stage compaction policy लागू करें (समय-समय पर चलाएँ — जैसे मासिक)
npx claudeos-core memory compact
#   Stage 1: पुरानी entries को सारांशित करें (>30 दिन, body → one-line)
#   Stage 2: duplicate headings को merge करें (frequency जोड़ी जाती है, latest fix रखा जाता है)
#   Stage 3: low-importance + पुरानी entries हटाएँ (importance <3 AND lastSeen >60 दिन)
#   Stage 4: प्रति फ़ाइल 400-line cap लागू करें (पहले सबसे पुरानी low-importance हटाई जाती है)

# Score: failure-patterns.md entries को importance के अनुसार re-rank करें
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), 10 पर capped
#   कई नए failure patterns append करने के बाद चलाएँ

# Propose-rules: आवर्ती failures से candidate rule additions को surface करें
npx claudeos-core memory propose-rules
#   frequency ≥ 3 के साथ failure-patterns.md entries पढ़ता है
#   Confidence गणना करता है (sigmoid on weighted evidence × anchor multiplier)
#   प्रस्तावों को memory/auto-rule-update.md में लिखता है (ऑटो-लागू नहीं)
#   Confidence ≥ 0.70 गंभीर समीक्षा का हकदार है; accept → rule संपादित करें + निर्णय log करें

# v2.1.0: `memory --help` अब subcommand help पर routes करता है (पहले top-level दिखाता था)
npx claudeos-core memory --help
```

> **v2.1.0 फ़िक्स:** `memory score` पहले run के बाद अब duplicate `importance` लाइनें नहीं छोड़ता (पहले auto-scored line ऊपर जोड़ी जाती थी जबकि original plain line नीचे छोड़ दी जाती थी)। `memory compact` का Stage 1 summary marker अब एक proper markdown list item (`- _Summarized on ..._`) है ताकि यह cleanly render हो और बाद की compactions पर सही ढंग से re-parse हो।

Memory में कब लिखें (Claude यह on-demand करता है, लेकिन आप मैन्युअली भी संपादित कर सकते हैं):
- **`decision-log.md`** — जब भी आप प्रतिस्पर्धी पैटर्न के बीच चुनते हैं, library चुनते हैं, टीम convention परिभाषित करते हैं, या कुछ NOT करने का निर्णय लेते हैं, तो एक नई entry append करें। केवल append; ऐतिहासिक entries को कभी संपादित न करें।
- **`failure-patterns.md`** — आवर्ती त्रुटि या ग़ैर-स्पष्ट root cause के **दूसरे occurrence** पर append करें। पहली बार की त्रुटियों को entry की आवश्यकता नहीं है।
- `compaction.md` और `auto-rule-update.md` — ऊपर CLI subcommands द्वारा जेनरेट/प्रबंधित; हाथ से संपादित न करें।

### CI/CD Integration

```yaml
# GitHub Actions उदाहरण
- run: npx claudeos-core validate
# Exit code 1 PR को block करता है

# वैकल्पिक: मासिक memory housekeeping (अलग cron workflow)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## यह कैसे अलग है?

### अन्य Claude Code टूल्स की तुलना में

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **दृष्टिकोण** | कोड पहले विश्लेषण करता है, फिर LLM जेनरेट करता है | Pre-built config presets | LLM agent teams डिज़ाइन करता है | LLM spec docs जेनरेट करता है | LLM CLAUDE.md लिखता है |
| **आपका सोर्स कोड पढ़ता है** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM पढ़ता है) | ❌ (LLM पढ़ता है) |
| **स्टैक डिटेक्शन** | कोड कन्फर्म करता है (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM अनुमान लगाता है | LLM अनुमान लगाता है | LLM अनुमान लगाता है |
| **डोमेन डिटेक्शन** | कोड कन्फर्म करता है (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM अनुमान लगाता है | N/A | N/A |
| **समान प्रोजेक्ट → समान परिणाम** | ✅ Deterministic विश्लेषण | ✅ (static फ़ाइलें) | ❌ (LLM भिन्न) | ❌ (LLM भिन्न) | ❌ (LLM भिन्न) |
| **बड़े प्रोजेक्ट को संभालना** | डोमेन समूह splitting (4 डोमेन / प्रति समूह 40 फ़ाइलें) | N/A | No splitting | No splitting | Context window limit |
| **आउटपुट** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ फ़ाइलें) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 फ़ाइल) |
| **आउटपुट स्थान** | `.claude/rules/` (Claude Code द्वारा ऑटो-लोडेड) | `.claude/` विविध | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation सत्यापन** | ✅ 5 स्वचालित validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language आउटपुट** | ✅ 10 भाषाएँ | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend एक साथ | ❌ Stack-agnostic | ❌ | ❌ | आंशिक |
| **स्थायी memory layer** | ✅ L4 — decision log + failure patterns + ऑटो-scored rule प्रस्ताव (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### एक वाक्य में मुख्य अंतर

**अन्य टूल्स Claude को "सामान्य रूप से अच्छे instructions" देते हैं। ClaudeOS-Core Claude को "आपके वास्तविक कोड से एक्सट्रैक्ट किए गए instructions" देता है।**

इसीलिए Claude Code आपके MyBatis प्रोजेक्ट में JPA कोड जेनरेट करना बंद कर देता है,
जब आपका codebase `ok()` का उपयोग करता है तो `success()` का उपयोग करना बंद कर देता है,
और जब आपका प्रोजेक्ट `controller/user/` का उपयोग करता है तो `user/controller/` डायरेक्टरी बनाना बंद कर देता है।

### पूरक, प्रतिस्पर्धी नहीं

ClaudeOS-Core **प्रोजेक्ट-विशिष्ट rules और standards** पर केंद्रित है।
अन्य टूल्स **agent orchestration और workflows** पर केंद्रित हैं।

आप अपने प्रोजेक्ट के rules जेनरेट करने के लिए ClaudeOS-Core का उपयोग कर सकते हैं, फिर agent teams और workflow automation के लिए ऊपर से ECC या Harness का उपयोग कर सकते हैं। वे अलग-अलग समस्याएँ हल करते हैं।

---

## FAQ

**Q: क्या यह मेरे सोर्स कोड को संशोधित करता है?**
नहीं। यह केवल `CLAUDE.md`, `.claude/rules/`, और `claudeos-core/` बनाता है। आपका मौजूदा कोड कभी संशोधित नहीं होता।

**Q: लागत कितनी है?**
यह 4 passes में `claude -p` को कई बार कॉल करता है। v2.1.0 split mode में, Pass 3 अकेले प्रोजेक्ट आकार के आधार पर 4–14+ stages में विस्तारित होता है ([ऑटो-स्केलिंग](#प्रोजेक्ट-आकार-द्वारा-ऑटो-स्केलिंग) देखें)। एक विशिष्ट छोटा प्रोजेक्ट (1–15 डोमेन) कुल 8–9 `claude -p` कॉल्स का उपयोग करता है; एक 18-डोमेन प्रोजेक्ट 11 का उपयोग करता है; एक 60-डोमेन प्रोजेक्ट 15–17 का उपयोग करता है। हर stage fresh context window के साथ चलता है — per-call token cost वास्तव में single-call Pass 3 से कम है, क्योंकि किसी भी stage को पूरे फ़ाइल tree को एक context में रखना नहीं पड़ता। जब `--lang` गैर-अंग्रेज़ी होता है, तो static fallback path अनुवाद के लिए कुछ अतिरिक्त `claude -p` कॉल invoke कर सकता है; परिणाम `claudeos-core/generated/.i18n-cache-<lang>.json` में cached होते हैं ताकि बाद के runs उन्हें पुनः उपयोग करें। यह सामान्य Claude Code उपयोग के भीतर है।

**Q: Pass 3 split mode क्या है और इसे v2.1.0 में क्यों जोड़ा गया?**
v2.1.0 से पहले, Pass 3 एक सिंगल `claude -p` कॉल बनाता था जिसे पूरे जेनरेट किए गए फ़ाइल tree (`CLAUDE.md`, standards, rules, skills, guides — आमतौर पर 30–60 फ़ाइलें) को एक response में emit करना होता था। यह छोटे प्रोजेक्ट्स पर काम करता था लेकिन ~5 डोमेन पर विश्वसनीय रूप से `Prompt is too long` output-accumulation विफलताओं को hit करता था। विफलता input size से predictable नहीं थी — यह इस पर निर्भर करती थी कि हर जेनरेट की गई फ़ाइल कितनी verbose हो, और एक ही प्रोजेक्ट को intermittently strike कर सकती थी। Split mode समस्या को संरचनात्मक रूप से bypass करता है: Pass 3 को क्रमिक stages (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`) में तोड़ दिया गया है, हर एक fresh context window के साथ एक अलग `claude -p` कॉल। Cross-stage consistency `pass3a-facts.md` द्वारा संरक्षित होती है, एक 5–10 KB distilled fact sheet जिसे हर बाद का stage `pass2-merged.json` को दोबारा पढ़ने के बजाय reference करता है। `pass3-complete.json` marker एक `groupsCompleted` array carry करता है ताकि `3c-2` के दौरान crash `3c-2` से resume हो (not `3a` से), token cost को दोगुना करने से बचाते हुए।
**Q: क्या मुझे जेनरेट की गई फ़ाइलों को Git पर commit करना चाहिए?**
हाँ, अनुशंसित। आपकी टीम समान Claude Code standards साझा कर सकती है। `claudeos-core/generated/` को `.gitignore` में जोड़ने पर विचार करें (विश्लेषण JSON पुनर्जेनरेट करने योग्य है)।

**Q: Mixed-stack प्रोजेक्ट्स (जैसे Java backend + React frontend) के बारे में क्या?**
पूरी तरह से समर्थित। ClaudeOS-Core दोनों स्टैक्स को ऑटो-डिटेक्ट करता है, डोमेन को `backend` या `frontend` के रूप में tag करता है, और हर एक के लिए stack-specific विश्लेषण प्रॉम्प्ट का उपयोग करता है। Pass 2 सब कुछ merge करता है, और Pass 3 अपने split stages में backend और frontend दोनों standards जेनरेट करता है — backend डोमेन कुछ 3b/3c batches में जाते हैं, frontend डोमेन अन्य में, सभी consistency के लिए समान `pass3a-facts.md` को reference करते हैं।

**Q: क्या यह Turborepo / pnpm workspaces / Lerna monorepos के साथ काम करता है?**
हाँ। ClaudeOS-Core `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, या `package.json#workspaces` डिटेक्ट करता है और framework/ORM/DB dependencies के लिए sub-package `package.json` फ़ाइलों को स्वचालित रूप से स्कैन करता है। डोमेन scanning `apps/*/src/` और `packages/*/src/` patterns को कवर करती है। monorepo root से चलाएँ।

**Q: Re-run पर क्या होता है?**
यदि पिछले Pass 1/2 परिणाम मौजूद हैं, तो एक interactive prompt आपको चुनने देता है: **Continue** (जहाँ रुका था वहाँ से resume) या **Fresh** (सब कुछ हटाएँ और फिर से शुरू करें)। prompt को skip करने और हमेशा नए सिरे से शुरू करने के लिए `--force` का उपयोग करें। v2.1.0 split mode में, Pass 3 resume stage granularity पर काम करता है — यदि run `3c-2` के दौरान crash हुआ था, तो अगला `init` `3c-2` से resume करता है न कि `3a` से restart (जो token cost को दोगुना कर देता)। `pass3-complete.json` marker `mode: "split"` प्लस एक `groupsCompleted` array रिकॉर्ड करता है ताकि यह logic चला सके।

**Q: क्या NestJS का अपना template है या Express वाला उपयोग करता है?**
NestJS NestJS-विशिष्ट विश्लेषण श्रेणियों के साथ एक समर्पित `node-nestjs` template का उपयोग करता है: `@Module`, `@Injectable`, `@Controller` decorators, Guards, Pipes, Interceptors, DI container, CQRS patterns, और `Test.createTestingModule`। Express प्रोजेक्ट्स अलग `node-express` template का उपयोग करते हैं।

**Q: Vue / Nuxt प्रोजेक्ट्स के बारे में क्या?**
Vue/Nuxt Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, Nitro server routes, और `@nuxt/test-utils` को कवर करने वाले एक समर्पित `vue-nuxt` template का उपयोग करता है। Next.js/React प्रोजेक्ट्स `node-nextjs` template का उपयोग करते हैं।

**Q: क्या यह Kotlin को support करता है?**
हाँ। ClaudeOS-Core `build.gradle.kts` या `build.gradle` में kotlin plugin से Kotlin को ऑटो-डिटेक्ट करता है। यह Kotlin-विशिष्ट विश्लेषण (data classes, sealed classes, coroutines, extension functions, MockK, आदि) के साथ एक समर्पित `kotlin-spring` template का उपयोग करता है।

**Q: CQRS / BFF architecture के बारे में क्या?**
Kotlin multi-module प्रोजेक्ट्स के लिए पूरी तरह से समर्थित। ClaudeOS-Core `settings.gradle.kts` पढ़ता है, मॉड्यूल नामों से मॉड्यूल प्रकार (command, query, bff, integration) डिटेक्ट करता है, और Command/Query मॉड्यूल्स में समान डोमेन को group करता है। जेनरेट किए गए standards में command controllers बनाम query controllers, BFF/Feign patterns, और inter-module communication conventions के लिए अलग rules शामिल हैं।

**Q: Gradle multi-module monorepos के बारे में क्या?**
ClaudeOS-Core सभी submodules (`**/src/main/kotlin/**/*.kt`) को nesting depth की परवाह किए बिना स्कैन करता है। मॉड्यूल प्रकार naming conventions से अनुमानित किए जाते हैं (जैसे `reservation-command-server` → domain: `reservation`, type: `command`)। साझा libraries (`shared-lib`, `integration-lib`) भी डिटेक्ट होती हैं।

**Q: L4 Memory layer क्या है (v2.0.0)? क्या मुझे `claudeos-core/memory/` commit करना चाहिए?**
हाँ — **हमेशा commit करें** `claudeos-core/memory/`। यह स्थायी टीम ज्ञान है: `decision-log.md` architectural choices के पीछे *क्यों* को रिकॉर्ड करता है (append-only), `failure-patterns.md` importance scores के साथ आवर्ती त्रुटियों को पंजीकृत करता है ताकि भविष्य के sessions उनसे बचें, `compaction.md` 4-stage compaction policy परिभाषित करता है, और `auto-rule-update.md` machine-generated rule सुधार प्रस्ताव एकत्र करता है। Rules (path द्वारा ऑटो-लोडेड) के विपरीत, memory फ़ाइलें **on-demand** हैं — Claude उन्हें केवल तब पढ़ता है जब `60.memory/*` rules इसे निर्देश देते हैं (जैसे उच्च-importance failures का session-start scan)। यह दीर्घकालिक ज्ञान को संरक्षित करते हुए context लागत को कम रखता है।

**Q: यदि Pass 4 विफल हो जाए तो क्या होगा?**
Automated pipeline (`npx claudeos-core init`) में static fallback है: यदि `claude -p` विफल हो जाता है या `pass4-prompt.md` गायब है, तो यह `lib/memory-scaffold.js` के माध्यम से सीधे memory layer को scaffold करता है। जब `--lang` गैर-अंग्रेज़ी होता है, तो static fallback को `claude` CLI के माध्यम से अनुवाद करना **अनिवार्य** है — यदि वह भी विफल हो जाता है, तो run `InitError` के साथ abort हो जाता है (कोई silent English fallback नहीं)। जब `claude` authenticated हो तब फिर से चलाएँ, या अनुवाद skip करने के लिए `--lang en` का उपयोग करें। अनुवाद परिणाम `claudeos-core/generated/.i18n-cache-<lang>.json` में cached होते हैं ताकि बाद के runs उन्हें पुनः उपयोग करें।

**Q: `memory compact` / `memory score` / `memory propose-rules` क्या करते हैं?**
ऊपर [Memory Layer रखरखाव](#memory-layer-रखरखाव-v200) section देखें। संक्षिप्त version: `compact` 4-stage policy चलाता है (पुरानी सारांशित करें, duplicates merge करें, low-importance पुरानी हटाएँ, 400-line cap लागू करें); `score` `failure-patterns.md` को importance (frequency × recency) के अनुसार re-rank करता है; `propose-rules` आवर्ती failures से candidate rule additions को `auto-rule-update.md` में surface करता है (ऑटो-लागू नहीं — मैन्युअली समीक्षा और accept/reject करें)।

**Q: `--force` (या "fresh" resume mode) `.claude/rules/` को क्यों हटाता है?**
v2.0.0 ने तीन Pass 3 silent-failure guards जोड़े (Guard 3 दो incomplete-output variants को कवर करता है: `guide/` के लिए H2 और `standard/skills` के लिए H1)। Guard 1 ("partial staged-rules move") और Guard 3 ("incomplete output — missing/empty guide files or missing standard sentinel / empty skills") मौजूदा rules पर निर्भर नहीं हैं, लेकिन Guard 2 ("zero rules detected") है — यह तब fire होता है जब Claude ने `staging-override.md` directive को ignore किया और सीधे `.claude/` में लिखने की कोशिश की (जहाँ Claude Code की sensitive-path policy इसे block करती है)। पिछले run से stale rules Guard 2 को false-negative करा देंगे — इसलिए `--force`/`fresh` साफ़ detection सुनिश्चित करने के लिए `.claude/rules/` को wipe करता है। **rule फ़ाइलों में मैन्युअल संपादन खो जाएँगे** `--force`/`fresh` के तहत; यदि आवश्यक हो तो पहले backup लें। (v2.1.0 नोट: Guard 3 H1 अब `plan/` की जाँच नहीं करता क्योंकि master plans अब जेनरेट नहीं होते।)

**Q: `claudeos-core/generated/.staged-rules/` क्या है और यह क्यों मौजूद है?**
Claude Code की sensitive-path policy `claude -p` subprocess से `.claude/` में सीधे writes मना करती है (`--dangerously-skip-permissions` के साथ भी)। v2.0.0 इसके आसपास Pass 3/4 प्रॉम्प्ट को सभी `.claude/rules/` writes को staging directory पर redirect करवा कर काम करता है; Node.js orchestrator (जो उस policy के अधीन नहीं है) फिर हर pass के बाद staged tree को `.claude/rules/` में move करता है। यह उपयोगकर्ता के लिए transparent है — directory ऑटो-बनाई, ऑटो-साफ़, और ऑटो-moved होती है। यदि पिछला run mid-move crash हो गया, तो अगला run retry करने से पहले staging dir को wipe करता है। v2.1.0 split mode में, stage runner हर stage के बाद staged rules को `.claude/rules/` में move करता है (केवल अंत में नहीं), इसलिए mid-Pass-3 crash भी पहले से पूर्ण stages के rules को उनकी जगह छोड़ देता है।

**Q: क्या मैं `npx claudeos-core init` के बजाय Pass 3 को मैन्युअली चला सकता हूँ?**
छोटे प्रोजेक्ट्स (≤5 डोमेन) के लिए हाँ — [Step 6](#step-6-pass-3--सभी-डॉक्यूमेंटेशन-जेनरेट-करें-कई-stages-में-split) में single-call manual निर्देश अभी भी काम करते हैं। बड़े प्रोजेक्ट्स के लिए आपको `npx claudeos-core init` का उपयोग करना चाहिए क्योंकि split runner ही fresh contexts के साथ stage-by-stage execution को orchestrate करता है, ≥16 डोमेन पर batch sub-division संभालता है, सही `pass3-complete.json` marker shape (`mode: "split"` + `groupsCompleted`) लिखता है, और stages के बीच staged rules move करता है। उस orchestration को हाथ से reproduce करना संभव है लेकिन thकाऊ। यदि आपके पास stages को मैन्युअली चलाने का कारण है (जैसे किसी विशिष्ट stage की debugging), तो आप `pass3-prompt.md` को appropriate `STAGE:` directive के साथ template कर सकते हैं और इसे सीधे `claude -p` को feed कर सकते हैं — लेकिन याद रखें कि हर stage के बाद `.staged-rules/` move करें और marker को स्वयं update करें।

**Q: मेरा प्रोजेक्ट v2.0.x से upgrade है और इसमें एक मौजूदा `claudeos-core/plan/` डायरेक्टरी है। मुझे क्या करना चाहिए?**
कुछ आवश्यक नहीं — v2.1.0 टूल्स `plan/` को absent या empty होने पर ignore करते हैं, और `plan-validator` backward compatibility के लिए populated `plan/` डायरेक्टरियों वाले legacy प्रोजेक्ट्स को अभी भी handle करता है। यदि आपको master plan backups की ज़रूरत नहीं है तो आप `claudeos-core/plan/` को सुरक्षित रूप से हटा सकते हैं (वैसे भी git history एक बेहतर backup है)। यदि आप `plan/` रखते हैं, तो `npx claudeos-core init` चलाने पर यह update नहीं होगी — v2.1.0 में नया content master plans में aggregate नहीं होता। सत्यापन टूल्स दोनों cases को cleanly handle करते हैं।

---

## टेम्पलेट संरचना

```
pass-prompts/templates/
├── common/                  # साझा header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # भूमिका + output फ़ॉर्मैट निर्देश (सभी pass)
│   ├── pass3-footer.md       # Pass 3 पूरा होने के बाद health-check निर्देश + 5 CRITICAL guardrail ब्लॉक (v2.2.0)
│   ├── pass3-phase1.md       # "Read Once, Extract Facts" ब्लॉक (Rule A-E) (v2.1.0)
│   ├── pass4.md              # Memory scaffolding prompt (v2.0.0)
│   ├── staging-override.md   # .claude/rules/** लिखना .staged-rules/** पर redirect (v2.0.0)
│   ├── claude-md-scaffold.md # Deterministic 8-section CLAUDE.md टेम्प्लेट (v2.2.0)
│   └── lang-instructions.json # प्रति-भाषा output निर्देश (10 भाषाएँ)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` आपके स्टैक(s) को ऑटो-डिटेक्ट करता है, फिर type-specific प्रॉम्प्ट assemble करता है। NestJS, Vue/Nuxt, Vite SPA, और Flask हर एक framework-विशिष्ट विश्लेषण श्रेणियों के साथ समर्पित templates का उपयोग करते हैं (जैसे NestJS के लिए `@Module`/`@Injectable`/Guards; Vue के लिए `<script setup>`/Pinia/useFetch; Vite के लिए client-side routing/`VITE_` env; Flask के लिए Blueprint/`app.factory`/Flask-SQLAlchemy)। Multi-stack प्रोजेक्ट्स के लिए, अलग `pass1-backend-prompt.md` और `pass1-frontend-prompt.md` जेनरेट किए जाते हैं, जबकि `pass3-prompt.md` दोनों स्टैक्स के generation targets को combine करता है। v2.1.0 में, Pass 3 template के आगे `common/pass3-phase1.md` (Rules A–E वाला "Read Once, Extract Facts" block) prepend किया जाता है, फिर इसे split-mode stage के अनुसार sliced किया जाता है। Pass 4 स्टैक की परवाह किए बिना साझा `common/pass4.md` template (memory scaffolding) का उपयोग करता है।

**v2.2.0 में**, Pass 3 prompt phase1 ब्लॉक और stack-specific body के बीच `common/claude-md-scaffold.md` (deterministic 8-section CLAUDE.md टेम्प्लेट) को भी inline embed करता है — यह section संरचना को ठीक करता है ताकि जेनरेटेड CLAUDE.md projects के बीच drift न हो, जबकि content प्रति-project adapt होता है। Templates **English-first** लिखे गए हैं; `lang-instructions.json` से language injection LLM को निर्देश देता है कि emit समय पर section titles और prose को target output भाषा में अनुवाद करे।

---

## Monorepo समर्थन

ClaudeOS-Core JS/TS monorepo setups को स्वचालित रूप से डिटेक्ट करता है और dependencies के लिए sub-packages को स्कैन करता है।

**समर्थित monorepo markers** (ऑटो-डिटेक्ट):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**monorepo root से चलाएँ** — ClaudeOS-Core sub-packages में framework/ORM/DB dependencies खोजने के लिए `apps/*/package.json` और `packages/*/package.json` पढ़ता है:

```bash
cd my-monorepo
npx claudeos-core init
```

**क्या डिटेक्ट होता है:**
- `apps/web/package.json` से dependencies (जैसे `next`, `react`) → frontend stack
- `apps/api/package.json` से dependencies (जैसे `express`, `prisma`) → backend stack
- `packages/db/package.json` से dependencies (जैसे `drizzle-orm`) → ORM/DB
- `pnpm-workspace.yaml` से custom workspace paths (जैसे `services/*`)

**डोमेन scanning monorepo layouts को भी कवर करती है:**
- Backend डोमेन के लिए `apps/api/src/modules/*/` और `apps/api/src/*/`
- Frontend डोमेन के लिए `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/`
- साझा package डोमेन के लिए `packages/*/src/*/`

```
my-monorepo/                    ← यहाँ चलाएँ: npx claudeos-core init
├── turbo.json                  ← Turborepo के रूप में ऑटो-डिटेक्ट
├── apps/
│   ├── web/                    ← apps/web/package.json से Next.js डिटेक्ट
│   │   ├── app/dashboard/      ← Frontend डोमेन डिटेक्ट
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← apps/api/package.json से Express डिटेक्ट
│       ├── src/modules/users/  ← Backend डोमेन डिटेक्ट
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← packages/db/package.json से Drizzle डिटेक्ट
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **नोट:** Kotlin/Java monorepos के लिए, multi-module detection `settings.gradle.kts` का उपयोग करती है (ऊपर [Kotlin Multi-Module Detection](#kotlin-मल्टी-मॉड्यूल-डोमेन-डिटेक्शन) देखें) और JS monorepo markers की आवश्यकता नहीं है।

## समस्या निवारण

**"claude: command not found"** — Claude Code CLI स्थापित नहीं है या PATH में नहीं है। [Claude Code docs](https://code.claude.com/docs/en/overview) देखें।

**"npm install failed"** — Node.js version बहुत कम हो सकता है। v18+ आवश्यक है।

**"0 domains detected"** — आपकी प्रोजेक्ट संरचना ग़ैर-मानक हो सकती है। अपने स्टैक के लिए ऊपर के detection patterns देखें।

**"0 domains detected" on Kotlin project** — सुनिश्चित करें कि आपके प्रोजेक्ट में root पर `build.gradle.kts` (या kotlin plugin के साथ `build.gradle`) है, और source फ़ाइलें `**/src/main/kotlin/` के तहत हैं। Multi-module प्रोजेक्ट्स के लिए, सुनिश्चित करें कि `settings.gradle.kts` में `include()` statements हैं। Single-module Kotlin प्रोजेक्ट्स (`settings.gradle` के बिना) भी समर्थित हैं — डोमेन `src/main/kotlin/` के तहत package/class संरचना से निकाले जाते हैं।

**"Language detected as java instead of kotlin"** — ClaudeOS-Core पहले root `build.gradle(.kts)` की जाँच करता है, फिर submodule build फ़ाइलें। यदि root build file `kotlin` के बिना `java` plugin का उपयोग करती है, लेकिन submodules Kotlin का उपयोग करते हैं, तो टूल fallback के रूप में 5 तक submodule build फ़ाइलों की जाँच करता है। यदि फिर भी नहीं डिटेक्ट होता, तो सुनिश्चित करें कि कम से कम एक `build.gradle.kts` में `kotlin("jvm")` या `org.jetbrains.kotlin` है।

**"CQRS not detected"** — Architecture detection मॉड्यूल नामों पर निर्भर करती है जिसमें `command` और `query` keywords हों। यदि आपके मॉड्यूल अलग naming का उपयोग करते हैं (जैसे `write-server`, `read-server`), तो CQRS architecture ऑटो-डिटेक्ट नहीं होगा। आप plan-installer चलने के बाद जेनरेट किए गए प्रॉम्प्ट को मैन्युअली adjust कर सकते हैं।

**"Pass 3 produced 0 rule files under .claude/rules/" (v2.0.0)** — Guard 2 fired: Claude ने `staging-override.md` directive को ignore किया और सीधे `.claude/` में लिखने की कोशिश की, जहाँ Claude Code की sensitive-path policy writes को block करती है। `npx claudeos-core init --force` के साथ फिर से चलाएँ। यदि error बनी रहती है, तो `claudeos-core/generated/pass3-prompt.md` की जाँच करें कि `staging-override.md` block सबसे ऊपर है।

**"Pass 3 finished but N rule file(s) could not be moved from staging" (v2.0.0)** — Guard 1 fired: staging move ने एक transient file lock (आमतौर पर Windows antivirus या file-watcher) hit किया। Marker NOT written, इसलिए अगला `init` run स्वचालित रूप से Pass 3 retry करता है। बस `npx claudeos-core init` फिर से चलाएँ।

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty" (v2.0.0)** — Guard 3 (H2) fired: Claude CLAUDE.md + rules लिखने के बाद लेकिन `claudeos-core/guide/` section (9 फ़ाइलें अपेक्षित) को finish (या start) करने से पहले mid-response truncated हो गया। केवल-BOM या केवल-whitespace फ़ाइल पर भी fire होता है (heading लिखा गया था लेकिन body truncated था)। इस guard के बिना completion marker अभी भी लिखा जाएगा, जिससे `guide/` बाद के runs पर स्थायी रूप से खाली रहेगा। Marker यहाँ NOT written है, इसलिए अगला `init` run समान Pass 2 परिणामों से Pass 3 को retry करता है। यदि यह दोहराता रहता है, तो scratch से regenerate करने के लिए `npx claudeos-core init --force` के साथ फिर से चलाएँ।

**"Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0, v2.1.0 में updated)** — Guard 3 (H1) fired: Claude `claudeos-core/guide/` के बाद लेकिन `claudeos-core/standard/` या `claudeos-core/skills/` से पहले (या दौरान) truncated हो गया। आवश्यकताएँ: (a) `standard/00.core/01.project-overview.md` मौजूद और गैर-खाली है (हर स्टैक के Pass 3 प्रॉम्प्ट द्वारा लिखा गया sentinel), (b) `skills/` में ≥1 गैर-खाली `.md`। `database/` और `mcp-guide/` को जानबूझकर बाहर रखा गया है (कुछ स्टैक्स वैध रूप से शून्य फ़ाइलें उत्पन्न करते हैं)। v2.1.0 से `plan/` की जाँच नहीं होती (master plans हटा दिए गए)। Guard 3 (H2) जैसा recovery path: `init` फिर से चलाएँ, या यदि बना रहे तो `--force`।

**"Pass 3 split stage crashed partway through (v2.1.0)"** — जब split stages में से एक (जैसे `3b-1`, `3c-2`) mid-run विफल हो जाता है, तो stage-level marker NOT written होता है, लेकिन पूर्ण stages `pass3-complete.json.groupsCompleted` में रिकॉर्ड होते हैं। अगला `init` run इस array को पढ़ता है और पहले uncompleted stage से resume करता है, पहले के सभी पूर्ण work को skip करते हुए। आपको मैन्युअली कुछ करने की ज़रूरत नहीं — बस `npx claudeos-core init` फिर से चलाएँ। यदि resume उसी stage पर विफल होता रहता है, तो malformed content के लिए `claudeos-core/generated/pass3-prompt.md` की जाँच करें, फिर पूर्ण restart के लिए `--force` try करें। `pass3-complete.json` shape (`mode: "split"`, `groupsCompleted: [...]`) stable है; missing या malformed marker पूरे Pass 3 को `3a` से re-run करने का कारण बनता है।

**"Pass 3 stale marker (shape mismatch) — treating as incomplete" (v2.1.0)** — एक pre-v2.1.0 single-call run से `pass3-complete.json` को नए split-mode rules के तहत interpret किया जा रहा है। Shape check `mode: "split"` और एक `groupsCompleted` array की तलाश करता है; यदि कोई भी missing है, तो marker को partial माना जाता है और Pass 3 split mode में re-run होता है। यदि आप v2.0.x से upgrade किए हैं, तो यह एक बार expected है — अगला run सही marker shape लिखेगा। कोई कार्रवाई आवश्यक नहीं।

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Info log, error नहीं। Resume पर, `init` अब `pass2-merged.json` को parse और validate करता है (≥5 top-level keys आवश्यक, `pass-json-validator` के `INSUFFICIENT_KEYS` threshold को mirror करते हुए)। पिछले crashed run से Skeleton `{}` या malformed JSON स्वचालित रूप से हटा दिया जाता है और Pass 2 फिर से चलता है। कोई मैन्युअल कार्रवाई आवश्यक नहीं — pipeline स्वयं-ठीक हो जाता है। यदि यह दोहराता रहता है, तो `claudeos-core/generated/pass2-prompt.md` की जाँच करें और `--force` के साथ retry करें।

**"Static fallback failed while translating to lang='ko'" (v2.0.0)** — जब `--lang` गैर-अंग्रेज़ी होता है, तो Pass 4 / static fallback / gap-fill सभी को अनुवाद करने के लिए `claude` CLI की आवश्यकता होती है। यदि अनुवाद विफल हो जाता है (CLI authenticated नहीं, network timeout, या strict validation ने output को reject कर दिया: <40% length, broken code fences, lost frontmatter, आदि), तो run चुपचाप English लिखने के बजाय abort हो जाता है। Fix: सुनिश्चित करें कि `claude` authenticated है, या अनुवाद skip करने के लिए `--lang en` के साथ फिर से चलाएँ।

**"pass4-memory.json exists but memory/ is empty" (v2.0.0)** — पिछले run ने marker लिखा था लेकिन user (या cleanup script) ने `claudeos-core/memory/` हटा दिया। CLI इस stale marker को ऑटो-डिटेक्ट करता है और अगले `init` पर Pass 4 को re-run करता है। कोई मैन्युअल कार्रवाई आवश्यक नहीं।

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Info log, error नहीं। Pass 4 marker content अब validated है (`passNum === 4` + non-empty `memoryFiles` array), केवल इसके अस्तित्व की नहीं। एक partial Claude failure जिसने marker body के रूप में `{"error":"timeout"}` जैसा कुछ emit किया था, पहले हमेशा के लिए success के रूप में accepted होता था; अब marker हटा दिया जाता है और Pass 4 स्वचालित रूप से re-run होता है।

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` ने एक stale marker डिटेक्ट किया (Pass 3: CLAUDE.md externally deleted था; Pass 4: memory/ खाली या marker body malformed) और इसे हटाने की कोशिश की, लेकिन `unlinkSync` call विफल हो गई — आमतौर पर क्योंकि Windows antivirus या file-watcher (editor, IDE indexer) file handle पकड़े हुए है। पहले इसे चुपचाप ignore किया जाता था, जिससे pipeline pass को skip करता और stale marker को re-use करता। अब यह loudly fail होता है। Fix: कोई भी editor/AV scanner बंद करें जो file को खोले हुए हो सकता है, फिर `npx claudeos-core init` फिर से चलाएँ।

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — आपके shell में test-only env var `CLAUDEOS_SKIP_TRANSLATION=1` set है (संभवतः CI/test setup से leftover) AND गैर-अंग्रेज़ी `--lang` चुना है। यह env var translation path को short-circuit करता है जिस पर Pass 4 की static-fallback और gap-fill गैर-अंग्रेज़ी output के लिए निर्भर करती हैं। `init` language-selection time पर conflict डिटेक्ट करता है और तुरंत abort हो जाता है (mid-Pass-4 में confusing nested error के साथ crash होने के बजाय)। Fix: या तो चलाने से पहले `unset CLAUDEOS_SKIP_TRANSLATION`, या `npx claudeos-core init --lang en` का उपयोग करें।

**"⚠️ v2.2.0 upgrade detected" warning (v2.2.0)** — आपका existing `CLAUDE.md` pre-v2.2.0 version से generated है। Default resume-mode regeneration Rule B idempotency के तहत existing files को skip करेगा, इसलिए v2.2.0 के structural improvements (8-section CLAUDE.md scaffold, per-file `40.infra/*` paths, `.env.example`-based port accuracy, Section 8 `Common Rules & Memory (L4)` (दो sub-section संरचना के साथ पुनः डिज़ाइन: Common Rules · L4 Memory), `60.memory/*` rule row, forward-referenced `04.doc-writing-guide.md`) apply नहीं होंगे। Fix: `npx claudeos-core init --force` के साथ re-run करें। यह generated files (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) को overwrite करता है लेकिन `claudeos-core/memory/` content (आपके accumulated decision-log, failure-patterns entries — append-only) को preserve करता है। Overwrite से पहले diff देखना हो तो `--force` से पहले project को git commit कर दें।

**CLAUDE.md में port `.env.example` से अलग (v2.2.0)** — stack-detector का नया `.env` parser (`lib/env-parser.js`) पहले `.env.example` (canonical, committed) पढ़ता है, फिर `.env` variants को fallback के रूप में। Recognized port variables: `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT`, etc. Spring Boot के लिए, `application.yml` का `server.port` अभी भी `.env` पर precedence रखता है (framework-native config wins)। अगर project unusual env var name use करता है, तो recognized convention पर rename करें या `PORT_VAR_KEYS` extend करने के लिए issue raise करें। Framework defaults (Vite 5173, Next.js 3000, Django 8000) तब use होते हैं जब direct detection और `.env` दोनों silent हों।

**Generated docs में `***REDACTED***` values (v2.2.0)** — Expected behavior। v2.2.0 का `.env` parser `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` patterns से match करने वाले variables के values को automatically `***REDACTED***` से replace कर देता है before किसी भी generator तक पहुंचे। यह `.env.example` में accidentally committed secrets के खिलाफ defense-in-depth है। `DATABASE_URL` stack-detector DB identification back-compat के लिए as-is रहता है। अगर generated `CLAUDE.md` table में `***REDACTED***` दिखे तो वह bug है, please issue file करें — redacted values table तक नहीं पहुंचने चाहिए। Non-sensitive runtime config (port, host, API target, NODE_ENV, etc.) बिना बदलाव pass होता है।

---

## योगदान

योगदान का स्वागत है! जहाँ सबसे ज़्यादा मदद की ज़रूरत है:

- **नए stack templates** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **IDE integration** — VS Code extension, IntelliJ plugin
- **CI/CD templates** — GitLab CI, CircleCI, Jenkins examples (GitHub Actions पहले से shipped — `.github/workflows/test.yml` देखें)
- **Test coverage** — Test suite का विस्तार करना (वर्तमान में 30 test फ़ाइलों में 602 tests जो scanners, stack detection, domain grouping, plan parsing, prompt generation, CLI selectors, monorepo detection, Vite SPA detection, verification tools, L4 memory scaffold, Pass 2 resume validation, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + strict stale-marker unlink), Pass 3 split-mode batch subdivision, Pass 3 partial-marker resume (v2.1.0), Pass 4 marker content validation + stale-marker unlink strictness + scaffoldSkillsManifest gap-fill (v2.1.0), translation env-skip guard + early fail-fast + CI workflow, staged-rules move, lang-aware translation fallback, master plan removal regression suite (v2.1.0), memory score/compact formatting regression (v2.1.0), और AI Work Rules template संरचना, और `.env` parser port/host/API-target extraction + sensitive-variable redaction (v2.2.0) को कवर करते हैं)

क्षेत्रों की पूरी सूची, code style, commit convention, और नया stack template जोड़ने के लिए step-by-step guide के लिए [`CONTRIBUTING.md`](./CONTRIBUTING.md) देखें।

---

## लेखक

**claudeos-core** द्वारा बनाया गया — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## License

ISC
