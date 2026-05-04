# Memory Layer (L4)

v2.0 से ClaudeOS-Core regular documentation के साथ-साथ persistent memory layer भी लिखता है. यह long-running projects के लिए है, जहाँ Claude Code से ये काम करवाने हों:

> अंग्रेज़ी मूल: [docs/memory-layer.md](../memory-layer.md). हिन्दी version English के साथ sync रहता है.

1. Architectural decisions और उनका rationale याद रखे.
2. बार-बार होने वाली failures से सीखे.
3. Repeated failure patterns को automatically permanent rules में promote करे.

ClaudeOS-Core सिर्फ़ one-shot generation के लिए use कर रहे हैं, तो इस layer को पूरा ignore कर सकते हैं. Memory files लिखी तो जाती हैं, लेकिन update न करें तो grow नहीं होतीं.

---

## क्या लिखा जाता है

Pass 4 पूरा होने के बाद memory layer में होता है:

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

`60.memory/` rule files में `paths:` globs होते हैं जो उन project files से match करते हैं जहाँ memory load करनी है. Claude Code जब किसी glob-matching file को edit कर रहा हो, तो related memory file context में load हो जाती है.

यह **on-demand loading** है. Memory हमेशा context में नहीं रहती, सिर्फ़ जब relevant हो. इससे Claude का working context छोटा रहता है.

---

## चार memory files

### `decision-log.md`: append-only architectural decisions

कोई non-obvious technical decision लेते हैं, तो आप (या आपके prompt पर Claude) एक block append करते हैं:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

यह file **time के साथ grow होती है.** Auto-delete नहीं होती. पुराने decisions valuable context बने रहते हैं.

Auto-loaded rule (`60.memory/01.decision-log.md`) Claude Code को बताता है कि "X को इस तरह structure क्यों किया?" जैसे questions का जवाब देने से पहले इस file को consult करे.

### `failure-patterns.md`: बार-बार होने वाली mistakes

Claude Code कोई repeated mistake करे (जैसे "project में MyBatis है फिर भी Claude JPA generate करता रहता है"), तो यहाँ entry आती है:

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

`frequency` / `importance` / `last seen` fields automatic decisions drive करते हैं:

- **Compaction**: `lastSeen > 60 days` AND `importance < 3` वाली entries drop हो जाती हैं.
- **Rule promotion**: `frequency >= 3` वाली entries `memory propose-rules` के ज़रिए नई `.claude/rules/` entries के candidates के तौर पर surface होती हैं. (Importance filter नहीं है. वह सिर्फ़ हर proposal के confidence score को affect करता है.)

Metadata fields को `memory` subcommands anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) से parse करते हैं, इसलिए field lines मोटे तौर पर ऊपर के example जैसी दिखनी चाहिए. Indented या italicized variations चलती हैं.

### `compaction.md`: compaction log

यह file compaction history track करती है:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

हर `memory compact` run पर सिर्फ़ `## Last Compaction` section overwrite होता है. File में जो भी और add करेंगे, वह preserve रहता है.

### `auto-rule-update.md`: proposed-rule queue

`memory propose-rules` चलाने पर Claude `failure-patterns.md` पढ़ता है और proposed rule content यहाँ append करता है:

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

Proposals review करें, जो चाहिए वो actual rule files में copy करें. **propose-rules command auto-apply नहीं करती.** यह deliberate है, क्योंकि LLM-drafted rules को human review चाहिए.

---

## Compaction algorithm

Memory grow होती है, पर फूलती नहीं. Four-stage compaction तब चलता है जब call करते हैं:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body 1-line "fix" + meta तक संक्षिप्त |
| 2 | Duplicate headings | Merged (frequencies summed, body = सबसे recent) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Dropped |
| 4 | File > 400 lines | Oldest non-preserved entries trim |

**"Preserved" entries** सभी stages में बच जाती हैं. Entry preserved है अगर इनमें से कोई एक हो:

- `importance >= 7`
- `lastSeen < 30 days`
- Body में concrete (non-glob) active rule path हो (जैसे `.claude/rules/10.backend/orm-rules.md`)

"active rule path" check interesting है. किसी memory entry में real, currently existing rule file का reference है, तो entry उस rule के lifecycle से anchored है. जब तक rule है, memory भी रहती है.

Compaction algorithm जानबूझकर human forgetting curve की नक़ल है. Frequent, recent, important चीज़ें रहती हैं. Rare, old, unimportant चीज़ें fade हो जाती हैं.

Compaction code के लिए `bin/commands/memory.js` (`compactFile()` function) देखें.

---

## Importance scoring

चलाएँ:

```bash
npx claudeos-core memory score
```

`failure-patterns.md` की entries के लिए importance फिर से compute करता है:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

जहाँ `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90 days पर linear decay).

Effect:
- `frequency = 3` और `lastSeen = today` वाली entry → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3` और `lastSeen = 90+ days ago` वाली entry → `round(3 × 1.5 + 0 × 5) = 5`

