# ClaudeOS-Core

**ソースコードを先に読み、スタックとパターンを決定論的分析で確定してから、プロジェクトに正確に合った Claude Code ルールを生成する唯一のツール。**

```bash
npx claudeos-core init
```

ClaudeOS-Core はコードベースを読み取り、すべてのパターンを抽出し、_あなたの_ プロジェクトに最適化された Standards、Rules、Skills、Guides の完全なセットを生成します。その後、Claude Code に「注文の CRUD を作成して」と伝えると、既存のパターンに完全に一致するコードが生成されます。

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## なぜ ClaudeOS-Core なのか？

他のすべての Claude Code ツールはこう動作します：

> **人間がプロジェクトを説明 → LLM がドキュメントを生成**

ClaudeOS-Core はこう動作します：

> **コードがソースを分析 → コードがカスタムプロンプトを構築 → LLM がドキュメントを生成 → コードが出力を検証**

これは小さな違いではありません。

### 核心的な問題：LLM は推測する。コードは確定する。

Claude に「このプロジェクトを分析して」と頼むと、スタック、ORM、ドメイン構造を**推測**します。
`build.gradle` で `spring-boot` を見ても、MyBatis ではなく JPA と誤認する可能性があります。
`user/` ディレクトリを見ても、layer-first（Pattern A）か domain-first（Pattern B）か間違える可能性があります。

**ClaudeOS-Core は推測しません。** Claude がプロジェクトを見る前に、Node.js コードがすでに：

- `build.gradle` / `package.json` / `pyproject.toml` をパースしてスタック、ORM、DB、パッケージマネージャーを**確定**
- ディレクトリ構造をスキャンしてドメインリストとファイル数を**確定**
- プロジェクト構造を Java 5パターン、Kotlin CQRS/BFF、Next.js App Router/FSD のいずれかに**分類**
- Claude のコンテキストウィンドウに収まるようドメインを最適グループに**分割**
- 確定した事実が注入されたスタック固有のプロンプトを**構築**

Claude がプロンプトを受け取る時点で、推測の余地はありません。スタック確定。ドメイン確定。構造パターン確定。Claude は**確定された事実**に沿ったドキュメントを生成するだけです。

### 結果

他のツールは「一般的に良い」ドキュメントを生成します。
ClaudeOS-Core は、プロジェクトが `ApiResponse.ok()` を使用していること、MyBatis XML マッパーが `src/main/resources/mybatis/mappers/` にあること、パッケージ構造が `com.company.module.{domain}.controller` であることを知っているドキュメントを生成します — 実際のコードを読んだからです。

### Before & After

**ClaudeOS-Core なし** — Claude Code に注文 CRUD の作成を依頼すると：
```
❌ JPA スタイルの repository を使用（プロジェクトは MyBatis）
❌ ResponseEntity.success() を生成（ラッパーは ApiResponse.ok()）
❌ order/controller/ にファイルを配置（プロジェクトは controller/order/）
❌ 英語コメントを生成（チームは日本語を使用）
→ 生成ファイルごとに20分の修正
```

**ClaudeOS-Core 適用後** — `.claude/rules/` に確定されたパターンが存在：
```
✅ MyBatis マッパー + XML を生成（build.gradle から検出）
✅ ApiResponse.ok() を使用（実際のソースから抽出）
✅ controller/order/ にファイルを配置（構造スキャンで Pattern A 確定）
✅ 日本語コメント（--lang ja 適用）
→ 生成コードがプロジェクト規約と即座に一致
```

この差は蓄積されます。1日10タスク × 20分節約 = **1日3時間以上**。

---

## 対応スタック

