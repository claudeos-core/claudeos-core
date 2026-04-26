# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Để Claude Code tuân theo các quy ước của _dự án bạn_ ngay từ lần đầu — không phải các mặc định chung chung.**

Một deterministic Node.js scanner đọc mã nguồn của bạn trước; sau đó pipeline Claude 4-pass viết toàn bộ — `CLAUDE.md` + `.claude/rules/` tự động nạp + standards + skills + L4 memory. 10 ngôn ngữ đầu ra, 5 validator hậu sinh, và một path allowlist tường minh ngăn LLM bịa ra các tệp hoặc framework không có trong code của bạn.

Hoạt động trên [**12 stack**](#supported-stacks) (bao gồm monorepo) — một lệnh `npx` duy nhất, không cần cấu hình, resume-safe, idempotent.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Công cụ này là gì?

Bạn đang dùng Claude Code. Nó mạnh mẽ, nhưng mỗi phiên đều bắt đầu mới — không có ký ức về cách _dự án của bạn_ được tổ chức. Vì vậy nó fallback về các mặc định "tốt nói chung" mà hiếm khi khớp với những gì đội bạn thực sự làm:

- Đội bạn dùng **MyBatis**, nhưng Claude lại sinh JPA repository.
- Response wrapper của bạn là `ApiResponse.ok()`, nhưng Claude lại viết `ResponseEntity.success()`.
- Package của bạn là layer-first (`controller/order/`), nhưng Claude lại tạo domain-first (`order/controller/`).
- Lỗi của bạn đi qua centralized middleware, nhưng Claude rải `try/catch` ở mọi endpoint.

Bạn muốn có một bộ `.claude/rules/` cho từng dự án — Claude Code tự động nạp mỗi phiên — nhưng viết tay những rule đó cho mỗi repo mới mất hàng giờ, và chúng drift theo sự tiến hóa của code.

**ClaudeOS-Core viết chúng cho bạn, từ chính mã nguồn thực tế của bạn.** Một deterministic Node.js scanner đọc dự án bạn trước (stack, ORM, layout package, quy ước, đường dẫn tệp). Sau đó pipeline Claude 4-pass biến các sự kiện đã trích xuất thành một bộ tài liệu hoàn chỉnh:

- **`CLAUDE.md`** — chỉ mục dự án mà Claude đọc ở mỗi phiên
- **`.claude/rules/`** — rules tự động nạp theo category (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — tài liệu tham chiếu ("vì sao" sau mỗi rule)
- **`claudeos-core/skills/`** — pattern tái sử dụng (CRUD scaffolding, page template)
- **`claudeos-core/memory/`** — decision log + failure pattern lớn lên cùng dự án

Vì scanner trao cho Claude một path allowlist tường minh, LLM **không thể bịa ra các tệp hoặc framework không có trong code của bạn**. Năm validator hậu sinh (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) xác minh đầu ra trước khi ship — language-invariant, vì vậy cùng một bộ rule áp dụng dù bạn sinh bằng tiếng Anh, tiếng Hàn hay 8 ngôn ngữ còn lại.

```
Trước:  Bạn → Claude Code → code "tốt nói chung" → sửa thủ công mỗi lần
Sau:    Bạn → Claude Code → code khớp với DỰ ÁN CỦA BẠN → dùng luôn
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
<summary><strong>📄 Nội dung kết thúc trong <code>CLAUDE.md</code> của bạn (trích đoạn thực tế — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

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

Mọi giá trị bên trên — tọa độ dependency chính xác, tên tệp `dev.db`, tên migration `V1__create_tables.sql`, "no JPA" — đều được scanner trích xuất từ `build.gradle` / `application.properties` / cây mã nguồn trước khi Claude viết tệp. Không có gì là phỏng đoán.

</details>

<details>
<summary><strong>🛡️ Một rule thật được tự động nạp (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

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

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

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

Glob `paths: ["**/*"]` có nghĩa là Claude Code tự động nạp rule này mỗi khi bạn chỉnh bất kỳ tệp nào trong dự án. Mọi tên class, đường dẫn package, exception handler trong rule đều được lấy thẳng từ source đã scan — bao gồm cả `CustomizeExceptionHandler` và `JacksonCustomizations` thực tế của dự án.

</details>

<details>
<summary><strong>🧠 Hạt mầm <code>decision-log.md</code> tự sinh (trích đoạn thực tế)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 gieo `decision-log.md` bằng các quyết định kiến trúc được trích từ `pass2-merged.json`, để các phiên sau ghi nhớ *vì sao* codebase trông như vậy — không chỉ *trông như thế nào*. Mọi tùy chọn ("JPA/Hibernate", "MyBatis-Plus") và mọi hệ quả đều bắt nguồn từ chính khối dependency `build.gradle` thực tế.

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

| Bạn là... | Pain mà công cụ này gỡ bỏ |
|---|---|
| **Dev solo** đang khởi tạo dự án mới với Claude Code | "Dạy Claude quy ước của tôi mỗi phiên" — biến mất. `CLAUDE.md` + `.claude/rules/` 8-category được sinh trong một lần chạy. |
| **Team lead** duy trì chuẩn dùng chung qua nhiều repo | `.claude/rules/` drift khi mọi người đổi tên package, đổi ORM, đổi response wrapper. ClaudeOS-Core đồng bộ lại deterministic — cùng đầu vào, đầu ra byte-identical, không có diff noise. |
| **Đã dùng Claude Code** nhưng mệt mỏi vì sửa code được sinh | Sai response wrapper, sai layout package, JPA khi bạn dùng MyBatis, `try/catch` rải khắp khi dự án bạn dùng centralized middleware. Scanner trích các quy ước thật của bạn; mỗi pass Claude chạy dựa trên một path allowlist tường minh. |
| **Onboarding một repo mới** (dự án sẵn có, gia nhập đội mới) | Chạy `init` trên repo, nhận một bản đồ kiến trúc sống: bảng stack trong CLAUDE.md, rules từng layer kèm ví dụ ✅/❌, decision log đã gieo "vì sao" sau các lựa chọn lớn (JPA vs MyBatis, REST vs GraphQL, v.v.). Đọc 5 tệp thắng đọc 5.000 source file. |
| **Làm việc bằng tiếng Hàn / Nhật / Trung / 7 ngôn ngữ khác** | Hầu hết các bộ sinh rule Claude Code chỉ hỗ trợ tiếng Anh. ClaudeOS-Core viết toàn bộ bằng **10 ngôn ngữ** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) với **xác minh cấu trúc byte-identical** — cùng verdict `claude-md-validator` bất kể ngôn ngữ đầu ra. |
| **Đang chạy trên monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domain backend + frontend được phân tích trong một lần chạy với prompt riêng biệt; `apps/*/` và `packages/*/` được walk tự động; rules theo từng stack được emit dưới `70.domains/{type}/`. |
| **Đóng góp OSS hoặc thử nghiệm** | Đầu ra thân thiện với gitignore — `claudeos-core/` là thư mục làm việc local của bạn, chỉ `CLAUDE.md` + `.claude/` cần ship. Resume-safe khi bị gián đoạn; idempotent khi chạy lại (chỉnh sửa thủ công của bạn được giữ lại nếu không có `--force`). |

**Không phù hợp nếu:** bạn muốn một bundle preset agents/skills/rules dạng one-size-fits-all chạy được ngay từ ngày đầu mà không cần bước scan (xem [docs/vi/comparison.md](docs/vi/comparison.md) để biết công cụ nào hợp với việc gì), dự án của bạn chưa khớp với một trong các [stack được hỗ trợ](#supported-stacks), hoặc bạn chỉ cần một `CLAUDE.md` đơn giản (built-in `claude /init` là đủ — không cần cài thêm công cụ).

---

## Hoạt động thế nào?

ClaudeOS-Core đảo ngược workflow Claude Code thông thường:

```
Thông thường:  Bạn mô tả dự án → Claude đoán stack → Claude viết doc
Công cụ này:   Code đọc stack → Code đưa sự kiện đã xác nhận cho Claude → Claude viết doc từ sự kiện
```

Pipeline chạy theo **3 giai đoạn**, với code ở cả hai phía của lời gọi LLM:

**1. Step A — Scanner (deterministic, không LLM).** Một Node.js scanner walk qua thư mục gốc dự án, đọc `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parse các tệp `.env*` (với redaction biến nhạy cảm cho `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), phân loại pattern kiến trúc (5 pattern A/B/C/D/E của Java, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), khám phá các domain, và xây dựng allowlist tường minh cho mọi đường dẫn source tồn tại. Đầu ra: `project-analysis.json` — single source of truth cho mọi bước sau.

**2. Step B — Pipeline Claude 4-pass (bị ràng buộc bởi sự kiện của Step A).**
- **Pass 1** đọc các tệp đại diện theo nhóm domain và trích ~50–100 quy ước mỗi domain — response wrapper, thư viện logging, error handling, quy ước đặt tên, pattern test. Chạy một lần mỗi nhóm domain (`max 4 domains, 40 files per group`) nên context không bao giờ overflow.
- **Pass 2** gộp toàn bộ phân tích theo từng domain thành bức tranh toàn dự án và giải quyết bất đồng bằng cách chọn quy ước trội nhất.
- **Pass 3** viết `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — split thành các stage (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) để prompt mỗi stage vừa với context window của LLM kể cả khi `pass2-merged.json` lớn. Sub-divide 3b/3c thành các batch ≤15 domain cho dự án ≥16 domain.
- **Pass 4** gieo lớp L4 memory (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) và thêm các universal scaffold rule. Pass 4 **bị cấm chỉnh sửa `CLAUDE.md`** — Section 8 của Pass 3 là authoritative.

**3. Step C — Verification (deterministic, không LLM).** Năm validator kiểm tra đầu ra:
- `claude-md-validator` — 25 kiểm tra cấu trúc trên `CLAUDE.md` (8 sections, đếm H3/H4, tính duy nhất của memory file, T1 canonical heading invariant). Language-invariant: cùng verdict bất kể `--lang`.
- `content-validator` — 10 kiểm tra nội dung gồm xác minh path-claim (`STALE_PATH` bắt các tham chiếu `src/...` bị bịa) và phát hiện MANIFEST drift.
- `pass-json-validator` — Pass 1/2/3/4 well-formed JSON + đếm section theo stack.
- `plan-validator` — nhất quán plan ↔ disk (legacy, gần như no-op từ v2.1.0).
- `sync-checker` — nhất quán đăng ký disk ↔ `sync-map.json` qua 7 thư mục được theo dõi.

Ba mức severity (`fail` / `warn` / `advisory`) để warning không bao giờ deadlock CI vì hallucination LLM mà người dùng có thể tự sửa.

Bất biến gắn kết tất cả: **Claude chỉ có thể trích các đường dẫn thật sự tồn tại trong code của bạn**, vì Step A trao cho nó một allowlist hữu hạn. Nếu LLM vẫn cố bịa (hiếm nhưng xảy ra với vài seed), Step C bắt được trước khi docs ship.

Chi tiết per-pass, resume dựa trên marker, workaround staged-rules cho `.claude/` sensitive-path block của Claude Code, và internals của stack detection xem [docs/vi/architecture.md](docs/vi/architecture.md).

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
