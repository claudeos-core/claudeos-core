# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**अपने वास्तविक स्रोत कोड से Claude Code दस्तावेज़ स्वतः उत्पन्न करें।** एक CLI टूल जो आपके प्रोजेक्ट का स्थैतिक विश्लेषण करता है, फिर 4-pass Claude पाइपलाइन चलाकर `.claude/rules/`, standards, skills और guides उत्पन्न करता है — ताकि Claude Code सामान्य परिपाटियों के बजाय **आपके प्रोजेक्ट की** परिपाटियों का पालन करे।

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## यह क्या है?

आप Claude Code का उपयोग करते हैं। यह स्मार्ट है, लेकिन यह **आपके प्रोजेक्ट की परिपाटियाँ** नहीं जानता:
- आपकी टीम MyBatis का उपयोग करती है, लेकिन Claude JPA कोड उत्पन्न करता है।
- आपका wrapper `ApiResponse.ok()` है, लेकिन Claude `ResponseEntity.success()` लिखता है।
- आपके packages `controller/order/` हैं, लेकिन Claude `order/controller/` बनाता है।

इसलिए आप उत्पन्न हर फ़ाइल को ठीक करने में काफ़ी समय लगाते हैं।

**ClaudeOS-Core इसे ठीक करता है।** यह आपके वास्तविक स्रोत कोड को स्कैन करता है, आपकी परिपाटियों का पता लगाता है, और `.claude/rules/` में नियमों का एक पूरा सेट लिखता है — वह डायरेक्टरी जिसे Claude Code स्वचालित रूप से पढ़ता है। अगली बार जब आप कहेंगे _"orders के लिए CRUD बनाओ"_, Claude पहली कोशिश में ही आपकी परिपाटियों का पालन करेगा।

```
पहले:  आप → Claude Code → "सामान्य रूप से अच्छा" कोड → मैन्युअल फ़िक्सिंग
बाद में:  आप → Claude Code → आपके प्रोजेक्ट से मेल खाता कोड → सीधे उपयोग
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
<summary><strong>📄 आपकी <code>CLAUDE.md</code> में क्या होता है (वास्तविक अंश)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

ध्यान दें: ऊपर के सभी दावे वास्तविक स्रोत पर आधारित हैं — class names, package paths, configuration keys और dead-config flag तक — सब Claude द्वारा फ़ाइल लिखने से पहले scanner द्वारा निकाले गए हैं।

</details>

<details>
<summary><strong>🛡️ एक वास्तविक auto-loaded rule (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

`paths: ["**/*"]` glob का अर्थ है कि जब भी आप प्रोजेक्ट की किसी भी फ़ाइल को संपादित करते हैं, Claude Code इस rule को स्वचालित रूप से लोड कर लेता है। ✅/❌ उदाहरण इस codebase की वास्तविक परिपाटियों और मौजूदा बग पैटर्न से सीधे आते हैं।

</details>

<details>
<summary><strong>🧠 एक स्वतः उत्पन्न <code>decision-log.md</code> seed (वास्तविक अंश)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 `pass2-merged.json` से निकाले गए architectural निर्णयों के साथ `decision-log.md` को seed करता है ताकि भविष्य के sessions याद रखें कि codebase जैसा है _वैसा क्यों है_ — सिर्फ़ यह नहीं कि _कैसा दिखता है_।

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

| आप हैं... | यह आपकी मदद करता है... |
|---|---|
| **Claude Code के साथ नया प्रोजेक्ट शुरू करने वाले एकल डेवलपर** | "Claude को मेरी परिपाटियाँ सिखाने" का चरण पूरी तरह छोड़ देने में |
| **साझा मानक बनाए रखने वाले team lead** | `.claude/rules/` को अद्यतन रखने के थकाऊ हिस्से को स्वचालित करने में |
| **Claude Code का पहले से उपयोग करने वाले लेकिन उत्पन्न कोड को ठीक करते-करते थके हुए** | Claude को "सामान्य रूप से अच्छे" पैटर्न के बजाय आपके पैटर्न का पालन करवाने में |

**यदि उपयुक्त नहीं:** यदि आप scan चरण के बिना दिन एक से काम करने वाला agents/skills/rules का one-size-fits-all preset bundle चाहते हैं ([docs/hi/comparison.md](docs/hi/comparison.md) देखें कि क्या कहाँ फिट होता है), या आपका प्रोजेक्ट अभी [समर्थित stacks](#supported-stacks) में से किसी से मेल नहीं खाता।

---

## यह कैसे काम करता है?

ClaudeOS-Core सामान्य Claude Code workflow को उलट देता है:

```
सामान्य:    आप प्रोजेक्ट का वर्णन करते हैं → Claude आपके stack का अनुमान लगाता है → Claude docs लिखता है
यह:         कोड आपके stack को पढ़ता है → कोड पुष्ट तथ्य Claude को देता है → Claude तथ्यों से docs लिखता है
```

मूल विचार: **Node.js scanner पहले आपके स्रोत कोड को पढ़ता है** (deterministic, कोई AI नहीं), फिर 4-pass Claude पाइपलाइन दस्तावेज़ लिखती है, scanner ने जो पाया है उसके द्वारा सीमित। Claude ऐसे paths या frameworks का आविष्कार नहीं कर सकता जो वास्तव में आपके कोड में नहीं हैं।

पूर्ण architecture के लिए, [docs/hi/architecture.md](docs/hi/architecture.md) देखें।

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
