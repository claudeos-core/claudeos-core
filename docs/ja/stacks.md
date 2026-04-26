# サポート対象スタック

12 種のスタック、すべてプロジェクトファイルから自動検出。**8 backend** + **4 frontend**。

このページは各スタックの検出方法とスタック別 scanner が抽出する内容を説明します。以下の用途でお使いください:

- 自分のスタックがサポートされているかの確認。
- docs 生成前に scanner が Claude に渡す事実を理解する。
- `claudeos-core/generated/project-analysis.json` で何が見られるかの確認。

プロジェクト構造が特殊な場合、`.claudeos-scan.json` の override は [advanced-config.md](advanced-config.md) を参照。

> 英語原文: [docs/stacks.md](../stacks.md). 日本語訳は英語版に追従して同期されています。

---

## 検出はどう動くか

`init` が走ると、scanner はおおよそ以下の順でプロジェクトルートのファイルを開きます:

| ファイル | scanner に伝える情報 |
|---|---|
| `package.json` | Node.js プロジェクト; `dependencies` から framework |
| `pom.xml` | Java/Maven プロジェクト |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle プロジェクト |
| `pyproject.toml` / `requirements.txt` | Python プロジェクト; パッケージから framework |
| `angular.json` | Angular プロジェクト |
| `nuxt.config.{ts,js}` | Vue/Nuxt プロジェクト |
| `next.config.{ts,js}` | Next.js プロジェクト |
| `vite.config.{ts,js}` | Vite プロジェクト |

どれにも一致しない場合、`init` は推測ではなく明確なエラーで停止します。(LLM に解明させるフォールバックはありません。間違った docs を黙って出すより、騒がしく失敗するほうがマシです。)

scanner は `plan-installer/stack-detector.js` にあります — 実際の検出ロジックを読みたい場合に。

---

## Backend スタック (8)

### Java / Spring Boot

**検出条件:** `build.gradle` または `pom.xml` に `spring-boot-starter` が含まれる。Java は Gradle の plugin block で Kotlin と区別されます。

**Architecture pattern 検出。** scanner はあなたのプロジェクトを **5 パターンのいずれか** に分類します:

| Pattern | 例の構造 |
|---|---|
| **A. Layer-first** | `controller/order/`、`service/order/`、`repository/order/` |
| **B. Domain-first** | `order/controller/`、`order/service/`、`order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`、`service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`、`order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`、`application/`、`infrastructure/`、`presentation/` |

パターンは順番に試されます (A → B/D → E → C)。scanner には 2 つの精緻化もあります: (1) **root-package detection** は layer を含むファイルの ≥80% をカバーする最長パッケージ prefix を採用します (再実行で deterministic)。(2) **deep-sweep fallback** は Pattern B/D 用 — 登録ドメインに対して標準 glob がゼロ件を返した場合、scanner は `**/${domain}/**/*.java` を再 glob し、各ファイルのパスを辿って最も近い layer ディレクトリを探し、`core/{otherDomain}/{layer}/{domain}/` のようなクロスドメイン結合レイアウトを捕捉します。

**抽出される事実:**
- スタック、framework version、ORM (JPA / MyBatis / jOOQ)
- DB タイプ (Postgres / MySQL / Oracle / MariaDB / H2 — H2 検出は `\bh2\b` の単語境界正規表現を使い、`oauth2`、`cache2k` などでの誤検知を避けます)
- パッケージマネージャ (Gradle / Maven)、build tool、logger (Logback / Log4j2)
- ファイル数付きのドメインリスト (controllers、services、mappers、dtos、MyBatis XML mappers)

scanner は `plan-installer/scanners/scan-java.js` にあります。

---

### Kotlin / Spring Boot

**検出条件:** `build.gradle.kts` が存在し、Kotlin プラグインが Spring Boot と並んで適用されている。Java とは完全に別のコードパスを持ち、Java のパターンを再利用しません。

