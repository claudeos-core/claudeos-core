# Safety: Re-init で何が保持されるか

よくある不安: *「`.claude/rules/` をカスタマイズしました。`npx claudeos-core init` を再実行すると編集が失われますか?」*

**短い答え:** `--force` を使うかどうか次第です。

このページは、再実行したときに具体的に何が起こり、何が触られ、何が触られないかを説明します。

> 英語原文: [docs/safety.md](../safety.md). 日本語訳は英語版に追従して同期されています。

---

## Re-init の 2 つの経路

既に出力のあるプロジェクトで `init` を再実行すると、以下の 2 つのいずれかが起きます:

### Path 1 — Resume (デフォルト、`--force` なし)

`init` は `claudeos-core/generated/` 配下の既存 pass marker (`pass1-*.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`) を読みます。

各 pass について、marker が存在し構造的に有効であれば pass は **スキップ** されます。4 つの marker がすべて有効なら、`init` は早期終了 — することがありません。

**編集への影響:** 手動で編集したものはそのまま残ります。passes は走らず、ファイルは書かれません。

これは「ただ再確認したい」ワークフローでの推奨経路です。

### Path 2 — クリーンスタート (`--force`)

```bash
npx claudeos-core init --force
```

`--force` は pass marker と rules を削除し、4-pass パイプラインを最初から走らせます。**ルールへの手動編集は失われます。** これは意図的 — `--force` は「きれいに再生成したい」ときの脱出口です。

`--force` が削除するもの:
- `claudeos-core/generated/` 配下のすべての `.json` と `.md` ファイル (4 つの pass marker + scanner 出力)
- 前回の実行が移動の途中でクラッシュした場合の `claudeos-core/generated/.staged-rules/` ディレクトリの残骸
- `.claude/rules/` 配下のすべて

`--force` が **削除しないもの**:
- `claudeos-core/memory/` ファイル (decision log と failure patterns は保持)
- `claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/` など (これらは Pass 3 によって上書きされますが、事前削除はされません — Pass 3 が再生成しないものは残ります)
- `claudeos-core/` と `.claude/` の外側のファイル
- CLAUDE.md (Pass 3 が通常生成の一部として上書きします)

**`--force` で `.claude/rules/` を wipe するが他のディレクトリは wipe しない理由:** Pass 3 には「ゼロルール検出」ガードがあり、`.claude/rules/` が空のときに発火し、ドメイン別ルールステージをスキップするか判断します。前回の古いルールが残っていると、ガードが false-negative して新しいルールが生成されません。

---

## なぜ `.claude/rules/` が存在するか (staging メカニズム)

最も多く尋ねられる質問なので独立した節にします。

Claude Code には **sensitive-path policy** があり、`--dangerously-skip-permissions` 付きでもサブプロセスの `.claude/` への書き込みをブロックします。これは Claude Code 自体の意図的な安全境界です。

ClaudeOS-Core の Pass 3 と Pass 4 は `claude -p` のサブプロセス呼び出しなので、`.claude/rules/` に直接書き込めません。回避策:

1. pass プロンプトは Claude にすべてのルールファイルを `claudeos-core/generated/.staged-rules/` に書くよう指示。
2. pass 終了後、**Node.js orchestrator** (Claude Code のパーミッションポリシーに *縛られない*) がステージングツリーを巡回し、サブパスを保持しながら各ファイルを `.claude/rules/` へ移動。
3. 完全成功時、staging ディレクトリは削除されます。
4. 部分失敗時 (ファイルロックや跨ボリュームの rename エラー)、staging ディレクトリは **保持** され、何が渡らなかったかを検査できるようになり、次の `init` 実行が再試行します。

mover は `lib/staged-rules.js` にあります。`fs.renameSync` を最初に試し、Windows の跨ボリューム / アンチウイルスのファイルロックエラーには `fs.copyFileSync + fs.unlinkSync` にフォールバックします。

**実際に見えるもの:** 通常フローでは `.staged-rules/` は単一の `init` 実行内で作成・空にされます — 気付かないことも多いでしょう。実行がステージ途中でクラッシュした場合、次の `init` でファイルが残っているのを発見し、`--force` でクリーンアップされます。

---

## いつ何が保持されるか

| ファイルカテゴリ | `--force` なし | `--force` あり |
|---|---|---|
| `.claude/rules/` への手動編集 | ✅ 保持 (passes 再実行なし) | ❌ 失われる (ディレクトリが wipe) |
| `claudeos-core/standard/` への手動編集 | ✅ 保持 (passes 再実行なし) | ❌ Pass 3 が同じファイルを再生成すれば上書き |
| `claudeos-core/skills/` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `claudeos-core/guide/` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `CLAUDE.md` への手動編集 | ✅ 保持 | ❌ Pass 3 が上書き |
| `claudeos-core/memory/` ファイル | ✅ 保持 | ✅ 保持 (`--force` は memory を削除しない) |
| `claudeos-core/` と `.claude/` 外側のファイル | ✅ 触れない | ✅ 触れない |
| Pass marker (`generated/*.json`) | ✅ 保持 (resume に使用) | ❌ 削除 (フル再実行を強制) |

**正直なまとめ:** ClaudeOS-Core には diff & merge レイヤがありません。「適用前に変更をレビュー」プロンプトはありません。保持の物語はバイナリです: 欠落しているものだけ再実行する (デフォルト) か、wipe して再生成する (`--force`) か。

大量の手動編集をしていて、新しいツール生成コンテンツを統合する必要がある場合の推奨ワークフロー:

1. 編集をまず git にコミット。
2. 別ブランチで `npx claudeos-core init --force` を実行。
3. `git diff` で何が変わったかを見る。
4. 双方から欲しいものを手動マージ。

このワークフローは意図的に重ためです。ツールが自動マージを試みないのは — それを誤ると微妙な仕方でルールを静かに壊してしまうからです。

---

## v2.2.0 以前のアップグレード検出

旧バージョン (8-section scaffold が強制される前の v2.2.0 以前) で生成された CLAUDE.md があるプロジェクトで `init` を実行すると、ツールはこれを見出し数 (`^## ` の数 ≠ 8 — 言語独立のヒューリスティクス) で検出して警告を出します:

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

この警告は情報目的です。ツールは通常通り続行 — 古いフォーマットを保ちたければ無視できます。しかし `--force` を実行すれば構造的アップグレードが適用され、`claude-md-validator` が通ります。

**Memory ファイルは `--force` でのアップグレードでも保持されます。** 上書きされるのは生成ファイルのみです。

---

## Pass 4 の不変性 (v2.3.0+)

特定の微妙な点: **Pass 4 は `CLAUDE.md` に触れません。** Pass 3 の Section 8 が必要な L4 memory ファイル参照をすべて既に書いています。Pass 4 が CLAUDE.md にも書くと、Section 8 のコンテンツが再宣言されて `[S1]`/`[M-*]`/`[F2-*]` の validator エラーが起きます。

これは双方から強制されます:
- Pass 4 のプロンプトは明示的に「CLAUDE.md MUST NOT BE MODIFIED」と言います。
- `lib/memory-scaffold.js` の `appendClaudeMdL4Memory()` 関数は 3 行の no-op (常に true を返し、書き込みなし) です。
- リグレッションテスト `tests/pass4-claude-md-untouched.test.js` がこの契約を強制します。

**ユーザーとして知っておくべきこと:** 旧 Pass 4 が Section 9 を CLAUDE.md に追記した v2.3.0 以前のプロジェクトを再実行すると、`claude-md-validator` のエラーが見えます。`npx claudeos-core init --force` できれいに再生成してください。

---

## `restore` コマンドの動作

```bash
npx claudeos-core restore
```

`restore` は `plan-validator` を `--execute` モードで実行します。歴史的には `claudeos-core/plan/*.md` ファイルから記述された場所へコンテンツをコピーしていました。

**v2.1.0 ステータス:** Master plan 生成は v2.1.0 で削除されました。`claudeos-core/plan/` は `init` で自動作成されなくなりました。`plan/` ファイルがなければ `restore` は no-op で、情報メッセージを出してきれいに終了します。

ad-hoc バックアップ/リストアのために plan ファイルを手動メンテするユーザー向けに残されています。本物のバックアップが欲しいなら git を使ってください。

---

## 復旧パターン

### 「ClaudeOS のワークフロー外でファイルを削除しました」

```bash
npx claudeos-core init --force
```

Pass 3 / Pass 4 を最初から再実行。削除されたファイルが再生成されます。他のファイルへの手動編集は失われます (`--force` だから) — 安全のため git と組み合わせてください。

### 「特定のルールを削除したい」

ファイルを削除するだけ。次の `init` (`--force` なし) は Pass 3 の resume marker が pass 全体をスキップするため再作成しません。

次の `init --force` で再作成したいなら、何もしなくて OK — 再生成は自動です。

恒久に削除したいなら (二度と再生成されない)、プロジェクトを現在の状態に固定し、`--force` を二度と実行しないようにする必要があります。「このファイルを再生成しない」組み込みメカニズムはありません。

### 「生成ファイルを恒久にカスタマイズしたい」

ツールはカスタム領域の HTML スタイル begin/end マーカーを持ちません。2 つの選択肢:

1. **このプロジェクトで `--force` を実行しない** — デフォルトの resume では編集が無期限に保持されます。
2. **プロンプトテンプレートを fork** — 自分のツールコピーで `pass-prompts/templates/<stack>/pass3.md` を変更し、自分の fork をインストール。再生成されたファイルにあなたのカスタマイズが反映されます。

シンプルなプロジェクト固有 override なら通常はオプション 1 で十分です。

---

## validator が検査する内容 (re-init 後)

`init` 完了後 (resume か `--force` かに関わらず)、validator が自動実行されます:

- `claude-md-validator` — `lint` で個別実行
- `health-checker` — 4 つのコンテンツ/パス validator を実行

何かが間違っていれば (欠落ファイル、壊れた相互参照、でっち上げパス)、validator の出力が見えます。チェックリストは [verification.md](verification.md) を参照。

validator は何も修正しません — 報告するだけです。報告を読んで、`init` を再実行するか手動で修正するかを判断します。

---

## テストによる信頼

「ユーザー編集を保持する」経路 (`--force` なしの resume) は `tests/init-command.test.js` と `tests/pass3-marker.test.js` の統合テストで実行されています。

CI は Linux / macOS / Windows × Node 18 / 20 を横断します。

このドキュメントと矛盾する仕方で ClaudeOS-Core が編集を失うケースを見つけたら、それはバグです。再現手順を添えて [報告](https://github.com/claudeos-core/claudeos-core/issues) してください。

---

## 関連項目

- [architecture.md](architecture.md) — staging メカニズムの文脈
- [commands.md](commands.md) — `--force` と他のフラグ
- [troubleshooting.md](troubleshooting.md) — 特定のエラーからの復旧
