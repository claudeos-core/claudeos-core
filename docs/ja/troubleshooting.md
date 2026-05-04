# Troubleshooting

よくあるエラーと解決方法をまとめました。ここに問題が載っていない場合は、再現手順を添えて [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

> 英語原文: [docs/troubleshooting.md](../troubleshooting.md). 日本語訳は英語版に追従して同期されています。

---

## インストールの問題

### 「Command not found: claudeos-core」

グローバルインストールしていないか、npm のグローバル bin が PATH に通っていません。

**Option A: `npx` を使う (推奨、インストール不要)**
```bash
npx claudeos-core init
```

**Option B: グローバルインストール**
```bash
npm install -g claudeos-core
claudeos-core init
```

npm でインストール済みなのに「command not found」が出るなら PATH を確認します:
```bash
npm config get prefix
# このプレフィクス下の bin/ ディレクトリが PATH に入っているか確認
```

### 「Cannot find module 'glob'」など

ClaudeOS-Core をプロジェクトルート以外から実行しています。次のいずれかで対処します:

1. プロジェクトに `cd` してから実行する。
2. `npx claudeos-core init` を使う (どのディレクトリからでも動く)。

### 「Node.js version not supported」

ClaudeOS-Core は Node.js 18+ が必要です。バージョンを確認します:

```bash
node --version
```

[nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm)、または OS のパッケージマネージャでアップグレードしてください。

---

## 事前チェック

### 「Claude Code not found」

ClaudeOS-Core はローカルの Claude Code インストールを使います。先にインストールしてください:

- [公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code)
- 確認: `claude --version`

`claude` がインストール済みでも PATH に通っていないなら、シェルの PATH を直してください。オーバーライド用の env 変数はありません。

### 「Could not detect stack」

scanner がプロジェクトのフレームワークを識別できませんでした。原因:

- プロジェクトルートに `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` がない。
- スタックが [サポート済みの 12 スタック](stacks.md) のどれにも該当しない。
- カスタムレイアウトが自動検出ルールに合致しない。

**対処:** プロジェクトルートに認識可能なファイルがあるか確認します。スタック自体はサポート済みでもレイアウトが特殊なら、`.claudeos-scan.json` の override について [advanced-config.md](advanced-config.md) を参照してください。

### 「Authentication test failed」

`init` は Claude Code の認証状態を確認するため、`claude -p "echo ok"` をさっと走らせます。これが失敗したら次のように確認します:

```bash
claude --version           # バージョンが出るはず
claude -p "say hi"         # 応答が返るはず
```

`-p` が認証エラーを返した場合は Claude Code の認証フローに従ってください。ClaudeOS-Core が代わりに Claude の認証を直すことはできません。

---

## init のランタイム問題

### init がハングしたり時間がかかる

大規模プロジェクトの Pass 1 は時間がかかります。診断ポイント:

1. **Claude Code は動いていますか?** 別のターミナルで `claude --version` を実行。
2. **ネットワークは大丈夫ですか?** 各 pass は Claude Code を呼び、その先で Anthropic API を呼びます。
3. **プロジェクトがとても大きいですか?** ドメイングループの分割が自動適用されます (4 ドメイン / 40 ファイル/グループ) ので、24 ドメインのプロジェクトは Pass 1 を 6 回走らせます。

長く出力がない (進捗ティッカが進まない) まま詰まっているようなら、Ctrl-C で kill して resume します:

```bash
npx claudeos-core init   # 最後に完了した pass marker から再開
```

resume メカニズムは未完了の pass だけを再実行します。

### Claude からの「Prompt is too long」エラー

Pass 3 がコンテキストウィンドウを使い切ったケースです。ツールが既に適用している緩和策は次のとおり:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux): 自動。
- **ドメイングループ分割**: ドメイン > 4 またはファイル > 40 / グループ で自動適用。
- **バッチ細分**: 16 ドメイン以上で 3b/3c を 15 ドメイン以下のバッチに細分。

それでもコンテキスト上限に当たるなら、プロジェクトが例外的に大きい場合です。現行の選択肢は次のとおり:

1. プロジェクトを別ディレクトリに分けて、それぞれで `init` を走らせる。
2. `.claudeos-scan.json` で `frontendScan.platformKeywords` を強めに override して、不要なサブアプリをスキップする。
3. [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) する。ケース固有の新しい override が必要かもしれません。

すでに自動で行っている以上に「より積極的な分割を強制する」フラグはありません。

### init が途中で失敗

ツールは **resume-safe** です。再実行するだけです:

```bash
npx claudeos-core init
```

最後に完了した pass marker から再開します。作業は失われません。

すべての marker を消して一から再生成したいなら `--force` を使います:

```bash
npx claudeos-core init --force
```

注意: `--force` は `.claude/rules/` への手動編集を削除します。詳しくは [safety.md](safety.md) を参照してください。

### Windows: 「EBUSY」やファイルロックエラー

Windows のファイルロックは Unix より厳しめです。原因として考えられるもの:

- 書き込み中にアンチウイルスがファイルをスキャンしている。
- IDE が排他ロックでファイルを開いている。
- 前回の `init` がクラッシュして古いハンドルが残っている。

対処 (上から順に試す):

1. IDE を閉じてリトライする。
2. プロジェクトフォルダのアンチウイルスのリアルタイムスキャンを無効化する (またはプロジェクトパスをホワイトリストに入れる)。
3. Windows を再起動して古いハンドルをクリアする。
4. それでもダメなら WSL2 から実行する。

`lib/staged-rules.js` の移動ロジックは `renameSync` から `copyFileSync + unlinkSync` にフォールバックして、ほとんどのアンチウイルス干渉を自動で処理します。それでもロックエラーになる場合、ステージングされたファイルは検査用に `claudeos-core/generated/.staged-rules/` に残ります。`init` を再実行して移動をリトライしてください。

### 跨ボリュームの rename 失敗 (Linux/macOS)

`init` はマウントポイントをまたいでアトミックに rename することがあります (例: `/tmp` から別ディスクのプロジェクトへ)。ツールは copy-then-delete に自動フォールバックするので、操作は不要です。

移動失敗が継続する場合は、`claudeos-core/generated/.staged-rules/` と `.claude/rules/` の両方に書き込みアクセスがあるか確認してください。

---

## 検証の問題

### 「STALE_PATH: file does not exist」

standards/skills/guides で言及したパスが、実在ファイルに解決されません。原因:

- Pass 3 がパスを幻覚した (例: 親ディレクトリ + TypeScript 定数名から `featureRoutePath.ts` をでっち上げた)。
- ファイルを削除したのに docs がまだ参照している。
- ファイルが gitignored だが、scanner の allowlist には含まれていた。

**対処:**

```bash
npx claudeos-core init --force
```

これで Pass 3 / 4 が新しい allowlist で再生成されます。

意図的に gitignored で scanner に無視させたい場合、`.claudeos-scan.json` で実際にサポートされている内容は [advanced-config.md](advanced-config.md) を参照してください (サポートフィールドのセットは小さめ)。

`--force` で直らない場合 (まれな LLM seed では同じ幻覚が再発する) は、問題ファイルを手で編集して悪いパスを除去します。validator は **advisory** ティアで動くので CI をブロックしません。出荷後に直しても問題ありません。

### 「MANIFEST_DRIFT: registered skill not in CLAUDE.md」

`claudeos-core/skills/00.shared/MANIFEST.md` に登録された skill は、CLAUDE.md のどこかで言及されている必要があります。validator には **orchestrator/sub-skill 例外** があり、orchestrator が言及されていれば sub-skill もカバー済みと見なされます。

