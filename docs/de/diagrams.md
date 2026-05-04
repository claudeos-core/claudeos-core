# Diagrams

Visuelle Referenzen zur Architektur. Alle Diagramme sind in Mermaid und werden auf GitHub automatisch gerendert. Wer das in einem Nicht-Mermaid-Viewer liest: die Prosa-Erklärungen sind absichtlich eigenständig vollständig.

Für die Nur-Text-Variante siehe [architecture.md](architecture.md).

> Englisches Original: [docs/diagrams.md](../diagrams.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Wie `init` funktioniert (auf hoher Ebene)

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

**Grün** = Code (deterministisch). **Pink** = Claude (LLM). Die beiden überschneiden sich nie bei derselben Aufgabe.

---

## Pass-3-Split-Modus

Pass 3 läuft unabhängig von der Projektgröße immer in Stages, niemals als einzelne Invocation. So bleibt der Prompt jeder Stage im LLM-Kontextfenster, selbst wenn `pass2-merged.json` groß ist:

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

**Kerngedanke:** Pass 3a liest die große Eingabe einmal und produziert eine kleine Faktentabelle. Stages 3b/3c/3d lesen nur diese kleine Faktentabelle, nie erneut die große Eingabe. Das verhindert „Prompt is too long"-Fehler, die frühere Nicht-Split-Designs ständig plagten.

Bei Projekten mit 16+ Domains werden 3b und 3c weiter in Batches von ≤15 Domains zerlegt. Jeder Batch ist eine eigene Claude-Invocation mit frischem Kontextfenster.

---

## Wiederaufnahme nach Unterbrechung

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

Pinke Boxen = Claude wird aufgerufen. Die Rauten-Entscheidungen sind reine Dateisystem-Prüfungen, sie passieren vor jedem LLM-Aufruf.

Die Marker-Validierung fragt nicht nur „Existiert die Datei?". Jeder Marker hat strukturelle Prüfungen, etwa muss der Pass-4-Marker `passNum === 4` und ein nicht-leeres `memoryFiles`-Array enthalten. Kaputte Marker aus abgestürzten vorherigen Läufen werden abgelehnt und der Pass läuft erneut.

---

## Verifikationsfluss

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

Die drei Schweregrade bedeuten: CI scheitert nicht an Warnungen oder Hinweisen, nur an harten Fehlern (`fail`-Stufe).

`claude-md-validator` läuft separat, weil seine Befunde **strukturell** sind. Ist CLAUDE.md fehlerhaft, lautet die richtige Antwort: `init` neu ausführen, nicht still warnen. Die anderen Validatoren laufen als Teil von `health`, denn ihre Befunde sind inhaltlich (Pfade, Manifest-Einträge, Schema-Lücken). Die lassen sich prüfen, ohne alles neu zu generieren.

---

## Dateisystem nach `init`

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

**Pink** = Claude Code lädt diese Dateien in jeder Session automatisch (du lädst sie nicht von Hand). Alles andere wird auf Anforderung geladen oder von den automatisch geladenen Dateien referenziert.

Die Präfixe `00`/`10`/`20`/`30`/`40`/`70`/`80` erscheinen **sowohl** in `rules/` als auch `standard/`: derselbe konzeptionelle Bereich, andere Rolle. Rules sind geladene Direktiven, Standards Referenzdokumente. Die numerischen Präfixe sorgen für stabile Sortierung und erlauben es dem Pass-3-Orchestrator, Kategorie-Gruppen gezielt anzusprechen (etwa schreibt Pass 4 nach 60.memory, 70.domains läuft pro Batch). Ob Claude Code eine Regel automatisch lädt, entscheidet aber der `paths:`-Glob in ihrem YAML-Frontmatter, nicht die Kategorienummer.

`50.sync` und `60.memory` sind **rules-only** (kein dazugehöriges `standard/`-Verzeichnis). `90.optional` ist **standard-only** (stackspezifische Ergänzungen ohne Durchsetzung).

---

## Memory-Schicht-Interaktion mit Claude-Code-Sessions

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

Die Memory-Dateien laden **bei Bedarf**, nicht immer. Das hält Claudes Kontext beim normalen Coden schlank. Sie kommen nur ins Spiel, wenn der `paths:`-Glob der Regel die aktuell von Claude bearbeitete Datei matcht.

Details zu jeder Memory-Datei und zur Funktionsweise des Compaction-Algorithmus stehen in [memory-layer.md](memory-layer.md).