| スタック | 検出方法 | 分析深度 |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`、`pom.xml`、5パッケージパターン | 10 大分類、59 小項目 |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 大分類, 95 小項目 |
| **Node.js / Express** | `package.json` | 9 大分類、57 小項目 |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 大分類、68 小項目 |
| **Next.js / React** | `package.json`、`next.config.*`、FSD サポート | 9 大分類、55 小項目 |
| **Vue / Nuxt** | `package.json`、`nuxt.config.*`、Composition API | 9 大分類、58 小項目 |
| **Python / Django** | `requirements.txt`、`pyproject.toml` | 10 大分類、55 小項目 |
| **Python / FastAPI** | `requirements.txt`、`pyproject.toml` | 10 大分類、58 小項目 |
| **Node.js / Fastify** | `package.json` | 10 大分類、62 小項目 |
| **Angular** | `package.json`、`angular.json` | 12 大分類、78 小項目 |

自動検出対象：言語とバージョン、フレームワークとバージョン、ORM（MyBatis、JPA、Exposed、Prisma、TypeORM、SQLAlchemy 等）、データベース（PostgreSQL、MySQL、Oracle、MongoDB、SQLite）、パッケージマネージャー（Gradle、Maven、npm、yarn、pnpm、pip、poetry）、アーキテクチャ（CQRS、BFF — モジュール名から検出）、マルチモジュール構造（settings.gradleから検出）、モノレポ（Turborepo、pnpm-workspace、Lerna、npm/yarn workspaces）。

**何も指定する必要はありません。すべて自動検出されます。**


### Java ドメイン検出（5パターン、フォールバック付き）

| 優先度 | パターン | 構造 | 例 |
|---|---|---|---|
| A | レイヤー優先 | `controller/{domain}/` | `controller/user/UserController.java` |
| B | ドメイン優先 | `{domain}/controller/` | `user/controller/UserController.java` |
| D | モジュールプレフィックス | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/ヘキサゴナル | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | フラット | `controller/*.java` | `controller/UserController.java` → クラス名から `user` を抽出 |

Controller のないサービスのみのドメインも `service/`、`dao/`、`aggregator/`、`facade/`、`usecase/`、`orchestrator/`、`mapper/`、`repository/` ディレクトリを通じて検出されます。スキップ：`common`、`config`、`util`、`core`、`front`、`admin`、`v1`、`v2` など。


### Kotlin マルチモジュールドメイン検出

Gradle マルチモジュール構造の Kotlin プロジェクト（例：CQRS モノレポ）向け：

| ステップ | 動作 | 例 |
|---|---|---|
| 1 | `settings.gradle.kts` から `include()` をスキャン | 14 モジュール検出 |
| 2 | モジュール名からタイプを検出 | `reservation-command-server` → type: `command` |
| 3 | モジュール名からドメインを抽出 | `reservation-command-server` → domain: `reservation` |
| 4 | 同じドメインをモジュール間でグループ化 | `reservation-command-server` + `common-query-server` → 1ドメイン |
| 5 | アーキテクチャを検出 | `command` + `query` モジュールあり → CQRS |

サポートモジュールタイプ：`command`、`query`、`bff`、`integration`、`standalone`、`library`。共有ライブラリ（`shared-lib`、`integration-lib`）は特殊ドメインとして検出されます。

### フロントエンドドメイン検出

- **App Router**：`app/{domain}/page.tsx`（Next.js）
- **Pages Router**：`pages/{domain}/index.tsx`
- **FSD（Feature-Sliced Design）**：`features/*/`、`widgets/*/`、`entities/*/`
- **RSC/Client分離**：`client.tsx` パターンを検出、サーバー/クライアントコンポーネントの分離を追跡
- **設定ファイルフォールバック**：`package.json` になくても設定ファイルから Next.js/Vite/Nuxt を検出（monorepo対応）
- **深層ディレクトリフォールバック**：React/CRA/Vite/Vue/RNプロジェクトで `**/components/*/`、`**/views/*/`、`**/screens/*/`、`**/containers/*/`、`**/pages/*/`、`**/routes/*/`、`**/modules/*/`、`**/domains/*/` を任意の深さでスキャン

---

## クイックスタート

### 前提条件

- **Node.js** v18+
- **Claude Code CLI**（インストール・認証済み）

### インストール

```bash
cd /your/project/root

# 方法 A：npx（推奨 — インストール不要）
npx claudeos-core init

# 方法 B：グローバルインストール
npm install -g claudeos-core
claudeos-core init

# 方法 C：プロジェクト devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# 方法 D：git clone（開発・コントリビューション用）
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# クロスプラットフォーム（PowerShell、CMD、Bash、Zsh — すべてのターミナル）
node claudeos-core-tools/bin/cli.js init

# Linux/macOS のみ（Bash のみ）
bash claudeos-core-tools/bootstrap.sh
```

### 出力言語（10 言語対応）

`--lang` なしで `init` を実行すると、矢印キーまたは数字キーで言語を選択するインタラクティブ画面が表示されます：

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  生成されるファイル（CLAUDE.md、Standards、Rules、
  Skills、Guides）は日本語で作成されます。

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
  ❯  4. ja     — 日本語 (Japanese)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

選択を移動すると、説明が該当言語に切り替わります。セレクターをスキップするには `--lang` を直接指定してください：

```bash
npx claudeos-core init --lang ja    # 日本語
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **注意：** この設定は生成されるドキュメントファイルの言語のみを変更します。コード分析（Pass 1–2）は常に英語で実行され、生成結果（Pass 3）のみ選択した言語で作成されます。コード例は元のプログラミング言語構文のまま維持されます。

これだけです。5–18 分後、すべてのドキュメントが生成され、すぐに使えます。CLIは各Passの経過時間と合計時間を完了バナーに表示します。

### 手動ステップバイステップインストール

各フェーズを完全に制御したい場合、または自動パイプラインが途中で失敗した場合、各ステージを手動で実行できます。ClaudeOS-Core の内部動作を理解するのにも役立ちます。

#### Step 1：クローンと依存関係のインストール

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2：ディレクトリ構造の作成

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3：plan-installer の実行（プロジェクト分析）

プロジェクトをスキャンし、スタックを検出、ドメインを発見、グループに分割、プロンプトを生成します。

```bash
node claudeos-core-tools/plan-installer/index.js
```

**出力（`claudeos-core/generated/`）：**
- `project-analysis.json` — 検出されたスタック、ドメイン、フロントエンド情報
- `domain-groups.json` — Pass 1 用ドメイングループ
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — 分析プロンプト
- `pass2-prompt.md` — 統合プロンプト
- `pass3-prompt.md` — 生成プロンプト

続行する前に、これらのファイルを確認して検出精度を検証できます。

#### Step 4：Pass 1 — ドメイングループごとの深層コード分析

各ドメイングループに対して Pass 1 を実行します。`domain-groups.json` でグループ数を確認してください。

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# フロントエンドグループは pass1-frontend-prompt.md を使用してください
```

**確認：** `ls claudeos-core/generated/pass1-*.json` でグループごとに1つの JSON があることを確認。

#### Step 5：Pass 2 — 分析結果の統合

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**確認：** `claudeos-core/generated/pass2-merged.json` が存在し、9つ以上のトップレベルキーがあること。

#### Step 6：Pass 3 — 全ドキュメント生成

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**確認：** プロジェクトルートに `CLAUDE.md` が存在すること。

#### Step 7：検証ツールの実行

```bash
# メタデータ生成（他のチェックの前に必須）
node claudeos-core-tools/manifest-generator/index.js

# 全チェック実行
node claudeos-core-tools/health-checker/index.js

# または個別チェック：
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8：結果の確認

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **ヒント：** 特定のステップで失敗した場合、そのステップだけを再実行できます。Pass 1/2 の結果はキャッシュされます — `pass1-N.json` や `pass2-merged.json` が既に存在する場合、自動パイプラインはスキップします。`npx claudeos-core init --force` を使用すると、以前の結果を削除して最初からやり直します。

### 使い始める

```
# Claude Code で自然言語で話しかけるだけ：
「注文ドメインの CRUD を作成して」
「ユーザー認証 API を追加して」
「このコードをプロジェクトのパターンに合わせてリファクタリングして」

# Claude Code が生成された Standards、Rules、Skills を自動参照します。
```

---

## 仕組み — 3-Pass パイプライン

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← 依存関係インストール（~10秒）
    ├── [2] ディレクトリ構造作成            ← フォルダ作成（~1秒）
    ├── [3] plan-installer (Node.js)       ← プロジェクトスキャン（~5秒）
    │       ├── スタック自動検出（マルチスタック対応）
    │       ├── ドメインリスト抽出（backend/frontend タグ付き）
    │       ├── タイプ別にドメイングループ分割
    │       └── スタック固有のプロンプト選択（タイプ別）
    │
    ├── [4] Pass 1 × N  (claude -p)       ← コードディープ分析（~2-8分）
    │       ├── ⚙️ バックエンドグループ → バックエンド専用分析プロンプト
    │       └── 🎨 フロントエンドグループ → フロントエンド専用分析プロンプト
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← 分析結果の統合（~1分）
    │       └── すべての Pass 1 結果を統合（バックエンド + フロントエンド）
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← 全ファイル生成（~3-5分）
    │       └── 統合プロンプト（バックエンド + フロントエンドターゲット）
    │
    └── [7] 検証                           ← ヘルスチェッカー自動実行
```

### なぜ 3 Pass なのか？

**Pass 1** はソースコードを読む唯一のパスです。ドメインごとに代表ファイルを選択し、55–95 の分析カテゴリにわたってパターンを抽出します。大規模プロジェクトでは、Pass 1 はドメイングループごとに複数回実行されます。マルチスタックプロジェクト（例：Java バックエンド + React フロントエンド）では、バックエンドとフロントエンドに**それぞれ専用の分析プロンプト**が使用されます。

**Pass 2** はすべての Pass 1 結果を統合分析に統合します：共通パターン（100% 共有）、多数派パターン（50%+ 共有）、ドメイン固有パターン、重大度別アンチパターン、横断的関心事（命名、セキュリティ、DB、テスト、ロギング、パフォーマンス）。

**Pass 3** は統合された分析結果を基にファイルエコシステム全体を生成します。ソースコードは一切読みません — 分析 JSON のみを参照します。マルチスタックモードでは、生成プロンプトがバックエンドとフロントエンドのターゲットを統合し、一回のパスで両方の標準ドキュメントを生成します。

---

## 生成されるファイル構造

```
your-project/
│
├── CLAUDE.md                          ← Claude Code エントリーポイント
│
├── .claude/
│   └── rules/                         ← Glob トリガールール
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← 同期リマインダールール
│
├── claudeos-core/                     ← メイン出力ディレクトリ
│   ├── generated/                     ← 分析 JSON + 動的プロンプト
│   ├── standard/                      ← コーディング標準（15-19 ファイル）
│   ├── skills/                        ← CRUD スキャフォールディングスキル
│   ├── guide/                         ← オンボーディング、FAQ、トラブルシューティング（9 ファイル）
│   ├── plan/                          ← Master Plans（バックアップ/リストア）
│   ├── database/                      ← DB スキーマ、マイグレーションガイド
│   └── mcp-guide/                     ← MCP サーバー連携ガイド
│
└── claudeos-core-tools/               ← 本ツールキット（変更不要）
```

すべての標準ファイルに ✅ 正しい例、❌ 誤った例、ルールサマリーテーブルが含まれます — すべてあなたの実際のコードパターンから導出され、汎用テンプレートではありません。

---

## プロジェクト規模による自動スケーリング

| 規模 | ドメイン数 | Pass 1 回数 | `claude -p` 合計 | 推定時間 |
|---|---|---|---|---|
| 小規模 | 1–4 | 1 | 3 | ~5分 |
| 中規模 | 5–8 | 2 | 4 | ~8分 |
| 大規模 | 9–16 | 3–4 | 5–6 | ~12分 |
| 超大規模 | 17+ | 5+ | 7+ | ~18分+ |

マルチスタックプロジェクト（例：Java + React）では、バックエンドとフロントエンドのドメインを合算してカウントします。バックエンド 6 + フロントエンド 4 = 合計 10 ドメインで「大規模」としてスケーリングします。

---

## 検証ツール

ClaudeOS-Core には生成後に自動実行される 5 つの組み込み検証ツールがあります：

```bash
# 全チェックを一括実行（推奨）
npx claudeos-core health

# 個別コマンド
npx claudeos-core validate     # Plan ↔ ディスク比較
npx claudeos-core refresh      # ディスク → Plan 同期
npx claudeos-core restore      # Plan → ディスク復元
```

| ツール | 機能 |
|---|---|
| **manifest-generator** | メタデータ JSON を構築（rule-manifest、sync-map、plan-manifest） |
| **plan-validator** | Master Plan の `<file>` ブロックとディスクを比較 — 3 モード：check、refresh、restore |
| **sync-checker** | 未登録ファイル（ディスク上にあるがプランにない）と孤立エントリを検出 |
| **content-validator** | ファイル品質を検証 — 空ファイル、✅/❌ 例の欠落、必須セクション |
| **pass-json-validator** | Pass 1–3 JSON 構造、必須キー、セクション完全性を検証 |

---

## Claude Code がドキュメントを使用する仕組み

ClaudeOS-Core が生成したドキュメントを Claude Code が実際に読み取る仕組みです：

### 自動的に読み取るファイル

| ファイル | タイミング | 保証 |
|---|---|---|
| `CLAUDE.md` | 毎回の会話開始時 | 常に |
| `.claude/rules/00.core/*` | ファイル編集時（`paths: ["**/*"]`） | 常に |
| `.claude/rules/10.backend/*` | ファイル編集時（`paths: ["**/*"]`） | 常に |
| `.claude/rules/30.security-db/*` | ファイル編集時（`paths: ["**/*"]`） | 常に |
| `.claude/rules/40.infra/*` | config/infraファイル編集時のみ（スコープ付きpaths） | 条件付き |
| `.claude/rules/50.sync/*` | claudeos-coreファイル編集時のみ（スコープ付きpaths） | 条件付き |

