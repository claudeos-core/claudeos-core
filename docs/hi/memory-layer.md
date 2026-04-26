# Memory Layer (L4)

v2.0 के बाद, ClaudeOS-Core नियमित documentation के साथ-साथ एक persistent memory layer लिखता है। यह लंबे चलने वाले projects के लिए है जहाँ आप Claude Code से ये करवाना चाहते हैं:

> अंग्रेज़ी मूल: [docs/memory-layer.md](../memory-layer.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

1. Architectural निर्णयों और उनके rationale को याद रखें।
2. बार-बार होने वाली failures से सीखें।
3. बार-बार होने वाले failure patterns को permanent rules में स्वतः बढ़ाएँ।

यदि आप ClaudeOS-Core का उपयोग केवल one-shot generation के लिए करते हैं, तो आप इस layer को पूरी तरह से नज़रअंदाज़ कर सकते हैं। Memory फ़ाइलें लिखी जाती हैं लेकिन यदि आप उन्हें update नहीं करते तो वे नहीं बढ़तीं।

---

## क्या लिखा जाता है

Pass 4 पूर्ण होने के बाद, memory layer में शामिल हैं:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "हमने X के बजाय Y क्यों चुना")
    ├── failure-patterns.md      (बार-बार होने वाली त्रुटियाँ, frequency + importance के साथ)
    ├── compaction.md            (समय के साथ memory को कैसे compact किया जाता है)
    └── auto-rule-update.md      (पैटर्न जो नए rules बनने चाहिए)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule जो decision-log.md को auto-load करता है)
        ├── 02.failure-patterns.md   (rule जो failure-patterns.md को auto-load करता है)
        ├── 03.compaction.md         (rule जो compaction.md को auto-load करता है)
        └── 04.auto-rule-update.md   (rule जो auto-rule-update.md को auto-load करता है)
```

`60.memory/` rule फ़ाइलों में `paths:` globs हैं जो उन project files से मेल खाते हैं जहाँ memory को load किया जाना चाहिए। जब Claude Code एक glob से मेल खाने वाली फ़ाइल को संपादित कर रहा है, तो संबंधित memory फ़ाइल context में load हो जाती है।

यह **on-demand loading** है — memory हमेशा context में नहीं होती, केवल जब प्रासंगिक हो। यह Claude के working context को कम रखता है।

---

## चार memory फ़ाइलें

### `decision-log.md` — append-only architectural निर्णय

जब आप एक गैर-स्पष्ट तकनीकी निर्णय लेते हैं, तो आप (या Claude, आपके द्वारा prompt किए गए) एक block append करते हैं:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

यह फ़ाइल **समय के साथ बढ़ती है**। यह auto-delete नहीं होती। पुराने निर्णय मूल्यवान context बने रहते हैं।

Auto-loaded rule (`60.memory/01.decision-log.md`) Claude Code को बताता है कि "हमने X को इस तरह क्यों संरचित किया?" जैसे प्रश्नों का उत्तर देने से पहले इस फ़ाइल से परामर्श करे।

### `failure-patterns.md` — बार-बार होने वाली गलतियाँ

जब Claude Code एक बार-बार होने वाली गलती करता है (उदा., "Claude हमारे project के MyBatis का उपयोग करने पर भी JPA उत्पन्न करता रहता है"), यहाँ एक entry जाती है:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

`frequency` / `importance` / `last seen` fields स्वचालित निर्णयों को drive करते हैं:

- **Compaction:** `lastSeen > 60 days` AND `importance < 3` के साथ entries drop हो जाती हैं।
- **Rule promotion:** `frequency >= 3` के साथ entries `memory propose-rules` के माध्यम से नई `.claude/rules/` entries के candidates के रूप में surface होती हैं। (Importance filter नहीं है — यह केवल प्रत्येक proposal के confidence score को प्रभावित करती है।)

Metadata fields को `memory` subcommands द्वारा anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) का उपयोग करके parse किया जाता है, इसलिए field lines मोटे तौर पर ऊपर के उदाहरण की तरह दिखनी चाहिए। Indented या italicized variations सहन की जाती हैं।

### `compaction.md` — compaction log

यह फ़ाइल compaction history को track करती है:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

प्रत्येक `memory compact` run पर केवल `## Last Compaction` section overwrite होता है। फ़ाइल में आप जो कुछ भी और जोड़ते हैं वह संरक्षित रहता है।

