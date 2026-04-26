# Diagrams

Visual references for the architecture. All diagrams are Mermaid — they render automatically on GitHub. If you're reading this in a non-Mermaid viewer, the prose explanations are deliberately complete on their own.

For the words-only version, see [architecture.md](architecture.md).

---

## How `init` works (high level)

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

**Green** = code (deterministic). **Pink** = Claude (LLM). The two never overlap on the same job.

---

## Pass 3 split mode

Pass 3 always splits into stages — never runs as a single invocation, regardless of project size. This keeps each stage's prompt within the LLM's context window even when `pass2-merged.json` is large:

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

**Key insight:** Pass 3a reads the big input once and produces a small fact sheet. Stages 3b/3c/3d only read the small fact sheet, never re-read the big input. This avoids "Prompt is too long" errors that plagued earlier non-split designs.

For projects with 16+ domains, 3b and 3c sub-divide further into batches of ≤15 domains each. Each batch is its own Claude invocation with a fresh context window.

---

## Resume from interruption

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

Pink boxes = Claude is invoked. The diamond decisions are pure file-system checks — they happen before any LLM call.

The marker validation isn't just "does the file exist?" — each marker has structural checks (e.g., Pass 4's marker must contain `passNum === 4` and a non-empty `memoryFiles` array). Malformed markers from crashed previous runs are rejected and the pass re-runs.

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

Three-tier severity means CI doesn't fail on warnings or advisories — only on hard failures (`fail` tier).

`claude-md-validator` runs separately because its findings are **structural** — if CLAUDE.md is malformed, the right answer is to re-run `init`, not to silently warn. The other validators run as part of `health` because their findings are content-level (paths, manifest entries, schema gaps) — those can be reviewed without re-generating everything.

---

## File system after `init`

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

**Pink** = auto-loaded by Claude Code each session (you don't manually load them). Everything else is loaded on demand or referenced from the auto-loaded files.

The `00`/`10`/`20`/`30`/`40`/`70`/`80` prefixes appear in **both** `rules/` and `standard/` — same conceptual area, different role (rules are loaded directives, standards are reference docs). The numeric prefixes give a stable sort order and let the Pass 3 orchestrator address category groups (e.g., 60.memory is written by Pass 4, 70.domains is written per batch). What actually triggers Claude Code to auto-load a rule is the `paths:` glob in its YAML frontmatter, not its category number.

`50.sync` and `60.memory` are **rules-only** (no matching `standard/` directory). `90.optional` is **standard-only** (stack-specific extras with no enforcement).

---

## Memory layer interaction with Claude Code sessions

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

The memory files are loaded **on demand**, not always. This keeps Claude's context lean during normal coding. They're only pulled in when the rule's `paths:` glob matches the file Claude is currently editing.

For details on what each memory file contains and the compaction algorithm, see [memory-layer.md](memory-layer.md).