### ルール参照によるオンデマンド読み取り

各ルールファイル末尾の `## Reference` セクションが対応するstandardをリンクします。Claudeは現在のタスクに関連するstandardのみ読み取ります：

- `claudeos-core/standard/**` — コーディングパターン、✅/❌ 例、命名規則
- `claudeos-core/database/**` — DB スキーマ（クエリ、マッパー、マイグレーション用）

`00.standard-reference.md` は対応ルールのないstandardを発見するためのディレクトリです。

### 読み取らないファイル（コンテキスト節約）

standard-reference ルールの `DO NOT Read` セクションで明示的に除外されます：

| フォルダ | 除外理由 |
|---|---|
| `claudeos-core/plan/` | Master Plan バックアップ（~340KB）。`npx claudeos-core refresh` で同期。 |
| `claudeos-core/generated/` | ビルドメタデータ JSON。コーディング参照不要。 |
| `claudeos-core/guide/` | 人間向けオンボーディングガイド。 |
| `claudeos-core/mcp-guide/` | MCP サーバードキュメント。コーディング参照不要。 |

---

## 日常ワークフロー

### インストール後

```
# 通常通り Claude Code を使うだけ — 標準を自動参照します：
「注文ドメインの CRUD を作成して」
「ユーザープロフィール更新 API を追加して」
「このコードをプロジェクトのパターンに合わせてリファクタリングして」
```

