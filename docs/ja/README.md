# Documentation (日本語)

ようこそ。このフォルダは [メイン README](../../README.ja.md) ではカバーしきれない深さが必要なときに参照するドキュメント集です。

軽く試したいだけならメイン README で十分です — 何かが _動く_ だけでなく _どう_ 動くのかを知りたくなったら、こちらに戻ってきてください。

> 英語原文: [docs/README.md](../README.md). 日本語訳は英語版に追従して同期されています。

---

## はじめての方へ — どこから読めばよい?

順番に読んでください。各ドキュメントは前のドキュメントを読んだことを前提にしています。

1. **[Architecture](architecture.md)** — `init` が内部でどう動くか。4-pass パイプライン、なぜ pass に分けるのか、LLM が登場する前に scanner が何をするのか。概念モデルはここから始まります。

2. **[Diagrams](diagrams.md)** — 同じアーキテクチャを Mermaid 図で説明。architecture と並べて読み流してください。

3. **[Stacks](stacks.md)** — サポート対象の 12 スタック (8 backend + 4 frontend)、各スタックの検出方法、スタック別 scanner が抽出する事実。

4. **[Verification](verification.md)** — Claude が docs を生成した後に動く 5 つの validator。何を検査するのか、なぜ存在するのか、出力の読み方。

5. **[Commands](commands.md)** — すべての CLI コマンドとその動作。基本を押さえた後にリファレンスとして使ってください。

ステップ 5 まで読めばメンタルモデルが完成します。このフォルダの残りは特定状況向けのドキュメントです。

---

## 特定の質問がある場合

| 質問 | 読むべきドキュメント |
|---|---|
| 「`npx` を使わずにインストールするには?」 | [Manual Installation](manual-installation.md) |
| 「自分のプロジェクト構造はサポートされている?」 | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| 「再実行すると編集内容が消える?」 | [Safety](safety.md) |
| 「壊れた — どう復旧する?」 | [Troubleshooting](troubleshooting.md) |
| 「他のツール X ではなくなぜこれを使う?」 | [Comparison](comparison.md) |
| 「memory layer は何のためにある?」 | [Memory Layer](memory-layer.md) |
| 「scanner をカスタマイズするには?」 | [Advanced Config](advanced-config.md) |

---

## すべてのドキュメント

| ファイル | トピック |
|---|---|
| [architecture.md](architecture.md) | 4-pass パイプライン + scanner + validator のエンドツーエンド |
| [diagrams.md](diagrams.md) | 同じフローを Mermaid 図で表現 |
| [stacks.md](stacks.md) | サポート対象の 12 スタックの詳細 |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log、failure-patterns、compaction |
| [verification.md](verification.md) | 5 つの post-generation validator |
| [commands.md](commands.md) | すべての CLI コマンド、フラグ、exit code |
| [manual-installation.md](manual-installation.md) | `npx` 抜きでインストール (社内 / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` での override |
| [safety.md](safety.md) | re-init 時に保持されるもの |
| [comparison.md](comparison.md) | 類似ツールとの scope 比較 |
| [troubleshooting.md](troubleshooting.md) | エラーと復旧 |

---

## このフォルダの読み方

各ドキュメントは **単独で読める** ように書かれています — 上記の新規ユーザー向けパスを除けば、必ずしも順番に読む必要はありません。概念が他に依存している箇所には相互リンクがあります。

このドキュメント群で使われる規約:

- **コードブロック** は実際に入力する内容や実際のファイル内容を示します。明示的な注釈がない限り省略はしていません。
- **`✅` / `❌`** は表中で「はい」/「いいえ」を意味します。それ以上のニュアンスは持ちません。
- `claudeos-core/standard/00.core/01.project-overview.md` のような **ファイルパス** はプロジェクトルートからの絶対パスです。
- 機能横の **バージョンマーカー** *(v2.4.0)* は「このバージョンで追加された」という意味です — 旧バージョンには存在しません。

ドキュメントが「真である」と書いていることに反する証拠を見つけたら、それはドキュメントのバグです — [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

---

## 不明瞭な箇所を見つけたら

どのドキュメントも PR 歓迎です。ドキュメントは以下の規約に従います:

- **専門用語より平易な表現を優先。** 多くの読者は ClaudeOS-Core を初めて使います。
- **抽象論より例を優先。** 実際のコード、ファイルパス、コマンド出力を示す。
- **限界に正直であること。** 動かない箇所や注意点があれば明記する。
- **ソースに対して検証済みであること。** 存在しない機能をドキュメント化しない。

コントリビューションフローは [CONTRIBUTING.md](../../CONTRIBUTING.md) を参照。