### `auto-rule-update.md` — proposed-rule queue

जब आप `memory propose-rules` चलाते हैं, Claude `failure-patterns.md` पढ़ता है और proposed rule content यहाँ append करता है:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

आप proposals की समीक्षा करते हैं, जो आप चाहते हैं उन्हें वास्तविक rule files में copy करते हैं। **propose-rules command auto-apply नहीं करती** — यह जानबूझकर है, क्योंकि LLM-drafted rules को मानवीय समीक्षा की आवश्यकता है।

---

## Compaction algorithm

Memory बढ़ती है लेकिन फूलती नहीं है। चार-stage compaction तब चलता है जब आप call करते हैं:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body 1-line "fix" + meta में संक्षिप्त |
| 2 | Duplicate headings | Merged (frequencies summed, body = सबसे हाल का) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Dropped |
| 4 | फ़ाइल > 400 lines | Trim oldest non-preserved entries |

**"Preserved" entries** सभी stages में जीवित रहती हैं। एक entry preserved है यदि निम्न में से कोई हो:

- `importance >= 7`
- `lastSeen < 30 days`
- Body में एक ठोस (non-glob) active rule path हो (उदा., `.claude/rules/10.backend/orm-rules.md`)

"active rule path" check दिलचस्प है: यदि एक memory entry एक वास्तविक, वर्तमान में मौजूद rule फ़ाइल का संदर्भ देती है, तो entry उस rule के lifecycle से anchored है। जब तक rule मौजूद है, memory रहती है।

Compaction algorithm मानवीय भूलने की वक्रों की एक जानबूझकर नक़ल है — बार-बार, हाल के, महत्वपूर्ण चीज़ें रहती हैं; दुर्लभ, पुराने, महत्वहीन चीज़ें फीकी पड़ जाती हैं।

Compaction code के लिए, `bin/commands/memory.js` (`compactFile()` function) देखें।

---

## Importance scoring

चलाएँ:

```bash
npx claudeos-core memory score
```

`failure-patterns.md` में entries के लिए importance फिर से compute करता है:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

जहाँ `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90 days पर linear decay)।

प्रभाव:
- `frequency = 3` और `lastSeen = today` के साथ एक entry → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3` और `lastSeen = 90+ days ago` के साथ एक entry → `round(3 × 1.5 + 0 × 5) = 5`

**score command insertion से पहले सभी मौजूदा importance lines को strip करती है।** यह score को कई बार फिर से चलाने पर duplicate-line regressions को रोकता है।

---

## Rule promotion: `propose-rules`

चलाएँ:

```bash
npx claudeos-core memory propose-rules
```

यह:

1. `failure-patterns.md` पढ़ता है।
2. `frequency >= 3` के साथ entries filter करता है।
3. प्रत्येक candidate के लिए proposed rule content का draft तैयार करने के लिए Claude से कहता है।
4. Confidence compute करता है:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   जहाँ `anchored` का अर्थ है कि entry disk पर एक वास्तविक फ़ाइल path का संदर्भ देती है।
5. Proposals को `auto-rule-update.md` में मानवीय समीक्षा के लिए लिखता है।

**Importance missing होने पर evidence value 6 पर capped होती है** — एक importance score के बिना, frequency अकेले sigmoid को high confidence की ओर धकेलने के लिए पर्याप्त नहीं होनी चाहिए। (यह sigmoid के input को cap करता है, proposals की संख्या को नहीं।)

---

## विशिष्ट workflow

लंबे चलने वाले project के लिए, ताल इस तरह दिखती है:

1. **`init` एक बार चलाएँ** बाक़ी सब कुछ के साथ memory फ़ाइलें सेट करने के लिए।

