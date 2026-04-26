# Diagrams

Architecture के दृश्य संदर्भ। सभी diagrams Mermaid हैं — वे GitHub पर स्वचालित रूप से render होते हैं। यदि आप इसे non-Mermaid viewer में पढ़ रहे हैं, prose व्याख्याएँ जानबूझकर अपने आप में पूर्ण हैं।

> अंग्रेज़ी मूल: [docs/diagrams.md](../diagrams.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

केवल-शब्द संस्करण के लिए, [architecture.md](architecture.md) देखें।

---

## `init` कैसे काम करता है (उच्च स्तर)

```mermaid
flowchart TD
    A["Your source code"] --> B["Step A: Node.js scanner"]
    B --> C[("project-analysis.json<br/>stack + domains + paths<br/>(deterministic, no LLM)")]
    C --> D["Step B: 4-pass Claude pipeline"]

    D --> P1["Pass 1<br/>per-domain analysis"]
    P1 --> P2["Pass 2<br/>cross-domain merge"]
    P2 --> P3["Pass 3 (split into stages)<br/>generate docs"]
    P3 --> P4["Pass 4<br/>memory layer scaffolding"]

    P4 --> E["Step C: 5 validators"]
    E --> F[("Output:<br/>.claude/rules/ (auto-loaded)<br/>standard/ skills/ guide/<br/>memory/ database/ mcp-guide/<br/>CLAUDE.md")]

    style B fill:#cfe,stroke:#393
    style E fill:#cfe,stroke:#393
    style D fill:#fce,stroke:#933
```

**हरा** = code (deterministic)। **गुलाबी** = Claude (LLM)। दोनों एक ही काम पर overlap नहीं करते।

---

## Pass 3 split mode

Pass 3 हमेशा stages में split होता है — project के आकार की परवाह किए बिना कभी एकल आह्वान के रूप में नहीं चलता। यह प्रत्येक stage के prompt को LLM के context window के भीतर रखता है, यहाँ तक कि जब `pass2-merged.json` बड़ा हो:

```mermaid
flowchart LR
    A["pass2-merged.json<br/>(large input)"] --> B["Pass 3a<br/>extract facts"]
    B --> C["pass3a-facts.md<br/>(compact summary)"]

    C --> D["Pass 3b-core<br/>CLAUDE.md + standard/"]
    C --> E["Pass 3b-N<br/>per-domain rules"]
    C --> F["Pass 3c-core<br/>skills/ orchestrator + guide/"]
    C --> G["Pass 3c-N<br/>per-domain skills"]
    C --> H["Pass 3d-aux<br/>database/ + mcp-guide/"]

    D --> I["CLAUDE.md<br/>standard/<br/>.claude/rules/<br/>(core only)"]
    E --> J[".claude/rules/70.domains/<br/>standard/70.domains/"]
    F --> K["claudeos-core/skills/<br/>claudeos-core/guide/"]
    G --> L["skills/{type}/domains/<br/>per-domain skill notes"]
    H --> M["claudeos-core/database/<br/>claudeos-core/mcp-guide/"]
```

**मुख्य अंतर्दृष्टि:** Pass 3a बड़े input को एक बार पढ़ता है और एक छोटी fact sheet उत्पन्न करता है। Stages 3b/3c/3d केवल छोटी fact sheet पढ़ते हैं, बड़े input को कभी फिर से नहीं पढ़ते। यह "Prompt is too long" errors से बचाता है जो पहले के non-split designs को परेशान करती थीं।

16+ domains वाले projects के लिए, 3b और 3c और batches में sub-divide होते हैं, प्रत्येक ≤15 domains का। प्रत्येक batch एक ताज़ा context window के साथ अपना Claude आह्वान है।

---

## Interruption से Resume

```mermaid
flowchart TD
    A["claudeos-core init<br/>(or rerun after Ctrl-C)"] --> B{"pass1-N.json<br/>marker present<br/>and valid?"}
    B -->|No or malformed| P1["Run Pass 1"]
    B -->|Yes| C{"pass2-merged.json<br/>marker valid?"}
    P1 --> C

    C -->|No| P2["Run Pass 2"]
    C -->|Yes| D{"pass3-complete.json<br/>marker valid?"}
    P2 --> D

    D -->|No or split-partial| P3["Run Pass 3<br/>(resumes from next<br/>unstarted stage)"]
    D -->|Yes| E{"pass4-memory.json<br/>marker valid?"}
    P3 --> E

    E -->|No| P4["Run Pass 4"]
    E -->|Yes| F["✅ Done"]
    P4 --> F

    style P1 fill:#fce
    style P2 fill:#fce
    style P3 fill:#fce
    style P4 fill:#fce
```

गुलाबी boxes = Claude आह्वान होता है। Diamond decisions शुद्ध file-system checks हैं — वे किसी भी LLM call से पहले होते हैं।

Marker validation केवल "क्या फ़ाइल मौजूद है?" नहीं है — प्रत्येक marker में संरचनात्मक checks हैं (उदा., Pass 4 के marker में `passNum === 4` और एक non-empty `memoryFiles` array होनी चाहिए)। Crashed पिछले runs से malformed markers reject किए जाते हैं और pass फिर से चलता है।

---

## Verification flow

```mermaid
flowchart LR
    A["After init completes<br/>(or run on demand)"] --> B["claude-md-validator<br/>(auto-run by init,<br/>or via lint command)"]
    A --> C["health-checker<br/>(orchestrates 4 validators<br/>+ manifest-generator prereq)"]

    C --> D["plan-validator<br/>(legacy, mostly no-op)"]
    C --> E["sync-checker<br/>(skipped if<br/>manifest failed)"]
    C --> F["content-validator<br/>(softFail → advisory)"]
    C --> G["pass-json-validator<br/>(warnOnly → warn)"]

    D --> H{"Severity"}
    E --> H
    F --> H
    G --> H

    H -->|fail| I["❌ exit 1"]
    H -->|warn| J["⚠️ exit 0<br/>+ warnings"]
    H -->|advisory| K["ℹ️ exit 0<br/>+ advisories"]

    style B fill:#cfe,stroke:#393
    style C fill:#cfe,stroke:#393
```

Three-tier severity का अर्थ है CI warnings या advisories पर fail नहीं होता — केवल hard failures पर (`fail` tier)।

`claude-md-validator` अलग से चलता है क्योंकि इसकी findings **संरचनात्मक** हैं — यदि CLAUDE.md malformed है, तो सही उत्तर `init` को फिर से चलाना है, चुपचाप warn करना नहीं। अन्य validators `health` के हिस्से के रूप में चलते हैं क्योंकि उनकी findings content-स्तर हैं (paths, manifest entries, schema gaps) — उन्हें सब कुछ फिर से उत्पन्न किए बिना समीक्षा की जा सकती है।

---

## `init` के बाद File system

```mermaid
flowchart TD
    Root["your-project/"] --> A[".claude/"]
    Root --> B["claudeos-core/"]
    Root --> C["CLAUDE.md"]

    A --> A1["rules/<br/>(auto-loaded by Claude Code)"]
    A1 --> A1a["00.core/<br/>general rules"]
    A1 --> A1b["10.backend/<br/>if backend stack"]
    A1 --> A1c["20.frontend/<br/>if frontend stack"]
    A1 --> A1d["30.security-db/"]
    A1 --> A1e["40.infra/"]
    A1 --> A1f["50.sync/<br/>(rules-only)"]
    A1 --> A1g["60.memory/<br/>(rules-only, Pass 4)"]
    A1 --> A1h["70.domains/{type}/<br/>per-domain rules"]
    A1 --> A1i["80.verification/"]

    B --> B1["standard/<br/>(reference docs)"]
    B --> B2["skills/<br/>(reusable patterns)"]
    B --> B3["guide/<br/>(how-to guides)"]
    B --> B4["memory/<br/>(L4 memory: 4 files)"]
    B --> B5["database/"]
    B --> B6["mcp-guide/"]
    B --> B7["generated/<br/>(internal artifacts<br/>+ pass markers)"]

    style A1 fill:#fce,stroke:#933
    style C fill:#fce,stroke:#933
```

**गुलाबी** = प्रत्येक session पर Claude Code द्वारा auto-loaded (आप उन्हें मैन्युअल रूप से load नहीं करते)। बाक़ी सब कुछ on demand load होता है या auto-loaded फ़ाइलों से referenced।

`00`/`10`/`20`/`30`/`40`/`70`/`80` prefixes `rules/` और `standard/` **दोनों** में दिखाई देते हैं — एक ही वैचारिक क्षेत्र, अलग भूमिका (rules loaded directives हैं, standards reference docs हैं)। संख्यात्मक prefixes एक स्थिर sort order देते हैं और Pass 3 orchestrator को category groups को संबोधित करने देते हैं (उदा., 60.memory Pass 4 द्वारा लिखा जाता है, 70.domains प्रति batch लिखा जाता है)। Claude Code को rule auto-load करने के लिए वास्तव में क्या trigger करता है यह उसके YAML frontmatter में `paths:` glob है, न कि उसकी category number।

`50.sync` और `60.memory` **rules-only** हैं (कोई मेल खाने वाली `standard/` directory नहीं)। `90.optional` **standard-only** है (बिना enforcement के stack-specific extras)।

---

## Memory layer का Claude Code sessions के साथ इंटरैक्शन

```mermaid
flowchart TD
    A["You start a Claude Code session"] --> B{"CLAUDE.md<br/>auto-loaded?"}
    B -->|Yes (always)| C["Section 8 lists<br/>memory/ files"]
    C --> D{"Working file matches<br/>a paths: glob in<br/>60.memory rules?"}
    D -->|Yes| E["Memory rule<br/>auto-loaded"]
    D -->|No| F["Memory not loaded<br/>(saves context)"]

    G["Long session running"] --> H{"Auto-compact<br/>at ~85% context?"}
    H -->|Yes| I["Session Resume Protocol<br/>(prose in CLAUDE.md §8)<br/>tells Claude to re-read<br/>memory/ files"]
    I --> J["Claude continues<br/>with memory restored"]

    style B fill:#fce,stroke:#933
    style D fill:#fce,stroke:#933
    style H fill:#fce,stroke:#933
```

Memory फ़ाइलें **on demand** load होती हैं, हमेशा नहीं। यह सामान्य coding के दौरान Claude के context को कम रखता है। उन्हें केवल तब खींचा जाता है जब rule का `paths:` glob उस फ़ाइल से मेल खाता है जिसे Claude वर्तमान में संपादित कर रहा है।

प्रत्येक memory फ़ाइल में क्या है और compaction algorithm के विवरण के लिए, [memory-layer.md](memory-layer.md) देखें।