**特に検出する内容:**
- **CQRS** — command/query パッケージの分離
- **BFF** — backend-for-frontend パターン
- **Multi-module Gradle** — `settings.gradle.kts` に `include(":module")`
- **モジュール間で共有される query ドメイン** — `resolveSharedQueryDomains()` がパッケージ/クラス名分解により共有 query モジュールのファイルを再配分

**サポート ORM:** Exposed、jOOQ、JPA (Hibernate)、R2DBC。

**Kotlin 専用 scanner の理由:** Java のパターンは Kotlin コードベースにうまく適合しません。Kotlin プロジェクトは CQRS と multi-module セットアップに傾く傾向があり、Java のパターン A〜E では綺麗に表現できません。

scanner は `plan-installer/scanners/scan-kotlin.js` にあります。

---

### Node / Express

**検出条件:** `package.json` の dependencies に `express`。

**Stack detector が識別する内容:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose)、DB タイプ、パッケージマネージャ (npm / yarn / pnpm)、TypeScript 利用。

**ドメイン発見:** 共有の Node.js scanner (`plan-installer/scanners/scan-node.js`) が `src/*/` (NestJS スタイルのモジュールが存在する場合は `src/modules/*/`) を走査し、`controller|router|route|handler`、`service`、`dto|schema|type`、entity/module/guard/pipe/interceptor のパターンに一致するファイルを数えます。同じ scanner コードパスが Express、Fastify、NestJS で使われます — どの Pass 1 プロンプトを選ぶかは framework 名で決まり、どの scanner が動くかではありません。

---

### Node / Fastify

**検出条件:** dependencies に `fastify`。

ドメイン発見は上記と同じ共有 `scan-node.js` scanner を使用。Pass 1 は Fastify 固有のプロンプトテンプレートを使用し、Claude に Fastify の plugin パターンと route schema を探させます。

---

### Node / NestJS

**検出条件:** dependencies に `@nestjs/core`。

ドメイン発見は共有 `scan-node.js` scanner を使用。NestJS の標準 `src/modules/<module>/` レイアウトは自動検出され (両方存在する場合は `src/*/` より優先)、各モジュールが 1 ドメインになります。Pass 1 は NestJS 固有のプロンプトテンプレートを使用。

---

### Python / Django

**検出条件:** 部分文字列 `django` (小文字) が `requirements.txt` または `pyproject.toml` に出現。標準のパッケージマネージャ宣言は小文字なので、典型的なプロジェクトに一致します。

**ドメイン発見:** scanner は `**/models.py` を走査し、`models.py` を含む各ディレクトリを Django app/domain として扱います。(`settings.py` から `INSTALLED_APPS` をパースしません — ディスク上の `models.py` の存在がシグナルです。)

**ドメインごとの統計:** `views`、`models`、`serializers`、`admin`、`forms`、`urls`、`tasks` に一致するファイルを数えます。

---

### Python / FastAPI

**検出条件:** dependencies に `fastapi`。

**ドメイン発見:** glob `**/{router,routes,endpoints}*.py` — 各ユニークな親ディレクトリが 1 ドメインになります。scanner は `APIRouter(...)` 呼び出しをパースしません。ファイル名がシグナルです。

**stack-detector が検出する ORM:** SQLAlchemy、Tortoise ORM。

---

### Python / Flask

**検出条件:** dependencies に `flask`。

**ドメイン発見:** FastAPI と同じ `**/{router,routes,endpoints}*.py` glob。何も得られなければ scanner は `{app,src/app}/*/` ディレクトリにフォールバックします。

**Flat-project fallback (v1.7.1):** ドメイン候補が見つからない場合、scanner はプロジェクトルートで `{main,app}.py` を探し、プロジェクトを単一ドメインの「app」として扱います。

---

## Frontend スタック (4)

### Node / Next.js

**検出条件:** `next.config.{ts,js}` が存在する、または `package.json` の dependencies に `next`。

**ルーティング規約を検出:**

