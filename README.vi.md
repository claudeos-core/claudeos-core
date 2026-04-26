# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Tự động sinh tài liệu Claude Code từ chính mã nguồn thực tế của bạn.** Một CLI phân tích tĩnh dự án rồi chạy pipeline Claude 4-pass để sinh `.claude/rules/`, standards, skills và guides — nhờ đó Claude Code tuân theo **các quy ước của dự án bạn**, không phải các quy ước chung chung.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Công cụ này là gì?

Bạn đang dùng Claude Code. Nó thông minh, nhưng nó không biết **các quy ước của dự án bạn**:
- Đội của bạn dùng MyBatis, nhưng Claude lại sinh code JPA.
- Wrapper của bạn là `ApiResponse.ok()`, nhưng Claude lại viết `ResponseEntity.success()`.
- Package của bạn là `controller/order/`, nhưng Claude lại tạo `order/controller/`.

Vì vậy bạn mất khá nhiều thời gian để sửa từng tệp được sinh ra.

**ClaudeOS-Core khắc phục điều này.** Nó quét mã nguồn thực tế của bạn, xác định các quy ước, và viết một tập rule hoàn chỉnh vào `.claude/rules/` — thư mục mà Claude Code tự động đọc. Lần sau bạn nói *"Tạo CRUD cho orders"*, Claude sẽ tuân theo quy ước của bạn ngay từ lần đầu.

```
Trước:  Bạn → Claude Code → code "tốt nói chung" → sửa thủ công
Sau:    Bạn → Claude Code → code khớp với dự án của bạn → dùng luôn
```

---

## Xem trên một dự án thật

