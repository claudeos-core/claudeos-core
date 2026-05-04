# Troubleshooting

Common errors और उनके fixes. आपकी problem यहाँ नहीं है तो reproduce करने के steps के साथ [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues).

> अंग्रेज़ी मूल: [docs/troubleshooting.md](../troubleshooting.md). हिन्दी version English के साथ sync रहता है.

---

## Installation issues

### "Command not found: claudeos-core"

Globally install नहीं किया है, या npm का global bin PATH पर नहीं है.

**Option A: `npx` use करें (recommended, कोई install नहीं):**
```bash
npx claudeos-core init
```

**Option B: Globally install करें:**
```bash
npm install -g claudeos-core
claudeos-core init
```

npm-installed है फिर भी "command not found" आ रहा है, तो PATH check करें:
```bash
npm config get prefix
# verify करें कि इस prefix के नीचे bin/ directory PATH में है
```

### "Cannot find module 'glob'" या ऐसा कुछ

ClaudeOS-Core project root के बाहर से चला रहे हैं. या तो:

1. पहले अपने project में `cd` करें.
2. `npx claudeos-core init` use करें (किसी भी directory से काम करता है).

### "Node.js version not supported"

ClaudeOS-Core को Node.js 18+ चाहिए. Version check करें:

```bash
node --version
```

[nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), या OS package manager से upgrade करें.

---

## Pre-flight checks

### "Claude Code not found"

ClaudeOS-Core local Claude Code installation use करता है. पहले इसे install करें:

