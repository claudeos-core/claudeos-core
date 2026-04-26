# Memory Layer (L4)

v2.0 以降、ClaudeOS-Core は通常のドキュメントと並んで永続的な memory layer を書きます。これは長期プロジェクトで Claude Code に以下をさせたい場合のためのものです:

1. アーキテクチャ上の決定事項とその理由を記憶。
2. 繰り返し起こる失敗から学習。
3. 頻発する failure pattern を恒久ルールに自動昇格。

ClaudeOS-Core を 1 回限りの生成にしか使わない場合、この layer は完全に無視できます。memory ファイルは書かれますが、更新しなければ成長しません。

> 英語原文: [docs/memory-layer.md](../memory-layer.md). 日本語訳は英語版に追従して同期されています。

---

## 何が書かれるか

Pass 4 の完了後、memory layer は以下で構成されます:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only な「なぜ Y より X を選んだか」)
    ├── failure-patterns.md      (繰り返し起こるエラー、frequency + importance 付き)
    ├── compaction.md            (memory が時間とともにどうコンパクトされるか)
    └── auto-rule-update.md      (新ルールに昇格すべきパターン)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (decision-log.md を自動ロードするルール)
        ├── 02.failure-patterns.md   (failure-patterns.md を自動ロードするルール)
        ├── 03.compaction.md         (compaction.md を自動ロードするルール)
        └── 04.auto-rule-update.md   (auto-rule-update.md を自動ロードするルール)
```

`60.memory/` のルールファイルは `paths:` glob を持ち、memory がロードされるべきプロジェクトファイルに一致します。Claude Code が glob に一致するファイルを編集している時、対応する memory ファイルがコンテキストにロードされます。

これは **オンデマンドロード** — memory は常時コンテキストに入っているわけではなく、関連するときだけです。これにより Claude の作業コンテキストが軽く保たれます。

---

## 4 つの memory ファイル

### `decision-log.md` — append-only なアーキテクチャ決定

非自明な技術的決定を下したとき、(あなたが、またはあなたに促された Claude が) ブロックを追記します:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

このファイルは **時間とともに成長します**。自動削除されません。古い決定も貴重なコンテキストとして残ります。

自動ロードされるルール (`60.memory/01.decision-log.md`) が、Claude Code に「なぜ X をこう構造化したのか?」のような質問に答える前にこのファイルを参照するよう指示します。

### `failure-patterns.md` — 繰り返される失敗

Claude Code が繰り返しミスをするとき (例: 「Claude がプロジェクトでは MyBatis を使っているのに JPA を生成し続ける」)、エントリがここに入ります:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

`frequency` / `importance` / `last seen` フィールドは自動的な判断を駆動します:

- **コンパクション:** `lastSeen > 60 日` かつ `importance < 3` のエントリは drop されます。
- **ルール昇格:** `frequency >= 3` のエントリは `memory propose-rules` で新 `.claude/rules/` 候補として浮上します。(importance はフィルタではなく、各提案の confidence スコアに影響するだけです。)

メタデータフィールドは `memory` サブコマンドが anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) でパースするので、フィールド行はおおむね上記例の形になっている必要があります。インデントや斜体のバリエーションは許容されます。

### `compaction.md` — コンパクションログ

このファイルはコンパクション履歴を追跡します:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

`memory compact` を走らせるたびに `## Last Compaction` セクションだけが上書きされます。ファイル内のそれ以外に追加した内容は保持されます。

### `auto-rule-update.md` — 提案ルールキュー

`memory propose-rules` を走らせると、Claude が `failure-patterns.md` を読んで提案ルール内容をここに追記します:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

提案をレビューし、欲しいものを実際のルールファイルにコピーします。**propose-rules コマンドは自動適用しません** — LLM がドラフトしたルールには人間のレビューが必要です。

---

## コンパクションアルゴリズム

memory は成長しますが膨らみすぎません。4 ステージのコンパクションは以下を呼ぶと走ります:

```bash
npx claudeos-core memory compact
```

| Stage | トリガ | アクション |
|---|---|---|
| 1 | `lastSeen > 30 日` かつ preserved でない | body を 1 行の "fix" + meta に折りたたむ |
| 2 | 重複した見出し | マージ (frequency を合算、body は最新) |
| 3 | `importance < 3` かつ `lastSeen > 60 日` | 削除 |
| 4 | ファイル > 400 行 | 最も古い非 preserved エントリをトリム |

**「Preserved」エントリ** はすべてのステージを生き残ります。エントリは以下のいずれかなら preserved:

- `importance >= 7`
- `lastSeen < 30 日`
- body に具体的な (非 glob) アクティブルールパス (例: `.claude/rules/10.backend/orm-rules.md`) を含む

「アクティブルールパス」チェックは興味深いものです: memory エントリが実在する現行ルールファイルを参照していれば、エントリはそのルールのライフサイクルに固定されます。ルールが存在する限り、memory も残ります。