Chạy trên [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Kết quả: **75 generated files**, tổng thời gian **53 phút**, mọi validator ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Đầu ra terminal (bản text, để tìm kiếm và sao chép)</strong></summary>

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
<summary><strong>📄 Trích đoạn <code>CLAUDE.md</code> được sinh (đầu ra thực tế)</strong></summary>

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

Lưu ý: mọi luận điểm phía trên đều dựa trên mã nguồn thực — tên class, đường dẫn package, key cấu hình, và cờ dead-config đều do scanner trích xuất trước khi Claude viết tệp.

</details>

<details>
<summary><strong>🛡️ Một rule thực tế được tự động nạp (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

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

Glob `paths: ["**/*"]` có nghĩa là Claude Code tự động nạp rule này mỗi khi bạn chỉnh bất kỳ tệp nào trong dự án. Các ví dụ ✅/❌ được lấy thẳng từ chính các quy ước và mẫu lỗi đã có trong codebase này.

</details>

<details>
<summary><strong>🧠 Hạt mầm <code>decision-log.md</code> tự sinh (trích đoạn thực tế)</strong></summary>

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

Pass 4 gieo `decision-log.md` bằng các quyết định kiến trúc được trích từ `pass2-merged.json`, để các phiên sau ghi nhớ *vì sao* codebase trông như vậy — không chỉ *trông như thế nào*.

</details>

---

## Quick Start

**Yêu cầu trước:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) đã cài đặt và xác thực.

```bash
# 1. Vào thư mục gốc dự án
cd my-spring-boot-project

# 2. Chạy init (lệnh này phân tích code và yêu cầu Claude viết rules)
npx claudeos-core init

# 3. Xong. Mở Claude Code và bắt đầu code — rules đã được nạp sẵn.
```

**Bạn sẽ có** sau khi `init` hoàn tất:

```
your-project/
├── .claude/
│   └── rules/                    ← Tự động nạp bởi Claude Code
│       ├── 00.core/              (rules chung — naming, kiến trúc)
│       ├── 10.backend/           (rules backend stack, nếu có)
│       ├── 20.frontend/          (rules frontend stack, nếu có)
│       ├── 30.security-db/       (quy ước bảo mật & DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (nhắc đồng bộ doc — chỉ rules)
│       ├── 60.memory/            (memory rules — Pass 4, chỉ rules)
│       ├── 70.domains/{type}/    (rules theo domain, type = backend|frontend)
│       └── 80.verification/      (chiến lược test + nhắc xác minh build)
├── claudeos-core/
│   ├── standard/                 ← Tài liệu tham chiếu (mirror cấu trúc category)
│   │   ├── 00.core/              (project overview, kiến trúc, naming)
│   │   ├── 10.backend/           (reference backend — nếu có backend stack)
│   │   ├── 20.frontend/          (reference frontend — nếu có frontend stack)
│   │   ├── 30.security-db/       (reference bảo mật & DB)
│   │   ├── 40.infra/             (reference env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (reference theo domain)
│   │   ├── 80.verification/      (reference build / startup / testing — chỉ standard)
│   │   └── 90.optional/          (mở rộng riêng cho stack — chỉ standard)
│   ├── skills/                   (mẫu tái sử dụng mà Claude có thể áp dụng)
│   ├── guide/                    (hướng dẫn how-to cho các tác vụ thường gặp)
│   ├── database/                 (tổng quan schema, hướng dẫn migration)
│   ├── mcp-guide/                (ghi chú tích hợp MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (chỉ mục Claude đọc đầu tiên)
```

Các category dùng chung tiền tố số giữa `rules/` và `standard/` đại diện cho cùng một mảng khái niệm (ví dụ: `10.backend` rules ↔ `10.backend` standards). Category chỉ-rules: `50.sync` (nhắc đồng bộ doc) và `60.memory` (Pass 4 memory). Category chỉ-standard: `90.optional` (mở rộng riêng stack, không cưỡng chế). Mọi tiền tố khác (`00`, `10`, `20`, `30`, `40`, `70`, `80`) xuất hiện ở CẢ `rules/` và `standard/`. Giờ Claude Code đã hiểu dự án của bạn.

---

## Dành cho ai?

| Bạn là... | Công cụ này giúp bạn... |
|---|---|
| **Dev solo** đang khởi tạo dự án mới với Claude Code | Bỏ qua hoàn toàn giai đoạn "dạy Claude quy ước của tôi" |
| **Team lead** duy trì chuẩn dùng chung | Tự động hóa phần tẻ nhạt: giữ `.claude/rules/` luôn cập nhật |
| **Đã dùng Claude Code** nhưng mệt mỏi vì sửa code được sinh | Khiến Claude tuân theo mẫu của BẠN, không phải mẫu "tốt nói chung" |

**Không phù hợp nếu:** bạn muốn một bundle preset agents/skills/rules dạng one-size-fits-all chạy được ngay từ ngày đầu mà không cần bước scan (xem [docs/vi/comparison.md](docs/vi/comparison.md) để biết công cụ nào hợp với việc gì), hoặc dự án của bạn chưa khớp với một trong các [stack được hỗ trợ](#supported-stacks).

---

## Hoạt động thế nào?

ClaudeOS-Core đảo ngược workflow Claude Code thông thường:

```
Thông thường:  Bạn mô tả dự án → Claude đoán stack → Claude viết doc
Công cụ này:   Code đọc stack → Code đưa sự kiện đã xác nhận cho Claude → Claude viết doc từ sự kiện
```

Ý tưởng then chốt: **một scanner Node.js đọc mã nguồn của bạn trước** (deterministic, không AI), sau đó pipeline Claude 4-pass viết tài liệu, bị ràng buộc bởi những gì scanner tìm thấy. Claude không thể bịa ra đường dẫn hay framework không thực sự có trong code.

Xem kiến trúc đầy đủ tại [docs/vi/architecture.md](docs/vi/architecture.md).

---

## Supported Stacks

12 stack, tự động phát hiện từ tệp dự án:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Dự án đa-stack (ví dụ: Spring Boot backend + Next.js frontend) hoạt động ngay không cần cấu hình.

Quy tắc phát hiện và những gì mỗi scanner trích xuất xem tại [docs/vi/stacks.md](docs/vi/stacks.md).

---

## Workflow hằng ngày

Ba lệnh phủ ~95% nhu cầu sử dụng:

```bash
# Lần đầu trên một dự án
npx claudeos-core init

# Sau khi bạn chỉnh thủ công standards hoặc rules
npx claudeos-core lint

# Health check (chạy trước khi commit, hoặc trong CI)
npx claudeos-core health
```

Hai lệnh nữa cho bảo trì memory layer:

```bash
# Compact log failure-patterns (chạy định kỳ)
npx claudeos-core memory compact

# Đề xuất các pattern lỗi thường gặp thành rule mới
npx claudeos-core memory propose-rules
```

Tùy chọn đầy đủ của từng lệnh xem tại [docs/vi/commands.md](docs/vi/commands.md).

---

## Điều gì làm công cụ này khác biệt

Hầu hết công cụ sinh tài liệu Claude Code đều sinh từ một mô tả (bạn nói cho công cụ, công cụ nói cho Claude). ClaudeOS-Core sinh từ chính mã nguồn của bạn (công cụ đọc, công cụ nói cho Claude phần nào đã được xác nhận, Claude chỉ viết những gì đã được xác nhận).

Ba hệ quả cụ thể:

1. **Phát hiện stack có tính deterministic.** Cùng dự án + cùng code = cùng đầu ra. Không có chuyện "lần này Claude đoán khác."
2. **Không bịa ra đường dẫn.** Prompt của Pass 3 liệt kê tường minh mọi đường dẫn nguồn được phép; Claude không thể trích các đường dẫn không tồn tại.
3. **Hiểu đa-stack.** Domain backend và frontend dùng prompt phân tích khác nhau trong cùng một lần chạy.

So sánh phạm vi side-by-side với các công cụ khác xem [docs/vi/comparison.md](docs/vi/comparison.md). So sánh là về **mỗi công cụ làm gì**, không phải **cái nào tốt hơn** — phần lớn là bổ trợ nhau.

---

## Xác minh (sau khi sinh)

Sau khi Claude viết doc, code sẽ xác minh chúng. Năm validator độc lập:

| Validator | Kiểm tra gì | Chạy bởi |
|---|---|---|
| `claude-md-validator` | Bất biến cấu trúc của CLAUDE.md (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Đường dẫn nêu trong tài liệu thật sự tồn tại; manifest nhất quán | `health` (advisory) |
| `pass-json-validator` | Đầu ra Pass 1 / 2 / 3 / 4 là JSON đúng cú pháp | `health` (warn) |
| `plan-validator` | Plan đã lưu khớp với đĩa | `health` (fail-on-error) |
| `sync-checker` | Tệp trên đĩa khớp với đăng ký trong `sync-map.json` (phát hiện orphaned/unregistered) | `health` (fail-on-error) |

Một `health-checker` điều phối bốn validator runtime với mức độ ba bậc (fail / warn / advisory) và thoát với exit code phù hợp cho CI. `claude-md-validator` chạy riêng qua lệnh `lint` vì lệch cấu trúc là tín hiệu cần re-init, không phải warning nhẹ. Có thể chạy bất cứ lúc nào:

```bash
npx claudeos-core health
```

Chi tiết kiểm tra của từng validator xem [docs/vi/verification.md](docs/vi/verification.md).

---

## Memory Layer (tùy chọn, dành cho dự án dài hạn)

Sau v2.0, ClaudeOS-Core ghi một thư mục `claudeos-core/memory/` chứa bốn tệp:

- `decision-log.md` — append-only "vì sao chọn X thay vì Y"
- `failure-patterns.md` — lỗi tái diễn kèm điểm frequency/importance
- `compaction.md` — cách memory được tự động compact theo thời gian
- `auto-rule-update.md` — pattern cần được biến thành rule mới

Bạn có thể chạy `npx claudeos-core memory propose-rules` để yêu cầu Claude xem xét các pattern lỗi gần đây và đề xuất rule mới.

Mô hình memory và vòng đời xem [docs/vi/memory-layer.md](docs/vi/memory-layer.md).

---

## FAQ

**H: Tôi có cần Claude API key không?**
Đ: Không. ClaudeOS-Core dùng cài đặt Claude Code sẵn có của bạn — nó truyền prompt đến `claude -p` trên máy bạn. Không cần tài khoản phụ.

**H: Lệnh này có ghi đè CLAUDE.md hoặc `.claude/rules/` đang có không?**
Đ: Lần chạy đầu trên dự án mới: tạo mới. Chạy lại không có `--force` thì giữ nguyên chỉnh sửa của bạn — marker từ lần chạy trước được phát hiện và pass đó bị bỏ qua. Chạy lại với `--force` thì xóa và sinh lại tất cả (các chỉnh sửa của bạn bị mất — đó chính là ý nghĩa của `--force`). Xem [docs/vi/safety.md](docs/vi/safety.md).

**H: Stack của tôi không được hỗ trợ. Tôi có thể thêm không?**
Đ: Có. Stack mới cần ~3 prompt template + một domain scanner. Xem [CONTRIBUTING.md](CONTRIBUTING.md) để có hướng dẫn 8 bước.

**H: Làm sao sinh doc bằng tiếng Việt (hoặc ngôn ngữ khác)?**
Đ: `npx claudeos-core init --lang vi`. Hỗ trợ 10 ngôn ngữ: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**H: Có chạy với monorepo không?**
Đ: Có — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) và npm/yarn workspaces (`package.json#workspaces`) được stack-detector phát hiện. Mỗi app được phân tích riêng. Các layout monorepo khác (ví dụ NX) không được phát hiện đặc biệt, nhưng các pattern chung `apps/*/` và `packages/*/` vẫn được scanner theo từng stack nhặt được.

**H: Nếu Claude Code sinh ra rule mà tôi không đồng ý thì sao?**
Đ: Sửa trực tiếp. Sau đó chạy `npx claudeos-core lint` để kiểm tra CLAUDE.md vẫn đúng cấu trúc. Các chỉnh sửa của bạn được giữ qua các lần `init` sau (không có `--force`) — cơ chế resume bỏ qua các pass đã có marker.

**H: Báo bug ở đâu?**
Đ: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Vấn đề bảo mật xem [SECURITY.md](SECURITY.md).

---

## Documentation

| Chủ đề | Đọc tại |
|---|---|
| Cách pipeline 4-pass hoạt động (sâu hơn diagram) | [docs/vi/architecture.md](docs/vi/architecture.md) |
| Diagram trực quan (Mermaid) của kiến trúc | [docs/vi/diagrams.md](docs/vi/diagrams.md) |
| Phát hiện stack — mỗi scanner tìm gì | [docs/vi/stacks.md](docs/vi/stacks.md) |
| Memory layer — decision log và failure pattern | [docs/vi/memory-layer.md](docs/vi/memory-layer.md) |
| Chi tiết cả 5 validator | [docs/vi/verification.md](docs/vi/verification.md) |
| Mọi lệnh CLI và tùy chọn | [docs/vi/commands.md](docs/vi/commands.md) |
| Cài thủ công (không dùng `npx`) | [docs/vi/manual-installation.md](docs/vi/manual-installation.md) |
| Override scanner — `.claudeos-scan.json` | [docs/vi/advanced-config.md](docs/vi/advanced-config.md) |
| An toàn: cái gì được giữ khi re-init | [docs/vi/safety.md](docs/vi/safety.md) |
| So sánh với các công cụ tương tự (về phạm vi, không phải chất lượng) | [docs/vi/comparison.md](docs/vi/comparison.md) |
| Lỗi và cách phục hồi | [docs/vi/troubleshooting.md](docs/vi/troubleshooting.md) |

---

## Đóng góp

Chào đón đóng góp — thêm hỗ trợ stack, cải thiện prompt, sửa bug. Xem [CONTRIBUTING.md](CONTRIBUTING.md).

Quy tắc ứng xử và chính sách bảo mật xem [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) và [SECURITY.md](SECURITY.md).

## License

[ISC](LICENSE) — miễn phí cho mọi mục đích, kể cả thương mại.

---

<sub>Xây dựng tận tâm bởi [@claudeos-core](https://github.com/claudeos-core). Nếu công cụ này tiết kiệm thời gian cho bạn, một ⭐ trên GitHub giúp nó được nhiều người biết đến.</sub>
