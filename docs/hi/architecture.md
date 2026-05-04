# Architecture — 4-Pass Pipeline

यह doc बताता है कि `claudeos-core init` end to end कैसे काम करता है। बस tool use करना है तो [main README](../../README.hi.md) काफ़ी है। यह doc समझाने के लिए है कि design ऐसा _क्यों_ है।

Tool कभी use नहीं किया तो [पहले एक बार चला लीजिए](../../README.hi.md#त्वरित-शुरुआत). Output देखने के बाद नीचे वाले concepts बहुत जल्दी समझ आएँगे।

> English original: [docs/architecture.md](../architecture.md). हिन्दी translation English के साथ sync में रखा है।

---

## मूल idea: "Code तय करता है, Claude लिखता है"

Claude Code documentation generate करने वाले ज़्यादातर tools एक ही step में काम करते हैं:

```
आपका वर्णन  →  Claude  →  CLAUDE.md / rules / standards
```

Claude को आपके stack, conventions, domain structure का अंदाज़ा लगाना पड़ता है। अंदाज़ा अच्छा होता है, लेकिन रहता अंदाज़ा ही है। ClaudeOS-Core इसे उल्टा कर देता है:

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

**Code वो हिस्सा करता है जिसे precise होना है** (आपका stack, file paths, domain structure).
**Claude वो हिस्सा करता है जिसे expressive होना है** (explanation, conventions, prose).
दोनों overlap नहीं करते, और एक-दूसरे पर doubt भी नहीं करते।

यह matter क्यों करता है: LLM ऐसे paths या frameworks बना ही नहीं सकता जो आपके code में हैं ही नहीं। Pass 3 prompt scanner से मिली source paths की allowlist explicitly Claude को pass करता है। List के बाहर का कोई path mention करने की Claude कोशिश करे, तो post-generation `content-validator` उसे flag कर देता है।

---

## Step A: Scanner (deterministic)

Claude को invoke करने से पहले एक Node.js process आपके project को scan करती है और `claudeos-core/generated/project-analysis.json` लिखती है। यह file आगे होने वाली हर चीज़ की single source of truth है।

### Scanner क्या पढ़ता है

Scanner project root पर इन files से signals उठाता है:

| File | scanner को क्या बताती है |
|---|---|
| `package.json` | Node.js project; framework `dependencies` से |
| `pom.xml` | Java/Maven project |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle project |
| `pyproject.toml` / `requirements.txt` | Python project; framework packages से |
| `angular.json` | Angular project |
| `nuxt.config.{ts,js}` | Nuxt project |
| `next.config.{ts,js}` | Next.js project |
| `vite.config.{ts,js}` | Vite project |
| `.env*` files | Runtime config (port, host, DB URL, नीचे देखिए) |

कुछ भी match न हो तो `init` अंदाज़ा लगाने की जगह साफ़ error के साथ रुक जाता है।

### Scanner `project-analysis.json` में क्या लिखता है

- **Stack metadata**: language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern**: Java के लिए 5 में से एक pattern (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Kotlin के लिए CQRS / BFF / multi-module detection. Frontend के लिए App Router / Pages Router / FSD layouts और `components/*/` patterns, multi-stage fallbacks के साथ।
- **Domain list**: directory tree walk करके मिली, हर domain के file counts के साथ। Pass 1 को पढ़ाने के लिए scanner per-domain एक या दो representative files चुनता है।
- **Source path allowlist**: आपके project में मौजूद हर source file path. Pass 3 prompts इस list को explicitly include करते हैं, ताकि Claude के पास अंदाज़ा लगाने की गुंजाइश ही न रहे।
- **Monorepo structure**: Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), और npm/yarn workspaces (`package.json#workspaces`), जब भी मौजूद हों। NX explicitly auto-detect नहीं होता, लेकिन सामान्य `apps/*/` और `packages/*/` patterns per-stack scanners उठा ही लेते हैं।
- **`.env` snapshot**: port, host, API target, sensitive vars redacted. Search order के लिए [stacks.md](stacks.md) देखिए।

Scanner में **कोई LLM call नहीं** है। एक ही project + एक ही code = एक ही `project-analysis.json`, हर बार।

Per-stack details (हर scanner क्या निकालता है और कैसे) के लिए [stacks.md](stacks.md) देखिए।

---

## Step B: 4-pass Claude pipeline

हर pass का एक specific काम है। ये क्रम में चलते हैं, Pass N (N-1) का output एक छोटी structured file की तरह पढ़ता है (पिछले सब passes का पूरा output नहीं).

### Pass 1: Per-domain deep analysis

**Input:** `project-analysis.json` + हर domain से एक representative file.

**करता क्या है:** Representative files पढ़ता है और per-stack दर्जनों analysis categories में patterns निकालता है (आमतौर पर 50 से 100+ bullet-level items, stack के हिसाब से बदलते हैं. Kotlin/Spring का CQRS-aware template सबसे dense है, light Node.js templates सबसे छोटे). जैसे: "यह controller `@RestController` use करता है या `@Controller`? Response wrapper कौन सा है? Logging library कौन सी?"

**Output:** `pass1-<group-N>.json`, हर domain group के लिए एक file.

बड़े projects के लिए Pass 1 कई बार चलता है, हर domain group पर एक invocation. Grouping rule: **per group max 4 domains और 40 files**, `plan-installer/domain-grouper.js` में automatically apply होता है। 12-domain project में Pass 1 तीन बार चलेगा।

यह split इसलिए है क्योंकि Claude का context window limited है। 12 domains के source files एक ही prompt में ठूँसने की कोशिश में या तो context overflow होगा, या LLM सरसरी तौर पर पढ़ेगा। Split करने से हर pass focused रहता है।

### Pass 2: Cross-domain merge

**Input:** सारी `pass1-*.json` files.

**करता क्या है:** सबको एक project-wide picture में merge करता है। जब दो domains disagree करते हैं (मसलन एक कहता है response wrapper `success()` है, दूसरा कहता है `ok()`), Pass 2 dominant convention चुनता है और disagreement note कर लेता है।

**Output:** `pass2-merged.json`, आमतौर पर 100–400 KB.

### Pass 3: Documentation generation (split mode)

**Input:** `pass2-merged.json`.

**करता क्या है:** Actual documentation लिखता है। यह heavy pass है। CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`, और `claudeos-core/mcp-guide/` में ~40–50 markdown files generate करता है।

**Output:** सारी user-facing files, [main README](../../README.hi.md#त्वरित-शुरुआत) में दिखाए directory structure में organized.

हर stage का output Claude के context window में फिट बैठाने के लिए (merged Pass 2 input बड़ा है, और generate होने वाला output और भी बड़ा), Pass 3 **हमेशा stages में split होता है**, छोटे projects के लिए भी। Split unconditionally apply होता है, बस छोटे projects में per-domain batches कम होते हैं:

| Stage | क्या लिखता है |
|---|---|
| **3a** | `pass2-merged.json` से निकाली एक छोटी "facts table" (`pass3a-facts.md`). आगे के stages के लिए compact input की तरह काम करती है, ताकि उन्हें बड़ी merged file दोबारा न पढ़नी पड़े। |
| **3b-core** | `CLAUDE.md` (वह index जो Claude Code सबसे पहले पढ़ता है) + `claudeos-core/standard/` का बड़ा हिस्सा generate करता है। |
| **3b-N** | Per-domain rule और standard files (per stage ≤15 domains का group). |
| **3c-core** | `claudeos-core/skills/` orchestrator files + `claudeos-core/guide/` generate करता है। |
| **3c-N** | Per-domain skill files. |
| **3d-aux** | `claudeos-core/database/` और `claudeos-core/mcp-guide/` के नीचे auxiliary content generate करता है। |

बहुत बड़े projects (≥16 domains) में 3b और 3c और batches में sub-divide होते हैं। हर batch को fresh context window मिलता है।

सारे stages successfully खत्म हो जाएँ, तो `pass3-complete.json` marker की तरह लिख दिया जाता है। `init` बीच में रुक जाए, तो अगला run marker पढ़ता है और जो stage start नहीं हुआ था वहीं से resume करता है। पूरे हो चुके stages दोबारा नहीं चलते।

### Pass 4: Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**करता क्या है:** L4 memory layer + universal scaffold rules generate करता है। सारे scaffold writes **skip-if-exists** हैं, इसलिए Pass 4 दोबारा चलाने पर कुछ भी overwrite नहीं होता।

- `claudeos-core/memory/`: 4 markdown files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/`: 4 rule files (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`). Claude Code जब relevant areas edit करता है तो ये memory files को auto-load कर लेती हैं।
- `.claude/rules/00.core/51.doc-writing-rules.md` और `52.ai-work-rules.md`: universal generic rules. Pass 3 `00.standard-reference.md` जैसी project-specific `00.core` rules generate करता है, Pass 4 इन दो reserved-slot files को add करता है अगर पहले से नहीं हैं तो।
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md`: extra rules लिखने पर meta-guide. Numeric prefix `Math.max(existing-numbers) + 1` के तौर पर automatically तय होता है, इसलिए आमतौर पर `04` या `05` होता है, यह इस पर निर्भर है कि Pass 3 ने वहाँ पहले क्या लिखा है।

**Output:** Memory files + `pass4-memory.json` marker.

ज़रूरी बात: **Pass 4 `CLAUDE.md` को touch नहीं करता।** Pass 3 पहले ही Section 8 लिख चुका है (जो memory files को reference करती है). यहाँ CLAUDE.md फिर से modify करने पर Section 8 का content दोबारा declare होगा और validator errors trigger होंगे। Prompt से enforce होता है, और `tests/pass4-claude-md-untouched.test.js` से verify होता है।

हर memory file क्या करती है और lifecycle details के लिए [memory-layer.md](memory-layer.md) देखिए।

---

## Step C: Verification (deterministic, post-Claude)

Claude खत्म होने के बाद Node.js code output को 5 validators से verify करता है। **इनमें कोई भी LLM call नहीं करता**, सारे checks deterministic हैं।

| Validator | क्या check करता है |
|---|---|
| `claude-md-validator` | `CLAUDE.md` पर structural checks (top-level section count, per-section H3/H4 counts, memory-file table-row uniqueness/scope, T1 canonical heading tokens). Language-invariant: सभी 10 output languages पर वही checks pass होते हैं। |
| `content-validator` | 10 content-level checks: ज़रूरी files मौजूद हैं, standards/skills में cite किए paths real हैं, MANIFEST consistent है। |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 JSON outputs well-formed हैं और expected keys हैं। |
| `plan-validator` | (Legacy) Saved plan files को disk से compare करता है। Master plan generation v2.1.0 में हटा दिया गया था, इसलिए अब mostly no-op है, backward compat के लिए रखा है। |
| `sync-checker` | Tracked dirs में disk files `sync-map.json` registrations से match होती हैं (orphaned vs. unregistered). |

इनके **3 severity tiers** हैं:

- **fail**: completion block करता है, CI में non-zero exit. कुछ structurally broken है।
- **warn**: output में दिखता है, लेकिन block नहीं करता। Check करने लायक।
- **advisory**: बाद में review कीजिए। Unusual project layouts में अक्सर false positives (जैसे gitignored files "missing" flag हो जाती हैं).

Per-validator complete check list के लिए [verification.md](verification.md) देखिए।

Validators दो तरीक़ों से orchestrate होते हैं:

1. **`claudeos-core lint`**: सिर्फ़ `claude-md-validator` चलाता है। तेज़, structural-only. CLAUDE.md manually edit करने के बाद use कीजिए।
2. **`claudeos-core health`**: बाक़ी 4 validators चलाता है (claude-md-validator जानबूझकर अलग रखा है, क्योंकि CLAUDE.md में structural drift re-init signal है, soft warning नहीं). CI के लिए recommended.

---

## यह architecture क्यों matter करती है

### Fact-injected prompts hallucination रोकते हैं

Pass 3 चलने पर prompt कुछ ऐसा दिखता है (simplified):

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

Claude के पास paths invent करने का कोई scope ही नहीं रहता। Constraint **positive** (whitelist) है, negative नहीं ("ये चीज़ें मत बनाओ"). फ़र्क़ इसलिए important है क्योंकि LLMs concrete positive constraints abstract negative constraints के मुक़ाबले बेहतर follow करते हैं।

फिर भी Claude कोई गढ़ा हुआ path cite कर दे, तो आख़िर में `content-validator [10/10]` check उसे `STALE_PATH` flag कर देता है। User docs ship होने से पहले warning देख लेता है।

### Markers के ज़रिए resume-safe

हर pass successfully complete होने पर एक marker file (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) लिखता है। `init` interrupt हो जाए (network blip, timeout, Ctrl-C), तो अगला run markers पढ़ता है और जहाँ छूटा था वहीं से pick up करता है। काम नहीं जाता।

Pass 3 का marker यह भी track करता है कि **कौन से sub-stages** complete हुए, इसलिए partial Pass 3 (मसलन 3b done, 3c stage के बीच crash) अगले stage से resume होता है, 3a से नहीं।

### Idempotent re-runs

जिस project में पहले से rules हैं उस पर `init` चलाने से **manual edits silently overwrite नहीं होते।**

Mechanism: Claude Code का permission system `--dangerously-skip-permissions` के साथ भी `.claude/` पर subprocess writes block कर देता है। इसलिए Pass 3/4 को rule files इसकी जगह `claudeos-core/generated/.staged-rules/` में लिखने का instruction मिलता है। हर pass के बाद Node.js orchestrator (जो Claude Code की permission policy के अधीन नहीं है) staged files को `.claude/rules/` में move कर देता है।

Practice में मतलब यह: **नए project पर re-run सब कुछ fresh बनाता है। जिस project में आपने rules manually edit किए हैं, उस पर `--force` से re-run scratch से regenerate करता है (आपके edits उड़ जाते हैं, `--force` का यही मतलब है). `--force` के बिना resume mechanism kick in करता है और सिर्फ़ incomplete passes चलते हैं।**

पूरी preservation story के लिए [safety.md](safety.md) देखिए।

### Language-invariant verification

Validators translated heading text match नहीं करते। वो **structural shape** (heading levels, counts, ordering) match करते हैं। मतलब वही `claude-md-validator` supported 10 languages में से किसी भी CLAUDE.md पर byte-for-byte same verdicts देता है। कोई per-language dictionaries नहीं। नई language add करने पर कोई maintenance burden नहीं।

---

## Performance: क्या expect करें

Concrete time काफ़ी कुछ इन पर depend करता है:
- Project का size (source files की संख्या, domains की संख्या)
- Anthropic API के साथ network latency
- आपके Claude Code config में कौन सा Claude model select है

मोटा-मोटा अंदाज़ा:

| Stage | Small project (<200 files) | Medium project (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 sec | 10–30 sec |
| Step B (4 Claude passes) | कुछ मिनट | 10–30 min |
| Step C (validators) | < 5 sec | 10–20 sec |

बड़े projects पर wall clock पर Pass 1 dominate करता है, क्योंकि वो हर domain group पर एक बार चलता है। 24-domain project = 6 Pass-1 invocations (24 / 4 domains per group).

Exact number चाहिए तो अपने project पर एक बार चला लीजिए, यही एक honest जवाब है।

---

## हर stage का code कहाँ रहता है

| Stage | File |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| Per-stack scanners | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt assembly | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass templates | Per stack `pass-prompts/templates/<stack>/pass{1,2,3}.md`; stacks में shared `pass-prompts/templates/common/pass4.md` |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## आगे पढ़ने के लिए

- [stacks.md](stacks.md): हर scanner per-stack क्या निकालता है
- [memory-layer.md](memory-layer.md): Pass 4 detail में
- [verification.md](verification.md): सारे 5 validators
- [diagrams.md](diagrams.md): वही architecture Mermaid diagrams में
- [comparison.md](comparison.md): यह बाक़ी Claude Code tools से कैसे अलग है
