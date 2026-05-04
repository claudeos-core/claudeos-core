# Memory Layer (L4)

v2.0 以降、ClaudeOS-Core は通常のドキュメントと並んで永続的な memory layer を書き出します。これは長期プロジェクトで Claude Code に次のことをさせたい場合のための機能です:

1. アーキテクチャ上の決定とその理由を記憶する。
2. 繰り返し起きる失敗から学習する。
3. 頻発する failure pattern を恒久ルールへ自動昇格する。

ClaudeOS-Core を 1 回限りの生成にしか使わないなら、この layer は丸ごと無視して構いません。memory ファイルは書き出されますが、更新しなければ成長しません。

> 英語原文: [docs/memory-layer.md](../memory-layer.md). 日本語訳は英語版に追従して同期されています。

---

## 何が書かれるか

Pass 4 が終わると、memory layer は次の構成になります:

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

`60.memory/` のルールファイルは `paths:` glob を持ち、memory をロードしたいプロジェクトファイルにマッチします。Claude Code が glob にマッチするファイルを編集しているときに、対応する memory ファイルがコンテキストへロードされます。

これは **オンデマンドロード** です: memory は常時コンテキストに入っているわけではなく、関連するときだけ読み込まれます。これにより Claude の作業コンテキストを軽く保てます。

---

## 4 つの memory ファイル

### `decision-log.md`: append-only なアーキテクチャ決定

非自明な技術的決定を下したら、自分で、または Claude に依頼してブロックを追記します:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

このファイルは **時間とともに成長します**。自動削除はされません。古い決定も貴重なコンテキストとして残します。

自動ロード対象のルール (`60.memory/01.decision-log.md`) が、Claude Code に「なぜ X をこう構造化したのか?」のような質問に答える前にこのファイルを参照するよう指示します。

### `failure-patterns.md`: 繰り返される失敗

Claude Code が同じミスを繰り返すとき (例: 「プロジェクトでは MyBatis を使っているのに、Claude が JPA を生成し続ける」) は、ここにエントリを入れます:

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

`frequency` / `importance` / `last seen` フィールドが自動判断を動かします:

- **コンパクション:** `lastSeen > 60 日` かつ `importance < 3` のエントリは drop されます。
- **ルール昇格:** `frequency >= 3` のエントリが `memory propose-rules` で新 `.claude/rules/` 候補として浮上します (importance はフィルタではなく、各提案の confidence スコアに影響するだけ)。

メタデータフィールドは `memory` サブコマンドが anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) でパースするので、フィールド行はおおむね上の例の形にしてください。インデントや斜体のバリエーションは許容されます。

### `compaction.md`: コンパクションログ

コンパクション履歴を追跡するファイルです:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

`memory compact` を実行するたびに、書き換わるのは `## Last Compaction` セクションだけです。ファイル内の他の追記内容はそのまま残ります。

### `auto-rule-update.md`: 提案ルールのキュー

`memory propose-rules` を実行すると、Claude が `failure-patterns.md` を読んで提案ルールをここに追記します:

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

提案をレビューし、欲しいものを実際のルールファイルへコピーします。**propose-rules コマンドは自動適用しません**。LLM がドラフトしたルールには人間のレビューが必要です。

---

## コンパクションアルゴリズム

memory は成長しますが、膨らみすぎはしません。4 ステージのコンパクションは次のコマンドで走ります:

```bash
npx claudeos-core memory compact
```

| Stage | トリガ | アクション |
|---|---|---|
| 1 | `lastSeen > 30 日` かつ preserved でない | body を 1 行の "fix" + meta に折りたたむ |
| 2 | 重複した見出し | マージ (frequency を合算、body は最新) |
| 3 | `importance < 3` かつ `lastSeen > 60 日` | 削除 |
| 4 | ファイル > 400 行 | 最も古い非 preserved エントリをトリム |

**「Preserved」エントリ** はすべてのステージを生き残ります。次のいずれかを満たすと preserved 扱いになります:

- `importance >= 7`
- `lastSeen < 30 日`
- body に具体的な (非 glob) アクティブルールパスを含む (例: `.claude/rules/10.backend/orm-rules.md`)

「アクティブルールパス」チェックは興味深い仕組みです。memory エントリが実在する現行ルールファイルを参照していれば、エントリはそのルールのライフサイクルに紐付きます。ルールが存在する限り、memory も残ります。

このコンパクションアルゴリズムは、人間の忘却曲線を意図的に模しています。頻繁・最近・重要なものは残り、まれ・古い・重要でないものは消えていきます。

コンパクションコードは `bin/commands/memory.js` (`compactFile()` 関数) にあります。

---

## Importance スコアリング

実行:

```bash
npx claudeos-core memory score
```

これで `failure-patterns.md` のエントリの importance を再計算します:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

