# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Một CLI deterministic tự động sinh `CLAUDE.md` + `.claude/rules/` từ chính source code thực tế của bạn — Node.js scanner + 4-pass Claude pipeline + 5 validator. 12 stack, 10 ngôn ngữ, không có path bịa đặt.**

```bash
npx claudeos-core init
```

Hoạt động trên [**12 stack**](#supported-stacks) (bao gồm cả monorepo) — một lệnh, không cần config, resume-safe, idempotent.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Đây là gì?

Claude Code mỗi session lại fallback về giá trị mặc định của framework. Team của bạn dùng **MyBatis**, nhưng Claude lại viết JPA. Wrapper của bạn là `ApiResponse.ok()`, nhưng Claude viết `ResponseEntity.success()`. Package của bạn là layer-first, nhưng Claude lại sinh ra theo kiểu domain-first. Tự tay viết `.claude/rules/` cho mỗi repo có thể giải quyết được — cho đến khi code phát triển và rules của bạn bị drift.

**ClaudeOS-Core sinh lại chúng một cách deterministic, từ chính source code thực tế của bạn.** Một Node.js scanner đọc trước (stack, ORM, package layout, file path). Sau đó một 4-pass Claude pipeline viết toàn bộ — `CLAUDE.md` + `.claude/rules/` được auto-load + standards + skills — bị ràng buộc bởi một path allowlist tường minh mà LLM không thể thoát ra. Năm validator kiểm tra output trước khi nó được ship.

Kết quả: cùng input → output byte-identical, ở bất kỳ ngôn ngữ nào trong 10 ngôn ngữ, không có path bịa đặt. (Chi tiết ở [Điểm khác biệt](#điểm-khác-biệt) bên dưới.)

Một [Memory Layer](#memory-layer-tùy-chọn-cho-dự-án-dài-hạn) riêng được seed cho các dự án dài hạn.

---

## Xem trên dự án thực tế

Chạy trên [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source file. Output: **75 file được sinh ra**, tổng thời gian **53 phút**, tất cả validator ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Output terminal (phiên bản text, để tìm kiếm và copy)</strong></summary>

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
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
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
<summary><strong>Những gì xuất hiện trong <code>CLAUDE.md</code> của bạn (trích đoạn thực tế — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

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

Mọi giá trị ở trên — toạ độ dependency chính xác, tên file `dev.db`, tên migration `V1__create_tables.sql`, "no JPA" — đều được scanner trích xuất từ `build.gradle` / `application.properties` / cây source trước khi Claude viết file. Không có gì là phỏng đoán.

</details>

<details>
<summary><strong>Một rule auto-load thực tế (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

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

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

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

Glob `paths: ["**/*"]` có nghĩa là Claude Code sẽ auto-load rule này mỗi khi bạn edit bất kỳ file nào trong dự án. Mọi tên class, package path, và exception handler trong rule đều được lấy trực tiếp từ source đã scan — bao gồm cả `CustomizeExceptionHandler` và `JacksonCustomizations` thực tế của dự án.

</details>

<details>
<summary><strong>Một seed <code>decision-log.md</code> được sinh tự động (trích đoạn thực tế)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 seed `decision-log.md` bằng những quyết định kiến trúc được trích từ `pass2-merged.json` để các session sau này nhớ được _tại sao_ codebase trông như vậy — chứ không chỉ _nó trông như thế nào_. Mọi option ("JPA/Hibernate", "MyBatis-Plus") và mọi consequence đều dựa trên block dependency thực tế trong `build.gradle`.

</details>

---

## Đã kiểm thử trên

ClaudeOS-Core được ship kèm các benchmark tham chiếu trên các dự án OSS thực tế. Nếu bạn đã dùng nó trên một public repo, hãy [mở issue](https://github.com/claudeos-core/claudeos-core/issues) — chúng tôi sẽ thêm vào bảng này.

| Dự án | Stack | Scanned → Generated | Trạng thái |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ tất cả 5 validator pass |

---

## Bắt đầu nhanh

**Yêu cầu trước:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) đã cài đặt và đã xác thực.

```bash
# 1. Đi tới thư mục gốc của dự án
cd my-spring-boot-project

# 2. Chạy init (lệnh này phân tích code và yêu cầu Claude viết rules)
npx claudeos-core init

# 3. Xong. Mở Claude Code và bắt đầu code — rules đã được load sẵn.
```

**Bạn nhận được gì** sau khi `init` hoàn thành:

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-load bởi Claude Code
│       ├── 00.core/              (rules chung — naming, kiến trúc)
│       ├── 10.backend/           (rules backend stack, nếu có)
│       ├── 20.frontend/           (rules frontend stack, nếu có)
│       ├── 30.security-db/       (quy ước bảo mật & DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (nhắc nhở doc-sync — chỉ rules)
│       ├── 60.memory/            (memory rules — Pass 4, chỉ rules)
│       ├── 70.domains/{type}/    (rules theo domain, type = backend|frontend)
│       └── 80.verification/      (chiến lược test + nhắc nhở verify build)
├── claudeos-core/
│   ├── standard/                 ← Tài liệu tham chiếu (mirror cấu trúc category)
│   │   ├── 00.core/              (tổng quan dự án, kiến trúc, naming)
│   │   ├── 10.backend/           (tham chiếu backend — nếu là backend stack)
│   │   ├── 20.frontend/          (tham chiếu frontend — nếu là frontend stack)
│   │   ├── 30.security-db/       (tham chiếu bảo mật & DB)
│   │   ├── 40.infra/             (tham chiếu env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (tham chiếu theo domain)
│   │   ├── 80.verification/      (tham chiếu build / startup / test — chỉ standard)
│   │   └── 90.optional/          (mở rộng theo stack — chỉ standard)
│   ├── skills/                   (pattern tái sử dụng mà Claude có thể áp dụng)
│   ├── guide/                    (hướng dẫn how-to cho các tác vụ phổ biến)
│   ├── database/                 (tổng quan schema, hướng dẫn migration)
│   ├── mcp-guide/                (ghi chú tích hợp MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (index Claude đọc đầu tiên)
```

Các category chia sẻ cùng số prefix giữa `rules/` và `standard/` đại diện cho cùng một vùng khái niệm (ví dụ: `10.backend` rules ↔ `10.backend` standards). Category chỉ-rules: `50.sync` (nhắc doc sync) và `60.memory` (Pass 4 memory). Category chỉ-standard: `90.optional` (mở rộng theo stack, không enforce). Tất cả prefix khác (`00`, `10`, `20`, `30`, `40`, `70`, `80`) xuất hiện trong CẢ `rules/` và `standard/`. Bây giờ Claude Code đã biết dự án của bạn.

---

## Dành cho ai?

| Bạn là... | Pain mà công cụ này loại bỏ |
|---|---|
| **Solo dev** bắt đầu một dự án mới với Claude Code | "Dạy Claude quy ước của tôi mỗi session" — biến mất. `CLAUDE.md` + `.claude/rules/` 8 category được sinh trong một lần chạy. |
| **Team lead** duy trì standards chia sẻ giữa các repo | `.claude/rules/` bị drift khi mọi người đổi tên package, đổi ORM, hay thay response wrapper. ClaudeOS-Core re-sync deterministic — cùng input, output byte-identical, không có diff noise. |
| **Đã dùng Claude Code** nhưng mệt vì phải sửa code được sinh ra | Sai response wrapper, sai package layout, JPA khi bạn dùng MyBatis, `try/catch` rải rác khi dự án dùng middleware tập trung. Scanner trích xuất quy ước thật của bạn; mỗi Claude pass chạy với một path allowlist tường minh. |
| **Onboarding vào repo mới** (dự án có sẵn, gia nhập team) | Chạy `init` trên repo, có ngay một bản đồ kiến trúc sống: bảng stack trong CLAUDE.md, rules theo từng layer với ví dụ ✅/❌, decision log được seed với "tại sao" đằng sau những lựa chọn lớn (JPA vs MyBatis, REST vs GraphQL, v.v.). Đọc 5 file thắng đọc 5,000 file source. |
| **Làm việc bằng tiếng Hàn / Nhật / Trung / 7 ngôn ngữ khác** | Hầu hết các rule generator cho Claude Code chỉ tiếng Anh. ClaudeOS-Core viết toàn bộ ở **10 ngôn ngữ** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) với **kiểm tra cấu trúc byte-identical** — cùng verdict của `claude-md-validator` bất kể ngôn ngữ output. |
| **Chạy trên monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domain backend + frontend được phân tích trong một lần chạy với prompt riêng; `apps/*/` và `packages/*/` được walk tự động; rules theo từng stack được emit dưới `70.domains/{type}/`. |
| **Đóng góp OSS hay đang thử nghiệm** | Output thân thiện với gitignore — `claudeos-core/` là thư mục làm việc local của bạn, chỉ `CLAUDE.md` + `.claude/` cần được ship. Resume-safe nếu bị gián đoạn; idempotent khi chạy lại (chỉnh sửa thủ công của bạn ở rules được giữ lại nếu không có `--force`). |

**Không phù hợp nếu:** bạn muốn một bundle preset agents/skills/rules one-size-fits-all hoạt động ngay ngày đầu mà không cần bước scan (xem [docs/vi/comparison.md](docs/vi/comparison.md) để biết cái nào phù hợp ở đâu), dự án của bạn chưa khớp với một trong các [stack được hỗ trợ](#supported-stacks), hoặc bạn chỉ cần một `CLAUDE.md` duy nhất (built-in `claude /init` là đủ — không cần cài thêm tool khác).

---

## Cách hoạt động

ClaudeOS-Core đảo ngược workflow Claude Code thông thường:

```
Thông thường: Bạn mô tả dự án → Claude đoán stack của bạn → Claude viết docs
Cách này:     Code đọc stack của bạn → Code đưa fact đã xác nhận cho Claude → Claude viết docs từ fact
```

Pipeline chạy qua **ba giai đoạn**, với code ở cả hai phía của lời gọi LLM:

**1. Step A — Scanner (deterministic, không LLM).** Một Node.js scanner walk thư mục gốc dự án, đọc `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parse các file `.env*` (với redaction biến nhạy cảm cho `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), phân loại pattern kiến trúc (5 pattern A/B/C/D/E của Java, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), khám phá domain, và xây dựng allowlist tường minh của mọi path source file tồn tại. Output: `project-analysis.json` — single source of truth cho mọi thứ tiếp theo.

**2. Step B — 4-Pass Claude pipeline (bị ràng buộc bởi fact của Step A).**
- **Pass 1** đọc các file đại diện theo từng domain group và trích xuất ~50–100 quy ước mỗi domain — response wrapper, thư viện logging, error handling, quy ước naming, test pattern. Chạy một lần mỗi domain group (`max 4 domains, 40 files per group`) nên context không bao giờ overflow.
- **Pass 2** merge mọi phân tích theo domain thành bức tranh toàn dự án và giải quyết bất đồng bằng cách chọn quy ước chiếm ưu thế.
- **Pass 3** viết `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — chia thành các stage (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) để prompt mỗi stage vừa với context window của LLM ngay cả khi `pass2-merged.json` lớn. Sub-divide 3b/3c thành các batch ≤15 domain cho dự án ≥16 domain.
- **Pass 4** seed L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) và thêm các rule scaffold phổ quát. Pass 4 **bị cấm sửa `CLAUDE.md`** — Section 8 của Pass 3 là authoritative.

**3. Step C — Verification (deterministic, không LLM).** Năm validator kiểm tra output:
- `claude-md-validator` — 25 kiểm tra cấu trúc trên `CLAUDE.md` (8 section, count H3/H4, tính duy nhất của file memory, T1 canonical heading invariant). Language-invariant: cùng verdict bất kể `--lang`.
- `content-validator` — 10 kiểm tra nội dung bao gồm verify path-claim (`STALE_PATH` bắt các tham chiếu `src/...` bịa đặt) và phát hiện MANIFEST drift.
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + section count theo stack.
- `plan-validator` — nhất quán plan ↔ disk (legacy, hầu như no-op từ v2.1.0).
- `sync-checker` — nhất quán đăng ký disk ↔ `sync-map.json` qua 7 thư mục được track.

Ba bậc severity (`fail` / `warn` / `advisory`) nên warning không bao giờ làm deadlock CI vì những hallucination LLM mà người dùng có thể fix thủ công.

Invariant gắn kết tất cả lại với nhau: **Claude chỉ có thể trích dẫn các path thực sự tồn tại trong code của bạn**, vì Step A đưa cho nó một allowlist hữu hạn. Nếu LLM vẫn cố gắng bịa đặt (hiếm nhưng có xảy ra với một số seed), Step C sẽ bắt được trước khi docs được ship.

Để biết chi tiết per-pass, resume dựa trên marker, workaround staged-rules cho block đường dẫn nhạy cảm `.claude/` của Claude Code, và internals của stack detection, xem [docs/vi/architecture.md](docs/vi/architecture.md).

---

## Supported Stacks

12 stack, tự động phát hiện từ các file dự án của bạn:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Dự án multi-stack (ví dụ: Spring Boot backend + Next.js frontend) hoạt động ngay out of the box.

Để biết quy tắc phát hiện và mỗi scanner trích xuất gì, xem [docs/vi/stacks.md](docs/vi/stacks.md).

---

## Quy trình hàng ngày

Ba lệnh bao phủ ~95% sử dụng:

```bash
# Lần đầu chạy trên một dự án
npx claudeos-core init

# Sau khi bạn chỉnh tay standards hoặc rules
npx claudeos-core lint

# Health check (chạy trước commit, hoặc trong CI)
npx claudeos-core health
```

Để biết các option đầy đủ của mỗi lệnh, xem [docs/vi/commands.md](docs/vi/commands.md). Các lệnh memory layer (`memory compact`, `memory propose-rules`) được nói đến ở section [Memory Layer](#memory-layer-tùy-chọn-cho-dự-án-dài-hạn) bên dưới.

---

## Điểm khác biệt

Hầu hết các công cụ tài liệu Claude Code sinh ra từ một mô tả (bạn nói cho công cụ, công cụ nói cho Claude). ClaudeOS-Core sinh ra từ chính source code thực tế của bạn (công cụ đọc, công cụ nói cho Claude biết những gì đã được xác nhận, Claude chỉ viết những gì đã được xác nhận).

Ba kết quả cụ thể:

1. **Stack detection deterministic.** Cùng dự án + cùng code = cùng output. Không có chuyện "Claude lần này roll khác rồi."
2. **Không có path bịa đặt.** Prompt Pass 3 liệt kê tường minh mọi path source được phép; Claude không thể trích dẫn các path không tồn tại.
3. **Multi-stack aware.** Domain backend và frontend dùng các prompt phân tích khác nhau trong cùng một lần chạy.

Để xem so sánh scope cạnh nhau với các công cụ khác, xem [docs/vi/comparison.md](docs/vi/comparison.md). So sánh là về **mỗi công cụ làm gì**, không phải **cái nào tốt hơn** — hầu hết là bổ sung cho nhau.

---

## Xác minh (sau khi tạo)

Sau khi Claude viết docs, code sẽ verify chúng. Năm validator riêng biệt:

| Validator | Kiểm tra cái gì | Chạy bởi |
|---|---|---|
| `claude-md-validator` | Bất biến cấu trúc CLAUDE.md (8 section, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path claim thực sự tồn tại; nhất quán manifest | `health` (advisory) |
| `pass-json-validator` | Output Pass 1 / 2 / 3 / 4 là JSON well-formed | `health` (warn) |
| `plan-validator` | Plan đã lưu khớp với disk | `health` (fail-on-error) |
| `sync-checker` | File trên disk khớp với đăng ký `sync-map.json` (phát hiện orphaned/unregistered) | `health` (fail-on-error) |

Một `health-checker` orchestrate bốn runtime validator với three-tier severity (fail / warn / advisory) và exit với code phù hợp cho CI. `claude-md-validator` chạy riêng qua lệnh `lint` vì drift cấu trúc là tín hiệu re-init, không phải warning mềm. Chạy bất kỳ lúc nào:

```bash
npx claudeos-core health
```

Để biết các kiểm tra chi tiết của mỗi validator, xem [docs/vi/verification.md](docs/vi/verification.md).

---

## Memory Layer (tùy chọn, cho dự án dài hạn)

Ngoài pipeline scaffolding ở trên, ClaudeOS-Core seed một thư mục `claudeos-core/memory/` cho các dự án mà context tồn tại lâu hơn một session đơn lẻ. Đây là tùy chọn — bạn có thể bỏ qua nếu chỉ cần `CLAUDE.md` + rules.

Bốn file, tất cả do Pass 4 viết:

- `decision-log.md` — append-only "tại sao chúng ta chọn X thay vì Y", seed từ `pass2-merged.json`
- `failure-patterns.md` — các lỗi lặp lại với điểm frequency/importance
- `compaction.md` — cách memory được tự động compact theo thời gian
- `auto-rule-update.md` — các pattern nên trở thành rule mới

Hai lệnh duy trì layer này theo thời gian:

```bash
# Compact log failure-patterns (chạy định kỳ)
npx claudeos-core memory compact

# Đề xuất rule mới từ các failure pattern xuất hiện thường xuyên
npx claudeos-core memory propose-rules
```

Để biết model memory và lifecycle, xem [docs/vi/memory-layer.md](docs/vi/memory-layer.md).

---

## FAQ

**Q: Tôi có cần Claude API key không?**
A: Không. ClaudeOS-Core dùng cài đặt Claude Code có sẵn của bạn — nó pipe prompt tới `claude -p` trên máy bạn. Không cần tài khoản phụ.

**Q: Việc này có ghi đè CLAUDE.md hoặc `.claude/rules/` hiện có của tôi không?**
A: Lần đầu chạy trên dự án mới: nó tạo mới. Chạy lại không có `--force`: chỉnh sửa của bạn được giữ lại — pass marker từ lần chạy trước được phát hiện và các pass sẽ được skip. Chạy lại với `--force`: xoá sạch và sinh lại tất cả (chỉnh sửa của bạn mất — đó là ý nghĩa của `--force`). Xem [docs/vi/safety.md](docs/vi/safety.md).

**Q: Stack của tôi không được hỗ trợ. Tôi có thể thêm không?**
A: Có. Stack mới cần ~3 prompt template + một domain scanner. Xem [CONTRIBUTING.md](CONTRIBUTING.md) để có hướng dẫn 8 bước.

**Q: Làm sao để sinh docs bằng tiếng Hàn (hoặc ngôn ngữ khác)?**
A: `npx claudeos-core init --lang ko`. 10 ngôn ngữ được hỗ trợ: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: Việc này có hoạt động với monorepo không?**
A: Có — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), và npm/yarn workspaces (`package.json#workspaces`) đều được phát hiện bởi stack-detector. Mỗi app có phân tích riêng. Các layout monorepo khác (ví dụ: NX) không được phát hiện cụ thể, nhưng các pattern chung `apps/*/` và `packages/*/` vẫn được nhận biết bởi các scanner theo stack.

**Q: Nếu Claude Code sinh ra rules mà tôi không đồng ý thì sao?**
A: Edit chúng trực tiếp. Sau đó chạy `npx claudeos-core lint` để verify CLAUDE.md vẫn hợp lệ về cấu trúc. Chỉnh sửa của bạn được giữ lại trong các lần chạy `init` tiếp theo (không có `--force`) — cơ chế resume sẽ skip các pass có marker.

**Q: Tôi báo bug ở đâu?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Cho các vấn đề bảo mật, xem [SECURITY.md](SECURITY.md).

---

## Nếu điều này tiết kiệm thời gian cho bạn

Một ⭐ trên GitHub giúp dự án giữ được sự nhìn thấy và giúp người khác tìm thấy nó. Issue, PR, và đóng góp stack template đều được hoan nghênh — xem [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Tài liệu

| Chủ đề | Đọc cái này |
|---|---|
| Cách 4-pass pipeline hoạt động (sâu hơn diagram) | [docs/vi/architecture.md](docs/vi/architecture.md) |
| Diagram trực quan (Mermaid) của kiến trúc | [docs/vi/diagrams.md](docs/vi/diagrams.md) |
| Stack detection — mỗi scanner tìm gì | [docs/vi/stacks.md](docs/vi/stacks.md) |
| Memory layer — decision log và failure pattern | [docs/vi/memory-layer.md](docs/vi/memory-layer.md) |
| Tất cả 5 validator chi tiết | [docs/vi/verification.md](docs/vi/verification.md) |
| Mọi lệnh CLI và option | [docs/vi/commands.md](docs/vi/commands.md) |
| Cài đặt thủ công (không có `npx`) | [docs/vi/manual-installation.md](docs/vi/manual-installation.md) |
| Override scanner — `.claudeos-scan.json` | [docs/vi/advanced-config.md](docs/vi/advanced-config.md) |
| An toàn: cái gì được giữ lại khi re-init | [docs/vi/safety.md](docs/vi/safety.md) |
| So sánh với các công cụ tương tự (scope, không phải chất lượng) | [docs/vi/comparison.md](docs/vi/comparison.md) |
| Lỗi và khôi phục | [docs/vi/troubleshooting.md](docs/vi/troubleshooting.md) |

---

## Đóng góp

Hoan nghênh đóng góp — thêm hỗ trợ stack, cải thiện prompt, fix bug. Xem [CONTRIBUTING.md](CONTRIBUTING.md).

Code of Conduct và security policy, xem [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) và [SECURITY.md](SECURITY.md).

## Giấy phép

[ISC License](LICENSE). Miễn phí cho mọi mục đích sử dụng, bao gồm thương mại. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Được duy trì bởi team [claudeos-core](https://github.com/claudeos-core). Issue và PR tại <https://github.com/claudeos-core/claudeos-core>.</sub>