- [Official installation guide](https://docs.anthropic.com/en/docs/claude-code)
- Verify: `claude --version`

`claude` installed है पर PATH पर नहीं, तो shell का PATH ठीक करें. कोई override env variable नहीं है.

### "Could not detect stack"

Scanner project का framework नहीं पहचान पाया. वजहें:

- Project root पर कोई `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` नहीं है.
- Stack [12 supported stacks](stacks.md) में नहीं है.
- Custom layout है जो auto-detection rules से match नहीं करता.

**Fix:** Verify करें कि project root में recognized files में से एक है. Stack supported है पर layout unusual है, तो `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखें.

### "Authentication test failed"

`init` एक quick `claude -p "echo ok"` चलाता है यह verify करने कि Claude Code authenticated है. यह fail हो जाए तो:

```bash
claude --version           # version प्रिंट करना चाहिए
claude -p "say hi"         # एक response प्रिंट करना चाहिए
```

`-p` auth error return कर रहा है तो Claude Code के auth flow को follow करें. ClaudeOS-Core आपकी तरफ़ से Claude auth fix नहीं कर सकता.

---

## Init runtime issues

### Init hang हो जाता है या बहुत time लेता है

बड़े project पर Pass 1 time लेता है. Diagnostics:

1. **Claude Code काम कर रहा है?** दूसरे terminal में `claude --version` चलाएँ.
2. **Network ठीक है?** हर pass Claude Code को call करता है, जो Anthropic API को call करता है.
3. **Project बहुत बड़ा है?** Domain group splitting auto-apply होती है (4 domains / 40 files per group), तो 24-domain project Pass 1 को छह बार चलाता है.

बिना किसी output के काफ़ी देर stuck है (progress ticker advance नहीं हो रहा), तो kill (Ctrl-C) करके resume करें:

```bash
npx claudeos-core init   # last completed pass marker से resume होता है
```

Resume mechanism सिर्फ़ incomplete passes फिर से चलाता है.

### Claude से "Prompt is too long" errors

मतलब Pass 3 context window से बाहर हो गया. Tool पहले से जो mitigations apply करता है:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux), automatic.
- **Domain group splitting**: domains > 4 या files > 40 per group होने पर auto-applied.
- **Batch sub-division**: ≥16 domains के लिए 3b/3c हर एक ≤15 domains के batches में sub-divide होता है.

इन सबके बाद भी context limits से टकरा रहे हैं, तो project exceptionally large है. Current options:

1. Project को अलग directories में split करें और हर एक में `init` चलाएँ.
2. Non-essential subapps skip करने के लिए `.claudeos-scan.json` से aggressive `frontendScan.platformKeywords` overrides add करें.
3. [Issue खोलें](https://github.com/claudeos-core/claudeos-core/issues). शायद आपके case के लिए नए override की ज़रूरत हो.

जो automatic है उससे ज़्यादा aggressive splitting "force" करने के लिए कोई flag नहीं है.

### Init बीच में fail होता है

Tool **resume-safe** है. बस फिर से चलाएँ:

```bash
npx claudeos-core init
```

यह last completed pass marker से उठाता है. कोई काम नहीं जाता.

Clean slate चाहिए (सारे markers delete करके सब कुछ regenerate), तो `--force` use करें:

```bash
npx claudeos-core init --force
```

ध्यान रहे: `--force` `.claude/rules/` में manual edits delete करता है. Details के लिए [safety.md](safety.md) देखें.

### Windows: "EBUSY" या file-lock errors

Windows file locking Unix से सख़्त है. वजहें:

- Antivirus mid-write files scan कर रहा है.
- कोई IDE exclusive lock के साथ file खोले हुए है.
- पिछली `init` crash हुई और stale handle छोड़ गई.

Fixes (इसी order में try करें):

1. IDE बंद करें, फिर से try करें.
2. Project folder पर antivirus का real-time scan disable करें (या project path whitelist करें).
3. Windows restart करें (stale handles साफ़ करता है).
4. Persistent हो तो WSL2 से चलाएँ.

`lib/staged-rules.js` का move logic `renameSync` से `copyFileSync + unlinkSync` पर fallback होता है, ताकि ज़्यादातर antivirus interference automatically handle हो जाए. फिर भी lock errors आ रहे हैं, तो staged files inspection के लिए `claudeos-core/generated/.staged-rules/` में रहती हैं. Move retry करने के लिए `init` फिर से चलाएँ.

### Cross-volume rename failures (Linux/macOS)

`init` को mount points के बीच atomically rename करना पड़ सकता है (जैसे `/tmp` से अलग disk पर आपके project में). Tool automatically copy-then-delete पर fallback हो जाता है. कोई action नहीं चाहिए.

Persistent move failures दिख रहे हैं, तो check करें कि `claudeos-core/generated/.staged-rules/` और `.claude/rules/` दोनों में write access है.

---

## Validation issues

### "STALE_PATH: file does not exist"

standards/skills/guides में mention कोई path real file पर resolve नहीं होता. वजहें:

- Pass 3 ने path hallucinate कर दिया (जैसे parent dir + किसी TypeScript constant के नाम से `featureRoutePath.ts` invent कर लिया).
- File delete कर दी पर docs अब भी reference कर रहे हैं.
- File gitignored है पर scanner की allowlist में थी.

**Fix:**

```bash
npx claudeos-core init --force
```

यह Pass 3 / 4 को नई allowlist के साथ regenerate करता है.

Path deliberately gitignored है और चाहते हैं कि scanner ignore करे, तो [advanced-config.md](advanced-config.md) देखें कि `.claudeos-scan.json` actually क्या support करता है (supported field set छोटा है).

`--force` से fix नहीं हो रहा (rare LLM seeds पर rerun में वही hallucination फिर trigger हो सकती है), तो offending file को हाथ से edit करें और bad path हटा दें. Validator **advisory** tier पर चलता है, इसलिए CI block नहीं होगा. Ship कर सकते हैं और बाद में fix कर सकते हैं.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

`claudeos-core/skills/00.shared/MANIFEST.md` में registered skills का CLAUDE.md में कहीं mention होना चाहिए. Validator में **orchestrator/sub-skill exception** है: sub-skills तब covered माने जाते हैं जब उनके orchestrator का mention हो.

**Fix:** Sub-skill के orchestrator का CLAUDE.md में सच में mention नहीं है, तो regenerate करने के लिए `init --force` चलाएँ. Orchestrator का mention है फिर भी validator flag कर रहा है, तो यह validator bug है. File paths के साथ [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues).

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` को Section 8 के नीचे exactly 2 `####` headings चाहिए (L4 Memory Files / Memory Workflow).

Possible reasons:

- CLAUDE.md manually edit की और Section 8 की structure टूट गई.
- कोई pre-v2.3.0 Pass 4 चला और Section 9 append कर गया.
- Pre-v2.2.0 version से upgrade कर रहे हैं (तब 8-section scaffold enforced नहीं था).

**Fix:**

```bash
npx claudeos-core init --force
```

यह CLAUDE.md cleanly regenerate करता है. Memory files `--force` में preserve रहती हैं (सिर्फ़ generated files overwrite होती हैं).

### "T1: section heading missing English canonical token"

हर `## N.` section heading में अपना English canonical token होना चाहिए (जैसे `## 1. Role Definition` या `## 1. भूमिका परिभाषा (Role Definition)`). इससे `--lang` के बावजूद multi-repo grep काम करता रहता है.

**Fix:** Heading edit करके parentheses में English token शामिल करें, या regenerate करने के लिए `init --force` चलाएँ (v2.3.0+ scaffold इस convention को automatically enforce करता है).

---

## Memory layer issues

### "Memory file growing too large"

Compaction चलाएँ:

```bash
npx claudeos-core memory compact
```

यह 4-stage compaction algorithm apply करता है. हर stage क्या करता है, यह [memory-layer.md](memory-layer.md) में देखें.

### "propose-rules ऐसे rules suggest कर रहा है जो मुझे पसंद नहीं"

Output review के लिए draft है, auto-applied नहीं. जो नहीं चाहिए वो decline कर दें:

- Rejected proposals हटाने के लिए `claudeos-core/memory/auto-rule-update.md` directly edit करें.
- या apply step पूरा skip कर दें. `.claude/rules/` तब तक unchanged रहती है जब तक proposed content manually rule files में copy न करें.

### `memory <subcommand>` "not found" बोलता है

Memory files missing हैं. ये `init` के Pass 4 से बनती हैं. Delete हो गई हों तो:

```bash
npx claudeos-core init --force
```

या, सब कुछ फिर से चलाए बिना सिर्फ़ memory files recreate करना है, तो tool के पास single-pass-replay command नहीं है. `--force` ही रास्ता है.

---

## CI issues

### Tests locally पास होते हैं पर CI में fail

सबसे likely वजहें:

1. **CI में `claude` installed नहीं है.** Translation-dependent tests `CLAUDEOS_SKIP_TRANSLATION=1` से bail out करते हैं. Official CI workflow यह env var set करता है. आपका fork नहीं करता तो set करें.

2. **Path normalization (Windows).** Codebase कई जगह Windows backslashes को forward slashes में normalize करता है, पर tests subtle differences पर trip हो सकते हैं. Official CI Windows + Linux + macOS पर चलता है इसलिए ज़्यादातर issues पकड़े जाते हैं. Windows-specific failure दिखे तो वह real bug हो सकता है.

3. **Node version.** Tests Node 18 + 20 पर चलते हैं. Node 16 या 22 पर हैं तो incompatibilities मिल सकती हैं. CI parity के लिए 18 या 20 पर pin करें.

### `health` CI में 0 exit करता है पर मुझे non-zero expected था

`health` सिर्फ़ **fail**-tier findings पर non-zero exit करता है. **warn** और **advisory** print होते हैं पर block नहीं करते.

Advisories पर fail चाहिए (जैसे `STALE_PATH` के बारे में strict होना), तो कोई built-in flag नहीं है. Output grep करके accordingly exit करना पड़ेगा:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Help कैसे पाएँ

ऊपर वाला कुछ भी fit न हो तो:

1. **Exact error message capture करें.** ClaudeOS-Core errors में file paths और identifiers होते हैं. ये reproduce करने में help करते हैं.
2. **Issue tracker check करें:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). आपका issue पहले से reported हो सकता है.
3. **नया issue खोलें** साथ में: OS, Node version, Claude Code version (`claude --version`), project stack, और error output. हो सके तो `claudeos-core/generated/project-analysis.json` include करें (sensitive vars auto-redacted होते हैं).

Security issues के लिए [SECURITY.md](../../SECURITY.md) देखें. Vulnerabilities के लिए public issues मत खोलें.

---

## यह भी देखें

- [safety.md](safety.md): `--force` क्या करता है और क्या preserve करता है
- [verification.md](verification.md): validator findings का मतलब
- [advanced-config.md](advanced-config.md): `.claudeos-scan.json` overrides
