# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**実際のソースコードから Claude Code 用ドキュメントを自動生成します。** プロジェクトを静的に解析したうえで 4-pass の Claude パイプラインを実行し、`.claude/rules/`、standards、skills、guides を生成する CLI ツールです。その結果、Claude Code は一般的なコンベンションではなく **あなたのプロジェクト固有のコンベンション** に従います。

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## このツールは何ですか？

あなたは Claude Code を使っています。賢いツールですが、**あなたのプロジェクトのコンベンション** までは知りません:
- チームでは MyBatis を使っているのに、Claude は JPA のコードを生成する。
- ラッパーは `ApiResponse.ok()` なのに、Claude は `ResponseEntity.success()` と書く。
- パッケージは `controller/order/` なのに、Claude は `order/controller/` を作る。

そのため、生成されたファイルを修正することにかなりの時間を費やすことになります。

**ClaudeOS-Core はこの問題を解決します。** 実際のソースコードをスキャンしてコンベンションを把握し、Claude Code が自動で読み込むディレクトリ `.claude/rules/` に完全なルールセットを書き込みます。次に *「order の CRUD を作って」* と頼めば、Claude は最初の試行であなたのコンベンションに従います。

```
Before:  あなた → Claude Code → 「概ね良い」コード → 手作業で修正
After:   あなた → Claude Code → プロジェクトに一致するコード → そのまま使える
```

---

## 実際のプロジェクトでのデモ

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) で実行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. 結果: **75 generated files**、合計時間 **53 分**、すべての validator ✅。

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
<summary><strong>📄 生成された <code>CLAUDE.md</code> の抜粋 (実際の出力)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

注: 上記の主張はすべて実際のソースに基づいています — クラス名、パッケージパス、設定キー、dead-config フラグまで、すべて Claude がファイルを書く前に scanner が抽出したものです。

</details>

<details>
<summary><strong>🛡️ 自動ロードされる実際のルール (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

`paths: ["**/*"]` の glob は、プロジェクト内のいずれかのファイルを編集すると Claude Code がこのルールを自動ロードすることを意味します。✅/❌ の例は、このコードベースの実際のコンベンションと既存のバグパターンから直接抽出されています。

</details>

<details>
<summary><strong>🧠 自動生成された <code>decision-log.md</code> シード (実際の出力)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 は `pass2-merged.json` から抽出したアーキテクチャ上の決定事項で `decision-log.md` を seed します — そのため、その後のセッションでもコードベースが _このように見える_ という事実だけでなく、_なぜ_ そう見えるのかも記憶できます。

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
│       ├── 20.frontend/          (フロントエンドスタックのルール、該当する場合)
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

| あなたが... | このツールが助けるのは... |
|---|---|
| **Claude Code で新規プロジェクトを始めるソロ開発者** | 「Claude にコンベンションを教える」フェーズを丸ごとスキップ |
| **共有標準を維持するチームリード** | `.claude/rules/` を最新に保つ手間を自動化 |
| **既に Claude Code を使っているが生成コードの修正に疲れた人** | Claude が「概ね良い」パターンではなく、_あなたの_ パターンに従うようにする |

**適していないケース:** スキャン手順なしで初日から動く agents/skills/rules の one-size-fits-all なプリセットバンドルが欲しい場合 (どのツールがどこに合うかは [docs/comparison.md](docs/ja/comparison.md) を参照)、もしくはプロジェクトが [サポート対象スタック](#supported-stacks) に該当しない場合。

---

## どのように動作しますか？

ClaudeOS-Core は通常の Claude Code ワークフローを反転させます:

```
通常:    人がプロジェクトを説明 → Claude がスタックを推測 → Claude が docs を作成
このツール: コードがスタックを読む → コードが確定した事実を Claude に渡す → Claude が事実から docs を作成
```

ポイント: **Node.js scanner が先にソースコードを読み** (deterministic、AI なし)、その後 4-pass の Claude パイプラインが scanner で見つけた事実に制約された形でドキュメントを書きます。Claude はコードに実在しないパスやフレームワークをでっち上げることができません。

アーキテクチャ全体は [docs/ja/architecture.md](docs/ja/architecture.md) を参照。

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