ここで `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90 日にわたる線形減衰)。

効果:
- `frequency = 3` かつ `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3` かつ `lastSeen = 90+ 日前` → `round(3 × 1.5 + 0 × 5) = 5`

**score コマンドは挿入前に既存の importance 行をすべて除去します。** これで score を何度再実行しても重複行のリグレッションが起きません。

---

## ルール昇格: `propose-rules`

実行:

```bash
npx claudeos-core memory propose-rules
```

このコマンドの動作は次のとおりです:

1. `failure-patterns.md` を読み込む。
2. `frequency >= 3` のエントリでフィルタする。
3. 各候補について、Claude に提案ルールをドラフトさせる。
4. confidence を計算する:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance のデフォルトは 0; 欠如時は 6 にキャップ)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   ここで `anchored` は、エントリがディスク上の実ファイルパスを参照していることを意味します。
5. 提案を `auto-rule-update.md` に書き出し、人間のレビューに回す。

**evidence 値は importance が欠如しているとき 6 にキャップされます。** importance スコアなしで frequency だけが sigmoid を高 confidence へ押し上げる事態を避けるためです (これは sigmoid への入力のキャップで、提案数のキャップではありません)。

---

## 典型的なワークフロー

長期プロジェクトでは、次のようなリズムになります:

1. **`init` を 1 回実行** して、他のすべてと並んで memory ファイルをセットアップする。

2. **数週間 Claude Code を普通に使う。** 繰り返しのミスに気づいたら (例: Claude が間違ったレスポンスラッパーを使い続ける)、`failure-patterns.md` にエントリを追記する。手動でも、Claude に依頼してもよい (`60.memory/02.failure-patterns.md` のルールが、いつ追記すべきかを Claude に指示)。

3. **定期的に `memory score` を実行** して importance 値をリフレッシュする。高速で冪等。

4. **高スコアのパターンが 5 個ほどたまったら**、`memory propose-rules` でドラフトを得る。

5. **`auto-rule-update.md` の提案をレビュー。** 欲しいものは、内容を `.claude/rules/` 配下の恒久ルールファイルへコピーする。

6. **`memory compact` を定期実行** (月 1 回、またはスケジュール CI) して `failure-patterns.md` を制限内に保つ。

このリズムこそ、4 つのファイルが想定している使い方です。どのステップを飛ばしても問題ありません。memory layer は opt-in で、使わないファイルが邪魔になることはありません。

---

## セッションの継続性

CLAUDE.md は Claude Code の各セッションで自動ロードされます。memory ファイルは **デフォルトでは自動ロードされません**。Claude が現在編集しているファイルが `paths:` glob にマッチしたときに、`60.memory/` のルールがオンデマンドで読み込みます。

つまり、新しい Claude Code セッションでは、関連ファイルで作業を始めるまで memory は見えません。

Claude Code の auto-compaction が走ったあと (コンテキストの 85% 付近)、Claude は以前ロードされていた memory ファイルの認識を失います。CLAUDE.md の Section 8 には **Session Resume Protocol** の散文ブロックがあり、Claude に次を促します:

- `failure-patterns.md` を関連エントリのために再スキャンする。
- `decision-log.md` の最新エントリを再読込する。
- 現在開いているファイルに対し `60.memory/` のルールを再マッチさせる。

これは **散文であり強制ではありません**。ただし散文が構造化されているため、Claude は従う傾向があります。Session Resume Protocol は v2.3.2+ canonical scaffold の一部で、10 言語すべての出力で保持されます。

---

## memory layer をスキップすべきとき

memory layer が価値を発揮するのは次のような場合です:

- **長寿命のプロジェクト** (数か月以上)。
- **チーム開発**: `decision-log.md` が共有される機関的記憶とオンボーディングツールになる。
- **Claude Code を日に 10 回以上呼ぶプロジェクト**: failure pattern が役立つペースで蓄積されます。

逆にオーバーキルなのは:

- 1 週間で捨てる使い捨てスクリプト。
- スパイクやプロトタイプのプロジェクト。
- チュートリアルやデモ。

memory ファイル自体は Pass 4 で生成されますが、更新しなければ成長しません。使わないなら維持の負担もありません。

コンテキストコストの観点から memory ルールに何もロードさせたくない場合、次の方法があります:

- `60.memory/` ルールを削除する。Pass 4 は resume では再作成せず、`--force` のときだけ再作成します。
- 各ルールの `paths:` glob を絞り、何にもマッチしないようにする。

---

## 関連項目

- [architecture.md](architecture.md): パイプラインの中での Pass 4
- [commands.md](commands.md): `memory compact` / `memory score` / `memory propose-rules` のリファレンス
- [verification.md](verification.md): content-validator の `[9/9]` memory チェック
