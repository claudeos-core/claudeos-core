# Diagrams

아키텍처의 시각 reference. 모든 다이어그램은 Mermaid — GitHub에서 자동 렌더링됩니다. Mermaid 미지원 viewer로 보고 있다면, 산문 설명만으로 의도적으로 완결되어 있습니다.

text-only 버전은 [architecture.md](architecture.md) 참고.

> 영문 원본: [docs/diagrams.md](../diagrams.md). 다이어그램 라벨은 영문 그대로 유지 (코드 식별자에 가깝기 때문).

---

## `init` 동작 (high level)

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

**초록** = 코드 (deterministic). **분홍** = Claude (LLM). 둘은 같은 작업에서 절대 겹치지 않음.

---

## Pass 3 split mode

Pass 3는 항상 stage로 split됩니다 — 프로젝트 크기와 무관하게, 단일 invocation으로 실행되지 않음. 이는 `pass2-merged.json`이 클 때도 각 stage의 prompt가 LLM의 context window 안에 머무르게 합니다:

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

**핵심 통찰:** Pass 3a는 큰 input을 한 번 읽고 작은 fact sheet를 만듭니다. Stage 3b/3c/3d는 그 작은 fact sheet만 읽고, 큰 merged 파일을 다시 읽지 않습니다. 이는 이전 비-split 설계에서 흔했던 "Prompt is too long" 에러를 방지합니다.

도메인이 16개 이상인 프로젝트에서는 3b와 3c가 ≤15 도메인 batch로 더 분할됩니다. 각 batch는 새 context window를 받는 자체 Claude invocation입니다.

---

## 중단으로부터 resume

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

분홍 박스 = Claude 호출. 다이아몬드 결정은 순수 file-system 검사 — LLM 호출 전에 이뤄짐.

Marker 검증은 단순히 "파일이 존재하나?"가 아닙니다 — 각 marker는 구조 검사를 가집니다 (예: Pass 4의 marker는 `passNum === 4`와 비어있지 않은 `memoryFiles` array를 포함해야 함). 이전 충돌 실행에서 남은 malformed marker는 거부되고 pass가 재실행됩니다.

---

## Verification 흐름

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

3-tier severity는 CI가 warning이나 advisory에 실패하지 않고 hard failure (`fail` tier)에만 실패한다는 뜻입니다.

`claude-md-validator`는 별도로 실행됩니다 — 그 발견이 **구조적**이기 때문입니다. CLAUDE.md가 malformed면 정답은 `init`을 재실행하는 것이지 조용히 warning 내는 게 아닙니다. 다른 validator는 `health` 일부로 실행됩니다 — 그 발견이 content-level (경로, manifest 항목, schema 갭)이라 모든 것을 재생성하지 않고 검토 가능하기 때문.

---

## `init` 후 파일 시스템

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

**분홍** = Claude Code가 매 세션마다 자동 로드 (수동 로드 안 함). 그 외는 demand로 로드되거나 자동 로드 파일에서 참조됩니다.

`00`/`10`/`20`/`30`/`40`/`70`/`80` prefix는 `rules/`와 `standard/` **양쪽에 존재** — 같은 개념 영역이지만 다른 역할 (rules는 로드되는 directive, standard는 reference doc). 숫자 prefix는 안정적인 정렬 순서를 제공하고 Pass 3 orchestrator가 카테고리 그룹을 addressing하게 해줍니다 (예: 60.memory는 Pass 4가 작성, 70.domains는 batch마다 작성). 무엇이 Claude Code가 rule을 자동 로드하게 트리거하는지는 카테고리 번호가 아니라 YAML frontmatter의 `paths:` glob입니다.

`50.sync`와 `60.memory`는 **rules-only** (매치되는 `standard/` 디렉토리 없음). `90.optional`은 **standard-only** (강제력 없는 스택별 추가).

---

## Memory layer의 Claude Code 세션과의 상호작용

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

memory 파일은 **on demand**로 로드되며 항상은 아닙니다. 일반 코딩 중에는 Claude의 context를 가볍게 유지합니다. rule의 `paths:` glob이 Claude가 현재 편집 중인 파일과 매치될 때만 끌어들입니다.

각 memory 파일이 무엇을 포함하는지와 compaction 알고리즘의 자세한 내용은 [memory-layer.md](memory-layer.md) 참고.
