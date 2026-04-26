# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Claude Code को पहली कोशिश में ही _आपके प्रोजेक्ट की_ परिपाटियों का पालन करवाएँ — generic defaults का नहीं।**

एक deterministic Node.js scanner पहले आपके कोड को पढ़ता है; फिर एक 4-pass Claude पाइपलाइन पूरा सेट लिखती है — `CLAUDE.md` + auto-loaded `.claude/rules/` + standards + skills + L4 memory. 10 output भाषाएँ, 5 post-generation validators, और एक स्पष्ट path allowlist जो LLM को आपके कोड में मौजूद न होने वाली फ़ाइलें या frameworks आविष्कार करने से रोकता है।

[**12 stacks**](#supported-stacks) पर काम करता है (monorepos सहित) — एक `npx` command, कोई config नहीं, resume-safe, idempotent.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## यह क्या है?

आप Claude Code का उपयोग करते हैं। यह शक्तिशाली है, लेकिन हर session नए सिरे से शुरू होता है — इसे _आपके_ प्रोजेक्ट की संरचना की कोई स्मृति नहीं होती। इसलिए यह "generally good" defaults पर fallback करता है जो आपकी टीम वास्तव में जो करती है उससे शायद ही मेल खाते हैं:

- आपकी टीम **MyBatis** का उपयोग करती है, लेकिन Claude JPA repositories उत्पन्न करता है।
- आपका response wrapper `ApiResponse.ok()` है, लेकिन Claude `ResponseEntity.success()` लिखता है।
- आपके packages layer-first (`controller/order/`) हैं, लेकिन Claude domain-first (`order/controller/`) बनाता है।
- आपकी errors centralized middleware से जाती हैं, लेकिन Claude हर endpoint में `try/catch` बिखेर देता है।

आप चाहेंगे कि प्रति प्रोजेक्ट एक `.claude/rules/` set हो — Claude Code इसे हर session में स्वतः लोड करता है — लेकिन हर नए repo के लिए हाथ से वे rules लिखने में घंटों लगते हैं, और कोड के विकसित होने के साथ वे drift हो जाते हैं।

**ClaudeOS-Core उन्हें आपके वास्तविक स्रोत कोड से आपके लिए लिखता है।** एक deterministic Node.js scanner पहले आपके प्रोजेक्ट को पढ़ता है (stack, ORM, package layout, परिपाटियाँ, फ़ाइल paths). फिर एक 4-pass Claude पाइपलाइन निकाले गए तथ्यों को एक संपूर्ण documentation set में बदलती है:

- **`CLAUDE.md`** — वह project index जिसे Claude हर session में पढ़ता है
- **`.claude/rules/`** — श्रेणी के अनुसार auto-loaded rules (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — reference docs (हर rule के पीछे का "क्यों")
- **`claudeos-core/skills/`** — पुनः-प्रयोग योग्य patterns (CRUD scaffolding, page templates)
- **`claudeos-core/memory/`** — decision log + failure patterns जो प्रोजेक्ट के साथ बढ़ते हैं

क्योंकि scanner Claude को एक स्पष्ट path allowlist देता है, LLM **आपके कोड में मौजूद न होने वाली फ़ाइलें या frameworks आविष्कार नहीं कर सकता**। पाँच post-generation validators (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) ship से पहले output को सत्यापित करते हैं — language-invariant, इसलिए वही rules लागू होते हैं चाहे आप English, Korean, या अन्य 8 भाषाओं में से किसी में भी उत्पन्न करें।

```
पहले:  आप → Claude Code → "generally good" कोड → हर बार मैन्युअल फ़िक्सिंग
बाद में:  आप → Claude Code → आपके प्रोजेक्ट से मेल खाता कोड → सीधे ship
```

---

## एक वास्तविक प्रोजेक्ट पर देखें

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) पर चलाएँ — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. आउटपुट: **75 generated files**, कुल समय **53 minutes**, सभी validators ✅।

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 टर्मिनल आउटपुट (टेक्स्ट संस्करण, खोज और कॉपी के लिए)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>📄 आपकी <code>CLAUDE.md</code> में क्या जाता है (वास्तविक अंश — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

ऊपर के सभी मान — सटीक dependency coordinates, `dev.db` filename, `V1__create_tables.sql` migration name, "no JPA" — Claude द्वारा फ़ाइल लिखने से पहले scanner द्वारा `build.gradle` / `application.properties` / source tree से निकाले जाते हैं। कुछ भी अनुमानित नहीं है।

</details>

<details>
<summary><strong>🛡️ एक वास्तविक auto-loaded rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

`paths: ["**/*"]` glob का अर्थ है कि जब भी आप प्रोजेक्ट की किसी भी फ़ाइल को संपादित करते हैं, Claude Code इस rule को स्वचालित रूप से लोड करता है। rule में हर class name, package path, और exception handler सीधे स्कैन किए गए स्रोत से आता है — प्रोजेक्ट के वास्तविक `CustomizeExceptionHandler` और `JacksonCustomizations` सहित।

</details>

<details>
<summary><strong>🧠 एक स्वतः उत्पन्न <code>decision-log.md</code> seed (वास्तविक अंश)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 `pass2-merged.json` से निकाले गए architectural निर्णयों के साथ `decision-log.md` को seed करता है ताकि भविष्य के sessions याद रखें कि codebase जैसा है _वैसा क्यों है_ — सिर्फ़ यह नहीं कि _कैसा दिखता है_। हर option ("JPA/Hibernate", "MyBatis-Plus") और हर consequence वास्तविक `build.gradle` dependency block पर आधारित है।

</details>

---

## Quick Start

**पूर्वापेक्षाएँ:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) इंस्टॉल और प्रमाणित।

```bash
# 1. अपने प्रोजेक्ट रूट पर जाएँ
cd my-spring-boot-project

# 2. init चलाएँ (यह आपके कोड का विश्लेषण करता है और Claude से rules लिखने को कहता है)
npx claudeos-core init

# 3. हो गया। Claude Code खोलें और कोडिंग शुरू करें — आपके rules पहले से लोड हैं।
```

`init` समाप्त होने के बाद **आपको क्या मिलता है**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code द्वारा स्वतः लोड
│       ├── 00.core/              (सामान्य rules — naming, architecture)
│       ├── 10.backend/           (backend stack rules, यदि लागू हो)
│       ├── 20.frontend/          (frontend stack rules, यदि लागू हो)
│       ├── 30.security-db/       (security & DB परिपाटियाँ)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync रिमाइंडर — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (testing strategy + build verification रिमाइंडर)
├── claudeos-core/
│   ├── standard/                 ← Reference docs (श्रेणी संरचना का दर्पण)
│   │   ├── 00.core/              (project overview, architecture, naming)
│   │   ├── 10.backend/           (backend reference — backend stack पर)
│   │   ├── 20.frontend/          (frontend reference — frontend stack पर)
│   │   ├── 30.security-db/       (security & DB reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (build / startup / testing reference — standard only)
│   │   └── 90.optional/          (stack-specific extras — standard only)
│   ├── skills/                   (Claude द्वारा लागू किए जा सकने वाले पुनः-प्रयोग योग्य पैटर्न)
│   ├── guide/                    (सामान्य कार्यों के लिए how-to गाइड)
│   ├── database/                 (schema overview, migration गाइड)
│   ├── mcp-guide/                (MCP integration नोट्स)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (वह index जिसे Claude सबसे पहले पढ़ता है)
```

`rules/` और `standard/` के बीच एक ही संख्या prefix साझा करने वाली श्रेणियाँ एक ही वैचारिक क्षेत्र को दर्शाती हैं (उदाहरण: `10.backend` rules ↔ `10.backend` standards)। केवल-rules श्रेणियाँ: `50.sync` (doc sync रिमाइंडर) और `60.memory` (Pass 4 memory)। केवल-standard श्रेणी: `90.optional` (बिना enforcement के stack-specific extras)। अन्य सभी prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`) `rules/` और `standard/` दोनों में दिखाई देते हैं। अब Claude Code आपका प्रोजेक्ट जानता है।

---

## यह किसके लिए है?

| आप हैं... | यह pain जो हटाता है |
|---|---|
| **Claude Code के साथ नया प्रोजेक्ट शुरू करने वाले एकल डेवलपर** | "हर session Claude को मेरी परिपाटियाँ सिखाना" — खत्म। `CLAUDE.md` + 8-श्रेणी `.claude/rules/` एक pass में उत्पन्न। |
| **multiple repos में साझा standards बनाए रखने वाले team lead** | जब लोग packages का नाम बदलते हैं, ORMs बदलते हैं, या response wrappers बदलते हैं तो `.claude/rules/` drift हो जाते हैं। ClaudeOS-Core deterministically पुनः-sync करता है — समान input, byte-identical output, कोई diff noise नहीं। |
| **Claude Code पहले से उपयोग कर रहे लेकिन उत्पन्न कोड को ठीक करते-करते थके हुए** | गलत response wrapper, गलत package layout, MyBatis का उपयोग होने पर JPA, centralized middleware होने पर बिखरे हुए `try/catch`। Scanner आपकी वास्तविक परिपाटियाँ निकालता है; प्रत्येक Claude pass एक स्पष्ट path allowlist पर चलता है। |
| **एक नए repo में onboarding** (मौजूदा प्रोजेक्ट, टीम में शामिल होना) | repo पर `init` चलाएँ, एक जीवित architecture map मिलेगा: CLAUDE.md में stack table, ✅/❌ उदाहरणों के साथ per-layer rules, प्रमुख विकल्पों के "क्यों" के साथ seeded decision log (JPA vs MyBatis, REST vs GraphQL, आदि)। 5 फ़ाइलें पढ़ना 5,000 source फ़ाइलें पढ़ने को हराता है। |
| **Korean / Japanese / Chinese / 7 अन्य भाषाओं में काम करना** | अधिकांश Claude Code rule generators केवल English हैं। ClaudeOS-Core **10 भाषाओं** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) में पूरा सेट लिखता है **byte-identical संरचनात्मक validation** के साथ — output भाषा से स्वतंत्र वही `claude-md-validator` verdict। |
| **monorepo पर चलाना** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend + frontend domains एक run में अलग-अलग prompts के साथ analyzed; `apps/*/` और `packages/*/` स्वतः walked; प्रति-stack rules `70.domains/{type}/` के तहत emit होते हैं। |
| **OSS में योगदान या प्रयोग** | Output gitignore-friendly है — `claudeos-core/` आपकी local working dir है, केवल `CLAUDE.md` + `.claude/` ship करना ज़रूरी है। बाधित होने पर resume-safe; पुनः चलाने पर idempotent (`--force` के बिना rules में आपके मैन्युअल edits सुरक्षित रहते हैं)। |

