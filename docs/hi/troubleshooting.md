# Troubleshooting

सामान्य errors और उन्हें कैसे ठीक करें। यदि आपकी समस्या यहाँ नहीं है, तो प्रजनन करने के steps के साथ [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues)।

> अंग्रेज़ी मूल: [docs/troubleshooting.md](../troubleshooting.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

---

## Installation issues

### "Command not found: claudeos-core"

आपने इसे globally install नहीं किया है, या npm का global bin आपके PATH पर नहीं है।

**Option A — `npx` का उपयोग करें (अनुशंसित, कोई install नहीं):**
```bash
npx claudeos-core init
```

**Option B — Globally install करें:**
```bash
npm install -g claudeos-core
claudeos-core init
```

यदि npm-installed लेकिन फिर भी "command not found", अपना PATH जाँचें:
```bash
npm config get prefix
# सत्यापित करें कि इस prefix के तहत bin/ directory आपके PATH में है
```

### "Cannot find module 'glob'" या समान

आप ClaudeOS-Core को project root के बाहर से चला रहे हैं। या तो:

1. पहले अपने project में `cd` करें।
2. `npx claudeos-core init` का उपयोग करें (किसी भी directory से काम करता है)।

### "Node.js version not supported"

ClaudeOS-Core को Node.js 18+ चाहिए। अपना version जाँचें:

```bash
node --version
```

[nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), या अपने OS package manager के माध्यम से upgrade करें।

---

## Pre-flight checks

### "Claude Code not found"

ClaudeOS-Core आपके local Claude Code installation का उपयोग करता है। पहले इसे install करें:

- [आधिकारिक installation guide](https://docs.anthropic.com/en/docs/claude-code)
- सत्यापित करें: `claude --version`

यदि `claude` installed है लेकिन PATH पर नहीं है, तो अपने shell का PATH ठीक करें — कोई override env variable नहीं है।

### "Could not detect stack"

Scanner आपके project का framework पहचान नहीं सका। कारण:

- project root पर कोई `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` नहीं।
- आपका stack [12 समर्थित stacks](stacks.md) में नहीं है।
- Custom layout जो auto-detection rules से मेल नहीं खाता।

**Fix:** सत्यापित करें कि project root में पहचानी गई फ़ाइलों में से एक है। यदि आपका stack समर्थित है लेकिन आपका layout असामान्य है, तो `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखें।

### "Authentication test failed"

`init` एक quick `claude -p "echo ok"` चलाता है ताकि सत्यापित कर सके कि Claude Code authenticated है। यदि यह fail होता है:

```bash
claude --version           # version प्रिंट करना चाहिए
claude -p "say hi"         # एक response प्रिंट करना चाहिए
```

यदि `-p` एक auth error लौटाता है, तो Claude Code के auth flow का अनुसरण करें। ClaudeOS-Core आपकी ओर से Claude auth ठीक नहीं कर सकता।

---

## Init runtime issues

### Init hang होता है या बहुत समय लेता है

बड़े project पर Pass 1 कुछ समय लेता है। Diagnostics:

1. **क्या Claude Code काम कर रहा है?** दूसरे terminal में `claude --version` चलाएँ।
2. **क्या network ठीक है?** प्रत्येक pass Claude Code को call करता है, जो Anthropic API को call करता है।
3. **क्या आपका project बहुत बड़ा है?** Domain group splitting auto-apply होती है (4 domains / 40 files प्रति group), इसलिए एक 24-domain project Pass 1 को छह बार चलाता है।

यदि यह बिना किसी आउटपुट के लंबे समय तक stuck है (कोई progress ticker advance नहीं), इसे kill करें (Ctrl-C) और resume करें:

```bash
npx claudeos-core init   # अंतिम पूर्ण किए गए pass marker से resume होता है
```

Resume तंत्र केवल उन passes को फिर से चलाता है जो पूरा नहीं हुए।

### Claude से "Prompt is too long" errors

इसका अर्थ है कि Pass 3 context window से बाहर हो गया। टूल पहले से लागू mitigations:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — स्वचालित।
- **Domain group splitting** — domains > 4 या files > 40 प्रति group होने पर auto-applied।
- **Batch sub-division** — ≥16 domains के लिए, 3b/3c प्रत्येक ≤15 domains के batches में sub-divide होते हैं।

यदि इसके बावजूद आप अभी भी context limits से टकराते हैं, तो project असाधारण रूप से बड़ा है। वर्तमान विकल्प:

1. अपने project को अलग directories में split करें और प्रत्येक में `init` चलाएँ।
2. गैर-आवश्यक subapps को skip करने के लिए `.claudeos-scan.json` के माध्यम से aggressive `frontendScan.platformKeywords` overrides जोड़ें।
3. [Issue खोलें](https://github.com/claudeos-core/claudeos-core/issues) — हमें आपके मामले के लिए एक नए override की आवश्यकता हो सकती है।

जो पहले से स्वचालित है उससे अधिक aggressive splitting को "force" करने के लिए कोई flag नहीं है।

### Init बीच में fail होता है

टूल **resume-safe** है। बस फिर से चलाएँ:

```bash
npx claudeos-core init
```

यह अंतिम पूर्ण किए गए pass marker से उठाता है। कोई काम नहीं खोया।

यदि आप एक साफ़ slate चाहते हैं (सभी markers delete करें और सब कुछ फिर से उत्पन्न करें), `--force` का उपयोग करें:

```bash
npx claudeos-core init --force
```

ध्यान रहे: `--force` `.claude/rules/` में मैन्युअल edits delete करता है। विवरण के लिए [safety.md](safety.md) देखें।

### Windows: "EBUSY" या file-lock errors

Windows file locking Unix से कठोर है। कारण:

- Antivirus mid-write फ़ाइलों को scan कर रहा है।
- एक IDE में exclusive lock के साथ फ़ाइल खुली है।
- एक पिछली `init` crash हुई और एक stale handle छोड़ गई।

Fixes (क्रम में आज़माएँ):

1. अपना IDE बंद करें, फिर से कोशिश करें।
2. project folder के लिए antivirus का real-time scan disable करें (या project path को whitelist करें)।
3. Windows restart करें (stale handles साफ़ करता है)।
4. यदि persistent है, तो इसके बजाय WSL2 से चलाएँ।

`lib/staged-rules.js` move logic `renameSync` से `copyFileSync + unlinkSync` पर fallback होती है ताकि अधिकांश antivirus interference को स्वचालित रूप से संभाला जा सके। यदि आप अभी भी lock errors से टकराते हैं, तो staged फ़ाइलें निरीक्षण के लिए `claudeos-core/generated/.staged-rules/` में रहती हैं — move को फिर से कोशिश करने के लिए `init` को फिर से चलाएँ।

### Cross-volume rename failures (Linux/macOS)

`init` को mount points के बीच atomically rename करने की आवश्यकता हो सकती है (उदा., `/tmp` से एक अलग disk पर आपके project में)। टूल स्वचालित रूप से copy-then-delete पर fallback होता है — कोई कार्रवाई नहीं चाहिए।

यदि आप persistent move failures देखते हैं, तो जाँचें कि आपके पास `claudeos-core/generated/.staged-rules/` और `.claude/rules/` दोनों में write access है।

---

## Validation issues

### "STALE_PATH: file does not exist"

standards/skills/guides में उल्लिखित एक path एक वास्तविक फ़ाइल पर resolve नहीं होता। कारण:

- Pass 3 ने एक path hallucinate किया (उदा., parent dir + एक TypeScript constant नाम से `featureRoutePath.ts` का आविष्कार किया)।
- आपने एक फ़ाइल delete की लेकिन docs अभी भी इसका संदर्भ देती हैं।
- फ़ाइल gitignored है लेकिन scanner की allowlist में थी।

**Fix:**

```bash
npx claudeos-core init --force
```

यह Pass 3 / 4 को एक नई allowlist के साथ regenerate करता है।

यदि path जानबूझकर gitignored है और आप चाहते हैं कि scanner इसे ignore करे, तो [advanced-config.md](advanced-config.md) देखें कि `.claudeos-scan.json` वास्तव में क्या समर्थन करता है (समर्थित field set छोटा है)।

यदि `--force` इसे ठीक नहीं करता (फिर से चलाने पर दुर्लभ LLM seeds पर वही hallucination फिर से trigger हो सकती है), तो आपत्तिजनक फ़ाइल को हाथ से संपादित करें और bad path हटा दें। Validator **advisory** tier पर चलता है, इसलिए यह CI को block नहीं करेगा — आप ship कर सकते हैं और बाद में ठीक कर सकते हैं।

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

`claudeos-core/skills/00.shared/MANIFEST.md` में registered skills का CLAUDE.md में कहीं उल्लेख होना चाहिए। Validator में एक **orchestrator/sub-skill exception** है — sub-skills को covered माना जाता है जब उनके orchestrator का उल्लेख होता है।

**Fix:** यदि एक sub-skill के orchestrator का वास्तव में CLAUDE.md में उल्लेख नहीं है, तो regenerate करने के लिए `init --force` चलाएँ। यदि orchestrator का उल्लेख है और validator फिर भी इसे flag करता है, तो यह एक validator bug है — कृपया फ़ाइल paths के साथ [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues)।

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` को Section 8 के तहत ठीक 2 `####` headings (L4 Memory Files / Memory Workflow) चाहिए।

संभावित कारण:

- आपने मैन्युअल रूप से CLAUDE.md संपादित की और Section 8 की संरचना तोड़ दी।
- एक pre-v2.3.0 Pass 4 चला और एक Section 9 append की।
- आप एक pre-v2.2.0 version से upgrade कर रहे हैं (8-section scaffold अभी enforced नहीं था)।

**Fix:**

```bash
npx claudeos-core init --force
```

यह CLAUDE.md को साफ़ regenerate करता है। Memory फ़ाइलें `--force` में संरक्षित होती हैं (केवल उत्पन्न फ़ाइलें overwrite होती हैं)।

### "T1: section heading missing English canonical token"

प्रत्येक `## N.` section heading में अपना English canonical token होना चाहिए (उदा., `## 1. Role Definition` या `## 1. भूमिका परिभाषा (Role Definition)`)। यह `--lang` की परवाह किए बिना multi-repo grep को काम करते रखने के लिए है।

**Fix:** heading को parentheses में English token शामिल करने के लिए संपादित करें, या regenerate करने के लिए `init --force` चलाएँ (v2.3.0+ scaffold इस convention को स्वचालित रूप से enforce करता है)।

---

## Memory layer issues

### "Memory file growing too large"

Compaction चलाएँ:

```bash
npx claudeos-core memory compact
```

यह 4-stage compaction algorithm लागू करता है। प्रत्येक stage क्या करता है यह [memory-layer.md](memory-layer.md) देखें।

### "propose-rules मुझे ऐसे rules सुझाता है जिनसे मैं असहमत हूँ"

आउटपुट समीक्षा के लिए draft है, auto-applied नहीं। बस वह decline करें जो आप नहीं चाहते:

- अस्वीकृत proposals हटाने के लिए `claudeos-core/memory/auto-rule-update.md` को सीधे संपादित करें।
- या apply step को पूरी तरह से छोड़ दें — आपकी `.claude/rules/` अपरिवर्तित रहती है जब तक आप मैन्युअल रूप से proposed content को rule files में copy नहीं करते।

### `memory <subcommand>` कहता है "not found"

Memory फ़ाइलें missing हैं। वे `init` के Pass 4 द्वारा बनाई जाती हैं। यदि वे delete हो गई थीं:

```bash
npx claudeos-core init --force
```

या, यदि आप सब कुछ फिर से चलाए बिना केवल memory फ़ाइलों को फिर से बनाना चाहते हैं, टूल के पास single-pass-replay command नहीं है। `--force` ही पथ है।

---

## CI issues

### Tests locally पास होते हैं लेकिन CI में fail होते हैं

सबसे संभावित कारण:

1. **CI में `claude` installed नहीं है।** Translation-dependent tests `CLAUDEOS_SKIP_TRANSLATION=1` के माध्यम से bail out करते हैं। आधिकारिक CI workflow यह env var सेट करता है; यदि आपका fork नहीं करता, इसे सेट करें।

2. **Path normalization (Windows)।** Codebase कई जगह Windows backslashes को forward slashes में normalize करता है, लेकिन tests सूक्ष्म अंतरों पर trip हो सकते हैं। आधिकारिक CI Windows + Linux + macOS पर चलता है इसलिए अधिकांश issues पकड़े जाते हैं — यदि आप एक Windows-विशिष्ट failure देखते हैं, तो यह एक वास्तविक bug हो सकता है।

3. **Node version।** Tests Node 18 + 20 पर चलते हैं। यदि आप Node 16 या 22 पर हैं, तो आप incompatibilities से टकरा सकते हैं — CI parity के लिए 18 या 20 पर pin करें।

### `health` CI में 0 exit होता है लेकिन मुझे non-zero की उम्मीद थी

`health` केवल **fail**-tier findings पर non-zero exit होता है। **warn** और **advisory** print होते हैं लेकिन block नहीं करते।

यदि आप advisories पर fail करना चाहते हैं (उदा., `STALE_PATH` के बारे में strict होने के लिए), कोई built-in flag नहीं है — आपको आउटपुट को grep करना होगा और तदनुसार exit करना होगा:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## मदद पाना

यदि उपरोक्त में से कुछ भी फ़िट नहीं होता:

1. **सटीक error संदेश capture करें।** ClaudeOS-Core errors में फ़ाइल paths और identifiers शामिल होते हैं — ये reproduce करने में मदद करते हैं।
2. **Issue tracker जाँचें:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — आपका issue पहले से reported हो सकता है।
3. **एक नया issue खोलें** के साथ: OS, Node version, Claude Code version (`claude --version`), project stack, और error आउटपुट। यदि संभव हो, `claudeos-core/generated/project-analysis.json` शामिल करें (sensitive vars auto-redacted होते हैं)।

सुरक्षा issues के लिए, [SECURITY.md](../../SECURITY.md) देखें — vulnerabilities के लिए सार्वजनिक issues न खोलें।

---

## यह भी देखें

- [safety.md](safety.md) — `--force` क्या करता है और क्या संरक्षित करता है
- [verification.md](verification.md) — validator findings का अर्थ क्या है
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` overrides