### 標準ファイルを手動編集した後

```bash
# standard や rules ファイルを編集した後：
npx claudeos-core refresh

# 整合性を検証
npx claudeos-core health
```

### ドキュメントが破損した場合

```bash
# Master Plan からすべて復元
npx claudeos-core restore
```

### CI/CD 統合

```yaml
# GitHub Actions の例
- run: npx claudeos-core validate
# 終了コード 1 で PR をブロック
```

---

## 何が違うのか？

### 他の Claude Code ツールとの比較

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **アプローチ** | コードが先に分析、LLMが生成 | 既製設定プリセット | LLMがエージェントチーム設計 | LLMがスペック文書生成 | LLMがCLAUDE.md作成 |
| **ソースコード直接分析** | ✅ Deterministic 静的分析 | ❌ | ❌ | ❌ (LLMが読む) | ❌ (LLMが読む) |
| **スタック検出** | コードが確定 (ORM, DB, ビルドツール, パッケージマネージャー) | N/A (スタック非依存) | LLMが推測 | LLMが推測 | LLMが推測 |
| **ドメイン検出** | コードが確定 (Java 5パターン, Kotlin CQRS, Next.js FSD) | N/A | LLMが推測 | N/A | N/A |
| **同じプロジェクト → 同じ結果** | ✅ Deterministic 分析 | ✅ (静的ファイル) | ❌ (LLM結果が変動) | ❌ (LLM結果が変動) | ❌ (LLM結果が変動) |
| **大規模プロジェクト** | ドメイングループ分割 (4 ドメイン / 40 ファイル) | N/A | 分割なし | 分割なし | コンテキストウィンドウ制限 |
| **出力** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ ファイル) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 スペック文書 | CLAUDE.md (1 ファイル) |
| **出力場所** | `.claude/rules/` (Claude Code自動ロード) | `.claude/` 各所 | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **生成後検証** | ✅ 5 自動検証ツール | ❌ | ❌ | ❌ | ❌ |
| **多言語出力** | ✅ 10 言語 | ❌ | ❌ | ❌ | ❌ |
| **マルチスタック** | ✅ バックエンド + フロントエンド同時 | ❌ スタック非依存 | ❌ | ❌ | 部分的 |
| **エージェントオーケストレーション** | ❌ | ✅ 28 エージェント | ✅ 6 パターン | ❌ | ❌ |

