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

### Java / Spring Framework (Boot के बिना) और legacy JVM (v2.5.1+) — ऊपर वाले Java stack का variant, वही template

**कब detect होता है:** जब build किसी JVM plugin को declare करता हो, या ऐसी dependency को जिसका group **बिल्कुल** `org.springframework` हो (Spring 1.x में `springframework`) — Spring Boot हो या न हो। `org.springframework.boot` / `.security` / `.data` / `.cloud` अलग projects हैं और इन्हें कभी Spring Framework नहीं बताया जाता।

| Build का रूप | पढ़ा गया evidence |
|---|---|
| Gradle, `apply plugin:` युग | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`; `compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`; `group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`; `org.springframework:spring:2.5.6` (2.x युग का single jar) |
| Gradle, `plugins { }` / Kotlin DSL | `id 'java'`, अकेला `java` / `war` / `` `java-library` ``, `apply(plugin = "war")`; `platform()` / `mavenBom` के ज़रिए `spring-framework-bom`; version catalog `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle, variables | `ext { springVersion = '…' }`, `def` / `val`, **`gradle.properties`** (उसी file की definition जीतती है), `${project.x}` / `${rootProject.ext.x}`, Groovy map `${versions.spring}`, buildSrc `${Versions.spring}`, `apply from:` scripts; Boot 1.x/2.x `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`; `options.release = 17` |
| Spring 1.x | `org.` के बिना group `springframework` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`; `<groupId>org.springframework</groupId>` वाली dependencies (comments हटाकर); `spring-framework-bom` import; `<spring.version>` / `<spring.maven.version>` properties; `spring-boot-starter-parent` का `<version>`; `spring-boot-dependencies` BOM; `<maven.compiler.release>`; Maven 2 युग के `maven-compiler-plugin` का `<source>1.5</source>`; **multi-module**: `<modules>` के children (≤30) |
| Repository की बनावट | सिर्फ़ `settings.gradle` वाला root; root में build file नहीं पर `*/pom.xml` sibling projects (depth 1, ≤30) |
| IDE metadata | `.settings/org.eclipse.jdt.core.prefs` का compliance; `.classpath` में JRE नाम (`jdk1.6.0_45`) और `kind="lib"/"var"` वाले jar paths (jar commit किए बिना भी); `.idea/misc.xml` का `languageLevel`; `nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`), `ivy.xml` (`org="org.springframework"` exact, `rev="…"`) |
| Eclipse WTP / बिना build tool | `.classpath` का JRE container (`JavaSE-1.7`), `.project` का `javanature`; `**/{WEB-INF/lib,lib,libs}/**/*.jar` के नामों से → Spring version (`spring-webmvc-3.0.5.RELEASE.jar`), JDBC driver (`ojdbc*`, `mysql-connector`, `mariadb-java-client`, `postgresql-`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `jtds`, `db2jcc`, Tibero / Altibase / Cubrid), ORM (`ibatis-*`, `mybatis-*`, `hibernate-*`) — सिर्फ़ तब जब पास में `*.java` sources हों |
| Deployment descriptor | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC, `war`), Struts filters (tag), `<web-app version>`; Spring XML का `spring-*-3.0.xsd` → major.minor version, सबसे कम priority |
| eGovFrame | `egovframework.rte[.*]` coordinates → `spring-framework` और `detected` में `egovframe <version>` tag |

**निकाले गए facts (ऊपर की Spring Boot सूची के अलावा):** `frameworkVersion` के साथ `framework: "spring-framework"`, `packaging` (`war` / `ear` / `jar` / `pom` — सिर्फ़ जब declare किया गया हो), `springFrameworkVersion` (उन Boot projects के लिए भी भरा जाता है जो Framework version स्पष्ट रूप से pin करते हैं), और जब source root `src/main/java` न हो तो `sourceLayout: "legacy"`।

**Version नीति.** हर version string किसी build file, jar नाम, या उसी project में define की गई variable/property का substring है। जो `${var}` resolve न हो वह literal नहीं बल्कि `null` देता है; नाम में version न रखने वाला Spring 2.0 युग का `spring.jar` सिर्फ़ framework बताता है, `frameworkVersion: null` के साथ। framework के default से कुछ भी नहीं लिया जाता।

**Precedence.** पहले build files (Gradle / Maven), फिर Node / Python manifests, और सबसे आख़िर में ऊपर वाला legacy evidence। यह evidence सिर्फ़ उस language को भर सकता है जिस पर किसी ने दावा न किया हो, या एक *provisional* Node language वापस ले सकता है (root `package.json` जिसमें न framework मिला न frontend framework — यानी asset tooling), और वह भी सिर्फ़ मज़बूत evidence पर: `build.xml`, javanature वाला `.project`, sibling build file, या `WEB-INF/web.xml`। कोई Next.js / Django project किसी भटके हुए `.idea/` या vendored jar की वजह से Java में नहीं बदलता; जिस jar directory में `*.java` sources न हों वह कुछ भी दावा नहीं करती।

**False-positive guards.** जिस JVM project में Spring है ही नहीं (`java-library`, `application`, सिर्फ़ servlet वाला `war`, अकेला Struts 1/2) उसे `framework: null` के साथ Java बताया जाता है। `com.android.application` JVM का `application` plugin नहीं है। Spring Framework इस्तेमाल करने वाला Kotlin project `language: kotlin` ही रहता है।

**Source roots.** `scan-java` अपने `src/main/java` / `src/main/resources` patterns को मिली हुई root के हिसाब से फिर से लिखता है। अगर कोई भी `[<module>/]src/main/java` मौजूद है तो सिर्फ़ वही इस्तेमाल होते हैं। नहीं तो इस क्रम में: `.classpath` की `kind="src"` entries (test folders छोड़कर), `build.xml` का `<javac srcdir>` (`<property>` resolution सहित), फिर `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src` — बशर्ते उनमें `*.java` हो। उसके बाद वही पाँच domain patterns लगते हैं, इसलिए `src/com/acme/erp/controller/*.java` ठीक वैसे ही Pattern C है जैसे `src/main/java` के नीचे होता।

**ज्ञात सीमाएँ.** Gradle files से comments नहीं हटाए जाते (`//` से comment किया coordinate भी गिना जाता है — Boot के लिए हमेशा से ऐसा ही रहा है)। Repository के बाहर के parent pom से inheritance resolve नहीं होती। v2.5.2 से `web/` को HTTP layer के रूप में पहचाना जाता है, लेकिन सिर्फ़ उस project में जिसमें कहीं भी `controller/` directory न हो; जिस tree में दोनों conventions module दर module मिली-जुली हों, वहाँ `web/` वाले modules पुराना व्यवहार (`controllers: 0`) बनाए रखते हैं।

Helpers `plan-installer/jvm-detect.js` में हैं (pure text functions, अलग से unit-tested)।

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

**Sensitive-variable redaction:** `PASSWORD`, `PASS`, `PW`, `PASSPHRASE`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` वग़ैरह से match होती keys `project-analysis.json` में copy होने से पहले automatically `***REDACTED***` हो जाती हैं। बाक़ी हर URL जैसी value (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`) में credentials को `***:***` से mask कर दिया जाता है, जबकि scheme, host, port और path वैसे ही रहते हैं (`postgres://***:***@db.internal:5432/app`): DB type अब भी पहचाना जा सकता है, और password कभी file तक नहीं पहुँचता। Scanner का अपना DB-type detection raw `.env` text सीधे पढ़ता है, इसलिए उस पर कोई असर नहीं पड़ता। अगर password में बिना encode किया `/`, `?` या `#` हो (base64 से बने passwords में यह आम है), तो URL की authority अस्पष्ट हो जाती है, इसलिए v2.5.2 से ऐसा value आंशिक mask होने के बजाय पूरा हटा दिया जाता है (`***REDACTED***`)। इसके साथ host भी चला जाता है, और `init` अपनी Phase 1 summary में प्रभावित keys के नाम बताता है (`envInfo.credentialWarnings`, सिर्फ़ key नाम)। Host दिखता रहे इसके लिए password को percent-encode करें (`/` को `%2F`)।

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
    "envInfo": { "source": ".env.example", "vars": {...}, "portVars": {...}, "credentialWarnings": [], "port": 8080, "host": "localhost", "apiTarget": null },
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
