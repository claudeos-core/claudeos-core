# ClaudeOS-Core

**ソースコードを先に読み、決定論的分析でスタックとパターンを確定してから、プロジェクトに正確に合った Claude Code ルールを生成する唯一のツール。**

```bash
npx claudeos-core init
```

ClaudeOS-Core はコードベースを読み取り、見つけたすべてのパターンを抽出して、_あなたの_ プロジェクトに合わせた Standards、Rules、Skills、Guides の完全なセットを生成します。その後、Claude Code に「注文の CRUD を作成して」と伝えると、既存のパターンに完全に一致するコードが生成されます。

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## なぜ ClaudeOS-Core なのか？

他のすべての Claude Code ツールはこう動作します：

> **人間がプロジェクトを説明 → LLM がドキュメントを生成**

ClaudeOS-Core はこう動作します：

> **コードがソースを分析 → コードがカスタムプロンプトを構築 → LLM がドキュメントを生成 → コードが出力を検証**

これは小さな違いではありません。なぜ重要なのか説明します：

### 核心的な問題：LLM は推測する。コードは推測しない。

Claude に「このプロジェクトを分析して」と頼むと、スタック、ORM、ドメイン構造を**推測**します。
`build.gradle` で `spring-boot` を見ても、MyBatis を使っていること（JPA ではない）を見逃すかもしれません。
`user/` ディレクトリを検出しても、プロジェクトが layer-first パッケージング（Pattern A）を使っていて domain-first（Pattern B）ではないことに気付かないかもしれません。

**ClaudeOS-Core は推測しません。** Claude がプロジェクトを見る前に、Node.js コードがすでに以下を実行済みです：

- `build.gradle` / `package.json` / `pyproject.toml` をパースしてスタック、ORM、DB、パッケージマネージャを**確定**
- ディレクトリ構造をスキャンしてファイル数付きのドメインリストを**確定**
- プロジェクト構造を Java 5 パターン、Kotlin CQRS/BFF、Next.js App Router/FSD のいずれかに**分類**
- Claude のコンテキストウィンドウに収まる最適サイズのグループにドメインを**分割**
- 確定された事実がすべて注入されたスタック固有のプロンプトを**組み立て**

Claude がプロンプトを受け取る時点で、推測の余地はありません。スタック確定。ドメイン確定。構造パターン確定。Claude の仕事は、これらの**確定された事実**に合ったドキュメントを生成することだけです。

### 結果

他のツールは「一般的に良い」ドキュメントを生成します。
ClaudeOS-Core は、プロジェクトが `ApiResponse.ok()`（`ResponseEntity.success()` ではない）を使っていること、MyBatis XML マッパーが `src/main/resources/mybatis/mappers/` にあること、パッケージ構造が `com.company.module.{domain}.controller` であることを知っているドキュメントを生成します — 実際のコードを読んだからです。

### Before & After

**ClaudeOS-Core なし** — Claude Code に注文 CRUD の作成を依頼すると：
```
❌ JPA スタイルの repository を使用（プロジェクトは MyBatis）
❌ ResponseEntity.success() を生成（あなたのラッパーは ApiResponse.ok()）
❌ order/controller/ にファイルを配置（プロジェクトは controller/order/ 構造）
❌ 英語コメントを生成（チームは日本語コメント）
→ 生成ファイルごとに 20 分の修正
```

**ClaudeOS-Core あり** — `.claude/rules/` に確定されたパターンがすでに存在：
```
✅ MyBatis マッパー + XML を生成（build.gradle から検出）
✅ ApiResponse.ok() を使用（実際のソースから抽出）
✅ controller/order/ にファイルを配置（構造スキャンで Pattern A 確定）
✅ 日本語コメント（--lang ja 適用）
→ 生成コードがプロジェクト規約と即座に一致
```

この差は積み重なります。1 日 10 タスク × 20 分節約 = **1 日 3 時間以上**。

---

## 対応スタック

| スタック | 検出方法 | 分析深度 |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`、`pom.xml`、5 パッケージパターン | 10 大分類、59 小項目 |
| **Kotlin / Spring Boot** | `build.gradle.kts`、kotlin plugin、`settings.gradle.kts`、CQRS/BFF 自動検出 | 12 大分類、95 小項目 |
| **Node.js / Express** | `package.json` | 9 大分類、57 小項目 |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 大分類、68 小項目 |
| **Next.js / React** | `package.json`、`next.config.*`、FSD サポート | 9 大分類、55 小項目 |
| **Vue / Nuxt** | `package.json`、`nuxt.config.*`、Composition API | 9 大分類、58 小項目 |
| **Python / Django** | `requirements.txt`、`pyproject.toml` | 10 大分類、55 小項目 |
| **Python / FastAPI** | `requirements.txt`、`pyproject.toml` | 10 大分類、58 小項目 |
| **Node.js / Fastify** | `package.json` | 10 大分類、62 小項目 |
| **Vite / React SPA** | `package.json`、`vite.config.*` | 9 大分類、55 小項目 |
| **Angular** | `package.json`、`angular.json` | 12 大分類、78 小項目 |

自動検出対象：言語とバージョン、フレームワークとバージョン（SPA フレームワークとしての Vite を含む）、ORM（MyBatis、JPA、Exposed、Prisma、TypeORM、SQLAlchemy など）、データベース（PostgreSQL、MySQL、Oracle、MongoDB、SQLite）、パッケージマネージャ（Gradle、Maven、npm、yarn、pnpm、pip、poetry）、アーキテクチャ（CQRS、BFF — モジュール名から）、マルチモジュール構造（settings.gradle から）、モノレポ（Turborepo、pnpm-workspace、Lerna、npm/yarn workspaces）、**`.env.example` ランタイム設定**（v2.2.0 — Vite・Next.js・Nuxt・Angular・Node・Python フレームワークの 16 以上の慣習的変数名から port/host/API-target を抽出）。

**何も指定する必要はありません。すべて自動的に検出されます。**

### `.env`-driven ランタイム設定（v2.2.0）

v2.2.0 では `lib/env-parser.js` が追加され、生成される `CLAUDE.md` がフレームワークのデフォルトではなく、プロジェクトが実際に宣言している内容を反映するようになりました。

- **検索順序**：`.env.example`（canonical、コミット対象）→ `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`。`.example` バリアントが優先されるのは、それが「開発者中立な shape-of-truth」であり、特定コントリビュータのローカルオーバーライドではないためです。
- **認識されるポート変数名の慣例**：`VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / 汎用 `PORT`。両方存在する場合はフレームワーク固有名が汎用 `PORT` より優先されます。
- **ホストと API ターゲット**：`VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` など。
- **優先順位**：Spring Boot の `application.yml` `server.port` が引き続き最優先（framework-native config）、次に `.env` 宣言のポート、最後の手段としてフレームワークのデフォルト（Vite 5173、Next.js 3000、Django 8000 など）。
- **機密変数の redaction**：`PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` パターンにマッチする変数の値は、下流のジェネレータに到達する前に `***REDACTED***` へ置換されます。`.env.example` に誤ってコミットされた機密情報に対する defense-in-depth です。`DATABASE_URL` は stack-detector の DB 識別における後方互換性のため、明示的にホワイトリスト登録されています。

### Java ドメイン検出（5 パターン、フォールバック付き）

| 優先度 | パターン | 構造 | 例 |
|---|---|---|---|
| A | レイヤー優先 | `controller/{domain}/` | `controller/user/UserController.java` |
| B | ドメイン優先 | `{domain}/controller/` | `user/controller/UserController.java` |
| D | モジュールプレフィックス | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/ヘキサゴナル | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | フラット | `controller/*.java` | `controller/UserController.java` → クラス名から `user` を抽出 |

Controller を持たない Service 専用ドメインも、`service/`、`dao/`、`aggregator/`、`facade/`、`usecase/`、`orchestrator/`、`mapper/`、`repository/` ディレクトリを通じて検出されます。スキップ：`common`、`config`、`util`、`core`、`front`、`admin`、`v1`、`v2` など。

### Kotlin マルチモジュールドメイン検出

Gradle マルチモジュール構造の Kotlin プロジェクト（例：CQRS モノレポ）向け：

| ステップ | 動作 | 例 |
|---|---|---|
| 1 | `settings.gradle.kts` から `include()` をスキャン | 14 モジュールを検出 |
| 2 | モジュール名からタイプを検出 | `reservation-command-server` → type: `command` |
| 3 | モジュール名からドメインを抽出 | `reservation-command-server` → domain: `reservation` |
| 4 | モジュール間で同じドメインをグループ化 | `reservation-command-server` + `common-query-server` → 1 ドメイン |
| 5 | アーキテクチャ検出 | `command` + `query` モジュール存在 → CQRS |

対応モジュールタイプ：`command`、`query`、`bff`、`integration`、`standalone`、`library`。共有ライブラリ（`shared-lib`、`integration-lib`）は特殊ドメインとして検出されます。

### フロントエンドドメイン検出

