# Диаграммы

Визуальные референсы архитектуры. Все диаграммы Mermaid и автоматически отрисовываются на GitHub. Если читаете это в не-Mermaid просмотрщике, текстовые объяснения намеренно полны и самодостаточны.

Только текстовую версию см. в [architecture.md](architecture.md).

> Английский оригинал: [docs/diagrams.md](../diagrams.md). Русский перевод синхронизирован с английским.

---

## Как работает `init` (high level)

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

**Зелёный** = код (детерминированный). **Розовый** = Claude (LLM). Эти двое не пересекаются на одной задаче.

---

## Pass 3 split mode

Pass 3 всегда разбивается на стадии и никогда не запускается одним вызовом, независимо от размера проекта. Это удерживает промпт каждой стадии в context window LLM, даже когда `pass2-merged.json` большой:

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

**Ключевая идея.** Pass 3a один раз читает большой input и выдаёт маленький fact sheet. Стадии 3b/3c/3d читают только маленький fact sheet и никогда не перечитывают большой input. Так уходят ошибки «Prompt is too long», которые мучили более ранние не-split-дизайны.

Для проектов с 16+ доменами 3b и 3c дополнительно делятся на батчи по ≤15 доменов. Каждый батч — собственный вызов Claude со свежим context window.

---

## Возобновление после прерывания

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

Розовые блоки = Claude вызывается. Ромбические решения — чистые проверки файловой системы, выполняются до любого вызова LLM.

Валидация маркера — это не просто «существует ли файл?». У каждого маркера есть структурные проверки (например, маркер Pass 4 должен содержать `passNum === 4` и непустой массив `memoryFiles`). Malformed-маркеры от упавших предыдущих запусков отклоняются, и pass перезапускается.

---

## Поток верификации

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

При трёхуровневой severity CI не падает на warning или advisory — только на жёстких провалах (уровень `fail`).

`claude-md-validator` запускается отдельно, потому что его находки **структурные**: если CLAUDE.md malformed, правильный ответ — перезапустить `init`, а не молча предупреждать. Остальные validator запускаются как часть `health`: их находки content-уровневые (пути, записи manifest, пробелы схемы), и их можно просмотреть, не регенерируя всё.

---

## Файловая система после `init`

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

**Розовый** = Claude Code загружает автоматически в каждой сессии, вручную ничего загружать не надо. Всё остальное загружается по требованию или подтягивается ссылками из автозагружаемых файлов.

Префиксы `00`/`10`/`20`/`30`/`40`/`70`/`80` встречаются и в `rules/`, и в `standard/`: одна концептуальная область, разные роли. Rules — это loaded directives, standards — справочные документы. Числовые префиксы дают стабильный порядок сортировки и позволяют Pass 3 orchestrator адресовать группы категорий (например, 60.memory пишет Pass 4, 70.domains пишется per-batch). А что реально триггерит Claude Code на автозагрузку правила, так это glob `paths:` в его YAML frontmatter, а не число категории.

`50.sync` и `60.memory` — **только rules** (соответствующего каталога `standard/` нет). `90.optional` — **только standard** (специфика стека без принуждения).

---

## Взаимодействие memory layer с сессиями Claude Code

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

Memory-файлы загружаются **по требованию**, а не всегда. Это держит контекст Claude худым во время обычного кодинга. Они подтягиваются только когда glob `paths:` правила совпадает с файлом, который Claude в этот момент редактирует.

Подробности по содержимому каждого memory-файла и алгоритму компактации см. в [memory-layer.md](memory-layer.md).
