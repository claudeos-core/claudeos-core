# Manual Installation

`npx` が使えない場合 (社内ファイアウォール、エアギャップ環境、ロックダウンされた CI)、ClaudeOS-Core を手動でインストール・実行する方法を示します。

ほとんどのユーザーには `npx claudeos-core init` で十分です — このページを読む必要はありません。

> 英語原文: [docs/manual-installation.md](../manual-installation.md). 日本語訳は英語版に追従して同期されています。

---

## 前提条件 (インストール方法に関わらず)

- **Node.js 18+** — `node --version` で確認。古ければ [nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm)、または OS パッケージマネージャでアップグレード。
- **Claude Code** — インストール済みかつ認証済み。`claude --version` で確認。[Anthropic 公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code) を参照。
- **Git リポジトリ (推奨)** — `init` はプロジェクトルートで `.git/` と `package.json`、`build.gradle`、`pom.xml`、`pyproject.toml` のうち少なくとも 1 つの存在をチェックします。

---

## Option 1 — グローバル npm install

```bash
npm install -g claudeos-core
```

確認:

```bash
claudeos-core --version
```

`npx` なしで使えます:

```bash
claudeos-core init
```

**メリット:** 標準、ほとんどのセットアップで動作。
**デメリット:** npm + グローバル `node_modules` への書き込み権限が必要。

後でアップグレード:

```bash
npm install -g claudeos-core@latest
```

アンインストール:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — プロジェクト別 devDependency

プロジェクトの `package.json` に追加:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.3"
  }
}
```

インストール:

```bash
npm install
```

npm scripts で使用:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

その後:

```bash
npm run claudeos:init
```

**メリット:** プロジェクトごとにバージョン固定; CI フレンドリ; グローバル汚染なし。
**デメリット:** `node_modules` がふくらむ — もっとも依存は最小 (`glob` と `gray-matter` のみ)。

1 つのプロジェクトからアンインストール:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (コントリビュータ向け)

開発時、またはコントリビュートしたいとき:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

これで `claudeos-core` がグローバル PATH 上にあり、クローンしたリポジトリを指します。

別プロジェクトでローカルクローンを使う:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**メリット:** ツールのソースを編集して即座にテストできる。
**デメリット:** コントリビュータ専用。クローンしたリポジトリを移動するとリンクが壊れる。

---

## Option 4 — Vendored / エアギャップ

インターネットアクセスのない環境向け:

**接続済みマシンで:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.3.tgz が生成される
```

**`.tgz` をエアギャップ環境へ転送。**

**ローカルファイルからインストール:**

```bash
npm install -g ./claudeos-core-2.4.3.tgz
```

加えて必要なもの:
- エアギャップ環境に既に Node.js 18+ がインストールされていること。
- Claude Code が既にインストール・認証済みであること。
- `glob` と `gray-matter` の npm パッケージがオフライン npm キャッシュにバンドルされている (もしくは別途 `npm pack` で vendoring されている) こと。

すべての推移的依存関係をバンドルするには、転送前に展開した tarball のコピー内で `npm install --omit=dev` を走らせます。

---

## インストールの確認

どのインストール方法でも、以下 4 つの前提を確認:

```bash
# バージョン (例: 2.4.3) が出るはず
claudeos-core --version

# Claude Code のバージョンが出るはず
claude --version

# Node のバージョンが出るはず (18+ 必須)
node --version

# ヘルプテキストが出るはず
claudeos-core --help
```

4 つすべてが動作すれば、プロジェクトで `claudeos-core init` を実行する準備完了です。

---

## アンインストール

```bash
# グローバルインストール時
npm uninstall -g claudeos-core

# プロジェクト別インストール時
npm uninstall claudeos-core
```

プロジェクトから生成コンテンツも削除するには:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core は `claudeos-core/`、`.claude/rules/`、`CLAUDE.md` にしか書きません。この 3 つを削除すれば、生成コンテンツをプロジェクトから完全に削除できます。

---

## CI 統合

GitHub Actions では公式ワークフローが `npx` を使います:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

ほとんどの CI ユースケースにはこれで十分 — `npx` はオンデマンドでパッケージをダウンロードしてキャッシュします。

CI がエアギャップだったり固定バージョンを使いたい場合、Option 2 (プロジェクト別 devDependency) を使い:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

他の CI システム (GitLab、CircleCI、Jenkins など) でもパターンは同じ: Node をインストール、Claude Code をインストール、認証、`npx claudeos-core <command>` を実行。

**`health` が CI 推奨チェック** — 高速 (LLM 呼び出しなし) で 4 つのランタイム validator をカバーします。構造検証も併せて実行するなら `claudeos-core lint` も。

---

## インストールのトラブルシューティング

### 「Command not found: claudeos-core」

グローバルにインストールされていないか、PATH に npm のグローバル bin が含まれていません。

```bash
npm config get prefix
# このパスの bin/ ディレクトリが PATH に入っているか確認
```

または `npx` を使う:

```bash
npx claudeos-core <command>
```

### 「Cannot find module 'glob'」

ClaudeOS-Core をプロジェクトルート以外のディレクトリから実行しています。`cd` でプロジェクトに入るか、`npx` を使う (どこからでも動きます)。

### 「Node.js version not supported」

Node 16 以下です。Node 18+ にアップグレード:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS パッケージマネージャ — 環境による
```

### 「Claude Code not found」

ClaudeOS-Core はローカルの Claude Code インストールを使います。先に Claude Code をインストール ([公式ガイド](https://docs.anthropic.com/en/docs/claude-code))、その後 `claude --version` で確認。

`claude` がインストール済みでも PATH にない場合、PATH を直してください — オーバーライド env 変数はありません。

---

## 関連項目

- [commands.md](commands.md) — インストール後に実行するコマンド
- [troubleshooting.md](troubleshooting.md) — `init` 中のランタイムエラー
