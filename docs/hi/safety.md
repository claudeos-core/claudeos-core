# Safety: Re-init पर क्या सुरक्षित रहता है

एक सामान्य चिंता: _"मैंने अपनी `.claude/rules/` को customize किया है। यदि मैं `npx claudeos-core init` फिर से चलाता हूँ, तो क्या मेरे edits खो जाएँगे?"_

**छोटा उत्तर:** यह इस पर निर्भर करता है कि आप `--force` का उपयोग करते हैं या नहीं।

> अंग्रेज़ी मूल: [docs/safety.md](../safety.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

यह पृष्ठ बताता है कि जब आप फिर से चलाते हैं तो वास्तव में क्या होता है, क्या स्पर्श किया जाता है, और क्या नहीं।

---

## Re-init के माध्यम से दो पथ

जब आप उस project पर `init` फिर से चलाते हैं जिसमें पहले से आउटपुट है, दो चीज़ों में से एक होती है:

### Path 1 — Resume (default, बिना `--force`)

`init` `claudeos-core/generated/` में मौजूदा pass markers (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) पढ़ता है।

प्रत्येक pass के लिए, यदि marker मौजूद है और संरचनात्मक रूप से वैध है, pass **छोड़ दिया जाता है**। यदि सभी चार markers वैध हैं, `init` जल्दी exit होता है — इसके पास करने के लिए कुछ नहीं है।

**आपके edits पर प्रभाव:** आपने मैन्युअल रूप से जो भी संपादित किया है उसे अकेला छोड़ दिया जाता है। कोई passes नहीं चलते, कोई फ़ाइलें नहीं लिखी जातीं।

यह अधिकांश "मैं बस फिर से जाँच रहा हूँ" workflows के लिए अनुशंसित पथ है।

### Path 2 — Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` pass markers और rules को delete करता है, फिर scratch से पूर्ण 4-pass pipeline चलाता है। **Rules में मैन्युअल edits खो जाते हैं।** यह जानबूझकर है — `--force` "मुझे साफ़ re-generation चाहिए" के लिए escape hatch है।

`--force` क्या delete करता है:
- `claudeos-core/generated/` के तहत सभी `.json` और `.md` फ़ाइलें (चार pass markers + scanner output)
- बचा हुआ `claudeos-core/generated/.staged-rules/` directory यदि कोई पिछली run mid-move crash हुई थी
- `.claude/rules/` के तहत सब कुछ

`--force` क्या delete **नहीं** करता:
- `claudeos-core/memory/` फ़ाइलें (आपका decision log और failure patterns संरक्षित हैं)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/` आदि (ये Pass 3 द्वारा overwrite होती हैं, लेकिन पहले से delete नहीं होतीं — Pass 3 जो regenerate नहीं करता वह रहता है)
- `claudeos-core/` और `.claude/` के बाहर की फ़ाइलें
- आपकी CLAUDE.md (Pass 3 इसे सामान्य generation के हिस्से के रूप में overwrite करता है)

**`--force` के तहत `.claude/rules/` क्यों wipe होती है लेकिन अन्य directories नहीं:** Pass 3 में एक "zero-rules detection" guard है जो तब fire होता है जब `.claude/rules/` empty हो, यह तय करने के लिए कि per-domain rules stage को skip करना है या नहीं। यदि किसी पिछली run से stale rules मौजूद हैं, तो guard false-negative होगा और नए rules उत्पन्न नहीं होंगे।

---

## `.claude/rules/` बिल्कुल क्यों मौजूद है (staging तंत्र)

यह सबसे अधिक पूछा गया प्रश्न है, इसलिए इसे अपना section मिलता है।

Claude Code में एक **sensitive-path policy** है जो `.claude/` पर subprocess writes को block करती है, यहाँ तक कि जब subprocess `--dangerously-skip-permissions` के साथ चलता है। यह स्वयं Claude Code में एक जानबूझकर सुरक्षा सीमा है।

ClaudeOS-Core के Pass 3 और Pass 4 `claude -p` के subprocess आह्वान हैं, इसलिए वे सीधे `.claude/rules/` में नहीं लिख सकते। समाधान:

1. Pass prompt Claude को सभी rule फ़ाइलों को `claudeos-core/generated/.staged-rules/` में लिखने का निर्देश देता है।
2. Pass समाप्त होने के बाद, **Node.js orchestrator** (जो Claude Code की permission policy के अधीन *नहीं* है) staging tree को चलता है और प्रत्येक फ़ाइल को `.claude/rules/` में move करता है, sub-paths को संरक्षित करते हुए।
3. पूर्ण सफलता पर, staging directory हटा दी जाती है।
4. आंशिक failure पर (file lock या cross-volume rename error), staging directory **संरक्षित** की जाती है ताकि आप देख सकें कि क्या नहीं गया, और अगली `init` run फिर से कोशिश करती है।

Mover `lib/staged-rules.js` में है। यह पहले `fs.renameSync` का उपयोग करता है, Windows cross-volume / antivirus file-lock errors पर `fs.copyFileSync + fs.unlinkSync` पर fallback करता है।

**आप वास्तव में क्या देखते हैं:** सामान्य प्रवाह में, `.staged-rules/` एक ही `init` run के भीतर बनती है और खाली होती है — आप शायद कभी इसे नोटिस न करें। यदि कोई run mid-stage crash होती है, तो आप अगली `init` पर वहाँ फ़ाइलें पाएँगे, और `--force` उन्हें साफ़ कर देता है।

---

## क्या कब संरक्षित रहता है

| फ़ाइल श्रेणी | बिना `--force` | `--force` के साथ |
|---|---|---|
| `.claude/rules/` में मैन्युअल edits | ✅ संरक्षित (कोई passes फिर से नहीं चलते) | ❌ खो जाते हैं (directory wipe होती है) |
| `claudeos-core/standard/` में मैन्युअल edits | ✅ संरक्षित (कोई passes फिर से नहीं चलते) | ❌ Pass 3 द्वारा overwrite यदि वह वही फ़ाइलें regenerate करता है |
| `claudeos-core/skills/` में मैन्युअल edits | ✅ संरक्षित | ❌ Pass 3 द्वारा overwrite |
| `claudeos-core/guide/` में मैन्युअल edits | ✅ संरक्षित | ❌ Pass 3 द्वारा overwrite |
| `CLAUDE.md` में मैन्युअल edits | ✅ संरक्षित | ❌ Pass 3 द्वारा overwrite |
| `claudeos-core/memory/` फ़ाइलें | ✅ संरक्षित | ✅ संरक्षित (`--force` memory को delete नहीं करता) |
| `claudeos-core/` और `.claude/` के बाहर की फ़ाइलें | ✅ कभी स्पर्श नहीं | ✅ कभी स्पर्श नहीं |
| Pass markers (`generated/*.json`) | ✅ संरक्षित (resume के लिए उपयोग) | ❌ Deleted (पूर्ण re-run force करता है) |

**ईमानदार सारांश:** ClaudeOS-Core में diff-and-merge layer नहीं है। कोई "apply करने से पहले changes review करें" prompt नहीं है। Preservation कहानी binary है: या तो केवल वही फिर से चलाएँ जो missing है (default) या wipe और regenerate करें (`--force`)।

यदि आपने महत्वपूर्ण मैन्युअल edits किए हैं और नई tool-generated content को integrate करने की आवश्यकता है, तो अनुशंसित workflow है:

1. पहले अपने edits को git में commit करें।
2. एक अलग branch पर `npx claudeos-core init --force` चलाएँ।
3. यह देखने के लिए `git diff` का उपयोग करें कि क्या बदला।
4. प्रत्येक side से जो भी आप चाहते हैं उसे मैन्युअल रूप से merge करें।

यह जानबूझकर एक भारी workflow है। टूल जानबूझकर auto-merge करने की कोशिश नहीं करता — उसे गलत करने पर rules सूक्ष्म तरीक़ों से चुपचाप corrupt हो जाएँगे।

---

## Pre-v2.2.0 upgrade detection

जब आप एक पुराने संस्करण (pre-v2.2.0, इससे पहले कि 8-section scaffold enforce हुई) द्वारा उत्पन्न CLAUDE.md वाले project पर `init` चलाते हैं, टूल heading count (`^## ` heading count ≠ 8 — language-independent heuristic) के माध्यम से इसका पता लगाता है और एक warning emit करता है:

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

Warning informational है। टूल सामान्य रूप से जारी रहता है — यदि आप पुराने format को रखना चाहते हैं तो आप इसे नज़रअंदाज़ कर सकते हैं। लेकिन `--force` पर, संरचनात्मक upgrade लागू होता है और `claude-md-validator` पास होगा।

**Memory फ़ाइलें `--force` upgrades में संरक्षित होती हैं।** केवल उत्पन्न फ़ाइलें overwrite होती हैं।

---

## Pass 4 immutability (v2.3.0+)

एक विशिष्ट सूक्ष्मता: **Pass 4 `CLAUDE.md` को स्पर्श नहीं करता।** Pass 3 की Section 8 ने पहले से ही सभी आवश्यक L4 memory file references लिखे हैं। यदि Pass 4 भी CLAUDE.md पर लिखता, तो यह Section 8 की content फिर से घोषित करता, `[S1]`/`[M-*]`/`[F2-*]` validator errors बनाता।

यह दोनों तरह से enforce किया जाता है:
- Pass 4 prompt स्पष्ट रूप से कहता है "CLAUDE.md MUST NOT BE MODIFIED।"
- `lib/memory-scaffold.js` में `appendClaudeMdL4Memory()` function एक 3-line no-op है (बिना शर्त true लौटाता है, कोई writes नहीं करता)।
- Regression test `tests/pass4-claude-md-untouched.test.js` इस contract को enforce करता है।

**एक user के रूप में आपको क्या जानना चाहिए:** यदि आप एक pre-v2.3.0 project को फिर से चलाते हैं जहाँ पुराने Pass 4 ने CLAUDE.md में Section 9 append की थी, आप `claude-md-validator` errors देखेंगे। साफ़ regenerate करने के लिए `npx claudeos-core init --force` चलाएँ।

---

## `restore` command क्या करता है

```bash
npx claudeos-core restore
```

`restore` `plan-validator` को `--execute` mode में चलाता है। ऐतिहासिक रूप से यह `claudeos-core/plan/*.md` फ़ाइलों से content को उन locations में copy करता था जिनका वे वर्णन करते हैं।

**v2.1.0 स्थिति:** Master plan generation v2.1.0 में हटा दिया गया था। `claudeos-core/plan/` अब `init` द्वारा auto-create नहीं होता। `plan/` फ़ाइलों के बिना, `restore` एक no-op है — यह एक informational संदेश log करता है और साफ़ तरीक़े से exit होता है।

Command उन users के लिए रखा गया है जो ad-hoc backup/restore के लिए plan files को hand-maintain करते हैं। यदि आप वास्तविक backup चाहते हैं, git का उपयोग करें।

---

## Recovery patterns

### "मैंने ClaudeOS के workflow के बाहर कुछ फ़ाइलें delete की हैं"

```bash
npx claudeos-core init --force
```

Pass 3 / Pass 4 को scratch से फिर से चलाता है। Deleted फ़ाइलें regenerate होती हैं। अन्य फ़ाइलों में आपके मैन्युअल edits खो जाते हैं (क्योंकि `--force`) — सुरक्षा के लिए git के साथ combine करें।

### "मैं एक विशिष्ट rule हटाना चाहता हूँ"

बस फ़ाइल delete कर दें। अगली `init` (बिना `--force`) इसे फिर से नहीं बनाएगी क्योंकि Pass 3 का resume marker पूरे pass को skip कर देगा।

यदि आप इसे अगली `init --force` पर फिर से बनाना चाहते हैं, आपको कुछ भी करने की आवश्यकता नहीं है — regeneration स्वचालित है।

यदि आप इसे स्थायी रूप से हटाना चाहते हैं (कभी regenerate नहीं), तो आपको project को इसकी वर्तमान state पर pin करके रखना होगा और फिर से `--force` नहीं चलाना होगा। कोई built-in "इस फ़ाइल को regenerate न करें" तंत्र नहीं है।

### "मैं एक उत्पन्न फ़ाइल को स्थायी रूप से customize करना चाहता हूँ"

टूल में custom regions के लिए HTML-style begin/end markers नहीं हैं। दो विकल्प:

1. **इस project पर `--force` न चलाएँ** — आपके edits default-resume के तहत अनिश्चित काल तक संरक्षित रहते हैं।
2. **prompt template fork करें** — टूल की अपनी copy में `pass-prompts/templates/<stack>/pass3.md` को संशोधित करें, अपना fork install करें, और regenerated फ़ाइल आपके customizations को दर्शाएगी।

सरल project-विशिष्ट overrides के लिए, विकल्प 1 आम तौर पर पर्याप्त है।

---

## Validators क्या जाँचते हैं (re-init के बाद)

`init` समाप्त होने के बाद (चाहे resumed हो या `--force`), validators स्वचालित रूप से चलते हैं:

- `claude-md-validator` — `lint` के माध्यम से अलग चलता है
- `health-checker` — चार content/path validators चलाता है

यदि कुछ गलत है (missing फ़ाइलें, टूटी हुई cross-references, मनगढ़ंत paths), आप validator आउटपुट देखेंगे। Check सूची के लिए [verification.md](verification.md) देखें।

Validators कुछ ठीक नहीं करते — वे रिपोर्ट करते हैं। आप रिपोर्ट पढ़ते हैं, फिर तय करते हैं कि `init` को फिर से चलाना है या मैन्युअल रूप से ठीक करना है।

---

## Testing के माध्यम से विश्वास

"User edits संरक्षित करें" पथ (बिना `--force` resume) `tests/init-command.test.js` और `tests/pass3-marker.test.js` के तहत integration tests द्वारा exercise होता है।

CI Linux / macOS / Windows × Node 18 / 20 पर चलता है।

यदि आप एक ऐसा मामला पाते हैं जहाँ ClaudeOS-Core ने इस doc का खंडन करते हुए आपके edits खोए, यह एक bug है। प्रतिकृति steps के साथ [इसकी रिपोर्ट करें](https://github.com/claudeos-core/claudeos-core/issues)।

---

## यह भी देखें

- [architecture.md](architecture.md) — context में staging तंत्र
- [commands.md](commands.md) — `--force` और अन्य flags
- [troubleshooting.md](troubleshooting.md) — विशिष्ट errors से recovery
