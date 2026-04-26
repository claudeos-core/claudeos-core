# CLI Commands

हर command, हर flag, हर exit code जो ClaudeOS-Core वास्तव में समर्थन करता है।

> अंग्रेज़ी मूल: [docs/commands.md](../commands.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

यह पृष्ठ एक reference है। यदि आप नए हैं, तो पहले [मुख्य README का Quick Start](../../README.hi.md#quick-start) पढ़ें।

सभी commands `npx claudeos-core <command>` के माध्यम से चलाए जाते हैं (या यदि globally install किया गया है तो `claudeos-core <command>` — [manual-installation.md](manual-installation.md) देखें)।

---

## Global flags

ये हर command पर काम करते हैं:

| Flag | प्रभाव |
|---|---|
| `--help` / `-h` | Help दिखाएँ। जब command के बाद रखा जाता है (उदा., `memory --help`), subcommand अपना help संभालता है। |
| `--version` / `-v` | Installed version प्रिंट करें। |
| `--lang <code>` | आउटपुट भाषा। में से एक: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. वर्तमान में केवल `init` द्वारा उपभोग किया जाता है। |
| `--force` / `-f` | Resume prompt छोड़ें; पिछले परिणाम delete करें। वर्तमान में केवल `init` द्वारा उपभोग किया जाता है। |

यह CLI flags की पूरी सूची है। **कोई `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` आदि नहीं।** यदि आपने उन्हें पुराने docs में देखा है, वे वास्तविक नहीं हैं — `bin/cli.js` केवल ऊपर के चार flags को parse करता है।

---

## त्वरित reference

| Command | इसका उपयोग करें जब |
|---|---|
| `init` | प्रोजेक्ट पर पहली बार। सब कुछ उत्पन्न करता है। |
| `lint` | `CLAUDE.md` को मैन्युअल रूप से संपादित करने के बाद। संरचनात्मक validation चलाता है। |
| `health` | Commit करने से पहले, या CI में। चार content/path validators चलाता है। |
| `restore` | Saved plan → disk. (v2.1.0 के बाद अधिकतर no-op; back-compat के लिए रखा गया।) |
| `refresh` | Disk → saved plan. (v2.1.0 के बाद अधिकतर no-op; back-compat के लिए रखा गया।) |
| `validate` | plan-validator का `--check` mode चलाएँ। (v2.1.0 के बाद अधिकतर no-op।) |
| `memory <sub>` | Memory layer maintenance: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` को इसलिए रखा गया है क्योंकि वे उन projects पर हानिरहित हैं जो legacy plan files का उपयोग नहीं करते। यदि `plan/` मौजूद नहीं है (v2.1.0+ default), वे सभी informational संदेशों के साथ skip करते हैं।

---

## `init` — Documentation set उत्पन्न करें

```bash
npx claudeos-core init [--lang <code>] [--force]
```

मुख्य command। [4-pass pipeline](architecture.md) को end-to-end चलाता है:

1. Scanner `project-analysis.json` उत्पन्न करता है।
2. Pass 1 प्रत्येक domain group का विश्लेषण करता है।
3. Pass 2 domains को project-व्यापी चित्र में merge करता है।
4. Pass 3 CLAUDE.md, rules, standards, skills, guides उत्पन्न करता है।
5. Pass 4 memory layer scaffold करता है।

**उदाहरण:**

```bash
# पहली बार, English आउटपुट
npx claudeos-core init

# पहली बार, Korean आउटपुट
npx claudeos-core init --lang ko

# सब कुछ scratch से फिर से करें
npx claudeos-core init --force
```

### Resume safety

`init` **resume-safe** है। यदि बाधित होता है (network blip, timeout, Ctrl-C), तो अगली run अंतिम पूर्ण किए गए pass marker से उठाती है। Markers `claudeos-core/generated/` में रहते हैं:

- `pass1-<group>.json` — प्रति-domain Pass 1 आउटपुट
- `pass2-merged.json` — Pass 2 आउटपुट
- `pass3-complete.json` — Pass 3 marker (split mode के कौन से sub-stages पूर्ण हुए, इसे भी track करता है)
- `pass4-memory.json` — Pass 4 marker

यदि कोई marker malformed है (उदा., mid-write crashed होने पर `{"error":"timeout"}` छोड़ गया), validator इसे reject करता है और pass फिर से चलता है।

आंशिक Pass 3 के लिए (stages के बीच बाधित split mode), resume तंत्र marker body का निरीक्षण करता है — यदि `mode === "split"` है और `completedAt` missing है, तो Pass 3 को फिर से आह्वान किया जाता है और अगले unstarted stage से फिर से शुरू होता है।

### `--force` क्या करता है

`--force` delete करता है:
- `claudeos-core/generated/` के तहत हर `.json` और `.md` फ़ाइल (सभी चार pass markers सहित)
- बचा हुआ `claudeos-core/generated/.staged-rules/` directory यदि कोई पिछली run mid-move crash हुई थी
- `.claude/rules/` के तहत सब कुछ (ताकि Pass 3 की "zero-rules detection" stale rules पर false-negative न हो)

`--force` delete **नहीं** करता:
- `claudeos-core/memory/` फ़ाइलें (आपका decision log और failure patterns संरक्षित हैं)
- `claudeos-core/` और `.claude/` के बाहर की फ़ाइलें

**Rules में मैन्युअल edits `--force` के तहत खो जाते हैं।** यह trade-off है — `--force` "मुझे साफ़ slate चाहिए" के लिए मौजूद है। यदि आप edits सुरक्षित रखना चाहते हैं, बिना `--force` के फिर से चलाएँ।

### Interactive vs non-interactive

`--lang` के बिना, `init` एक interactive language selector दिखाता है (10 options, arrow keys या number entry)। Non-TTY environments (CI, piped input) में, selector readline पर fallback करता है, फिर कोई input न होने पर non-interactive default पर।

`--force` के बिना, यदि मौजूदा pass markers detect होते हैं, `init` एक Continue / Fresh prompt दिखाता है। `--force` पास करना इस prompt को पूरी तरह से छोड़ देता है।

---

## `lint` — `CLAUDE.md` संरचना सत्यापित करें

```bash
npx claudeos-core lint
```

आपके project के `CLAUDE.md` के विरुद्ध `claude-md-validator` चलाता है। तेज़ — कोई LLM calls नहीं, बस संरचनात्मक checks।

**Exit codes:**
- `0` — पास।
- `1` — Fail। कम से कम एक संरचनात्मक issue।

**यह क्या जाँचता है** (पूर्ण check ID सूची के लिए [verification.md](verification.md) देखें):

- Section count ठीक 8 होनी चाहिए।
- Section 4 में 3 या 4 H3 sub-sections होनी चाहिए।
- Section 6 में ठीक 3 H3 sub-sections होनी चाहिए।
- Section 8 में ठीक 2 H3 sub-sections (Common Rules + L4 Memory) और ठीक 2 H4 sub-sub-sections (L4 Memory Files + Memory Workflow) होनी चाहिए।
- प्रत्येक canonical section heading में अपना English token (उदा., `Role Definition`, `Memory`) होना चाहिए ताकि `--lang` की परवाह किए बिना multi-repo grep काम करे।
- 4 memory files में से प्रत्येक ठीक एक markdown table row में दिखाई देता है, Section 8 तक सीमित।

Validator **language-invariant** है: वही checks `--lang ko`, `--lang ja`, या किसी अन्य समर्थित भाषा के साथ उत्पन्न CLAUDE.md पर काम करते हैं।

Pre-commit hooks और CI के लिए उपयुक्त।

---

## `health` — Verification suite चलाएँ

```bash
npx claudeos-core health
```

**4 validators** orchestrate करता है (claude-md-validator `lint` के माध्यम से अलग चलता है):

| क्रम | Validator | Tier | Fail पर क्या होता है |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | यदि यह fail हो, `sync-checker` skip हो जाता है। |
| 2 | `plan-validator` | fail | Exit 1। |
| 3 | `sync-checker` | fail | Exit 1 (यदि manifest सफल हुआ हो)। |
| 4 | `content-validator` | advisory | दिखाई देता है लेकिन block नहीं करता। |
| 5 | `pass-json-validator` | warn | दिखाई देता है लेकिन block नहीं करता। |

**Exit codes:**
- `0` — कोई `fail`-tier findings नहीं। Warnings और advisories मौजूद हो सकते हैं।
- `1` — कम से कम एक `fail`-tier finding।

3-tier severity (fail / warn / advisory) इसलिए जोड़ी गई थी ताकि `content-validator` findings (जिनमें असामान्य layouts में अक्सर false positives होते हैं) CI pipelines को deadlock न करें।

प्रत्येक validator के checks के विवरण के लिए, [verification.md](verification.md) देखें।

---

## `restore` — Disk पर saved plan apply करें (legacy)

```bash
npx claudeos-core restore
```

`plan-validator` को `--execute` mode में चलाता है: `claudeos-core/plan/*.md` फ़ाइलों से content को उन locations में copy करता है जिनका वे वर्णन करते हैं।

**v2.1.0 स्थिति:** Master plan generation हटा दिया गया था। `claudeos-core/plan/` अब `init` द्वारा auto-create नहीं होता। यदि `plan/` मौजूद नहीं है, यह command एक informational संदेश log करता है और साफ़ तरीक़े से exit होता है।

Command उन users के लिए रखा गया है जो ad-hoc backup/restore उद्देश्यों के लिए plan files को hand-maintain करते हैं। v2.1.0+ project पर चलाना हानिरहित है।

जिस फ़ाइल को overwrite करता है उसका `.bak` backup बनाता है।

---

## `refresh` — Disk को saved plan में sync करें (legacy)

```bash
npx claudeos-core refresh
```

`restore` का व्युत्क्रम। `plan-validator` को `--refresh` mode में चलाता है: disk files की वर्तमान state पढ़ता है और `claudeos-core/plan/*.md` को match करने के लिए update करता है।

**v2.1.0 स्थिति:** `restore` के समान — `plan/` अनुपस्थित होने पर no-op।

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

`plan-validator` को `--check` mode में चलाता है: `claudeos-core/plan/*.md` और disk के बीच अंतर रिपोर्ट करता है, लेकिन कुछ भी संशोधित नहीं करता।

**v2.1.0 स्थिति:** `plan/` अनुपस्थित होने पर no-op। अधिकांश users को इसके बजाय `health` चलाना चाहिए, जो `plan-validator` को अन्य validators के साथ call करता है।

---

## `memory <subcommand>` — Memory layer maintenance

```bash
npx claudeos-core memory <subcommand>
```

तीन subcommands। Subcommands `init` के Pass 4 द्वारा लिखी गई `claudeos-core/memory/` फ़ाइलों पर operate करते हैं। यदि वे फ़ाइलें missing हैं, हर subcommand `not found` log करता है और साफ़ तरीक़े से skip करता है (best-effort tools)।

memory model के विवरण के लिए, [memory-layer.md](memory-layer.md) देखें।

### `memory compact`

```bash
npx claudeos-core memory compact
```

`decision-log.md` और `failure-patterns.md` पर 4-stage compaction लागू करता है:

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body 1-line "fix" + meta में संक्षिप्त |
| 2 | Duplicate headings | Merged (frequencies summed, body = सबसे हाल का) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Dropped |
| 4 | फ़ाइल > 400 lines | Trim oldest non-preserved entries |

`importance >= 7`, `lastSeen < 30 days`, या एक body जिसमें ठोस (non-glob) active rule path हो — auto-preserve होती हैं।

Compaction के बाद, केवल `compaction.md` का `## Last Compaction` section replace होता है — बाक़ी सब कुछ (आपके manual notes) संरक्षित।

### `memory score`

```bash
npx claudeos-core memory score
```

`failure-patterns.md` में entries के लिए importance scores फिर से compute करता है:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Insertion से पहले किसी भी मौजूदा importance lines को strip करता है (duplicate-line regressions रोकता है)। नया score entry के body में वापस लिखा जाता है।

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

`failure-patterns.md` पढ़ता है, frequency ≥ 3 के साथ entries चुनता है, और Claude से top candidates के लिए proposed `.claude/rules/` content का draft तैयार करने को कहता है।

प्रति candidate confidence:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = entry एक ठोस फ़ाइल path का उल्लेख करता है जो disk पर मौजूद है।)

आउटपुट **आपकी समीक्षा के लिए `claudeos-core/memory/auto-rule-update.md` में append किया जाता है**। **यह auto-apply नहीं होता** — आप तय करते हैं कि कौन से सुझाव वास्तविक rule files में copy करने हैं।

---

## Environment variables

| Variable | प्रभाव |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | memory-scaffold translation path को short-circuit करता है; `claude -p` को आह्वान करने से पहले throw करता है। CI और translation-dependent tests द्वारा उपयोग किया जाता है ताकि उन्हें वास्तविक Claude CLI installation की आवश्यकता न हो। Strict `=== "1"` semantics — अन्य values इसे activate नहीं करते। |
| `CLAUDEOS_ROOT` | `bin/cli.js` द्वारा user के project root पर स्वचालित रूप से सेट। Internal — override न करें। |

यह पूरी सूची है। कोई `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` आदि नहीं — वे मौजूद नहीं हैं।

---

## Exit codes

| Code | अर्थ |
|---|---|
| `0` | सफलता। |
| `1` | Validation failure (`fail`-tier finding) या `InitError` (उदा., prerequisite missing, malformed marker, file lock)। |
| Other | अंतर्निहित Node प्रक्रिया या sub-tool से उठा हुआ — uncaught exceptions, write errors आदि। |

"Interrupted" के लिए कोई विशेष exit code नहीं — Ctrl-C बस process को terminate करता है। `init` को फिर से चलाएँ और resume तंत्र संभाल लेता है।

---

## `npm test` क्या चलाता है (योगदानकर्ताओं के लिए)

यदि आपने repo को clone किया है और locally test suite चलाना चाहते हैं:

```bash
npm test
```

यह 33 test files में `node tests/*.test.js` चलाता है। Test suite Node के built-in `node:test` runner (कोई Jest, कोई Mocha नहीं) और Node के `node:assert/strict` का उपयोग करता है।

एक single test file के लिए:

```bash
node tests/scan-java.test.js
```

CI suite को Linux / macOS / Windows × Node 18 / 20 पर चलाता है। CI workflow `CLAUDEOS_SKIP_TRANSLATION=1` सेट करता है ताकि translation-dependent tests को `claude` CLI की आवश्यकता न हो।

---

## यह भी देखें

- [architecture.md](architecture.md) — `init` वास्तव में internally क्या करता है
- [verification.md](verification.md) — validators क्या जाँचते हैं
- [memory-layer.md](memory-layer.md) — `memory` subcommands किस पर operate करते हैं
- [troubleshooting.md](troubleshooting.md) — जब commands fail होते हैं
