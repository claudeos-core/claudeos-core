# CLI コマンド

ClaudeOS-Core が実際にサポートする全コマンド、全フラグ、全 exit code。

このページはリファレンスです。初めての方は [メイン README の Quick Start](../../README.ja.md#quick-start) を先にお読みください。

すべてのコマンドは `npx claudeos-core <command>` で実行します (グローバルインストール済みなら `claudeos-core <command>` — [manual-installation.md](manual-installation.md) を参照)。

> 英語原文: [docs/commands.md](../commands.md). 日本語訳は英語版に追従して同期されています。

---

## グローバルフラグ

これらはすべてのコマンドで動作します:

| フラグ | 効果 |
|---|---|
| `--help` / `-h` | ヘルプを表示。コマンドの後ろに置いた場合 (例: `memory --help`)、サブコマンドが自身のヘルプを処理。 |
| `--version` / `-v` | インストール済みのバージョンを表示。 |
| `--lang <code>` | 出力言語。`en`、`ko`、`ja`、`zh-CN`、`es`、`vi`、`hi`、`ru`、`fr`、`de` のいずれか。デフォルト: `en`。現在は `init` のみが利用。 |
| `--force` / `-f` | resume プロンプトをスキップ; 前回の結果を削除。現在は `init` のみが利用。 |

これが CLI フラグの完全な一覧です。**`--json`、`--strict`、`--quiet`、`--verbose`、`--dry-run` などはありません。** 古いドキュメントでこれらを見たことがあっても、それらは存在しません — `bin/cli.js` がパースするのは上記 4 つのフラグのみです。

---

## クイックリファレンス

| コマンド | 使うとき |
|---|---|
| `init` | プロジェクトでの初回。すべてを生成。 |
| `lint` | `CLAUDE.md` を手動編集した後。構造検証を実行。 |
| `health` | コミット前または CI で。4 つのコンテンツ/パス validator を実行。 |
| `restore` | 保存された plan → ディスクへ。(v2.1.0 以降ほぼ no-op; 後方互換のため残置。) |
| `refresh` | ディスク → 保存された plan へ。(v2.1.0 以降ほぼ no-op; 後方互換のため残置。) |
| `validate` | plan-validator の `--check` モードを実行。(v2.1.0 以降ほぼ no-op。) |
| `memory <sub>` | memory layer のメンテナンス: `compact`、`score`、`propose-rules`。 |

`restore` / `refresh` / `validate` はレガシーの plan ファイルを使わないプロジェクトでは無害なので残置されています。`plan/` がない場合 (v2.1.0+ のデフォルト)、いずれも情報メッセージを出してスキップします。

---

## `init` — ドキュメントセットを生成

```bash
npx claudeos-core init [--lang <code>] [--force]
```

メインコマンド。[4-pass パイプライン](architecture.md) をエンドツーエンドで走らせます:

1. Scanner が `project-analysis.json` を生成。
2. Pass 1 が各ドメイングループを解析。
3. Pass 2 がドメインをプロジェクト全体像にマージ。
4. Pass 3 が CLAUDE.md、rules、standards、skills、guides を生成。
5. Pass 4 が memory layer を scaffold。

**例:**

```bash
# 初回、英語出力
npx claudeos-core init

# 初回、日本語出力
npx claudeos-core init --lang ja

# 一からやり直し
npx claudeos-core init --force
```

### Resume safety

`init` は **resume-safe** です。中断された場合 (ネットワーク瞬断、タイムアウト、Ctrl-C)、次の実行は最後に完了した pass marker から再開します。Marker は `claudeos-core/generated/` にあります:

- `pass1-<group>.json` — ドメイン別 Pass 1 出力
- `pass2-merged.json` — Pass 2 出力
- `pass3-complete.json` — Pass 3 marker (split mode のどの sub-stage が完了したかも追跡)
- `pass4-memory.json` — Pass 4 marker

marker が malformed の場合 (例: 書き込み中にクラッシュして `{"error":"timeout"}` が残った)、validator が拒否して該当 pass を再実行します。

部分的な Pass 3 (split mode がステージ間で中断された場合)、resume メカニズムは marker 本体を検査します — `mode === "split"` で `completedAt` がない場合、Pass 3 が再呼び出しされ、未開始の次ステージから再開します。

### `--force` の動作

`--force` は以下を削除します:
- `claudeos-core/generated/` 配下のすべての `.json` と `.md` ファイル (4 つの pass marker すべてを含む)
- 前回実行が移動の途中でクラッシュした場合の残骸 `claudeos-core/generated/.staged-rules/` ディレクトリ
- `.claude/rules/` 配下のすべて (Pass 3 の「ゼロルール検出」が古いルールで誤検知しないように)

`--force` は以下を **削除しません**:
- `claudeos-core/memory/` ファイル (decision log と failure patterns は保持)
- `claudeos-core/` と `.claude/` の外側のファイル

**`--force` 下ではルールへの手動編集が失われます。** これがトレードオフ — `--force` は「クリーンスレートが欲しい」ときの脱出口です。編集を保持したい場合、`--force` を付けずに再実行してください。

### 対話 vs 非対話

`--lang` なしの場合、`init` は対話的な言語セレクタを表示します (10 オプション、矢印キーまたは番号入力)。非 TTY 環境 (CI、パイプ入力) では readline にフォールバックし、入力がなければ非対話のデフォルトに落ちます。

`--force` なしで既存の pass marker が検出された場合、`init` は Continue / Fresh のプロンプトを表示します。`--force` を渡すとこのプロンプトが完全にスキップされます。

---

## `lint` — `CLAUDE.md` の構造を検証

```bash
npx claudeos-core lint
```

プロジェクトの `CLAUDE.md` に対して `claude-md-validator` を実行します。高速 — LLM 呼び出しなし、構造チェックのみ。

**Exit code:**
- `0` — Pass。
- `1` — Fail。少なくとも 1 つの構造的問題。

**検査内容** (check ID の完全リストは [verification.md](verification.md) を参照):

- セクション数はちょうど 8 でなければならない。
- Section 4 は H3 サブセクションを 3 個または 4 個持たねばならない。
- Section 6 は H3 サブセクションをきっかり 3 個持たねばならない。
- Section 8 は H3 サブセクションをきっかり 2 個 (Common Rules + L4 Memory) 持ち、H4 サブサブセクションをきっかり 2 個 (L4 Memory Files + Memory Workflow) 持たねばならない。
- 各 canonical セクション見出しは英語トークン (例: `Role Definition`、`Memory`) を含まねばならず、`--lang` に関わらず複数リポジトリでの grep が動くように。
- 4 つの memory ファイル各々がきっかり 1 つの markdown table 行に出現し、Section 8 内に閉じている。

validator は **language-invariant** です: `--lang ko`、`--lang ja`、その他のサポート言語で生成された CLAUDE.md でも同じチェックが動きます。

pre-commit フックや CI に適しています。

---

## `health` — 検証スイートを実行

```bash
npx claudeos-core health
```

**4 つの validator** をオーケストレーションします (claude-md-validator は `lint` で個別に実行):

| Order | Validator | Tier | 失敗時の挙動 |
|---|---|---|---|
| 1 | `manifest-generator` (前提) | — | これが失敗すると `sync-checker` がスキップされる。 |
| 2 | `plan-validator` | fail | Exit 1。 |
| 3 | `sync-checker` | fail | Exit 1 (manifest が成功した場合)。 |
| 4 | `content-validator` | advisory | 表示されるがブロックしない。 |
| 5 | `pass-json-validator` | warn | 表示されるがブロックしない。 |

**Exit code:**
- `0` — `fail` ティアの結果なし。warning と advisory は出ている可能性あり。
- `1` — 少なくとも 1 つの `fail` ティアの結果。

3 段階 severity (fail / warn / advisory) は、`content-validator` の検出 (特殊レイアウトで誤検知が起こりがち) が CI パイプラインをデッドロックさせないために追加されました。

各 validator のチェック詳細は [verification.md](verification.md) を参照。

---

## `restore` — 保存された plan をディスクに適用 (legacy)

```bash
npx claudeos-core restore
```

`plan-validator` を `--execute` モードで実行: `claudeos-core/plan/*.md` ファイルからその記述する場所へコンテンツをコピーします。

**v2.1.0 ステータス:** Master plan 生成は削除されました。`claudeos-core/plan/` は `init` で自動作成されなくなりました。`plan/` がなければ、このコマンドは情報メッセージを出してきれいに終了します。

ad-hoc バックアップ/リストア目的で plan ファイルを手動メンテするユーザー向けに残されています。v2.1.0+ プロジェクトで実行しても害はありません。

上書きしたファイルの `.bak` バックアップを作成します。

---

## `refresh` — ディスクを保存 plan に同期 (legacy)

```bash
npx claudeos-core refresh
```

`restore` の逆。`plan-validator` を `--refresh` モードで実行: ディスクファイルの現在状態を読み、`claudeos-core/plan/*.md` を一致するよう更新します。

**v2.1.0 ステータス:** `restore` と同じ — `plan/` がない場合は no-op。

---

## `validate` — Plan ↔ ディスクの diff (legacy)

```bash
npx claudeos-core validate
```

`plan-validator` を `--check` モードで実行: `claudeos-core/plan/*.md` とディスクの差分を報告しますが、何も変更しません。

**v2.1.0 ステータス:** `plan/` がない場合は no-op。多くのユーザーは代わりに `health` を実行すべきで、これは他の validator と一緒に `plan-validator` も呼びます。

---

## `memory <subcommand>` — Memory layer のメンテナンス

```bash
npx claudeos-core memory <subcommand>
```

3 つのサブコマンド。サブコマンドは `init` の Pass 4 で書かれた `claudeos-core/memory/` ファイルを操作します。これらが欠如している場合、各サブコマンドは `not found` をログ出力してきれいにスキップします (best-effort なツールです)。

memory モデルの詳細は [memory-layer.md](memory-layer.md) を参照。

### `memory compact`

```bash
npx claudeos-core memory compact
```

`decision-log.md` と `failure-patterns.md` に対し 4 ステージのコンパクションを適用:

| Stage | トリガ | アクション |
|---|---|---|
| 1 | `lastSeen > 30 日` かつ preserved でない | body を 1 行の "fix" + meta に折りたたむ |
| 2 | 重複した見出し | マージ (frequency を合算、body は最新) |
| 3 | `importance < 3` かつ `lastSeen > 60 日` | 削除 |
| 4 | ファイル > 400 行 | 最も古い非 preserved エントリをトリム |

`importance >= 7`、`lastSeen < 30 日`、または body に具体的な (非 glob) アクティブルールパスを参照しているエントリは自動 preserved。

コンパクション後、`compaction.md` の `## Last Compaction` セクションのみが置換されます — それ以外 (手動メモ) は保持されます。

### `memory score`

```bash
npx claudeos-core memory score
```

`failure-patterns.md` のエントリの importance スコアを再計算:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

挿入前にすべての既存 importance 行を除去 (重複行リグレッションを防止)。新しいスコアがエントリの body に書き戻されます。

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

`failure-patterns.md` を読み、frequency ≥ 3 のエントリを取り出し、上位候補に対して提案ルール内容を Claude にドラフトしてもらいます。

候補ごとの confidence:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance が欠如時はデフォルト 0、欠如時は 6 にキャップ)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = エントリがディスク上に存在する具体的なファイルパスを言及している。)

