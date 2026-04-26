# Supported Stacks

12 stacks, सभी आपकी प्रोजेक्ट फ़ाइलों से auto-detect होते हैं। **8 backend** + **4 frontend**।

> अंग्रेज़ी मूल: [docs/stacks.md](../stacks.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

यह पृष्ठ बताता है कि प्रत्येक stack का पता कैसे लगाया जाता है और प्रति-stack scanner क्या निकालता है। इसका उपयोग करें:

- यह जाँचने के लिए कि क्या आपका stack समर्थित है।
- यह समझने के लिए कि generation से पहले scanner Claude को क्या तथ्य पास करेगा।
- `claudeos-core/generated/project-analysis.json` में क्या अपेक्षा करनी है यह देखने के लिए।

यदि आपकी प्रोजेक्ट संरचना असामान्य है, तो `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखें।

---

## Detection कैसे काम करता है

जब `init` चलता है, scanner लगभग इस क्रम में प्रोजेक्ट रूट पर इन फ़ाइलों को खोलता है:

| फ़ाइल | scanner को क्या बताती है |
|---|---|
| `package.json` | Node.js project; `dependencies` के माध्यम से framework |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; packages के माध्यम से framework |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Vue/Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |

यदि कुछ भी मेल नहीं खाता, तो `init` अनुमान लगाने के बजाय एक स्पष्ट त्रुटि के साथ रुकता है। (कोई "LLM से पूछो-यह-क्या-है" fallback नहीं। चुपचाप गलत docs उत्पन्न करने की बजाय ज़ोर से fail करना बेहतर है।)

यदि आप वास्तविक detection logic पढ़ना चाहते हैं तो scanner `plan-installer/stack-detector.js` में है।

---

## Backend stacks (8)

### Java / Spring Boot

**तब detect होता है जब:** `build.gradle` या `pom.xml` में `spring-boot-starter` होता है। Java को Kotlin से Gradle plugin block के माध्यम से अलग पहचाना जाता है।

**Architecture pattern detection.** Scanner आपके प्रोजेक्ट को **5 patterns में से एक** में वर्गीकृत करता है:

| Pattern | उदाहरण संरचना |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Patterns को क्रम में आज़माया जाता है (A → B/D → E → C)। Scanner में दो परिष्करण भी हैं: (1) **root-package detection** सबसे लंबा package prefix चुनता है जो ≥80% layer-bearing files को कवर करता है (re-runs में deterministic); (2) **deep-sweep fallback** Pattern B/D के लिए — जब standard globs एक registered domain के लिए शून्य फ़ाइलें लौटाते हैं, scanner `**/${domain}/**/*.java` को फिर से glob करता है और प्रत्येक फ़ाइल के path पर चलकर निकटतम layer dir खोजता है, `core/{otherDomain}/{layer}/{domain}/` जैसे cross-domain coupling layouts को पकड़ता है।

**निकाले गए तथ्य:**
- Stack, framework version, ORM (JPA / MyBatis / jOOQ)
- DB type (Postgres / MySQL / Oracle / MariaDB / H2 — H2 detection `\bh2\b` word-boundary regex का उपयोग करता है ताकि `oauth2`, `cache2k` आदि पर false positives से बचा जा सके)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- फ़ाइल गणना के साथ Domain list (controllers, services, mappers, dtos, MyBatis XML mappers)

Scanner `plan-installer/scanners/scan-java.js` में है।

---

### Kotlin / Spring Boot

**तब detect होता है जब:** `build.gradle.kts` मौजूद है और Spring Boot के साथ Kotlin plugin लागू है। Java से पूरी तरह अलग code path है — Java patterns का पुन: उपयोग नहीं करता।

**विशेष रूप से detect करता है:**
- **CQRS** — अलग command/query packages
- **BFF** — backend-for-frontend pattern
- **Multi-module Gradle** — `settings.gradle.kts` में `include(":module")` के साथ
- **Modules में shared query domains** — `resolveSharedQueryDomains()` package/class-name decomposition के माध्यम से shared query module files को पुनर्वितरित करता है

**समर्थित ORMs:** Exposed, jOOQ, JPA (Hibernate), R2DBC।

**Kotlin को अपना scanner क्यों मिलता है:** Java patterns Kotlin codebases में अच्छी तरह फिट नहीं होते। Kotlin projects CQRS और multi-module setups की ओर झुकते हैं जिन्हें Java का pattern-A-through-E वर्गीकरण साफ़ ढंग से नहीं दर्शा सकता।

Scanner `plan-installer/scanners/scan-kotlin.js` में है।

---

### Node / Express

**तब detect होता है जब:** `package.json` dependencies में `express` होता है।

**Stack detector पहचानता है:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB type, package manager (npm / yarn / pnpm), TypeScript उपयोग।

**Domain discovery:** साझा Node.js scanner (`plan-installer/scanners/scan-node.js`) `src/*/` (या `src/modules/*/` यदि NestJS-style modules मौजूद हों) पर चलता है, `controller|router|route|handler`, `service`, `dto|schema|type`, और entity/module/guard/pipe/interceptor patterns से मेल खाने वाली फ़ाइलें गिनता है। एक ही scanner code path Express, Fastify और NestJS के लिए उपयोग होता है — framework नाम तय करता है कि कौन सा Pass 1 prompt चुना जाता है, यह नहीं कि कौन सा scanner चलता है।

---

### Node / Fastify

**तब detect होता है जब:** dependencies में `fastify` होता है।

Domain discovery ऊपर वर्णित उसी साझा `scan-node.js` scanner का उपयोग करता है। Pass 1 एक Fastify-विशिष्ट prompt template का उपयोग करता है जो Claude से Fastify के plugin patterns और route schemas देखने के लिए कहता है।

---

### Node / NestJS

**तब detect होता है जब:** dependencies में `@nestjs/core` होता है।

Domain discovery साझा `scan-node.js` scanner का उपयोग करता है। NestJS का standard `src/modules/<module>/` layout स्वतः detect हो जाता है (दोनों मौजूद होने पर `src/*/` पर प्राथमिकता) और प्रत्येक module एक domain बन जाता है। Pass 1 एक NestJS-विशिष्ट prompt template का उपयोग करता है।

---

### Python / Django

**तब detect होता है जब:** substring `django` (lowercase) `requirements.txt` या `pyproject.toml` में दिखाई देता है। Standard package-manager declarations lowercase का उपयोग करते हैं, इसलिए यह सामान्य projects से मेल खाता है।

**Domain discovery:** Scanner `**/models.py` पर चलता है और `models.py` वाले प्रत्येक directory को Django app/domain मानता है। (यह `settings.py` से `INSTALLED_APPS` को parse नहीं करता — on-disk `models.py` की उपस्थिति संकेत है।)

**प्रति-domain stats:** `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks` से मेल खाने वाली फ़ाइलें गिनता है।

---

### Python / FastAPI

**तब detect होता है जब:** dependencies में `fastapi` होता है।

**Domain discovery:** glob `**/{router,routes,endpoints}*.py` — प्रत्येक अद्वितीय parent directory एक domain बन जाता है। Scanner `APIRouter(...)` calls को parse नहीं करता; filename संकेत है।

**stack-detector द्वारा detect किए गए ORMs:** SQLAlchemy, Tortoise ORM।

---

### Python / Flask

**तब detect होता है जब:** dependencies में `flask` होता है।

**Domain discovery:** FastAPI के समान `**/{router,routes,endpoints}*.py` glob का उपयोग करता है। यदि वह कुछ नहीं देता, तो scanner `{app,src/app}/*/` directories पर fallback करता है।

**Flat-project fallback (v1.7.1):** यदि कोई domain candidates नहीं मिलते, scanner project root पर `{main,app}.py` खोजता है और project को single-domain "app" मानता है।

---

## Frontend stacks (4)

### Node / Next.js

**तब detect होता है जब:** `next.config.{ts,js}` मौजूद है, या `package.json` dependencies में `next` है।

**Routing convention detect करता है:**

- **App Router** (Next.js 13+) — `page.tsx`/`layout.tsx` के साथ `app/` directory
- **Pages Router** (legacy) — `pages/` directory
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**Scanner निकालता है:**
- Routing mode (App Router / Pages Router / FSD)
- RSC vs Client component counts (Next.js App Router — उन फ़ाइलों को गिनकर जिनके नाम में `client.` होता है जैसे `client.tsx`, source के अंदर `"use client"` directives parse करके नहीं)
- `app/` या `pages/` से domain list (और FSD के लिए `src/features/` आदि)

State management, styling, और data-fetching libraries scanner स्तर पर detect नहीं होतीं। Pass 1 prompts Claude से source code में उन patterns को देखने के लिए कहते हैं।

---

### Node / Vite

**तब detect होता है जब:** `vite.config.{ts,js}` मौजूद है, या dependencies में `vite` है।

Default port `5173` (Vite convention) है — last-resort fallback के रूप में लागू। Scanner `vite.config` को `server.port` के लिए parse नहीं करता; यदि आपका project `.env*` में port declare करता है, तो env-parser इसे पहले उठाता है।

Stack detector Vite को ही पहचानता है; अंतर्निहित UI framework — जब React (default fallback) नहीं है — Pass 1 में LLM द्वारा source code से पहचाना जाता है, scanner द्वारा नहीं।

---

### Angular

**तब detect होता है जब:** `angular.json` मौजूद है, या dependencies में `@angular/core` है।

**Detect करता है:**
- **Feature module** संरचना — `src/app/<feature>/`
- **Monorepo workspaces** — सामान्य `apps/*/src/app/*/` और `packages/*/src/app/*/` patterns (NX layouts के लिए काम करता है यद्यपि `nx.json` स्वयं एक स्पष्ट detection signal नहीं है)

Default port `4200` (Angular convention) है — last-resort fallback के रूप में लागू। Scanner `angular.json` को केवल stack detection के लिए पढ़ता है, port extraction के लिए नहीं; यदि आपका project `.env*` फ़ाइल में port declare करता है, तो env-parser इसे पहले उठाता है।

---

### Vue / Nuxt

**तब detect होता है जब:** Nuxt के लिए `nuxt.config.{ts,js}` मौजूद है, या plain Vue के लिए dependencies में `vue` है।

Scanner framework की पहचान करता है और frontend domain extraction (App/Pages/FSD/components patterns) चलाता है। Nuxt version और module detection (Pinia, VueUse, आदि) Pass 1 को सौंप दिए जाते हैं — Claude source पढ़ता है और पहचानता है कि क्या उपयोग होता है, बजाय इसके कि scanner `package.json` का pattern-match करे।

---

## Multi-stack projects

backend और frontend दोनों वाला project (उदाहरण: `backend/` में Spring Boot + `frontend/` में Next.js) पूरी तरह से समर्थित है।

प्रत्येक stack अपना **खुद का scanner** अपने **खुद के analysis prompt** के साथ चलाता है। Merged Pass 2 आउटपुट दोनों stacks को कवर करता है। Pass 3 प्रत्येक के लिए अलग rule और standard फ़ाइलें उत्पन्न करता है, इस तरह संगठित:

```
.claude/rules/
├── 10.backend/                  ← Spring Boot rules
├── 20.frontend/                 ← Next.js rules
└── 70.domains/
    ├── backend/                 ← per-backend-domain
    └── frontend/                ← per-frontend-domain

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

`70.domains/{type}/` typing **हमेशा-चालू** है — यदि आपका project single-stack भी है, तो layout `70.domains/backend/` (या `frontend/`) का उपयोग करता है। यह convention को एकसमान रखता है: जब एक single-stack project बाद में दूसरा stack जोड़ता है, तो किसी migration की आवश्यकता नहीं।

**Multi-stack detection** उठाता है:
- प्रोजेक्ट रूट पर एक monorepo manifest: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- `workspaces` field के साथ root `package.json`

जब एक monorepo detect होता है, scanner `apps/*/package.json` और `packages/*/package.json` (और manifest से किसी भी custom workspace globs) पर चलता है, dependency lists को merge करता है, और आवश्यकतानुसार backend और frontend दोनों scanners चलाता है।

---

## Frontend platform-split detection

कुछ frontend projects शीर्ष स्तर पर platform (PC, mobile, admin) द्वारा संगठित होते हैं:

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

Scanner `src/{platform}/{subapp}/` का पता लगाता है और प्रत्येक `{platform}-{subapp}` को एक अलग domain के रूप में emit करता है। Default platform keywords:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

`.claudeos-scan.json` में `frontendScan.platformKeywords` के माध्यम से custom keywords जोड़ें ([advanced-config.md](advanced-config.md) देखें)।

**Single-SPA skip rule (v2.3.0):** यदि project tree में केवल एक platform keyword मेल खाता है (उदाहरण: project में `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` है, कोई अन्य platforms नहीं), तो subapp emission छोड़ दिया जाता है। अन्यथा, architectural layers (`api`, `dto`, `routers`) झूठे feature domains के रूप में emit होंगे।

subapp emission को फिर भी force करने के लिए, `.claudeos-scan.json` में `frontendScan.forceSubappSplit: true` सेट करें। [advanced-config.md](advanced-config.md) देखें।

---

## `.env` extraction (v2.2.0+)

Scanner runtime configuration के लिए `.env*` फ़ाइलें पढ़ता है ताकि उत्पन्न docs आपके वास्तविक port, host, और DB URL को दर्शाएँ।

**Search order** (पहला match जीतता है):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Sensitive-variable redaction:** `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET` आदि से मेल खाने वाली keys को `project-analysis.json` में copy करने से पहले स्वतः `***REDACTED***` कर दिया जाता है। **अपवाद:** `DATABASE_URL` को whitelist किया गया है क्योंकि scanner को DB type detect करने के लिए protocol चाहिए।

**Port resolution precedence:**
1. Spring Boot `application.yml` `server.port`
2. `.env` port keys (16+ convention keys checked, specificity द्वारा ordered — Vite-specific पहले, generic `PORT` अंतिम)
3. Stack default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

Parser `lib/env-parser.js` में है। Tests `tests/env-parser.test.js` में हैं।

---

## Scanner क्या उत्पन्न करता है — `project-analysis.json`

Step A समाप्त होने के बाद, आप यह फ़ाइल `claudeos-core/generated/project-analysis.json` पर पाएँगे। Top-level keys (stack के अनुसार बदलती हैं):

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

आप यह फ़ाइल सीधे पढ़ सकते हैं ताकि देख सकें कि scanner ने आपके प्रोजेक्ट से वास्तव में क्या निकाला।

---

## एक नया stack जोड़ना

Scanner architecture modular है। एक नया stack जोड़ने के लिए चाहिए:

1. एक `plan-installer/scanners/scan-<stack>.js` फ़ाइल (domain extraction logic)।
2. तीन Claude prompt templates: `pass-prompts/templates/<stack>/` के तहत `pass1.md`, `pass2.md`, `pass3.md`।
3. `plan-installer/stack-detector.js` में जोड़े गए Stack-detection नियम।
4. `bin/commands/init.js` में dispatcher में routing।
5. `tests/fixtures/<stack>/` के तहत एक fixture project के साथ tests।

पूर्ण गाइड और कॉपी करने के लिए reference implementations के लिए [CONTRIBUTING.md](../../CONTRIBUTING.md) देखें।

---

## Scanner व्यवहार override करें

यदि आपके project की संरचना असामान्य है या auto-detection गलत stack चुनता है, तो अपने project root पर एक `.claudeos-scan.json` फ़ाइल रखें।

उपलब्ध override fields के लिए [advanced-config.md](advanced-config.md) देखें।