**यदि उपयुक्त नहीं:** यदि आप scan चरण के बिना दिन एक से काम करने वाला agents/skills/rules का one-size-fits-all preset bundle चाहते हैं ([docs/hi/comparison.md](docs/hi/comparison.md) देखें कि क्या कहाँ फिट होता है), आपका प्रोजेक्ट अभी [समर्थित stacks](#supported-stacks) में से किसी से मेल नहीं खाता, या आपको केवल एक एकल `CLAUDE.md` चाहिए (बिल्ट-इन `claude /init` पर्याप्त है — अन्य tool इंस्टॉल करने की आवश्यकता नहीं)।

---

## यह कैसे काम करता है?

ClaudeOS-Core सामान्य Claude Code workflow को उलट देता है:

```
सामान्य:    आप प्रोजेक्ट का वर्णन करते हैं → Claude आपके stack का अनुमान लगाता है → Claude docs लिखता है
यह:         कोड आपके stack को पढ़ता है → कोड पुष्ट तथ्य Claude को देता है → Claude तथ्यों से docs लिखता है
```

पाइपलाइन **तीन चरणों** में चलती है, LLM call के दोनों ओर कोड के साथ:

**1. Step A — Scanner (deterministic, कोई LLM नहीं)।** एक Node.js scanner आपके project root को walk करता है, `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` पढ़ता है, `.env*` फ़ाइलों को parse करता है (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` के लिए sensitive-variable redaction के साथ), आपके architecture pattern को वर्गीकृत करता है (Java के 5 patterns A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), domains खोजता है, और मौजूद हर source file path का स्पष्ट allowlist बनाता है। Output: `project-analysis.json` — आगे जो होता है उसके लिए single source of truth।

**2. Step B — 4-Pass Claude पाइपलाइन (Step A के तथ्यों से प्रतिबंधित)।**
- **Pass 1** प्रति domain group प्रतिनिधि फ़ाइलें पढ़ता है और प्रति domain ~50–100 परिपाटियाँ निकालता है — response wrappers, logging libraries, error handling, naming conventions, test patterns. प्रति domain group एक बार चलता है (`max 4 domains, 40 files per group`) ताकि context कभी overflow न हो।
- **Pass 2** सभी per-domain analysis को project-wide picture में merge करता है और dominant convention चुनकर असहमतियाँ हल करता है।
- **Pass 3** `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides लिखता है — stages में split (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) ताकि `pass2-merged.json` बड़ा होने पर भी हर stage का prompt LLM के context window में fit हो। ≥16 domain वाले projects के लिए 3b/3c को ≤15-domain batches में sub-divide करता है।
- **Pass 4** L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) को seed करता है और universal scaffold rules जोड़ता है। Pass 4 को **`CLAUDE.md` संशोधित करने से प्रतिबंधित किया गया है** — Pass 3 का Section 8 authoritative है।

**3. Step C — Verification (deterministic, कोई LLM नहीं)।** पाँच validators output की जाँच करते हैं:
- `claude-md-validator` — `CLAUDE.md` पर 25 संरचनात्मक checks (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant). Language-invariant: `--lang` से स्वतंत्र वही verdict।
- `content-validator` — 10 content checks जिसमें path-claim verification (`STALE_PATH` fabricated `src/...` references को पकड़ता है) और MANIFEST drift detection शामिल हैं।
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count।
- `plan-validator` — plan ↔ disk consistency (legacy, v2.1.0 के बाद से ज़्यादातर no-op)।
- `sync-checker` — 7 tracked dirs में disk ↔ `sync-map.json` registration consistency।

तीन severity tiers (`fail` / `warn` / `advisory`) ताकि warnings कभी CI को LLM hallucinations पर deadlock न करें जिन्हें user मैन्युअल रूप से ठीक कर सकता है।

जो invariant यह सब बाँधता है: **Claude केवल वही paths cite कर सकता है जो आपके कोड में वास्तव में मौजूद हैं**, क्योंकि Step A उसे एक finite allowlist देता है। यदि LLM फिर भी कुछ आविष्कार करने की कोशिश करता है (दुर्लभ, लेकिन कुछ seeds पर होता है), Step C docs ship होने से पहले उसे पकड़ लेता है।

per-pass details, marker-based resume, Claude Code के `.claude/` sensitive-path block के लिए staged-rules workaround, और stack detection internals के लिए, [docs/hi/architecture.md](docs/hi/architecture.md) देखें।

---

## Supported Stacks

12 stacks, आपकी प्रोजेक्ट फ़ाइलों से स्वतः पहचाने जाते हैं:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

मल्टी-stack प्रोजेक्ट (उदाहरण: Spring Boot backend + Next.js frontend) सीधे काम करते हैं।

पहचान नियमों और प्रत्येक scanner क्या निकालता है, के लिए [docs/hi/stacks.md](docs/hi/stacks.md) देखें।

---

## दैनिक Workflow

तीन commands ~95% उपयोग को कवर करते हैं:

```bash
# प्रोजेक्ट पर पहली बार
npx claudeos-core init

# आपके द्वारा standards या rules मैन्युअल रूप से संपादित करने के बाद
npx claudeos-core lint

# हेल्थ चेक (commit से पहले, या CI में चलाएँ)
npx claudeos-core health
```

memory layer के रखरखाव के लिए दो और:

```bash
# failure-patterns लॉग का compaction (समय-समय पर चलाएँ)
npx claudeos-core memory compact

# बार-बार होने वाले failure patterns को proposed rules में बढ़ाएँ
npx claudeos-core memory propose-rules
```

प्रत्येक command के पूर्ण options के लिए, [docs/hi/commands.md](docs/hi/commands.md) देखें।

---

## यह क्या अलग बनाता है

अधिकांश Claude Code documentation tools विवरण से उत्पन्न करते हैं (आप टूल को बताते हैं, टूल Claude को बताता है)। ClaudeOS-Core आपके वास्तविक स्रोत कोड से उत्पन्न करता है (टूल पढ़ता है, टूल Claude को बताता है क्या पुष्ट है, Claude केवल वही लिखता है जो पुष्ट है)।

तीन ठोस परिणाम:

1. **Deterministic stack detection.** एक ही प्रोजेक्ट + एक ही कोड = एक ही आउटपुट। "इस बार Claude ने अलग नतीजा दिया" नहीं।
2. **No invented paths.** Pass 3 prompt हर अनुमत स्रोत path को स्पष्ट रूप से सूचीबद्ध करता है; Claude ऐसे paths का उल्लेख नहीं कर सकता जो मौजूद नहीं हैं।
3. **Multi-stack aware.** Backend और frontend domains एक ही run में अलग-अलग analysis prompts का उपयोग करते हैं।

अन्य tools के साथ side-by-side scope तुलना के लिए, [docs/hi/comparison.md](docs/hi/comparison.md) देखें। तुलना **प्रत्येक टूल क्या करता है** के बारे में है, न कि **कौन बेहतर है** — अधिकांश पूरक हैं।

---

## Verification (post-generation)

Claude द्वारा docs लिखने के बाद, कोड उन्हें सत्यापित करता है। पाँच अलग-अलग validators:

| Validator | यह क्या जाँचता है | किसके द्वारा चलाया जाता है |
|---|---|---|
| `claude-md-validator` | CLAUDE.md की संरचनात्मक अपरिवर्तनीयताएँ (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path दावे वास्तव में मौजूद हैं; manifest स्थिरता | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 आउटपुट well-formed JSON हैं | `health` (warn) |
| `plan-validator` | सहेजी गई plan disk से मेल खाती है | `health` (fail-on-error) |
| `sync-checker` | Disk फ़ाइलें `sync-map.json` registrations से मेल खाती हैं (orphaned/unregistered detection) | `health` (fail-on-error) |

`health-checker` चार runtime validators को तीन-tier severity (fail / warn / advisory) के साथ orchestrate करता है और CI के लिए उपयुक्त code के साथ exit होता है। `claude-md-validator` `lint` command के माध्यम से अलग चलता है क्योंकि संरचनात्मक drift एक re-init संकेत है, न कि soft warning। कभी भी चलाएँ:

```bash
npx claudeos-core health
```

प्रत्येक validator के विस्तृत checks के लिए, [docs/hi/verification.md](docs/hi/verification.md) देखें।

---

## Memory Layer (वैकल्पिक, लंबे चलने वाले प्रोजेक्ट के लिए)

v2.0 के बाद, ClaudeOS-Core चार फ़ाइलों के साथ एक `claudeos-core/memory/` फ़ोल्डर लिखता है:

- `decision-log.md` — append-only "हमने X के बजाय Y क्यों चुना"
- `failure-patterns.md` — frequency/importance स्कोर के साथ बार-बार होने वाली त्रुटियाँ
- `compaction.md` — समय के साथ memory को कैसे auto-compact किया जाता है
- `auto-rule-update.md` — पैटर्न जो नए rules बनने चाहिए

आप `npx claudeos-core memory propose-rules` चलाकर Claude से हाल के failure patterns देखने और जोड़ने के लिए नए rules सुझाने को कह सकते हैं।

memory model और lifecycle के लिए, [docs/hi/memory-layer.md](docs/hi/memory-layer.md) देखें।

---

## FAQ

**Q: क्या मुझे Claude API key की ज़रूरत है?**
A: नहीं। ClaudeOS-Core आपके मौजूदा Claude Code installation का उपयोग करता है — यह आपकी मशीन पर `claude -p` को prompts pipe करता है। कोई अतिरिक्त खाते नहीं।

**Q: क्या यह मेरी मौजूदा CLAUDE.md या `.claude/rules/` को overwrite करेगा?**
A: नए प्रोजेक्ट पर पहली run: यह उन्हें बनाता है। `--force` के बिना पुनः चलाने पर आपके edits सुरक्षित रहते हैं — पिछली run के pass markers का पता लगाया जाता है और passes छोड़ दिए जाते हैं। `--force` के साथ पुनः चलाने पर सब कुछ wipe और regenerate होता है (आपके edits खो जाते हैं — `--force` का यही मतलब है)। [docs/hi/safety.md](docs/hi/safety.md) देखें।

**Q: मेरा stack समर्थित नहीं है। क्या मैं एक जोड़ सकता हूँ?**
A: हाँ। नए stacks को ~3 prompt templates + एक domain scanner चाहिए। 8-step गाइड के लिए [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

**Q: मैं Korean (या अन्य भाषा) में docs कैसे उत्पन्न करूँ?**
A: `npx claudeos-core init --lang ko`. 10 भाषाएँ समर्थित: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: क्या यह monorepos के साथ काम करता है?**
A: हाँ — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), और npm/yarn workspaces (`package.json#workspaces`) stack-detector द्वारा पहचाने जाते हैं। प्रत्येक app को अपना analysis मिलता है। अन्य monorepo layouts (उदा., NX) विशेष रूप से नहीं पहचाने जाते, लेकिन सामान्य `apps/*/` और `packages/*/` patterns प्रति-stack scanners द्वारा अभी भी उठाए जाते हैं।

**Q: यदि Claude Code ऐसे rules उत्पन्न करता है जिनसे मैं असहमत हूँ?**
A: उन्हें सीधे संपादित करें। फिर यह पुष्टि करने के लिए `npx claudeos-core lint` चलाएँ कि CLAUDE.md अभी भी संरचनात्मक रूप से वैध है। आपके edits बाद की `init` runs पर सुरक्षित रहते हैं (`--force` के बिना) — resume तंत्र उन passes को छोड़ देता है जिनके markers मौजूद हैं।

**Q: मैं bugs कहाँ रिपोर्ट करूँ?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)। सुरक्षा मुद्दों के लिए [SECURITY.md](SECURITY.md) देखें।

---

## Documentation

| विषय | यह पढ़ें |
|---|---|
| 4-pass पाइपलाइन कैसे काम करती है (diagram से अधिक गहरा) | [docs/hi/architecture.md](docs/hi/architecture.md) |
| Architecture के दृश्य diagrams (Mermaid) | [docs/hi/diagrams.md](docs/hi/diagrams.md) |
| Stack detection — प्रत्येक scanner क्या देखता है | [docs/hi/stacks.md](docs/hi/stacks.md) |
| Memory layer — decision logs और failure patterns | [docs/hi/memory-layer.md](docs/hi/memory-layer.md) |
| सभी 5 validators विस्तार से | [docs/hi/verification.md](docs/hi/verification.md) |
| हर CLI command और option | [docs/hi/commands.md](docs/hi/commands.md) |
| मैन्युअल installation (बिना `npx` के) | [docs/hi/manual-installation.md](docs/hi/manual-installation.md) |
| Scanner overrides — `.claudeos-scan.json` | [docs/hi/advanced-config.md](docs/hi/advanced-config.md) |
| सुरक्षा: re-init पर क्या सुरक्षित रहता है | [docs/hi/safety.md](docs/hi/safety.md) |
| समान tools के साथ तुलना (scope, गुणवत्ता नहीं) | [docs/hi/comparison.md](docs/hi/comparison.md) |
| त्रुटियाँ और रिकवरी | [docs/hi/troubleshooting.md](docs/hi/troubleshooting.md) |

---

## योगदान

योगदान का स्वागत है — stack समर्थन जोड़ना, prompts बेहतर बनाना, bugs ठीक करना। [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

Code of Conduct और सुरक्षा नीति के लिए, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) और [SECURITY.md](SECURITY.md) देखें।

## License

[ISC](LICENSE) — किसी भी उपयोग के लिए मुफ़्त, व्यावसायिक सहित।

---

<sub>[@claudeos-core](https://github.com/claudeos-core) द्वारा सावधानी से निर्मित। यदि इसने आपका समय बचाया है, GitHub पर एक ⭐ इसे दृश्यमान बनाए रखता है।</sub>