- **App Router**：`app/{domain}/page.tsx`（Next.js）
- **Pages Router**：`pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**：`features/*/`、`widgets/*/`、`entities/*/`
- **RSC/Client 分離**：`client.tsx` パターンを検出、Server/Client コンポーネント分離を追跡
- **非標準ネストパス**：`src/*/` 配下のページ、コンポーネント、FSD レイヤーを検出（例：`src/admin/pages/dashboard/`、`src/admin/components/form/`、`src/admin/features/billing/`）
- **プラットフォーム/ティア分割検出 (v2.0.0)**：`src/{platform}/{subapp}/` レイアウトを認識 — `{platform}` はデバイス/ターゲットキーワード（`desktop`、`pc`、`web`、`mobile`、`mc`、`mo`、`sp`、`tablet`、`tab`、`pwa`、`tv`、`ctv`、`ott`、`watch`、`wear`）またはアクセスティアキーワード（`admin`、`cms`、`backoffice`、`back-office`、`portal`）を指定できます。`(platform, subapp)` ペアごとに `{platform}-{subapp}` という名前のドメインを 1 つ生成し、ドメインごとの routes/components/layouts/hooks のカウントを提供します。Angular、Next.js、React、Vue で同時に動作（マルチ拡張子 glob `{tsx,jsx,ts,js,vue}`）。subapp あたり 2 ファイル以上必要（1 ファイルのノイジーなドメインを回避）。
- **モノレポプラットフォーム分割 (v2.0.0)**：プラットフォームスキャンは `{apps,packages}/*/src/{platform}/{subapp}/`（`src/` を持つ Turborepo/pnpm workspace）および `{apps,packages}/{platform}/{subapp}/`（`src/` ラッパーなしの workspaces）にもマッチします。
- **Fallback E — routes ファイル (v2.0.0)**：主要スキャナ + Fallback A–D がすべて 0 を返した場合、`**/routes/*.{tsx,jsx,ts,js,vue}` を glob し、`routes` の親ディレクトリ名でグループ化。Next.js の `page.tsx` や FSD レイアウトにマッチしない React Router ファイルルーティングプロジェクト（CRA/Vite + `react-router`）を捕捉します。汎用的な親名（`src`、`app`、`pages`）はフィルタアウトされます。
- **Config フォールバック**：`package.json` になくても、設定ファイルから Next.js/Vite/Nuxt を検出（モノレポ対応）
- **Deep ディレクトリフォールバック**：React/CRA/Vite/Vue/RN プロジェクトで、`**/components/*/`、`**/views/*/`、`**/screens/*/`、`**/containers/*/`、`**/pages/*/`、`**/routes/*/`、`**/modules/*/`、`**/domains/*/` をどの深さでもスキャン
- **共有無視リスト (v2.0.0)**：すべてのスキャナが `BUILD_IGNORE_DIRS`（`node_modules`、`build`、`dist`、`out`、`.next`、`.nuxt`、`.svelte-kit`、`.angular`、`.turbo`、`.cache`、`.parcel-cache`、`coverage`、`storybook-static`、`.vercel`、`.netlify`）と `TEST_FILE_IGNORE`（spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`）を共有し、ビルド成果物とテストフィクスチャがドメインごとのファイル数を膨張させないようにします。

### スキャナオーバーライド (v2.0.0)

プロジェクトルートにオプションの `.claudeos-scan.json` を配置すると、ツールキットを編集せずにスキャナのデフォルトを拡張できます。すべてのフィールドは**加算的** — ユーザーエントリはデフォルトを置き換えず、拡張します：

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| フィールド | デフォルト | 用途 |
|---|---|---|
| `platformKeywords` | 上記の組み込みリスト | プラットフォームスキャン用の追加 `{platform}` キーワード（例：`kiosk`、`vr`、`embedded`） |
| `skipSubappNames` | 構造的ディレクトリのみ | プラットフォームスキャンのドメイン生成から除外する追加 subapp 名 |
| `minSubappFiles` | `2` | subapp がドメインになるために必要な最小ファイル数の上書き |

ファイル欠損または JSON 不正 → 静かにデフォルトにフォールバック（クラッシュなし）。典型的な用途：組み込みリストが曖昧すぎるとして除外する短縮形（`adm`、`bo`）を opt-in する、またはノイジーなモノレポで `minSubappFiles` を引き上げる。

---

## クイックスタート

### 前提条件

- **Node.js** v18+
- **Claude Code CLI**（インストール & 認証済み）

### インストール

```bash
cd /your/project/root

# オプション A：npx（推奨 — インストール不要）
npx claudeos-core init

# オプション B：グローバルインストール
npm install -g claudeos-core
claudeos-core init

# オプション C：プロジェクト devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# オプション D：git clone（開発/貢献用）
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# クロスプラットフォーム（PowerShell、CMD、Bash、Zsh — どのターミナルでも）
node claudeos-core-tools/bin/cli.js init

# Linux/macOS（Bash のみ）
bash claudeos-core-tools/bootstrap.sh
```

### 出力言語（10 言語対応）

`--lang` なしで `init` を実行すると、インタラクティブセレクタが表示されます — 矢印キーまたは数字キーで選択：

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  生成されるファイル（CLAUDE.md、Standards、Rules、
  Skills、Guides）は日本語で記述されます。

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
  ❯  4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

カーソル移動に応じて、説明が選択した言語に切り替わります。セレクタをスキップするには `--lang` を直接指定：

```bash
npx claudeos-core init --lang ko    # 한국어
npx claudeos-core init --lang ja    # 日本語
npx claudeos-core init --lang en    # English（デフォルト）
```

> **注意：** この設定は生成されるドキュメントファイルの言語のみを変更します。コード分析（Pass 1–2）は常に英語で実行され、生成結果（Pass 3）のみが選択した言語で記述されます。生成ファイル内のコード例は元のプログラミング言語構文のまま維持されます。

以上です。10 分（小規模プロジェクト）から 2 時間（60 ドメイン超のモノレポ）後、すべてのドキュメントが生成され、すぐに使用できます。CLI は各 Pass のパーセンテージ、経過時間、ETA 付きのプログレスバーを表示します。プロジェクトサイズごとの詳細な所要時間は [プロジェクトサイズによる自動スケーリング](#プロジェクトサイズによる自動スケーリング) を参照してください。

### 手動ステップバイステップインストール

各フェーズを完全に制御したい場合や、自動化パイプラインが任意のステップで失敗した場合、各ステージを手動で実行できます。ClaudeOS-Core の内部動作を理解するのにも役立ちます。

#### Step 1：クローンと依存関係のインストール

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2：ディレクトリ構造の作成

```bash
# Rules（v2.0.0：60.memory を追加）
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide、Database、MCP、Generated、Memory（v2.0.0：memory を追加 / v2.1.0：plan を削除）
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **v2.1.0 注意：** `claudeos-core/plan/` ディレクトリはもう作成されません。Master plan は Claude Code がランタイムで一度も読まない内部バックアップであり、それらを集約することが `Prompt is too long` 失敗の引き金になっていたため、生成は廃止されました。バックアップ/復元には `git` を使用してください。

#### Step 3：plan-installer の実行（プロジェクト分析）

プロジェクトをスキャンし、スタックを検出し、ドメインを見つけ、グループに分割し、プロンプトを生成します。

```bash
node claudeos-core-tools/plan-installer/index.js
```

**出力（`claudeos-core/generated/` 内）：**
- `project-analysis.json` — 検出されたスタック、ドメイン、フロントエンド情報
- `domain-groups.json` — Pass 1 用ドメイングループ
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — 分析プロンプト
- `pass2-prompt.md` — マージプロンプト
- `pass3-prompt.md` — Phase 1 "Read Once, Extract Facts" ブロック（Rule A–E）が先頭に追加された Pass 3 プロンプトテンプレート。自動化パイプラインはランタイムで Pass 3 を複数ステージに分割し、このテンプレートが各ステージに供給されます。
- `pass3-context.json` — Pass 2 後に生成されるスリムなプロジェクト要約（< 5 KB）。Pass 3 プロンプトは完全な `pass2-merged.json` よりこちらを優先して参照します（v2.1.0）
- `pass4-prompt.md` — L4 メモリスキャフォールディングプロンプト（v2.0.0；`60.memory/` ルール書き込みにも同じ `staging-override.md` を使用）

これらのファイルを検査して、進める前に検出精度を確認できます。

#### Step 4：Pass 1 — 深層コード分析（ドメイングループごと）

各ドメイングループに対して Pass 1 を実行します。グループ数は `domain-groups.json` で確認してください。

```bash
# グループ数を確認
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# 各グループに対して Pass 1 を実行（ドメインとグループ番号を置き換え）
# 注：v1.6.1+ は perl の代わりに Node.js の String.replace() を使用 — perl は
# 不要になり、replacement-function セマンティクスにより、ドメイン名に現れる可能性のある
# $/&/$1 文字からの regex インジェクションを防止。
#
# Group 1：
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Group 2（存在する場合）：
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# フロントエンドグループの場合、pass1-backend-prompt.md → pass1-frontend-prompt.md に置き換え
```

**確認：** `ls claudeos-core/generated/pass1-*.json` でグループごとに 1 つの JSON が表示されるはずです。

#### Step 5：Pass 2 — 分析結果のマージ

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**確認：** `claudeos-core/generated/pass2-merged.json` が存在し、最上位キーが 9 個以上あるはずです。

#### Step 6：Pass 3 — すべてのドキュメントを生成（複数ステージに分割）

**v2.1.0 注意：** Pass 3 は自動化パイプラインで**常に split モードで実行**されます。各ステージはフレッシュなコンテキストウィンドウを持つ独立した `claude -p` 呼び出しであるため、プロジェクトの規模にかかわらず出力累積によるオーバーフローは構造的に発生しません。`pass3-prompt.md` テンプレートはステージごとに `STAGE:` ディレクティブと共に組み立てられ、どのサブセットのファイルを出力するかを Claude に伝えます。手動モードでは、完全なテンプレートを投入して 1 回の呼び出しで Claude にすべて生成させるのが最もシンプルですが、これは小規模プロジェクト（≤5 ドメイン）でのみ信頼できます。それより大きいプロジェクトでは `npx claudeos-core init` を使用し、split ランナーにステージオーケストレーションを任せてください。

**単一呼び出しモード（小規模プロジェクト専用、≤5 ドメイン）：**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**ステージ別モード（すべての規模で推奨）：**

自動化パイプラインは以下のステージを実行します。ステージ一覧：

| ステージ | 書き込むもの | 備考 |
|---|---|---|
| `3a` | `pass3a-facts.md`（5–10 KB の蒸留されたファクトシート） | `pass2-merged.json` を一度読み込み、以降のステージはこのファイルを参照 |
| `3b-core` | `CLAUDE.md`、共通 `standard/`、共通 `.claude/rules/` | プロジェクト横断ファイル；ドメイン固有の出力なし |
| `3b-1..N` | ドメイン固有の `standard/60.domains/*.md` + ドメインルール | ステージあたり ≤15 ドメインのバッチ（16 ドメイン以上で自動分割） |
| `3c-core` | `guide/`（9 ファイル）、`skills/00.shared/MANIFEST.md`、`skills/*/` オーケストレータ | 共有スキルとユーザー向けガイド全体 |
| `3c-1..N` | `skills/20.frontend-page/scaffold-page-feature/` 配下のドメインサブスキル | ステージあたり ≤15 ドメインのバッチ |
| `3d-aux` | `database/`、`mcp-guide/` | 固定サイズ、ドメイン数とは独立 |

1〜15 ドメインのプロジェクトでは 4 ステージ（`3a`、`3b-core`、`3c-core`、`3d-aux` — バッチ分割なし）に展開されます。16〜30 ドメインでは 8 ステージ（`3b` と `3c` がそれぞれ 2 バッチにサブ分割）に展開されます。完全な表は [プロジェクトサイズによる自動スケーリング](#プロジェクトサイズによる自動スケーリング) を参照してください。

**確認：** プロジェクトルートに `CLAUDE.md` が存在し、`claudeos-core/generated/pass3-complete.json` マーカーが書き込まれているはずです。split モードではこのマーカーに `mode: "split"` と、完了したすべてのステージを列挙する `groupsCompleted` 配列が含まれます — 部分マーカーのロジックはこれを使い、クラッシュ後に `3a` から再実行する（トークンコストが倍増する）のではなく、正しいステージから再開します。

> **ステージング注意：** Claude Code の sensitive-path ポリシーが `.claude/` への直接書き込みをブロックするため、Pass 3 はまず `claudeos-core/generated/.staged-rules/` にルールファイルを書き込みます。自動化パイプラインは各ステージ後に移動を自動的に処理します。ステージを手動で実行する場合、staged ツリーを自分で移動する必要があります：`mv claudeos-core/generated/.staged-rules/* .claude/rules/`（サブパスを保持）。

#### Step 7：Pass 4 — メモリスキャフォールディング

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**確認：** `claudeos-core/memory/` に 4 ファイル（`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`）、`.claude/rules/60.memory/` に 4 ルールファイルが存在し、`CLAUDE.md` に `## Memory (L4)` セクションが追加されているはずです。マーカー：`claudeos-core/generated/pass4-memory.json`。

> **v2.1.0 gap-fill：** Pass 4 は `claudeos-core/skills/00.shared/MANIFEST.md` の存在も保証します。Pass 3c がこれを省略した場合（スキルが少ないプロジェクトで、スタックの `pass3.md` テンプレートは `MANIFEST.md` を生成ターゲットに挙げているものの REQUIRED としてマークしていないため起こり得ます）、gap-fill が最小限のスタブを作成し、`.claude/rules/50.sync/02.skills-sync.md`（v2.2.0 パス — sync ルール数が 3 個から 2 個に削減され、`03` が `02` になりました）の参照ターゲットが常に有効である状態を保ちます。冪等：ファイルがすでに実体のある内容（>20 文字）を持っている場合はスキップします。

> **注意：** `claude -p` が失敗したり `pass4-prompt.md` が欠損している場合、自動化パイプラインは `lib/memory-scaffold.js` を経由した静的スキャフォールドにフォールバックします（`--lang` が非英語の場合は Claude 主導の翻訳付き）。静的フォールバックは `npx claudeos-core init` 内でのみ実行されます — 手動モードでは Pass 4 が成功する必要があります。

#### Step 8：検証ツールの実行

```bash
# メタデータを生成（他のチェック前に必須）
node claudeos-core-tools/manifest-generator/index.js

# すべてのチェックを実行
node claudeos-core-tools/health-checker/index.js

# または個別にチェックを実行：
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk 整合性
node claudeos-core-tools/sync-checker/index.js          # 未登録/孤児ファイル
node claudeos-core-tools/content-validator/index.js     # ファイル品質チェック（memory/ セクション [9/9] を含む）
node claudeos-core-tools/pass-json-validator/index.js   # Pass 1–4 JSON + 完了マーカーチェック
```

#### Step 9：結果の確認

```bash
# 生成されたファイル数をカウント
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# CLAUDE.md を確認
head -30 CLAUDE.md

# standard ファイルを確認
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# rules を確認
ls .claude/rules/*/
```

> **ヒント：** 任意のステップが失敗した場合、問題を修正してそのステップだけを再実行できます。Pass 1/2 の結果はキャッシュされます — `pass1-N.json` または `pass2-merged.json` がすでに存在する場合、自動化パイプラインはそれらをスキップします。`npx claudeos-core init --force` で以前の結果を削除して最初から実行します。

### 使い始める

```
# Claude Code で — 自然に依頼するだけ：
"order ドメインの CRUD を作成して"
"ユーザー認証 API を追加して"
"このコードをプロジェクトのパターンに合わせてリファクタリングして"

