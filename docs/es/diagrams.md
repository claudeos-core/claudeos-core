# Diagramas

Referencias visuales para la arquitectura. Todos los diagramas son Mermaid — se renderizan automáticamente en GitHub. Si estás leyendo esto en un visor sin soporte Mermaid, las explicaciones en prosa son intencionalmente completas por sí mismas.

Para la versión solo-palabras, ver [architecture.md](architecture.md).

> Original en inglés: [docs/diagrams.md](../diagrams.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Cómo funciona `init` (alto nivel)

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

**Verde** = código (determinístico). **Rosa** = Claude (LLM). Los dos nunca se solapan en el mismo trabajo.

---

## Pass 3 split mode

Pass 3 siempre se divide en etapas — nunca corre como una invocación única, independientemente del tamaño del proyecto. Esto mantiene el prompt de cada etapa dentro de la ventana de contexto del LLM incluso cuando `pass2-merged.json` es grande:

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

**Insight clave:** Pass 3a lee la entrada grande una vez y produce una pequeña hoja de hechos. Las etapas 3b/3c/3d solo leen la pequeña hoja de hechos, nunca releen la entrada grande. Esto evita los errores "Prompt is too long" que plagaron los diseños no-split anteriores.

Para proyectos con 16+ dominios, 3b y 3c se subdividen en batches de ≤15 dominios cada uno. Cada batch es su propia invocación a Claude con una ventana de contexto fresca.

---

## Resume desde interrupción

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

Los cuadros rosas = Claude se invoca. Las decisiones en diamante son checks puros del filesystem — ocurren antes de cualquier llamada LLM.

La validación del marker no es solo "¿existe el archivo?" — cada marker tiene checks estructurales (p. ej., el marker de Pass 4 debe contener `passNum === 4` y un array `memoryFiles` no vacío). Los markers malformados de ejecuciones previas crasheadas se rechazan y el pase se re-ejecuta.

---

## Flujo de verificación

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

La severidad de tres niveles significa que CI no falla en warnings o advisories — solo en hard failures (tier `fail`).

`claude-md-validator` corre por separado porque sus hallazgos son **estructurales** — si CLAUDE.md está malformado, la respuesta correcta es re-ejecutar `init`, no avisar silenciosamente. Los otros validators corren como parte de `health` porque sus hallazgos son a nivel de contenido (paths, entradas de manifest, brechas de schema) — esos pueden revisarse sin regenerar todo.

---

## Sistema de archivos después de `init`

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

**Rosa** = auto-cargado por Claude Code en cada sesión (no los cargas manualmente). Todo lo demás se carga bajo demanda o se referencia desde los archivos auto-cargados.

Los prefijos `00`/`10`/`20`/`30`/`40`/`70`/`80` aparecen en **ambos** `rules/` y `standard/` — misma área conceptual, rol distinto (las rules son directivas cargadas, los standards son docs de referencia). Los prefijos numéricos dan un orden de sort estable y permiten que el orquestador de Pass 3 direccione grupos de categorías (p. ej., 60.memory lo escribe Pass 4, 70.domains se escribe por batch). Lo que realmente dispara que Claude Code auto-cargue una regla es el glob `paths:` en su YAML frontmatter, no su número de categoría.

`50.sync` y `60.memory` son **solo rules** (sin directorio `standard/` correspondiente). `90.optional` es **solo standard** (extras específicos del stack sin enforcement).

---

## Interacción del memory layer con sesiones de Claude Code

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

Los archivos de memoria se cargan **bajo demanda**, no siempre. Esto mantiene el contexto de Claude ligero durante coding normal. Solo se traen cuando el glob `paths:` de la regla coincide con el archivo que Claude está editando actualmente.

Para detalles sobre lo que contiene cada archivo de memoria y el algoritmo de compactación, ver [memory-layer.md](memory-layer.md).