### 核心的な違い一言

**他のツールは Claude に「一般的に良い指示」を与えます。ClaudeOS-Core は Claude に「実際のコードから抽出した指示」を与えます。**

だから Claude Code が MyBatis プロジェクトで JPA コードを生成することがなくなり、
`success()` の代わりに `ok()` を使うミスがなくなり、
`controller/user/` 構造なのに `user/controller/` を作ることがなくなります。

### 競合ではなく補完

ClaudeOS-Core は**プロジェクト固有のルールと標準**に集中します。
他のツールは**エージェントオーケストレーションとワークフロー**に集中します。

ClaudeOS-Core でプロジェクトルールを生成し、その上に ECC や Harness を載せてエージェントチームとワークフロー自動化を構成できます。異なる問題を解決するツールです。

---
## FAQ

**Q：ソースコードは変更されますか？**
いいえ。`CLAUDE.md`、`.claude/rules/`、`claudeos-core/` のみ作成します。既存のコードは一切変更されません。

**Q：コストはどのくらいですか？**
`claude -p` を 3–7 回呼び出します。Claude Code の通常使用範囲内です。

**Q：生成されたファイルを Git にコミットすべきですか？**
推奨します。チームで同じ Claude Code 標準を共有できます。`claudeos-core/generated/` は `.gitignore` に追加することを検討してください（分析 JSON は再生成可能です）。