**対処:** sub-skill の orchestrator が本当に CLAUDE.md で言及されていないなら、`init --force` で再生成します。orchestrator が言及されているのに validator が flag するなら、validator のバグです。ファイルパスを添えて [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

### 「Section 8 has wrong number of H4 sub-sections」

`claude-md-validator` は、Section 8 の下にちょうど 2 個の `####` 見出し (L4 Memory Files / Memory Workflow) を要求します。

考えられる原因:

- CLAUDE.md を手動編集して Section 8 の構造を壊した。
- v2.3.0 以前の Pass 4 が走って Section 9 を追記した。
- v2.2.0 以前のバージョンからアップグレード中で、8-section scaffold がまだ強制されていない。

**対処:**

```bash
npx claudeos-core init --force
```

これで CLAUDE.md がきれいに再生成されます。memory ファイルは `--force` でも保持されるので (上書きされるのは生成ファイルだけ) 安心してください。

### 「T1: section heading missing English canonical token」

各 `## N.` セクション見出しには英語の canonical トークンを含める必要があります (例: `## 1. Role Definition` または `## 1. 役割定義 (Role Definition)`)。`--lang` を変えても複数リポジトリで grep できるようにするためです。

**対処:** 見出しを編集して英語トークンをかっこ書きで含めるか、`init --force` で再生成します (v2.3.0+ の scaffold がこの規約を自動で強制します)。

---

## Memory layer の問題

### 「Memory file growing too large」

コンパクションを実行:

```bash
npx claudeos-core memory compact
```

これで 4 ステージのコンパクションアルゴリズムが適用されます。各ステージの挙動は [memory-layer.md](memory-layer.md) を参照してください。

### 「propose-rules が納得できないルールを提案する」

出力はレビュー用のドラフトで、自動適用はされません。要らないものは拒否するだけです:

- `claudeos-core/memory/auto-rule-update.md` を直接編集して、拒否したい提案を削除する。
- あるいは適用ステップを丸ごとスキップする。提案コンテンツを手動でルールファイルにコピーしない限り、`.claude/rules/` は変更されません。

### `memory <subcommand>` が「not found」と言う

memory ファイルがありません。これらは `init` の Pass 4 で作られます。削除されている場合は:

```bash
npx claudeos-core init --force
```

すべてを再実行せず memory ファイルだけ再作成したい場合、単一 pass を再生する組み込みコマンドはツールにありません。`--force` がその経路です。

---

## CI の問題

### ローカルではテストが通るのに CI で失敗

よくある原因:

1. **CI に `claude` がインストールされていない。** 翻訳依存のテストは `CLAUDEOS_SKIP_TRANSLATION=1` で抜けます。公式 CI ワークフローではこの env 変数を設定済みです。fork 側で設定されていなければ追加してください。

2. **パス正規化 (Windows)。** コードベースは多くの場所で Windows のバックスラッシュを forward slash に正規化していますが、微妙な差でテストが落ちる場合があります。公式 CI は Windows + Linux + macOS で動かしているので大半の問題は捕まりますが、Windows 固有の失敗が出たら本物のバグの可能性があります。

3. **Node バージョン。** テストは Node 18 + 20 で実行しています。Node 16 や 22 を使っていると非互換に当たることがあるので、CI parity のため 18 か 20 にピン留めしてください。

### `health` が CI で 0 終了するが、非ゼロを期待していた

`health` は **fail** ティアの結果でだけ非ゼロ終了します。**warn** と **advisory** は表示されますが、ブロックはしません。

advisory で fail させたい場合 (例: `STALE_PATH` に厳しくしたい) は、組み込みフラグがないので、出力を grep して exit する必要があります:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## ヘルプを得るには

ここまでの内容のどれにも当てはまらない場合は:

1. **正確なエラーメッセージをキャプチャする。** ClaudeOS-Core のエラーにはファイルパスと識別子が含まれているので、再現に役立ちます。
2. **Issue tracker を確認する:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。同じ問題が既に報告されているかもしれません。
3. **新しい issue を作成する。** OS、Node バージョン、Claude Code バージョン (`claude --version`)、プロジェクトスタック、エラー出力を含めてください。可能なら `claudeos-core/generated/project-analysis.json` も添付してください (機密変数は自動で redaction 済み)。

セキュリティ問題は [SECURITY.md](../../SECURITY.md) を参照してください。脆弱性についてパブリック issue は作らないでください。

---

## 関連項目

- [safety.md](safety.md): `--force` の動作と保持されるもの
- [verification.md](verification.md): validator 検出の意味
- [advanced-config.md](advanced-config.md): `.claudeos-scan.json` の override