2. **कुछ हफ़्तों के लिए सामान्य रूप से Claude Code का उपयोग करें।** बार-बार होने वाली गलतियों को नोटिस करें (उदा., Claude गलत response wrapper का उपयोग करता रहता है)। `failure-patterns.md` में entries append करें — या तो मैन्युअल रूप से या Claude से इसे करने के लिए कहकर (`60.memory/02.failure-patterns.md` में rule Claude को बताता है कब append करना है)।

3. **समय-समय पर `memory score` चलाएँ** importance values को refresh करने के लिए। यह तेज़ और idempotent है।

4. **जब आपके पास ~5+ high-score patterns हों**, drafted rules पाने के लिए `memory propose-rules` चलाएँ।

5. **Proposals की समीक्षा करें** `auto-rule-update.md` में। प्रत्येक एक के लिए जो आप चाहते हैं, content को `.claude/rules/` के तहत एक permanent rule file में copy करें।

6. **`memory compact` को समय-समय पर चलाएँ** (महीने में एक बार, या scheduled CI में) `failure-patterns.md` को सीमित रखने के लिए।

यह ताल वह है जिसके लिए चार फ़ाइलें designed की गई हैं। किसी भी step को छोड़ना ठीक है — memory layer opt-in है, और unused फ़ाइलें रास्ते में नहीं आतीं।

---

## Session continuity

CLAUDE.md प्रत्येक session पर Claude Code द्वारा auto-load होती है। Memory फ़ाइलें **default रूप से auto-load नहीं होतीं** — वे `60.memory/` rules द्वारा on demand load होती हैं जब उनका `paths:` glob उस फ़ाइल से मेल खाता है जिसे Claude वर्तमान में संपादित कर रहा है।

इसका अर्थ है: एक नए Claude Code session में, memory दिखाई नहीं देती जब तक आप एक प्रासंगिक फ़ाइल पर काम शुरू नहीं करते।

Claude Code के auto-compaction के चलने के बाद (~85% context पर), Claude memory फ़ाइलों के बारे में जागरूकता खो देता है, भले ही वे पहले load हो चुकी हों। CLAUDE.md Section 8 में एक **Session Resume Protocol** prose block शामिल है जो Claude को याद दिलाता है कि:

- प्रासंगिक entries के लिए `failure-patterns.md` को फिर से scan करे।
- `decision-log.md` की सबसे हाल की entries फिर से पढ़े।
- वर्तमान में open फ़ाइलों के विरुद्ध `60.memory/` rules को फिर से match करे।

यह **prose है, enforced नहीं** — लेकिन prose इस तरह से संरचित है कि Claude इसका पालन करता है। Session Resume Protocol v2.3.2+ canonical scaffold का हिस्सा है और सभी 10 आउटपुट भाषाओं में संरक्षित है।

---

## Memory layer कब छोड़ें

Memory layer इनके लिए मूल्य जोड़ती है:

- **लंबे जीवन वाले projects** (महीनों या अधिक)।
- **Teams** — `decision-log.md` एक shared institutional memory और onboarding tool बन जाती है।
- **जिन projects में Claude Code को ≥10×/दिन आह्वान किया जाता है** — failure patterns उपयोगी होने के लिए तेज़ी से जमा होते हैं।

यह इनके लिए overkill है:

- एक-बार के scripts जिन्हें आप एक हफ़्ते में फेंक देंगे।
- Spike या prototype projects।
- Tutorials या demos।

Memory फ़ाइलें अभी भी Pass 4 द्वारा लिखी जाती हैं, लेकिन यदि आप उन्हें update नहीं करते, तो वे नहीं बढ़तीं। यदि आप इसका उपयोग नहीं कर रहे हैं तो कोई maintenance बोझ नहीं है।

यदि आप सक्रिय रूप से नहीं चाहते कि memory rules कुछ भी auto-load करें (context cost कारणों के लिए), आप कर सकते हैं:

- `60.memory/` rules delete करें — Pass 4 resume पर इन्हें recreate नहीं करेगा, केवल `--force` पर।
- या प्रत्येक rule में `paths:` globs को narrow करें ताकि वे कुछ भी match न करें।

---

## यह भी देखें

- [architecture.md](architecture.md) — pipeline context में Pass 4
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` reference
- [verification.md](verification.md) — content-validator के `[9/9]` memory checks
