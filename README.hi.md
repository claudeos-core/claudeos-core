# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**एक ऐसा CLI tool जो आपके actual source code को पढ़कर `CLAUDE.md` और `.claude/rules/` खुद generate कर देता है। Node.js scanner, 4-pass Claude pipeline और 5 validators मिलकर काम करते हैं। 12 stacks और 10 भाषाएँ support हैं, और जो path code में नहीं है वो output में भी नहीं आएगा।**

```bash
npx claudeos-core init
```

[**12 stacks**](#supported-stacks) पर सीधे चलता है (monorepos भी)। एक command, कोई config नहीं, बीच में रुक जाए तो वहीं से resume होता है, और बार-बार चलाने पर भी safe है।

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## यह क्या है?

Claude Code हर नए session पर framework के generic defaults पर वापस चला जाता है। आपकी team **MyBatis** use करती है, फिर भी Claude JPA का code लिख देता है। आपका response wrapper `ApiResponse.ok()` है, फिर भी Claude `ResponseEntity.success()` लिखता है। Packages आपने layer-first design किए हैं, मगर Claude domain-first structure बना देता है। हर repo के लिए `.claude/rules/` खुद से लिखकर रखना इसका एक हल है, लेकिन जैसे ही code evolve होता है आपके rules drift करने लगते हैं।

**ClaudeOS-Core यही काम deterministically करता है, सीधे आपके actual source code से।** पहले एक Node.js scanner project को पढ़ता है, यानी stack, ORM, package layout और file paths सब निकाल लेता है। उसके बाद 4-pass Claude pipeline पूरा set generate करती है। `CLAUDE.md`, auto-load होने वाले `.claude/rules/`, standards, skills — ये सब एक explicit path allowlist के अंदर ही बनते हैं, और LLM इस दायरे से बाहर नहीं जा सकता। आखिर में 5 validators output को ship होने से पहले verify कर लेते हैं।

नतीजा यह है कि same input के लिए हमेशा byte-identical output मिलता है, चाहे 10 भाषाओं में से कोई भी चुनी जाए, और कभी invented path नहीं आएगा। (विस्तार से नीचे [क्या इसे अलग बनाता है](#क्या-इसे-अलग-बनाता-है) में।)

लंबे चलने वाले projects के लिए एक अलग [Memory Layer](#memory-layer-वैकल्पिक-दीर्घकालिक-प्रोजेक्ट्स-के-लिए) भी seed होता है।

---

## वास्तविक प्रोजेक्ट पर देखें

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) पर इसे चलाकर देखा गया। Java 11, Spring Boot 2.6, MyBatis, SQLite, कुल 187 source files. Output: **75 generated files**, total time **53 मिनट**, और सभी validators ✅।

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Terminal output (text version, search और copy के लिए)</strong></summary>

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
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
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
<summary><strong>असली <code>CLAUDE.md</code> में आखिर क्या लिखा जाता है (वास्तविक excerpt — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

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

ऊपर table में जो भी value है — exact dependency coordinates, `dev.db` filename, `V1__create_tables.sql` migration नाम, "no JPA" तक — वो सब Claude के file लिखने से पहले scanner ने `build.gradle`, `application.properties` और source tree से सीधे निकाला है। एक भी value guess नहीं की गई।

</details>

<details>
<summary><strong>एक असली auto-loaded rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

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

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

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

`paths: ["**/*"]` glob का मतलब है कि project में जब भी कोई file edit हो, Claude Code इस rule को अपने आप load कर लेता है। Rule में जितने भी class names, package paths और exception handlers हैं, वो सब scanned source से सीधे आए हैं। यानी project का असली `CustomizeExceptionHandler` और `JacksonCustomizations` जैसा है, वैसा ही यहाँ झलकता है।

</details>

<details>
<summary><strong>Auto-generated <code>decision-log.md</code> seed (वास्तविक excerpt)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 `pass2-merged.json` से निकले architectural decisions को `decision-log.md` में पहले से भर देता है। इसका फायदा यह है कि अगले sessions में codebase जैसा दिख रहा है उसका *क्या* ही नहीं, *क्यों* भी याद रहता है। हर option ("JPA/Hibernate", "MyBatis-Plus") और हर consequence असली `build.gradle` dependency block पर ही टिका हुआ है।

</details>

---

## परीक्षण किया गया

ClaudeOS-Core असली OSS projects पर लिए गए reference benchmarks के साथ ship होता है। अगर आपने इसे किसी public repo पर चलाया है, तो [issue खोल दीजिए](https://github.com/claudeos-core/claudeos-core/issues), हम इसे table में जोड़ देंगे।

| Project | Stack | Scanned → Generated | Status |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ सभी 5 validators pass |

---

## त्वरित शुरुआत

**Prerequisites:** Node.js 18+, और [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed व authenticated।

```bash
# 1. अपने project root पर जाएँ
cd my-spring-boot-project

# 2. init चलाएँ (यह code analyze करता है और Claude से rules लिखवाता है)
npx claudeos-core init

# 3. हो गया। Claude Code खोलिए और काम शुरू कीजिए — rules पहले से loaded हैं।
```

`init` खत्म होने के बाद structure कुछ ऐसा दिखेगा।

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code इन्हें auto-load करता है
│       ├── 00.core/              (सामान्य rules — naming, architecture)
│       ├── 10.backend/           (backend stack rules, अगर हैं तो)
│       ├── 20.frontend/          (frontend stack rules, अगर हैं तो)
│       ├── 30.security-db/       (security और DB conventions)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync reminders — सिर्फ rules में)
│       ├── 60.memory/            (memory rules — Pass 4, सिर्फ rules में)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (testing strategy और build verification reminders)
├── claudeos-core/
│   ├── standard/                 ← Reference docs (वही category structure)
│   │   ├── 00.core/              (project overview, architecture, naming)
│   │   ├── 10.backend/           (backend reference — backend stack हो तो)
│   │   ├── 20.frontend/          (frontend reference — frontend stack हो तो)
│   │   ├── 30.security-db/       (security और DB reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (build / startup / testing reference — सिर्फ standard में)
│   │   └── 90.optional/          (stack-specific extras — सिर्फ standard में)
│   ├── skills/                   (reusable patterns जिन्हें Claude apply कर सकता है)
│   ├── guide/                    (आम tasks के how-to guides)
│   ├── database/                 (schema overview, migration guide)
│   ├── mcp-guide/                (MCP integration notes)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (Claude सबसे पहले इसी index को पढ़ता है)
```

जिन categories का number prefix `rules/` और `standard/` दोनों में same है, वो एक ही area की हैं (जैसे `10.backend` rules ↔ `10.backend` standards)। सिर्फ rules में रहने वाली categories हैं `50.sync` (doc sync reminders) और `60.memory` (Pass 4 memory)। सिर्फ standard में रहने वाली एक है `90.optional` (बिना enforcement के stack-specific extras)। बाकी सारे prefixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) दोनों जगह मौजूद हैं। अब Claude Code आपके project को जानता है।

---

## यह किसके लिए है?

| आप कौन हैं... | यह जो pain हटाता है |
|---|---|
| **Solo dev जो Claude Code से नया project शुरू कर रहा है** | "हर session में Claude को conventions फिर से सिखाओ" — यह झंझट खत्म। `CLAUDE.md` और 8-category `.claude/rules/` एक ही pass में बन जाते हैं। |
| **Team lead जो कई repos में shared standards maintain करता है** | जब लोग packages rename करते हैं, ORMs बदलते हैं, या response wrappers switch करते हैं, तब `.claude/rules/` drift करने लगते हैं। ClaudeOS-Core इन्हें deterministically फिर से sync कर देता है। Same input = byte-identical output, कोई diff noise नहीं। |
| **पहले से Claude Code use कर रहे हैं लेकिन generated code ठीक करते-करते थक चुके हैं** | गलत response wrapper, गलत package layout, MyBatis project में JPA code, centralized middleware के बावजूद बिखरा हुआ `try/catch` — यह सब scanner आपके असली conventions निकालकर रोकता है, और हर Claude pass एक explicit path allowlist पर ही चलता है। |
| **नए repo पर onboarding कर रहे हैं** (existing project, team join कर रहे हैं) | Repo पर `init` चलाइए, एक living architecture map मिल जाता है — CLAUDE.md में stack table, ✅/❌ examples के साथ per-layer rules, और बड़े decisions के पीछे "why" से seed किया हुआ decision log (JPA vs MyBatis, REST vs GraphQL, वगैरह)। 5 files पढ़ना 5,000 source files पढ़ने से कहीं तेज़ है। |
| **हिन्दी / कोरियाई / जापानी / चीनी समेत 7 अन्य भाषाओं में काम कर रहे हैं** | अधिकांश Claude Code rule generators सिर्फ English में लिखते हैं। ClaudeOS-Core पूरा set **10 भाषाओं** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) में लिखता है, और structural validation **byte-identical** रहता है — output language कोई भी हो, `claude-md-validator` का verdict same रहता है। |
| **Monorepo पर काम कर रहे हैं** (Turborepo, pnpm/yarn workspaces, Lerna) | एक ही run में backend और frontend domains अलग-अलग prompts से analyze होते हैं। `apps/*/` और `packages/*/` खुद-ब-खुद walk हो जाते हैं, और per-stack rules `70.domains/{type}/` के नीचे emit होते हैं। |
| **OSS में contribute कर रहे हैं या experiment कर रहे हैं** | Output gitignore-friendly है। `claudeos-core/` आपकी local working dir है, और ship सिर्फ `CLAUDE.md` + `.claude/` को करना है। बीच में रुक जाए तो resume-safe, और re-runs पर idempotent — आपके manual edits बिना `--force` के बच जाते हैं। |

**यह आपके लिए सही नहीं है अगर:** आपको एक one-size-fits-all preset bundle चाहिए जो scan step के बिना day one से काम करे (कौन सा tool कहाँ fit होता है, यह [docs/hi/comparison.md](docs/hi/comparison.md) में है), या आपका project अभी [supported stacks](#supported-stacks) में से किसी में नहीं आता, या फिर आपको सिर्फ एक `CLAUDE.md` चाहिए। उस case में built-in `claude /init` ही काफी है, अलग tool install करने की जरूरत नहीं।

---

## यह कैसे काम करता है?

ClaudeOS-Core typical Claude Code workflow को उल्टा करके चलाता है।

```
सामान्य: आप project describe करते हैं → Claude आपके stack का अंदाज़ा लगाता है → Claude docs लिखता है
यह:     Code आपके stack को पढ़ता है → Code confirmed facts Claude को देता है → Claude उन्हीं facts से docs लिखता है
```

Pipeline **तीन stages** में चलती है, और LLM call के दोनों तरफ code रहता है।

**1. Step A — Scanner (deterministic, कोई LLM नहीं)।** एक Node.js scanner project root को walk करता है, `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` पढ़ता है, `.env*` files parse करता है (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` जैसी sensitive variables को redact करते हुए), architecture pattern classify करता है (Java के 5 patterns A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), domains discover करता है, और मौजूदा हर source file path का explicit allowlist बनाता है। इसका output है `project-analysis.json`, जो आगे की हर चीज़ के लिए single source of truth बन जाता है।

**2. Step B — 4-Pass Claude pipeline (Step A के facts के दायरे में)।**
- **Pass 1** हर domain group के representative files पढ़ता है और प्रति domain करीब 50–100 conventions निकालता है — response wrappers, logging libraries, error handling, naming conventions, test patterns वगैरह। यह domain group पर एक बार चलता है (`max 4 domains, 40 files per group`), इसलिए context कभी overflow नहीं होता।
- **Pass 2** सारे per-domain analysis को project-wide picture में merge कर देता है, और जहाँ disagreement हो वहाँ dominant convention चुन लेता है।
- **Pass 3** `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, skills और guides लिखता है। यह stages में split होता है (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide), जिससे `pass2-merged.json` बड़ा होने पर भी हर stage का prompt LLM के context window में आ जाता है। 16 या उससे ज्यादा domains वाले projects के लिए 3b/3c को ≤15-domain batches में sub-divide कर दिया जाता है।
- **Pass 4** L4 memory layer को seed करता है (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) और कुछ universal scaffold rules जोड़ता है। Pass 4 को **`CLAUDE.md` modify करने की इजाज़त नहीं है** — Pass 3 का Section 8 ही authoritative है।

**3. Step C — Verification (deterministic, कोई LLM नहीं)।** पाँच validators output check करते हैं:
- `claude-md-validator` — `CLAUDE.md` पर 25 structural checks (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant)। यह language-invariant है, यानी `--lang` कोई भी हो, verdict same रहता है।
- `content-validator` — 10 content checks, जिनमें path-claim verification (`STALE_PATH` invented `src/...` references पकड़ता है) और MANIFEST drift detection शामिल हैं।
- `pass-json-validator` — Pass 1/2/3/4 की JSON well-formedness और stack-aware section count check।
- `plan-validator` — plan ↔ disk consistency (legacy, v2.1.0 के बाद से ज़्यादातर no-op)।
- `sync-checker` — 7 tracked dirs पर disk ↔ `sync-map.json` registration consistency।

तीन severity tiers (`fail` / `warn` / `advisory`) रखे गए हैं, ताकि जिन LLM hallucinations को user खुद ठीक कर सकता है, उनकी वजह से CI deadlock न हो जाए।

पूरी चीज़ एक invariant पर टिकी है: **Claude वही paths cite कर सकता है जो आपके code में असल में मौजूद हैं**, क्योंकि Step A उसे एक finite allowlist देता है। फिर भी अगर LLM कुछ invent करने की कोशिश करे (कुछ खास seeds पर rare है, मगर होता है), तो Step C docs ship होने से पहले उसे पकड़ लेता है।

हर pass के internals, marker-based resume, Claude Code के `.claude/` sensitive-path block का staged-rules workaround और stack detection की अंदरूनी logic के लिए [docs/hi/architecture.md](docs/hi/architecture.md) देखें।

---

## Supported Stacks

12 stacks, project files से auto-detected।

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack projects (जैसे Spring Boot backend + Next.js frontend) भी out of the box चलते हैं।

Detection rules और हर scanner क्या निकालता है, यह [docs/hi/stacks.md](docs/hi/stacks.md) में है।

---

## दैनिक वर्कफ़्लो

ये तीन commands ~95% use cases cover कर लेते हैं।

```bash
# Project पर पहली बार
npx claudeos-core init

# जब standards या rules manually edit किए हों
npx claudeos-core lint

# Health check (commit से पहले या CI में)
npx claudeos-core health
```

हर command के पूरे options [docs/hi/commands.md](docs/hi/commands.md) में हैं। Memory layer commands (`memory compact`, `memory propose-rules`) नीचे [Memory Layer](#memory-layer-वैकल्पिक-दीर्घकालिक-प्रोजेक्ट्स-के-लिए) section में documented हैं।

---

## क्या इसे अलग बनाता है

ज़्यादातर Claude Code documentation tools description से generate करते हैं — आप tool को बताते हैं, tool Claude को बताता है। ClaudeOS-Core इसके बजाय आपके actual source code से generate करता है। Tool खुद code पढ़ता है, फिर Claude को बताता है कि क्या confirmed है, और Claude सिर्फ उतना ही लिखता है।

इसके तीन ठोस नतीजे हैं।

1. **Deterministic stack detection.** Same project + same code = same output। "इस बार Claude थोड़ा अलग roll हो गया" वाली बात नहीं होती।
2. **No invented paths.** Pass 3 prompt में हर allowed source path explicitly listed होता है, इसलिए Claude ऐसे paths cite ही नहीं कर सकता जो मौजूद नहीं हैं।
3. **Multi-stack aware.** एक ही run में backend और frontend domains अलग-अलग analysis prompts use करते हैं।

दूसरे tools के साथ side-by-side scope comparison के लिए [docs/hi/comparison.md](docs/hi/comparison.md) देखें। यह तुलना **हर tool क्या करता है** के बारे में है, **कौन सा बेहतर है** के बारे में नहीं — असल में ज़्यादातर एक-दूसरे के complementary हैं।

---

## सत्यापन (जनरेशन के बाद)

Claude docs लिख चुकने के बाद उन्हें code verify करता है। पाँच अलग-अलग validators।

| Validator | क्या check करता है | किसके through चलता है |
|---|---|---|
| `claude-md-validator` | CLAUDE.md structural invariants (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path claims सच में मौजूद हैं या नहीं; manifest consistency | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 outputs well-formed JSON हैं या नहीं | `health` (warn) |
| `plan-validator` | Saved plan disk से match करता है या नहीं | `health` (fail-on-error) |
| `sync-checker` | Disk files `sync-map.json` registrations से match करते हैं (orphaned/unregistered detection) | `health` (fail-on-error) |

`health-checker` इन चारों runtime validators को three-tier severity (fail / warn / advisory) के साथ orchestrate करता है और CI के लिए सही exit code लौटाता है। `claude-md-validator` अलग से `lint` command से चलता है, क्योंकि structural drift सिर्फ soft warning नहीं, re-init का signal है। जब मन हो, चला लीजिए।

```bash
npx claudeos-core health
```

हर validator के individual checks [docs/hi/verification.md](docs/hi/verification.md) में detail से दिए हैं।

---

## Memory Layer (वैकल्पिक, दीर्घकालिक प्रोजेक्ट्स के लिए)

ऊपर वाली scaffolding pipeline के अलावा, ClaudeOS-Core उन projects के लिए एक `claudeos-core/memory/` folder भी seed करता है जिनका context एक session से ज़्यादा खिंचता है। यह वैकल्पिक है — अगर आपको सिर्फ `CLAUDE.md` और rules चाहिए तो इसे ignore कर सकते हैं।

चार files हैं, और सब Pass 4 लिखता है।

- `decision-log.md` — append-only "हमने X की जगह Y क्यों चुना", `pass2-merged.json` से seed होता है
- `failure-patterns.md` — frequency / importance scores के साथ बार-बार आने वाली errors
- `compaction.md` — समय के साथ memory कैसे auto-compact होती है
- `auto-rule-update.md` — वो patterns जिन्हें नए rules बनना चाहिए

इस layer को समय के साथ maintain करने के लिए दो commands हैं।

```bash
# Failure-patterns log compact करें (समय-समय पर चलाएँ)
npx claudeos-core memory compact

# बार-बार आने वाले failure patterns को proposed rules में promote करें
npx claudeos-core memory propose-rules
```

Memory model और lifecycle की पूरी बात [docs/hi/memory-layer.md](docs/hi/memory-layer.md) में है।

---

## FAQ

**Q: क्या Claude API key चाहिए?**
A: नहीं। ClaudeOS-Core आपके पहले से installed Claude Code को ही use करता है और आपकी machine पर `claude -p` को prompts pipe करता है। कोई extra account नहीं चाहिए।

**Q: क्या यह मेरी मौजूदा CLAUDE.md या `.claude/rules/` overwrite कर देगा?**
A: नए project पर पहली run में यह इन्हें create करता है। `--force` के बिना दोबारा चलाने पर आपके edits बच जाते हैं, क्योंकि पिछली run के pass markers detect होकर वो passes skip हो जाते हैं। `--force` के साथ चलाने पर सब wipe होकर regenerate होता है, यानी edits भी चले जाते हैं — `--force` का मतलब ही यही है। ज़्यादा detail [docs/hi/safety.md](docs/hi/safety.md) में।

**Q: मेरा stack supported नहीं है, क्या जोड़ सकते हैं?**
A: हाँ। नए stack के लिए करीब 3 prompt templates और एक domain scanner चाहिए। 8-step guide के लिए [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

**Q: कोरियाई (या किसी और भाषा) में docs कैसे generate करूँ?**
A: `npx claudeos-core init --lang ko`। 10 भाषाएँ supported हैं: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de।

**Q: क्या यह monorepos के साथ काम करता है?**
A: हाँ। Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) और npm/yarn workspaces (`package.json#workspaces`) — इन्हें stack-detector पहचान लेता है, और हर app के लिए अलग analysis होता है। बाकी monorepo layouts (जैसे NX) explicitly detect नहीं होते, मगर generic `apps/*/` और `packages/*/` patterns per-stack scanners फिर भी pick कर लेते हैं।

**Q: अगर Claude Code ऐसे rules generate कर दे जिनसे मैं असहमत हूँ?**
A: सीधे edit कर दीजिए। उसके बाद `npx claudeos-core lint` चलाकर check कर लीजिए कि CLAUDE.md अभी भी structurally valid है या नहीं। आगे की `init` runs पर (बिना `--force` के) आपके edits बच जाते हैं, क्योंकि resume mechanism उन passes को skip करता है जिनके markers मौजूद हैं।

**Q: Bugs कहाँ report करूँ?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) पर। Security issues के लिए [SECURITY.md](SECURITY.md) देखें।

---

## यदि इसने आपका समय बचाया

GitHub पर एक ⭐ project को visible रखता है और दूसरों को भी इसे ढूँढने में मदद करता है। Issues, PRs और stack template contributions — सबका स्वागत है। Detail के लिए [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

---

## दस्तावेज़ीकरण

| विषय | यह पढ़ें |
|---|---|
| 4-pass pipeline कैसे काम करती है (diagram से ज़्यादा गहराई से) | [docs/hi/architecture.md](docs/hi/architecture.md) |
| Architecture के visual diagrams (Mermaid) | [docs/hi/diagrams.md](docs/hi/diagrams.md) |
| Stack detection — हर scanner क्या देखता है | [docs/hi/stacks.md](docs/hi/stacks.md) |
| Memory layer — decision logs और failure patterns | [docs/hi/memory-layer.md](docs/hi/memory-layer.md) |
| पाँचों validators detail में | [docs/hi/verification.md](docs/hi/verification.md) |
| हर CLI command और option | [docs/hi/commands.md](docs/hi/commands.md) |
| Manual installation (बिना `npx` के) | [docs/hi/manual-installation.md](docs/hi/manual-installation.md) |
| Scanner overrides — `.claudeos-scan.json` | [docs/hi/advanced-config.md](docs/hi/advanced-config.md) |
| Safety: re-init पर क्या-क्या preserved रहता है | [docs/hi/safety.md](docs/hi/safety.md) |
| Similar tools के साथ तुलना (scope, quality नहीं) | [docs/hi/comparison.md](docs/hi/comparison.md) |
| Errors और recovery | [docs/hi/troubleshooting.md](docs/hi/troubleshooting.md) |

---

## योगदान

Contributions का स्वागत है — stack support जोड़ना, prompts सुधारना, bugs ठीक करना, सब कुछ। Detail के लिए [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

Code of Conduct और security policy [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) और [SECURITY.md](SECURITY.md) में हैं।

## लाइसेंस

[ISC License](LICENSE)। Commercial use सहित किसी भी काम के लिए free है। © 2025–2026 ClaudeOS-Core contributors।

---

<sub>[claudeos-core](https://github.com/claudeos-core) team द्वारा maintained। Issues और PRs <https://github.com/claudeos-core/claudeos-core> पर भेजें।</sub>