# Claude Code が生成された Standards、Rules、Skills を自動的に参照します。
```

---

## 仕組み — 4-Pass パイプライン

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← 依存関係（~10 秒）
    ├── [2] ディレクトリ構造                     ← フォルダ作成（~1 秒）
    ├── [3] plan-installer (Node.js)           ← プロジェクトスキャン（~5 秒）
    │       ├── スタック自動検出（マルチスタック対応）
    │       ├── ドメインリスト抽出（タグ付け：backend/frontend）
    │       ├── ドメイングループに分割（タイプ別）
    │       ├── pass3-context.json をビルド（スリム要約、v2.1.0）
    │       └── スタック固有のプロンプトを選択（タイプ別）
    │
    ├── [4] Pass 1 × N  (claude -p)            ← 深層コード分析（~2-8 分）
    │       ├── ⚙️ バックエンドグループ → バックエンド固有プロンプト
    │       └── 🎨 フロントエンドグループ → フロントエンド固有プロンプト
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← 分析マージ（~1 分）
    │       └── すべての Pass 1 結果を pass2-merged.json に統合
    │
    ├── [6] Pass 3（split モード、v2.1.0）       ← すべてを生成
    │       │
    │       ├── 3a     × 1  (claude -p)        ← ファクト抽出（~5-10 分）
    │       │       └── pass2-merged.json を一度読んで → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + 共通 standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← ドメイン standard/rules（≤15 ドメイン/バッチ）
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + 共有 skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← ドメインサブスキル（≤15 ドメイン/バッチ）
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← database/ + mcp-guide/ スタブ
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← メモリスキャフォールディング（~30 秒-5 分）
    │       ├── memory/ をシード（decision-log、failure-patterns、…）
    │       ├── 60.memory/ ルールを生成
    │       ├── CLAUDE.md に "Memory (L4)" セクションを追加
    │       └── Gap-fill：skills/00.shared/MANIFEST.md の存在を保証（v2.1.0）
    │
    └── [8] 検証                                 ← health checker を自動実行
```

### なぜ 4 Pass なのか？

**Pass 1** はソースコードを読む唯一の Pass です。ドメインごとに代表ファイルを選択し、55–95 分析カテゴリ（スタック別）全体でパターンを抽出します。大規模プロジェクトでは、Pass 1 はドメイングループごとに 1 回ずつ複数回実行されます。マルチスタックプロジェクト（例：Java backend + React frontend）では、backend と frontend のドメインは各スタックに合わせた**異なる分析プロンプト**を使用します。

**Pass 2** はすべての Pass 1 結果を統一された分析にマージします：共通パターン（100% 共有）、多数派パターン（50%+ 共有）、ドメイン固有パターン、重大度別のアンチパターン、横断的関心事（命名、セキュリティ、DB、テスト、ロギング、パフォーマンス）。backend と frontend の結果は一緒にマージされます。

**Pass 3**（split モード、v2.1.0）は統合された分析を受け取り、ファイルエコシステム全体（CLAUDE.md、rules、standards、skills、guides）を複数の順次 `claude -p` 呼び出しをまたいで生成します。ポイントは、出力累積によるオーバーフローが入力サイズから予測できない、という事実です：単一呼び出しの Pass 3 は 2 ドメインプロジェクトでは問題なく動作し、~5 ドメインで確実に失敗し、失敗境界は各ファイルの冗長度合いによって変動していました。Split モードはこれを構造的に回避します — 各ステージはフレッシュなコンテキストウィンドウで開始し、限定されたファイルサブセットを書き込みます。ステージをまたいだ整合性（単一呼び出しアプローチの主な利点）は `pass3a-facts.md` によって保持されます。これは 5–10 KB の蒸留されたファクトシートで、以降のすべてのステージが参照します。

Pass 3 プロンプトテンプレートには、出力量をさらに抑制する **Phase 1「Read Once, Extract Facts」ブロック**（5 つのルール）も含まれます：

- **Rule A** — ファクトテーブルを参照する；`pass2-merged.json` を再読み込みしない。
- **Rule B** — 冪等なファイル書き込み（ターゲットが実体のある内容で存在する場合はスキップ）により、Pass 3 は中断後も安全に再実行できます。
- **Rule C** — ファクトテーブルを単一の真実の源として、ファイル間の整合性を強制。
- **Rule D** — 出力の簡潔さ：ファイル書き込みの合間は 1 行（`[WRITE]`/`[SKIP]`）のみ、ファクトテーブルの再掲やファイル内容のエコーをしない。
- **Rule E** — バッチ冪等チェック：ターゲットごとの `Read` 呼び出しの代わりに、PHASE 2 開始時に `Glob` を 1 回だけ実行。

**v2.2.0** では、Pass 3 は決定的な CLAUDE.md scaffold（`pass-prompts/templates/common/claude-md-scaffold.md`）をプロンプトにインラインで埋め込みます。これにより 8 つの最上位セクションのタイトルと順序が固定され、生成される `CLAUDE.md` がプロジェクト間で drift しなくなり、各セクションの内容はプロジェクトごとに適応できます。stack-detector の新しい `.env` パーサー（`lib/env-parser.js`）が `stack.envInfo` をプロンプトに供給し、port/host/API target 行が framework デフォルトではなくプロジェクトが実際に宣言した値と一致するようになります。

