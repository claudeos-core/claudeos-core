# Safety: Re-init で何が保持されるか、そして `.env` から何が決して出ていかないか

よくある不安として: *「`.claude/rules/` をカスタマイズしました。`npx claudeos-core init` を再実行したら編集が失われますか?」*

**短い答え:** `--force` を使うかどうか次第です。

このページでは、再実行時に何が起き、何が触られて何が触られないかを具体的に説明します。

> 英語原文: [docs/safety.md](../safety.md). 日本語訳は英語版に追従して同期されています。

---

## Re-init の 2 つの経路

既に出力のあるプロジェクトで `init` を再実行すると、次の 2 つのいずれかが起きます:

### Path 1: Resume (デフォルト、`--force` なし)

`init` は `claudeos-core/generated/` 配下の既存 pass marker (`pass1-*.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`) を読みます。

各 pass について、marker が存在して構造的に有効なら pass は **スキップ** されます。4 つの marker がすべて有効なら、`init` は早期終了します (やることがありません)。

**編集への影響:** 手動で編集した内容はそのまま残ります。passes は走らず、ファイルも書かれません。

「ただ再確認したい」ワークフローでの推奨経路です。

### Path 2: クリーンスタート (`--force`)

```bash
npx claudeos-core init --force
```

`--force` は pass marker と rules を削除して、4-pass パイプラインを最初から走らせます。**ルールへの手動編集は失われます。** これは意図的で、`--force` は「きれいに再生成したい」ときの脱出口です。

`--force` で削除されるもの:
- `claudeos-core/generated/` 配下のすべての `.json` と `.md` ファイル (4 つの pass marker と scanner 出力)
- 前回の実行が移動中にクラッシュした場合の `claudeos-core/generated/.staged-rules/` ディレクトリの残骸
- `.claude/rules/` 配下で claudeos-core が管理しているカテゴリ、つまり `NN.` プレフィックス付きのエントリすべて (`00.core/`、`10.backend/`、… `90.optional/`)。そのプレフィックスなしで自分で置いたファイルやフォルダ (例: `.claude/rules/my-team-conventions.md`) には **一切触れません**。このツールが生成したものではないためです

`--force` で **削除されないもの**:
- `claudeos-core/memory/` ファイル (decision log と failure patterns は保持)
- `claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/` など。これらは Pass 3 が上書きしますが、事前削除はしません。Pass 3 が再生成しないものは残ります
- `claudeos-core/` と `.claude/` の外側のファイル
- CLAUDE.md (Pass 3 が通常の生成の一部として上書きする)

**`--force` で `.claude/rules/NN.*` の管理カテゴリを wipe する一方で他のディレクトリは wipe しない理由:** Pass 3 には「ゼロルール検出」ガードがあり、`.claude/rules/` が空のときに発火して、ドメイン別ルールステージをスキップするか判断します。前回の古いルールが残っていると、このガードが false-negative し、新しいルールが生成されません。

---

## なぜ `.claude/rules/` が存在するか (staging メカニズム)

よく聞かれる質問なので、独立した節にしました。

Claude Code には **sensitive-path policy** があり、`--dangerously-skip-permissions` を付けてもサブプロセスからの `.claude/` への書き込みをブロックします。これは Claude Code 自体の意図的な安全境界です。

ClaudeOS-Core の Pass 3 と Pass 4 は `claude -p` のサブプロセス呼び出しなので、`.claude/rules/` には直接書き込めません。そのための回避策:

1. pass プロンプトは Claude に、すべてのルールファイルを `claudeos-core/generated/.staged-rules/` に書くよう指示する。
2. pass 終了後、Claude Code のパーミッションポリシーに *縛られない* **Node.js orchestrator** がステージングツリーを巡回し、サブパスを保ったまま各ファイルを `.claude/rules/` へ移動する。
3. 完全に成功した場合、staging ディレクトリは削除される。
4. 部分的に失敗した場合 (ファイルロックや跨ボリュームの rename エラー)、staging ディレクトリは **保持** され、渡らなかったものを検査できる。次の `init` 実行で再試行する。

