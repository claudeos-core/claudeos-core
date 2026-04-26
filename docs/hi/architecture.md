# Architecture — 4-Pass पाइपलाइन

यह दस्तावेज़ बताता है कि `claudeos-core init` शुरू से अंत तक कैसे काम करता है। यदि आप केवल टूल का उपयोग करना चाहते हैं, तो [मुख्य README](../../README.hi.md) पर्याप्त है — यह _क्यों_ डिज़ाइन ऐसा दिखता है को समझने के लिए है।

यदि आपने टूल का कभी उपयोग नहीं किया है, तो [पहले एक बार चलाएँ](../../README.hi.md#quick-start)। आउटपुट देखने के बाद नीचे की अवधारणाएँ बहुत तेज़ी से समझ में आएँगी।

> अंग्रेज़ी मूल: [docs/architecture.md](../architecture.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

---

## मूल विचार — "Code पुष्ट करता है, Claude बनाता है"

Claude Code documentation उत्पन्न करने वाले अधिकांश tools एक चरण में काम करते हैं:

```
आपका वर्णन  →  Claude  →  CLAUDE.md / rules / standards
```

Claude को आपके stack, आपकी परिपाटियों, आपकी domain संरचना का अनुमान लगाना पड़ता है। यह अच्छा अनुमान लगाता है, लेकिन फिर भी अनुमान है। ClaudeOS-Core इसे उलट देता है:

```
आपका स्रोत कोड
       ↓
[Step A: कोड पढ़ता है]      ← Node.js scanner, deterministic, कोई AI नहीं
       ↓
project-analysis.json     ← पुष्ट तथ्य: stack, domains, paths
       ↓
[Step B: Claude लिखता है]   ← 4-pass LLM पाइपलाइन, तथ्यों द्वारा सीमित
       ↓
[Step C: कोड सत्यापित करता है]   ← 5 validators, स्वचालित रूप से चलते हैं
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**कोड उन हिस्सों को करता है जिन्हें सटीक होना चाहिए** (आपका stack, आपकी फ़ाइल paths, आपकी domain संरचना)।
**Claude उन हिस्सों को करता है जिन्हें अभिव्यंजक होना चाहिए** (व्याख्या, परिपाटियाँ, गद्य)।
ये overlap नहीं करते, और एक-दूसरे पर शक नहीं करते।

यह क्यों मायने रखता है: एक LLM ऐसे paths या frameworks का आविष्कार नहीं कर सकता जो वास्तव में आपके कोड में नहीं हैं। Pass 3 prompt scanner से source paths की allowlist स्पष्ट रूप से Claude को सौंपता है। यदि Claude सूची में नहीं होने वाले path का उल्लेख करने की कोशिश करता है, तो post-generation `content-validator` इसे flag कर देता है।

---

## Step A — Scanner (deterministic)

Claude को आह्वान करने से पहले, एक Node.js प्रक्रिया आपके प्रोजेक्ट को चलती है और `claudeos-core/generated/project-analysis.json` लिखती है। यह फ़ाइल आगे आने वाली हर चीज़ के लिए single source of truth है।

### Scanner क्या पढ़ता है

Scanner प्रोजेक्ट रूट पर इन फ़ाइलों से संकेत उठाता है:

| फ़ाइल | scanner को क्या बताती है |
|---|---|
| `package.json` | Node.js project; `dependencies` के माध्यम से framework |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; packages के माध्यम से framework |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |
| `.env*` फ़ाइलें | Runtime config (port, host, DB URL — नीचे देखें) |

यदि कुछ भी मेल नहीं खाता, तो `init` अनुमान लगाने के बजाय एक स्पष्ट त्रुटि के साथ रुकता है।

### Scanner `project-analysis.json` में क्या लिखता है

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — Java के लिए, 5 patterns में से एक (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal)। Kotlin के लिए, CQRS / BFF / multi-module detection। Frontend के लिए, App Router / Pages Router / FSD layouts के साथ-साथ `components/*/` patterns, multi-stage fallbacks के साथ।
- **Domain list** — directory tree को चलकर खोजी गई, प्रति-domain फ़ाइल गणना के साथ। Pass 1 के पढ़ने के लिए scanner प्रति-domain एक या दो प्रतिनिधि फ़ाइलें चुनता है।
- **Source path allowlist** — आपके प्रोजेक्ट में मौजूद हर source फ़ाइल path। Pass 3 prompts इस सूची को स्पष्ट रूप से शामिल करते हैं ताकि Claude के पास अनुमान लगाने के लिए कुछ न हो।
- **Monorepo संरचना** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), और npm/yarn workspaces (`package.json#workspaces`), जब मौजूद हों। NX विशेष रूप से auto-detect नहीं होता; सामान्य `apps/*/` और `packages/*/` patterns को प्रति-stack scanners द्वारा फिर भी उठाया जाता है।
- **`.env` snapshot** — port, host, API target, sensitive vars redacted। Search order के लिए [stacks.md](stacks.md) देखें।

Scanner में **कोई LLM call नहीं है**। एक ही प्रोजेक्ट + एक ही कोड = एक ही `project-analysis.json`, हर बार।

प्रति-stack विवरण (प्रत्येक scanner क्या निकालता है और कैसे) के लिए, [stacks.md](stacks.md) देखें।

---

## Step B — 4-pass Claude पाइपलाइन

प्रत्येक pass का एक विशिष्ट कार्य है। वे क्रम में चलते हैं, Pass N (N-1) के आउटपुट को एक छोटी संरचित फ़ाइल के रूप में पढ़ता है (पिछले सभी passes के पूरे आउटपुट के रूप में नहीं)।

### Pass 1 — प्रति-domain गहरा विश्लेषण

**Input:** `project-analysis.json` + प्रत्येक domain से एक प्रतिनिधि फ़ाइल।

**यह क्या करता है:** प्रतिनिधि फ़ाइलों को पढ़ता है और प्रति-stack दर्जनों विश्लेषण श्रेणियों में patterns निकालता है (आम तौर पर 50 से 100+ bullet-स्तर items, stack के अनुसार बदलता है — Kotlin/Spring का CQRS-aware template सबसे घना है, हल्के Node.js templates सबसे संक्षिप्त हैं)। उदाहरण के लिए: "क्या यह controller `@RestController` या `@Controller` का उपयोग करता है? कौन सा response wrapper उपयोग होता है? कौन सी logging library?"

**Output:** `pass1-<group-N>.json` — प्रति domain group एक फ़ाइल।

बड़े प्रोजेक्ट के लिए, Pass 1 कई बार चलता है — प्रति domain group एक आह्वान। Grouping नियम है **प्रति group अधिकतम 4 domains और 40 फ़ाइलें**, `plan-installer/domain-grouper.js` में स्वचालित रूप से लागू। एक 12-domain प्रोजेक्ट Pass 1 को तीन बार चलाएगा।

यह split इसलिए मौजूद है क्योंकि Claude का context window सीमित है। 12 domains के source files को एक prompt में फिट करने की कोशिश करने पर या तो context overflow होगा या LLM को सरसरी तौर पर पढ़ना पड़ेगा। Splitting प्रत्येक pass को केंद्रित रखता है।

### Pass 2 — Cross-domain merge

**Input:** सभी `pass1-*.json` फ़ाइलें।

**यह क्या करता है:** उन्हें एक प्रोजेक्ट-व्यापी चित्र में merge करता है। जब दो domains असहमत होते हैं (उदाहरण: एक कहता है response wrapper `success()` है, दूसरा कहता है `ok()`), Pass 2 प्रमुख परिपाटी चुनता है और असहमति को नोट करता है।

**Output:** `pass2-merged.json` — आम तौर पर 100–400 KB।

### Pass 3 — Documentation generation (split mode)

**Input:** `pass2-merged.json`।

**यह क्या करता है:** वास्तविक documentation लिखता है। यह भारी pass है — यह CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`, और `claudeos-core/mcp-guide/` में ~40–50 markdown फ़ाइलें उत्पन्न करता है।

**Output:** सभी user-facing फ़ाइलें, [मुख्य README](../../README.hi.md#quick-start) में दिखाई गई directory संरचना में संगठित।

प्रत्येक stage का आउटपुट Claude के context window के भीतर रखने के लिए (merged Pass 2 input बड़ा है, और उत्पन्न आउटपुट और भी बड़ा है), Pass 3 **हमेशा stages में split होता है** — यहाँ तक कि छोटे projects के लिए भी। Split बिना शर्त लागू होता है; छोटे projects में बस कम प्रति-domain batches होते हैं:

| Stage | यह क्या लिखता है |
|---|---|
| **3a** | `pass2-merged.json` से निकाली गई एक छोटी "facts table" (`pass3a-facts.md`)। बाद के stages के लिए संकुचित input के रूप में कार्य करती है ताकि उन्हें बड़ी merged फ़ाइल को फिर से न पढ़ना पड़े। |
| **3b-core** | `CLAUDE.md` (वह index जिसे Claude Code सबसे पहले पढ़ता है) + `claudeos-core/standard/` का बड़ा हिस्सा उत्पन्न करता है। |
| **3b-N** | प्रति-domain rule और standard फ़ाइलें (≤15 domains के group प्रति एक stage)। |
| **3c-core** | `claudeos-core/skills/` orchestrator फ़ाइलें + `claudeos-core/guide/` उत्पन्न करता है। |
| **3c-N** | प्रति-domain skill फ़ाइलें। |
| **3d-aux** | `claudeos-core/database/` और `claudeos-core/mcp-guide/` के तहत सहायक सामग्री उत्पन्न करता है। |

बहुत बड़े projects (≥16 domains) के लिए, 3b और 3c और batches में sub-divide होते हैं। प्रत्येक batch को एक नया context window मिलता है।

जब सभी stages सफलतापूर्वक समाप्त हो जाते हैं, तो `pass3-complete.json` एक marker के रूप में लिखा जाता है। यदि `init` बीच में बाधित हो जाता है, तो अगली run marker पढ़ती है और अगले unstarted stage से फिर से शुरू होती है — पूर्ण किए गए stages फिर से नहीं चलाए जाते।

### Pass 4 — Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`।

**यह क्या करता है:** L4 memory layer + सार्वभौमिक scaffold rules उत्पन्न करता है। सभी scaffold writes **skip-if-exists** हैं, इसलिए Pass 4 को फिर से चलाने पर कुछ भी overwrite नहीं होता।

- `claudeos-core/memory/` — 4 markdown फ़ाइलें (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 rule फ़ाइलें (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) जो Claude Code द्वारा संबंधित क्षेत्रों को संपादित करते समय memory फ़ाइलों को auto-load करती हैं
- `.claude/rules/00.core/51.doc-writing-rules.md` और `52.ai-work-rules.md` — सार्वभौमिक generic rules (Pass 3 `00.standard-reference.md` जैसी प्रोजेक्ट-विशिष्ट `00.core` rules उत्पन्न करता है; Pass 4 इन दो आरक्षित-स्लॉट फ़ाइलों को जोड़ता है यदि वे पहले से मौजूद नहीं हैं)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — अतिरिक्त rules लिखने पर meta-guide। संख्यात्मक prefix `Math.max(existing-numbers) + 1` के रूप में स्वतः निर्धारित होती है, इसलिए यह आम तौर पर `04` या `05` होती है, इसके आधार पर कि Pass 3 ने पहले से वहाँ क्या लिखा है।

**Output:** Memory फ़ाइलें + `pass4-memory.json` marker।

महत्वपूर्ण: **Pass 4 `CLAUDE.md` को संशोधित नहीं करता।** Pass 3 ने पहले से ही Section 8 लिखी है (जो memory फ़ाइलों का संदर्भ देती है)। यहाँ CLAUDE.md को फिर से संशोधित करने पर Section 8 की सामग्री फिर से घोषित होगी और validator errors trigger होंगी। यह prompt द्वारा लागू किया जाता है और `tests/pass4-claude-md-untouched.test.js` द्वारा सत्यापित किया जाता है।

प्रत्येक memory फ़ाइल क्या करती है और lifecycle के विवरण के लिए, [memory-layer.md](memory-layer.md) देखें।

---

## Step C — Verification (deterministic, post-Claude)

Claude के समाप्त होने के बाद, Node.js कोड 5 validators में आउटपुट को सत्यापित करता है। **उनमें से कोई भी LLM को call नहीं करता** — सभी checks deterministic हैं।

| Validator | यह क्या जाँचता है |
|---|---|
| `claude-md-validator` | `CLAUDE.md` पर संरचनात्मक checks (top-level section count, प्रति-section H3/H4 counts, memory-file table-row uniqueness/scope, T1 canonical heading tokens)। Language-invariant — सभी 10 आउटपुट भाषाओं के लिए वही checks पास होते हैं। |
| `content-validator` | 10 content-स्तर checks: आवश्यक फ़ाइलें मौजूद हैं, standards/skills में उद्धृत paths वास्तविक हैं, MANIFEST सुसंगत है। |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 JSON आउटपुट well-formed हैं और अपेक्षित keys होती हैं। |
| `plan-validator` | (Legacy) सहेजी गई plan फ़ाइलों की disk से तुलना करता है। Master plan generation v2.1.0 में हटा दिया गया था, इसलिए यह अब अधिकतर no-op है — backward compat के लिए रखा गया है। |
| `sync-checker` | tracked dirs के तहत disk फ़ाइलें `sync-map.json` registrations से मेल खाती हैं (orphaned vs. unregistered)। |

इनके पास **3 severity tiers** हैं:

- **fail** — पूरा होने को block करता है, CI में non-zero exit करता है। कुछ संरचनात्मक रूप से टूटा हुआ है।
- **warn** — आउटपुट में दिखाई देता है, लेकिन block नहीं करता। जाँचने योग्य।
- **advisory** — बाद में समीक्षा करें। असामान्य प्रोजेक्ट layouts में अक्सर false positives (उदाहरण: gitignored फ़ाइलें "missing" के रूप में flagged)।

प्रति-validator पूर्ण check सूची के लिए, [verification.md](verification.md) देखें।

Validators को दो तरीकों से orchestrate किया जाता है:

1. **`claudeos-core lint`** — केवल `claude-md-validator` चलाता है। तेज़, structural-only। CLAUDE.md को मैन्युअल रूप से संपादित करने के बाद उपयोग करें।
2. **`claudeos-core health`** — अन्य 4 validators चलाता है (claude-md-validator जानबूझकर अलग है, क्योंकि CLAUDE.md में संरचनात्मक drift एक re-init संकेत है, soft warning नहीं)। CI में अनुशंसित।

---

## यह architecture क्यों मायने रखती है

### Fact-injected prompts hallucination को रोकते हैं

जब Pass 3 चलता है, prompt लगभग ऐसा दिखता है (सरलीकृत):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude के पास paths का आविष्कार करने का कोई अवसर नहीं है। बाधा **positive** (whitelist) है, negative नहीं ("things बनाना मत") — यह अंतर मायने रखता है क्योंकि LLMs ठोस positive constraints का अधिक अच्छी तरह से पालन करते हैं बजाय अमूर्त negative constraints के।

यदि इसके बावजूद Claude अभी भी एक मनगढ़ंत path का उद्धरण देता है, तो अंत में `content-validator [10/10]` check इसे `STALE_PATH` के रूप में flag करता है। उपयोगकर्ता docs ship होने से पहले चेतावनी देख लेता है।

### Markers के माध्यम से Resume-safe

प्रत्येक pass सफलतापूर्वक पूर्ण होने पर एक marker फ़ाइल (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) लिखता है। यदि `init` बाधित हो जाता है (network blip, timeout, आप Ctrl-C करते हैं), तो अगली run markers पढ़ती है और जहाँ पिछली ने छोड़ा था वहाँ से उठाती है। आप काम नहीं खोते।

Pass 3 का marker यह भी track करता है कि **कौन से sub-stages** पूर्ण हुए, इसलिए एक आंशिक Pass 3 (उदाहरण: 3b समाप्त, 3c stage के बीच crash हुआ) अगले stage से फिर से शुरू होता है, 3a से नहीं।

### Idempotent re-runs

ऐसे प्रोजेक्ट पर `init` चलाना जिसमें पहले से rules हैं **मैन्युअल edits को चुपचाप overwrite नहीं करता**।

तंत्र: Claude Code की permission प्रणाली `--dangerously-skip-permissions` के साथ भी `.claude/` पर subprocess writes को block करती है। इसलिए Pass 3/4 को rule फ़ाइलों को इसके बजाय `claudeos-core/generated/.staged-rules/` में लिखने का निर्देश दिया जाता है। प्रत्येक pass के बाद, Node.js orchestrator (जो Claude Code की permission policy के अधीन नहीं है) staged फ़ाइलों को `.claude/rules/` में move करता है।

व्यवहार में इसका अर्थ है: **एक नए प्रोजेक्ट पर, फिर से चलाने पर सब कुछ नया बनता है। एक प्रोजेक्ट पर जहाँ आपने rules को मैन्युअल रूप से संपादित किया है, `--force` के साथ फिर से चलाने पर scratch से regenerate होता है (आपके edits खो जाते हैं — `--force` का यही अर्थ है)। `--force` के बिना, resume तंत्र किक करता है और केवल अधूरे passes चलते हैं।**

पूर्ण preservation कहानी के लिए, [safety.md](safety.md) देखें।

### Language-invariant verification

Validators अनुवादित heading text का मिलान नहीं करते। वे **संरचनात्मक आकार** (heading levels, counts, ordering) का मिलान करते हैं। इसका मतलब है कि एक ही `claude-md-validator` 10 समर्थित भाषाओं में से किसी में भी उत्पन्न CLAUDE.md पर byte-for-byte समान verdicts उत्पन्न करता है। कोई प्रति-भाषा dictionaries नहीं। नई भाषा जोड़ने पर कोई maintenance भार नहीं।

---

## प्रदर्शन — क्या अपेक्षा करें

ठोस समय बहुत कुछ इस पर निर्भर करता है:
- प्रोजेक्ट का आकार (source files की संख्या, domains की संख्या)
- Anthropic API के साथ network latency
- आपके Claude Code config में कौन सा Claude model चुना गया है

मोटी मार्गदर्शिका:

| चरण | छोटा प्रोजेक्ट (<200 files) | मध्यम प्रोजेक्ट (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 सेकंड | 10–30 सेकंड |
| Step B (4 Claude passes) | कुछ मिनट | 10–30 मिनट |
| Step C (validators) | < 5 सेकंड | 10–20 सेकंड |

बड़े projects पर wall clock पर Pass 1 का प्रभुत्व होता है क्योंकि यह प्रति domain group एक बार चलता है। एक 24-domain प्रोजेक्ट = 6 Pass-1 आह्वान (24 / 4 domains प्रति group)।

यदि आप एक सटीक संख्या चाहते हैं, तो अपने प्रोजेक्ट पर एक बार चलाएँ — यही एकमात्र ईमानदार उत्तर है।

---

## प्रत्येक चरण का कोड कहाँ रहता है

| चरण | फ़ाइल |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| प्रति-stack scanners | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt assembly | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass templates | `pass-prompts/templates/<stack>/pass{1,2,3}.md` प्रति stack; `pass-prompts/templates/common/pass4.md` stacks में साझा |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## आगे पढ़ने के लिए

- [stacks.md](stacks.md) — प्रत्येक scanner प्रति-stack क्या निकालता है
- [memory-layer.md](memory-layer.md) — Pass 4 विस्तार से
- [verification.md](verification.md) — सभी 5 validators
- [diagrams.md](diagrams.md) — वही architecture Mermaid चित्रों के रूप में
- [comparison.md](comparison.md) — यह अन्य Claude Code tools से कैसे भिन्न है
