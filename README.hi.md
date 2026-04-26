# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**आपके वास्तविक source code से `CLAUDE.md` + `.claude/rules/` स्वचालित रूप से जनरेट करने वाला deterministic CLI — Node.js scanner + 4-pass Claude pipeline + 5 validators. 12 stacks, 10 भाषाएँ, कोई invented path नहीं।**

```bash
npx claudeos-core init
```

[**12 stacks**](#supported-stacks) पर काम करता है (monorepos सहित) — एक command, कोई config नहीं, resume-safe, idempotent।

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## यह क्या है?

Claude Code हर session में framework defaults पर fallback करता है। आपकी team **MyBatis** का उपयोग करती है, लेकिन Claude JPA लिखता है। आपका wrapper `ApiResponse.ok()` है, लेकिन Claude `ResponseEntity.success()` लिखता है। आपके packages layer-first हैं, लेकिन Claude domain-first जनरेट करता है। हर repo के लिए `.claude/rules/` को hand-write करना इसे हल करता है — जब तक कि code विकसित न हो और आपके rules drift न हो जाएँ।

**ClaudeOS-Core उन्हें deterministic रूप से, आपके वास्तविक source code से पुनर्जनरेट करता है।** एक Node.js scanner पहले पढ़ता है (stack, ORM, package layout, file paths)। फिर एक 4-pass Claude pipeline पूरा सेट लिखता है — `CLAUDE.md` + auto-loaded `.claude/rules/` + standards + skills — एक स्पष्ट path allowlist द्वारा constrained जिससे LLM बच नहीं सकता। Ship होने से पहले 5 validators output को verify करते हैं।

परिणाम: समान input → byte-identical output, 10 भाषाओं में से किसी में भी, बिना invented paths के। (विवरण नीचे [क्या इसे अलग बनाता है](#क्या-इसे-अलग-बनाता-है) में।)

लंबे समय तक चलने वाले projects के लिए एक अलग [Memory Layer](#memory-layer-वैकल्पिक-दीर्घकालिक-प्रोजेक्ट्स-के-लिए) seed किया जाता है।

---

## वास्तविक प्रोजेक्ट पर देखें

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) पर चलाएँ — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Output: **75 generated files**, कुल समय **53 मिनट**, सभी validators ✅।

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Terminal output (text version, search & copy के लिए)</strong></summary>

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
<summary><strong>आपकी <code>CLAUDE.md</code> में क्या जाता है (वास्तविक excerpt — Section 1 + 2)</strong></summary>

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

ऊपर का हर मान — सटीक dependency coordinates, `dev.db` filename, `V1__create_tables.sql` migration नाम, "no JPA" — Claude द्वारा file लिखने से पहले scanner द्वारा `build.gradle` / `application.properties` / source tree से extract किया गया है। कुछ भी अनुमान नहीं लगाया गया।

</details>

<details>
<summary><strong>एक वास्तविक auto-loaded rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

`paths: ["**/*"]` glob का अर्थ है कि जब भी आप project में कोई file edit करते हैं तो Claude Code इस rule को auto-load करता है। rule में हर class नाम, package path, और exception handler scanned source से सीधे आता है — project के वास्तविक `CustomizeExceptionHandler` और `JacksonCustomizations` सहित।

</details>

<details>
<summary><strong>एक auto-generated <code>decision-log.md</code> seed (वास्तविक excerpt)</strong></summary>

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

Pass 4, `pass2-merged.json` से extract किए गए architectural decisions के साथ `decision-log.md` को seed करता है ताकि भविष्य के sessions याद रखें कि codebase जैसा दिखता है *क्यों* दिखता है — केवल यह नहीं कि *कैसा* दिखता है। हर option ("JPA/Hibernate", "MyBatis-Plus") और हर consequence वास्तविक `build.gradle` dependency block पर grounded है।

</details>

---

## परीक्षण किया गया

ClaudeOS-Core वास्तविक OSS projects पर reference benchmarks के साथ ship होता है। यदि आपने इसे किसी public repo पर इस्तेमाल किया है, तो कृपया [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues) — हम इसे इस table में जोड़ देंगे।

| Project | Stack | Scanned → Generated | Status |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ सभी 5 validators pass |

---

## त्वरित शुरुआत

**आवश्यकताएँ:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed और authenticated।

```bash
# 1. अपने project root पर जाएँ
cd my-spring-boot-project

# 2. init चलाएँ (यह आपके code का विश्लेषण करता है और Claude से rules लिखने को कहता है)
npx claudeos-core init

# 3. हो गया। Claude Code खोलें और coding शुरू करें — आपके rules पहले से ही loaded हैं।
```

`init` पूरा होने के बाद **आप क्या प्राप्त करते हैं**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code द्वारा auto-loaded
│       ├── 00.core/              (सामान्य rules — naming, architecture)
│       ├── 10.backend/           (backend stack rules, यदि कोई हो)
│       ├── 20.frontend/          (frontend stack rules, यदि कोई हो)
│       ├── 30.security-db/       (security & DB conventions)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync reminders — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (testing strategy + build verification reminders)
├── claudeos-core/
│   ├── standard/                 ← Reference docs (mirror category structure)
│   │   ├── 00.core/              (project overview, architecture, naming)
│   │   ├── 10.backend/           (backend reference — backend stack हो तो)
│   │   ├── 20.frontend/          (frontend reference — frontend stack हो तो)
│   │   ├── 30.security-db/       (security & DB reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (build / startup / testing reference — standard only)
│   │   └── 90.optional/          (stack-specific extras — standard only)
│   ├── skills/                   (पुन: उपयोग योग्य patterns जो Claude apply कर सकता है)
│   ├── guide/                    (सामान्य tasks के लिए how-to guides)
│   ├── database/                 (schema overview, migration guide)
│   ├── mcp-guide/                (MCP integration notes)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (वह index जिसे Claude सबसे पहले पढ़ता है)
```

`rules/` और `standard/` के बीच एक ही number prefix साझा करने वाली categories एक ही conceptual area को दर्शाती हैं (जैसे `10.backend` rules ↔ `10.backend` standards)। केवल-rules categories: `50.sync` (doc sync reminders) और `60.memory` (Pass 4 memory)। केवल-standard category: `90.optional` (बिना enforcement के stack-specific extras)। अन्य सभी prefixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) `rules/` और `standard/` दोनों में दिखाई देते हैं। Claude Code अब आपके project को जानता है।

---

## यह किसके लिए है?

| आप हैं... | यह जो pain हटाता है |
|---|---|
| **Claude Code के साथ नया project शुरू करने वाला solo dev** | "हर session में Claude को मेरे conventions सिखाओ" — गायब। `CLAUDE.md` + 8-category `.claude/rules/` एक pass में जनरेट हो जाते हैं। |
| **Repos में shared standards बनाए रखने वाला team lead** | जब लोग packages का नाम बदलते हैं, ORMs switch करते हैं, या response wrappers बदलते हैं तो `.claude/rules/` drift। ClaudeOS-Core deterministic रूप से re-sync करता है — समान input, byte-identical output, कोई diff noise नहीं। |
| **पहले से Claude Code उपयोग कर रहा है** लेकिन generated code ठीक करने से थक गया | गलत response wrapper, गलत package layout, MyBatis इस्तेमाल करने पर JPA, project में centralized middleware होने पर बिखरा हुआ `try/catch`। Scanner आपके वास्तविक conventions extract करता है; हर Claude pass एक स्पष्ट path allowlist के विरुद्ध चलता है। |
| **नए repo पर onboarding** (मौजूदा project, team में शामिल हो रहे हैं) | Repo पर `init` चलाएँ, एक living architecture map मिलता है: CLAUDE.md में stack table, ✅/❌ examples के साथ per-layer rules, मुख्य निर्णयों के पीछे "क्यों" से seeded decision log (JPA vs MyBatis, REST vs GraphQL, आदि)। 5 files पढ़ना 5,000 source files पढ़ने से बेहतर है। |
| **कोरियाई / जापानी / चीनी / 7 अन्य भाषाओं में काम करना** | अधिकांश Claude Code rule generators केवल-English हैं। ClaudeOS-Core **10 भाषाओं** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) में पूरा सेट लिखता है **byte-identical structural validation** के साथ — output language चाहे जो हो, समान `claude-md-validator` verdict। |
| **Monorepo पर चल रहे हैं** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend + frontend domains एक ही run में अलग prompts के साथ analyzed; `apps/*/` और `packages/*/` स्वचालित रूप से walked; per-stack rules `70.domains/{type}/` के अंतर्गत emit। |
| **OSS में योगदान या प्रयोग कर रहे हैं** | Output gitignore-friendly है — `claudeos-core/` आपका local working dir है, केवल `CLAUDE.md` + `.claude/` को ship करना आवश्यक है। बाधित होने पर resume-safe; re-runs पर idempotent (rules में आपके manual edits बिना `--force` के बच जाते हैं)। |

**उपयुक्त नहीं यदि:** आप एक one-size-fits-all preset bundle of agents/skills/rules चाहते हैं जो scan step के बिना day one पर काम करे (कौन-सा कहाँ fit होता है इसके लिए [docs/hi/comparison.md](docs/hi/comparison.md) देखें), आपका project अभी [supported stacks](#supported-stacks) में से किसी से match नहीं करता, या आपको केवल एक `CLAUDE.md` चाहिए (built-in `claude /init` पर्याप्त है — दूसरा tool install करने की जरूरत नहीं)।

---

## यह कैसे काम करता है?

ClaudeOS-Core सामान्य Claude Code workflow को उलट देता है:

```
सामान्य: आप project का वर्णन करते हैं → Claude आपके stack का अनुमान लगाता है → Claude docs लिखता है
यह:     Code आपके stack को पढ़ता है → Code पुष्टि किए गए facts Claude को देता है → Claude facts से docs लिखता है
```

Pipeline **तीन stages** में चलती है, LLM call के दोनों ओर code के साथ:

**1. Step A — Scanner (deterministic, कोई LLM नहीं)।** एक Node.js scanner आपके project root को walk करता है, `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` पढ़ता है, `.env*` files parse करता है (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` के लिए sensitive-variable redaction के साथ), आपके architecture pattern को classify करता है (Java के 5 patterns A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), domains discover करता है, और मौजूद हर source file path का explicit allowlist बनाता है। Output: `project-analysis.json` — आगे की हर चीज़ के लिए single source of truth।

**2. Step B — 4-Pass Claude pipeline (Step A के facts द्वारा constrained)।**
- **Pass 1** प्रत्येक domain group के representative files पढ़ता है और प्रति domain ~50–100 conventions extract करता है — response wrappers, logging libraries, error handling, naming conventions, test patterns। प्रति domain group एक बार चलता है (`max 4 domains, 40 files per group`) ताकि context कभी overflow न हो।
- **Pass 2** सभी per-domain analysis को project-wide picture में merge करता है और dominant convention चुनकर असहमतियों को resolve करता है।
- **Pass 3** `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides लिखता है — stages में split (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) ताकि `pass2-merged.json` बड़ा होने पर भी हर stage का prompt LLM के context window में fit हो जाए। ≥16-domain projects के लिए 3b/3c को ≤15-domain batches में sub-divide करता है।
- **Pass 4** L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) को seed करता है और universal scaffold rules जोड़ता है। Pass 4 को **`CLAUDE.md` modify करने से प्रतिबंधित किया गया है** — Pass 3 का Section 8 authoritative है।

**3. Step C — Verification (deterministic, कोई LLM नहीं)।** पाँच validators output check करते हैं:
- `claude-md-validator` — `CLAUDE.md` पर 25 structural checks (8 sections, H3/H4 counts, memory file uniqueness, T1 canonical heading invariant)। Language-invariant: `--lang` के बावजूद समान verdict।
- `content-validator` — 10 content checks जिसमें path-claim verification (`STALE_PATH` invented `src/...` references पकड़ता है) और MANIFEST drift detection शामिल है।
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count।
- `plan-validator` — plan ↔ disk consistency (legacy, v2.1.0 से लगभग no-op)।
- `sync-checker` — 7 tracked dirs पर disk ↔ `sync-map.json` registration consistency।

तीन severity tiers (`fail` / `warn` / `advisory`) ताकि warnings कभी CI को LLM hallucinations पर deadlock न करें जिन्हें user manually ठीक कर सकता है।

वह invariant जो सब कुछ एक साथ बाँधता है: **Claude केवल वे paths cite कर सकता है जो वास्तव में आपके code में मौजूद हैं**, क्योंकि Step A उसे एक finite allowlist देता है। यदि LLM फिर भी कुछ invent करने की कोशिश करता है (दुर्लभ लेकिन कुछ seeds पर होता है), तो Step C docs ship होने से पहले पकड़ लेता है।

प्रति-pass विवरण, marker-based resume, Claude Code के `.claude/` sensitive-path block के लिए staged-rules workaround, और stack detection internals के लिए, [docs/hi/architecture.md](docs/hi/architecture.md) देखें।

---

## Supported Stacks

12 stacks, आपकी project files से auto-detected:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack projects (जैसे Spring Boot backend + Next.js frontend) out of the box काम करते हैं।

Detection rules और प्रत्येक scanner क्या extract करता है, के लिए [docs/hi/stacks.md](docs/hi/stacks.md) देखें।

---

## दैनिक वर्कफ़्लो

तीन commands ~95% उपयोग को cover करते हैं:

```bash
# Project पर पहली बार
npx claudeos-core init

# जब आपने standards या rules को manually edit किया है
npx claudeos-core lint

# Health check (commits से पहले या CI में चलाएँ)
npx claudeos-core health
```

प्रत्येक command के पूरे options के लिए, [docs/hi/commands.md](docs/hi/commands.md) देखें। Memory layer commands (`memory compact`, `memory propose-rules`) नीचे [Memory Layer](#memory-layer-वैकल्पिक-दीर्घकालिक-प्रोजेक्ट्स-के-लिए) section में documented हैं।

---

## क्या इसे अलग बनाता है

अधिकांश Claude Code documentation tools description से जनरेट करते हैं (आप tool को बताते हैं, tool Claude को बताता है)। ClaudeOS-Core आपके वास्तविक source code से जनरेट करता है (tool पढ़ता है, tool Claude को बताता है कि क्या confirmed है, Claude केवल वही लिखता है जो confirmed है)।

तीन concrete consequences:

1. **Deterministic stack detection.** समान project + समान code = समान output। "Claude ने इस बार अलग roll किया" नहीं।
2. **No invented paths.** Pass 3 prompt हर allowed source path को स्पष्ट रूप से list करता है; Claude ऐसे paths cite नहीं कर सकता जो मौजूद नहीं हैं।
3. **Multi-stack aware.** Backend और frontend domains एक ही run में अलग analysis prompts का उपयोग करते हैं।

अन्य tools के साथ side-by-side scope comparison के लिए, [docs/hi/comparison.md](docs/hi/comparison.md) देखें। यह तुलना **हर tool क्या करता है** के बारे में है, **कौन सा बेहतर है** नहीं — अधिकांश complementary हैं।

---

## सत्यापन (जनरेशन के बाद)

Claude द्वारा docs लिखने के बाद, code उन्हें verify करता है। पाँच अलग validators:

| Validator | क्या check करता है | किसके द्वारा चलाया जाता है |
|---|---|---|
| `claude-md-validator` | CLAUDE.md structural invariants (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path claims वास्तव में मौजूद हैं; manifest consistency | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 outputs well-formed JSON हैं | `health` (warn) |
| `plan-validator` | Saved plan disk पर जो है उससे match करता है | `health` (fail-on-error) |
| `sync-checker` | Disk files `sync-map.json` registrations से match करते हैं (orphaned/unregistered detection) | `health` (fail-on-error) |

एक `health-checker` चार runtime validators को three-tier severity (fail / warn / advisory) के साथ orchestrate करता है और CI के लिए उचित code के साथ exit करता है। `claude-md-validator` `lint` command के माध्यम से अलग चलता है क्योंकि structural drift एक re-init signal है, soft warning नहीं। कभी भी चलाएँ:

```bash
npx claudeos-core health
```

प्रत्येक validator के checks के विवरण के लिए, [docs/hi/verification.md](docs/hi/verification.md) देखें।

---

## Memory Layer (वैकल्पिक, दीर्घकालिक प्रोजेक्ट्स के लिए)

ऊपर वाली scaffolding pipeline के अलावा, ClaudeOS-Core उन projects के लिए `claudeos-core/memory/` folder को seed करता है जहाँ context एक single session से अधिक जीवित रहता है। यह वैकल्पिक है — यदि आप केवल `CLAUDE.md` + rules चाहते हैं तो आप इसे ignore कर सकते हैं।

चार files, सभी Pass 4 द्वारा लिखी गईं:

- `decision-log.md` — append-only "हमने X के बजाय Y क्यों चुना", `pass2-merged.json` से seeded
- `failure-patterns.md` — frequency/importance scores के साथ recurring errors
- `compaction.md` — समय के साथ memory कैसे auto-compacted होती है
- `auto-rule-update.md` — patterns जिन्हें नए rules बनना चाहिए

समय के साथ इस layer को maintain करने के लिए दो commands:

```bash
# Failure-patterns log को compact करें (समय-समय पर चलाएँ)
npx claudeos-core memory compact

# बार-बार होने वाले failure patterns को proposed rules में promote करें
npx claudeos-core memory propose-rules
```

Memory model और lifecycle के लिए, [docs/hi/memory-layer.md](docs/hi/memory-layer.md) देखें।

---

## FAQ

**Q: क्या मुझे Claude API key चाहिए?**
A: नहीं। ClaudeOS-Core आपके मौजूदा Claude Code installation का उपयोग करता है — यह आपकी machine पर `claude -p` को prompts pipe करता है। कोई अतिरिक्त accounts नहीं।

**Q: क्या यह मेरी मौजूदा CLAUDE.md या `.claude/rules/` को overwrite करेगा?**
A: एक fresh project पर पहली run: यह उन्हें create करता है। `--force` के बिना re-running आपके edits को preserve करती है — पिछली run के pass markers detect होते हैं और passes skip हो जाते हैं। `--force` के साथ re-running सब कुछ wipe करके पुनर्जनरेट करता है (आपके edits खो जाते हैं — यही `--force` का अर्थ है)। [docs/hi/safety.md](docs/hi/safety.md) देखें।

**Q: मेरा stack supported नहीं है। क्या मैं एक जोड़ सकता हूँ?**
A: हाँ। नए stacks को ~3 prompt templates + एक domain scanner चाहिए। 8-step guide के लिए [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

**Q: मैं कोरियाई (या किसी अन्य भाषा) में docs कैसे जनरेट करूँ?**
A: `npx claudeos-core init --lang ko`। 10 भाषाएँ supported: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de।

**Q: क्या यह monorepos के साथ काम करता है?**
A: हाँ — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), और npm/yarn workspaces (`package.json#workspaces`) stack-detector द्वारा detect किए जाते हैं। प्रत्येक app को अपना analysis मिलता है। अन्य monorepo layouts (जैसे NX) विशेष रूप से detect नहीं किए जाते, लेकिन generic `apps/*/` और `packages/*/` patterns अभी भी per-stack scanners द्वारा pick किए जाते हैं।

**Q: यदि Claude Code ऐसे rules जनरेट करता है जिनसे मैं असहमत हूँ?**
A: उन्हें सीधे edit करें। फिर यह verify करने के लिए `npx claudeos-core lint` चलाएँ कि CLAUDE.md अभी भी structurally valid है। आपके edits बाद की `init` runs पर preserve रहते हैं (बिना `--force` के) — resume mechanism उन passes को skip करता है जिनके markers मौजूद हैं।

**Q: मैं bugs कहाँ report करूँ?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)। Security issues के लिए, [SECURITY.md](SECURITY.md) देखें।

---

## यदि इसने आपका समय बचाया

GitHub पर एक ⭐ project को दिखाई देने में मदद करता है और दूसरों को इसे खोजने में मदद करता है। Issues, PRs, और stack template योगदान सभी का स्वागत है — [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

---

## दस्तावेज़ीकरण

| विषय | यह पढ़ें |
|---|---|
| 4-pass pipeline कैसे काम करती है (diagram से गहरा) | [docs/hi/architecture.md](docs/hi/architecture.md) |
| Architecture के visual diagrams (Mermaid) | [docs/hi/diagrams.md](docs/hi/diagrams.md) |
| Stack detection — हर scanner क्या ढूँढता है | [docs/hi/stacks.md](docs/hi/stacks.md) |
| Memory layer — decision logs और failure patterns | [docs/hi/memory-layer.md](docs/hi/memory-layer.md) |
| सभी 5 validators विस्तार से | [docs/hi/verification.md](docs/hi/verification.md) |
| हर CLI command और option | [docs/hi/commands.md](docs/hi/commands.md) |
| Manual installation (बिना `npx` के) | [docs/hi/manual-installation.md](docs/hi/manual-installation.md) |
| Scanner overrides — `.claudeos-scan.json` | [docs/hi/advanced-config.md](docs/hi/advanced-config.md) |
| Safety: re-init पर क्या preserved होता है | [docs/hi/safety.md](docs/hi/safety.md) |
| समान tools के साथ तुलना (scope, quality नहीं) | [docs/hi/comparison.md](docs/hi/comparison.md) |
| Errors और recovery | [docs/hi/troubleshooting.md](docs/hi/troubleshooting.md) |

---

## योगदान

योगदान का स्वागत है — stack support जोड़ना, prompts सुधारना, bugs ठीक करना। [CONTRIBUTING.md](CONTRIBUTING.md) देखें।

Code of Conduct और security policy के लिए, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) और [SECURITY.md](SECURITY.md) देखें।

## लाइसेंस

[ISC License](LICENSE)। Commercial सहित किसी भी उपयोग के लिए मुफ़्त। © 2025–2026 ClaudeOS-Core contributors।

---

<sub>[claudeos-core](https://github.com/claudeos-core) team द्वारा maintained। Issues और PRs <https://github.com/claudeos-core/claudeos-core> पर।</sub>