**Pass 4** は L4 メモリレイヤをスキャフォールディングします：永続的なチーム知識ファイル（decision-log、failure-patterns、compaction ポリシー、auto-rule-update）に加えて、これらのファイルをいつどのように読み書きするかを将来のセッションに指示する `60.memory/` ルール。メモリレイヤこそが、Claude Code がセッションごとに学びを再発見するのではなく、セッション間で蓄積することを可能にします。`--lang` が非英語の場合、フォールバック静的コンテンツは書き込み前に Claude を経由して翻訳されます。v2.1.0 では、Pass 3c が省略した場合に備えて `skills/00.shared/MANIFEST.md` の gap-fill が追加されました。

---

## 生成されるファイル構造

```
your-project/
│
├── CLAUDE.md                          ← Claude Code エントリーポイント（8セクション決定的構造、v2.2.0）
│
├── .claude/
│   └── rules/                         ← Glob トリガールール
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← 同期リマインダールール
│       └── 60.memory/                 ← L4 メモリオンデマンドスコープルール（v2.0.0）
│
├── claudeos-core/                     ← メイン出力ディレクトリ
│   ├── generated/                     ← 分析 JSON + 動的プロンプト + Pass マーカー（gitignore 対象）
│   │   ├── project-analysis.json      ← スタック情報（マルチスタック対応）
│   │   ├── domain-groups.json         ← type: backend/frontend 付きグループ
│   │   ├── pass1-backend-prompt.md    ← バックエンド分析プロンプト
│   │   ├── pass1-frontend-prompt.md   ← フロントエンド分析プロンプト（検出時）
│   │   ├── pass2-prompt.md            ← マージプロンプト
│   │   ├── pass2-merged.json          ← Pass 2 出力（Pass 3a のみが消費）
│   │   ├── pass3-context.json         ← Pass 3 用のスリム要約（< 5 KB、v2.1.0）
│   │   ├── pass3-prompt.md            ← Pass 3 プロンプトテンプレート（Phase 1 ブロック先頭追加）
│   │   ├── pass3a-facts.md            ← Pass 3a が書き、3b/3c/3d が読むファクトシート（v2.1.0）
│   │   ├── pass4-prompt.md            ← メモリスキャフォールディングプロンプト（v2.0.0）
│   │   ├── pass3-complete.json        ← Pass 3 完了マーカー（split モード：groupsCompleted を含む、v2.1.0）
│   │   ├── pass4-memory.json          ← Pass 4 完了マーカー（再実行時スキップ）
│   │   ├── rule-manifest.json         ← 検証ツール用ファイルインデックス
│   │   ├── sync-map.json              ← Plan ↔ disk マッピング（v2.1.0 では空；sync-checker 互換のため保持）
│   │   ├── stale-report.json          ← 統合検証結果
│   │   ├── .i18n-cache-<lang>.json    ← 翻訳キャッシュ（非英語 `--lang`）
│   │   └── .staged-rules/             ← `.claude/rules/` 書き込み用一時ステージングディレクトリ（自動移動 + クリーン）
│   ├── standard/                      ← コーディングスタンダード（15-19 ファイル + 60.domains/ 内のドメイン別）
│   │   ├── 00.core/                   ← 概要、アーキテクチャ、命名
│   │   ├── 10.backend-api/            ← API パターン（スタック固有）
│   │   ├── 20.frontend-ui/            ← フロントエンドパターン（検出時）
│   │   ├── 30.security-db/            ← セキュリティ、DB スキーマ、ユーティリティ
│   │   ├── 40.infra/                  ← 設定、ロギング、CI/CD
│   │   ├── 50.verification/           ← ビルド検証、テスト
│   │   ├── 60.domains/                ← ドメイン別スタンダード（Pass 3b-N が書き込む、v2.1.0）
│   │   └── 90.optional/               ← オプション規約（スタック固有エクストラ）
│   ├── skills/                        ← CRUD/ページスキャフォールディングスキル
│   │   └── 00.shared/MANIFEST.md      ← 登録済みスキルの単一の真実の源
│   ├── guide/                         ← オンボーディング、FAQ、トラブルシューティング（9 ファイル）
│   ├── database/                      ← DB スキーマ、マイグレーションガイド
│   ├── mcp-guide/                     ← MCP サーバ統合ガイド
│   └── memory/                        ← L4：チーム知識（4 ファイル）— コミットする
│       ├── decision-log.md            ← 設計決定の「なぜ」
│       ├── failure-patterns.md        ← 再発エラー & 修正（自動スコアリング — `npx claudeos-core memory score`）
│       ├── compaction.md              ← 4 ステージコンパクション戦略（`npx claudeos-core memory compact` で実行）
│       └── auto-rule-update.md        ← ルール改善提案（`npx claudeos-core memory propose-rules`）
│
└── claudeos-core-tools/               ← このツールキット（変更しない）
```

すべての standard ファイルは ✅ 正しい例、❌ 間違った例、ルール要約テーブルを含みます — すべて汎用テンプレートではなく、実際のコードパターンから導出されます。

> **v2.1.0 注意：** `claudeos-core/plan/` はもう生成されません。Master plan は Claude Code がランタイムで消費しない内部バックアップで、それらを Pass 3 で集約することが出力累積オーバーフローの主要因でした。バックアップ/復元には `git` を使用してください。v2.0.x からアップグレードするプロジェクトは、既存の `claudeos-core/plan/` ディレクトリを安全に削除できます。

### Gitignore 推奨事項

**コミットする**（チーム知識 — 共有が目的）：
- `CLAUDE.md` — Claude Code エントリーポイント
- `.claude/rules/**` — 自動ロードルール
- `claudeos-core/standard/**`、`skills/**`、`guide/**`、`database/**`、`mcp-guide/**`、`plan/**` — 生成されたドキュメント
- `claudeos-core/memory/**` — 決定履歴、失敗パターン、ルール提案

**コミットしない**（再生成可能なビルド成果物）：

```gitignore
# ClaudeOS-Core — 生成された分析 & 翻訳キャッシュ
claudeos-core/generated/
```

`generated/` ディレクトリには分析 JSON（`pass1-*.json`、`pass2-merged.json`）、プロンプト（`pass1/2/3/4-prompt.md`）、Pass 完了マーカー（`pass3-complete.json`、`pass4-memory.json`）、翻訳キャッシュ（`.i18n-cache-<lang>.json`）、一時ステージングディレクトリ（`.staged-rules/`）が含まれます — すべて `npx claudeos-core init` を再実行することで再構築可能です。

---

## プロジェクトサイズによる自動スケーリング

Pass 3 の split モードはステージ数をドメイン数に応じてスケールさせます。バッチのサブ分割は 16 ドメインから発動し、各ステージの出力を ~50 ファイル以下に抑えます。これは出力累積オーバーフローが始まる前の、`claude -p` にとって経験的に安全な範囲です。

| プロジェクトサイズ | ドメイン | Pass 3 ステージ数 | 合計 `claude -p` | 推定時間 |
|---|---|---|---|---|
| 小規模 | 1–4 | 4（`3a`、`3b-core`、`3c-core`、`3d-aux`） | 7（Pass 1 + 2 + Pass 3 4 ステージ + Pass 4） | ~10–15 分 |
| 中規模 | 5–15 | 4 | 8–9 | ~25–45 分 |
| 大規模 | 16–30 | **8**（3b、3c がそれぞれ 2 バッチに分割） | 11–12 | **~60–105 分** |
| 超大規模 | 31–45 | 10 | 13–14 | ~100–150 分 |
| 超超大規模 | 46–60 | 12 | 15–16 | ~150–200 分 |
| 超超超大規模 | 61+ | 14+ | 17+ | 200 分+ |

バッチ分割時のステージ数公式：`1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`（`N = ceil(totalDomains / 15)`）。

Pass 4（メモリスキャフォールディング）は、Claude 主導の生成または静的フォールバックのいずれが走るかによって、上に ~30 秒〜5 分を追加します。マルチスタックプロジェクト（例：Java + React）では、backend と frontend のドメインが合算されます。backend 6 + frontend 4 ドメイン = 合計 10 で中規模ティアになります。

---

## 検証ツール

ClaudeOS-Core には生成後に自動的に実行される 5 つの組み込み検証ツールが含まれています：

```bash
# すべてのチェックを一度に実行（推奨）
npx claudeos-core health

# 個別コマンド
npx claudeos-core validate     # Plan ↔ disk 比較
npx claudeos-core refresh      # Disk → Plan 同期
npx claudeos-core restore      # Plan → Disk リストア

# または node を直接使用（git clone ユーザー）
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| ツール | 役割 |
|---|---|
| **manifest-generator** | メタデータ JSON を構築（`rule-manifest.json`、`sync-map.json`、`stale-report.json` を初期化）；`memory/` を含む 7 ディレクトリをインデックス化（要約の `totalMemory`）。v2.1.0：master plan が廃止されたため `plan-manifest.json` は生成されなくなりました。 |
| **plan-validator** | 依然として `claudeos-core/plan/` を持つプロジェクト（レガシーアップグレードケース）向けに、master plan の `<file>` ブロックを disk と照合します。v2.1.0：`plan/` が存在しないか空の場合は `plan-sync-status.json` の出力をスキップします — `stale-report.json` はパスする no-op を引き続き記録します。 |
| **sync-checker** | 未登録ファイル（disk 上にあるが plan にない）と孤児エントリを検出 — 7 ディレクトリをカバー（v2.0.0 で `memory/` を追加）。`sync-map.json` にマッピングがない場合（v2.1.0 のデフォルト状態）でもクリーンに終了します。 |
| **content-validator** | 9 セクションの品質チェック — 空ファイル、✅/❌ 例の欠損、必須セクション、加えて L4 メモリスキャフォールドの整合性（decision-log 見出し日付、failure-pattern 必須フィールド、フェンス認識パース） |
| **pass-json-validator** | Pass 1–4 JSON 構造に加えて `pass3-complete.json`（split モード形状、v2.1.0）と `pass4-memory.json` 完了マーカーを検証 |

---

## Claude Code がドキュメントを使う仕組み

ClaudeOS-Core が生成するドキュメントは、Claude Code が実際に読み取るドキュメントです — その方法は以下のとおりです：

### Claude Code が自動的に読むファイル

| ファイル | タイミング | 保証 |
|---|---|---|
| `CLAUDE.md` | すべての会話開始時 | 常時 |
| `.claude/rules/00.core/*` | 任意のファイル編集時（`paths: ["**/*"]`） | 常時 |
| `.claude/rules/10.backend/*` | 任意のファイル編集時（`paths: ["**/*"]`） | 常時 |
| `.claude/rules/20.frontend/*` | フロントエンドファイル編集時（component/page/style パスにスコープ） | 条件付き |
| `.claude/rules/30.security-db/*` | 任意のファイル編集時（`paths: ["**/*"]`） | 常時 |
| `.claude/rules/40.infra/*` | config/infra ファイル編集時のみ（スコープ付き paths） | 条件付き |
| `.claude/rules/50.sync/*` | claudeos-core ファイル編集時のみ（スコープ付き paths） | 条件付き |
| `.claude/rules/60.memory/*` | `claudeos-core/memory/*` 編集時（memory パスにスコープ） — オンデマンドメモリレイヤを**どのように**読み書きするかを指示 | 条件付き（v2.0.0） |