**Q：混合スタックプロジェクト（例：Java バックエンド + React フロントエンド）はどうなりますか？**
完全対応しています。ClaudeOS-Core は両方のスタックを自動検出し、ドメインを `backend` または `frontend` としてタグ付けし、それぞれにスタック固有の分析プロンプトを使用します。Pass 2 がすべてを統合し、Pass 3 がバックエンドとフロントエンドの標準を一回のパスで生成します。

**Q：再実行するとどうなりますか？**
以前の Pass 1/2 の結果が存在する場合、インタラクティブプロンプトが表示されます：**Continue**（中断した箇所から再開）または **Fresh**（すべて削除して最初からやり直し）。`--force` を使用するとプロンプトをスキップし、常に最初からやり直します。Pass 3 は常に再実行されます。以前のバージョンは Master Plans から復元できます。

**Q：NestJSはExpressと同じテンプレートを使用しますか？**
NestJSは専用の`node-nestjs`テンプレートを使用し、NestJS固有の分析カテゴリ（`@Module`、`@Injectable`、`@Controller`デコレータ、Guards、Pipes、Interceptors、DIコンテナ、CQRSパターン、`Test.createTestingModule`）を含みます。Expressプロジェクトは別の`node-express`テンプレートを使用します。

**Q：Vue/Nuxtプロジェクトはどうですか？**
Vue/Nuxtは専用の`vue-nuxt`テンプレートを使用し、Composition API、`<script setup>`、defineProps/defineEmits、Piniaストア、`useFetch`/`useAsyncData`、Nitroサーバールート、`@nuxt/test-utils`をカバーします。Next.js/Reactプロジェクトは`node-nextjs`テンプレートを使用します。