mover は `lib/staged-rules.js` にあります。まず `fs.renameSync` を試し、Windows の跨ボリューム / アンチウイルスによるファイルロックエラーには `fs.copyFileSync + fs.unlinkSync` でフォールバックします。

**実際に目に見えるもの:** 通常フローでは `.staged-rules/` は 1 回の `init` 実行内で作成され空にされます。気付かないことも多いでしょう。ステージ途中でクラッシュした場合、次の `init` でファイルが残っているのが見つかり、`--force` で掃除されます。

---

## いつ何が保持されるか

| ファイルカテゴリ | `--force` なし | `--force` あり |
|---|---|---|
| 生成済み `.claude/rules/NN.*/` ファイルへの手動編集 | ✅ 保持 (passes 再実行なし) | ❌ 失われる (管理カテゴリが wipe) |
| `NN.` プレフィックスなしで `.claude/rules/` に置いた自分のファイル | ✅ 保持 | ✅ 保持 (一切触れない) |
| `claudeos-core/standard/` への手動編集 | ✅ 保持 (passes 再実行なし) | ❌ Pass 3 が同じファイルを再生成すれば上書き |
| `claudeos-core/skills/` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `claudeos-core/guide/` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `CLAUDE.md` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `claudeos-core/memory/` ファイル | ✅ 保持 | ✅ 保持 (`--force` は memory を削除しない) |
| `claudeos-core/` と `.claude/` 外側のファイル | ✅ 触れない | ✅ 触れない |
| Pass marker (`generated/*.json`) | ✅ 保持 (resume に使用) | ❌ 削除 (フル再実行を強制) |

**率直に言うと:** ClaudeOS-Core には diff & merge レイヤがありません。「適用前に変更をレビュー」のようなプロンプトもありません。保持の挙動は二択です。欠落しているものだけ再実行する (デフォルト) か、wipe して再生成する (`--force`) かのどちらかです。

大量の手動編集をしていて、新しいツール生成コンテンツを統合する必要がある場合の推奨ワークフロー:

1. まず編集を git にコミットする。
2. 別ブランチで `npx claudeos-core init --force` を実行する。
3. `git diff` で何が変わったかを見る。
4. 双方から欲しいものを手動でマージする。

このワークフローは意図的に重ためです。ツールが自動マージを試みないのは、誤ると微妙な形でルールを静かに壊してしまうからです。

---

## v2.2.0 以前のアップグレード検出

旧バージョン (8-section scaffold が強制される前の v2.2.0 以前) で生成された CLAUDE.md があるプロジェクトで `init` を実行すると、ツールが見出し数 (`^## ` の数が 8 でない、という言語非依存なヒューリスティクス) でこれを検出し、警告を出します:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

この警告は情報目的です。ツールはそのまま動き続けるので、古いフォーマットを保ちたければ無視して構いません。`--force` を実行すれば構造アップグレードが適用され、`claude-md-validator` が通ります。

**memory ファイルは `--force` のアップグレードでも保持されます。** 上書きされるのは生成ファイルだけです。

---

## Pass 4 の不変性 (v2.3.0+)

細かい話ですが押さえておくべき点として: **Pass 4 は `CLAUDE.md` に触れません。** 必要な L4 memory ファイルへの参照は Pass 3 の Section 8 がすべて書き終えています。ここで Pass 4 が CLAUDE.md にも書くと、Section 8 のコンテンツが再宣言され、`[S1]`/`[M-*]`/`[F2-*]` の validator エラーが発生します。

これは両側から強制されます:
- Pass 4 のプロンプトは「CLAUDE.md MUST NOT BE MODIFIED」と明示している。
- `lib/memory-scaffold.js` の `appendClaudeMdL4Memory()` 関数は 3 行の no-op (常に true を返し、書き込まない)。
- リグレッションテスト `tests/pass4-claude-md-untouched.test.js` がこの契約を強制する。

**ユーザーとして知っておくべきこと:** 旧 Pass 4 が Section 9 を CLAUDE.md に追記した v2.3.0 以前のプロジェクトを再実行すると、`claude-md-validator` のエラーが見えます。`npx claudeos-core init --force` できれいに再生成してください。

