# Documentation (हिन्दी)

स्वागत है। यह फ़ोल्डर तब के लिए है जब आपको [मुख्य README](../../README.hi.md) में शामिल नहीं होने वाली गहराई की आवश्यकता हो।

यदि आप केवल चीज़ें आज़मा रहे हैं, तो मुख्य README पर्याप्त है — जब आप जानना चाहें कि _कुछ कैसे_ काम करता है, न कि केवल _वह_ काम करता है, तब यहाँ वापस आएँ।

> अंग्रेज़ी मूल: [docs/README.md](../README.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

---

## मैं नया हूँ — कहाँ से शुरू करूँ?

इन्हें क्रम में पढ़ें। प्रत्येक यह मानकर चलता है कि आपने पिछले को पढ़ा है।

1. **[Architecture](architecture.md)** — `init` वास्तव में अंदरूनी रूप से कैसे काम करता है। 4-pass पाइपलाइन, इसे passes में क्यों विभाजित किया गया है, कोई LLM शामिल होने से पहले scanner क्या करता है। वैचारिक मॉडल यहाँ से शुरू करें।

2. **[Diagrams](diagrams.md)** — वही architecture Mermaid चित्रों के साथ समझाया गया। architecture दस्तावेज़ के साथ-साथ देखें।

3. **[Stacks](stacks.md)** — समर्थित 12 stacks (8 backend + 4 frontend), प्रत्येक का पता कैसे लगाया जाता है, प्रति-stack scanner क्या तथ्य निकालता है।

4. **[Verification](verification.md)** — Claude द्वारा docs उत्पन्न करने के बाद चलने वाले 5 validators। वे क्या जाँचते हैं, क्यों मौजूद हैं, और उनके आउटपुट को कैसे पढ़ें।

5. **[Commands](commands.md)** — हर CLI command और वह क्या करता है। एक बार बुनियादी जानकारी हो जाने पर reference के रूप में उपयोग करें।

चरण 5 के बाद आपके पास मानसिक मॉडल होगा। इस फ़ोल्डर में बाक़ी सब कुछ विशिष्ट परिस्थितियों के लिए है।

---

## मेरा एक विशिष्ट प्रश्न है

| प्रश्न | पढ़ें |
|---|---|
| "मैं `npx` के बिना कैसे install करूँ?" | [Manual Installation](manual-installation.md) |
| "क्या मेरे प्रोजेक्ट की संरचना समर्थित है?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "क्या पुनः चलाने से मेरे edits मिट जाएँगे?" | [Safety](safety.md) |
| "कुछ टूट गया — मैं कैसे रिकवर करूँ?" | [Troubleshooting](troubleshooting.md) |
| "टूल X के बजाय इसे क्यों उपयोग करें?" | [Comparison](comparison.md) |
| "memory layer किसके लिए है?" | [Memory Layer](memory-layer.md) |
| "मैं scanner को कैसे customize करूँ?" | [Advanced Config](advanced-config.md) |

---

## सभी दस्तावेज़

| फ़ाइल | विषय |
|---|---|
| [architecture.md](architecture.md) | 4-pass पाइपलाइन + scanner + validators शुरू से अंत तक |
| [diagrams.md](diagrams.md) | उसी प्रवाह के Mermaid diagrams |
| [stacks.md](stacks.md) | समर्थित 12 stacks विस्तार से |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | 5 post-generation validators |
| [commands.md](commands.md) | हर CLI command, हर flag, exit codes |
| [manual-installation.md](manual-installation.md) | `npx` के बिना install (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` overrides |
| [safety.md](safety.md) | re-init पर क्या सुरक्षित रहता है |
| [comparison.md](comparison.md) | समान tools के साथ scope तुलना |
| [troubleshooting.md](troubleshooting.md) | त्रुटियाँ और रिकवरी |

---

## इस फ़ोल्डर को कैसे पढ़ें

प्रत्येक दस्तावेज़ **स्वतंत्र रूप से पठनीय** होने के लिए लिखा गया है — आपको ऊपर के नए-उपयोगकर्ता पथ का अनुसरण करने के अलावा क्रम में पढ़ने की आवश्यकता नहीं है। Cross-link केवल वहीं मौजूद हैं जहाँ एक अवधारणा दूसरे पर निर्भर करती है।

इन docs में उपयोग की गई परिपाटियाँ:

- **कोड ब्लॉक** दिखाते हैं कि आप वास्तव में क्या टाइप करेंगे या फ़ाइलों में वास्तव में क्या है। जब तक स्पष्ट रूप से उल्लेख न हो, उन्हें संक्षिप्त नहीं किया जाता।
- **`✅` / `❌`** का अर्थ tables में "हाँ" / "नहीं" है, इससे अधिक सूक्ष्म कुछ नहीं।
- **`claudeos-core/standard/00.core/01.project-overview.md`** जैसी फ़ाइल paths प्रोजेक्ट रूट से absolute हैं।
- **`(v2.4.0)`** जैसे संस्करण मार्कर किसी सुविधा पर "इस संस्करण में जोड़ा गया" का अर्थ रखते हैं — पुराने संस्करणों में वह नहीं है।

यदि कोई दस्तावेज़ कहता है कि कुछ सत्य है और आपको प्रमाण मिलता है कि नहीं है, तो वह दस्तावेज़ का बग है — कृपया [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues)।

---

## कुछ अस्पष्ट मिला?

किसी भी doc पर PRs का स्वागत है। ये docs निम्नलिखित परिपाटियों का पालन करते हैं:

- **जटिल शब्दावली के बजाय सरल भाषा।** अधिकांश पाठक पहली बार ClaudeOS-Core का उपयोग कर रहे हैं।
- **अमूर्तता के बजाय उदाहरण।** वास्तविक कोड, फ़ाइल paths, command आउटपुट दिखाएँ।
- **सीमाओं के बारे में ईमानदार।** यदि कुछ काम नहीं करता या उसकी कोई सीमाएँ हैं, तो यह बताएँ।
- **स्रोत के विरुद्ध सत्यापित।** ऐसी सुविधाओं का दस्तावेज़ीकरण नहीं जो मौजूद नहीं हैं।

योगदान प्रवाह के लिए [CONTRIBUTING.md](../../CONTRIBUTING.md) देखें।