- **App Router** (Next.js 13+) — `app/` ディレクトリ + `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) — `pages/` ディレクトリ
- **FSD (Feature-Sliced Design)** — `src/features/`、`src/widgets/`、`src/entities/`

**Scanner が抽出する内容:**
- ルーティングモード (App Router / Pages Router / FSD)
- RSC vs Client コンポーネント数 (Next.js App Router — `client.tsx` のように名前に `client.` を含むファイル数で数えます。ソース内の `"use client"` ディレクティブのパースではありません)
- `app/` または `pages/` (および FSD の `src/features/` 等) からのドメインリスト

state 管理、styling、data-fetching ライブラリは scanner レベルでは検出しません。Pass 1 のプロンプトが Claude にソースコードからこれらのパターンを探させます。

---

### Node / Vite

**検出条件:** `vite.config.{ts,js}` が存在する、または dependencies に `vite`。

デフォルトポートは `5173` (Vite 規約) — 最終手段のフォールバックとして適用。scanner は `vite.config` の `server.port` をパースしません。プロジェクトが `.env*` でポートを宣言していれば、env-parser が先に拾います。

stack detector は Vite 自体を識別します。基底の UI フレームワーク — React (デフォルトフォールバック) でない場合 — は scanner ではなく Pass 1 で LLM がソースコードから識別します。

---

### Angular

**検出条件:** `angular.json` が存在する、または dependencies に `@angular/core`。

**検出内容:**
- **Feature module** 構造 — `src/app/<feature>/`
- **Monorepo workspaces** — 汎用 `apps/*/src/app/*/` と `packages/*/src/app/*/` パターン (NX レイアウトでも動作 — `nx.json` 自体は明示的な検出シグナルではありませんが)

デフォルトポートは `4200` (Angular 規約) — 最終手段のフォールバックとして適用。scanner は stack detection のみ `angular.json` を読み、port 抽出には使いません。プロジェクトが `.env*` ファイルでポートを宣言していれば、env-parser が先に拾います。

---

### Vue / Nuxt

**検出条件:** Nuxt は `nuxt.config.{ts,js}` の存在、プレーン Vue は dependencies に `vue`。

scanner は framework を識別し、フロントエンドのドメイン抽出 (App/Pages/FSD/components パターン) を実行します。Nuxt のバージョンとモジュール検出 (Pinia、VueUse など) は Pass 1 に委譲 — `package.json` のパターンマッチではなく、Claude がソースを読んで使用されているものを識別します。

---

## マルチスタックプロジェクト

バックエンドとフロントエンドの両方を持つプロジェクト (例: `backend/` の Spring Boot + `frontend/` の Next.js) も完全にサポートされます。

各スタックは **独自の scanner** を **独自の解析プロンプト** で走らせます。Pass 2 のマージ済み出力は両スタックをカバーし、Pass 3 は各々のために別々の rule と standard ファイルを以下のように整理して生成します:

```
.claude/rules/
├── 10.backend/                  ← Spring Boot のルール
├── 20.frontend/                 ← Next.js のルール
└── 70.domains/
    ├── backend/                 ← バックエンドドメイン別
    └── frontend/                ← フロントエンドドメイン別

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

`70.domains/{type}/` の typing は **常に有効** — シングルスタックプロジェクトでもレイアウトは `70.domains/backend/` (または `frontend/`) を使います。これにより、シングルスタックのプロジェクトが後で 2 つ目のスタックを追加しても、規約が均一なため移行が不要です。

**マルチスタック検出** は以下を拾います:
- プロジェクトルートの monorepo manifest: `turbo.json`、`pnpm-workspace.yaml`、`lerna.json`
- ルート `package.json` の `workspaces` フィールド

monorepo が検出されると、scanner は `apps/*/package.json` と `packages/*/package.json` (および manifest からのカスタム workspace glob) を走査し、依存関係リストをマージし、必要に応じてバックエンドとフロントエンド両方の scanner を実行します。

---

## Frontend platform-split 検出

一部のフロントエンドプロジェクトはトップレベルでプラットフォーム (PC、mobile、admin) ごとに整理されています:

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

