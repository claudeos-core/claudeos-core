# Diagrammes

Références visuelles pour l'architecture. Tous les diagrammes sont en Mermaid — ils s'affichent automatiquement sur GitHub. Si vous lisez ceci dans un viewer non-Mermaid, les explications en prose sont délibérément complètes par elles-mêmes.

Pour la version words-only, voir [architecture.md](architecture.md).

> Original anglais : [docs/diagrams.md](../diagrams.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Comment fonctionne `init` (high level)

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

**Vert** = code (déterministe). **Rose** = Claude (LLM). Les deux ne se chevauchent jamais sur le même job.

---

## Pass 3 split mode

Pass 3 se divise toujours en stages — ne s'exécute jamais comme une seule invocation, quelle que soit la taille du projet. Cela garde le prompt de chaque stage dans la context window du LLM même quand `pass2-merged.json` est gros :

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

**Insight clé :** Pass 3a lit le gros input une fois et produit une petite fact sheet. Les stages 3b/3c/3d ne lisent que la petite fact sheet, ne relisent jamais le gros input. Cela évite les erreurs « Prompt is too long » qui plaguaient les designs antérieurs sans split.

Pour les projets à 16+ domaines, 3b et 3c se subdivisent encore en batches de ≤15 domaines chacun. Chaque batch est sa propre invocation Claude avec une context window fraîche.

---

## Resume après interruption

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

Les boîtes roses = Claude est invoqué. Les diamants de décision sont des checks file-system purs — ils se passent avant tout appel LLM.

La validation du marker n'est pas juste « le fichier existe-t-il ? » — chaque marker a des checks structurels (par ex. le marker de Pass 4 doit contenir `passNum === 4` et un array `memoryFiles` non-vide). Les markers mal formés issus de runs antérieurs crashés sont rejetés et la pass se réexécute.

---

## Flux de vérification

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

La sévérité 3-tier signifie que la CI n'échoue pas sur les warnings ou advisories — uniquement sur les hard failures (tier `fail`).

`claude-md-validator` s'exécute séparément parce que ses findings sont **structurels** — si CLAUDE.md est mal formé, la bonne réponse est de réexécuter `init`, pas de prévenir silencieusement. Les autres validators s'exécutent dans le cadre de `health` parce que leurs findings sont au niveau du contenu (paths, entrées manifest, trous de schéma) — ceux-là peuvent être examinés sans tout régénérer.

---

## File system après `init`

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

**Rose** = auto-chargé par Claude Code à chaque session (vous ne les chargez pas manuellement). Tout le reste est chargé à la demande ou référencé depuis les fichiers auto-chargés.

Les préfixes `00`/`10`/`20`/`30`/`40`/`70`/`80` apparaissent dans **les deux** `rules/` et `standard/` — même zone conceptuelle, rôle différent (rules sont des directives chargées, standards sont des docs de référence). Les préfixes numériques donnent un ordre de tri stable et permettent à l'orchestrateur Pass 3 d'adresser des groupes de catégories (par ex. 60.memory est écrit par Pass 4, 70.domains est écrit par batch). Ce qui déclenche réellement Claude Code à auto-charger une rule est le glob `paths:` dans son frontmatter YAML, pas son numéro de catégorie.

`50.sync` et `60.memory` sont **rules-only** (pas de répertoire `standard/` correspondant). `90.optional` est **standard-only** (extras spécifiques au stack sans application).

---

## Interaction du memory layer avec les sessions Claude Code

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

Les fichiers memory sont chargés **à la demande**, pas toujours. Cela garde le contexte de Claude léger pendant le coding normal. Ils ne sont tirés que quand le glob `paths:` de la rule matche le fichier que Claude est en train d'éditer.

Pour les détails sur ce que contient chaque fichier memory et l'algorithme de compaction, voir [memory-layer.md](memory-layer.md).