**Q：Turborepo/pnpm workspaces/Lernaモノレポで動作しますか？**
はい。ClaudeOS-Coreは`turbo.json`、`pnpm-workspace.yaml`、`lerna.json`、または`package.json#workspaces`を検出し、サブパッケージの`package.json`ファイルからフレームワーク/ORM/DB依存関係を自動スキャンします。ドメインスキャンは`apps/*/src/`と`packages/*/src/`パターンに対応します。モノレポルートから実行してください。

**Q：Kotlinはサポートしていますか？**
はい。ClaudeOS-Coreは`build.gradle.kts`またはkotlinプラグインのある`build.gradle`からKotlinを自動検出します。Kotlin専用の`kotlin-spring`テンプレートを使用して、data class、sealed class、コルーチン、拡張関数、MockKなどKotlin固有のパターンを分析します。

**Q：CQRS / BFFアーキテクチャは？**
Kotlinマルチモジュールプロジェクトで完全にサポートされています。`settings.gradle.kts`を読み取り、モジュール名からモジュールタイプ（command、query、bff、integration）を検出し、同じドメインのCommand/Queryモジュールをグループ化します。生成される標準には、commandコントローラーとqueryコントローラーの個別ルール、BFF/Feignパターン、モジュール間通信規約が含まれます。

**Q：Gradleマルチモジュールmonorepoは？**
ClaudeOS-Coreはネストの深さに関係なく、すべてのサブモジュール（`**/src/main/kotlin/**/*.kt`）をスキャンします。モジュールタイプは命名規則から推測されます（例：`reservation-command-server` → ドメイン：`reservation`、タイプ：`command`）。共有ライブラリ（`shared-lib`、`integration-lib`）も検出されます。

---

## テンプレート構造

```
pass-prompts/templates/
├── common/                  # 共有ヘッダー/フッター
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── python-django/           # Python / Django (DRF)
├── node-fastify/            # Node.js / Fastify
├── angular/                 # Angular
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` がスタックを自動検出し、タイプ固有のプロンプトを組み立てます。NestJSとVue/Nuxtはフレームワーク固有の分析カテゴリを含む専用テンプレートを使用します（例：NestJSの`@Module`/`@Injectable`/Guards、Vueの`<script setup>`/Pinia/useFetch）。マルチスタックプロジェクトでは、`pass1-backend-prompt.md` と `pass1-frontend-prompt.md` が個別に生成され、`pass3-prompt.md` は両方のスタックの生成ターゲットを統合します。

---

## Monorepo サポート

ClaudeOS-Core はJS/TSモノレポ構成を自動検出し、サブパッケージの依存関係をスキャンします。

**サポートされるモノレポマーカー**（自動検出）：
- `turbo.json`（Turborepo）
- `pnpm-workspace.yaml`（pnpm workspaces）
- `lerna.json`（Lerna）
- `package.json#workspaces`（npm/yarn workspaces）

