# CLI Commands

हर command, हर flag, हर exit code जो ClaudeOS-Core actually support करता है.

> अंग्रेज़ी मूल: [docs/commands.md](../commands.md). हिन्दी अनुवाद अंग्रेज़ी के साथ sync में रखा गया है.

यह page एक reference है. नए हो तो पहले [मुख्य README का Quick Start](../../README.hi.md#त्वरित-शुरुआत) पढ़ लें.

सारे commands `npx claudeos-core <command>` से चलते हैं (globally install किया हो तो `claudeos-core <command>`. [manual-installation.md](manual-installation.md) देखें).

---

## Global flags

ये हर command पर काम करते हैं:

| Flag | प्रभाव |
|---|---|
| `--help` / `-h` | Help दिखाएँ. command के बाद रखो (जैसे `memory --help`), तो subcommand अपना help संभालता है. |
| `--version` / `-v` | Installed version print करें. |
| `--lang <code>` | Output language. Options: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. फिलहाल सिर्फ `init` इसे use करता है. |
| `--force` / `-f` | Resume prompt skip करो, पिछले results delete करो. फिलहाल सिर्फ `init` इसे use करता है. |

यह पूरी CLI flags list है. **कोई `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` वगैरह नहीं.** पुराने docs में देखे हों तो वो real नहीं हैं. `bin/cli.js` सिर्फ ऊपर वाले चार flags parse करता है.

---

## त्वरित reference

| Command | कब use करें |
|---|---|
| `init` | Project पर पहली बार. सब कुछ generate करता है. |
| `lint` | `CLAUDE.md` को manually edit करने के बाद. Structural validation चलाता है. |
| `health` | Commit से पहले, या CI में. चार content/path validators चलाता है. |
| `restore` | Saved plan → disk. (v2.1.0 के बाद ज़्यादातर no-op, back-compat के लिए रखा है.) |
| `refresh` | Disk → saved plan. (v2.1.0 के बाद ज़्यादातर no-op, back-compat के लिए रखा है.) |
| `validate` | plan-validator का `--check` mode चलाओ. (v2.1.0 के बाद ज़्यादातर no-op.) |
| `memory <sub>` | Memory layer maintenance: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` इसलिए रखे हैं क्योंकि legacy plan files use न करने वाले projects पर ये harmless हैं. `plan/` न हो (v2.1.0+ default), तो ये सब informational message के साथ skip हो जाते हैं.

---

## `init` — Documentation set generate करें

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Main command. [4-pass pipeline](architecture.md) end-to-end चलाता है:

1. Scanner `project-analysis.json` generate करता है.
2. Pass 1 हर domain group analyze करता है.
3. Pass 2 domains को project-wide picture में merge करता है.
4. Pass 3 CLAUDE.md, rules, standards, skills, guides generate करता है.
5. Pass 4 memory layer scaffold करता है.

**Examples:**

```bash
# पहली बार, English output
npx claudeos-core init

# पहली बार, Korean output
npx claudeos-core init --lang ko

# सब कुछ scratch से फिर से
npx claudeos-core init --force
```

### Resume safety

`init` **resume-safe** है. कुछ बीच में रुक जाए (network blip, timeout, Ctrl-C), तो अगली run last completed pass marker से उठा लेती है. Markers `claudeos-core/generated/` में रहते हैं:

- `pass1-<group>.json` — per-domain Pass 1 output
- `pass2-merged.json` — Pass 2 output
- `pass3-complete.json` — Pass 3 marker (split mode के कौन-से sub-stages complete हुए, ये भी track करता है)
- `pass4-memory.json` — Pass 4 marker

कोई marker malformed हो (जैसे mid-write crash के बाद `{"error":"timeout"}` छूटा हुआ), तो validator उसे reject करता है और pass दोबारा चलता है.

Partial Pass 3 के लिए (stages के बीच रुका split mode), resume mechanism marker body inspect करता है. `mode === "split"` है और `completedAt` missing है, तो Pass 3 दोबारा invoke होता है और अगले unstarted stage से resume करता है.

### `--force` क्या करता है

`--force` delete करता है:
- `claudeos-core/generated/` के अंदर हर `.json` और `.md` file (चारों pass markers समेत)
- बचा हुआ `claudeos-core/generated/.staged-rules/` directory, अगर पिछली run mid-move crash हुई थी
- `.claude/rules/` के अंदर सब कुछ (ताकि Pass 3 का "zero-rules detection" stale rules पर false-negative न दे)

`--force` delete **नहीं** करता:
- `claudeos-core/memory/` files (decision log और failure patterns safe रहते हैं)
- `claudeos-core/` और `.claude/` के बाहर की files

**Rules में manual edits `--force` से चले जाते हैं.** यह trade-off है. `--force` "clean slate चाहिए" के लिए है. Edits बचाने हैं, तो बिना `--force` के दोबारा चलाओ.

### Interactive vs non-interactive

`--lang` न दो, तो `init` interactive language selector दिखाता है (10 options, arrow keys या number entry). Non-TTY environments (CI, piped input) में selector readline पर fallback करता है, और input न मिले तो non-interactive default पर.

`--force` न दो और existing pass markers मिल जाएँ, तो `init` Continue / Fresh prompt दिखाता है. `--force` pass करने से यह prompt पूरी तरह skip हो जाता है.

---

## `lint` — `CLAUDE.md` structure validate करें

```bash
npx claudeos-core lint
```

Project के `CLAUDE.md` पर `claude-md-validator` चलाता है. Fast है, कोई LLM calls नहीं, सिर्फ structural checks.

**Exit codes:**
- `0` — pass.
- `1` — fail. कम से कम एक structural issue.

**यह क्या check करता है** (पूरी check ID list के लिए [verification.md](verification.md) देखें):

- Section count exactly 8 होना चाहिए.
- Section 4 में 3 या 4 H3 sub-sections.
- Section 6 में exactly 3 H3 sub-sections.
- Section 8 में exactly 2 H3 sub-sections (Common Rules + L4 Memory) और exactly 2 H4 sub-sub-sections (L4 Memory Files + Memory Workflow).
- हर canonical section heading में English token (जैसे `Role Definition`, `Memory`) हो, ताकि `--lang` कुछ भी हो, multi-repo grep चले.
- चारों memory files में से हर एक exactly एक markdown table row में दिखे, Section 8 तक limited.

Validator **language-invariant** है: वही checks `--lang ko`, `--lang ja`, या किसी भी supported language में generate हुई CLAUDE.md पर काम करते हैं.

Pre-commit hooks और CI के लिए perfect.

---

## `health` — Verification suite चलाएँ

```bash
npx claudeos-core health
```

**4 validators** orchestrate करता है (claude-md-validator अलग से `lint` से चलता है):

| Order | Validator | Tier | Fail पर क्या होता है |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | यह fail हो, तो `sync-checker` skip हो जाता है. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (manifest succeed होने पर). |
| 4 | `content-validator` | advisory | दिखता है, block नहीं करता. |
| 5 | `pass-json-validator` | warn | दिखता है, block नहीं करता. |

**Exit codes:**
- `0` — कोई `fail`-tier findings नहीं. Warnings और advisories हो सकती हैं.
- `1` — कम से कम एक `fail`-tier finding.

3-tier severity (fail / warn / advisory) इसलिए जोड़ी, ताकि `content-validator` findings (unusual layouts में अक्सर false positives) CI pipelines को deadlock न करें.

हर validator के checks का detail [verification.md](verification.md) में है.

---

## `restore` — Saved plan disk पर apply करें (legacy)

```bash
npx claudeos-core restore
```

`plan-validator` को `--execute` mode में चलाता है: `claudeos-core/plan/*.md` files से content उन locations में copy करता है जिनका वो describe करती हैं.

**v2.1.0 status:** Master plan generation हटा दिया गया. `claudeos-core/plan/` अब `init` से auto-create नहीं होता. `plan/` न हो, तो यह command informational message log करके cleanly exit हो जाता है.

Command उन users के लिए है जो ad-hoc backup/restore के लिए plan files हाथ से maintain करते हैं. v2.1.0+ project पर चलाना harmless है.

जो file overwrite होती है, उसका `.bak` backup बनता है.

---

## `refresh` — Disk को saved plan से sync करें (legacy)

```bash
npx claudeos-core refresh
```

`restore` का उल्टा. `plan-validator` को `--refresh` mode में चलाता है: disk files की current state पढ़कर `claudeos-core/plan/*.md` को match करने के लिए update करता है.

**v2.1.0 status:** `restore` जैसा ही. `plan/` न हो तो no-op.

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

`plan-validator` को `--check` mode में चलाता है: `claudeos-core/plan/*.md` और disk के बीच के differences report करता है, बिना कुछ modify किए.

**v2.1.0 status:** `plan/` न हो तो no-op. ज़्यादातर users को `health` चलाना चाहिए, जो `plan-validator` को बाक़ी validators के साथ call करता है.

---

## `memory <subcommand>` — Memory layer maintenance

```bash
npx claudeos-core memory <subcommand>
```

तीन subcommands. Subcommands `init` के Pass 4 ने लिखी `claudeos-core/memory/` files पर operate करते हैं. वो files न हों, तो हर subcommand `not found` log करके cleanly skip कर देता है (best-effort tools).

Memory model का detail [memory-layer.md](memory-layer.md) में है.

### `memory compact`

```bash
npx claudeos-core memory compact
```

`decision-log.md` और `failure-patterns.md` पर 4-stage compaction apply करता है:

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body 1-line "fix" + meta में summarize |
| 2 | Duplicate headings | Merge (frequencies summed, body = latest वाला) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Drop |
| 4 | File > 400 lines | Trim oldest non-preserved entries |

`importance >= 7`, `lastSeen < 30 days`, या body में concrete (non-glob) active rule path. ये auto-preserve हो जाती हैं.

Compaction के बाद सिर्फ `compaction.md` का `## Last Compaction` section replace होता है. बाक़ी सब कुछ (manual notes) safe रहता है.

### `memory score`

```bash
npx claudeos-core memory score
```

`failure-patterns.md` की entries के लिए importance scores re-compute करता है:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Insertion से पहले existing importance lines strip करता है (duplicate-line regressions रोकने को). नया score entry की body में वापस write होता है.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

`failure-patterns.md` पढ़ता है, frequency ≥ 3 वाली entries pick करता है, और Claude से top candidates के लिए proposed `.claude/rules/` content draft करने को कहता है.

Per candidate confidence:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = entry में concrete file path mention हो जो disk पर मौजूद हो.)

Output **review के लिए `claudeos-core/memory/auto-rule-update.md` में append होता है**. **Auto-apply नहीं होता.** आप decide करते हो कि कौन-से suggestions actual rule files में copy करने हैं.

---

## Environment variables

| Variable | प्रभाव |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | memory-scaffold translation path को short-circuit करता है, `claude -p` invoke करने से पहले throw कर देता है. CI और translation-dependent tests इसे use करते हैं ताकि real Claude CLI installation न लगे. Strict `=== "1"` semantics. बाक़ी values इसे activate नहीं करते. |
| `CLAUDEOS_ROOT` | `bin/cli.js` user के project root पर automatically set करता है. Internal है, override मत करना. |

बस यही पूरी list है. कोई `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` वगैरह नहीं. वो exist ही नहीं करते.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success. |
| `1` | Validation failure (`fail`-tier finding) या `InitError` (जैसे prerequisite missing, malformed marker, file lock). |
| Other | Underlying Node process या sub-tool से आया. Uncaught exceptions, write errors वगैरह. |

"Interrupted" का कोई special exit code नहीं. Ctrl-C बस process terminate कर देता है. `init` दोबारा चलाओ, resume mechanism संभाल लेगा.

---

## `npm test` क्या चलाता है (contributors के लिए)

Repo clone किया है और locally test suite चलाना चाहते हो:

```bash
npm test
```

यह 33 test files में `node tests/*.test.js` चलाता है. Test suite Node का built-in `node:test` runner (कोई Jest, कोई Mocha नहीं) और `node:assert/strict` use करती है.

Single test file के लिए:

```bash
node tests/scan-java.test.js
```

CI suite Linux / macOS / Windows × Node 18 / 20 पर चलती है. CI workflow `CLAUDEOS_SKIP_TRANSLATION=1` set करता है ताकि translation-dependent tests को `claude` CLI न लगे.

---

## यह भी देखें

- [architecture.md](architecture.md) — `init` internally actually करता क्या है
- [verification.md](verification.md) — validators क्या check करते हैं
- [memory-layer.md](memory-layer.md) — `memory` subcommands किस पर operate करते हैं
- [troubleshooting.md](troubleshooting.md) — commands fail हों तब
