# Architecture — 4-Pass パイプライン

このドキュメントは `claudeos-core init` が最初から最後までどう動くかを説明します。ツールを使うだけなら [メイン README](../../README.ja.md) で十分です — こちらは _なぜ_ この設計になっているかを理解したい方向けです。

ツールを一度も実行したことがなければ、[まず一度実行してみてください](../../README.ja.md#quick-start)。出力を見た後の方が、以下の概念がはるかに早く飲み込めます。

> 英語原文: [docs/architecture.md](../architecture.md). 日本語訳は英語版に追従して同期されています。

---

## 中核アイデア — 「コードが確定し、Claude が作る」

Claude Code 用ドキュメントを生成する大半のツールは 1 ステップで動きます:

```
あなたの説明  →  Claude  →  CLAUDE.md / rules / standards
```

Claude はあなたのスタック、コンベンション、ドメイン構造を推測しなければなりません。よく当てはしますが、推測は推測です。ClaudeOS-Core はこれを反転させます:

```
あなたのソースコード
       ↓
[Step A: コードが読む]      ← Node.js scanner、deterministic、AI なし
       ↓
project-analysis.json     ← 確定した事実: stack、domains、paths
       ↓
[Step B: Claude が書く]    ← 4-pass の LLM パイプライン、事実によって制約される
       ↓
[Step C: コードが検証]      ← 5 つの validator、自動実行
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**コードは正確であるべき部分を担当します** (スタック、ファイルパス、ドメイン構造)。
**Claude は表現が必要な部分を担当します** (説明、コンベンション、文章)。
両者は重ならず、互いを疑いません。

これが重要な理由: LLM は実際にコードに存在しないパスやフレームワークを発明できません。Pass 3 のプロンプトは scanner からのソースパスの allowlist を明示的に Claude に渡します。Claude がリスト外のパスを引用しようとすれば、後段の `content-validator` がそれを検出します。

---

## Step A — Scanner (deterministic)

Claude が呼ばれる前に、Node.js プロセスがプロジェクトを巡回し `claudeos-core/generated/project-analysis.json` を書き込みます。このファイルが以降すべての単一の真実の源 (single source of truth) です。

### Scanner が読むファイル

scanner はプロジェクトルートの以下のファイルから信号を拾います:

| ファイル | scanner に伝える情報 |
|---|---|
| `package.json` | Node.js プロジェクト; `dependencies` から framework |
| `pom.xml` | Java/Maven プロジェクト |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle プロジェクト |
| `pyproject.toml` / `requirements.txt` | Python プロジェクト; パッケージから framework |
| `angular.json` | Angular プロジェクト |
| `nuxt.config.{ts,js}` | Nuxt プロジェクト |
| `next.config.{ts,js}` | Next.js プロジェクト |
| `vite.config.{ts,js}` | Vite プロジェクト |
| `.env*` ファイル | 実行時設定 (port、host、DB URL — 後述) |

どれにも一致しなければ、`init` は推測ではなく明確なエラーで停止します。

### Scanner が `project-analysis.json` に書き込む内容

- **Stack metadata** — language、framework、ORM、DB、package manager、build tool、logger。
- **Architecture pattern** — Java では 5 パターンのいずれか (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal)。Kotlin では CQRS / BFF / multi-module の検出。フロントエンドでは App Router / Pages Router / FSD レイアウト + `components/*/` パターン (多段フォールバック付き)。
- **Domain list** — ディレクトリツリーを巡回して発見、ドメインごとのファイル数付き。Pass 1 が読む代表ファイルをドメインごとに 1〜2 個選びます。
- **Source path allowlist** — プロジェクト内に存在するソースファイルパスをすべて含む。Pass 3 のプロンプトはこのリストを明示的に含めるので、Claude には推測の余地がありません。
- **Monorepo structure** — Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) を検出。NX は明示的には自動検出されませんが、汎用的な `apps/*/` と `packages/*/` パターンは各スタック scanner が拾います。
- **`.env` snapshot** — port、host、API target、機密変数は redaction 済み。検索順は [stacks.md](stacks.md) を参照。

scanner には **LLM 呼び出しがありません**。同じプロジェクト + 同じコード = 毎回同じ `project-analysis.json` です。

スタック別の詳細 (各 scanner の抽出内容と方法) は [stacks.md](stacks.md) を参照。

---

## Step B — 4-pass の Claude パイプライン

各 pass には特定の役割があります。順番に実行され、Pass N は Pass (N-1) の出力を小さな構造化ファイルとして読みます (それまでの全 pass の出力ではありません)。

### Pass 1 — ドメインごとの深掘り解析

**入力:** `project-analysis.json` + 各ドメインの代表ファイル。

**やること:** 代表ファイルを読み、スタック別に数十のカテゴリにわたるパターンを抽出します (通常 50〜100+ の bullet レベル項目、スタックごとに変動 — Kotlin/Spring の CQRS 対応テンプレートが最も濃く、軽量な Node.js テンプレートが最もコンパクト)。例: 「このコントローラは `@RestController` か `@Controller` を使っているか? どんなレスポンスラッパーが使われているか? どのロギングライブラリか?」

**出力:** `pass1-<group-N>.json` — ドメイングループごとに 1 ファイル。

大規模プロジェクトでは Pass 1 は複数回走ります — ドメイングループあたり 1 回。グルーピングルールは **1 グループあたり最大 4 ドメイン・40 ファイル** で、`plan-installer/domain-grouper.js` が自動適用します。12 ドメインのプロジェクトなら Pass 1 は 3 回走ります。

このように分割するのは Claude のコンテキストウィンドウが有限だからです。12 ドメイン分のソースを 1 つのプロンプトに詰め込もうとすればコンテキストが溢れるか、LLM が斜め読みする羽目になります。分割によって各 pass の焦点が保たれます。

### Pass 2 — クロスドメインのマージ

**入力:** すべての `pass1-*.json` ファイル。

**やること:** これらをプロジェクト全体の 1 枚の絵にマージします。2 つのドメインが食い違ったとき (例: 一方は response wrapper を `success()`、もう一方は `ok()` だと言う)、Pass 2 は支配的なコンベンションを採用し、不一致を記録します。

**出力:** `pass2-merged.json` — 通常 100〜400 KB。

### Pass 3 — ドキュメント生成 (split mode)

**入力:** `pass2-merged.json`。

**やること:** 実際のドキュメントを書きます。これは重い pass で、CLAUDE.md、`.claude/rules/`、`claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/`、`claudeos-core/database/`、`claudeos-core/mcp-guide/` にまたがって ~40〜50 個の markdown ファイルを生成します。

**出力:** ユーザー向けの全ファイル。[メイン README](../../README.ja.md#quick-start) の構造に整理されます。

各ステージの出力を Claude のコンテキストウィンドウに収めるため (Pass 2 のマージ済み入力は大きく、生成出力はさらに大きいため)、Pass 3 は **常にステージ分割します** — 小規模プロジェクトであっても無条件に分割が適用され、ドメインごとのバッチが少なくなるだけです:

| Stage | 書き込む内容 |
|---|---|
| **3a** | `pass2-merged.json` から抽出した小さな「事実テーブル」 (`pass3a-facts.md`)。後段ステージが大きなマージ済みファイルを再読込しなくてよいよう圧縮入力として機能します。 |
| **3b-core** | `CLAUDE.md` (Claude Code が最初に読むインデックス) + `claudeos-core/standard/` の主要部分。 |
| **3b-N** | ドメインごとの rule と standard ファイル (≤15 ドメインのグループごとに 1 ステージ)。 |
| **3c-core** | `claudeos-core/skills/` の orchestrator + `claudeos-core/guide/`。 |
| **3c-N** | ドメインごとの skill ファイル。 |
| **3d-aux** | `claudeos-core/database/` と `claudeos-core/mcp-guide/` 配下の補助コンテンツ。 |

非常に大規模なプロジェクト (≥16 ドメイン) では、3b と 3c はさらにバッチに細分されます。各バッチには新規のコンテキストウィンドウが与えられます。

すべてのステージが成功すると `pass3-complete.json` が marker として書かれます。`init` が途中で中断された場合、次の実行は marker を読み、未開始の次ステージから再開します — 完了済みステージは再実行されません。

### Pass 4 — Memory layer scaffolding

**入力:** `project-analysis.json`、`pass2-merged.json`、`pass3a-facts.md`。

**やること:** L4 memory layer + 汎用 scaffold rules を生成します。scaffold の書き込みはすべて **skip-if-exists** なので、Pass 4 を再実行しても何も上書きされません。

- `claudeos-core/memory/` — 4 つの markdown ファイル (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 つのルールファイル (`01.decision-log.md`、`02.failure-patterns.md`、`03.compaction.md`、`04.auto-rule-update.md`) で、Claude Code が関連エリアを編集している時に対応する memory ファイルを自動ロードします
- `.claude/rules/00.core/51.doc-writing-rules.md` と `52.ai-work-rules.md` — 汎用ルール (Pass 3 は `00.standard-reference.md` のようなプロジェクト固有 `00.core` ルールを生成し、Pass 4 はこの 2 つの予約スロットファイルが存在しなければ追加します)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — 追加ルール作成のメタガイド。番号 prefix は `Math.max(existing-numbers) + 1` で自動割り当てされるので、Pass 3 が既に書いた内容に応じて通常は `04` か `05` になります。

**出力:** Memory ファイル + `pass4-memory.json` marker。

重要: **Pass 4 は `CLAUDE.md` を変更しません。** Pass 3 が既に Section 8 (memory ファイルへの参照を含む) を書いています。Pass 4 が再び CLAUDE.md に書き込むと Section 8 の内容が再宣言され、validator エラーが発生します。これはプロンプトで強制され、`tests/pass4-claude-md-untouched.test.js` で検証されています。

各 memory ファイルが何をするか、そしてライフサイクルの詳細は [memory-layer.md](memory-layer.md) を参照。

---

## Step C — 検証 (deterministic、Claude の後)

Claude が完了した後、Node.js コードが 5 つの validator を通して出力を検証します。**LLM を呼び出すものはありません** — すべて deterministic です。

| Validator | 検査内容 |
|---|---|
| `claude-md-validator` | `CLAUDE.md` の構造的検査 (トップレベルセクション数、各セクションの H3/H4 数、memory ファイルの table 行の一意性とスコープ、T1 canonical heading トークン)。Language-invariant — 10 言語すべてで同じ検査が通ります。 |
| `content-validator` | 10 のコンテンツレベル検査: 必須ファイルの存在、standards/skills で引用されたパスが実在すること、MANIFEST の整合性。 |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 の JSON 出力が well-formed で期待されるキーを含むか。 |
| `plan-validator` | (レガシー) 保存された plan ファイルとディスクを比較。Master plan 生成は v2.1.0 で削除されたため、現在はほぼ no-op — 後方互換のため残されています。 |
| `sync-checker` | 追跡ディレクトリ配下のディスクファイルが `sync-map.json` の登録と一致するか (orphaned vs. unregistered)。 |

これらには **3 段階の severity** があります:

- **fail** — 完了をブロック、CI で非ゼロ終了。構造的に何かが壊れている。
- **warn** — 出力に表示されるがブロックしない。調査の価値あり。
- **advisory** — あとで確認。特殊なプロジェクト構造ではしばしば誤検知 (例: gitignored なファイルが「missing」と flag される)。

各 validator のチェック一覧は [verification.md](verification.md) を参照。

validator のオーケストレーションは 2 経路あります:

1. **`claudeos-core lint`** — `claude-md-validator` のみを実行。高速、構造のみ。CLAUDE.md を手動編集した後に使用。
2. **`claudeos-core health`** — それ以外の 4 つの validator を実行 (claude-md-validator は意図的に分離 — CLAUDE.md の構造的 drift は soft warning ではなく re-init の合図のため)。CI で推奨。

---

## このアーキテクチャが重要な理由

### 事実注入プロンプトが幻覚を防ぐ

Pass 3 のプロンプトは大まかに以下のような形です (簡略化):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude にはパスを発明する余地がありません。制約は **肯定形** (allowlist) であり、否定形 (「でっち上げないで」) ではありません — LLM は抽象的な否定の制約より、具体的で肯定的な制約により素直に従うため、この差は重要です。

それでも Claude が架空のパスを書いた場合、最後の `content-validator [10/10]` が `STALE_PATH` として flag します。docs を出荷する前にユーザーに警告が表示されます。

### Marker による resume-safe な設計

各 pass は完了時に marker ファイル (`pass1-<N>.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`) を書きます。`init` が中断された場合 (ネットワーク瞬断、タイムアウト、Ctrl-C)、次回実行は marker を読んで前回終了地点から再開します。作業は失われません。

Pass 3 の marker は **どの sub-stage が完了したか** も追跡するので、部分的な Pass 3 (例: 3b は完了したが 3c が途中でクラッシュ) は次のステージから再開し、3a からはやり直しません。

### Idempotent な再実行

すでにルールがあるプロジェクトで `init` を再実行しても、手動編集が静かに上書きされることは **ありません**。

仕組み: Claude Code のパーミッションシステムは `--dangerously-skip-permissions` 付きでも `.claude/` へのサブプロセス書き込みをブロックします。そのため Pass 3/4 はルールファイルを `claudeos-core/generated/.staged-rules/` に書くよう指示されます。各 pass の終了後、Node.js orchestrator (Claude Code のパーミッションポリシーに縛られない) がステージングされたファイルを `.claude/rules/` へ移動します。

実用的には: **新規プロジェクトでは再実行で全部新規作成。手動編集済みのプロジェクトでは `--force` 付き再実行で完全再生成 (編集は失われます — それが `--force` の意味です)。`--force` なしでは resume メカニズムが動き、未完了の pass のみが実行されます。**

完全な保持ポリシーは [safety.md](safety.md) を参照。

### Language-invariant な検証

validator は翻訳されたヘディング文を一致させません。**構造的な形** (見出しレベル、数、順序) のみ一致させます。これにより、同じ `claude-md-validator` が 10 言語のいずれで生成された CLAUDE.md でもバイト一致の判定を下します。言語別辞書なし、新言語追加時のメンテナンス負担なし。

---

## パフォーマンス — 期待値

具体的なタイミングは以下に大きく依存します:
- プロジェクト規模 (ソースファイル数、ドメイン数)
- Anthropic API へのネットワーク遅延
- Claude Code 設定で選択されている Claude モデル

おおよその目安:

| Step | 小規模プロジェクト (<200 files) | 中規模プロジェクト (~1000 files) |
|---|---|---|
| Step A (scanner) | 5 秒未満 | 10〜30 秒 |
| Step B (Claude 4 pass) | 数分 | 10〜30 分 |
| Step C (validators) | 5 秒未満 | 10〜20 秒 |

大規模プロジェクトでは Pass 1 が壁時計を支配します — ドメイングループあたり 1 回走るためです。24 ドメインのプロジェクト = 6 回の Pass-1 呼び出し (24 / 4 ドメイン/グループ)。

正確な数値が欲しければ、自分のプロジェクトで 1 回実行してみてください — それだけが正直な答えです。

---

## 各ステップのコードがある場所

| Step | ファイル |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| スタック別 scanner | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt assembly | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass テンプレート | `pass-prompts/templates/<stack>/pass{1,2,3}.md` (スタック別); `pass-prompts/templates/common/pass4.md` は全スタック共通 |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`、`content-validator/`、`pass-json-validator/`、`plan-validator/`、`sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## さらに読む

- [stacks.md](stacks.md) — スタックごとに各 scanner が抽出する内容
- [memory-layer.md](memory-layer.md) — Pass 4 の詳細
- [verification.md](verification.md) — 5 つの validator すべて
- [diagrams.md](diagrams.md) — 同じアーキテクチャの Mermaid 図版
- [comparison.md](comparison.md) — 他の Claude Code ツールとの違い