**モノレポルートから実行してください** — ClaudeOS-Core は `apps/*/package.json` と `packages/*/package.json` を読み取り、サブパッケージ全体のフレームワーク/ORM/DB依存関係を検出します：

```bash
cd my-monorepo
npx claudeos-core init
```

**検出される内容：**
- `apps/web/package.json` の依存関係（例：`next`、`react`）→ フロントエンドスタック
- `apps/api/package.json` の依存関係（例：`express`、`prisma`）→ バックエンドスタック
- `packages/db/package.json` の依存関係（例：`drizzle-orm`）→ ORM/DB
- `pnpm-workspace.yaml` のカスタムワークスペースパス（例：`services/*`）

**ドメインスキャンもモノレポレイアウトに対応：**
- `apps/api/src/modules/*/` と `apps/api/src/*/` でバックエンドドメインを検出
- `apps/web/app/*/`、`apps/web/src/app/*/`、`apps/web/pages/*/` でフロントエンドドメインを検出
- `packages/*/src/*/` で共有パッケージドメインを検出

```
my-monorepo/                    ← ここで実行：npx claudeos-core init
├── turbo.json                  ← Turborepo として自動検出
├── apps/
│   ├── web/                    ← apps/web/package.json から Next.js を検出
│   │   ├── app/dashboard/      ← フロントエンドドメインを検出
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← apps/api/package.json から Express を検出
│       ├── src/modules/users/  ← バックエンドドメインを検出
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← packages/db/package.json から Drizzle を検出
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **注意：** Kotlin/Javaモノレポの場合、マルチモジュール検出は `settings.gradle.kts` を使用します（上記の[Kotlin マルチモジュールドメイン検出](#kotlin-マルチモジュールドメイン検出)を参照）。JSモノレポマーカーは不要です。

## トラブルシューティング

**"claude: command not found"** — Claude Code CLI がインストールされていないか、PATH に含まれていません。[Claude Code ドキュメント](https://code.claude.com/docs/en/overview)を参照してください。

**"npm install failed"** — Node.js のバージョンが低い可能性があります。v18+ が必要です。

**"0 domains detected"** — プロジェクト構造が非標準の可能性があります。[韓国語ドキュメント](./README.ko.md#트러블슈팅)であなたのスタックの検出パターンを確認してください。

**Kotlin プロジェクトで「0 ドメイン検出」** — プロジェクトルートに `build.gradle.kts`（または kotlin プラグインのある `build.gradle`）が存在し、ソースファイルが `**/src/main/kotlin/` 配下にあることを確認してください。マルチモジュールプロジェクトの場合、`settings.gradle.kts` に `include()` 文が含まれている必要があります。単一モジュールの Kotlin プロジェクト（`settings.gradle` なし）もサポートされます — `src/main/kotlin/` 配下のパッケージ/クラス構造からドメインを抽出します。

**「言語が kotlin ではなく java として検出される」** — ClaudeOS-Core はまずルートの `build.gradle(.kts)` を確認し、次にサブモジュールのビルドファイルを確認します。少なくとも1つの `build.gradle.kts` に `kotlin("jvm")` または `org.jetbrains.kotlin` が含まれていることを確認してください。

**「CQRS が検出されない」** — アーキテクチャ検出はモジュール名に `command` と `query` キーワードが含まれている必要があります。モジュールが異なる命名を使用している場合、plan-installer 実行後に生成されたプロンプトを手動で調整できます。

---

## コントリビューション

コントリビューションを歓迎します！最も支援が必要な領域：

- **新しいスタックテンプレート** — Ruby/Rails、Go/Gin、PHP/Laravel、Rust/Axum
- **Monorepo の深いサポート** — 独立したサブプロジェクトルート、ワークスペース検出
- **テストカバレッジ** — テストスイート拡大中（現在 256 テスト、全スキャナー、スタック検出、ドメイングルーピング、プラン解析、プロンプト生成、CLIセレクター、モノレポ検出、検証ツールをカバー）

---

## 作者

**claudeos-core** が作成 — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## ライセンス

ISC