### Claude Code がルール参照経由でオンデマンドで読むもの

各ルールファイルは `## Reference` セクションを通じて対応する standard にリンクします。Claude は現在のタスクに関連する standard のみを読みます：

- `claudeos-core/standard/**` — コーディングパターン、✅/❌ 例、命名規約
- `claudeos-core/database/**` — DB スキーマ（クエリ、マッパー、マイグレーション用）
- `claudeos-core/memory/**`（v2.0.0）— L4 チーム知識レイヤ；**自動ロードされない**（すべての会話でノイジーになりすぎる）。代わりに、`60.memory/*` ルールが Claude にこれらのファイルを*いつ* Read するかを指示：セッション開始時（最近の `decision-log.md` + 重要度の高い `failure-patterns.md` をスキム）、決定を下すか再発エラーに遭遇したときにオンデマンドで追記。

`00.standard-reference.md` は、対応するルールがない standard を発見するためのすべての standard ファイルのディレクトリとして機能します。

### Claude Code が読まないもの（コンテキスト節約）

これらのフォルダは standard-reference ルールの `DO NOT Read` セクションを通じて明示的に除外されます：

| フォルダ | 除外理由 |
|---|---|
| `claudeos-core/plan/` | レガシープロジェクト（v2.0.x 以前）の master plan バックアップ。v2.1.0 では生成されません。存在しても Claude Code は自動ロードしません — オンデマンド読み込みのみ。 |
| `claudeos-core/generated/` | ビルドメタデータ JSON、プロンプト、Pass マーカー、翻訳キャッシュ、`.staged-rules/`。コーディング用ではありません。 |
| `claudeos-core/guide/` | 人間向けオンボーディングガイド。 |
| `claudeos-core/mcp-guide/` | MCP サーバドキュメント。コーディング用ではありません。 |
| `claudeos-core/memory/`（自動ロード） | **自動ロード無効化**設計 — すべての会話でコンテキストが肥大化。代わりに `60.memory/*` ルール経由でオンデマンド読み込み（例：セッション開始時の `failure-patterns.md` スキャン）。常にコミットする。 |

---

## 日常のワークフロー

### インストール後

```
# Claude Code を通常通り使用するだけ — スタンダードを自動的に参照します：
"order ドメインの CRUD を作成して"
"ユーザープロファイル更新 API を追加して"
"このコードをプロジェクトのパターンに合わせてリファクタリングして"
```

### スタンダードを手動編集した後

```bash
# standard や rules ファイルを編集した後：
npx claudeos-core refresh

# すべての整合性を確認
npx claudeos-core health
```

### ドキュメントが壊れたとき

```bash
# v2.1.0 推奨：master plan が生成されなくなったため、git を使って復元します。
# 生成ドキュメントを定期的にコミットしておけば、再生成せずに特定ファイルだけ
# ロールバックできます：
git checkout HEAD -- .claude/rules/ claudeos-core/

# レガシー（claudeos-core/plan/ が残っている v2.0.x プロジェクト）：
npx claudeos-core restore
```

### メモリレイヤメンテナンス（v2.0.0）

L4 メモリレイヤ（`claudeos-core/memory/`）はセッション間でチーム知識を蓄積します。3 つの CLI サブコマンドが健全性を維持します：

```bash
# Compact：4 ステージコンパクションポリシーを適用（定期的 — 例：月次）
npx claudeos-core memory compact
#   Stage 1：古いエントリを要約（>30 日、本文 → 一行）
#   Stage 2：重複見出しをマージ（frequency 合算、最新の fix を保持）
#   Stage 3：低重要度 + 古いものをドロップ（importance <3 AND lastSeen >60 日）
#   Stage 4：ファイルあたり 400 行の上限を強制（最も古い低重要度から先にドロップ）

# Score：failure-patterns.md エントリを重要度で再ランク付け
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5)、最大 10
#   複数の新しい失敗パターンを追加後に実行

# Propose-rules：再発する失敗から候補ルール追加を提示
npx claudeos-core memory propose-rules
#   frequency ≥ 3 の failure-patterns.md エントリを読み込み
#   confidence を計算（重み付けエビデンスに sigmoid × アンカー倍率）
#   memory/auto-rule-update.md に提案を書き込み（自動適用されない）
#   Confidence ≥ 0.70 は真剣な検討に値する；受諾 → ルール編集 + 決定を記録

# v2.1.0：`memory --help` はサブコマンドのヘルプを表示するようになりました（以前はトップレベルが表示されていました）
npx claudeos-core memory --help
```

> **v2.1.0 修正：** `memory score` は初回実行後に `importance` 行を重複して残さなくなりました（以前は自動スコアリング行が上に追加され、元のプレーン行が下に残っていました）。`memory compact` の Stage 1 サマリーマーカーは正しい Markdown のリスト項目（`- _Summarized on ..._`）になったため、きれいにレンダリングされ、以降のコンパクションでも正しく再パースされます。

メモリに書くタイミング（Claude がオンデマンドで行いますが、手動編集も可能）：
- **`decision-log.md`** — 競合するパターン間で選択するとき、ライブラリを選ぶとき、チーム規約を定義するとき、または何かを*やらない*と決めるときに新しいエントリを追記。追記のみ；履歴エントリは決して編集しない。
- **`failure-patterns.md`** — 再発エラーまたは自明でない根本原因の**2 回目の発生時**に追記。初回エラーはエントリ不要。
- `compaction.md` と `auto-rule-update.md` — 上記の CLI サブコマンドが生成/管理；手動編集しない。

### CI/CD 統合

