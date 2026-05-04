# Supported Stacks

12 stacks, सब आपकी project files से auto-detect हो जाते हैं। **8 backend** + **4 frontend**.

> English original: [docs/stacks.md](../stacks.md). हिन्दी translation English के साथ sync में रखा है।

यह page बताता है कि हर stack कैसे detect होता है और per-stack scanner क्या निकालता है। Use कीजिए:

- Check करने के लिए कि आपका stack supported है या नहीं।
- Generation से पहले scanner Claude को कौन से facts pass करेगा, यह समझने के लिए।
- `claudeos-core/generated/project-analysis.json` में क्या expect करना है, यह देखने के लिए।

आपके project का structure unusual है तो `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखिए।

---

## Detection कैसे काम करती है

`init` चलते समय scanner project root पर लगभग इस order में ये files खोलता है:

| File | scanner को क्या बताती है |
|---|---|
| `package.json` | Node.js project; framework `dependencies` से |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; framework packages से |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Vue/Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |

कुछ भी match न हो तो `init` अंदाज़ा लगाने की जगह साफ़ error के साथ रुक जाता है। (कोई "LLM से पूछ लो ये क्या है" fallback नहीं। चुपचाप ग़लत docs generate करने से बेहतर है ज़ोर से fail होना.)

Actual detection logic पढ़ना चाहें तो scanner `plan-installer/stack-detector.js` में है।

---

## Backend stacks (8)

### Java / Spring Boot

**Detect कब होता है:** `build.gradle` या `pom.xml` में `spring-boot-starter` हो। Java को Kotlin से Gradle plugin block से distinguish किया जाता है।

**Architecture pattern detection.** Scanner आपके project को **5 patterns में से एक** में classify करता है:

| Pattern | Example structure |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Patterns क्रम से try होते हैं (A → B/D → E → C). Scanner में दो refinements भी हैं: (1) **root-package detection** सबसे लंबा package prefix चुनता है जो ≥80% layer-bearing files cover करे (re-runs में deterministic); (2) Pattern B/D के लिए **deep-sweep fallback**. Standard globs किसी registered domain के लिए zero files लौटाएँ, तो scanner `**/${domain}/**/*.java` दोबारा glob करता है और हर file का path walk करके nearest layer dir ढूँढता है, `core/{otherDomain}/{layer}/{domain}/` जैसे cross-domain coupling layouts पकड़ लेता है।

**निकाले गए facts:**
- Stack, framework version, ORM (JPA / MyBatis / jOOQ)
- DB type (Postgres / MySQL / Oracle / MariaDB / H2. H2 detection `\bh2\b` word-boundary regex use करती है ताकि `oauth2`, `cache2k` जैसे cases पर false positives न हों)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- File counts के साथ domain list (controllers, services, mappers, dtos, MyBatis XML mappers)

Scanner `plan-installer/scanners/scan-java.js` में है।

---

### Kotlin / Spring Boot

**Detect कब होता है:** `build.gradle.kts` मौजूद हो और Spring Boot के साथ Kotlin plugin apply हो। Java से पूरी तरह अलग code path है, Java patterns reuse नहीं करता।

**ख़ासतौर से detect करता है:**
- **CQRS**: अलग command/query packages
- **BFF**: backend-for-frontend pattern
- **Multi-module Gradle**: `settings.gradle.kts` में `include(":module")` के साथ
- **Modules में shared query domains**: `resolveSharedQueryDomains()` package/class-name decomposition से shared query module files redistribute करता है

**Supported ORMs:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Kotlin को अपना scanner क्यों मिला:** Java patterns Kotlin codebases में अच्छी तरह fit नहीं होते। Kotlin projects CQRS और multi-module setups की तरफ़ झुकते हैं, जिन्हें Java का pattern-A-through-E classification साफ़ ढंग से capture नहीं कर पाता।

Scanner `plan-installer/scanners/scan-kotlin.js` में है।

---

### Node / Express

**Detect कब होता है:** `package.json` dependencies में `express` हो।

**Stack detector पहचानता है:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB type, package manager (npm / yarn / pnpm), TypeScript usage.

**Domain discovery:** Shared Node.js scanner (`plan-installer/scanners/scan-node.js`) `src/*/` पर चलता है (या `src/modules/*/` अगर NestJS-style modules हों), `controller|router|route|handler`, `service`, `dto|schema|type`, और entity/module/guard/pipe/interceptor patterns से match होती files गिनता है। Express, Fastify, NestJS तीनों के लिए वही scanner code path use होता है। Framework name तय करता है कौन सा Pass 1 prompt select होगा, scanner कौन सा चलेगा यह नहीं।

---

### Node / Fastify

**Detect कब होता है:** dependencies में `fastify` हो।

Domain discovery ऊपर वाला shared `scan-node.js` scanner ही use करती है। Pass 1 एक Fastify-specific prompt template use करता है जो Claude से Fastify के plugin patterns और route schemas देखने को कहता है।

---

### Node / NestJS

**Detect कब होता है:** dependencies में `@nestjs/core` हो।

Domain discovery shared `scan-node.js` scanner use करती है। NestJS का standard `src/modules/<module>/` layout automatically detect हो जाता है (दोनों मौजूद हों तो `src/*/` पर priority) और हर module एक domain बन जाता है। Pass 1 एक NestJS-specific prompt template use करता है।

---

### Python / Django

**Detect कब होता है:** substring `django` (lowercase) `requirements.txt` या `pyproject.toml` में दिखे। Standard package-manager declarations lowercase use करते हैं, इसलिए normal projects में match हो जाता है।

**Domain discovery:** Scanner `**/models.py` पर चलता है और `models.py` वाली हर directory को Django app/domain मानता है। (`settings.py` से `INSTALLED_APPS` parse नहीं करता. On-disk `models.py` की मौजूदगी ही signal है.)

**Per-domain stats:** `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks` से match होती files गिनता है।

---

### Python / FastAPI

**Detect कब होता है:** dependencies में `fastapi` हो।

**Domain discovery:** glob `**/{router,routes,endpoints}*.py`. हर unique parent directory एक domain बन जाती है। Scanner `APIRouter(...)` calls parse नहीं करता, filename ही signal है।

**stack-detector से detect होने वाले ORMs:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Detect कब होता है:** dependencies में `flask` हो।

**Domain discovery:** FastAPI जैसा ही `**/{router,routes,endpoints}*.py` glob use करता है। उससे कुछ न मिले तो scanner `{app,src/app}/*/` directories पर fallback करता है।

**Flat-project fallback (v1.7.1):** कोई domain candidate न मिले तो scanner project root पर `{main,app}.py` ढूँढता है और project को single-domain "app" मान लेता है।

---

## Frontend stacks (4)

### Node / Next.js

**Detect कब होता है:** `next.config.{ts,js}` मौजूद हो, या `package.json` dependencies में `next` हो।

**Routing convention detect करता है:**

- **App Router** (Next.js 13+): `page.tsx`/`layout.tsx` के साथ `app/` directory
- **Pages Router** (legacy): `pages/` directory
- **FSD (Feature-Sliced Design)**: `src/features/`, `src/widgets/`, `src/entities/`

**Scanner निकालता है:**
- Routing mode (App Router / Pages Router / FSD)
- RSC vs Client component counts (Next.js App Router. वो files गिनकर जिनके नाम में `client.` हो जैसे `client.tsx`. Source के अंदर `"use client"` directives parse करके नहीं.)
- `app/` या `pages/` से domain list (और FSD के लिए `src/features/` वग़ैरह)

State management, styling, और data-fetching libraries scanner level पर detect नहीं होतीं। Pass 1 prompts Claude को source code में वो patterns देखने को बोलते हैं।

---

### Node / Vite

**Detect कब होता है:** `vite.config.{ts,js}` मौजूद हो, या dependencies में `vite` हो।

Default port `5173` है (Vite convention), last-resort fallback की तरह apply होता है। Scanner `vite.config` को `server.port` के लिए parse नहीं करता. आपके project में `.env*` में port declare है तो env-parser उसे पहले उठा लेता है।

Stack detector सिर्फ़ Vite खुद पहचानता है। Underlying UI framework (जब React default fallback न हो) Pass 1 में LLM source code से identify करता है, scanner नहीं।

---

### Angular

**Detect कब होता है:** `angular.json` मौजूद हो, या dependencies में `@angular/core` हो।

**Detect करता है:**
- **Feature module** structure: `src/app/<feature>/`
- **Monorepo workspaces**: सामान्य `apps/*/src/app/*/` और `packages/*/src/app/*/` patterns (NX layouts पर काम करता है, हालाँकि `nx.json` खुद explicit detection signal नहीं है)

Default port `4200` है (Angular convention), last-resort fallback की तरह apply. Scanner `angular.json` सिर्फ़ stack detection के लिए पढ़ता है, port extraction के लिए नहीं। आपके project में `.env*` file में port declare है तो env-parser उसे पहले उठा लेता है।

---

### Vue / Nuxt

**Detect कब होता है:** Nuxt के लिए `nuxt.config.{ts,js}` मौजूद हो, plain Vue के लिए dependencies में `vue` हो।

Scanner framework identify करता है और frontend domain extraction (App/Pages/FSD/components patterns) चलाता है। Nuxt version और module detection (Pinia, VueUse वग़ैरह) Pass 1 के हवाले हैं। Scanner `package.json` का pattern-match करने के बजाय Claude source पढ़कर पहचानता है कि क्या use हो रहा है।

---

## Multi-stack projects

Backend और frontend दोनों वाले project (जैसे `backend/` में Spring Boot + `frontend/` में Next.js) पूरी तरह supported हैं।

हर stack अपना **खुद का scanner** अपने **खुद के analysis prompt** के साथ चलाता है। Merged Pass 2 output दोनों stacks cover करता है। Pass 3 हर एक के लिए अलग rule और standard files generate करता है, ऐसे organized:

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

`70.domains/{type}/` typing **हमेशा-on** है। आपका project single-stack भी है तो layout `70.domains/backend/` (या `frontend/`) ही use करता है। इससे convention uniform रहती है: single-stack project बाद में दूसरा stack add करे तो कोई migration नहीं चाहिए।

**Multi-stack detection** ये उठाता है:
- Project root पर monorepo manifest: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- `workspaces` field वाली root `package.json`

Monorepo detect हो जाने पर scanner `apps/*/package.json` और `packages/*/package.json` (और manifest से कोई भी custom workspace globs) पर चलता है, dependency lists merge करता है, और ज़रूरत के हिसाब से backend और frontend दोनों scanners चलाता है।

---

## Frontend platform-split detection

कुछ frontend projects top level पर platform (PC, mobile, admin) के हिसाब से organize होते हैं:

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

Scanner `src/{platform}/{subapp}/` detect करता है और हर `{platform}-{subapp}` को अलग domain की तरह emit करता है। Default platform keywords:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

`.claudeos-scan.json` में `frontendScan.platformKeywords` से custom keywords add कीजिए ([advanced-config.md](advanced-config.md) देखिए).

**Single-SPA skip rule (v2.3.0):** Project tree में सिर्फ़ एक platform keyword match हो (जैसे project में `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` है, और कोई platform नहीं), तो subapp emission skip हो जाती है। वरना architectural layers (`api`, `dto`, `routers`) झूठे feature domains की तरह emit हो जाएँगे।

फिर भी subapp emission force करना है तो `.claudeos-scan.json` में `frontendScan.forceSubappSplit: true` set कीजिए। [advanced-config.md](advanced-config.md) देखिए।

---

## `.env` extraction (v2.2.0+)

Scanner runtime configuration के लिए `.env*` files पढ़ता है, ताकि generate होने वाले docs आपके actual port, host, और DB URL reflect करें।

**Search order** (पहला match जीतता है):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Sensitive-variable redaction:** `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET` वग़ैरह से match होती keys `project-analysis.json` में copy होने से पहले automatically `***REDACTED***` हो जाती हैं। **Exception:** `DATABASE_URL` whitelist में है क्योंकि scanner को DB type detect करने के लिए protocol चाहिए।

**Port resolution precedence:**
1. Spring Boot `application.yml` `server.port`
2. `.env` port keys (16+ convention keys checked, specificity के हिसाब से ordered. Vite-specific पहले, generic `PORT` आख़िर में.)
3. Stack default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

Parser `lib/env-parser.js` में है। Tests `tests/env-parser.test.js` में हैं।

---

## Scanner क्या produce करता है: `project-analysis.json`

Step A खत्म होने पर यह file `claudeos-core/generated/project-analysis.json` पर मिलेगी। Top-level keys (stack के हिसाब से बदलती हैं):

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

यह file सीधे पढ़कर देख सकते हैं कि scanner ने आपके project से actually क्या निकाला।

---

## नया stack add करना

Scanner architecture modular है। नया stack add करने के लिए चाहिए:

1. एक `plan-installer/scanners/scan-<stack>.js` file (domain extraction logic).
2. तीन Claude prompt templates: `pass-prompts/templates/<stack>/` के नीचे `pass1.md`, `pass2.md`, `pass3.md`.
3. `plan-installer/stack-detector.js` में add की गईं stack-detection rules.
4. `bin/commands/init.js` में dispatcher में routing.
5. `tests/fixtures/<stack>/` के नीचे एक fixture project के साथ tests.

पूरी guide और copy करने लायक़ reference implementations के लिए [CONTRIBUTING.md](../../CONTRIBUTING.md) देखिए।

---

## Scanner behavior override कीजिए

आपके project का structure unusual है या auto-detection ग़लत stack चुन रहा है, तो project root पर एक `.claudeos-scan.json` file रखिए।

उपलब्ध override fields के लिए [advanced-config.md](advanced-config.md) देखिए।