このコンパクションアルゴリズムは人間の忘却曲線を意図的に模したものです — 頻繁・最近・重要なものは残り、まれ・古い・重要でないものは消えていきます。

コンパクションコードは `bin/commands/memory.js` (`compactFile()` 関数) を参照。

---

## Importance スコアリング

実行:

```bash
npx claudeos-core memory score
```

`failure-patterns.md` のエントリの importance を再計算:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

ここで `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90 日にわたる線形減衰)。

効果:
- `frequency = 3` かつ `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3` かつ `lastSeen = 90+ 日前` → `round(3 × 1.5 + 0 × 5) = 5`

**score コマンドは挿入前にすべての既存 importance 行を除去します。** これにより score を複数回再実行しても重複行リグレッションが起きません。

---

## ルール昇格: `propose-rules`

実行:

```bash
npx claudeos-core memory propose-rules
```

これは:

1. `failure-patterns.md` を読みます。
2. `frequency >= 3` のエントリをフィルタ。
3. 各候補について Claude に提案ルール内容をドラフトしてもらいます。
4. confidence を計算:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance のデフォルトは 0; 欠如時は 6 にキャップ)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   ここで `anchored` はエントリがディスク上の実ファイルパスを参照していることを意味します。
5. 提案を `auto-rule-update.md` に書いて人間のレビューに供します。

**evidence 値は importance が欠如しているとき 6 でキャップされます** — importance スコアなしで frequency だけでは sigmoid を高 confidence へ押し上げるのに十分であってはならないためです。(これは sigmoid への入力をキャップするもので、提案の数をキャップするものではありません。)

---

## 典型的なワークフロー

長期プロジェクトでは、リズムは以下のようになります:

1. **`init` を 1 回実行** して、他のすべてと並んで memory ファイルをセットアップ。

2. **数週間 Claude Code を普通に使う。** 繰り返しのミスに気づく (例: Claude が間違ったレスポンスラッパーを使い続ける)。`failure-patterns.md` にエントリを追記 — 手動で、または Claude に依頼して (`60.memory/02.failure-patterns.md` のルールが、いつ追記すべきかを Claude に指示します)。

3. **定期的に `memory score` を実行** して importance 値をリフレッシュ。これは高速で冪等です。

4. **高スコアパターンが ~5 個以上たまったら**、`memory propose-rules` でドラフトされたルールを得ます。

5. **`auto-rule-update.md` の提案をレビュー。** 欲しいものについて、内容を `.claude/rules/` 配下の恒久ルールファイルにコピー。

6. **定期的に `memory compact` を実行** (月 1 回、またはスケジュール CI で) して `failure-patterns.md` を制限内に保つ。

このリズムは 4 つのファイルが設計された目的です。どのステップを飛ばしても問題ありません — memory layer は opt-in で、未使用のファイルは邪魔になりません。

---

## セッションの継続性

CLAUDE.md は Claude Code の各セッションで自動ロードされます。memory ファイルは **デフォルトでは自動ロードされません** — Claude が現在編集しているファイルが `paths:` glob に一致したときに `60.memory/` のルールによってオンデマンドでロードされます。

つまり、新しい Claude Code セッションでは、関連ファイルで作業を始めるまで memory は見えません。

Claude Code の auto-compaction が走った後 (コンテキストの ~85% 付近)、Claude は以前ロードされていた memory ファイルへの認識を失います。CLAUDE.md の Section 8 には **Session Resume Protocol** の散文ブロックが含まれており、Claude に以下を促します:

- `failure-patterns.md` を関連エントリのために再スキャン。
- `decision-log.md` の最新エントリを再読込。
- 現在開いているファイルに対し `60.memory/` のルールを再マッチ。

これは **散文であり強制ではありません** — しかしその散文は構造化されているので、Claude はそれに従う傾向があります。Session Resume Protocol は v2.3.2+ canonical scaffold の一部で、10 言語すべての出力で保持されます。

---

## memory layer をスキップすべきとき

memory layer が価値を発揮するのは:

- **長寿命なプロジェクト** (数か月以上)。
- **チーム** — `decision-log.md` が共有される機関的記憶とオンボーディングツールになる。
- **Claude Code が日に 10 回以上呼ばれるプロジェクト** — failure pattern が役立つほど早く蓄積される。

オーバーキルなのは:

- 1 週間で捨てる使い捨てスクリプト。
- スパイクやプロトタイプのプロジェクト。
- チュートリアルやデモ。

memory ファイルは依然として Pass 4 で書かれますが、更新しなければ成長しません。使っていないなら維持の負担はありません。

memory ルールが何もロードしないことを積極的に望む場合 (コンテキストコストの理由で)、以下が可能:

- `60.memory/` ルールを削除 — Pass 4 は resume では再作成せず、`--force` 時のみ再作成します。
- または各ルールの `paths:` glob を絞り、何にも一致しないようにする。

---

## 関連項目

- [architecture.md](architecture.md) — パイプラインのコンテキスト中の Pass 4
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` のリファレンス
- [verification.md](verification.md) — content-validator の `[9/9]` memory チェック