```yaml
# GitHub Actions の例
- run: npx claudeos-core validate
# Exit code 1 で PR がブロックされる

# オプション：月次メモリハウスキーピング（別 cron ワークフロー）
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## 何が違うのか？

### 他の Claude Code ツールとの比較

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **アプローチ** | コードが先に分析、次に LLM が生成 | 事前構築された設定プリセット | LLM がエージェントチームを設計 | LLM がスペックドキュメントを生成 | LLM が CLAUDE.md を書く |
| **ソースコードを読む** | ✅ 決定論的静的解析 | ❌ | ❌ | ❌ (LLM が読む) | ❌ (LLM が読む) |
| **スタック検出** | コードが確定（ORM、DB、ビルドツール、pkg manager） | N/A（スタック非依存） | LLM が推測 | LLM が推測 | LLM が推測 |
| **ドメイン検出** | コードが確定（Java 5 patterns、Kotlin CQRS、Next.js FSD） | N/A | LLM が推測 | N/A | N/A |
| **同じプロジェクト → 同じ結果** | ✅ 決定論的分析 | ✅（静的ファイル） | ❌（LLM は揺れる） | ❌（LLM は揺れる） | ❌（LLM は揺れる） |
| **大規模プロジェクトへの対応** | ドメイングループ分割（4 ドメイン / 40 ファイル / グループ） | N/A | 分割なし | 分割なし | コンテキストウィンドウ制限 |
| **出力** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans（40-50+ ファイル） | Agents + Skills + Commands + Hooks | Agents + Skills | 6 スペックドキュメント | CLAUDE.md（1 ファイル） |
| **出力場所** | `.claude/rules/`（Claude Code が自動ロード） | `.claude/` 各種 | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **生成後検証** | ✅ 5 つの自動バリデータ | ❌ | ❌ | ❌ | ❌ |
| **多言語出力** | ✅ 10 言語 | ❌ | ❌ | ❌ | ❌ |
| **マルチスタック** | ✅ Backend + Frontend 同時 | ❌ スタック非依存 | ❌ | ❌ | 部分的 |
| **永続メモリレイヤ** | ✅ L4 — 決定ログ + 失敗パターン + 自動スコア付きルール提案（v2.0.0） | ❌ | ❌ | ❌ | ❌ |
| **エージェントオーケストレーション** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### 一文にまとめた重要な違い

**他のツールは Claude に「一般的に良い指示」を与えます。ClaudeOS-Core は Claude に「あなたの実際のコードから抽出された指示」を与えます。**

だから Claude Code は MyBatis プロジェクトで JPA コードを生成しなくなり、
コードベースが `ok()` を使っているときに `success()` を使わなくなり、
プロジェクトが `controller/user/` を使うときに `user/controller/` ディレクトリを作成しなくなるのです。

### 競合ではなく補完

ClaudeOS-Core は**プロジェクト固有のルールとスタンダード**にフォーカスします。
他のツールは**エージェントオーケストレーションとワークフロー**にフォーカスします。

ClaudeOS-Core を使ってプロジェクトのルールを生成し、その上に ECC や Harness を乗せてエージェントチームとワークフロー自動化を構築できます。異なる問題を解決しています。

---

## FAQ

**Q：ソースコードを変更しますか？**
いいえ。`CLAUDE.md`、`.claude/rules/`、`claudeos-core/` を作成するだけです。既存のコードは決して変更されません。

**Q：コストはどのくらいですか？**
4 つの Pass をまたいで `claude -p` を複数回呼び出します。v2.1.0 の split モードでは、Pass 3 だけでもプロジェクトサイズに応じて 4〜14+ ステージに展開されます（[自動スケーリング](#プロジェクトサイズによる自動スケーリング) を参照）。典型的な小規模プロジェクト（1〜15 ドメイン）で合計 8〜9 回の `claude -p` 呼び出し；18 ドメインのプロジェクトで 11 回；60 ドメインのプロジェクトで 15〜17 回。各ステージはフレッシュなコンテキストウィンドウで実行されます — 呼び出しあたりのトークンコストは、どのステージも全体のファイルツリーを 1 つのコンテキストに保持する必要がないため、単一呼び出しの Pass 3 時代より実際は低くなっています。`--lang` が非英語の場合、静的フォールバックパスは翻訳のために追加の `claude -p` 呼び出しを数回行うことがあります；結果は `claudeos-core/generated/.i18n-cache-<lang>.json` にキャッシュされ、その後の実行で再利用されます。これは通常の Claude Code 使用量の範囲内です。

**Q：Pass 3 split モードとは何ですか？なぜ v2.1.0 で追加されたのですか？**
v2.1.0 より前の Pass 3 は、生成されたファイルツリー全体（`CLAUDE.md`、standards、rules、skills、guides — 通常 30〜60 ファイル）を 1 回のレスポンスで出力しなければならない単一の `claude -p` 呼び出しでした。小規模プロジェクトでは機能しましたが、~5 ドメインで確実に `Prompt is too long` の出力累積失敗にぶつかっていました。失敗は入力サイズから予測できず、生成される各ファイルの冗長度合いに依存し、同じプロジェクトでも断続的に発生しました。Split モードはこの問題を構造的に回避します：Pass 3 は順次ステージ（`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`）に分割され、それぞれがフレッシュなコンテキストウィンドウを持つ独立した `claude -p` 呼び出しです。ステージをまたいだ整合性は `pass3a-facts.md` — 以降のすべてのステージが `pass2-merged.json` を再読み込みせずに参照する 5〜10 KB の蒸留されたファクトシート — によって保持されます。`pass3-complete.json` マーカーは `groupsCompleted` 配列を持ち、`3c-2` 実行中のクラッシュは `3a` からではなく `3c-2` から再開するため、トークンコストの倍増を避けられます。
**Q：生成されたファイルを Git にコミットすべきですか？**
はい、推奨します。チームが同じ Claude Code スタンダードを共有できます。`claudeos-core/generated/` を `.gitignore` に追加することを検討してください（分析 JSON は再生成可能）。

**Q：混合スタックプロジェクト（例：Java backend + React frontend）はどうですか？**
完全にサポートされています。ClaudeOS-Core は両方のスタックを自動検出し、ドメインを `backend` または `frontend` としてタグ付けし、それぞれにスタック固有の分析プロンプトを使用します。Pass 2 がすべてをマージし、Pass 3 は split ステージ群全体で backend と frontend の両方のスタンダードを生成します — backend ドメインはいくつかの 3b/3c バッチに、frontend ドメインは別のバッチに入り、すべてが同じ `pass3a-facts.md` を参照して整合性を保ちます。

**Q：Turborepo / pnpm workspaces / Lerna モノレポで動作しますか？**
はい。ClaudeOS-Core は `turbo.json`、`pnpm-workspace.yaml`、`lerna.json`、または `package.json#workspaces` を検出し、サブパッケージの `package.json` ファイルをスキャンして framework/ORM/DB 依存関係を自動検索します。ドメインスキャンは `apps/*/src/` と `packages/*/src/` パターンをカバーします。モノレポのルートから実行してください。

**Q：再実行すると何が起きますか？**
以前の Pass 1/2 結果が存在する場合、インタラクティブプロンプトが選択を提示します：**Continue**（停止した場所から再開）または **Fresh**（すべて削除して最初からやり直し）。`--force` でプロンプトをスキップして常に Fresh で開始します。v2.1.0 の split モードでは、Pass 3 の再開はステージ粒度で動作します — 実行が `3c-2` 中にクラッシュした場合、次の `init` は `3a` から再実行する（トークンコストが倍増する）のではなく `3c-2` から再開します。`pass3-complete.json` マーカーはこのロジックを駆動するため `mode: "split"` に加えて `groupsCompleted` 配列を記録します。

**Q：NestJS は独自のテンプレートを使用するか、それとも Express のものを使用しますか？**
NestJS は NestJS 固有の分析カテゴリを備えた専用の `node-nestjs` テンプレートを使用します：`@Module`、`@Injectable`、`@Controller` デコレータ、Guards、Pipes、Interceptors、DI コンテナ、CQRS パターン、`Test.createTestingModule`。Express プロジェクトは別の `node-express` テンプレートを使用します。

**Q：Vue / Nuxt プロジェクトは？**
Vue/Nuxt は Composition API、`<script setup>`、defineProps/defineEmits、Pinia ストア、`useFetch`/`useAsyncData`、Nitro サーバルート、`@nuxt/test-utils` をカバーする専用の `vue-nuxt` テンプレートを使用します。Next.js/React プロジェクトは `node-nextjs` テンプレートを使用します。

**Q：Kotlin をサポートしていますか？**
はい。ClaudeOS-Core は `build.gradle.kts` または `build.gradle` の kotlin plugin から Kotlin を自動検出します。Kotlin 固有の分析（data classes、sealed classes、coroutines、拡張関数、MockK など）を備えた専用の `kotlin-spring` テンプレートを使用します。

**Q：CQRS / BFF アーキテクチャは？**
Kotlin マルチモジュールプロジェクトで完全にサポートされています。ClaudeOS-Core は `settings.gradle.kts` を読み取り、モジュール名からモジュールタイプ（command、query、bff、integration）を検出し、Command/Query モジュール間で同じドメインをグループ化します。生成されるスタンダードには、command controllers と query controllers の別々のルール、BFF/Feign パターン、モジュール間通信規約が含まれます。

**Q：Gradle マルチモジュールモノレポは？**
ClaudeOS-Core はネスト深度に関係なくすべてのサブモジュール（`**/src/main/kotlin/**/*.kt`）をスキャンします。モジュールタイプは命名規約から推論されます（例：`reservation-command-server` → domain: `reservation`、type: `command`）。共有ライブラリ（`shared-lib`、`integration-lib`）も検出されます。

**Q：L4 メモリレイヤ（v2.0.0）とは？`claudeos-core/memory/` をコミットすべきですか？**
はい — `claudeos-core/memory/` を**常にコミット**してください。これは永続的なチーム知識です：`decision-log.md` はアーキテクチャ選択の*理由*を記録（追記のみ）、`failure-patterns.md` は再発エラーを重要度スコアとともに登録して将来のセッションで回避できるようにし、`compaction.md` は 4 ステージコンパクションポリシーを定義し、`auto-rule-update.md` は機械生成されたルール改善提案を収集します。ルール（パスごとに自動ロード）とは異なり、メモリファイルは**オンデマンド** — `60.memory/*` ルールがそう指示したときにのみ Claude が読みます（例：セッション開始時の重要度の高い失敗のスキャン）。これによりコンテキストコストを低く保ちながら、長期的な知識を保持します。

**Q：Pass 4 が失敗したらどうなりますか？**
自動化パイプライン（`npx claudeos-core init`）には静的フォールバックがあります：`claude -p` が失敗するか `pass4-prompt.md` が欠損している場合、`lib/memory-scaffold.js` を通じてメモリレイヤを直接スキャフォールディングします。`--lang` が非英語の場合、静的フォールバックは `claude` CLI 経由で**必ず**翻訳する必要があります — それも失敗すれば、実行は `InitError` で中止されます（静かな英語フォールバックはなし）。`claude` が認証されているときに再実行するか、`--lang en` を使用して翻訳をスキップしてください。翻訳結果は `claudeos-core/generated/.i18n-cache-<lang>.json` にキャッシュされ、その後の実行で再利用されます。

