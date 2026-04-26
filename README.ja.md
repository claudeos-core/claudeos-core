# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Claude Code が初回の試行から _あなたのプロジェクトの_ コンベンションに従うようにします — generic な既定値ではなく。**

deterministic な Node.js scanner がコードを先に読み、4-pass の Claude パイプラインが抽出された事実を基に完全なドキュメントセットを書き込みます — `CLAUDE.md` + 自動ロードされる `.claude/rules/` + standards + skills + L4 memory。10 種の出力言語、5 つの post-generation validator、LLM がコードに存在しないファイルや framework をでっち上げないようにする明示的な path allowlist。

[**12 stacks**](#supported-stacks) で即座に動作 (monorepo 含む) — `npx` コマンド一つ、設定不要、中断時 resume-safe、再実行 idempotent。

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## このツールは何ですか？

あなたは Claude Code を使っています。強力なツールですが、毎セッションが新しく始まります — _あなたの_ プロジェクトがどう構成されているかの記憶がありません。そのため、チームが実際に行っているパターンとほとんどマッチしない「generally good」な既定値に fallback します:

- チームでは **MyBatis** を使っているのに、Claude は JPA repository を生成する。
- 応答 wrapper は `ApiResponse.ok()` なのに、Claude は `ResponseEntity.success()` と書く。
- パッケージは layer-first (`controller/order/`) なのに、Claude は domain-first (`order/controller/`) を作る。
- エラーは centralized middleware を通すのに、Claude はあらゆる endpoint に `try/catch` を撒き散らす。

プロジェクトごとに `.claude/rules/` セットがあれば良いのですが — Claude Code が毎セッション自動ロードしてくれる — 新しい repo ごとに手で書くのは何時間もかかり、コードが進化するにつれ drift していきます。

**ClaudeOS-Core は実際のソースコードからそれをあなたの代わりに書きます。** deterministic な Node.js scanner がプロジェクトを先に読み (スタック、ORM、パッケージ layout、コンベンション、ファイルパス)、4-pass の Claude パイプラインが抽出された事実を完全なドキュメントセットに変換します:

- **`CLAUDE.md`** — Claude が毎セッション最初に読むプロジェクトインデックス
- **`.claude/rules/`** — カテゴリごとに自動ロードされる rules (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — 参照ドキュメント (各 rule の「なぜ」)
- **`claudeos-core/skills/`** — 再利用可能なパターン (CRUD scaffolding、ページテンプレート)
- **`claudeos-core/memory/`** — プロジェクトと共に成長する decision log + failure pattern

scanner が Claude に明示的な path allowlist を渡すため、LLM は **コードに存在しないファイルや framework をでっち上げることができません**。5 つの post-generation validator (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) が出力を ship 前に検証します — language-invariant なので、英語で生成しても、日本語で生成しても、他の 8 言語のいずれで生成しても同じルールが適用されます。

```
Before:  あなた → Claude Code → 「概ね良い」コード → 毎回手作業で修正
After:   あなた → Claude Code → あなたのプロジェクトに一致するコード → そのまま使える
```

---

## 実際のプロジェクトでのデモ

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) で実行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files。結果: **75 generated files**、合計時間 **53 分**、すべての validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 ターミナル出力 (テキスト版、検索・コピー用)</strong></summary>

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
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
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
<summary><strong>📄 生成された <code>CLAUDE.md</code> の抜粋 (実際の出力 — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

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

上の値はすべて — 正確な依存関係の coordinates、`dev.db` のファイル名、`V1__create_tables.sql` のマイグレーション名、「no JPA」まで — Claude がファイルを書く前に scanner が `build.gradle` / `application.properties` / ソースツリーから抽出したものです。何一つ推測されていません。

</details>

<details>
<summary><strong>🛡️ 自動ロードされる実際の rule ファイル (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

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

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

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

`paths: ["**/*"]` の glob は、プロジェクト内のいずれかのファイルを編集するたびに Claude Code がこの rule を自動ロードすることを意味します。rule 内のクラス名、パッケージパス、exception handler はすべて scan されたソースから直接抽出されています — プロジェクトの実際の `CustomizeExceptionHandler` と `JacksonCustomizations` を含めて。

</details>

<details>
<summary><strong>🧠 自動生成された <code>decision-log.md</code> シード (実際の出力)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 は `pass2-merged.json` から抽出したアーキテクチャ上の決定事項で `decision-log.md` を seed します — その後のセッションでもコードベースが _このように見える_ という事実だけでなく、_なぜ_ そう見えるのかも記憶できるように。すべての選択肢 (「JPA/Hibernate」「MyBatis-Plus」) と帰結は実際の `build.gradle` の dependency ブロックに基づいています。

</details>

---

## Quick Start

**前提条件:** Node.js 18+、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストール済みかつ認証済み。

```bash
# 1. プロジェクトのルートに移動
cd my-spring-boot-project

# 2. init を実行 (コードを解析し、Claude にルール作成を依頼します)
npx claudeos-core init

# 3. 完了。Claude Code を開いてコーディングを開始 — ルールは既にロード済みです。
```

`init` 完了後に **得られるもの**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code が自動ロード
│       ├── 00.core/              (共通ルール — 命名、アーキテクチャ)
│       ├── 10.backend/           (バックエンドスタックのルール、該当する場合)
│       ├── 20.frontend/           (フロントエンドスタックのルール、該当する場合)
│       ├── 30.security-db/       (セキュリティ & DB のコンベンション)
│       ├── 40.infra/             (env、ロギング、CI/CD)
│       ├── 50.sync/              (ドキュメント同期のリマインダ — rules only)
│       ├── 60.memory/            (memory rules — Pass 4、rules only)
│       ├── 70.domains/{type}/    (ドメイン別ルール、type = backend|frontend)
│       └── 80.verification/      (テスト戦略 + ビルド検証のリマインダ)
├── claudeos-core/
│   ├── standard/                 ← 参照ドキュメント (カテゴリ構造をミラー)
│   │   ├── 00.core/              (プロジェクト概要、アーキテクチャ、命名)
│   │   ├── 10.backend/           (バックエンド reference — バックエンドスタック時)
│   │   ├── 20.frontend/          (フロントエンド reference — フロントエンドスタック時)
│   │   ├── 30.security-db/       (セキュリティ & DB の reference)
│   │   ├── 40.infra/             (env / ロギング / CI-CD の reference)
│   │   ├── 70.domains/{type}/    (ドメイン別 reference)
│   │   ├── 80.verification/      (ビルド / 起動 / テスト reference — standard only)
│   │   └── 90.optional/          (スタック固有の追加 — standard only)
│   ├── skills/                   (Claude が適用可能な再利用パターン)
│   ├── guide/                    (一般的なタスク用 how-to ガイド)
│   ├── database/                 (スキーマ概要、マイグレーションガイド)
│   ├── mcp-guide/                (MCP 統合のメモ)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude が最初に読むインデックス)
```

`rules/` と `standard/` で同じ番号 prefix を共有するカテゴリは、同一の概念領域を表します (例: `10.backend` rules ↔ `10.backend` standards)。Rules-only カテゴリ: `50.sync` (ドキュメント同期リマインダ)、`60.memory` (Pass 4 memory)。Standard-only カテゴリ: `90.optional` (強制力のないスタック固有の追加)。それ以外の prefix (`00`、`10`、`20`、`30`、`40`、`70`、`80`) は `rules/` と `standard/` の **両方** に存在します。これで Claude Code はあなたのプロジェクトを把握できます。

---

## 誰のためのツールですか？

| あなたが... | このツールが取り除く pain |
|---|---|
| **Claude Code で新規プロジェクトを始めるソロ開発者** | 「毎セッション Claude にコンベンションを教える」が消える。`CLAUDE.md` + 8 カテゴリの `.claude/rules/` が一回の pass で生成される。 |
| **複数 repo にまたがる共有標準を維持するチームリード** | パッケージ名変更、ORM 切り替え、response wrapper 変更で `.claude/rules/` が drift。ClaudeOS-Core は deterministic に再同期 — 同じ入力 → byte-identical な出力、diff noise なし。 |
| **既に Claude Code を使っているが生成コードの修正に疲れた人** | 間違った response wrapper、間違ったパッケージ layout、MyBatis を使っているのに JPA、centralized middleware なのに `try/catch` 撒き散らし。scanner が本物のコンベンションを抽出し、すべての Claude pass が明示的な path allowlist に対して走ります。 |
| **新しい repo への onboarding** (既存プロジェクト、チームに参加) | repo で `init` を実行するだけで、生きた architecture map が手に入る: CLAUDE.md のスタック表、レイヤごとのルール (✅/❌ 例つき)、主要な選択 ("なぜ") を seed した decision log (JPA vs MyBatis、REST vs GraphQL など)。5 ファイルを読む方が 5,000 ソースファイルを読むより速い。 |
| **日本語 / 韓国語 / 中国語 / 他 7 言語で作業** | 大半の Claude Code rule generator は英語のみ。ClaudeOS-Core は **10 言語** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) で完全なセットを書き、**byte-identical な構造検証** — 出力言語に関係なく同じ `claude-md-validator` の verdict。 |
| **monorepo で作業** (Turborepo、pnpm/yarn workspaces、Lerna) | 1 回の実行で backend + frontend のドメインが個別 prompt で解析される。`apps/*/` と `packages/*/` は自動的に walk され、スタック別のルールが `70.domains/{type}/` 配下に emit される。 |
| **OSS 貢献または実験** | 出力は gitignore-friendly — `claudeos-core/` はローカル作業ディレクトリ、ship が必要なのは `CLAUDE.md` + `.claude/` のみ。中断時 resume-safe、再実行 idempotent (`--force` なしなら手動編集は保持される)。 |

**適していないケース:** scan 段階を経ずに day-one から動く agents/skills/rules の one-size-fits-all なプリセットバンドルが欲しい場合 (どのツールがどこに適しているかは [docs/comparison.md](docs/ja/comparison.md) を参照)、もしくはプロジェクトが [サポート対象スタック](#supported-stacks) のいずれにもまだ該当しない場合、または単一の `CLAUDE.md` だけ欲しい場合 (ビルトインの `claude /init` で十分 — 別ツールを入れる必要はありません)。

---

## どのように動作しますか？

ClaudeOS-Core は通常の Claude Code ワークフローを反転させます:

```
通常:    人がプロジェクトを説明 → Claude がスタックを推測 → Claude が docs を作成
このツール: コードがスタックを読む → コードが確定した事実を Claude に渡す → Claude が事実から docs を作成
```

パイプラインは **3 段階** で実行され、LLM 呼び出しの両側にコードがあります:

**1. Step A — Scanner (deterministic、LLM なし)。** Node.js scanner がプロジェクトルートを walk し、`package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` を読み、`.env*` ファイルをパースし (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` のような sensitive な変数は redaction)、architecture pattern を分類し (Java の 5 パターン A/B/C/D/E、Kotlin CQRS / multi-module、Next.js App vs Pages Router、FSD、components-pattern)、ドメインを発見し、存在するすべてのソースファイルパスの明示的 allowlist を構築します。出力: `project-analysis.json` — 以降のすべての段階の単一の source of truth です。

**2. Step B — 4-Pass Claude パイプライン (Step A の事実によって制約される)。**
- **Pass 1** はドメイングループごとに代表ファイルを読み、ドメインあたり ~50–100 のコンベンションを抽出します — response wrapper、logging library、error handling、naming convention、test pattern。ドメイングループごとに 1 回実行される (`max 4 domains, 40 files per group`) ため context が overflow しません。
- **Pass 2** はドメインごとの解析をすべてプロジェクト全体の像にマージし、ドメイン間で意見が割れたときは支配的なコンベンションを選びます。
- **Pass 3** は `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides を書きます — stage に分割 (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) されるため、`pass2-merged.json` が大きい場合でも各 stage の prompt が LLM の context window に収まります。≥16 ドメインのプロジェクトでは 3b/3c を ≤15 ドメインの batch に sub-divide します。
- **Pass 4** は L4 memory layer (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) を seed し、universal な scaffold rules を追加します。Pass 4 は **`CLAUDE.md` の修正を禁止** されています — Pass 3 の Section 8 が authoritative です。

**3. Step C — Verification (deterministic、LLM なし)。** 5 つの validator が出力を検査します:
- `claude-md-validator` — `CLAUDE.md` に対する 25 個の構造チェック (8 sections、H3/H4 count、memory file uniqueness、T1 canonical heading invariant)。Language-invariant: `--lang` に関係なく同じ verdict。
- `content-validator` — 10 個の content チェック。path-claim 検証 (`STALE_PATH` が捏造された `src/...` 参照を検出) と MANIFEST drift 検出を含む。
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count。
- `plan-validator` — plan ↔ disk の整合性 (legacy、v2.1.0 以降ほぼ no-op)。
- `sync-checker` — 7 個の追跡対象ディレクトリにわたる disk ↔ `sync-map.json` 登録の整合性。

3-tier severity (`fail` / `warn` / `advisory`) なので、ユーザが手動で直せる LLM hallucination について warning が CI を deadlock させることはありません。

すべてを結びつける invariant: **Claude はコードに実在するパスしか引用できない** — Step A が finite な allowlist を渡しているからです。それでも LLM が何かをでっち上げようとしたら (まれですが特定の seed で起きます)、Step C が docs を ship する前に捕まえます。

per-pass の詳細、marker ベースの resume、Claude Code の `.claude/` sensitive-path block を回避する staged-rules の仕組み、stack 検出の internals は [docs/architecture.md](docs/ja/architecture.md) を参照。

---

## Supported Stacks

12 種のスタック、プロジェクトファイルから自動検出:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

マルチスタックのプロジェクト (例: Spring Boot バックエンド + Next.js フロントエンド) もそのまま動作します。

検出ルールと各 scanner が抽出する内容は [docs/ja/stacks.md](docs/ja/stacks.md) を参照。

---

## 日常のワークフロー

3 つのコマンドで使用量の約 95% をカバーします:

```bash
# プロジェクトでの初回実行
npx claudeos-core init

# standards や rules を手動編集した後
npx claudeos-core lint

# ヘルスチェック (コミット前または CI で実行)
npx claudeos-core health
```

memory layer のメンテナンス用にもう 2 つ:

```bash
# failure-patterns ログのコンパクション (定期的に実行)
npx claudeos-core memory compact

# 頻発する failure pattern を提案ルールへ昇格
npx claudeos-core memory propose-rules
```

各コマンドの全オプションは [docs/ja/commands.md](docs/ja/commands.md) を参照。

---

## 何が違うのか

ほとんどの Claude Code ドキュメント生成ツールは「説明」から始まります (人がツールに伝え、ツールが Claude に伝える)。ClaudeOS-Core は「実際のソースコード」から始まります (ツールが読み、確定した事実を Claude に伝え、Claude は確定した内容だけを書く)。

具体的な 3 つの帰結:

1. **Deterministic stack detection.** 同じプロジェクト + 同じコード = 同じ出力。「今回は Claude のサイコロが違った」現象がない。
2. **No invented paths.** Pass 3 のプロンプトは許可されたソースパスをすべて明示的に列挙 — Claude は存在しないパスを引用できない。
3. **Multi-stack aware.** バックエンドとフロントエンドのドメインが同一実行内でそれぞれ異なる解析プロンプトを使用。

他ツールとの scope 比較は [docs/ja/comparison.md](docs/ja/comparison.md) を参照。比較は **各ツールが何をするか** に関するもので、**どれが優れているか** ではありません — ほとんどは相補的です。

---

## 検証 (post-generation)

Claude が docs を書いた後、コードがそれを検証します。5 つの独立した validator:

| Validator | 検査内容 | 実行元 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md の構造的不変条件 (8 sections、language-invariant) | `claudeos-core lint` |
| `content-validator` | パスクレームが実在するか、manifest の整合性 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 の出力が well-formed JSON か | `health` (warn) |
| `plan-validator` | 保存された plan がディスクと一致するか | `health` (fail-on-error) |
| `sync-checker` | ディスク上のファイルが `sync-map.json` の登録と一致するか (orphaned/unregistered の検出) | `health` (fail-on-error) |

`health-checker` が 4 つのランタイム validator を 3 段階の severity (fail / warn / advisory) でオーケストレーションし、CI に適した exit code で終了します。`claude-md-validator` は構造的な drift が soft warning ではなく re-init のシグナルなので、`lint` コマンドで個別に実行されます。いつでも実行可能:

```bash
npx claudeos-core health
```

各 validator の検査項目は [docs/ja/verification.md](docs/ja/verification.md) を参照。

---

## Memory Layer (任意、長期プロジェクト向け)

v2.0 以降、ClaudeOS-Core は 4 つのファイルが入った `claudeos-core/memory/` フォルダを書き込みます:

- `decision-log.md` — append-only な「なぜ Y ではなく X を選んだのか」
- `failure-patterns.md` — frequency/importance スコア付きの繰り返し発生するエラー
- `compaction.md` — 時間とともに memory がどのように自動コンパクションされるか
- `auto-rule-update.md` — 新ルールに昇格すべきパターン

`npx claudeos-core memory propose-rules` を実行すると、Claude に最近の failure pattern を見せて新しいルールを提案させることができます。

memory モデルとライフサイクルは [docs/ja/memory-layer.md](docs/ja/memory-layer.md) を参照。

---

## FAQ

**Q: Claude API キーが必要ですか?**
A: 不要です。ClaudeOS-Core は既存の Claude Code インストールを利用します — マシン上の `claude -p` にプロンプトを流すだけです。追加のアカウントは不要です。

**Q: 既存の CLAUDE.md や `.claude/rules/` を上書きしますか?**
A: 新しいプロジェクトでの初回実行: 新規作成します。`--force` なしの再実行: 編集内容を保持 — 前回実行の pass marker が検出されると該当 pass はスキップされます。`--force` での再実行: すべてを wipe して再生成 (編集内容は失われます — それが `--force` の意味です)。詳しくは [docs/ja/safety.md](docs/ja/safety.md) を参照。

**Q: 自分のスタックがサポート対象外です。追加できますか?**
A: できます。新しいスタックには ~3 個のプロンプトテンプレートとドメイン scanner が必要です。8 ステップガイドは [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

**Q: 日本語 (または別言語) で docs を生成するには?**
A: `npx claudeos-core init --lang ja`. 10 言語をサポート: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: monorepo でも動作しますか?**
A: 動作します — Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) は stack-detector が検出します。各 app が独自の解析を受けます。それ以外の monorepo レイアウト (例: NX) は明示的には検出されませんが、汎用的な `apps/*/` と `packages/*/` のパターンはスタック別 scanner が拾います。

**Q: Claude Code が同意できないルールを生成したら?**
A: 直接編集してください。その後 `npx claudeos-core lint` を実行して CLAUDE.md が構造的に有効なままか確認します。以後の `init` 実行 (`--force` なし) では編集内容が保持されます — resume メカニズムが marker のある pass をスキップするためです。

**Q: バグはどこに報告すれば?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). セキュリティ問題は [SECURITY.md](SECURITY.md) を参照。

---

## Documentation

| トピック | 読むもの |
|---|---|
| 4-pass パイプラインの仕組み (図解より深く) | [docs/ja/architecture.md](docs/ja/architecture.md) |
| アーキテクチャの視覚的ダイアグラム (Mermaid) | [docs/ja/diagrams.md](docs/ja/diagrams.md) |
| Stack 検出 — 各 scanner が見るもの | [docs/ja/stacks.md](docs/ja/stacks.md) |
| Memory layer — decision log と failure pattern | [docs/ja/memory-layer.md](docs/ja/memory-layer.md) |
| 5 つの validator の詳細 | [docs/ja/verification.md](docs/ja/verification.md) |
| すべての CLI コマンドとオプション | [docs/ja/commands.md](docs/ja/commands.md) |
| 手動インストール (`npx` なし) | [docs/ja/manual-installation.md](docs/ja/manual-installation.md) |
| Scanner override — `.claudeos-scan.json` | [docs/ja/advanced-config.md](docs/ja/advanced-config.md) |
| 安全性: re-init で保持されるもの | [docs/ja/safety.md](docs/ja/safety.md) |
| 類似ツールとの比較 (scope であり品質ではない) | [docs/ja/comparison.md](docs/ja/comparison.md) |
| エラーと復旧 | [docs/ja/troubleshooting.md](docs/ja/troubleshooting.md) |

---

## Contributing

コントリビューション歓迎です — スタック対応の追加、プロンプトの改善、バグ修正など。詳しくは [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

行動規範とセキュリティポリシーは [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) と [SECURITY.md](SECURITY.md) を参照。

## License

[ISC](LICENSE) — 商用を含めあらゆる用途で自由に利用可能。

---

<sub>[@claudeos-core](https://github.com/claudeos-core) が手をかけて作成しました。時間を節約できたなら、GitHub の ⭐ がプロジェクトの可視性を保ちます。</sub>
