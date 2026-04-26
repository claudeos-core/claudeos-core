# 高度な設定 — `.claudeos-scan.json`

特殊なプロジェクトレイアウトのために、プロジェクトルートに `.claudeos-scan.json` ファイルを置くことでフロントエンド scanner の挙動を override できます。

これは上級者向けです。ほとんどのプロジェクトは必要としません — 自動検出は設定なしで動くよう設計されています。

> 英語原文: [docs/advanced-config.md](../advanced-config.md). 日本語訳は英語版に追従して同期されています。

---

## `.claudeos-scan.json` の役割と非役割

**できること:**
- 追加のキーワードや skip 名でフロントエンド scanner のプラットフォーム/サブアプリ認識を拡張。
- 何が「本物の」サブアプリと見なされるかの閾値を調整。
- シングルプラットフォームのプロジェクトでサブアプリ emission を強制。

**できないこと:**
- 特定のスタックを強制 (scanner のスタック検出が先に走り、設定不能)。
- カスタム出力言語のデフォルトを追加。
- グローバルな無視パスを設定 (フロントエンド scanner には独自のビルトイン無視リストがある)。
- バックエンド scanner の設定 (Java、Kotlin、Python などはこのファイルを読みません)。
- ファイルを「保持済み」とマーク (そのようなメカニズムは存在しません)。

`stack`、`ignorePaths`、`preserve`、`defaultPort`、`language`、`subapps` といったフィールドが古いドキュメントに記載されているのを見たことがあるなら — それらは実装されていません。実際にサポートされるフィールドセットは小さく、すべて `frontendScan` の下にあります。

---

## ファイルフォーマット

```json
{
  "frontendScan": {
    "platformKeywords": ["custom-platform"],
    "skipSubappNames": ["legacy-app"],
    "minSubappFiles": 3,
    "forceSubappSplit": false
  }
}
```

4 つのフィールドはすべて省略可能。scanner はファイルを `JSON.parse` で読みます。ファイルが欠如していたり JSON が不正な場合、スキャンは静かにデフォルトにフォールバックします。

---

## フィールドリファレンス (フロントエンド scanner)

### `frontendScan.platformKeywords` — 追加のプラットフォームキーワード (string 配列)

フロントエンド scanner は `src/{platform}/{subapp}/` レイアウトを検出し、`{platform}` は以下のデフォルトのいずれかに一致します:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

このデフォルトリストを (置換ではなく) 拡張するには `platformKeywords` を使います:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

この override 後、`src/kiosk/checkout/` がプラットフォーム-サブアプリのペアとして認識され、`kiosk-checkout` ドメインとして emit されます。

**注:** 略語 `adm` はデフォルトから意図的に除外されています (単独では曖昧すぎる)。プロジェクトが `src/adm/` を admin tier ルートとして使っているなら、`admin` にリネームするか `"adm"` を `platformKeywords` に追加してください。

### `frontendScan.skipSubappNames` — スキップする追加名 (string 配列)

scanner は既知のインフラ / 構造的ディレクトリ名をサブアプリレベルでスキップし、ドメインとして emit しないようにします:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

skip リストを拡張するには `skipSubappNames` を使います:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

この override 後、これらの名前に一致するディレクトリはサブアプリスキャン中に無視されます。

### `frontendScan.minSubappFiles` — サブアプリと見なす最小ファイル数 (number、デフォルト 2)

プラットフォームルート下の単一ファイルディレクトリは通常、偶発的なフィクスチャやプレースホルダで、本物のサブアプリではありません。デフォルトの最小値は 2 ファイル。プロジェクト構造が異なるなら override:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

これを `1` にすると 1 ファイルのサブアプリも emit します (おそらく Pass 1 グループプランでノイズになります)。

### `frontendScan.forceSubappSplit` — single-SPA skip からのオプトアウト (boolean、デフォルト false)

scanner には **single-SPA skip rule** があります: プロジェクト全体で **1 つだけ** のプラットフォームキーワードしか一致しない場合 (例: プロジェクトに `src/admin/api/`、`src/admin/dto/`、`src/admin/routers/` があり他のプラットフォームがない)、アーキテクチャ層フラグメンテーションを防ぐためサブアプリ emission がスキップされます。

このデフォルトはシングルプラットフォーム SPA には正しいですが、孤立したプラットフォームの子を意図的にフィーチャドメインとして使うプロジェクトには間違っています。オプトアウトするには:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

これは、唯一のプラットフォームルートの子が本当に独立したフィーチャサブアプリだと確信できるときにのみ使ってください。

---

## 例

### カスタムプラットフォームキーワードを追加

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

`src/embedded/dashboard/` のあるプロジェクトは `embedded-dashboard` をドメインとして emit するようになります。

### vendoring/レガシーディレクトリをスキップ

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

これらの名前のディレクトリはプラットフォームルート下にあってもスキャン中に無視されます。

### サブアプリ emission が欲しいシングルプラットフォームプロジェクト

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

single-SPA skip ルールをバイパスします。高い `minSubappFiles` と組み合わせてノイズをフィルタしてください。

### レガシーアプリをスキップする NX Angular monorepo

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner は既に NX monorepo を自動的に処理します。skip リストは指定したレガシーアプリをドメインリストから除外します。

---

## このファイルに置くもの・置かないもの

このリストにないフィールドを記述する古いドキュメントを見つけたら、それらのフィールドは存在しません。`.claudeos-scan.json` を読む実際のコードは:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

ここだけです。バックエンド scanner と orchestrator はこのファイルを読みません。

存在しない設定オプションが必要なら、プロジェクト構造とツールにしてほしい動作を記述して [issue を作成](https://github.com/claudeos-core/claudeos-core/issues) してください。

---

## 関連項目

- [stacks.md](stacks.md) — 自動検出がデフォルトで何を拾うか
- [troubleshooting.md](troubleshooting.md) — scanner 検出が誤発火するとき
