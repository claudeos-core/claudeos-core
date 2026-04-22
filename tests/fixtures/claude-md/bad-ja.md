# CLAUDE.md — sample-project

> 日本語サンプル CLAUDE.md (validator テスト用)。

## 1. Role Definition (役割定義)

あなたはこのリポジトリのシニア開発者として、コードの作成、修正、レビューを担当します。応答は日本語で書いてください。
Node.js Express REST API サーバー、PostgreSQL リレーショナルストア上。

## 2. Project Overview (プロジェクト概要)

| 項目 | 値 |
|---|---|
| 言語 | TypeScript 5.4 |
| フレームワーク | Express 4.19 |
| ビルドツール | tsc |
| パッケージマネージャ | npm |
| サーバーポート | 3000 |
| データベース | PostgreSQL 15 |
| ORM | Prisma 5 |
| テストランナー | Vitest |

## 3. Build & Run Commands (ビルド・実行コマンド)

```bash
npm install
npm run dev
npm run build
npm test
```

`package.json` スクリプトを唯一の正とします。

## 4. Core Architecture (コアアーキテクチャ)

### 全体構造

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### データフロー

1. リクエストがルーターに到着。
2. ミドルウェアが認証を検証。
3. サービスが業務ロジックを実行。
4. Prisma が DB を読み書き。
5. レスポンスをシリアライズ。

### コアパターン

- **レイヤード**: router → service → repository。
- **DTO 検証**: ルーター境界で zod スキーマ。
- **エラーミドルウェア**: 集中エラー処理。

## 5. Directory Structure (ディレクトリ構造)

```
sample-project/
├─ src/
└─ tests/
```

**自動生成**: なし。
**テスト範囲**: `tests/` が `src/` をミラー。
**ビルド出力**: `dist/`。

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills 参照)

### Standard (唯一の情報源)

| パス | 説明 |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | プロジェクト概要 |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | ドキュメント作成ガイド |

### Rules (自動ロードガードレール)

| パス | 説明 |
|---|---|
| `.claude/rules/00.core/*` | コアルール |
| `.claude/rules/60.memory/*` | L4 メモリガード |

### Skills (自動化プロシージャ)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (NO 読み込み)

| パス | 理由 |
|---|---|
| `claudeos-core/guide/` | 人間向けドキュメント |
| `dist/` | ビルド出力 |
| `node_modules/` | 依存関係 |

## 8. Common Rules & Memory (L4) (共通ルールとメモリ (L4))

### 共通ルール (すべての編集時に自動ロード)

| ルールファイル | 役割 | 核心強制 |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | ドキュメント作成ルール | paths 必須、ハードコード禁止 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 作業ルール | 事実ベース、編集前 Read 必須 |

詳細は `claudeos-core/standard/00.core/04.doc-writing-guide.md` を参照。

### L4 メモリ (オンデマンド参照)

長期コンテキスト(決定・失敗・圧縮・自動提案)は `claudeos-core/memory/` に保存されます。
`paths` で自動ロードされる rules と異なり、このレイヤーは **オンデマンド** で参照されます。

#### L4 メモリファイル

| ファイル | 目的 | 動作 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 設計決定の理由 | Append-only。セッション開始時に一覧。 |
| `claudeos-core/memory/failure-patterns.md` | 繰り返しエラー | セッション開始時に検索。 |
| `claudeos-core/memory/compaction.md` | 4段階圧縮ポリシー | ポリシー変更時のみ修正。 |
| `claudeos-core/memory/auto-rule-update.md` | ルール変更提案 | レビューして受け入れ。 |

#### メモリワークフロー

1. セッション開始で failure-patterns をスキャン。
2. 最近の決定を見渡す。
3. 新しい決定を append。
4. 繰り返しエラーを pattern-id で登録。
5. 400 行接近で compact 実行。
6. rule-update 提案をレビュー。

## 9. メモリ (L4)

> 自動ロードされる共通ガードレールとオンデマンド参照の長期メモリファイル。

### 共通ルール (すべての編集時に自動ロード)

| ルールファイル | 役割 |
|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | ドキュメント作成ルール |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 作業ルール |

### L4 メモリファイル

| ファイル | 目的 | 動作 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 設計決定の理由 | Append-only。 |
| `claudeos-core/memory/failure-patterns.md` | 繰り返しエラー | セッション開始時に検索。 |
| `claudeos-core/memory/compaction.md` | 4段階圧縮ポリシー | ポリシー変更時のみ修正。 |
| `claudeos-core/memory/auto-rule-update.md` | ルール変更提案 | レビュー。 |
