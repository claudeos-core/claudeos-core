# Troubleshooting

よくあるエラーと解決方法。問題がここにない場合、再現手順を添えて [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

> 英語原文: [docs/troubleshooting.md](../troubleshooting.md). 日本語訳は英語版に追従して同期されています。

---

## インストールの問題

### 「Command not found: claudeos-core」

グローバルインストールしていないか、npm のグローバル bin が PATH にありません。

**Option A — `npx` を使う (推奨、インストール不要):**
```bash
npx claudeos-core init
```

**Option B — グローバルインストール:**
```bash
npm install -g claudeos-core
claudeos-core init
```

npm 経由でインストール済みなのに「command not found」が出るなら、PATH を確認:
```bash
npm config get prefix
# このプレフィクス下の bin/ ディレクトリが PATH に含まれているか確認
```

### 「Cannot find module 'glob'」など

ClaudeOS-Core をプロジェクトルート以外から実行しています。以下のいずれか:

1. プロジェクトに `cd` してから実行。
2. `npx claudeos-core init` を使う (どのディレクトリからでも動きます)。

### 「Node.js version not supported」

ClaudeOS-Core は Node.js 18+ を要求します。バージョンを確認:

```bash
node --version
```

[nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm)、または OS のパッケージマネージャでアップグレード。

---

## 事前チェック

### 「Claude Code not found」

ClaudeOS-Core はローカルの Claude Code インストールを使います。先にインストール:

- [公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code)
- 確認: `claude --version`

`claude` がインストール済みでも PATH にない場合、シェルの PATH を直してください — オーバーライド env 変数はありません。

### 「Could not detect stack」

scanner がプロジェクトのフレームワークを識別できませんでした。原因:

- プロジェクトルートに `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` がない。
- スタックが [サポート対象 12 スタック](stacks.md) にない。
- 自動検出ルールに合致しないカスタムレイアウト。

**Fix:** プロジェクトルートに認識されるファイルがあるか確認。スタックは対応しているがレイアウトが特殊なら、`.claudeos-scan.json` の override について [advanced-config.md](advanced-config.md) を参照。

### 「Authentication test failed」

`init` は Claude Code が認証されているか確認するために `claude -p "echo ok"` を素早く実行します。これが失敗した場合:

```bash
claude --version           # バージョンが出るはず
claude -p "say hi"         # 応答が出るはず
```

`-p` が認証エラーを返したら Claude Code の認証フローに従ってください。ClaudeOS-Core はあなたに代わって Claude の認証を直せません。

---

## init のランタイム問題

### init がハングしたり時間がかかる

大規模プロジェクトでの Pass 1 は時間がかかります。診断:

1. **Claude Code は動いていますか?** 別のターミナルで `claude --version` を実行。
2. **ネットワークは大丈夫ですか?** 各 pass は Claude Code を呼び、それが Anthropic API を呼びます。
3. **プロジェクトが非常に大きいですか?** ドメイングループの分割が自動適用されるので (4 ドメイン / 40 ファイル/グループ)、24 ドメインのプロジェクトは Pass 1 を 6 回走らせます。

長く出力なし (進捗ティッカが進まない) で詰まっているようなら、kill (Ctrl-C) して resume:

```bash
npx claudeos-core init   # 最後に完了した pass marker から再開
```

resume メカニズムは未完了 pass のみを再実行します。

### Claude からの「Prompt is too long」エラー

これは Pass 3 がコンテキストウィンドウを使い切ったことを意味します。ツールが既に適用している緩和策:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — 自動。
- **ドメイングループ分割** — ドメイン > 4 またはファイル > 40 / グループ で自動適用。
- **バッチ細分** — ≥16 ドメインで 3b/3c が ≤15 ドメインのバッチに細分。

それでもコンテキスト上限に当たるならプロジェクトが例外的に大きいです。現行の選択肢:

1. プロジェクトを別ディレクトリに分けて、それぞれで `init` を実行。
2. `.claudeos-scan.json` で積極的な `frontendScan.platformKeywords` の override を追加し、不要なサブアプリをスキップ。
3. [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) — あなたのケース用に新しい override が必要かもしれません。

既に自動である以上に「より積極的な分割を強制する」フラグはありません。

### init が途中で失敗

ツールは **resume-safe** です。再実行するだけ:

```bash
npx claudeos-core init
```

最後に完了した pass marker から再開。作業は失われません。

クリーンスレートが欲しければ (すべての marker を削除して全部再生成)、`--force` を使用:

```bash
npx claudeos-core init --force
```

注意: `--force` は `.claude/rules/` への手動編集を削除します。詳しくは [safety.md](safety.md) を参照。

### Windows: 「EBUSY」やファイルロックエラー

Windows のファイルロックは Unix より厳格です。原因:

- 書き込み中にアンチウイルスがファイルをスキャンしている。
- IDE が排他ロックでファイルを開いている。
- 前回の `init` がクラッシュして古いハンドルが残っている。

修正 (順に試す):

1. IDE を閉じてリトライ。
2. プロジェクトフォルダのアンチウイルスのリアルタイムスキャンを無効化 (またはプロジェクトパスをホワイトリスト)。
3. Windows を再起動 (古いハンドルをクリア)。
4. 続くなら WSL2 から実行。

`lib/staged-rules.js` の移動ロジックは `renameSync` から `copyFileSync + unlinkSync` にフォールバックして、ほとんどのアンチウイルス干渉を自動処理します。それでもロックエラーになる場合、ステージングされたファイルは検査用に `claudeos-core/generated/.staged-rules/` に残っています — `init` を再実行して移動を再試行してください。

### 跨ボリュームの rename 失敗 (Linux/macOS)

`init` はマウントポイントをまたいでアトミックに rename する必要があるかもしれません (例: `/tmp` から別ディスクのプロジェクトへ)。ツールは copy-then-delete に自動フォールバック — 操作不要です。

持続的な移動失敗が見える場合、`claudeos-core/generated/.staged-rules/` と `.claude/rules/` の両方に書き込みアクセスがあるか確認してください。

---

## 検証の問題

### 「STALE_PATH: file does not exist」

standards/skills/guides で言及されたパスが実ファイルに解決されません。原因:

- Pass 3 がパスを幻覚した (例: 親ディレクトリ + TypeScript 定数名から `featureRoutePath.ts` を発明)。
- ファイルを削除したが docs がまだ参照している。
- ファイルが gitignored だが scanner の allowlist にあった。

**Fix:**

```bash
npx claudeos-core init --force
```

これにより Pass 3 / 4 が新しい allowlist で再生成されます。

意図的に gitignored で scanner に無視させたい場合、`.claudeos-scan.json` の実サポート内容について [advanced-config.md](advanced-config.md) を参照 (サポートされるフィールドセットは小さいです)。

`--force` で直らない場合 (まれな LLM seed では再実行で同じ幻覚が再発しうる)、問題ファイルを手で編集して悪いパスを除去。validator は **advisory** ティアで動くので CI をブロックしません — 出荷後に直しても OK。

### 「MANIFEST_DRIFT: registered skill not in CLAUDE.md」

`claudeos-core/skills/00.shared/MANIFEST.md` に登録された skill は CLAUDE.md のどこかで言及されているべきです。validator には **orchestrator/sub-skill 例外** があり、orchestrator が言及されていれば sub-skill はカバー済みと見なされます。

**Fix:** sub-skill の orchestrator が本当に CLAUDE.md で言及されていなければ、`init --force` を実行して再生成。orchestrator が言及されているのに validator が flag するなら、それは validator のバグです — ファイルパスを添えて [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

### 「Section 8 has wrong number of H4 sub-sections」

`claude-md-validator` は Section 8 の下にきっかり 2 個の `####` 見出し (L4 Memory Files / Memory Workflow) を要求します。

考えられる原因:

- CLAUDE.md を手動編集して Section 8 の構造を壊した。
- v2.3.0 以前の Pass 4 が走り、Section 9 を追記した。
- v2.2.0 以前のバージョンからアップグレード中 (8-section scaffold がまだ強制されていない)。

**Fix:**

```bash
npx claudeos-core init --force
```

これで CLAUDE.md がきれいに再生成。memory ファイルは `--force` 越しに保持されます (生成ファイルのみ上書き)。

### 「T1: section heading missing English canonical token」

各 `## N.` セクション見出しは英語の canonical トークンを含まねばなりません (例: `## 1. Role Definition` または `## 1. 役割定義 (Role Definition)`)。これは `--lang` に関わらず複数リポジトリでの grep を維持するためです。

**Fix:** 見出しを編集して英語トークンをかっこ書きで含めるか、`init --force` で再生成 (v2.3.0+ scaffold がこの規約を自動的に強制します)。

---

## Memory layer の問題

### 「Memory file growing too large」

コンパクションを実行:

```bash
npx claudeos-core memory compact
```

これは 4 ステージのコンパクションアルゴリズムを適用します。各ステージの動作は [memory-layer.md](memory-layer.md) を参照。

### 「propose-rules が同意できないルールを提案する」

出力はレビュー用のドラフトであり、自動適用されません。望まないものを拒否するだけ:

- `claudeos-core/memory/auto-rule-update.md` を直接編集して拒否したい提案を削除。
- もしくは適用ステップを完全にスキップ — あなたが提案コンテンツを手動でルールファイルにコピーしない限り、`.claude/rules/` は変更されません。

### `memory <subcommand>` が「not found」と言う

memory ファイルがありません。これらは `init` の Pass 4 で作られます。削除されている場合:

```bash
npx claudeos-core init --force
```

または、すべてを再実行せず memory ファイルだけ再作成したい場合、ツールには単一 pass を再生する組み込みコマンドはありません。`--force` がその経路です。

---

## CI の問題

### ローカルではテストが通るのに CI で失敗

最も多い理由:

1. **CI に `claude` がインストールされていない。** 翻訳依存テストは `CLAUDEOS_SKIP_TRANSLATION=1` で抜けます。公式 CI ワークフローはこの env 変数を設定します。fork 側で設定されていなければ設定してください。

2. **パス正規化 (Windows)。** コードベースは多くの場所で Windows のバックスラッシュを forward slash に正規化しますが、テストは微妙な差で失敗しうる。公式 CI は Windows + Linux + macOS で動くのでほとんどの問題は捕まります — Windows 固有の失敗を見たら、本物のバグかもしれません。

3. **Node バージョン。** テストは Node 18 + 20 で実行。Node 16 や 22 を使っているなら非互換に当たることがあります — CI parity のため 18 か 20 にピン留めしてください。

### `health` が CI で 0 終了するが非ゼロを期待していた

`health` は **fail** ティアの結果でのみ非ゼロ終了します。**warn** と **advisory** は表示されますがブロックしません。

advisory で fail させたい場合 (例: `STALE_PATH` に厳しくしたい)、組み込みフラグはありません — 出力を grep して exit する必要があります:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## ヘルプを得るには

上記のいずれにも当てはまらない場合:

1. **正確なエラーメッセージをキャプチャ。** ClaudeOS-Core のエラーにはファイルパスと識別子が含まれます — 再現に役立ちます。
2. **Issue tracker をチェック:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — あなたの問題が既に報告されているかもしれません。
3. **新しい issue を作成** — OS、Node バージョン、Claude Code バージョン (`claude --version`)、プロジェクトスタック、エラー出力を含める。可能なら `claudeos-core/generated/project-analysis.json` も添付 (機密変数は自動 redaction 済み)。

セキュリティ問題は [SECURITY.md](../../SECURITY.md) を参照 — 脆弱性についてパブリック issue を作らないでください。

---

## 関連項目

- [safety.md](safety.md) — `--force` の動作と保持されるもの
- [verification.md](verification.md) — validator 検出の意味
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` の override
