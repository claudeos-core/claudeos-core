# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Một CLI đọc trực tiếp source code dự án rồi tự sinh ra `CLAUDE.md` cùng `.claude/rules/`. Bộ công cụ gồm Node.js scanner, pipeline 4-pass cho Claude và 5 validator. Hỗ trợ 12 stack, 10 ngôn ngữ, và không bao giờ tạo ra đường dẫn không có trong code.**

```bash
npx claudeos-core init
```

Có thể dùng ngay với [**12 stack**](#supported-stacks), kể cả monorepo. Một câu lệnh là đủ, không cần cấu hình, chạy giữa chừng dừng lại vẫn tiếp tục được, và chạy nhiều lần cũng an toàn.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## Đây là gì?

Mỗi khi mở phiên mới, Claude Code lại rơi về mặc định của framework. Team đang dùng **MyBatis** thì Claude vẫn cứ viết JPA. Wrapper dự án là `ApiResponse.ok()`, Claude lại quen tay gõ `ResponseEntity.success()`. Package theo layer-first, Claude lại sinh ra kiểu domain-first. Viết tay `.claude/rules/` cho từng repo thì chữa được tạm thời, nhưng code đổi vài lần là rules cũng lệch theo.

**ClaudeOS-Core sinh lại toàn bộ tài liệu này một cách nhất quán, đọc thẳng từ source code thật.** Đầu tiên, một Node.js scanner duyệt dự án để chốt stack, ORM, cấu trúc package và đường dẫn file. Tiếp đó pipeline 4-pass của Claude viết toàn bộ tài liệu: `CLAUDE.md`, `.claude/rules/` auto-load, standards và skills. Mọi pass đều bị khoá trong một allowlist đường dẫn tường minh, LLM không thoát ra được. Cuối cùng, năm validator soi lại kết quả trước khi xuất.

Nhờ vậy, cùng input thì luôn ra cùng output, byte-identical ở cả 10 ngôn ngữ, và không bịa ra đường dẫn không có trong code. (Xem chi tiết ở phần [Điểm khác biệt](#điểm-khác-biệt) bên dưới.)

Với các dự án chạy lâu dài, công cụ còn seed thêm một [Memory Layer](#memory-layer-tùy-chọn-cho-dự-án-dài-hạn) riêng.

---

## Xem trên dự án thực tế

Chạy thử trên [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app). Dự án dùng Java 11, Spring Boot 2.6, MyBatis, SQLite với 187 file source. Kết quả: **75 file được sinh ra**, tổng thời gian **53 phút**, mọi validator đều ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Output terminal (bản text, để tiện tìm kiếm và copy)</strong></summary>

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
<summary><strong>Phần thực sự đi vào <code>CLAUDE.md</code> của bạn (trích đoạn thật — Section 1 + 2)</strong></summary>

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

Mọi giá trị trong bảng trên đều do scanner đọc thẳng từ `build.gradle`, `application.properties` và cây source trước khi Claude viết file. Toạ độ dependency, tên file `dev.db`, tên migration `V1__create_tables.sql`, ghi chú "no JPA" — tất cả đều là sự thật trích xuất, không chỗ nào là phỏng đoán.

</details>

<details>
<summary><strong>Một rule auto-load thật (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

Glob `paths: ["**/*"]` nghĩa là Claude Code sẽ tự động nạp rule này mỗi khi sửa bất kỳ file nào trong dự án. Tên class, đường dẫn package, exception handler trong rule đều lấy nguyên văn từ source đã quét, kể cả `CustomizeExceptionHandler` và `JacksonCustomizations` thật của dự án.

</details>

<details>
<summary><strong>Một seed <code>decision-log.md</code> được sinh tự động (trích đoạn thật)</strong></summary>

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

Pass 4 ghi sẵn các quyết định kiến trúc trích từ `pass2-merged.json` vào `decision-log.md`. Nhờ vậy, các phiên về sau không chỉ biết codebase _trông như thế nào_, mà còn nhớ được _vì sao nó lại như vậy_. Mọi option ("JPA/Hibernate", "MyBatis-Plus") cùng các consequence đều neo vào block dependency có thật trong `build.gradle`.

</details>

---

## Đã kiểm thử trên

ClaudeOS-Core đi kèm các benchmark tham chiếu trên dự án OSS thật. Nếu đã thử trên một public repo nào đó, hãy [mở issue](https://github.com/claudeos-core/claudeos-core/issues) để chúng tôi bổ sung vào bảng này.

| Dự án | Stack | Scanned → Generated | Trạng thái |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ cả 5 validator đều pass |

---

## Bắt đầu nhanh

**Yêu cầu trước:** Node.js 18 trở lên, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) đã cài và đã đăng nhập.

```bash
# 1. Vào thư mục gốc của dự án
cd my-spring-boot-project

# 2. Chạy init (lệnh này quét code rồi nhờ Claude viết rules)
npx claudeos-core init

# 3. Xong. Mở Claude Code và bắt tay vào code — rules đã sẵn sàng.
```

Sau khi `init` hoàn tất, bạn sẽ thấy cấu trúc như sau.

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code tự động load
│       ├── 00.core/              (rules chung — naming, kiến trúc)
│       ├── 10.backend/           (rules backend stack, nếu có)
│       ├── 20.frontend/          (rules frontend stack, nếu có)
│       ├── 30.security-db/       (quy ước bảo mật và DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (nhắc đồng bộ tài liệu — chỉ rules)
│       ├── 60.memory/            (memory rules — Pass 4, chỉ rules)
│       ├── 70.domains/{type}/    (rules theo domain, type = backend|frontend)
│       └── 80.verification/      (chiến lược test và nhắc verify build)
├── claudeos-core/
│   ├── standard/                 ← Tài liệu tham chiếu (cấu trúc category song song)
│   │   ├── 00.core/              (tổng quan dự án, kiến trúc, naming)
│   │   ├── 10.backend/           (tham chiếu backend — nếu có backend stack)
│   │   ├── 20.frontend/          (tham chiếu frontend — nếu có frontend stack)
│   │   ├── 30.security-db/       (tham chiếu bảo mật và DB)
│   │   ├── 40.infra/             (tham chiếu env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (tham chiếu theo domain)
│   │   ├── 80.verification/      (tham chiếu build / startup / test — chỉ standard)
│   │   └── 90.optional/          (mở rộng theo stack — chỉ standard)
│   ├── skills/                   (pattern tái sử dụng để Claude áp dụng)
│   ├── guide/                    (hướng dẫn how-to cho các tác vụ phổ biến)
│   ├── database/                 (tổng quan schema, hướng dẫn migration)
│   ├── mcp-guide/                (ghi chú tích hợp MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (index Claude đọc đầu tiên)
```

Các category cùng số prefix ở `rules/` và `standard/` cùng chỉ về một vùng khái niệm. Chẳng hạn `10.backend` rules đối ứng `10.backend` standards. Hai category chỉ tồn tại bên rules là `50.sync` (nhắc đồng bộ tài liệu) và `60.memory` (memory của Pass 4). Phía standard có một category riêng là `90.optional`, dành cho phần mở rộng theo stack và không enforce. Các prefix còn lại (`00`, `10`, `20`, `30`, `40`, `70`, `80`) thì xuất hiện ở cả hai bên. Đến đây, Claude Code đã hiểu dự án của bạn.

---

## Dành cho ai?

| Bạn là... | Vấn đề được giải quyết |
|---|---|
| **Solo dev** đang khởi động dự án mới với Claude Code | Khỏi phải dạy lại quy ước cho Claude mỗi phiên. `CLAUDE.md` cùng 8 category trong `.claude/rules/` được sinh ra chỉ trong một lần chạy. |
| **Team lead** quản lý standards dùng chung giữa nhiều repo | `.claude/rules/` rất hay drift mỗi khi đổi tên package, đổi ORM hay đổi response wrapper. ClaudeOS-Core đồng bộ lại một cách nhất quán: cùng input thì ra output byte-identical, không có diff thừa. |
| **Đã quen Claude Code** nhưng chán cảnh phải sửa lại code mỗi lần | Sai response wrapper, sai cấu trúc package, viết JPA trong khi dự án dùng MyBatis, rải `try/catch` trong khi đã có middleware tập trung. Scanner trích quy ước thật của dự án, mỗi pass của Claude đều chạy trong allowlist tường minh. |
| **Onboard vào repo mới** (dự án có sẵn, vào team mới) | Chạy `init` xong là có ngay tấm bản đồ kiến trúc sống. Bảng stack trong CLAUDE.md, rules theo từng layer kèm ví dụ ✅/❌, decision log seed sẵn lý do đằng sau những lựa chọn lớn (JPA hay MyBatis, REST hay GraphQL...). Đọc 5 file vẫn nhanh hơn lội qua 5.000 file source. |
| **Làm việc bằng tiếng Hàn, Nhật, Trung và 7 ngôn ngữ khác** | Phần lớn rule generator cho Claude Code chỉ có tiếng Anh. ClaudeOS-Core viết toàn bộ ở **10 ngôn ngữ** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) và áp **kiểm tra cấu trúc byte-identical**. Verdict của `claude-md-validator` không đổi dù chọn ngôn ngữ output nào. |
| **Đang dùng monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domain backend và frontend được phân tích trong cùng một lần chạy nhưng bằng prompt riêng. `apps/*/` và `packages/*/` được duyệt tự động, rules theo từng stack đổ vào `70.domains/{type}/`. |
| **Đóng góp OSS hoặc đang thử nghiệm** | Output thân thiện với gitignore. `claudeos-core/` là thư mục làm việc local, chỉ `CLAUDE.md` và `.claude/` cần ship. Đứt giữa chừng vẫn tiếp tục được, chạy lại nhiều lần vẫn an toàn (chỉnh sửa tay không bị mất nếu không kèm `--force`). |

**Có thể không phù hợp nếu** bạn muốn một bundle preset agents/skills/rules xài được ngay từ ngày đầu mà không cần bước scan (xem [docs/vi/comparison.md](docs/vi/comparison.md) để biết công cụ nào hợp với hoàn cảnh nào), dự án chưa rơi vào một trong các [stack được hỗ trợ](#supported-stacks), hoặc chỉ cần đúng một file `CLAUDE.md`. Riêng trường hợp cuối thì `claude /init` có sẵn là đủ, khỏi cài thêm tool nào khác.

---

## Cách hoạt động

ClaudeOS-Core đảo ngược workflow Claude Code thông thường.

```
Thông thường: Bạn mô tả dự án → Claude đoán stack của bạn → Claude viết docs
Cách này:     Code đọc stack của bạn → Code đưa fact đã xác nhận cho Claude → Claude viết docs từ fact
```

Pipeline gồm **ba giai đoạn**, code có mặt ở cả hai phía của lời gọi LLM.

**1. Step A — Scanner (nhất quán, không gọi LLM).** Một Node.js scanner đi qua thư mục gốc, đọc `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml`, parse các file `.env*` (đồng thời redact các biến nhạy cảm như `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), phân loại pattern kiến trúc (5 pattern A/B/C/D/E của Java; Kotlin CQRS hoặc multi-module; Next.js App Router so với Pages Router; FSD; components-pattern), tìm ra các domain, rồi dựng allowlist tường minh chứa mọi đường dẫn source thật. Output là `project-analysis.json`, đóng vai trò single source of truth cho mọi bước về sau.

**2. Step B — Pipeline Claude 4-pass (ràng buộc bởi fact của Step A).**
- **Pass 1** đọc các file đại diện theo từng domain group rồi trích ra khoảng 50–100 quy ước cho mỗi domain: response wrapper, thư viện logging, cách xử lý lỗi, quy ước naming, pattern test. Mỗi domain group chỉ chạy một lần (`max 4 domains, 40 files per group`) nên context không bao giờ tràn.
- **Pass 2** gộp toàn bộ phân tích theo domain thành bức tranh chung của dự án. Có mâu thuẫn thì công cụ chọn quy ước phổ biến nhất.
- **Pass 3** viết `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, skills và guides. Bước này được chia thành nhiều stage (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) để prompt mỗi stage vẫn vừa context window dù `pass2-merged.json` có lớn cỡ nào. Với dự án từ 16 domain trở lên, 3b/3c sẽ chia tiếp thành các batch ≤15 domain.
- **Pass 4** seed L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) và bổ sung các rule scaffold phổ quát. Pass 4 **tuyệt đối không được sửa `CLAUDE.md`**. Section 8 do Pass 3 viết mới là nguồn duy nhất.

**3. Step C — Verification (nhất quán, không gọi LLM).** Năm validator soi lại kết quả.
- `claude-md-validator` chạy 25 kiểm tra cấu trúc trên `CLAUDE.md` (8 section, đếm H3/H4, tính duy nhất của file memory, bất biến T1 canonical heading). Validator này language-invariant, nên chọn `--lang` nào cũng ra cùng verdict.
- `content-validator` chạy 10 kiểm tra nội dung, gồm verify path-claim (`STALE_PATH` bắt được tham chiếu `src/...` bịa đặt) và phát hiện MANIFEST drift.
- `pass-json-validator` kiểm tra JSON well-formedness của Pass 1/2/3/4 cùng số section theo từng stack.
- `plan-validator` so plan với disk (legacy, gần như no-op từ v2.1.0).
- `sync-checker` đối chiếu disk với `sync-map.json` qua 7 thư mục được track.

Có ba mức severity (`fail` / `warn` / `advisory`), nhờ vậy các warning kiểu hallucination LLM mà dev tự sửa được sẽ không bao giờ làm kẹt CI.

Cốt lõi gắn kết tất cả lại là một bất biến: **Claude chỉ được trích dẫn các đường dẫn có thật trong code**, vì Step A đã đưa cho nó một allowlist hữu hạn. Tuy nhiên, nếu LLM vẫn cố bịa (hiếm gặp, chỉ xuất hiện ở vài seed cụ thể) thì Step C cũng sẽ bắt lại trước khi docs được ship.

Để xem chi tiết từng pass, cơ chế resume dựa trên marker, workaround staged-rules dùng để vượt qua block đường dẫn nhạy cảm `.claude/` của Claude Code, cùng internals của stack detection, mời đọc [docs/vi/architecture.md](docs/vi/architecture.md).

---

## Supported Stacks

12 stack, tự động phát hiện từ chính các file dự án.

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Dự án multi-stack (chẳng hạn Spring Boot backend cộng Next.js frontend) chạy được luôn mà không cần điều chỉnh.

Quy tắc phát hiện và những gì mỗi scanner trích xuất được mô tả trong [docs/vi/stacks.md](docs/vi/stacks.md).

---

## Quy trình hàng ngày

Ba lệnh sau đủ dùng cho khoảng 95% trường hợp.

```bash
# Lần đầu chạy trên một dự án
npx claudeos-core init

# Sau khi bạn chỉnh tay standards hoặc rules
npx claudeos-core lint

# Health check (chạy trước khi commit hoặc trong CI)
npx claudeos-core health
```

Đầy đủ option của từng lệnh có trong [docs/vi/commands.md](docs/vi/commands.md). Các lệnh thuộc memory layer (`memory compact`, `memory propose-rules`) được nói rõ ở phần [Memory Layer](#memory-layer-tùy-chọn-cho-dự-án-dài-hạn) bên dưới.

---

## Điểm khác biệt

Phần lớn công cụ tài liệu cho Claude Code sinh ra từ một bản mô tả: bạn nói cho công cụ, công cụ nói lại cho Claude. ClaudeOS-Core thì sinh thẳng từ source code thật. Công cụ tự đọc, tự đẩy các fact đã xác nhận sang Claude, còn Claude chỉ viết đúng những gì đã được xác nhận.

Cách làm này dẫn tới ba điểm khác biệt cụ thể.

1. **Stack detection nhất quán.** Cùng dự án, cùng code thì luôn ra cùng output. Hết cảnh "lần này Claude lại đoán khác".
2. **Không tạo path bịa.** Prompt của Pass 3 liệt kê tường minh mọi source path được phép, vì thế Claude không thể trích ra path không tồn tại.
3. **Hiểu được multi-stack.** Trong cùng một lần chạy, domain backend và frontend dùng prompt phân tích riêng.

Muốn so sánh scope cạnh nhau với các công cụ khác, mời đọc [docs/vi/comparison.md](docs/vi/comparison.md). Nội dung tập trung vào **mỗi công cụ làm gì**, chứ không phải **công cụ nào tốt hơn**. Thực ra phần lớn là bổ sung cho nhau.

---

## Xác minh (sau khi tạo)

Sau khi Claude viết xong docs, đến lượt code kiểm tra lại. Năm validator độc lập như sau.

| Validator | Kiểm tra cái gì | Chạy bởi |
|---|---|---|
| `claude-md-validator` | Bất biến cấu trúc của CLAUDE.md (8 section, language-invariant) | `claudeos-core lint` |
| `content-validator` | Path claim có thật trong code; manifest nhất quán | `health` (advisory) |
| `pass-json-validator` | Output Pass 1 / 2 / 3 / 4 là JSON hợp lệ | `health` (warn) |
| `plan-validator` | Plan đã lưu khớp với disk | `health` (fail-on-error) |
| `sync-checker` | File trên disk khớp với đăng ký trong `sync-map.json` (phát hiện orphaned/unregistered) | `health` (fail-on-error) |

`health-checker` điều phối bốn runtime validator theo ba mức severity (fail / warn / advisory) và thoát với mã phù hợp cho CI. Riêng `claude-md-validator` chạy độc lập qua lệnh `lint`, vì cấu trúc bị drift là tín hiệu cần re-init, không phải warning mềm. Có thể chạy bất kỳ lúc nào.

```bash
npx claudeos-core health
```

Chi tiết kiểm tra của từng validator có trong [docs/vi/verification.md](docs/vi/verification.md).

---

## Memory Layer (tùy chọn, cho dự án dài hạn)

Ngoài pipeline scaffolding kể trên, ClaudeOS-Core còn seed thêm thư mục `claudeos-core/memory/` cho những dự án cần giữ context vượt ra ngoài một phiên đơn lẻ. Phần này là tùy chọn. Nếu chỉ cần `CLAUDE.md` và rules thì cứ bỏ qua, không sao cả.

Bốn file, tất cả đều do Pass 4 viết.

- `decision-log.md` — sổ append-only ghi "vì sao chọn X thay vì Y", seed từ `pass2-merged.json`
- `failure-patterns.md` — danh sách lỗi lặp lại kèm điểm frequency và importance
- `compaction.md` — cách memory được tự động compact theo thời gian
- `auto-rule-update.md` — các pattern nên được nâng thành rule mới

Hai lệnh để duy trì layer này lâu dài.

```bash
# Compact log failure-patterns (chạy định kỳ)
npx claudeos-core memory compact

# Đề xuất rule mới từ các failure pattern xuất hiện thường xuyên
npx claudeos-core memory propose-rules
```

Mô hình memory và lifecycle được mô tả trong [docs/vi/memory-layer.md](docs/vi/memory-layer.md).

---

## FAQ

**Q: Có cần Claude API key không?**
A: Không. ClaudeOS-Core dùng chính bản Claude Code đã cài trên máy. Prompt được pipe sang `claude -p` ngay tại máy, khỏi cần thêm tài khoản nào khác.

**Q: Lệnh này có ghi đè `CLAUDE.md` hay `.claude/rules/` đang có không?**
A: Lần đầu chạy trên dự án trống thì nó tạo mới. Chạy lại không kèm `--force` thì các chỉnh sửa tay được giữ nguyên, vì marker từ lần chạy trước được phát hiện và pass tương ứng sẽ bị skip. Còn nếu kèm `--force` thì mọi thứ sẽ bị xóa rồi sinh lại, kéo theo phần chỉnh sửa cũng mất. Đó đúng là ý nghĩa của `--force`. Chi tiết ở [docs/vi/safety.md](docs/vi/safety.md).

**Q: Stack của tôi chưa được hỗ trợ, có thêm vào được không?**
A: Được. Một stack mới chỉ cần khoảng 3 prompt template và một domain scanner. Hướng dẫn 8 bước nằm trong [CONTRIBUTING.md](CONTRIBUTING.md).

**Q: Làm sao sinh docs bằng tiếng Hàn (hoặc ngôn ngữ khác)?**
A: Chạy `npx claudeos-core init --lang ko` là xong. Có 10 ngôn ngữ được hỗ trợ: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: Có dùng được với monorepo không?**
A: Có. Stack-detector nhận diện Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) và npm/yarn workspaces (`package.json#workspaces`). Mỗi app có phần phân tích riêng. Một số layout monorepo khác như NX tuy chưa có nhánh detect riêng, nhưng pattern chung `apps/*/` và `packages/*/` thì scanner theo từng stack vẫn nhận ra được.

**Q: Nếu Claude Code sinh ra rule mà tôi không đồng ý thì sao?**
A: Cứ sửa trực tiếp. Sau đó chạy `npx claudeos-core lint` để chắc rằng cấu trúc CLAUDE.md vẫn hợp lệ. Phần chỉnh sửa tay sẽ được giữ qua các lần `init` sau (miễn không kèm `--force`), vì cơ chế resume sẽ skip những pass đã có marker.

**Q: Báo bug ở đâu?**
A: Tại [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Các vấn đề bảo mật xin xem [SECURITY.md](SECURITY.md).

---

## Nếu điều này tiết kiệm thời gian cho bạn

Một ⭐ trên GitHub giúp dự án dễ được nhìn thấy hơn và giúp người khác tìm tới. Issue, PR và đóng góp stack template đều rất được hoan nghênh. Chi tiết trong [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Tài liệu

| Chủ đề | Đọc ở đâu |
|---|---|
| Pipeline 4-pass hoạt động ra sao (sâu hơn diagram) | [docs/vi/architecture.md](docs/vi/architecture.md) |
| Diagram trực quan của kiến trúc (Mermaid) | [docs/vi/diagrams.md](docs/vi/diagrams.md) |
| Stack detection — mỗi scanner nhìn vào đâu | [docs/vi/stacks.md](docs/vi/stacks.md) |
| Memory layer — decision log và failure pattern | [docs/vi/memory-layer.md](docs/vi/memory-layer.md) |
| Chi tiết cả 5 validator | [docs/vi/verification.md](docs/vi/verification.md) |
| Tất cả lệnh CLI và option | [docs/vi/commands.md](docs/vi/commands.md) |
| Cài đặt thủ công (không qua `npx`) | [docs/vi/manual-installation.md](docs/vi/manual-installation.md) |
| Override scanner qua `.claudeos-scan.json` | [docs/vi/advanced-config.md](docs/vi/advanced-config.md) |
| An toàn: cái gì được giữ lại khi re-init | [docs/vi/safety.md](docs/vi/safety.md) |
| So sánh với các công cụ tương tự (về scope, không phải chất lượng) | [docs/vi/comparison.md](docs/vi/comparison.md) |
| Lỗi thường gặp và cách khôi phục | [docs/vi/troubleshooting.md](docs/vi/troubleshooting.md) |

---

## Đóng góp

Mọi đóng góp đều được hoan nghênh. Thêm hỗ trợ stack mới, cải thiện prompt, fix bug — đều rất tốt. Chi tiết trong [CONTRIBUTING.md](CONTRIBUTING.md).

Code of Conduct và policy bảo mật có ở [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) và [SECURITY.md](SECURITY.md).

## Giấy phép

[ISC License](LICENSE). Miễn phí cho mọi mục đích sử dụng, kể cả thương mại. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Dự án được duy trì bởi team [claudeos-core](https://github.com/claudeos-core). Issue và PR gửi về <https://github.com/claudeos-core/claudeos-core>.</sub>