**score command insertion से पहले सभी existing importance lines को strip करती है.** इससे score को बार-बार चलाने पर duplicate-line regressions नहीं होतीं.

---

## Rule promotion: `propose-rules`

चलाएँ:

```bash
npx claudeos-core memory propose-rules
```

यह:

1. `failure-patterns.md` पढ़ता है.
2. `frequency >= 3` वाली entries filter करता है.
3. हर candidate के लिए proposed rule content draft करने को Claude से कहता है.
4. Confidence compute करता है:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   जहाँ `anchored` का मतलब है entry disk पर real file path को reference कर रही है.
5. Proposals को human review के लिए `auto-rule-update.md` में लिखता है.

**Importance missing होने पर evidence value 6 पर capped होती है.** Importance score के बिना frequency अकेले sigmoid को high confidence की तरफ़ नहीं धकेलनी चाहिए. (यह sigmoid का input cap करता है, proposals की count नहीं.)

---

## Typical workflow

Long-running project में rhythm कुछ ऐसा दिखता है:

1. **`init` एक बार चलाएँ** ताकि बाक़ी सब के साथ memory files set हो जाएँ.

2. **कुछ हफ़्तों तक Claude Code normal use करें.** Repeated mistakes notice करें (जैसे Claude ग़लत response wrapper use करता रहता है). `failure-patterns.md` में entries append करें. Manually, या Claude से बोलकर (`60.memory/02.failure-patterns.md` का rule Claude को बताता है कि कब append करना है).

3. **समय-समय पर `memory score` चलाएँ** ताकि importance values refresh हों. यह fast और idempotent है.

4. **जब ~5+ high-score patterns हो जाएँ**, drafted rules पाने के लिए `memory propose-rules` चलाएँ.

5. **`auto-rule-update.md` में proposals review करें.** जो-जो चाहिए, उसका content `.claude/rules/` के नीचे permanent rule file में copy करें.

6. **`memory compact` समय-समय पर चलाएँ** (महीने में एक बार, या scheduled CI में) ताकि `failure-patterns.md` bounded रहे.

चारों files इसी rhythm को ध्यान में रखकर बनी हैं. कोई भी step skip करना ठीक है. Memory layer opt-in है, और unused files रास्ते में नहीं आतीं.

---

## Session continuity

CLAUDE.md हर session पर Claude Code automatically load करता है. Memory files **default में auto-load नहीं होतीं.** वे `60.memory/` rules से on demand load होती हैं जब उनका `paths:` glob उस file से match करता है जिसे Claude अभी edit कर रहा है.

मतलब: नए Claude Code session में memory तब तक नहीं दिखती जब तक कोई relevant file पर काम शुरू न हो.

Claude Code का auto-compaction चलने के बाद (~85% context पर), Claude memory files की awareness खो देता है, चाहे वे पहले load हो चुकी हों. CLAUDE.md Section 8 में **Session Resume Protocol** prose block है जो Claude को याद दिलाता है:

- Relevant entries के लिए `failure-patterns.md` फिर से scan करे.
- `decision-log.md` की latest entries फिर से पढ़े.
- Currently open files से `60.memory/` rules फिर से match करे.

यह **prose है, enforced नहीं.** लेकिन prose ऐसे structure की गई है कि Claude इसे follow करता है. Session Resume Protocol v2.3.2+ के canonical scaffold का हिस्सा है और सभी 10 output languages में preserve रहता है.

---

## Memory layer कब skip करें

Memory layer value देती है इनके लिए:

- **Long-lived projects** (महीनों या इससे ज़्यादा).
- **Teams**: `decision-log.md` shared institutional memory और onboarding tool बन जाती है.
- **जिन projects में Claude Code ≥10×/day invoke होता है**: failure patterns useful होने जितना जल्दी जमा हो जाते हैं.

Overkill है इनके लिए:

- One-off scripts जो एक हफ़्ते में फेंक दिए जाएँगे.
- Spike या prototype projects.
- Tutorials या demos.

Memory files अब भी Pass 4 लिखता है, पर update न करें तो grow नहीं होतीं. Use नहीं कर रहे तो कोई maintenance burden नहीं है.

Memory rules से कुछ भी auto-load नहीं चाहिए (context cost की वजह से), तो ये कर सकते हैं:

- `60.memory/` rules delete कर दें. Pass 4 resume पर इन्हें recreate नहीं करेगा, सिर्फ़ `--force` पर.
- या हर rule में `paths:` globs को narrow कर दें ताकि कुछ भी match न करें.

---

## यह भी देखें

- [architecture.md](architecture.md): pipeline context में Pass 4
- [commands.md](commands.md): `memory compact` / `memory score` / `memory propose-rules` reference
- [verification.md](verification.md): content-validator के `[9/9]` memory checks
