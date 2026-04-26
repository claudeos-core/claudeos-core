# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**実際のソースコードから `CLAUDE.md` + `.claude/rules/` を自動生成する deterministic CLI — Node.js scanner + 4-pass Claude パイプライン + 5 個の validator。12 stack、10 言語、invented path なし。**

```bash
npx claudeos-core init
```

[**12 stacks**](#supported-stacks) で動作 (monorepo 含む) — コマンド一発、設定不要、resume-safe、idempotent。

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## これは何?

Claude Code は毎セッション framework のデフォルト値に fallback します。チームは **MyBatis** を使っているのに、Claude は JPA を書きます。あなたの wrapper は `ApiResponse.ok()` なのに、Claude は `ResponseEntity.success()` を書きます。あなたのパッケージは layer-first なのに、Claude は domain-first で生成します。repo ごとに `.claude/rules/` を手書きすれば解決しますが — コードが進化するとルールが drift します。

**ClaudeOS-Core は実際のソースコードから deterministic に再生成します。** Node.js scanner がまず読み取り (stack、ORM、パッケージ layout、ファイルパス)。その後 4-pass Claude パイプラインがフルセットを書き出します — `CLAUDE.md` + 自動ロードされる `.claude/rules/` + standards + skills — LLM が escape できない明示的な path allowlist によって制約されます。5 個の validator が ship 前に出力を検証します。

結果: 同じ入力 → byte-identical な出力、10 言語のいずれでも、invented path なし。(詳細は下の [何が違うのか](#何が違うのか) を参照。)

長期プロジェクト向けには別途 [Memory Layer](#memory-layer-任意長期プロジェクト向け) が seed されます。

---

## 実プロジェクトで動かしてみる

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) で実行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files。出力: **75 generated files**、合計時間 **53 分**、すべての validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>ターミナル出力 (テキスト版、検索・コピー用)</strong></summary>

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
<summary><strong>あなたの <code>CLAUDE.md</code> に入る内容 (実際の抜粋 — Section 1 + 2)</strong></summary>

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

上記のすべての値 — 正確な dependency 座標、`dev.db` ファイル名、`V1__create_tables.sql` というマイグレーション名、"no JPA" — は、Claude がファイルを書く前に scanner が `build.gradle` / `application.properties` / ソースツリーから抽出したものです。何も推測されていません。

</details>

<details>
<summary><strong>実際の自動ロード rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

`paths: ["**/*"]` の glob は、プロジェクト内のどのファイルを編集しても Claude Code がこの rule を自動ロードするという意味です。rule 内のすべてのクラス名、パッケージパス、exception handler は scan されたソースから直接抽出 — プロジェクトの実際の `CustomizeExceptionHandler` と `JacksonCustomizations` まで含まれます。

</details>

<details>
<summary><strong>自動生成された <code>decision-log.md</code> seed (実際の抜粋)</strong></summary>

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

Pass 4 は `pass2-merged.json` から抽出したアーキテクチャ上の決定で `decision-log.md` を seed します — 以後のセッションがコードベースが _どう見えるか_ だけでなく _なぜ_ そうなっているのかを覚えていられるように。すべての選択肢 ("JPA/Hibernate"、"MyBatis-Plus") とすべての結果は、実際の `build.gradle` の dependency ブロックに基づいています。

</details>

---

## テスト済みプロジェクト

ClaudeOS-Core は実際の OSS プロジェクトで計測した reference ベンチマークと共に ship されます。public repo で使ってみた方は [issue を立ててください](https://github.com/claudeos-core/claudeos-core/issues) — この表に追加します。

| プロジェクト | Stack | Scanned → Generated | ステータス |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ 5 個の validator すべて pass |

---

## クイックスタート

**前提条件:** Node.js 18+、[Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストール済みかつ認証済み。

```bash
# 1. プロジェクトルートに移動
cd my-spring-boot-project

# 2. init を実行 (コードを解析し、Claude に rules の作成を依頼します)
npx claudeos-core init

# 3. 完了。Claude Code を開いてコーディング開始 — rules はすでにロードされています。
```

`init` 完了後、**手に入るもの**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code が自動ロード
│       ├── 00.core/              (共通 rules — 命名、アーキテクチャ)
│       ├── 10.backend/           (バックエンド stack rules、該当時)
│       ├── 20.frontend/           (フロントエンド stack rules、該当時)
│       ├── 30.security-db/       (セキュリティ & DB 規約)
│       ├── 40.infra/             (env、ロギング、CI/CD)
│       ├── 50.sync/              (ドキュメント同期リマインダ — rules only)
│       ├── 60.memory/            (memory rules — Pass 4、rules only)
│       ├── 70.domains/{type}/    (ドメイン別 rules、type = backend|frontend)
│       └── 80.verification/      (テスト戦略 + ビルド検証リマインダ)
├── claudeos-core/
│   ├── standard/                 ← リファレンスドキュメント (カテゴリ構造をミラー)
│   │   ├── 00.core/              (プロジェクト概要、アーキテクチャ、命名)
│   │   ├── 10.backend/           (バックエンド reference — バックエンド stack 時)
│   │   ├── 20.frontend/          (フロントエンド reference — フロントエンド stack 時)
│   │   ├── 30.security-db/       (セキュリティ & DB reference)
│   │   ├── 40.infra/             (env / ロギング / CI-CD reference)
│   │   ├── 70.domains/{type}/    (ドメイン別 reference)
│   │   ├── 80.verification/      (ビルド / 起動 / テスト reference — standard only)
│   │   └── 90.optional/          (stack 別の追加 — standard only)
│   ├── skills/                   (Claude が適用可能な再利用パターン)
│   ├── guide/                    (一般的なタスク向け how-to ガイド)
│   ├── database/                 (スキーマ概要、マイグレーションガイド)
│   ├── mcp-guide/                (MCP 統合ノート)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude が最初に読むインデックス)
```

`rules/` と `standard/` の間で同じ番号 prefix を共有するカテゴリは、同じ概念領域を表します (例: `10.backend` rules ↔ `10.backend` standards)。Rules-only カテゴリ: `50.sync` (ドキュメント同期リマインダ)、`60.memory` (Pass 4 memory)。Standard-only カテゴリ: `90.optional` (強制力のない stack 別追加)。それ以外のすべての prefix (`00`、`10`、`20`、`30`、`40`、`70`、`80`) は `rules/` と `standard/` の両方に存在します。これで Claude Code はあなたのプロジェクトを知っています。

---

## 誰のためのツール?

| あなたが... | このツールが取り除く pain |
|---|---|
| **Claude Code で新しいプロジェクトを始めるソロ開発者** | 「毎セッション Claude に規約を教える」 — 消滅。`CLAUDE.md` + 8 カテゴリ `.claude/rules/` を一発で生成。 |
| **複数 repo の共有標準を維持するチームリード** | パッケージ名変更、ORM 切り替え、response wrapper 変更による `.claude/rules/` の drift。ClaudeOS-Core は deterministic に再同期 — 同じ入力、byte-identical な出力、diff noise なし。 |
| **すでに Claude Code を使っているが、生成コードの修正に疲れたユーザー** | 間違った response wrapper、間違ったパッケージ layout、MyBatis を使っているのに JPA、中央集権 middleware なのに `try/catch` が散在。scanner が本物の規約を抽出し、すべての Claude pass が明示的な path allowlist に対して実行されます。 |
| **新しい repo に onboarding** (既存プロジェクト、チーム参加) | repo で `init` を実行すると生きたアーキテクチャ map が得られます: CLAUDE.md の stack 表、レイヤー別 rules with ✅/❌ 例、主要な決定の「なぜ」が seed された decision log (JPA vs MyBatis、REST vs GraphQL など)。5 ファイル読むほうが 5,000 ソースファイル読むより速いです。 |
| **韓国語 / 日本語 / 中国語 / 他 7 言語で作業** | ほとんどの Claude Code rule generator は英語のみ。ClaudeOS-Core は **10 言語** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) でフルセットを書き、**byte-identical な構造検証** — 出力言語に関係なく同じ `claude-md-validator` の判定。 |
| **monorepo で作業** (Turborepo、pnpm/yarn workspaces、Lerna) | 1 度の実行で backend + frontend のドメインを別々の prompt で解析; `apps/*/` と `packages/*/` を自動で walk; stack 別の rules は `70.domains/{type}/` 配下に emit。 |
| **OSS への貢献または実験** | 出力は gitignore-friendly — `claudeos-core/` はローカルの作業 dir、`CLAUDE.md` + `.claude/` だけが ship されればよい。中断しても resume-safe; 再実行は idempotent (rule の手動編集は `--force` がなければ保存されます)。 |

**適合しない場合:** scan ステップなしで day-one から動く one-size-fits-all な agents/skills/rules のプリセットバンドルが欲しい場合 (どれがどこに合うかは [docs/ja/comparison.md](docs/ja/comparison.md) 参照)、プロジェクトがまだ [サポート対象 stack](#supported-stacks) のいずれにも一致しない場合、または単一の `CLAUDE.md` だけが必要な場合 (組み込みの `claude /init` で十分 — 別ツールをインストールする必要はありません)。

---

## 仕組み

ClaudeOS-Core は通常の Claude Code ワークフローを反転させます:

```
通常:    人がプロジェクトを説明 → Claude が stack を推測 → Claude が docs を作成
このツール: コードが stack を読み取る → コードが確定した事実を Claude に渡す → Claude が事実から docs を作成
```

パイプラインは **3 段階** で実行され、LLM 呼び出しの両側にコードがあります:

**1. Step A — Scanner (deterministic、LLM なし)。** Node.js scanner がプロジェクトルートを walk し、`package.json` / `build.gradle` / `pom.xml` / `pyproject.toml` を読み、`.env*` ファイルを parse し (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` のような sensitive variable は redaction)、アーキテクチャパターンを分類 (Java の 5 パターン A/B/C/D/E、Kotlin CQRS / multi-module、Next.js App vs Pages Router、FSD、components-pattern)、ドメインを発見し、存在するすべてのソースファイルパスの明示的な allowlist を構築します。出力: `project-analysis.json` — 後続すべての単一の source of truth。

**2. Step B — 4-Pass Claude パイプライン (Step A の事実によって制約)。**
- **Pass 1** はドメイングループごとに代表ファイルを読み、ドメインあたり ~50–100 個の規約を抽出 — response wrapper、logging library、error handling、命名規約、test pattern。ドメイングループあたり 1 回実行 (`max 4 domains, 40 files per group`) なので context が overflow しません。
- **Pass 2** はすべてのドメイン別解析をプロジェクト全体像にマージし、ドメイン間で disagree したときは dominant な規約を選択して解決します。
- **Pass 3** は `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides を作成 — stage に split (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) され、`pass2-merged.json` が大きくても各 stage の prompt が LLM の context window に収まります。≥16 ドメインのプロジェクトでは 3b/3c を ≤15 ドメインの batch にさらに分割します。
- **Pass 4** は L4 memory layer (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) を seed し、universal な scaffold rules を追加します。Pass 4 は **`CLAUDE.md` の変更が禁止** されています — Pass 3 の Section 8 が authoritative。

**3. Step C — Verification (deterministic、LLM なし)。** 5 個の validator が出力を検査:
- `claude-md-validator` — `CLAUDE.md` に対する 25 個の構造検査 (8 sections、H3/H4 count、memory file uniqueness、T1 canonical heading invariant)。Language-invariant: `--lang` に関係なく同じ判定。
- `content-validator` — 10 個の content 検査、path-claim 検証 (`STALE_PATH` が捏造された `src/...` 参照を検出) と MANIFEST drift 検出を含む。
- `pass-json-validator` — Pass 1/2/3/4 JSON の well-formedness + stack-aware なセクション数。
- `plan-validator` — plan ↔ disk 一貫性 (legacy、v2.1.0 以降ほぼ no-op)。
- `sync-checker` — 7 個の追跡ディレクトリにわたる disk ↔ `sync-map.json` 登録一貫性。

3-tier severity (`fail` / `warn` / `advisory`) なので、ユーザーが手動で修正できる LLM の hallucination で warning が CI を deadlock させることはありません。

すべてを束ねる invariant: **Claude は実際にコードに存在するパスしか引用できない** — Step A が finite な allowlist を渡すから。LLM がそれでも何かを発明しようとすると (まれだが特定の seed で発生)、Step C が docs の ship 前に検出します。

per-pass の詳細、marker ベースの resume、Claude Code の `.claude/` sensitive-path block を回避する staged-rules ワークアラウンド、stack 検出の内部実装は [docs/ja/architecture.md](docs/ja/architecture.md) を参照。

---

## Supported Stacks

12 個の stack、プロジェクトファイルから自動検出:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

マルチスタックプロジェクト (例: Spring Boot バックエンド + Next.js フロントエンド) もそのまま動作します。

検出ルールと各 scanner が抽出する内容は [docs/ja/stacks.md](docs/ja/stacks.md) を参照。

---

## 日常のワークフロー

3 つのコマンドで使用量の ~95% をカバーします:

```bash
# プロジェクトでの初回実行
npx claudeos-core init

# standards や rules を手動で編集した後
npx claudeos-core lint

# ヘルスチェック (コミット前または CI で実行)
npx claudeos-core health
```

各コマンドのフルオプションは [docs/ja/commands.md](docs/ja/commands.md) を参照。memory layer のコマンド (`memory compact`、`memory propose-rules`) は下の [Memory Layer](#memory-layer-任意長期プロジェクト向け) セクションで扱います。

---

## 何が違うのか

ほとんどの Claude Code ドキュメントツールは説明から出発します (人がツールに伝え、ツールが Claude に伝える)。ClaudeOS-Core は実際のソースコードから出発します (ツールが読み、確定した事実を Claude に伝え、Claude は確定したものだけを書く)。

3 つの具体的な結果:

1. **Deterministic stack detection。** 同じプロジェクト + 同じコード = 同じ出力。「今回は Claude が違う出方をした」がありません。
2. **No invented paths。** Pass 3 prompt が許可されたすべてのソースパスを明示的に列挙 — Claude は存在しないパスを引用できません。
3. **Multi-stack aware。** 同じ実行内でバックエンドとフロントエンドのドメインが異なる解析 prompt を使用。

他ツールとの scope 比較は [docs/ja/comparison.md](docs/ja/comparison.md) を参照。比較は **各ツールが何をするか** に関するもので、**どれが優れているか** ではありません — ほとんどは相互補完的です。

---

## 検証 (生成後)

Claude が docs を書いた後、コードがそれを検証します。5 つの独立した validator:

| Validator | 検査内容 | 実行主体 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md の構造的不変条件 (8 sections、language-invariant) | `claudeos-core lint` |
| `content-validator` | path claim が実在するか; manifest 一貫性 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 の出力が well-formed JSON か | `health` (warn) |
| `plan-validator` | 保存された plan が disk と一致するか | `health` (fail-on-error) |
| `sync-checker` | `sync-map.json` の登録項目が disk のファイルと一致するか (orphaned/unregistered 検出) | `health` (fail-on-error) |

`health-checker` が 4 つの runtime validator を 3-tier severity (fail / warn / advisory) でオーケストレートし、CI に適した exit code で終了します。`claude-md-validator` は `lint` コマンドで個別に実行されます — 構造的 drift は soft warning ではなく re-init シグナルだからです。いつでも実行可能:

```bash
npx claudeos-core health
```

各 validator の検査項目の詳細は [docs/ja/verification.md](docs/ja/verification.md) を参照。

---

## Memory Layer (任意、長期プロジェクト向け)

上記の scaffolding パイプラインに加え、ClaudeOS-Core は context が単一セッションを超えて生き残るプロジェクト向けに `claudeos-core/memory/` フォルダを seed します。任意です — `CLAUDE.md` + rules だけが欲しいなら無視可能。

4 つのファイル、すべて Pass 4 が書きます:

- `decision-log.md` — append-only 形式の「なぜ X ではなく Y を選んだか」、`pass2-merged.json` から seed
- `failure-patterns.md` — frequency/importance のスコア付きの繰り返し発生エラー
- `compaction.md` — 時間とともに memory が自動 compaction される方式
- `auto-rule-update.md` — 新しい rules に昇格すべきパターン

この layer を時間とともに維持する 2 つのコマンド:

```bash
# failure-patterns ログを compact (定期的に実行)
npx claudeos-core memory compact

# 頻発する failure pattern を提案 rule に昇格
npx claudeos-core memory propose-rules
```

memory モデルとライフサイクルは [docs/ja/memory-layer.md](docs/ja/memory-layer.md) を参照。

---

## FAQ

**Q: Claude API キーは必要ですか?**
A: いいえ。ClaudeOS-Core は既存の Claude Code インストールを使用します — ローカルマシンの `claude -p` に prompt をパイプするだけです。追加アカウントは不要です。

**Q: 既存の CLAUDE.md や `.claude/rules/` を上書きしますか?**
A: 新規プロジェクトでの初回実行: 新規作成します。`--force` なしの再実行: 編集内容を保持 — 前回実行の pass marker が検出され、該当 pass はスキップされます。`--force` で再実行: すべてを wipe して再生成 (編集内容は失われます — それが `--force` の意味)。[docs/ja/safety.md](docs/ja/safety.md) を参照。

**Q: 私の stack がサポートされていません。追加できますか?**
A: はい。新しい stack には ~3 個の prompt テンプレート + ドメイン scanner が必要です。8 ステップガイドは [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

**Q: 韓国語 (または他の言語) で docs を生成するには?**
A: `npx claudeos-core init --lang ko`。10 言語サポート: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de。

**Q: monorepo で動きますか?**
A: はい — Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) は stack-detector が検出します。各 app が独自の解析を受け取ります。他の monorepo レイアウト (例: NX) は明示的には検出しませんが、汎用の `apps/*/` と `packages/*/` パターンは stack 別 scanner がそのまま拾います。

**Q: Claude Code が同意しがたい rules を生成したら?**
A: 直接編集してください。その後 `npx claudeos-core lint` で CLAUDE.md の構造がまだ有効か確認します。以後の `init` 実行で (`--force` なしなら) 編集内容は保持されます — resume メカニズムが marker のある pass をスキップします。

**Q: バグはどこに報告すれば?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。セキュリティ問題は [SECURITY.md](SECURITY.md) を参照。

---

## 時間が節約できたなら

GitHub の ⭐ がプロジェクトの可視性を保ち、他の人が見つける助けになります。issue、PR、stack template の貢献はすべて歓迎 — [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

---

## ドキュメント

| トピック | これを読む |
|---|---|
| 4-pass パイプラインの動作 (図より深く) | [docs/ja/architecture.md](docs/ja/architecture.md) |
| アーキテクチャの視覚的ダイアグラム (Mermaid) | [docs/ja/diagrams.md](docs/ja/diagrams.md) |
| Stack 検出 — 各 scanner が見るもの | [docs/ja/stacks.md](docs/ja/stacks.md) |
| Memory layer — decision log と failure pattern | [docs/ja/memory-layer.md](docs/ja/memory-layer.md) |
| 5 個の validator の詳細 | [docs/ja/verification.md](docs/ja/verification.md) |
| すべての CLI コマンドとオプション | [docs/ja/commands.md](docs/ja/commands.md) |
| 手動インストール (`npx` なし) | [docs/ja/manual-installation.md](docs/ja/manual-installation.md) |
| Scanner オーバーライド — `.claudeos-scan.json` | [docs/ja/advanced-config.md](docs/ja/advanced-config.md) |
| 安全性: re-init で保持されるもの | [docs/ja/safety.md](docs/ja/safety.md) |
| 類似ツールとの比較 (scope であり品質ではない) | [docs/ja/comparison.md](docs/ja/comparison.md) |
| エラーと復旧 | [docs/ja/troubleshooting.md](docs/ja/troubleshooting.md) |

---

## 貢献

貢献を歓迎します — stack サポートの追加、prompt の改善、バグ修正。[CONTRIBUTING.md](CONTRIBUTING.md) を参照。

行動規範とセキュリティポリシーは [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) と [SECURITY.md](SECURITY.md) を参照。

## ライセンス

[ISC License](LICENSE)。商用を含むあらゆる用途で自由に使用可能。© 2025–2026 ClaudeOS-Core contributors.

---

<sub>[claudeos-core](https://github.com/claudeos-core) チームがメンテナンスしています。issue と PR は <https://github.com/claudeos-core/claudeos-core> へ。</sub>
