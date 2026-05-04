# Documentation (हिन्दी)

यह फ़ोल्डर तब काम आता है जब [main README](../../README.hi.md) से ज़्यादा गहराई चाहिए।

बस tool try कर रहे हैं तो main README काफ़ी है। जब समझना हो कि _कुछ कैसे_ काम करता है, न कि सिर्फ़ _कि_ काम करता है, तब यहाँ वापस आइए।

> English original: [docs/README.md](../README.md). हिन्दी translation English के साथ sync में रखा है।

---

## नया हूँ, शुरू कहाँ से करूँ?

ये क्रम में पढ़िए। हर doc मानकर चलता है कि पिछला पढ़ लिया है।

1. **[Architecture](architecture.md)** — `init` अंदर actually कैसे काम करता है। 4-pass pipeline, passes में क्यों बाँटा है, कोई भी LLM call होने से पहले scanner क्या करता है। Mental model यहीं से बनाइए।

2. **[Diagrams](diagrams.md)** — वही architecture, Mermaid diagrams के साथ। architecture doc के साथ-साथ खोलकर देखिए।

3. **[Stacks](stacks.md)** — supported 12 stacks (8 backend + 4 frontend), हर stack कैसे detect होता है, per-stack scanner क्या facts निकालता है।

4. **[Verification](verification.md)** — Claude के docs generate करने के बाद चलने वाले 5 validators। क्या check करते हैं, क्यों ज़रूरी हैं, output कैसे पढ़ें।

5. **[Commands](commands.md)** — हर CLI command और वो क्या करता है। बेसिक्स clear हो जाने पर reference की तरह use कीजिए।

Step 5 के बाद mental model तैयार हो जाएगा। इस फ़ोल्डर में बाक़ी सब specific situations के लिए है।

---

## मेरा specific सवाल है

| सवाल | पढ़िए |
|---|---|
| "`npx` के बिना install कैसे करूँ?" | [Manual Installation](manual-installation.md) |
| "मेरे project का structure supported है क्या?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "Re-run करने से मेरे edits उड़ जाएँगे?" | [Safety](safety.md) |
| "कुछ टूट गया, recover कैसे करूँ?" | [Troubleshooting](troubleshooting.md) |
| "Tool X की जगह यही क्यों use करें?" | [Comparison](comparison.md) |
| "Memory layer किसलिए है?" | [Memory Layer](memory-layer.md) |
| "Scanner customize कैसे करूँ?" | [Advanced Config](advanced-config.md) |

---

## सभी docs

| File | विषय |
|---|---|
| [architecture.md](architecture.md) | 4-pass pipeline + scanner + validators, end to end |
| [diagrams.md](diagrams.md) | उसी flow के Mermaid diagrams |
| [stacks.md](stacks.md) | Supported 12 stacks, detail में |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | 5 post-generation validators |
| [commands.md](commands.md) | हर CLI command, हर flag, exit codes |
| [manual-installation.md](manual-installation.md) | `npx` के बिना install (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` overrides |
| [safety.md](safety.md) | Re-init पर क्या safe रहता है |
| [comparison.md](comparison.md) | Similar tools से scope comparison |
| [troubleshooting.md](troubleshooting.md) | Errors और recovery |

---

## यह फ़ोल्डर कैसे पढ़ें

हर doc **standalone पढ़ा जा सके** ऐसे लिखा गया है। ऊपर वाला new-user path छोड़कर बाक़ी कहीं भी क्रम से पढ़ने की ज़रूरत नहीं। Cross-link सिर्फ़ वहीं हैं जहाँ एक concept दूसरे पर depend करता है।

इन docs में चलने वाले conventions:

- **Code blocks** दिखाते हैं कि actually क्या type करेंगे, या file में actually क्या है। Explicitly न बताया हो तो ये abbreviated नहीं हैं।
- **`✅` / `❌`** tables में बस "हाँ" / "नहीं" है, इससे ज़्यादा कोई बारीकी नहीं।
- File paths जैसे **`claudeos-core/standard/00.core/01.project-overview.md`** project root से absolute हैं।
- **`(v2.4.0)`** जैसे version marker का मतलब है "इस version में add हुआ"। पुराने versions में नहीं था।

कोई doc कुछ कहता हो और आपको evidence मिले कि वो सच नहीं है, तो वो doc का bug है। [Issue खोल दीजिए](https://github.com/claudeos-core/claudeos-core/issues).

---

## कुछ confusing मिला?

किसी भी doc पर PRs welcome हैं। ये docs इन conventions को follow करते हैं:

- **Jargon की जगह सरल भाषा।** ज़्यादातर readers पहली बार ClaudeOS-Core try कर रहे हैं।
- **Abstraction की जगह examples।** Real code, real file paths, real command output दिखाइए।
- **Limitations पर honest रहिए।** कुछ काम नहीं करता या कोई limit है, तो बता दीजिए।
- **Source से verified।** जो feature exist नहीं करता, उसे document मत कीजिए।

Contribution flow के लिए [CONTRIBUTING.md](../../CONTRIBUTING.md) देखिए।
