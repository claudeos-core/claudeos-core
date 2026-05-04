# Manual Installation

`npx` が使えない場合 (社内ファイアウォール、エアギャップ環境、ロックダウンされた CI など) に、ClaudeOS-Core を手動でインストール・実行する方法を紹介します。

ほとんどの場合は `npx claudeos-core init` で十分なので、このページを読む必要はありません。

> 英語原文: [docs/manual-installation.md](../manual-installation.md). 日本語訳は英語版に追従して同期されています。

---

## 前提条件 (インストール方法に関わらず)

- **Node.js 18+** — `node --version` で確認します。古い場合は [nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm)、または OS パッケージマネージャでアップグレードしてください。
- **Claude Code** — インストール済みかつ認証済み。`claude --version` で確認できます。[Anthropic 公式インストールガイド](https://docs.anthropic.com/en/docs/claude-code) を参照してください。
- **Git リポジトリ (推奨)** — `init` はプロジェクトルートで `.git/` と、`package.json`、`build.gradle`、`pom.xml`、`pyproject.toml` のうち少なくとも 1 つが存在するかチェックします。

---

## Option 1 — グローバル npm install

```bash
npm install -g claudeos-core
```

確認します。

```bash
claudeos-core --version
```

`npx` なしで使えます。

```bash
claudeos-core init
```

**メリット:** 標準的な方法で、ほとんどのセットアップで動きます。
**デメリット:** npm とグローバル `node_modules` への書き込み権限が必要です。

後からアップグレードする場合:

```bash
npm install -g claudeos-core@latest
```

アンインストール:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — プロジェクト別 devDependency

プロジェクトの `package.json` に追加します。

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

インストール:

```bash
npm install
```

npm scripts で使う場合:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

あとは次のように呼び出します。

```bash
npm run claudeos:init
```

**メリット:** プロジェクトごとにバージョンを固定でき、CI フレンドリで、グローバル汚染もありません。
**デメリット:** `node_modules` がふくらみます。もっとも、依存は最小限 (`glob` と `gray-matter` のみ) です。

特定のプロジェクトからアンインストール:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (コントリビュータ向け)

開発時やコントリビュートしたいときに使います。

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

これで `claudeos-core` がグローバル PATH に乗り、クローンしたリポジトリを指すようになります。

別プロジェクトでローカルクローンを使う場合:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**メリット:** ツールのソースを編集して即座にテストできます。
**デメリット:** コントリビュータ専用です。クローンしたリポジトリを移動するとリンクが壊れます。

---

## Option 4 — Vendored / エアギャップ

インターネットアクセスのない環境向けの手順です。

**接続済みマシンで:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.4.tgz が生成される
```

**`.tgz` をエアギャップ環境へ転送します。**

**ローカルファイルからインストール:**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

ほかに必要なもの:
- エアギャップ環境に Node.js 18+ がすでにインストールされていること。
- Claude Code がすでにインストール・認証済みであること。
- `glob` と `gray-matter` の npm パッケージがオフライン npm キャッシュにバンドルされていること (または別途 `npm pack` で vendoring されていること)。

推移的な依存関係もすべてバンドルするには、転送前に展開した tarball のコピー内で `npm install --omit=dev` を走らせます。

---

## インストールの確認

どのインストール方法でも、次の 4 つを確認します。

```bash
# バージョン (例: 2.4.4) が出るはず
claudeos-core --version

# Claude Code のバージョンが出るはず
claude --version

# Node のバージョンが出るはず (18+ 必須)
node --version

# ヘルプテキストが出るはず
claudeos-core --help
```

4 つすべてが動けば、プロジェクトで `claudeos-core init` を実行する準備は整っています。

---

## アンインストール

```bash
# グローバルインストール時
npm uninstall -g claudeos-core

# プロジェクト別インストール時
npm uninstall claudeos-core
```

プロジェクトから生成コンテンツも消したい場合:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core が書き込むのは `claudeos-core/`、`.claude/rules/`、`CLAUDE.md` の 3 か所だけです。これらを削除すれば、生成コンテンツをプロジェクトから完全に取り除けます。

---

## CI 統合

GitHub Actions では、公式ワークフローが `npx` を使います。

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

ほとんどの CI ユースケースではこれで十分です。`npx` はオンデマンドでパッケージをダウンロードしてキャッシュします。

CI がエアギャップだったり、固定バージョンを使いたい場合は Option 2 (プロジェクト別 devDependency) を使います。

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

他の CI システム (GitLab、CircleCI、Jenkins など) でもパターンは同じです。Node をインストールし、Claude Code をインストール・認証して、`npx claudeos-core <command>` を実行するだけです。

**CI 推奨チェックは `health`** です。高速で (LLM 呼び出しなし)、4 つのランタイム validator をカバーします。構造検証も併せて実行するなら `claudeos-core lint` も追加してください。

---

## インストールのトラブルシューティング

### 「Command not found: claudeos-core」

グローバルにインストールされていないか、PATH に npm のグローバル bin が含まれていません。

```bash
npm config get prefix
# このパスの bin/ ディレクトリが PATH に入っているか確認
```

または `npx` を使います。

```bash
npx claudeos-core <command>
```

### 「Cannot find module 'glob'」

ClaudeOS-Core をプロジェクトルート以外のディレクトリから実行しています。`cd` でプロジェクトに入るか、`npx` を使ってください (どこからでも動きます)。

### 「Node.js version not supported」

Node 16 以下です。Node 18+ にアップグレードします。

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS パッケージマネージャ — 環境による
```

### 「Claude Code not found」

ClaudeOS-Core はローカルの Claude Code インストールを使います。先に Claude Code をインストール ([公式ガイド](https://docs.anthropic.com/en/docs/claude-code)) してから、`claude --version` で確認してください。

`claude` がインストール済みでも PATH に通っていない場合は、PATH を直してください。オーバーライド env 変数はありません。

---

## 関連項目

- [commands.md](commands.md) — インストール後に実行するコマンド
- [troubleshooting.md](troubleshooting.md) — `init` 中のランタイムエラー
