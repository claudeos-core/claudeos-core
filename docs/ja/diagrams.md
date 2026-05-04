# Diagrams

アーキテクチャの視覚的なリファレンスです。図はすべて Mermaid で、GitHub では自動レンダリングされます。Mermaid 非対応のビューアで読んでいる場合でも、散文の説明だけで意図的に完結するようにしてあります。

文章のみのバージョンは [architecture.md](architecture.md) を参照してください。

> 英語原文: [docs/diagrams.md](../diagrams.md). 日本語訳は英語版に追従して同期されています。

---

## `init` の動作 (高レベル)

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

**緑** = コード (deterministic)、**ピンク** = Claude (LLM)。両者は同じジョブで重なりません。

---

## Pass 3 split mode

Pass 3 は常にステージ分割します。プロジェクト規模に関わらず、単一呼び出しでは走りません。これは `pass2-merged.json` が大きい場合でも各ステージのプロンプトを LLM のコンテキストウィンドウに収めるためです:

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

**重要なポイント:** Pass 3a は大きな入力を一度読んで小さな fact sheet を生成します。3b/3c/3d のステージは小さな fact sheet のみを読み、大きな入力を再読込しません。これにより、以前の非 split 設計を悩ませた「Prompt is too long」エラーを避けられます。

16+ ドメインのプロジェクトでは、3b と 3c をさらに ≤15 ドメインのバッチに細分します。各バッチは新しいコンテキストウィンドウを持つ独自の Claude 呼び出しです。

---

## 中断からの resume

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

ピンクのボックス = Claude が呼ばれます。ひし形の判定は純粋なファイルシステムチェックで、LLM 呼び出しの前に行います。

marker の検証は単に「ファイルが存在するか?」ではなく、それぞれに構造的チェックがあります (例: Pass 4 の marker は `passNum === 4` と非空の `memoryFiles` 配列を含まねばならない)。前回クラッシュした実行からの malformed marker は拒否し、該当 pass を再実行します。

---

## 検証のフロー

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

3 段階 severity により、CI は warning や advisory では失敗せず、ハードな失敗 (`fail` ティア) だけで失敗します。

`claude-md-validator` を別実行する理由は、その検出が **構造的** だからです。CLAUDE.md が malformed なら正解は `init` の再実行で、静かに warn することではありません。他の validator は検出がコンテンツレベル (パス、manifest エントリ、スキーマギャップ) なので `health` の一部として実行します。それらは全部を再生成しなくてもレビュー可能です。

---

## `init` 後のファイルシステム

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

**ピンク** = Claude Code が各セッションで自動ロード (手動ロードしない)。それ以外はオンデマンドでロードされるか、自動ロードされたファイルから参照されます。

`00`/`10`/`20`/`30`/`40`/`70`/`80` の prefix は `rules/` と `standard/` の **両方** に出現します。同じ概念領域で、役割が違います (rules はロードされる指示、standards は参照ドキュメント)。番号 prefix は安定したソート順を与え、Pass 3 オーケストレータがカテゴリグループにアドレスできるようにします (例: 60.memory は Pass 4 で書かれ、70.domains はバッチごとに書かれる)。実際に Claude Code がルールを自動ロードするかを決めるのは、カテゴリ番号ではなく YAML frontmatter の `paths:` glob です。

`50.sync` と `60.memory` は **rules-only** (対応する `standard/` ディレクトリなし)、`90.optional` は **standard-only** (強制力のないスタック固有の追加) です。

---

## Memory layer と Claude Code セッションの相互作用

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

memory ファイルは **オンデマンド** でロードし、常時ロードしません。これにより通常のコーディング中も Claude のコンテキストが軽く保たれます。ロードするのは、ルールの `paths:` glob が Claude の現在編集ファイルに一致したときだけです。

各 memory ファイルの内容とコンパクションアルゴリズムの詳細は [memory-layer.md](memory-layer.md) を参照してください。