scanner は `src/{platform}/{subapp}/` を検出し、各 `{platform}-{subapp}` を別ドメインとして emit します。デフォルトのプラットフォームキーワード:

- **デバイス / ターゲット環境:** `desktop`、`pc`、`web`、`mobile`、`mc`、`mo`、`sp`、`tablet`、`tab`、`pwa`、`tv`、`ctv`、`ott`、`watch`、`wear`
- **アクセス層 / 対象オーディエンス:** `admin`、`cms`、`backoffice`、`back-office`、`portal`

カスタムキーワードは `.claudeos-scan.json` の `frontendScan.platformKeywords` で追加可能 ([advanced-config.md](advanced-config.md) 参照)。

**Single-SPA skip rule (v2.3.0):** プロジェクトツリー全体で **ただ 1 つ** のプラットフォームキーワードしか一致しない場合 (例: プロジェクトに `src/admin/api/`、`src/admin/dto/`、`src/admin/routers/` があり、他のプラットフォームがない)、subapp emission はスキップされます。そうしないと、アーキテクチャ層 (`api`、`dto`、`routers`) が誤って feature ドメインとして emit されてしまうためです。

それでも subapp emission を強制したい場合、`.claudeos-scan.json` で `frontendScan.forceSubappSplit: true` を設定。詳しくは [advanced-config.md](advanced-config.md) を参照。

---

## `.env` 抽出 (v2.2.0+)

scanner は `.env*` ファイルを読んで実行時設定を取得し、生成された docs に実際の port、host、DB URL が反映されるようにします。

**検索順** (最初に一致したものを採用):

1. `.env.example` (canonical、コミット済み)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**機密変数の redaction:** `PASSWORD`、`SECRET`、`TOKEN`、`API_KEY`、`CREDENTIAL`、`PRIVATE_KEY`、`JWT_SECRET` などにマッチするキーは `project-analysis.json` にコピーされる前に自動的に `***REDACTED***` に置き換えられます。**例外:** `DATABASE_URL` は scanner が DB タイプ検出のためにプロトコルを必要とするので、ホワイトリストに入っています。

**Port 解決の優先順位:**
1. Spring Boot の `application.yml` の `server.port`
2. `.env` の port キー (16+ の規約キーをチェック、特異性で並べ替え — Vite 固有が最初、汎用 `PORT` は最後)
3. スタックのデフォルト (FastAPI/Django=8000、Flask=5000、Vite=5173、Express/NestJS/Fastify=3000、デフォルト=8080)

パーサは `lib/env-parser.js`。テストは `tests/env-parser.test.js`。

---

## scanner が生成する内容 — `project-analysis.json`

Step A の終了後、`claudeos-core/generated/project-analysis.json` にこのファイルが見つかります。トップレベルキー (スタックにより異なる):

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

このファイルを直接読めば、scanner があなたのプロジェクトから何を抽出したかが正確にわかります。

---

## 新しいスタックを追加する

scanner アーキテクチャはモジュール式です。新しいスタックの追加に必要なもの:

1. `plan-installer/scanners/scan-<stack>.js` ファイル (ドメイン抽出ロジック)。
2. 3 つの Claude プロンプトテンプレート: `pass-prompts/templates/<stack>/` 配下の `pass1.md`、`pass2.md`、`pass3.md`。
3. `plan-installer/stack-detector.js` に追加するスタック検出ルール。
4. `bin/commands/init.js` のディスパッチャへのルーティング。
5. `tests/fixtures/<stack>/` 配下のフィクスチャプロジェクトを使ったテスト。

完全なガイドとコピー用のリファレンス実装は [CONTRIBUTING.md](../../CONTRIBUTING.md) を参照。

---

## scanner の挙動を override する

プロジェクトに特殊な構造がある場合、または自動検出が間違ったスタックを選ぶ場合、プロジェクトルートに `.claudeos-scan.json` を置きます。

利用可能な override フィールドは [advanced-config.md](advanced-config.md) を参照。