出力は **`claudeos-core/memory/auto-rule-update.md` に追記** されてレビューに供されます。**自動適用はされません** — どの提案を実際のルールファイルにコピーするかは自分で判断します。

---

## 環境変数

| 変数 | 効果 |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | memory-scaffold の翻訳パスを短絡; `claude -p` 呼び出し前に throw します。CI と翻訳依存テストが本物の Claude CLI なしで動くために使用。厳格な `=== "1"` セマンティクス — 他の値は有効化しません。 |
| `CLAUDEOS_ROOT` | `bin/cli.js` がユーザーのプロジェクトルートに自動設定。内部用 — オーバーライドしない。 |

これが完全な一覧です。`CLAUDE_PATH`、`DEBUG=claudeos:*`、`CLAUDEOS_NO_COLOR` などはありません — 存在しません。

---

## Exit code

| Code | 意味 |
|---|---|
| `0` | 成功。 |
| `1` | 検証失敗 (`fail` ティアの結果) または `InitError` (例: 前提欠如、malformed marker、ファイルロック)。 |
| その他 | 基底 Node プロセスや sub-tool からのバブルアップ — uncaught 例外、書き込みエラーなど。 |

「中断」用の特別な exit code はありません — Ctrl-C はプロセスを終了させるだけ。`init` を再実行すれば resume メカニズムが引き継ぎます。

---

## `npm test` が走らせるもの (コントリビュータ向け)

リポジトリをクローンしてローカルでテストスイートを走らせたい場合:

```bash
npm test
```

これは 33 個のテストファイルにわたって `node tests/*.test.js` を実行します。テストスイートは Node 組み込みの `node:test` ランナー (Jest なし、Mocha なし) と `node:assert/strict` を使います。

単一テストファイル:

```bash
node tests/scan-java.test.js
```

CI は Linux / macOS / Windows × Node 18 / 20 でスイートを走らせます。CI ワークフローは `CLAUDEOS_SKIP_TRANSLATION=1` を設定するので、翻訳依存テストには本物の `claude` CLI が不要です。

---

## 関連項目

- [architecture.md](architecture.md) — `init` が内部で何をするか
- [verification.md](verification.md) — validator が検査する内容
- [memory-layer.md](memory-layer.md) — `memory` サブコマンドが操作する対象
- [troubleshooting.md](troubleshooting.md) — コマンドが失敗したとき
