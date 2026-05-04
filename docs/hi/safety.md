# Safety: Re-init पर क्या safe रहता है

एक common concern: _"मैंने अपनी `.claude/rules/` customize की है. `npx claudeos-core init` फिर से चलाऊँगा तो क्या मेरे edits चले जाएँगे?"_

**Short answer:** यह इस पर depend करता है कि `--force` use कर रहे हैं या नहीं.

> अंग्रेज़ी मूल: [docs/safety.md](../safety.md). हिन्दी version English के साथ sync रहता है.

इस page पर समझाते हैं कि re-run में actually क्या होता है, क्या touch होता है, क्या नहीं.

---

## Re-init में दो paths

मौजूदा output वाले project पर `init` फिर से चलाएँ, तो दो में से एक चीज़ होती है:

### Path 1: Resume (default, बिना `--force`)

`init` `claudeos-core/generated/` में existing pass markers पढ़ता है (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`).

हर pass के लिए, marker मौजूद है और structurally valid है तो pass **skip हो जाता है.** चारों markers valid हों तो `init` early exit होता है. कुछ करना ही नहीं है.

**Edits पर effect:** Manually जो भी edit किया है वो वैसे ही रहता है. कोई pass नहीं चलते, कोई file नहीं लिखी जाती.

ज़्यादातर "बस double-check कर रहा हूँ" workflows के लिए यही recommended path है.

### Path 2: Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` pass markers और rules delete करता है, फिर scratch से पूरा 4-pass pipeline चलाता है. **Rules में manual edits चले जाते हैं.** यह deliberate है. `--force` "साफ़ re-generation चाहिए" के लिए escape hatch है.

`--force` क्या delete करता है:
- `claudeos-core/generated/` की सभी `.json` और `.md` files (चारों pass markers + scanner output)
- `claudeos-core/generated/.staged-rules/` directory अगर कोई पिछली run mid-move crash हुई हो
- `.claude/rules/` के नीचे सब कुछ

`--force` क्या **नहीं** delete करता:
- `claudeos-core/memory/` files (decision log और failure patterns safe हैं)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/` वग़ैरह (इन्हें Pass 3 overwrite करता है, पर पहले से delete नहीं होतीं. जो Pass 3 regenerate नहीं करता, वह रहता है)
- `claudeos-core/` और `.claude/` के बाहर की files
- आपकी CLAUDE.md (Pass 3 इसे normal generation के हिस्से के तौर पर overwrite करता है)

**`--force` के under `.claude/rules/` wipe क्यों होती है लेकिन बाक़ी directories नहीं:** Pass 3 में "zero-rules detection" guard है जो तब fire होता है जब `.claude/rules/` empty हो. यह तय करता है कि per-domain rules stage skip करना है या नहीं. किसी पिछली run के stale rules मौजूद हों तो guard false-negative देगा और नए rules generate नहीं होंगे.

---

## `.claude/rules/` exist ही क्यों करता है (staging mechanism)

यह सबसे ज़्यादा पूछा जाने वाला सवाल है, इसलिए इसका अपना section है.

Claude Code में **sensitive-path policy** है जो `.claude/` पर subprocess writes को block करती है, यहाँ तक कि जब subprocess `--dangerously-skip-permissions` के साथ चले. यह Claude Code का intentional safety boundary है.

ClaudeOS-Core का Pass 3 और Pass 4 `claude -p` के subprocess invocations हैं, इसलिए वे directly `.claude/rules/` में नहीं लिख सकते. Solution:

1. Pass prompt Claude को बोलता है कि सभी rule files `claudeos-core/generated/.staged-rules/` में लिखे.
2. Pass ख़त्म होने के बाद **Node.js orchestrator** (जो Claude Code की permission policy के अधीन *नहीं* है) staging tree walk करता है और हर file को `.claude/rules/` में move करता है, sub-paths preserve करते हुए.
3. पूरी success पर staging directory remove हो जाती है.
4. Partial failure पर (file lock या cross-volume rename error) staging directory **preserved** रहती है ताकि देख सकें कि क्या नहीं गया, और अगली `init` run फिर से try करती है.

Mover `lib/staged-rules.js` में है. पहले `fs.renameSync` use करता है, Windows cross-volume / antivirus file-lock errors पर `fs.copyFileSync + fs.unlinkSync` पर fallback करता है.

**Actually आप क्या देखते हैं:** Normal flow में `.staged-rules/` एक ही `init` run के अंदर बनती है और empty रहती है. शायद कभी notice न करें. कोई run mid-stage crash हो जाए तो अगली `init` पर वहाँ files मिलेंगी, और `--force` उन्हें साफ़ कर देता है.

---

## कब क्या preserve होता है

| File category | `--force` के बिना | `--force` के साथ |
|---|---|---|
| `.claude/rules/` में manual edits | ✅ Preserved (कोई pass फिर से नहीं चलता) | ❌ चले जाते हैं (directory wipe होती है) |
| `claudeos-core/standard/` में manual edits | ✅ Preserved (कोई pass फिर से नहीं चलता) | ❌ Pass 3 overwrite करता है अगर वही files regenerate हों |
| `claudeos-core/skills/` में manual edits | ✅ Preserved | ❌ Pass 3 overwrite करता है |
| `claudeos-core/guide/` में manual edits | ✅ Preserved | ❌ Pass 3 overwrite करता है |
| `CLAUDE.md` में manual edits | ✅ Preserved | ❌ Pass 3 overwrite करता है |
| `claudeos-core/memory/` files | ✅ Preserved | ✅ Preserved (`--force` memory delete नहीं करता) |
| `claudeos-core/` और `.claude/` के बाहर की files | ✅ कभी touch नहीं | ✅ कभी touch नहीं |
| Pass markers (`generated/*.json`) | ✅ Preserved (resume के लिए use होते हैं) | ❌ Deleted (full re-run force करता है) |

**Honest summary:** ClaudeOS-Core में diff-and-merge layer नहीं है. कोई "apply करने से पहले changes review करो" prompt नहीं है. Preservation की कहानी binary है: या तो सिर्फ़ missing चीज़ें re-run करें (default), या wipe और regenerate करें (`--force`).

Important manual edits हैं और नया tool-generated content integrate करना है, तो recommended workflow:

1. पहले edits git में commit करें.
2. अलग branch पर `npx claudeos-core init --force` चलाएँ.
3. क्या बदला यह देखने के लिए `git diff` use करें.
4. हर side से जो चाहिए वो manually merge करें.

यह deliberately heavy workflow है. Tool जानबूझकर auto-merge try नहीं करता. Wrong हो गया तो rules subtle तरीक़ों से quietly corrupt हो जाएँगे.

---

## Pre-v2.2.0 upgrade detection

पुराने version (pre-v2.2.0, जब 8-section scaffold enforce नहीं था) से generated CLAUDE.md वाले project पर `init` चलाते हैं, तो tool heading count (`^## ` heading count ≠ 8, language-independent heuristic) से इसे detect करता है और warning emit करता है:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

Warning informational है. Tool normal तरीक़े से चलता रहता है. पुराना format रखना है तो ignore कर सकते हैं. लेकिन `--force` पर structural upgrade apply होता है और `claude-md-validator` पास होगा.

**Memory files `--force` upgrades में preserve होती हैं.** सिर्फ़ generated files overwrite होती हैं.

---

## Pass 4 immutability (v2.3.0+)

एक specific subtlety: **Pass 4 `CLAUDE.md` को touch नहीं करता.** Pass 3 की Section 8 पहले ही सारे ज़रूरी L4 memory file references लिख चुकी है. Pass 4 भी CLAUDE.md पर लिखे तो वह Section 8 का content दोबारा declare करेगा, और `[S1]`/`[M-*]`/`[F2-*]` validator errors आएँगे.

यह दो तरह से enforce होता है:
- Pass 4 prompt explicitly कहता है "CLAUDE.md MUST NOT BE MODIFIED."
- `lib/memory-scaffold.js` में `appendClaudeMdL4Memory()` function 3-line no-op है (unconditionally true return करता है, कोई write नहीं करता).
- Regression test `tests/pass4-claude-md-untouched.test.js` इस contract को enforce करता है.

**User के तौर पर क्या जानना चाहिए:** Pre-v2.3.0 project re-run कर रहे हैं जहाँ पुराना Pass 4 CLAUDE.md में Section 9 append करता था, तो `claude-md-validator` errors दिखेंगे. साफ़ regenerate करने के लिए `npx claudeos-core init --force` चलाएँ.

---

## `restore` command क्या करता है

```bash
npx claudeos-core restore
```

`restore` `plan-validator` को `--execute` mode में चलाता है. Historically यह `claudeos-core/plan/*.md` files से content उन locations में copy करता था जिनका वो describe करती थीं.

**v2.1.0 status:** Master plan generation v2.1.0 में हटा दिया गया. `claudeos-core/plan/` अब `init` से auto-create नहीं होता. `plan/` files के बिना `restore` no-op है. एक informational message log करता है और cleanly exit हो जाता है.

Command उन users के लिए रखा है जो ad-hoc backup/restore के लिए plan files को hand-maintain करते हैं. Real backup चाहिए तो git use करें.

---

## Recovery patterns

### "ClaudeOS के workflow के बाहर कुछ files delete कर दीं"

```bash
npx claudeos-core init --force
```

Pass 3 / Pass 4 scratch से फिर चलते हैं. Deleted files regenerate हो जाती हैं. बाक़ी files में manual edits चले जाते हैं (`--force` की वजह से). Safety के लिए git के साथ combine करें.

### "किसी एक specific rule को remove करना है"

बस file delete कर दें. अगली `init` (बिना `--force`) इसे recreate नहीं करेगी क्योंकि Pass 3 का resume marker पूरा pass skip कर देगा.

अगली `init --force` पर इसे recreate चाहते हैं तो कुछ करना नहीं है. Regeneration automatic है.

Permanently remove करना है (कभी regenerate नहीं), तो project को current state पर pin रखें और `--force` फिर कभी न चलाएँ. कोई built-in "इस file को regenerate मत करो" mechanism नहीं है.

### "Generated file को permanently customize करना है"

Tool में custom regions के लिए HTML-style begin/end markers नहीं हैं. दो options:

1. **इस project पर `--force` मत चलाएँ.** Default-resume में edits indefinitely preserve रहते हैं.
2. **Prompt template fork करें.** Tool की अपनी copy में `pass-prompts/templates/<stack>/pass3.md` modify करें, अपना fork install करें, regenerated file customizations reflect करेगी.

Simple project-specific overrides के लिए option 1 आम तौर पर काफ़ी है.

---

## Validators क्या check करते हैं (re-init के बाद)

`init` ख़त्म होने के बाद (चाहे resumed हो या `--force`) validators automatically चलते हैं:

- `claude-md-validator`: `lint` से अलग चलता है
- `health-checker`: चार content/path validators चलाता है

कुछ ग़लत हो (missing files, broken cross-references, made-up paths), तो validator output दिखेगा. Checks की list के लिए [verification.md](verification.md) देखें.

Validators कुछ fix नहीं करते. Report करते हैं. Report पढ़कर decide करें कि `init` फिर चलाना है या manually fix करना है.

---

## Testing से confidence

"User edits preserve करो" path (`--force` के बिना resume) `tests/init-command.test.js` और `tests/pass3-marker.test.js` के integration tests से exercise होता है.

CI Linux / macOS / Windows × Node 18 / 20 पर चलता है.

कोई ऐसा case मिले जहाँ ClaudeOS-Core ने इस doc को contradict करते हुए edits खो दिए हों, तो यह bug है. Reproduction steps के साथ [report करें](https://github.com/claudeos-core/claudeos-core/issues).

---

## यह भी देखें

- [architecture.md](architecture.md): context में staging mechanism
- [commands.md](commands.md): `--force` और बाक़ी flags
- [troubleshooting.md](troubleshooting.md): specific errors से recovery