---

## `restore` コマンドの動作

```bash
npx claudeos-core restore
```

`restore` は `plan-validator` を `--execute` モードで実行します。歴史的には `claudeos-core/plan/*.md` ファイルから、記述された場所へコンテンツをコピーしていました。

**v2.1.0 ステータス:** Master plan 生成は v2.1.0 で削除されました。`claudeos-core/plan/` は `init` で自動作成されません。`plan/` ファイルがなければ `restore` は no-op となり、情報メッセージを出してきれいに終了します。

ad-hoc なバックアップ/リストアのために plan ファイルを手動でメンテするユーザー向けに残しています。本物のバックアップが欲しいなら git を使ってください。

---

## 復旧パターン

### 「ClaudeOS のワークフロー外でファイルを削除しました」

```bash
npx claudeos-core init --force
```

Pass 3 / Pass 4 を最初から再実行します。削除されたファイルは再生成されます。他のファイルへの手動編集は失われるので (`--force` のため)、安全のため git と組み合わせてください。

### 「特定のルールを削除したい」

ファイルを削除するだけ。次の `init` (`--force` なし) は Pass 3 の resume marker が pass 全体をスキップするので、再作成しません。

次の `init --force` で再作成したい場合は何もしなくて OK。再生成は自動です。

恒久に削除したい (二度と再生成されない) なら、プロジェクトを現在の状態に固定し、`--force` を二度と実行しないようにする必要があります。「このファイルを再生成しない」という組み込みのメカニズムはありません。

### 「生成ファイルを恒久にカスタマイズしたい」

ツールはカスタム領域用の HTML スタイル begin/end マーカーを持っていません。選択肢は 2 つ:

1. **このプロジェクトで `--force` を実行しない**: デフォルトの resume では編集が無期限に保持されます。
2. **プロンプトテンプレートを fork する**: 自分のツールコピーで `pass-prompts/templates/<stack>/pass3.md` を変更し、自分の fork をインストールします。再生成ファイルにカスタマイズが反映されます。

シンプルなプロジェクト固有 override なら、通常はオプション 1 で十分です。

---

## validator が検査する内容 (re-init 後)

`init` 完了後 (resume か `--force` かに関わらず)、validator が自動実行されます:

- `claude-md-validator`: `lint` で個別実行
- `health-checker`: 4 つのコンテンツ/パス validator を実行

何か問題があれば (欠落ファイル、壊れた相互参照、でっち上げパスなど)、validator の出力が表示されます。チェックリストは [verification.md](verification.md) を参照してください。

validator は何も修正しません。報告するだけです。報告を読み、`init` を再実行するか手動で直すかを判断してください。

---

## テストによる信頼

「ユーザー編集を保持する」経路 (`--force` なしの resume) は `tests/init-command.test.js` と `tests/pass3-marker.test.js` の統合テストで動かしています。

CI は Linux / macOS / Windows × Node 18 / 20 を横断して走ります。

