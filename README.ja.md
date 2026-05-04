# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**プロジェクトのソースコードを直接読み取り、`CLAUDE.md` と `.claude/rules/` を自動生成する CLI ツールです。Node.js のスキャナ、4-pass の Claude パイプライン、5 つの validator が連動して動きます。12 スタックと 10 言語に対応し、コードに存在しないパスを作り出すことはありません。**

```bash
npx claudeos-core init
```

[**12 スタック**](#supported-stacks)に対応しており、モノレポでもそのまま動きます。コマンド 1 行で完結し、設定ファイルは不要、途中で止まっても再開でき、何度実行しても安全です。

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## これは何?

Claude Code は新しいセッションを始めるたびに、フレームワークの一般的なデフォルト値に戻ります。チームでは **MyBatis** を使っているのに JPA のコードを書いてしまったり、レスポンスラッパーが `ApiResponse.ok()` なのに `ResponseEntity.success()` で書いたりします。パッケージを layer-first で組んでいるのに、生成されるのは domain-first というケースも珍しくありません。リポジトリごとに `.claude/rules/` を手書きすれば解決はしますが、コードが育つにつれてルールのほうが追いつかなくなります。

**ClaudeOS-Core は、実際のソースコードから一貫した結果でこれを再生成します。** まず Node.js のスキャナがプロジェクトを読み、スタック・ORM・パッケージ構成・ファイルパスを把握します。次に 4-pass の Claude パイプラインがドキュメント一式を書き上げます。`CLAUDE.md`、自動ロードされる `.claude/rules/`、standards、skills のすべてが、明示的なパス allowlist の範囲内に収まります。LLM はこの範囲を超えられません。最後に 5 つの validator が、出力する前に結果を検証します。

そのため、同じ入力からは常に同じ出力が返ります。10 言語のどれを選んでも byte 単位で完全に一致し、コードに存在しないパスが紛れ込むこともありません。(詳しくは下の[何が違うのか](#何が違うのか)を参照。)

長く運用するプロジェクトには、[Memory Layer](#memory-layer-任意長期プロジェクト向け) も合わせて生成されます。

---

## 実プロジェクトで動かしてみる

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) で実行してみました。Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 個のソースファイル。結果は **75 ファイル生成**、所要時間 **53 分**、すべての validator が ✅ でした。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>ターミナル出力 (テキスト版、検索とコピー用)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>実際の <code>CLAUDE.md</code> に入る内容 (実例の抜粋 — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

上の表の値はすべて、正確な dependency の座標も、`dev.db` というファイル名も、`V1__create_tables.sql` というマイグレーション名も、「no JPA」という注記も、Claude がファイルを書く前にスキャナが `build.gradle`、`application.properties`、ソースツリーから直接読み取った内容です。推測した値は 1 つも入っていません。

</details>

<details>
<summary><strong>実際に自動ロードされるルール (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

`paths: ["**/*"]` の glob は、プロジェクト内のどのファイルを編集しても Claude Code がこのルールを自動でロードする、という意味です。ルール内のクラス名、パッケージパス、exception handler はすべてスキャン済みのソースから直接持ってきたもので、プロジェクトの実際の `CustomizeExceptionHandler` や `JacksonCustomizations` がそのまま反映されています。

</details>

<details>
<summary><strong>自動生成された <code>decision-log.md</code> のシード (実例の抜粋)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 は `pass2-merged.json` から取り出したアーキテクチャ上の決定事項を `decision-log.md` にあらかじめ書き込んでおきます。次のセッションが始まったときに、コードベースが _なぜ今の形になっているのか_ まで思い出せるようにするためです。並んでいる選択肢 ("JPA/Hibernate"、"MyBatis-Plus") もその帰結も、すべて実際の `build.gradle` の dependency ブロックから拾ってきた内容です。

</details>

---

## テスト済みプロジェクト

ClaudeOS-Core は実際の OSS プロジェクトで測定したリファレンスベンチマークを同梱しています。公開リポジトリで使ってみた方は、ぜひ [issue を開いてください](https://github.com/claudeos-core/claudeos-core/issues)。表に追加します。

| プロジェクト | スタック | Scanned → Generated | ステータス |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ 5 つの validator すべて通過 |

---

## クイックスタート

**前提条件:** Node.js 18+、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストール済みで認証済みであること。

```bash
# 1. プロジェクトのルートに移動
cd my-spring-boot-project

# 2. init を実行 (コードを解析し、ルール作成を Claude に依頼します)
npx claudeos-core init

# 3. 完了。Claude Code を開いて作業を始めれば、ルールはすでにロードされています。
```

`init` が終わると、次のようなファイル群ができあがります。

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code が自動でロード
│       ├── 00.core/              (共通ルール — 命名、アーキテクチャ)
│       ├── 10.backend/           (バックエンドのスタックルール、該当する場合)
│       ├── 20.frontend/          (フロントエンドのスタックルール、該当する場合)
│       ├── 30.security-db/       (セキュリティと DB のコンベンション)
│       ├── 40.infra/             (env、ロギング、CI/CD)
│       ├── 50.sync/              (ドキュメント同期のリマインダー — rules のみ)
│       ├── 60.memory/            (メモリのルール — Pass 4、rules のみ)
│       ├── 70.domains/{type}/    (ドメイン別ルール、type = backend|frontend)
│       └── 80.verification/      (テスト戦略 + ビルド検証のリマインダー)
├── claudeos-core/
│   ├── standard/                 ← リファレンスドキュメント (カテゴリ構成をミラー)
│   │   ├── 00.core/              (プロジェクト概要、アーキテクチャ、命名)
│   │   ├── 10.backend/           (バックエンドのリファレンス — バックエンドスタック時)
│   │   ├── 20.frontend/          (フロントエンドのリファレンス — フロントエンドスタック時)
│   │   ├── 30.security-db/       (セキュリティ & DB のリファレンス)
│   │   ├── 40.infra/             (env / ロギング / CI-CD のリファレンス)
│   │   ├── 70.domains/{type}/    (ドメイン別リファレンス)
│   │   ├── 80.verification/      (ビルド / 起動 / テストのリファレンス — standard のみ)
│   │   └── 90.optional/          (スタック別の追加資料 — standard のみ)
│   ├── skills/                   (Claude が適用できる再利用可能パターン)
│   ├── guide/                    (よくあるタスクの how-to ガイド)
│   ├── database/                 (スキーマ概要、マイグレーションガイド)
│   ├── mcp-guide/                (MCP 連携メモ)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude が最初に読むインデックス)
```

同じ番号 prefix を持つカテゴリは、`rules/` と `standard/` の両方で同じ概念領域を指します (例: `10.backend` ルール ↔ `10.backend` standard)。rules にしかないカテゴリは `50.sync` (ドキュメント同期のリマインダー) と `60.memory` (Pass 4 メモリ)、standard にしかないカテゴリは `90.optional` (強制力のないスタック別の追加資料) です。それ以外の prefix (`00`、`10`、`20`、`30`、`40`、`70`、`80`) は両方に存在します。ここまで終われば、Claude Code はもうプロジェクトを把握した状態です。

---

## 誰のためのツール?

| こんな方に | このツールが解消する痛み |
|---|---|
| **Claude Code で新規プロジェクトを始める個人開発者** | セッションのたびに Claude へコンベンションを教え直す手間がなくなります。`CLAUDE.md` と 8 カテゴリの `.claude/rules/` を一発で生成します。 |
| **複数リポジトリで共有標準を維持するチームリード** | パッケージ名の変更や ORM の差し替え、レスポンスラッパーの変更があるたびに `.claude/rules/` がついていけずズレていく問題。ClaudeOS-Core ならいつ走らせても同じ手順で再同期できます。同じ入力からは byte 単位で同じ出力が出るので、diff にノイズが乗りません。 |
| **Claude Code を使っているが生成コードの修正に疲れた方** | 違うレスポンスラッパー、違うパッケージ構成、MyBatis のプロジェクトなのに JPA、共通 middleware があるのに `try/catch` が散らばっている、といった出力。スキャナが実際のコンベンションを抽出し、Claude のすべての pass は明示的なパス allowlist の中だけで動きます。 |
| **新しいリポジトリにジョインしたばかりの方** (既存プロジェクト、新しいチーム) | リポジトリで `init` を一度走らせれば、生きたアーキテクチャマップが手に入ります。CLAUDE.md のスタック表、レイヤーごとのルールと ✅/❌ の例、主要な決定の「なぜ」が書き込まれた decision log (JPA vs MyBatis、REST vs GraphQL など)。5,000 個のソースファイルを読むより、5 つのドキュメントを読むほうが速いです。 |
| **韓国語、日本語、中国語など英語以外の言語で作業する方** | Claude Code 向けのルール生成ツールはほとんどが英語のみです。ClaudeOS-Core は **10 言語** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) でドキュメント一式を生成し、出力言語が何であっても同じ構造検証を適用します。`claude-md-validator` の判定はどの言語でも同じです。 |
| **モノレポで作業する方** (Turborepo、pnpm/yarn workspaces、Lerna) | 1 回の実行でバックエンドとフロントエンドのドメインを別々の prompt で解析します。`apps/*/` と `packages/*/` も自動で巡回し、スタック別ルールは `70.domains/{type}/` の下に書き出します。 |
| **OSS への貢献や検証用途で使う方** | 出力は gitignore に優しい構成です。`claudeos-core/` はローカルの作業ディレクトリで、リポジトリに含めるのは `CLAUDE.md` と `.claude/` だけで足ります。途中で止まっても再開でき、再実行しても安全です (手で編集したルールは `--force` を付けない限りそのまま残ります)。 |

**向かないケース:** スキャンを挟まずに初日からそのまま使える万能なプリセット詰め合わせが欲しい場合 (どの道具がどこに合うかは [docs/ja/comparison.md](docs/ja/comparison.md) を参照)、プロジェクトが[サポート対象スタック](#supported-stacks)のいずれにもまだ当てはまらない場合、もしくは `CLAUDE.md` が 1 つあれば足りる場合。最後のケースなら標準搭載の `claude /init` で十分で、別のツールを入れる必要はありません。

---

## 仕組み

ClaudeOS-Core は、よくある Claude Code のワークフローの順序をひっくり返します。

```
通常:    ユーザがプロジェクトを説明 → Claude がスタックを推測 → Claude が文書を作成
本ツール: コードがスタックを解析     → 確定した事実を Claude に渡す → Claude は事実だけで文書を作成
```

パイプラインは **3 段階**で動きます。LLM を呼ぶ前にも後にも、コードが間に挟まる構成です。

**1. Step A — スキャナ (LLM なしの決定論的処理)。** Node.js のスキャナがプロジェクトルートを巡回し、`package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` を読み、`.env*` ファイルをパースします (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` などの機密変数は自動でマスクします)。続いてアーキテクチャパターンを分類し (Java の 5 パターン A/B/C/D/E、Kotlin の CQRS / マルチモジュール、Next.js の App Router と Pages Router、FSD、components パターン)、ドメインを抽出し、存在するすべてのソースファイルパスを明示的な allowlist にまとめます。結果は `project-analysis.json` 1 ファイルに集約され、以降の工程はこれを single source of truth として扱います。

**2. Step B — 4-pass の Claude パイプライン (Step A の事実を制約として動作)。**
- **Pass 1** はドメイングループごとに代表ファイルを読み、ドメインあたり 50 〜 100 個のコンベンション (レスポンスラッパー、ロギングライブラリ、エラー処理、命名規則、テストパターンなど) を抽出します。ドメイングループごとに 1 回ずつ実行する設計 (`max 4 domains, 40 files per group`) なので、context があふれることはありません。
- **Pass 2** はドメインごとの解析結果をプロジェクト全体の像にまとめます。ドメイン間で食い違いがあれば、最も多く使われているコンベンションを採用します。
- **Pass 3** は `CLAUDE.md`、`.claude/rules/`、`claudeos-core/standard/`、skills、guides を書き上げます。段階を分けて (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) 進めるので、`pass2-merged.json` が大きくなっても各段階の prompt が LLM の context window に収まります。ドメインが 16 個以上ある場合は、3b/3c をさらに 15 ドメイン以下のバッチへ分割します。
- **Pass 4** は L4 メモリレイヤー (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) をシードし、共通の scaffold ルールを追加します。Pass 4 は **`CLAUDE.md` を絶対に変更しません**。Pass 3 の Section 8 が唯一の権限を持ちます。

**3. Step C — 検証 (LLM なしの決定論的処理)。** 5 つの validator が結果を検査します。
- `claude-md-validator` — `CLAUDE.md` に対する 25 種類の構造チェック (8 sections、H3/H4 の個数、メモリファイルの一意性、T1 canonical heading の不変条件)。language-invariant なので、`--lang` が何であっても判定は同じです。
- `content-validator` — 10 種類のコンテンツチェック。パス参照の存在確認 (`STALE_PATH` が捏造の `src/...` 参照を捕捉) や MANIFEST drift の検知も含まれます。
- `pass-json-validator` — Pass 1/2/3/4 の JSON well-formedness と stack-aware なセクション数チェック。
- `plan-validator` — plan ↔ disk の整合性 (legacy。v2.1.0 以降はほぼ no-op)。
- `sync-checker` — 追跡対象 7 ディレクトリにおける disk ↔ `sync-map.json` の登録整合性。

severity は 3 段階 (`fail` / `warn` / `advisory`) に分かれており、ユーザが手で直せる程度の LLM hallucination で warning が CI を止めてしまうことはありません。

これらすべてを束ねる根本原則は、**Claude が引用できるのはコードに実在するパスだけ**ということです。Step A が有限の allowlist を渡すので、そもそも逸脱できない設計になっています。それでも LLM が何かを作り出そうとすることはありますが (特定の seed でごくたまに発生)、Step C が出力前にしっかり捕捉します。

各 pass の詳細、marker ベースの再開、Claude Code の `.claude/` 機密パス制限を回避する staged-rules の挙動、スタック検出の内部ロジックは [docs/ja/architecture.md](docs/ja/architecture.md) を参照してください。

---

## Supported Stacks

12 スタックを、プロジェクトのファイルから自動で検出します。

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

マルチスタックのプロジェクト (例: Spring Boot バックエンド + Next.js フロントエンド) もそのまま動きます。

検出ルールと各スキャナが取り出す情報については [docs/ja/stacks.md](docs/ja/stacks.md) を参照してください。

---

## 日常のワークフロー

普段の使い方は、ほぼこの 3 つのコマンドで済みます。

```bash
# プロジェクトで初めて実行するとき
npx claudeos-core init

# standards やルールを手で編集した後
npx claudeos-core lint

# ヘルスチェック (コミット前や CI で実行)
npx claudeos-core health
```

各コマンドのオプション全体は [docs/ja/commands.md](docs/ja/commands.md) を参照してください。メモリレイヤーのコマンド (`memory compact`、`memory propose-rules`) は下の [Memory Layer](#memory-layer-任意長期プロジェクト向け) セクションで扱います。

---

## 何が違うのか

Claude Code 向けのドキュメント生成ツールはほとんど、ユーザの説明から出発します。ユーザがツールに伝え、ツールがそれを Claude に伝える流れです。ClaudeOS-Core は実際のソースコードから出発します。ツールが直接コードを読み、確定した事実を Claude に渡し、Claude はその事実だけでドキュメントを書きます。

具体的な違いは 3 つあります。

1. **決定論的なスタック検出。** 同じプロジェクト + 同じコード = 同じ出力。「今回の Claude はちょっと違う出力を出してきた」がありません。
2. **存在しないパスを作らない。** Pass 3 の prompt に許可済みのソースパスがすべて明示されているため、Claude はそこに無いパスを引用できません。
3. **マルチスタックを意識した解析。** 同じ実行の中で、バックエンドとフロントエンドのドメインがそれぞれ別の解析 prompt を使います。

他のツールとのスコープ比較は [docs/ja/comparison.md](docs/ja/comparison.md) を参照してください。この比較は **各ツールが何をするか** を整理した内容で、**どれが優れているか** を評価したものではありません。多くは互いに補完関係にあります。

---

## 検証 (生成後)

Claude がドキュメントを書き終えたら、今度はコードがそれを検証します。独立した validator は 5 つあります。

| Validator | チェック内容 | 実行元 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md の構造的な不変条件 (8 sections、language-invariant) | `claudeos-core lint` |
| `content-validator` | パス参照が実際に存在するか、manifest が整合しているか | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 の出力が well-formed JSON か | `health` (warn) |
| `plan-validator` | 保存された plan がディスクの内容と一致するか | `health` (fail-on-error) |
| `sync-checker` | `sync-map.json` の登録項目とディスク上のファイルが一致するか (orphaned/unregistered の検出) | `health` (fail-on-error) |

`health-checker` がランタイム validator 4 つを 3 段階の severity (fail / warn / advisory) でまとめて実行し、CI に適した終了コードで締めくくります。`claude-md-validator` だけは `lint` コマンドで個別に走らせる構成にしてあります。構造のズレは「軽い警告」ではなく「再 init すべきシグナル」だからです。いつでも実行できます。

```bash
npx claudeos-core health
```

各 validator のチェック項目の詳細は [docs/ja/verification.md](docs/ja/verification.md) を参照してください。

---

## Memory Layer (任意、長期プロジェクト向け)

上の scaffolding パイプラインに加えて、単一セッションを超えて context を引き継ぎたいプロジェクト向けに、`claudeos-core/memory/` フォルダも併せて用意します。任意機能なので、`CLAUDE.md` とルールだけで足りる場合は無視してかまいません。

ファイルは 4 つで、すべて Pass 4 が書き出します。

- `decision-log.md` — append-only 形式の「なぜ X ではなく Y を選んだか」の記録。`pass2-merged.json` からシード。
- `failure-patterns.md` — frequency / importance のスコアが付いた、繰り返し起きるエラーの一覧。
- `compaction.md` — 時間の経過とともにメモリが自動圧縮される仕組み。
- `auto-rule-update.md` — 新しいルールに昇格させるべきパターン。

このレイヤーを長く運用するためのコマンドが 2 つあります。

```bash
# failure-patterns ログを圧縮 (定期的に実行)
npx claudeos-core memory compact

# よく出る failure pattern を提案ルールに昇格
npx claudeos-core memory propose-rules
```

メモリモデルとライフサイクルについては [docs/ja/memory-layer.md](docs/ja/memory-layer.md) を参照してください。

---

## FAQ

**Q: Claude API キーは必要ですか?**
A: 不要です。ClaudeOS-Core は手元にインストール済みの Claude Code をそのまま利用します。ローカルの `claude -p` に prompt を流す方式なので、追加のアカウントは要りません。

**Q: 既存の CLAUDE.md や `.claude/rules/` を上書きしますか?**
A: 新規プロジェクトで初めて実行したときは新しく作ります。`--force` を付けずに再実行した場合は編集内容が残ります。前回実行の pass marker を検知して、その pass をスキップする仕組みです。`--force` を付けて再実行すると全部消して作り直します (編集内容も一緒に消える、というのが `--force` の意味です)。詳しくは [docs/ja/safety.md](docs/ja/safety.md) を参照してください。

**Q: 自分のスタックがサポートされていません。追加できますか?**
A: できます。新しいスタックには prompt テンプレート 3 種類とドメインスキャナ 1 つがあれば足ります。8 ステップのガイドは [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

**Q: 日本語 (またはその他の言語) でドキュメントを生成するには?**
A: `npx claudeos-core init --lang ja` を実行してください。対応言語は 10 種類です: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de。

**Q: モノレポでも動きますか?**
A: 動きます。Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) は stack-detector が検出します。app ごとに個別に解析します。それ以外のモノレポレイアウト (例: NX) は明示的に検出はしませんが、一般的な `apps/*/` や `packages/*/` のパターンならスタック別スキャナがそのまま拾います。

**Q: Claude Code が同意しがたいルールを作ってきたら?**
A: 直接編集してください。そのあと `npx claudeos-core lint` を走らせて、CLAUDE.md の構造がまだ有効かを確認します。`--force` を付けずに以降の `init` を実行する限り、編集内容はそのまま残ります。再開ロジックが marker のある pass を飛ばすからです。

**Q: バグはどこに報告すれば?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) へ。セキュリティ関連は [SECURITY.md](SECURITY.md) を参照してください。

---

## 時間が節約できたなら

GitHub の ⭐ 1 つで、プロジェクトの可視性が上がり、他の人にも見つけてもらいやすくなります。issue、PR、スタックテンプレートの貢献はすべて歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## ドキュメント

| トピック | 読むファイル |
|---|---|
| 4-pass パイプラインの動き (図より深い説明) | [docs/ja/architecture.md](docs/ja/architecture.md) |
| アーキテクチャの図解 (Mermaid) | [docs/ja/diagrams.md](docs/ja/diagrams.md) |
| スタック検出 — 各スキャナが何を見ているか | [docs/ja/stacks.md](docs/ja/stacks.md) |
| メモリレイヤー — decision log と failure pattern | [docs/ja/memory-layer.md](docs/ja/memory-layer.md) |
| 5 つの validator の詳細 | [docs/ja/verification.md](docs/ja/verification.md) |
| すべての CLI コマンドとオプション | [docs/ja/commands.md](docs/ja/commands.md) |
| 手動インストール (`npx` を使わない方法) | [docs/ja/manual-installation.md](docs/ja/manual-installation.md) |
| スキャナの override — `.claudeos-scan.json` | [docs/ja/advanced-config.md](docs/ja/advanced-config.md) |
| 安全性: 再実行時に保持されるもの | [docs/ja/safety.md](docs/ja/safety.md) |
| 似たツールとの比較 (品質ではなくスコープの観点) | [docs/ja/comparison.md](docs/ja/comparison.md) |
| エラーと復旧 | [docs/ja/troubleshooting.md](docs/ja/troubleshooting.md) |

---

## 貢献

貢献は歓迎します。スタック対応の追加、prompt の改善、バグ修正、どれも大歓迎です。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

行動規範とセキュリティポリシーは [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)、[SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

[ISC License](LICENSE)。商用利用を含めて、あらゆる用途に自由に利用できます。© 2025–2026 ClaudeOS-Core contributors.

---

<sub>[claudeos-core](https://github.com/claudeos-core) チームがメンテナンスしています。issue や PR は <https://github.com/claudeos-core/claudeos-core> までお寄せください。</sub>
