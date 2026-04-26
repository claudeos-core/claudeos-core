# Verification

Claude が docs を生成した後、コードが **5 つの独立した validator** を通して出力を検証します。LLM を呼ぶものはありません — すべて deterministic です。

このページでは、各 validator が何を検査するか、severity tier の仕組み、そして出力の読み方をカバーします。

> 英語原文: [docs/verification.md](../verification.md). 日本語訳は英語版に追従して同期されています。

---

## なぜ post-generation で検証するのか

LLM は非決定的です。事実注入プロンプト ([ソースパスの allowlist](architecture.md#事実注入プロンプトが幻覚を防ぐ)) があっても、Claude は依然として:

- コンテキスト圧の下で必須セクションをスキップしうる。
- allowlist にほぼ一致するが少し違うパスを引用しうる (例: 親ディレクトリ + TypeScript 定数名から発明された `src/feature/routers/featureRoutePath.ts`)。
- standards と rules 間で矛盾する相互参照を生成しうる。
- Section 8 のコンテンツを CLAUDE.md の他の場所で再宣言しうる。

validator はこうした「静かに悪い」出力を docs が出荷される前に捕捉します。

---

## 5 つの validator

### 1. `claude-md-validator` — 構造的不変条件

`CLAUDE.md` を構造的検査群に対して検証します (下表は check ID ファミリの一覧 — `checkSectionsHaveContent` と `checkCanonicalHeadings` がセクションごとに 1 つずつ emit するため、報告される個別 ID の総数は変動します)。`claude-md-validator/` にあります。

**実行方法:**
```bash
npx claudeos-core lint
```

(`health` では実行されません — 後述 [なぜ 2 つのエントリポイント: lint vs health](#なぜ-2-つのエントリポイント-lint-vs-health) を参照。)

**検査内容:**

| Check ID | 強制内容 |
|---|---|
| `S1` | セクション数がきっかり 8 |
| `S2-N` | 各セクションが少なくとも 2 行の非空 body を持つ |
| `S-H3-4` | Section 4 が 3 個または 4 個の H3 サブセクションを持つ |
| `S-H3-6` | Section 6 がきっかり 3 個の H3 サブセクションを持つ |
| `S-H3-8` | Section 8 がきっかり 2 個の H3 サブセクションを持つ |
| `S-H4-8` | Section 8 がきっかり 2 個の H4 見出し (L4 Memory Files / Memory Workflow) を持つ |
| `M-<file>` | 4 つの memory ファイル (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) のそれぞれが、ちょうど 1 行の markdown table 行に出現 |
| `F2-<file>` | memory ファイルの table 行が Section 8 内に閉じている |
| `T1-1` 〜 `T1-8` | 各 `## N.` セクションの見出しが英語の canonical トークン (`Role Definition`、`Project Overview`、`Build`、`Core Architecture`、`Directory Structure`、`Standard`、`DO NOT Read`、`Memory`) を含む — 大文字小文字を無視した部分文字列マッチ |

**Language-invariant の理由:** validator は翻訳された見出しの文章には決して一致させません。markdown 構造 (見出しレベル、数、順序) と英語 canonical トークンのみに一致します。10 言語のいずれで生成された CLAUDE.md でも同じ検査が通ります。

**実用上の意味:** `--lang ja` で生成された CLAUDE.md と `--lang en` で生成されたものは人間目線では完全に違って見えますが、`claude-md-validator` は両方にバイト一致の合否判定を下します。言語別辞書のメンテナンス不要。

### 2. `content-validator` — パス & manifest 検査

生成ファイルの **コンテンツ** (CLAUDE.md の構造ではなく) を検証します。`content-validator/` にあります。

**10 個のチェック** (最初の 9 個はコンソール出力で `[N/9]` とラベル付け、10 番目は後から追加され `[10/10]` とラベル付け — このアシンメトリは既存の CI grep が引き続きマッチするようコードに保持されています):

| Check | 強制内容 |
|---|---|
| `[1/9]` CLAUDE.md が存在、≥100 chars、必須セクションキーワードを含む (10 言語対応) |
| `[2/9]` `.claude/rules/**/*.md` が `paths:` キーを持つ YAML frontmatter を持ち、空ファイルがない |
| `[3/9]` `claudeos-core/standard/**/*.md` が ≥200 chars で ✅/❌ の例 + markdown table を含む (Kotlin standards は ` ```kotlin ` ブロックも検査) |
| `[4/9]` `claudeos-core/skills/**/*.md` が非空、orchestrator + MANIFEST が存在 |
| `[5/9]` `claudeos-core/guide/` に期待される 9 ファイルすべてがあり、いずれも非空 (BOM-aware の空判定) |
| `[6/9]` `claudeos-core/plan/` のファイルが非空 (v2.1.2 以降は情報目的のみ — `plan/` は自動作成されなくなった) |
| `[7/9]` `claudeos-core/database/` のファイルが存在 (欠如時は warning) |
| `[8/9]` `claudeos-core/mcp-guide/` のファイルが存在 (欠如時は warning) |
| `[9/9]` `claudeos-core/memory/` の 4 ファイルが存在 + 構造検証 (decision-log の ISO 日付、failure-pattern の必須フィールド、compaction の `## Last Compaction` マーカー) |
| `[10/10]` パスクレーム検証 + MANIFEST drift (3 サブクラス — 後述) |

**Check `[10/10]` のサブクラス:**

| Class | 何を捕捉するか |
|---|---|
| `STALE_PATH` | `.claude/rules/**` または `claudeos-core/standard/**` 内の `src/...\.(ts|tsx|js|jsx)` 参照は実ファイルに解決される必要がある。fenced code block と placeholder パス (`src/{domain}/feature.ts`) は除外。 |
| `STALE_SKILL_ENTRY` | `claudeos-core/skills/00.shared/MANIFEST.md` に登録されたすべての skill パスがディスク上に存在する必要がある。 |
| `MANIFEST_DRIFT` | 登録されたすべての skill が `CLAUDE.md` のどこかで言及されている必要がある (**orchestrator/sub-skill 例外** — Pass 3b は Pass 3c が sub-skill を作る前に Section 6 を書くので、すべての sub-skill を列挙するのは構造的に不可能)。 |

orchestrator/sub-skill 例外: `{category}/{parent-stem}/{NN}.{name}.md` に登録された sub-skill は、`{category}/*{parent-stem}*.md` の orchestrator が CLAUDE.md で言及されていれば「カバー済み」と見なされます。

**Severity:** content-validator は **advisory** ティアで動作 — 出力には現れますが CI をブロックしません。理由: Pass 3 を再実行しても LLM の幻覚が必ず治る保証がないため、ブロックすると `--force` ループでユーザーをデッドロックさせます。検出シグナル (非ゼロ exit + `stale-report` エントリ) は CI パイプラインや人間の triage には十分です。

### 3. `pass-json-validator` — Pass 出力の整形検証

各 pass が書く JSON ファイルが well-formed で期待されるキーを含むかを検証します。`pass-json-validator/` にあります。

**検証されるファイル:**

| ファイル | 必須キー |
|---|---|
| `project-analysis.json` | 5 個の必須キー (stack、domains など) |
| `domain-groups.json` | 4 個の必須キー |
| `pass1-*.json` | 4 個の必須キー + `analysisPerDomain` オブジェクト |
| `pass2-merged.json` | 10 個の共通セクション (常時) + 2 個のバックエンドセクション (バックエンドスタック時) + 1 個の kotlin ベースセクション + 2 個の kotlin CQRS セクション (該当時)。セマンティックエイリアスマップによるあいまいマッチ; トップレベルキー数 <5 = ERROR、<9 = WARNING; 空値の検出。 |
| `pass3-complete.json` | Marker の存在 + 構造 |
| `pass4-memory.json` | Marker 構造: object、`passNum === 4`、非空の `memoryFiles` 配列 |

pass2 のチェックは **stack-aware** です: `project-analysis.json` を読んで backend/kotlin/cqrs を判定し、期待するセクションを調整します。

**Severity:** **warn-only** ティアで動作 — 問題は表示されますが CI をブロックしません。

### 4. `plan-validator` — Plan ↔ ディスクの整合性 (legacy)

`claudeos-core/plan/*.md` ファイルをディスクと比較します。`plan-validator/` にあります。

**3 モード:**
- `--check` (デフォルト): drift の検出のみ
- `--refresh`: ディスクから plan ファイルを更新
- `--execute`: plan の内容をディスクに反映 (`.bak` バックアップを作成)

**v2.1.0 ステータス:** Master plan 生成は v2.1.0 で削除されました。`claudeos-core/plan/` は `init` で自動作成されなくなりました。`plan/` がない場合、この validator は情報メッセージを出してスキップします。

ad-hoc バックアップ目的で plan ファイルを手動メンテしているユーザー向けに validator スイートに残されています。

**セキュリティ:** path traversal はブロック — `isWithinRoot(absPath)` が `../` でプロジェクトルートを抜け出すパスを拒否します。

**Severity:** 実際の drift 検出時は **fail** ティアで動作。`plan/` がない場合は no-op。

### 5. `sync-checker` — Disk ↔ Master Plan の整合性

`sync-map.json` (`manifest-generator` が書く) に登録されたファイルがディスクに実在するか検証します。7 つの追跡ディレクトリにわたる双方向チェック。`sync-checker/` にあります。

**2 ステップ検査:**

1. **Disk → Plan:** 7 つの追跡ディレクトリ (`.claude/rules`、`standard`、`skills`、`guide`、`database`、`mcp-guide`、`memory`) と `CLAUDE.md` を巡回。ディスク上に存在するが `sync-map.json` に登録されていないファイルを報告。
2. **Plan → Disk:** `sync-map.json` に登録されているがディスクに存在しないパスを報告 (orphaned)。

**Exit code:** orphaned ファイルのみが exit 1 を引き起こします。未登録ファイルは情報目的 (v2.1.0+ プロジェクトはデフォルトで登録パス 0 個なので、これが一般的なケース)。

**Severity:** orphaned ファイルに対して **fail** ティアで動作。`sync-map.json` にマッピングがなければクリーンスキップ。

---

## Severity tier

すべての失敗チェックが同じ重大度ではありません。`health-checker` はランタイム validator を 3 段階の severity でオーケストレーションします:

| Tier | シンボル | 振る舞い |
|---|---|---|
| **fail** | `❌` | 完了をブロック。CI が非ゼロで終了。修正必須。 |
| **warn** | `⚠️` | 出力に表示されるがブロックしない。調査の価値あり。 |
| **advisory** | `ℹ️` | 後で確認。特殊なプロジェクト構造ではしばしば誤検知。 |

**ティアごとの例:**

- **fail:** plan-validator が実 drift を検出; sync-checker が orphaned ファイルを発見; 必須 guide ファイルが欠如。
- **warn:** pass-json-validator が非 critical なスキーマギャップを発見。
- **advisory:** content-validator の `STALE_PATH` が、存在するが gitignored なパスを flag (一部プロジェクトでの誤検知)。

3 段階システムは、`content-validator` の検出 (特殊レイアウトでは誤検知が起こりうる) が CI パイプラインをデッドロックさせないよう追加されました。これがないと、すべての advisory がブロックし — `init` の再実行が LLM の幻覚を確実に治せるわけではありません。

サマリ行で内訳が表示されます:
```
All systems operational (1 advisory, 1 warning)
```

---

## なぜ 2 つのエントリポイント: lint vs health

```bash
npx claudeos-core lint     # claude-md-validator のみ
npx claudeos-core health   # 他の 4 validator
```

**なぜ分けるのか?**

`claude-md-validator` は **構造的** な問題を見つけます — セクション数の誤り、memory file table の再宣言、英語 canonical トークン欠落の見出し。これらは **CLAUDE.md を再生成する必要がある** というシグナルであり、調査用の soft warning ではありません。`init` の再実行 (必要なら `--force` 付き) が解決手段です。

他の validator は **コンテンツ** の問題を見つけます — パス、manifest エントリ、スキーマギャップ。これらは全部を再生成しなくても手動でレビュー・修正できます。

`lint` を分離することで、pre-commit フックで使えるようになります (高速、構造のみ)。遅いコンテンツチェックを引きずりません。

---

## 検証の実行

```bash
# CLAUDE.md の構造検証
npx claudeos-core lint

# 4-validator の health スイート
npx claudeos-core health
```

CI では `health` が推奨。LLM 呼び出しがないので高速で、構造的な CLAUDE.md チェック以外をすべてカバーします (構造チェックは多くの CI パイプラインがコミットごとに検証する必要のないものです)。

pre-commit フックには `lint` がコミットごとに実行できる速度です。

---

## 出力フォーマット

validator はデフォルトで人間が読みやすい出力を生成します:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` は機械可読なアーティファクトを `claudeos-core/generated/` に書きます:

- `rule-manifest.json` — gray-matter の frontmatter + stat 付きのファイルリスト
- `sync-map.json` — 登録パスのマッピング (v2.1.0+: デフォルトで空配列)
- `stale-report.json` — すべての validator からの結果を集約

---

## CI 統合

最小の GitHub Actions の例:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Exit code は **fail** ティアの結果のみで非ゼロになります。`warn` と `advisory` は表示されますがビルドを失敗させません。

公式 CI ワークフロー (`.github/workflows/test.yml` 内) は `ubuntu-latest`、`windows-latest`、`macos-latest` × Node 18 / 20 を横断します。

---

## validator が flag した内容に同意できないとき

特殊なプロジェクトレイアウト (例: gitignored な生成ファイル、非標準パスに emit するカスタムビルド手順) では誤検知が発生します。

**特定ファイルでの検出を抑制する** には、利用可能な `.claudeos-scan.json` の override について [advanced-config.md](advanced-config.md) を参照。

**validator が一般的なレベルで間違っている** 場合 (あなたのプロジェクトだけでなく)、[issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください — これらのチェックは実際の報告に基づいて時間とともに調整されます。

---

## 関連項目

- [architecture.md](architecture.md) — パイプライン内での validator の位置
- [commands.md](commands.md) — `lint` と `health` コマンドリファレンス
- [troubleshooting.md](troubleshooting.md) — 特定の validator エラーの意味