このドキュメントと矛盾する形で ClaudeOS-Core が編集を失うケースを見つけたら、それはバグです。再現手順を添えて [報告](https://github.com/claudeos-core/claudeos-core/issues) してください。

---

## 生成ファイルに決して到達しないもの: `.env` のシークレット

ここまではすべて *あなたのファイル* が ClaudeOS を生き延びる話です。この節は *あなたのシークレット* がそこから出ていかない話です。「このツールは自分の `.env` を LLM が読む何かにコピーするのか?」は safety の問いであり、そのために開かれるのがこのページだからここに置いています。

`init` は `.env*` ファイルを 1 つ読みます (探索順は [stacks.md](stacks.md#env-抽出-v220))。生成される CLAUDE.md が実際の port、host、データベースを書けるようにするためです。パースされた変数は `claudeos-core/generated/project-analysis.json` に書かれ、Pass 3 / Pass 4 のプロンプトはモデルにそのファイルを読むよう指示します。書き込み前に、すべての値へ次の 3 つのルールがこの順で適用されます:

1. **キー名によるリダクション。** `PASSWORD`、`PASS`、`PW`、`SECRET`、`TOKEN`、`API_KEY`、`CREDENTIAL`、`PRIVATE_KEY`、`JWT_SECRET`、`SSH_KEY`、`MASTER_KEY`、`SERVICE_ACCOUNT` などに一致するキーは `***REDACTED***` になります。キー自体は残るので、「この変数が存在する」という事実はドキュメントが述べられます。
2. **接続文字列内の認証情報マスキング。** 1 つ目のルールが拾わないキー (`DATABASE_URL`、`REDIS_URL`、`MONGO_URI`、`SPRING_DATASOURCE_URL` など) では *認証情報の部分だけ* を書き換え、残りは保持します。DB 種別、host、port、path は読める状態のままです:
   - URL userinfo: `postgres://app:s3cret@db:5432/app` → `postgres://***:***@db:5432/app`
   - クエリ / プロパティのパラメータ: `?user=app&password=x` → `?user=app&password=***`
   - Go / MySQL DSN: `user:pw@tcp(host:3306)/db` → `***:***@tcp(host:3306)/db`
   - Oracle JDBC (v2.5.3): `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` → `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` (`@host:port:SID`、`@(DESCRIPTION=…)`、`jdbc:oracle:oci:` の各形式も同様)
3. **値ごと破棄 (v2.5.2)。** 2 つ目のルールが認証情報を安全に書き換えられない場合 — パスワードに生の `/`、`?`、`#`、空白が含まれる、数字で始まる、あるいは Oracle DSN の user 部分に `@` が含まれ user とパスワードの境界が定まらない場合 (v2.5.3) — 部分マスクではなく値ごと破棄します (`***REDACTED***`)。host を失うのは、パスワードを漏らすよりはるかに安い失敗です。`init` は Phase 1 のサマリで該当キー名を伝えます (キー名のみ)。host を残したい場合はパスワードを percent-encoding してください (`/` は `%2F`)。

`.env` から導かれるスカラー 2 つ — `envInfo.host` と `envInfo.apiTarget` — は CLAUDE.md 3 節にそのまま描画されます。値が破棄された場合は `null` となり行自体が省かれるため、sentinel が生成ドキュメントに現れることはありません。

**カバーしないもの。** 展開されていない `${VAR}` テンプレートはそのまま残します (生きたシークレットを含まないため)。コメント、および選ばれた 1 つの `.env*` 以外のファイルは読みません。scanner の DB 種別検出は `.env` の生テキストをメモリ上で読むだけで、どこにも書きません。上記のどのルールも認識しない形式で認証情報を保持している場合は、その *形式* を (値は絶対に載せずに) issue に出してください — ここに挙げたルールはすべてそうやって生まれました。

**これらのルールが対象とするのは `.env*` ファイルだけです。** フレームワークの設定ファイル — `application.yml`、`application.properties`、`appsettings.json`、Spring のプロファイル、Django の `settings.py` — に書かれた認証情報はマスクされ**ません**。スキャナはそれらのファイルからサーバー port などの事実だけを読み、値を `project-analysis.json` に複製しないからです。ただし Pass 1〜3 はソースツリーを直接読むため、設定ファイルにコミットされた平文パスワードはモデルから見えますし、生成ドキュメントに引用される可能性があります。秘密はコミットする設定から外してください。下の **確認方法** の手順ではこれらは見つかりません — そもそも `project-analysis.json` に入らないからです。代わりに生成された *ドキュメント* を grep してください: `CLAUDE.md`、`claudeos-core/**/*.md`、`.claude/rules/**/*.md`。

**確認方法。** `init` の後、`claudeos-core/generated/project-analysis.json` に対して自分のパスワードを `grep -i` してください。そこにあってはいけません。マスキングのルールは `tests/env-parser.test.js` のテストで固定されており、かつて実際に漏れた形式もそのまま含まれています。

## 関連項目

- [stacks.md](stacks.md#env-抽出-v220) — `.env` の探索順と抽出されるフィールド
- [architecture.md](architecture.md): staging メカニズムの文脈
- [commands.md](commands.md): `--force` その他のフラグ
- [troubleshooting.md](troubleshooting.md): 特定のエラーからの復旧