**Q：`memory compact` / `memory score` / `memory propose-rules` は何をしますか？**
上記の [メモリレイヤメンテナンス](#メモリレイヤメンテナンスv200) セクションを参照してください。要約：`compact` は 4 ステージポリシー（古いものを要約、重複をマージ、低重要度の古いものをドロップ、400 行上限を強制）を実行；`score` は `failure-patterns.md` を重要度（frequency × recency）で再ランク付け；`propose-rules` は再発する失敗から `auto-rule-update.md` への候補ルール追加を提示（自動適用されない — 手動で検討して受諾/拒否）。

**Q：なぜ `--force`（または "fresh" 再開モード）は `.claude/rules/` を削除するのですか？**
v2.0.0 で Pass 3 の silent-failure ガードが 3 つ追加されました（Guard 3 は 2 つの不完全出力のバリアントをカバー：`guide/` 向けの H2 と `standard/skills` 向けの H1）。Guard 1（「部分 staged-rules 移動」）と Guard 3（「不完全出力 — guide ファイル欠損/空または standard センチネル欠損 / skills 空」）は既存ルールに依存しませんが、Guard 2（「ゼロルール検出」）は依存します — Claude が `staging-override.md` ディレクティブを無視して `.claude/` に直接書き込もうとしたときに発動します（Claude Code の sensitive-path ポリシーがブロックする場所）。以前の実行からの古いルールが Guard 2 を false-negative にする可能性があるため — `--force`/`fresh` は `.claude/rules/` を消去してクリーンな検出を保証します。**ルールファイルへの手動編集は `--force`/`fresh` では失われます**；必要ならば事前にバックアップしてください。（v2.1.0 注意：Guard 3 H1 は master plan が生成されなくなったため `plan/` をもうチェックしません。）

**Q：`claudeos-core/generated/.staged-rules/` とは何ですか、そしてなぜ存在するのですか？**
Claude Code の sensitive-path ポリシーは `claude -p` サブプロセスから `.claude/` への直接書き込みを拒否します（`--dangerously-skip-permissions` を使用してもです）。v2.0.0 は Pass 3/4 プロンプトにすべての `.claude/rules/` 書き込みをステージングディレクトリにリダイレクトさせることでこれを回避します；その後 Node.js オーケストレータ（このポリシーの対象外）が各パス後に staged ツリーを `.claude/rules/` に移動します。これはユーザーに透過的です — ディレクトリは自動作成、自動クリーン、自動移動されます。以前の実行が移動途中でクラッシュした場合、次の実行はリトライ前にステージングディレクトリを消去します。v2.1.0 の split モードでは、ステージランナーは staged rules を終了時だけでなく**各ステージ後**に `.claude/rules/` に移動するため、Pass 3 の途中でクラッシュしても以前に完了したステージのルールはそのまま残ります。

**Q：`npx claudeos-core init` の代わりに Pass 3 を手動で実行できますか？**
小規模プロジェクト（≤5 ドメイン）ならはい — [Step 6](#step-6pass-3--すべてのドキュメントを生成複数ステージに分割) の単一呼び出し手動手順は引き続き動作します。それより大きいプロジェクトでは `npx claudeos-core init` を使用すべきです。split ランナーこそが、フレッシュなコンテキストでのステージ単位実行をオーケストレーションし、16 ドメイン以上でのバッチサブ分割を処理し、正しい `pass3-complete.json` マーカー形状（`mode: "split"` + `groupsCompleted`）を書き込み、ステージ間の staged rules を移動するからです。このオーケストレーションを手で再現することは可能ですが、手間がかかります。ステージを手動で実行する理由がある場合（例：特定ステージのデバッグ）、適切な `STAGE:` ディレクティブで `pass3-prompt.md` をテンプレート化して直接 `claude -p` に投入できます — ただし、各ステージ後に `.staged-rules/` を移動し、マーカーを自分で更新することを忘れないでください。

**Q：私のプロジェクトは v2.0.x からのアップグレードで、既存の `claudeos-core/plan/` ディレクトリがあります。どうすれば良いですか？**
特に何もする必要はありません — v2.1.0 のツールは `plan/` が存在しないか空の場合それを無視し、`plan-validator` は後方互換性のために plan/ が入っているレガシープロジェクトを引き続き処理します。master plan バックアップが不要なら `claudeos-core/plan/` を安全に削除できます（いずれにせよ git 履歴の方がバックアップとして優れています）。`plan/` を残す場合、`npx claudeos-core init` を実行してもそれは更新されません — v2.1.0 では新しい内容は master plan に集約されません。検証ツールは両方のケースをクリーンに扱います。

---

## テンプレート構造

```
pass-prompts/templates/
├── common/                  # 共有 header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # 役割 + 出力フォーマット指示（全 pass 共通）
│   ├── pass3-footer.md       # Pass 3 完了後の health-check 指示 + 5 つの CRITICAL ガードレールブロック (v2.2.0)
│   ├── pass3-phase1.md       # 「Read Once, Extract Facts」ブロック（Rule A-E）(v2.1.0)
│   ├── pass4.md              # メモリスキャフォールディングプロンプト (v2.0.0)
│   ├── staging-override.md   # .claude/rules/** の書き込みを .staged-rules/** にリダイレクト (v2.0.0)
│   ├── claude-md-scaffold.md # 決定論的 8 セクション CLAUDE.md テンプレート (v2.2.0)
│   └── lang-instructions.json # 言語別出力指示（10 言語）
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` がスタックを自動検出し、タイプ固有のプロンプトを組み立てます。NestJS、Vue/Nuxt、Vite SPA、Flask はそれぞれフレームワーク固有の分析カテゴリを備えた専用テンプレートを使用します（例：NestJS の `@Module`/`@Injectable`/Guards；Vue の `<script setup>`/Pinia/useFetch；Vite の client-side routing/`VITE_` env；Flask の Blueprint/`app.factory`/Flask-SQLAlchemy）。マルチスタックプロジェクトでは、`pass1-backend-prompt.md` と `pass1-frontend-prompt.md` が別々に生成され、`pass3-prompt.md` は両方のスタックの生成ターゲットを結合します。v2.1.0 では、Pass 3 テンプレートの先頭に `common/pass3-phase1.md`（Rule A–E を含む「Read Once, Extract Facts」ブロック）が追加された後、split モードのステージごとにスライスされます。Pass 4 はスタックに関係なく共有の `common/pass4.md` テンプレート（メモリスキャフォールディング）を使用します。

**v2.2.0 では**、Pass 3 プロンプトは phase1 ブロックとスタック固有本体の間に `common/claude-md-scaffold.md`（決定論的 8 セクション CLAUDE.md テンプレート）もインラインで埋め込みます — これによりセクション構造がプロジェクト間でずれることなく、内容はプロジェクトごとに適応します。テンプレートは **English-first** で記述され、`lang-instructions.json` からの言語注入が LLM に対して出力時にセクションタイトルと散文を対象出力言語に翻訳するよう指示します。

---

## モノレポサポート

ClaudeOS-Core は JS/TS モノレポ構成を自動検出し、サブパッケージの依存関係をスキャンします。

**サポートされているモノレポマーカー**（自動検出）：
- `turbo.json`（Turborepo）
- `pnpm-workspace.yaml`（pnpm workspaces）
- `lerna.json`（Lerna）
- `package.json#workspaces`（npm/yarn workspaces）

**モノレポのルートから実行してください** — ClaudeOS-Core は `apps/*/package.json` と `packages/*/package.json` を読み取って、サブパッケージ全体の framework/ORM/DB 依存関係を発見します：

```bash
cd my-monorepo
npx claudeos-core init
```

**検出されるもの：**
- `apps/web/package.json` からの依存関係（例：`next`、`react`）→ frontend スタック
- `apps/api/package.json` からの依存関係（例：`express`、`prisma`）→ backend スタック
- `packages/db/package.json` からの依存関係（例：`drizzle-orm`）→ ORM/DB
- `pnpm-workspace.yaml` からのカスタムワークスペースパス（例：`services/*`）

**ドメインスキャンもモノレポレイアウトをカバーします：**
- backend ドメイン向け `apps/api/src/modules/*/` と `apps/api/src/*/`
- frontend ドメイン向け `apps/web/app/*/`、`apps/web/src/app/*/`、`apps/web/pages/*/`
- 共有パッケージドメイン向け `packages/*/src/*/`

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

> **注意：** Kotlin/Java モノレポでは、マルチモジュール検出は `settings.gradle.kts` を使用します（上記の [Kotlin マルチモジュールドメイン検出](#kotlin-マルチモジュールドメイン検出) を参照）。JS モノレポマーカーは不要です。

## トラブルシューティング

**"claude: command not found"** — Claude Code CLI がインストールされていないか、PATH にありません。[Claude Code ドキュメント](https://code.claude.com/docs/en/overview)を参照してください。

**"npm install failed"** — Node.js バージョンが低すぎる可能性があります。v18+ が必要です。

**"0 domains detected"** — プロジェクト構造が非標準かもしれません。スタック別の検出パターンは上記を参照してください。

**Kotlin プロジェクトで "0 domains detected"** — プロジェクトのルートに `build.gradle.kts`（または kotlin plugin を含む `build.gradle`）があり、ソースファイルが `**/src/main/kotlin/` 配下にあることを確認してください。マルチモジュールプロジェクトでは、`settings.gradle.kts` に `include()` ステートメントが含まれていることを確認してください。単一モジュールの Kotlin プロジェクト（`settings.gradle` なし）もサポートされています — ドメインは `src/main/kotlin/` 配下のパッケージ/クラス構造から抽出されます。

**"Language detected as java instead of kotlin"** — ClaudeOS-Core は最初にルートの `build.gradle(.kts)` をチェックし、次にサブモジュールビルドファイルをチェックします。ルートビルドファイルが `kotlin` なしで `java` plugin を使用していても、サブモジュールが Kotlin を使用する場合、ツールはフォールバックとして最大 5 つのサブモジュールビルドファイルをチェックします。それでも検出されない場合、少なくとも 1 つの `build.gradle.kts` に `kotlin("jvm")` または `org.jetbrains.kotlin` が含まれていることを確認してください。

**"CQRS not detected"** — アーキテクチャ検出はモジュール名に `command` と `query` キーワードが含まれていることに依存します。モジュールが異なる命名（例：`write-server`、`read-server`）を使用している場合、CQRS アーキテクチャは自動検出されません。plan-installer 実行後、生成されたプロンプトを手動で調整できます。

**"Pass 3 produced 0 rule files under .claude/rules/"（v2.0.0）** — Guard 2 が発動しました：Claude は `staging-override.md` ディレクティブを無視して `.claude/` に直接書き込もうとしましたが、そこは Claude Code の sensitive-path ポリシーが書き込みをブロックする場所です。`npx claudeos-core init --force` で再実行してください。エラーが続く場合、`claudeos-core/generated/pass3-prompt.md` を調べて `staging-override.md` ブロックが最上部にあることを確認してください。

**"Pass 3 finished but N rule file(s) could not be moved from staging"（v2.0.0）** — Guard 1 が発動しました：ステージング移動が一時的なファイルロック（通常 Windows のアンチウィルスまたはファイルウォッチャ）にヒットしました。マーカーは書き込まれないので、次の `init` 実行は Pass 3 を自動的にリトライします。`npx claudeos-core init` を再実行するだけです。

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty"（v2.0.0）** — Guard 3 (H2) が発動しました：Claude は CLAUDE.md + rules を書き込んだ後、`claudeos-core/guide/` セクション（9 ファイル期待）の完了前（または開始前）に応答途中で切り詰められました。BOM のみまたは空白のみのファイルでも発動します（見出しは書かれたが本文が切り詰められた）。このガードがなければ完了マーカーが書き込まれ、その後の実行で `guide/` は永続的に空のままになります。マーカーはここでは書き込まれないので、次の `init` 実行は同じ Pass 2 結果から Pass 3 をリトライします。繰り返し発生する場合、`npx claudeos-core init --force` を使用して最初から再生成してください。

**"Pass 3 finished but the following required output(s) are missing or empty"（v2.0.0、v2.1.0 で更新）** — Guard 3 (H1) が発動しました：Claude は `claudeos-core/guide/` の後、しかし `claudeos-core/standard/` または `claudeos-core/skills/` の前（または途中）で切り詰められました。要件：(a) `standard/00.core/01.project-overview.md` が存在し空でない（すべてのスタックの Pass 3 プロンプトが書き込むセンチネル）、(b) `skills/` に空でない `.md` が 1 つ以上。`database/` と `mcp-guide/` は意図的に除外されています（一部のスタックは正当にゼロファイルを生成します）。`plan/` は v2.1.0 以降チェックされません（master plan が廃止されたため）。Guard 3 (H2) と同じ復旧パス：`init` を再実行、または持続する場合は `--force`。

**"Pass 3 split stage crashed partway through (v2.1.0)"** — split ステージのいずれか（例：`3b-1`、`3c-2`）が実行途中で失敗すると、ステージレベルのマーカーは書き込まれませんが、完了したステージは `pass3-complete.json.groupsCompleted` に記録されます。次の `init` 実行はこの配列を読み、完了済みの作業をすべてスキップして、最初の未完了ステージから再開します。手動操作は不要です — `npx claudeos-core init` を再実行するだけです。同じステージで resume が繰り返し失敗する場合、`claudeos-core/generated/pass3-prompt.md` の内容不正を検査し、それから `--force` で完全再起動を試みてください。`pass3-complete.json` の形状（`mode: "split"`、`groupsCompleted: [...]`）は安定しています；マーカー欠損または形状不正の場合、Pass 3 全体が `3a` から再実行されます。

**"Pass 3 stale marker (shape mismatch) — treating as incomplete"（v2.1.0）** — pre-v2.1.0 の単一呼び出し実行による `pass3-complete.json` が新しい split モードのルールで解釈されています。形状チェックは `mode: "split"` と `groupsCompleted` 配列の有無を確認します；いずれかが欠損していればマーカーは部分的とみなされ、Pass 3 は split モードで再実行されます。v2.0.x からアップグレードした場合、これは一度だけ想定される挙動です — 次の実行で正しいマーカー形状が書き込まれます。操作は不要です。

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running"（v2.0.0）** — エラーではなく情報ログです。再開時、`init` は `pass2-merged.json` をパースして検証するようになりました（最上位キー 5 個以上必要、`pass-json-validator` の `INSUFFICIENT_KEYS` しきい値をミラー）。以前のクラッシュした実行からのスケルトン `{}` または不正な JSON は自動的に削除され、Pass 2 が再実行されます。手動操作は不要 — パイプラインは自己修復します。繰り返し発生する場合、`claudeos-core/generated/pass2-prompt.md` を検査して `--force` でリトライしてください。

**"Static fallback failed while translating to lang='ko'"（v2.0.0）** — `--lang` が非英語の場合、Pass 4 / 静的フォールバック / gap-fill はすべて `claude` CLI で翻訳する必要があります。翻訳が失敗した場合（CLI が未認証、ネットワークタイムアウト、または strict validation が出力を拒否：<40% 長さ、壊れたコードフェンス、失われた frontmatter など）、実行は静かに英語を書き込むのではなく中止されます。修正：`claude` が認証されていることを確認するか、`--lang en` で再実行して翻訳をスキップ。

**"pass4-memory.json exists but memory/ is empty"（v2.0.0）** — 以前の実行がマーカーを書き込みましたが、ユーザー（またはクリーンアップスクリプト）が `claudeos-core/memory/` を削除しました。CLI はこの古いマーカーを自動検出し、次の `init` で Pass 4 を再実行します。手動操作は不要です。

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4"（v2.0.0）** — エラーではなく情報ログです。Pass 4 マーカーコンテンツは検証されるようになりました（`passNum === 4` + 空でない `memoryFiles` 配列、存在だけでなく）。`{"error":"timeout"}` のようなマーカー本文として出力した Claude の部分的失敗は、以前は永続的に成功として受理されましたが、現在はマーカーが削除され、Pass 4 が自動的に再実行されます。

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError（v2.0.0）** — `init` は古いマーカーを検出し（Pass 3：CLAUDE.md が外部で削除された；Pass 4：memory/ が空またはマーカー本文が不正）、それを削除しようとしましたが、`unlinkSync` 呼び出しが失敗しました — 通常 Windows のアンチウィルスまたはファイルウォッチャ（エディタ、IDE インデクサ）がファイルハンドルを保持しているためです。以前はこれが静かに無視され、パイプラインがパスをスキップして古いマーカーを再利用していました。現在は明確に失敗します。修正：ファイルを開いている可能性のあるエディタ/AV スキャナを閉じて、`npx claudeos-core init` を再実行してください。

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError（v2.0.0）** — シェルでテスト専用の環境変数 `CLAUDEOS_SKIP_TRANSLATION=1` が設定されており（おそらく CI/テスト設定の残り物）、かつ非英語 `--lang` を選択しました。この環境変数は、Pass 4 の静的フォールバックと gap-fill が非英語出力のために依存する翻訳パスをショートサーキットします。`init` は言語選択時に競合を検出し、即座に中止します（Pass 4 の途中で紛らわしいネストされたエラーでクラッシュするのではなく）。修正：実行前に `unset CLAUDEOS_SKIP_TRANSLATION` するか、`npx claudeos-core init --lang en` を使用してください。

**"⚠️ v2.2.0 upgrade detected" 警告 (v2.2.0)** — 既存の `CLAUDE.md` が v2.2.0 以前のバージョンで生成されている状態。デフォルトの resume モード再生成は Rule B idempotency により既存ファイルをスキップするため、v2.2.0 の構造改善（8 セクション CLAUDE.md scaffold、`40.infra/*` ファイル別 paths、`.env.example` ベースのポート精度、Section 8 `Common Rules & Memory (L4)` 再設計（共通ルール・L4 メモリの 2 つのサブセクション構造）、`60.memory/*` ルール行、forward-reference された `04.doc-writing-guide.md`）が適用されません。解決: `npx claudeos-core init --force` で再実行。生成ファイル（`CLAUDE.md`、`.claude/rules/`、`claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/`）は上書きされますが、`claudeos-core/memory/` コンテンツ（ユーザーが蓄積した decision-log、failure-patterns エントリー — append-only）は完全に保持されます。上書き前に diff を確認したい場合は、`--force` 実行前にプロジェクトを git commit してください。

**CLAUDE.md の port が `.env.example` と異なる (v2.2.0)** — v2.2.0 の新しい `.env` パーサー（`lib/env-parser.js`）は `.env.example` を優先的に読み（コミットされた canonical ファイル）、fallback として `.env` バリアントを読みます。認識されるポート変数名: `PORT`、`VITE_PORT`、`VITE_DESKTOP_PORT`、`NEXT_PUBLIC_PORT`、`NUXT_PORT`、`DJANGO_PORT` など。Spring Boot の場合、`application.yml` の `server.port` が依然として `.env` より優先されます（framework-native config が優先）。プロジェクトが非標準 env 変数名を使用する場合は、慣例名に変更するか `PORT_VAR_KEYS` 拡張を issue でリクエストしてください。framework デフォルト（Vite 5173、Next.js 3000、Django 8000）は、直接検出と `.env` の両方がサイレントな場合のみ使用されます。

**生成されたドキュメントで値が `***REDACTED***` と表示される (v2.2.0)** — 意図された動作です。v2.2.0 の `.env` パーサーは `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` パターンにマッチする変数値を自動的に `***REDACTED***` に置換してすべての生成器に渡します。`.env.example` に誤ってコミットされた機密情報に対する defense-in-depth 保護です。`DATABASE_URL` は stack-detector DB 識別 back-compat のため保持されます。生成された `CLAUDE.md` テーブルで `***REDACTED***` が見られる場合はバグなので issue を提出してください — redacted 値はテーブルに到達すべきではありません。非機密ランタイム設定（port、host、API target、NODE_ENV など）は変更なく通過します。

---

## 貢献

貢献は歓迎します！最も必要とされている領域：

- **新しいスタックテンプレート** — Ruby/Rails、Go (Gin/Fiber/Echo)、PHP (Laravel/Symfony)、Rust (Axum/Actix)、Svelte/SvelteKit、Remix
- **IDE 統合** — VS Code 拡張機能、IntelliJ プラグイン
- **CI/CD テンプレート** — GitLab CI、CircleCI、Jenkins の例（GitHub Actions はすでに付属 — `.github/workflows/test.yml` 参照）
- **テストカバレッジ** — テストスイートの拡張（現在 30 のテストファイルで 602 テスト、スキャナ、スタック検出、ドメイングループ化、プランパーシング、プロンプト生成、CLI セレクタ、モノレポ検出、Vite SPA 検出、検証ツール、L4 メモリスキャフォールド、Pass 2 再開検証、Pass 3 Guards 1/2/3（H1 センチネル + H2 BOM-aware 空ファイル + strict stale-marker unlink）、Pass 3 split モードのバッチサブ分割、Pass 3 部分マーカー再開（v2.1.0）、Pass 4 マーカーコンテンツ検証 + stale-marker unlink strictness + scaffoldSkillsManifest gap-fill（v2.1.0）、翻訳 env-skip ガード + early fail-fast + CI ワークフロー、staged-rules 移動、言語対応翻訳フォールバック、master plan 廃止のリグレッションスイート（v2.1.0）、memory score/compact フォーマッティングのリグレッション（v2.1.0）、AI Work Rules テンプレート構造、`.env` パーサー port/host/API-target 抽出 + センシティブ変数 redaction (v2.2.0)をカバー）

領域の完全なリスト、コードスタイル、コミット規約、新しいスタックテンプレートを追加するためのステップバイステップガイドについては、[`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照してください。

---

## 作者

**claudeos-core** によって作成 — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## ライセンス

ISC
