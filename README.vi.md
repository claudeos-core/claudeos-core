# ClaudeOS-Core

**Công cụ duy nhất đọc mã nguồn trước, xác nhận stack và pattern bằng phân tích deterministic, sau đó tạo Claude Code rules phù hợp chính xác với dự án của bạn.**

```bash
npx claudeos-core init
```

ClaudeOS-Core đọc codebase của bạn, trích xuất mọi pattern tìm thấy và tạo ra bộ Standards, Rules, Skills và Guides hoàn chỉnh được tùy chỉnh cho _dự án của bạn_. Sau đó, khi bạn nói với Claude Code "Tạo CRUD cho đơn hàng", nó sẽ tạo ra code khớp chính xác với các pattern hiện có của bạn.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Tại sao chọn ClaudeOS-Core?

Mọi công cụ Claude Code khác hoạt động như sau:

> **Con người mô tả dự án → LLM tạo tài liệu**

ClaudeOS-Core hoạt động như sau:

> **Code phân tích source → Code xây dựng prompt tùy chỉnh → LLM tạo tài liệu → Code xác minh đầu ra**

Đây không phải là khác biệt nhỏ. Lý do quan trọng:

### Vấn đề cốt lõi: LLM đoán. Code thì không.

Khi bạn yêu cầu Claude "phân tích dự án này", nó **đoán** stack, ORM, cấu trúc domain của bạn.
Nó có thể thấy `spring-boot` trong `build.gradle` nhưng bỏ sót việc bạn dùng MyBatis (không phải JPA).
Nó có thể phát hiện thư mục `user/` nhưng không nhận ra dự án của bạn dùng layer-first packaging (Pattern A), không phải domain-first (Pattern B).

**ClaudeOS-Core không đoán.** Trước khi Claude nhìn thấy dự án của bạn, Node.js code đã:

- Parse `build.gradle` / `package.json` / `pyproject.toml` và **xác nhận** stack, ORM, DB và package manager
- Quét cấu trúc thư mục và **xác nhận** danh sách domain kèm số lượng file
- Phân loại cấu trúc dự án vào một trong 5 pattern Java, Kotlin CQRS/BFF, hoặc Next.js App Router/FSD
- Chia domain thành các nhóm có kích thước tối ưu phù hợp với context window của Claude
- Lắp ráp prompt riêng cho stack với mọi sự thật đã xác nhận được chèn vào

Khi Claude nhận prompt, không còn gì phải đoán. Stack đã xác nhận. Domain đã xác nhận. Pattern cấu trúc đã xác nhận. Nhiệm vụ duy nhất của Claude là tạo tài liệu khớp với các **sự thật đã xác nhận** này.

### Kết quả

Các công cụ khác tạo tài liệu "tốt một cách chung chung".
ClaudeOS-Core tạo tài liệu biết rằng dự án dùng `ApiResponse.ok()` (không phải `ResponseEntity.success()`), MyBatis XML mapper của bạn nằm ở `src/main/resources/mybatis/mappers/`, và package structure là `com.company.module.{domain}.controller` — vì nó đã đọc code thực tế của bạn.

### Before & After

**Không có ClaudeOS-Core** — bạn yêu cầu Claude Code tạo Order CRUD:
```
❌ Dùng repository kiểu JPA (dự án của bạn dùng MyBatis)
❌ Tạo ResponseEntity.success() (wrapper của bạn là ApiResponse.ok())
❌ Đặt file vào order/controller/ (dự án của bạn dùng controller/order/)
❌ Tạo comment tiếng Anh (team của bạn viết comment tiếng Việt)
→ Bạn mất 20 phút sửa từng file đã tạo
```

**Có ClaudeOS-Core** — `.claude/rules/` đã chứa các pattern đã xác nhận của bạn:
```
✅ Tạo MyBatis mapper + XML (phát hiện từ build.gradle)
✅ Dùng ApiResponse.ok() (trích xuất từ source thực tế của bạn)
✅ Đặt file vào controller/order/ (Pattern A xác nhận bằng structure scan)
✅ Comment tiếng Việt (--lang vi đã áp dụng)
→ Code được tạo khớp ngay với convention của dự án
```

Sự khác biệt này được tích lũy. 10 task/ngày × 20 phút tiết kiệm = **hơn 3 giờ/ngày**.

---

## Đảm bảo chất lượng sau khi sinh (v2.3.0)

Sinh ra tài liệu chỉ là một nửa vấn đề. Nửa còn lại là **biết rằng output là đúng** — xuyên suốt 10 ngôn ngữ output, 11 template stack, và các dự án ở mọi kích thước. v2.3.0 thêm hai validator tất định chạy sau khi sinh và không phụ thuộc vào LLM tự kiểm tra.

### `claude-md-validator` — bất biến cấu trúc

Mỗi `CLAUDE.md` được sinh ra đều được kiểm tra đối chiếu với 25 bất biến cấu trúc sử dụng chỉ những tín hiệu không phụ thuộc ngôn ngữ: cú pháp markdown (`^## `, `^### `), tên file literal (`decision-log.md`, `failure-patterns.md` — không bao giờ được dịch), số section, số sub-section mỗi section, và số hàng bảng. Cùng một validator, từng byte một, sẽ đưa ra phán quyết giống nhau đối với `CLAUDE.md` được sinh ra bằng tiếng Anh, Hàn, Nhật, Việt, Hindi, Nga, Tây Ban Nha, Trung, Pháp, hoặc Đức.

Đảm bảo xuyên ngôn ngữ được xác minh bằng các test fixture trong cả 10 ngôn ngữ, bao gồm các fixture bad-case trong 6 trong số các ngôn ngữ đó tạo ra chữ ký lỗi giống hệt nhau. Khi một bất biến thất bại trên một dự án tiếng Việt, cách sửa cũng giống như khi nó thất bại trên một dự án tiếng Đức.

### `content-validator [10/10]` — xác minh tuyên bố path và tính nhất quán MANIFEST

Đọc mọi tham chiếu path được bọc bởi backtick (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) từ tất cả các file `.md` được sinh ra và xác minh chúng với file system thực. Bắt hai lớp thất bại của LLM mà không có công cụ nào phát hiện trước đây:

- **`STALE_PATH`** — khi Pass 3 hoặc Pass 4 bịa ra một đường dẫn nghe có vẻ hợp lý nhưng không tồn tại. Các trường hợp điển hình: suy diễn `featureRoutePath.ts` từ một TypeScript constant có tên `FEATURE_ROUTE_PATH` khi file thực tế là `routePath.ts`; giả định `src/main.tsx` theo quy ước Vite trong một dự án multi-entry; giả định `src/__mocks__/handlers.ts` theo tài liệu MSW ngay cả khi dự án không có test nào.
- **`MANIFEST_DRIFT`** — khi `claudeos-core/skills/00.shared/MANIFEST.md` đăng ký một skill mà `CLAUDE.md §6` không đề cập (hoặc ngược lại). Nhận diện layout orchestrator + sub-skills phổ biến, trong đó `CLAUDE.md §6` là điểm vào và `MANIFEST.md` là registry đầy đủ — các sub-skill được coi là được bao phủ thông qua orchestrator cha của chúng.

Validator này được kết hợp với phòng ngừa ở giai đoạn prompt trong `pass3-footer.md` và `pass4.md`: các khối anti-pattern ghi lại các lớp hallucination cụ thể (tiền tố thư mục cha, các quy ước thư viện Vite/MSW/Vitest/Jest/RTL), và positive guidance rõ ràng về việc giới hạn phạm vi các rule theo thư mục khi một tên file cụ thể không có trong `pass3a-facts.md`.

### Chạy validation trên bất kỳ dự án nào

```bash
npx claudeos-core health     # tất cả validator — một phán quyết go/no-go duy nhất
npx claudeos-core lint       # chỉ bất biến cấu trúc CLAUDE.md (bất kỳ ngôn ngữ nào)
```

---

## Stack Được Hỗ Trợ

| Stack | Phát Hiện | Độ Sâu Phân Tích |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 package patterns | 10 danh mục, 59 mục con |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 danh mục, 95 mục con |
| **Node.js / Express** | `package.json` | 9 danh mục, 57 mục con |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 danh mục, 68 mục con |
| **Next.js / React** | `package.json`, `next.config.*`, hỗ trợ FSD | 9 danh mục, 55 mục con |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 danh mục, 58 mục con |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 danh mục, 55 mục con |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 danh mục, 58 mục con |
| **Node.js / Fastify** | `package.json` | 10 danh mục, 62 mục con |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 danh mục, 55 mục con |
| **Angular** | `package.json`, `angular.json` | 12 danh mục, 78 mục con |

Tự động phát hiện: ngôn ngữ & phiên bản, framework & phiên bản (bao gồm Vite như SPA framework), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, v.v.), database (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), package manager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), kiến trúc (CQRS, BFF — phát hiện từ tên module), cấu trúc multi-module (từ settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **cấu hình runtime từ `.env.example`** (v2.2.0 — trích xuất port/host/API-target từ 16+ tên biến quy ước trên các framework Vite · Next.js · Nuxt · Angular · Node · Python).

**Bạn không cần chỉ định gì cả. Tất cả được phát hiện tự động.**

### Cấu hình runtime từ `.env` (v2.2.0)

v2.2.0 bổ sung `lib/env-parser.js` để `CLAUDE.md` được sinh ra phản ánh những gì project thực sự khai báo, thay vì giá trị mặc định của framework.

- **Thứ tự tìm kiếm**: `.env.example` (canonical, đã commit) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. Biến thể `.example` thắng vì đó là shape-of-truth trung lập của developer, không phải override local của một contributor cụ thể.
- **Các quy ước biến port được nhận diện**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / `PORT` tổng quát. Tên đặc thù framework thắng `PORT` tổng quát khi cả hai cùng hiện diện.
- **Host & API target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` v.v.
- **Độ ưu tiên**: Spring Boot `application.yml` `server.port` vẫn thắng (config framework-native), rồi đến port khai báo trong `.env`, cuối cùng mới fallback về default của framework (Vite 5173, Next.js 3000, Django 8000, v.v.).
- **Redact biến nhạy cảm**: giá trị của các biến khớp pattern `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` được thay bằng `***REDACTED***` trước khi tới bất kỳ generator downstream nào. Defense-in-depth chống secret bị commit nhầm vào `.env.example`. `DATABASE_URL` được whitelist tường minh để giữ back-compat cho việc nhận diện DB của stack-detector.

### Phát Hiện Domain Java (5 pattern với fallback)

| Ưu tiên | Pattern | Cấu trúc | Ví dụ |
|---|---|---|---|
| A | Layer trước | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domain trước | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Module prefix | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Phẳng | `controller/*.java` | `controller/UserController.java` → trích `user` từ tên class |

Các domain chỉ có service (không có controller) cũng được phát hiện qua thư mục `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Bỏ qua: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2`, v.v.

### Phát Hiện Domain Kotlin Multi-Module

Dành cho dự án Kotlin với cấu trúc Gradle multi-module (ví dụ: CQRS monorepo):

| Bước | Hành Động | Ví Dụ |
|---|---|---|
| 1 | Quét `settings.gradle.kts` tìm `include()` | Tìm 14 module |
| 2 | Phát hiện kiểu module từ tên | `reservation-command-server` → type: `command` |
| 3 | Trích xuất domain từ tên module | `reservation-command-server` → domain: `reservation` |
| 4 | Gom cùng domain qua các module | `reservation-command-server` + `common-query-server` → 1 domain |
| 5 | Phát hiện kiến trúc | Có module `command` + `query` → CQRS |

Các kiểu module được hỗ trợ: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Các thư viện dùng chung (`shared-lib`, `integration-lib`) được phát hiện như domain đặc biệt.

### Phát Hiện Domain Frontend

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **Phân tách RSC/Client**: phát hiện pattern `client.tsx`, theo dõi phân tách Server/Client component
- **Đường dẫn lồng nhau không chuẩn**: Phát hiện pages, components và các FSD layer dưới đường dẫn `src/*/` (ví dụ: `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Phát hiện chia tách Platform/tier (v2.0.0)**: Nhận diện layout `src/{platform}/{subapp}/` — `{platform}` có thể là keyword device/target (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) hoặc keyword access-tier (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Sinh một domain cho mỗi cặp `(platform, subapp)` với tên `{platform}-{subapp}` kèm số đếm routes/components/layouts/hooks riêng cho từng domain. Chạy đồng thời trên Angular, Next.js, React và Vue (glob đa đuôi `{tsx,jsx,ts,js,vue}`). Yêu cầu ≥2 file nguồn cho mỗi subapp để tránh domain nhiễu 1-file.
- **Monorepo platform split (v2.0.0)**: Platform scan cũng khớp với `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace có `src/`) và `{apps,packages}/{platform}/{subapp}/` (workspace không có wrapper `src/`).
- **Fallback E — routes-file (v2.0.0)**: Khi scanner chính + Fallback A–D đều trả về 0, glob `**/routes/*.{tsx,jsx,ts,js,vue}` và gom nhóm theo tên thư mục cha của `routes`. Bắt các dự án React Router file-routing (CRA/Vite + `react-router`) không khớp với `page.tsx` của Next.js hoặc layout FSD. Tên cha chung chung (`src`, `app`, `pages`) được lọc bỏ.
- **Config fallback**: Phát hiện Next.js/Vite/Nuxt từ file cấu hình khi không có trong `package.json` (hỗ trợ monorepo)
- **Deep directory fallback**: Đối với dự án React/CRA/Vite/Vue/RN, quét `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` ở bất kỳ độ sâu nào
- **Danh sách bỏ qua dùng chung (v2.0.0)**: Tất cả scanner chia sẻ `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) và `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`) để build output và test fixture không làm phồng số file của từng domain.

### Scanner Overrides (v2.0.0)

Thả tùy chọn `.claudeos-scan.json` tại root của dự án để mở rộng giá trị mặc định của scanner mà không cần chỉnh sửa toolkit. Tất cả các trường đều **cộng dồn** — các mục của người dùng mở rộng giá trị mặc định, không thay thế:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Trường | Mặc định | Mục đích |
|---|---|---|
| `platformKeywords` | danh sách built-in ở trên | Các keyword `{platform}` bổ sung cho platform scan (ví dụ: `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | chỉ các thư mục cấu trúc | Các tên subapp bổ sung để loại khỏi việc sinh domain của platform scan |
| `minSubappFiles` | `2` | Ghi đè số file tối thiểu cần có trước khi một subapp trở thành domain |

Thiếu file hoặc JSON bị lỗi → âm thầm fallback về mặc định (không crash). Sử dụng điển hình: opt-in một viết tắt ngắn (`adm`, `bo`) mà danh sách built-in loại vì quá mơ hồ, hoặc nâng `minSubappFiles` cho monorepo nhiễu.

---

## Bắt Đầu Nhanh

### Yêu cầu trước

- **Node.js** v18+
- **Claude Code CLI** (đã cài đặt & xác thực)

### Cài đặt

```bash
cd /your/project/root

# Cách A: npx (khuyến nghị — không cần cài đặt)
npx claudeos-core init

# Cách B: cài đặt global
npm install -g claudeos-core
claudeos-core init

# Cách C: project devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# Cách D: git clone (để phát triển/đóng góp)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Đa nền tảng (PowerShell, CMD, Bash, Zsh — mọi terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (chỉ Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Ngôn Ngữ Đầu Ra (10 ngôn ngữ)

Khi chạy `init` không có `--lang`, selector tương tác sẽ hiện ra — dùng phím mũi tên hoặc phím số để chọn:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Các file được tạo (CLAUDE.md, Standards, Rules,
  Skills, Guides) sẽ được viết bằng Tiếng Việt.

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
  ❯  6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

Mô tả sẽ đổi sang ngôn ngữ được chọn khi bạn điều hướng. Để bỏ qua selector, truyền `--lang` trực tiếp:

```bash
npx claudeos-core init --lang ko    # Korean
npx claudeos-core init --lang ja    # Japanese
npx claudeos-core init --lang en    # English (mặc định)
```

> **Lưu ý:** Cài đặt này chỉ áp dụng cho ngôn ngữ của các file tài liệu được tạo. Phân tích code (Pass 1–2) luôn chạy bằng tiếng Anh; output được tạo (Pass 3) được viết bằng ngôn ngữ bạn chọn. Các ví dụ code bên trong file được tạo vẫn giữ nguyên cú pháp ngôn ngữ lập trình gốc.

Vậy thôi. Sau 10 phút (dự án nhỏ) đến 2 giờ (monorepo 60+ domain), tất cả tài liệu được tạo và sẵn sàng sử dụng. CLI hiển thị thanh tiến trình kèm phần trăm, thời gian đã trôi qua và ETA cho mỗi pass. Xem [Tự Động Mở Rộng Theo Kích Thước Dự Án](#tự-động-mở-rộng-theo-kích-thước-dự-án) để biết thời gian chi tiết theo kích thước dự án.

### Cài Đặt Thủ Công Từng Bước

Nếu bạn muốn kiểm soát hoàn toàn từng giai đoạn — hoặc nếu pipeline tự động bị lỗi ở bước nào đó — bạn có thể chạy từng giai đoạn thủ công. Cách này cũng hữu ích để hiểu cách ClaudeOS-Core hoạt động bên trong.

#### Step 1: Clone và cài đặt dependencies

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Tạo cấu trúc thư mục

```bash
# Rules (v2.0.0: thêm 60.memory)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: thêm memory; v2.1.0: bỏ plan)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **Lưu ý v2.1.0:** Thư mục `claudeos-core/plan/` không còn được tạo nữa. Việc tạo master plan đã bị loại bỏ vì master plan là backup nội bộ mà Claude Code không đọc lúc runtime, và việc tổng hợp chúng đã gây ra lỗi `Prompt is too long`. Dùng `git` để backup/restore thay thế.

#### Step 3: Chạy plan-installer (phân tích dự án)

Lệnh này quét dự án, phát hiện stack, tìm domain, chia chúng thành các nhóm và tạo prompt.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Output (trong `claudeos-core/generated/`):**
- `project-analysis.json` — stack, domain, thông tin frontend đã phát hiện
- `domain-groups.json` — các nhóm domain cho Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompt phân tích
- `pass2-prompt.md` — prompt merge
- `pass3-prompt.md` — template prompt Pass 3 với block "Read Once, Extract Facts" Phase 1 được thêm vào đầu (Rules A–E). Pipeline tự động chia Pass 3 thành nhiều stage lúc runtime; template này dùng cho từng stage.
- `pass3-context.json` — slim project summary (< 5 KB, xây sau Pass 2) mà prompt Pass 3 ưu tiên hơn `pass2-merged.json` đầy đủ (v2.1.0)
- `pass4-prompt.md` — prompt L4 memory scaffolding (v2.0.0; dùng cùng `staging-override.md` cho ghi rule `60.memory/`)

Bạn có thể kiểm tra các file này để xác minh độ chính xác phát hiện trước khi tiếp tục.

#### Step 4: Pass 1 — Phân tích code sâu (mỗi nhóm domain)

Chạy Pass 1 cho mỗi nhóm domain. Kiểm tra `domain-groups.json` để biết số lượng nhóm.

```bash
# Kiểm tra có bao nhiêu nhóm
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Chạy Pass 1 cho mỗi nhóm (thay domain và số nhóm)
# Lưu ý: v1.6.1+ dùng Node.js String.replace() thay vì perl — không còn
# yêu cầu perl, và ngữ nghĩa replacement-function ngăn chặn regex injection
# từ các ký tự $/&/$1 có thể xuất hiện trong tên domain.
#
# Cho nhóm 1:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Cho nhóm 2 (nếu có):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Với nhóm frontend, đổi pass1-backend-prompt.md → pass1-frontend-prompt.md
```

**Xác minh:** `ls claudeos-core/generated/pass1-*.json` phải hiển thị một JSON cho mỗi nhóm.

#### Step 5: Pass 2 — Merge kết quả phân tích

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `claudeos-core/generated/pass2-merged.json` phải tồn tại với 9+ top-level key.

#### Step 6: Pass 3 — Tạo toàn bộ tài liệu (chia thành nhiều stage)

**Lưu ý v2.1.0:** Pass 3 **luôn chạy ở chế độ split** bởi pipeline tự động. Mỗi stage là một lời gọi `claude -p` riêng biệt với context window mới, nên tràn output do tích lũy không thể xảy ra về mặt cấu trúc bất kể kích thước dự án. Template `pass3-prompt.md` được lắp ráp theo từng stage với một directive `STAGE:` chỉ cho Claude biết tập con file nào cần phát ra. Với chế độ thủ công, đường đơn giản nhất vẫn là đưa toàn bộ template và để Claude tạo mọi thứ trong một lời gọi — nhưng điều này chỉ đáng tin cậy trên dự án nhỏ (≤5 domain). Cho dự án lớn hơn, hãy dùng `npx claudeos-core init` để split runner xử lý điều phối stage.

**Chế độ lời gọi đơn (chỉ cho dự án nhỏ, ≤5 domain):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Chế độ từng stage (khuyến nghị cho mọi kích thước dự án):**

Pipeline tự động chạy các stage sau. Danh sách stage:

| Stage | Ghi | Ghi chú |
|---|---|---|
| `3a` | `pass3a-facts.md` (fact sheet đã chắt lọc 5–10 KB) | Đọc `pass2-merged.json` một lần; stage sau tham chiếu file này |
| `3b-core` | `CLAUDE.md`, `standard/` chung, `.claude/rules/` chung | File xuyên dự án; không output đặc thù domain |
| `3b-1..N` | `standard/60.domains/*.md` đặc thù domain + rule domain | Batch ≤15 domain mỗi stage (tự động chia ở ≥16 domain) |
| `3c-core` | `guide/` (9 file), `skills/00.shared/MANIFEST.md`, orchestrator `skills/*/` | Skill chung và tất cả guide hướng người dùng |
| `3c-1..N` | Sub-skill domain dưới `skills/20.frontend-page/scaffold-page-feature/` | Batch ≤15 domain mỗi stage |
| `3d-aux` | `database/`, `mcp-guide/` | Kích thước cố định, không phụ thuộc số domain |

Cho dự án 1–15 domain, điều này mở rộng thành 4 stage (`3a`, `3b-core`, `3c-core`, `3d-aux` — không chia batch). Cho 16–30 domain, mở rộng thành 8 stage (`3b` và `3c` mỗi cái chia thành 2 batch). Xem [Tự Động Mở Rộng Theo Kích Thước Dự Án](#tự-động-mở-rộng-theo-kích-thước-dự-án) để có bảng đầy đủ.

**Xác minh:** `CLAUDE.md` phải tồn tại ở thư mục gốc dự án, và marker `claudeos-core/generated/pass3-complete.json` phải được ghi. Ở chế độ split, marker chứa `mode: "split"` và một mảng `groupsCompleted` liệt kê mọi stage đã hoàn thành — logic partial-marker dùng thông tin này để resume từ stage đúng sau khi crash thay vì bắt đầu lại từ `3a` (sẽ nhân đôi chi phí token).

> **Lưu ý staging:** Pass 3 ghi các file rule vào `claudeos-core/generated/.staged-rules/` trước vì chính sách sensitive-path của Claude Code chặn ghi trực tiếp vào `.claude/`. Pipeline tự động xử lý việc di chuyển sau mỗi stage. Nếu bạn chạy một stage thủ công, bạn cần tự di chuyển cây staged: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (giữ nguyên subpath).

#### Step 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `claudeos-core/memory/` phải chứa 4 file (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` phải chứa 4 file rule, và `CLAUDE.md` giờ phải có mục `## Memory (L4)` được append. Marker: `claudeos-core/generated/pass4-memory.json`.

> **Gap-fill v2.1.0:** Pass 4 cũng đảm bảo `claudeos-core/skills/00.shared/MANIFEST.md` tồn tại. Nếu Pass 3c bỏ sót (có thể xảy ra ở các dự án ít skill vì template stack `pass3.md` liệt kê `MANIFEST.md` là mục tiêu tạo mà không đánh dấu REQUIRED), gap-fill tạo stub tối thiểu để `.claude/rules/50.sync/02.skills-sync.md` (đường dẫn v2.2.0 — số lượng rule sync giảm từ 3 xuống 2, `03` trở thành `02`) luôn có tham chiếu hợp lệ. Idempotent: bỏ qua nếu file đã có nội dung thực (>20 ký tự).

> **Lưu ý:** Nếu `claude -p` lỗi hoặc thiếu `pass4-prompt.md`, pipeline tự động sẽ fallback về scaffold tĩnh qua `lib/memory-scaffold.js` (có dịch qua Claude khi `--lang` khác tiếng Anh). Fallback tĩnh chỉ chạy bên trong `npx claudeos-core init` — chế độ thủ công yêu cầu Pass 4 thành công.

#### Step 8: Chạy verification tools

```bash
# Tạo metadata (bắt buộc trước các kiểm tra khác)
node claudeos-core-tools/manifest-generator/index.js

# Chạy tất cả kiểm tra
node claudeos-core-tools/health-checker/index.js

# Hoặc chạy từng kiểm tra:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk consistency
node claudeos-core-tools/sync-checker/index.js          # File chưa đăng ký/orphan
node claudeos-core-tools/content-validator/index.js     # Kiểm tra chất lượng file (bao gồm mục memory/ [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Kiểm tra JSON Pass 1–4 + completion marker
```

#### Step 9: Xác minh kết quả

```bash
# Đếm số file được tạo
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# Kiểm tra CLAUDE.md
head -30 CLAUDE.md

# Kiểm tra một file standard
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Kiểm tra rules
ls .claude/rules/*/
```

> **Mẹo:** Nếu bước nào đó lỗi, bạn có thể sửa và chạy lại đúng bước đó. Kết quả Pass 1/2 được cache — nếu `pass1-N.json` hoặc `pass2-merged.json` đã tồn tại, pipeline tự động sẽ bỏ qua. Dùng `npx claudeos-core init --force` để xóa kết quả trước và bắt đầu lại từ đầu.

### Bắt Đầu Sử Dụng

```
# Trong Claude Code — chỉ cần hỏi tự nhiên:
"Tạo CRUD cho domain order"
"Thêm API xác thực người dùng"
"Refactor code này khớp với pattern dự án"

# Claude Code tự động tham chiếu Standards, Rules và Skills đã tạo.
```

---

## Cách Hoạt Động — 4-Pass Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Dependencies (~10s)
    ├── [2] Cấu trúc thư mục                   ← Tạo folder (~1s)
    ├── [3] plan-installer (Node.js)           ← Quét dự án (~5s)
    │       ├── Tự phát hiện stack (multi-stack aware)
    │       ├── Trích domain list (tag: backend/frontend)
    │       ├── Chia thành domain group (theo kiểu)
    │       ├── Xây pass3-context.json (slim summary, v2.1.0)
    │       └── Chọn prompt theo stack (theo kiểu)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Phân tích code sâu (~2-8min)
    │       ├── ⚙️ Backend group → prompt backend
    │       └── 🎨 Frontend group → prompt frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Merge phân tích (~1min)
    │       └── Tổng hợp TẤT CẢ kết quả Pass 1 vào pass2-merged.json
    │
    ├── [6] Pass 3 (split mode, v2.1.0)        ← Tạo mọi thứ
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Trích xuất fact (~5-10min)
    │       │       └── Đọc pass2-merged.json một lần → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + standard/rules chung
    │       ├── 3b-1..N × N  (claude -p)       ← Standard/rules domain (≤15 domain/batch)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + skill chung + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Sub-skill domain (≤15 domain/batch)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← Stub database/ + mcp-guide/
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30s-5min)
    │       ├── Seed memory/ (decision-log, failure-patterns, …)
    │       ├── Tạo rules 60.memory/
    │       ├── Append mục "Memory (L4)" vào CLAUDE.md
    │       └── Gap-fill: đảm bảo skills/00.shared/MANIFEST.md tồn tại (v2.1.0)
    │
    └── [8] Xác minh                           ← Tự chạy health checker
```

### Tại sao 4 Pass?

**Pass 1** là pass duy nhất đọc mã nguồn của bạn. Nó chọn các file đại diện cho mỗi domain và trích xuất pattern qua 55–95 danh mục phân tích (theo stack). Với dự án lớn, Pass 1 chạy nhiều lần — mỗi lần cho một nhóm domain. Với dự án multi-stack (ví dụ Java backend + React frontend), domain backend và frontend dùng **prompt phân tích khác nhau** phù hợp từng stack.

**Pass 2** merge tất cả kết quả Pass 1 thành phân tích thống nhất: pattern chung (100% share), pattern đa số (50%+ share), pattern đặc thù domain, anti-pattern theo mức độ nghiêm trọng và các mối quan tâm cross-cutting (naming, security, DB, testing, logging, performance). Kết quả backend và frontend được merge cùng nhau.

**Pass 3** (split mode, v2.1.0) nhận phân tích đã merge và tạo toàn bộ hệ sinh thái file (CLAUDE.md, rules, standards, skills, guides) qua nhiều lời gọi `claude -p` tuần tự. Insight quan trọng là tràn output do tích lũy không thể dự đoán từ kích thước input: Pass 3 lời-gọi-đơn hoạt động tốt trên dự án 2 domain và thất bại nhất quán ở ~5 domain, và ranh giới thất bại thay đổi tùy theo mức độ dài dòng của mỗi file. Split mode né hoàn toàn vấn đề này — mỗi stage bắt đầu với context window mới và ghi một tập con file có giới hạn. Tính nhất quán xuyên stage (vốn là lợi thế chính của phương pháp lời-gọi-đơn) được bảo tồn bởi `pass3a-facts.md`, một fact sheet đã chắt lọc 5–10 KB mà mọi stage sau tham chiếu.

Template prompt Pass 3 cũng bao gồm **block Phase 1 "Read Once, Extract Facts"** với năm rule ràng buộc thêm khối lượng output:

- **Rule A** — Tham chiếu bảng fact; không đọc lại `pass2-merged.json`.
- **Rule B** — Ghi file idempotent (bỏ qua nếu target đã có nội dung thực), giúp Pass 3 có thể chạy lại an toàn sau khi gián đoạn.
- **Rule C** — Tính nhất quán xuyên file được đảm bảo qua bảng fact như single source of truth.
- **Rule D** — Output cô đọng: một dòng (`[WRITE]`/`[SKIP]`) giữa các lần ghi file, không nhắc lại bảng fact, không echo nội dung file.
- **Rule E** — Kiểm tra idempotent theo batch: một `Glob` lúc bắt đầu PHASE 2 thay vì gọi `Read` từng target.

Trong **v2.2.0**, Pass 3 cũng inline một CLAUDE.md scaffold deterministic (`pass-prompts/templates/common/claude-md-scaffold.md`) vào prompt. Điều này cố định tiêu đề và thứ tự của 8 section cấp cao nhất nên `CLAUDE.md` được sinh ra không còn drift giữa các project, trong khi nội dung mỗi section vẫn thích ứng với từng project. Parser `.env` mới của stack-detector (`lib/env-parser.js`) cung cấp `stack.envInfo` cho prompt để các hàng port/host/API target khớp với giá trị project thực sự khai báo thay vì framework default.

**Pass 4** scaffold L4 Memory layer: các file kiến thức team bền vững (decision-log, failure-patterns, compaction policy, auto-rule-update) cộng với rules `60.memory/` chỉ dẫn các session tương lai khi nào và cách đọc/ghi các file đó. Memory layer là thứ giúp Claude Code tích lũy bài học qua các session thay vì phải khám phá lại mỗi lần. Khi `--lang` khác tiếng Anh, nội dung fallback tĩnh được dịch qua Claude trước khi ghi. v2.1.0 thêm gap-fill cho `skills/00.shared/MANIFEST.md` phòng trường hợp Pass 3c bỏ sót.

---

## Cấu Trúc File Được Tạo

```
your-project/
│
├── CLAUDE.md                          ← Entry point của Claude Code (cấu trúc 8-phần deterministic, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Rules kích hoạt theo glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Rule nhắc sync
│       └── 60.memory/                 ← Rule scope on-demand của L4 memory (v2.0.0)
│
├── claudeos-core/                     ← Thư mục output chính
│   ├── generated/                     ← JSON phân tích + prompt động + Pass markers (nên gitignore)
│   │   ├── project-analysis.json      ← Thông tin stack (multi-stack aware)
│   │   ├── domain-groups.json         ← Groups với type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Prompt phân tích backend
│   │   ├── pass1-frontend-prompt.md   ← Prompt phân tích frontend (nếu phát hiện)
│   │   ├── pass2-prompt.md            ← Prompt merge
│   │   ├── pass2-merged.json          ← Output Pass 2 (chỉ Pass 3a tiêu thụ)
│   │   ├── pass3-context.json         ← Slim summary (< 5 KB) cho Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Template prompt Pass 3 (block Phase 1 được thêm trước)
│   │   ├── pass3a-facts.md            ← Fact sheet được ghi bởi Pass 3a, đọc bởi 3b/3c/3d (v2.1.0)
│   │   ├── pass4-prompt.md            ← Prompt memory scaffolding (v2.0.0)
│   │   ├── pass3-complete.json        ← Marker hoàn thành Pass 3 (split mode: bao gồm groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Marker hoàn thành Pass 4 (bỏ qua khi resume)
│   │   ├── rule-manifest.json         ← Index file cho công cụ xác minh
│   │   ├── sync-map.json              ← Mapping Plan ↔ disk (rỗng ở v2.1.0; giữ lại để tương thích sync-checker)
│   │   ├── stale-report.json          ← Kết quả xác minh tổng hợp
│   │   ├── .i18n-cache-<lang>.json    ← Cache bản dịch (`--lang` khác tiếng Anh)
│   │   └── .staged-rules/             ← Thư mục staging tạm cho ghi `.claude/rules/` (tự động di chuyển + dọn)
│   ├── standard/                      ← Coding standards (15-19 file + theo domain ở 60.domains/)
│   │   ├── 00.core/                   ← Tổng quan, kiến trúc, naming
│   │   ├── 10.backend-api/            ← API pattern (theo stack)
│   │   ├── 20.frontend-ui/            ← Frontend pattern (nếu phát hiện)
│   │   ├── 30.security-db/            ← Security, DB schema, utilities
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Build verification, testing
│   │   ├── 60.domains/                ← Standard theo domain (ghi bởi Pass 3b-N, v2.1.0)
│   │   └── 90.optional/               ← Convention tùy chọn (mở rộng theo stack)
│   ├── skills/                        ← Skills scaffold CRUD/page
│   │   └── 00.shared/MANIFEST.md      ← Single source of truth cho skill đã đăng ký
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 file)
│   ├── database/                      ← DB schema, hướng dẫn migration
│   ├── mcp-guide/                     ← Hướng dẫn tích hợp MCP server
│   └── memory/                        ← L4: kiến thức team (4 file) — commit các file này
│       ├── decision-log.md            ← Lý do "tại sao" đằng sau quyết định thiết kế
│       ├── failure-patterns.md        ← Lỗi lặp lại & cách fix (tự chấm điểm — `npx claudeos-core memory score`)
│       ├── compaction.md              ← Chiến lược compaction 4 giai đoạn (chạy `npx claudeos-core memory compact`)
│       └── auto-rule-update.md        ← Đề xuất cải tiến rule (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← Toolkit này (không sửa)
```

Mọi file standard đều bao gồm ví dụ đúng ✅, ví dụ sai ❌, và bảng tóm tắt rule — tất cả đều được trích xuất từ pattern code thực tế của bạn, không phải template chung chung.

> **Lưu ý v2.1.0:** `claudeos-core/plan/` không còn được tạo nữa. Master plan là backup nội bộ mà Claude Code không tiêu thụ lúc runtime, và việc tổng hợp chúng trong Pass 3 là nguyên nhân chính gây tràn output. Dùng `git` để backup/restore thay thế. Các dự án upgrade từ v2.0.x có thể xóa an toàn thư mục `claudeos-core/plan/` hiện có.

### Đề xuất gitignore

**Nên commit** (kiến thức team — có mục đích chia sẻ):
- `CLAUDE.md` — entry point của Claude Code
- `.claude/rules/**` — rules tự động load
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — tài liệu được tạo (lưu ý: `plan/**` không còn được tạo ở v2.1.0)
- `claudeos-core/memory/**` — lịch sử quyết định, failure pattern, đề xuất rule

**KHÔNG commit** (build artifact có thể tạo lại):

```gitignore
# ClaudeOS-Core — phân tích được tạo & cache dịch
claudeos-core/generated/
```

Thư mục `generated/` chứa JSON phân tích (`pass1-*.json`, `pass2-merged.json`), prompts (`pass1/2/3/4-prompt.md`), Pass completion marker (`pass3-complete.json`, `pass4-memory.json`), translation cache (`.i18n-cache-<lang>.json`), và thư mục staging tạm (`.staged-rules/`) — tất cả có thể xây lại bằng cách chạy lại `npx claudeos-core init`.

---

## Tự Động Mở Rộng Theo Kích Thước Dự Án

Split mode của Pass 3 mở rộng số stage theo số domain. Việc chia batch kích hoạt ở 16 domain để giữ output mỗi stage dưới ~50 file, là khoảng an toàn thực nghiệm cho `claude -p` trước khi tràn output do tích lũy.

| Kích thước | Domain | Số stage Pass 3 | Tổng `claude -p` | Thời gian ước tính |
|---|---|---|---|---|
| Nhỏ | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 stage Pass 3 + Pass 4) | ~10–15 phút |
| Vừa | 5–15 | 4 | 8–9 | ~25–45 phút |
| Lớn | 16–30 | **8** (3b, 3c mỗi cái chia thành 2 batch) | 11–12 | **~60–105 phút** |
| Rất lớn | 31–45 | 10 | 13–14 | ~100–150 phút |
| Siêu lớn | 46–60 | 12 | 15–16 | ~150–200 phút |
| Cực lớn | 61+ | 14+ | 17+ | 200 phút+ |

Công thức số stage (khi chia batch): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, với `N = ceil(totalDomains / 15)`.

Pass 4 (memory scaffolding) thêm khoảng ~30 giây đến 5 phút lên trên tùy thuộc vào việc chạy tạo qua Claude hay fallback tĩnh. Với dự án multi-stack (ví dụ Java + React), domain backend và frontend được đếm cộng lại. Dự án 6 backend + 4 frontend = 10 tổng = tier Vừa.

---

## Công Cụ Xác Minh

ClaudeOS-Core bao gồm 5 công cụ xác minh built-in chạy tự động sau khi tạo:

```bash
# Chạy tất cả kiểm tra cùng lúc (khuyến nghị)
npx claudeos-core health

# Lệnh riêng lẻ
npx claudeos-core validate     # So sánh Plan ↔ disk
npx claudeos-core refresh      # Disk → Plan sync
npx claudeos-core restore      # Plan → Disk restore

# Hoặc dùng node trực tiếp (cho người dùng git clone)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Công cụ | Chức năng |
|---|---|
| **manifest-generator** | Tạo JSON metadata (`rule-manifest.json`, `sync-map.json`, khởi tạo `stale-report.json`); index 7 thư mục bao gồm `memory/` (`totalMemory` trong summary). v2.1.0: `plan-manifest.json` không còn được tạo vì master plan đã bị loại bỏ. |
| **plan-validator** | Xác minh block `<file>` master plan với disk cho các dự án vẫn còn `claudeos-core/plan/` (trường hợp upgrade legacy). v2.1.0: bỏ qua tạo `plan-sync-status.json` khi `plan/` vắng mặt hoặc rỗng — `stale-report.json` vẫn ghi một no-op pass. |
| **sync-checker** | Phát hiện file chưa đăng ký (trên disk nhưng không có trong plan) và entry orphan — bao phủ 7 thư mục (thêm `memory/` ở v2.0.0). Thoát sạch khi `sync-map.json` không có mapping nào (trạng thái mặc định của v2.1.0). |
| **content-validator** | Kiểm tra chất lượng 9 mục — file rỗng, thiếu ví dụ ✅/❌, mục bắt buộc, cộng với toàn vẹn scaffold L4 memory (ngày heading decision-log, trường bắt buộc failure-pattern, parse nhận biết fence) |
| **pass-json-validator** | Xác minh cấu trúc JSON Pass 1–4 cộng với marker hoàn thành `pass3-complete.json` (shape split-mode, v2.1.0) và `pass4-memory.json` |

---

## Cách Claude Code Dùng Tài Liệu Của Bạn

ClaudeOS-Core tạo tài liệu mà Claude Code thực sự đọc — đây là cách:

### Cái Claude Code đọc tự động

| File | Khi nào | Đảm bảo |
|---|---|---|
| `CLAUDE.md` | Mỗi lần bắt đầu hội thoại | Luôn luôn |
| `.claude/rules/00.core/*` | Khi sửa bất kỳ file nào (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/10.backend/*` | Khi sửa bất kỳ file nào (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/20.frontend/*` | Khi sửa bất kỳ file frontend nào (scope tới đường dẫn component/page/style) | Có điều kiện |
| `.claude/rules/30.security-db/*` | Khi sửa bất kỳ file nào (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/40.infra/*` | Chỉ khi sửa file config/infra (đường dẫn có scope) | Có điều kiện |
| `.claude/rules/50.sync/*` | Chỉ khi sửa file claudeos-core (đường dẫn có scope) | Có điều kiện |
| `.claude/rules/60.memory/*` | Khi sửa `claudeos-core/memory/*` (scope tới đường dẫn memory) — chỉ dẫn **cách** đọc/ghi memory layer on-demand | Có điều kiện (v2.0.0) |

### Cái Claude Code đọc theo yêu cầu qua rule references

Mỗi file rule link tới standard tương ứng qua mục `## Reference`. Claude chỉ đọc standard liên quan cho task hiện tại:

- `claudeos-core/standard/**` — coding pattern, ví dụ ✅/❌, convention đặt tên
- `claudeos-core/database/**` — DB schema (cho query, mapper, migration)
- `claudeos-core/memory/**` (v2.0.0) — L4 team knowledge layer; **không** auto-load (sẽ quá nhiễu ở mỗi hội thoại). Thay vào đó, các rule `60.memory/*` chỉ dẫn Claude *khi nào* Read các file này: ở đầu session (lướt qua `decision-log.md` gần đây + `failure-patterns.md` importance cao), và append theo yêu cầu khi ra quyết định hoặc gặp lỗi lặp lại.

`00.standard-reference.md` đóng vai trò như danh bạ của tất cả file standard để phát hiện những standard không có rule tương ứng.

### Cái Claude Code KHÔNG đọc (tiết kiệm context)

Các folder này được loại trừ rõ ràng qua mục `DO NOT Read` trong rule standard-reference:

| Folder | Lý do loại trừ |
|---|---|
| `claudeos-core/plan/` | Master Plan backup từ các dự án legacy (v2.0.x và trước đó). Không tạo ở v2.1.0. Nếu có mặt, Claude Code sẽ không tự động load — chỉ đọc theo yêu cầu. |
| `claudeos-core/generated/` | JSON metadata build, prompt, Pass marker, translation cache, `.staged-rules/`. Không dùng cho coding. |
| `claudeos-core/guide/` | Hướng dẫn onboarding cho con người. |
| `claudeos-core/mcp-guide/` | Tài liệu MCP server. Không dùng cho coding. |
| `claudeos-core/memory/` (auto-load) | **Auto-load bị tắt** có chủ đích — sẽ làm phồng context ở mỗi hội thoại. Đọc theo yêu cầu qua rule `60.memory/*` thay thế (ví dụ: scan `failure-patterns.md` lúc bắt đầu session). Luôn commit các file này. |

---

## Quy Trình Hằng Ngày

### Sau Khi Cài Đặt

```
# Chỉ dùng Claude Code như bình thường — nó tham chiếu standard của bạn tự động:
"Tạo CRUD cho domain order"
"Thêm API cập nhật profile người dùng"
"Refactor code này khớp với pattern dự án"
```

### Sau Khi Sửa Standard Thủ Công

```bash
# Sau khi sửa file standard hoặc rules:
npx claudeos-core refresh

# Xác minh mọi thứ nhất quán
npx claudeos-core health
```

### Khi Docs Bị Hỏng

```bash
# Khuyến nghị v2.1.0: dùng git để khôi phục (vì master plan không còn
# được tạo nữa). Commit tài liệu được tạo thường xuyên để có thể rollback
# từng file cụ thể mà không cần tạo lại:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (dự án v2.0.x vẫn còn claudeos-core/plan/):
npx claudeos-core restore
```

### Bảo Trì Memory Layer (v2.0.0)

L4 Memory layer (`claudeos-core/memory/`) tích lũy kiến thức team qua các session. Ba CLI subcommand giữ nó khỏe mạnh:

```bash
# Compact: áp dụng chính sách compaction 4 giai đoạn (chạy định kỳ — ví dụ hàng tháng)
npx claudeos-core memory compact
#   Stage 1: tóm tắt các entry cũ (>30 ngày, body → một dòng)
#   Stage 2: merge heading trùng (tổng frequency, giữ fix mới nhất)
#   Stage 3: bỏ importance thấp + cũ (importance <3 VÀ lastSeen >60 ngày)
#   Stage 4: áp dụng giới hạn 400 dòng mỗi file (bỏ importance thấp cũ nhất trước)

# Score: xếp hạng lại các entry trong failure-patterns.md theo importance
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), giới hạn 10
#   Chạy sau khi append vài failure pattern mới

# Propose-rules: nổi bật các candidate rule addition từ failure lặp lại
npx claudeos-core memory propose-rules
#   Đọc các entry failure-patterns.md với frequency ≥ 3
#   Tính confidence (sigmoid trên weighted evidence × anchor multiplier)
#   Ghi proposal vào memory/auto-rule-update.md (KHÔNG tự động áp dụng)
#   Confidence ≥ 0.70 đáng xem xét nghiêm túc; nếu accept → sửa rule + log quyết định

# v2.1.0: `memory --help` giờ route tới help subcommand (trước đây hiển thị top-level)
npx claudeos-core memory --help
```

> **Fix v2.1.0:** `memory score` không còn để lại dòng `importance` trùng lặp sau lần chạy đầu (trước đây dòng được tự chấm điểm được thêm ở trên trong khi dòng nguyên bản bị bỏ lại bên dưới). Marker summary Stage 1 của `memory compact` giờ là markdown list item đúng định dạng (`- _Summarized on ..._`) nên render sạch và được parse lại đúng ở các lần compact sau.

Khi nào ghi vào memory (Claude làm theo yêu cầu, nhưng bạn cũng có thể sửa thủ công):
- **`decision-log.md`** — append entry mới bất cứ khi nào bạn chọn giữa các pattern cạnh tranh, chọn thư viện, định nghĩa convention team, hoặc quyết định KHÔNG làm gì đó. Chỉ append; không bao giờ sửa entry lịch sử.
- **`failure-patterns.md`** — append vào **lần xuất hiện thứ hai** của lỗi lặp lại hoặc nguyên nhân không hiển nhiên. Lỗi lần đầu không cần entry.
- `compaction.md` và `auto-rule-update.md` — được tạo/quản lý bởi các CLI subcommand trên; không sửa bằng tay.

### Tích Hợp CI/CD

```yaml
# Ví dụ GitHub Actions
- run: npx claudeos-core validate
# Exit code 1 chặn PR

# Tùy chọn: housekeeping memory hàng tháng (workflow cron riêng)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## Khác Biệt Ra Sao?

### So với Các Công Cụ Claude Code Khác

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Cách tiếp cận** | Code phân tích trước, rồi LLM tạo | Preset config dựng sẵn | LLM thiết kế agent team | LLM tạo spec doc | LLM viết CLAUDE.md |
| **Đọc source code** | ✅ Phân tích tĩnh deterministic | ❌ | ❌ | ❌ (LLM đọc) | ❌ (LLM đọc) |
| **Phát hiện stack** | Code xác nhận (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM đoán | LLM đoán | LLM đoán |
| **Phát hiện domain** | Code xác nhận (Java 5 pattern, Kotlin CQRS, Next.js FSD) | N/A | LLM đoán | N/A | N/A |
| **Cùng dự án → cùng kết quả** | ✅ Phân tích deterministic | ✅ (file tĩnh) | ❌ (LLM thay đổi) | ❌ (LLM thay đổi) | ❌ (LLM thay đổi) |
| **Xử lý dự án lớn** | Chia domain group (4 domain / 40 file mỗi group) | N/A | Không chia | Không chia | Giới hạn context window |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ file) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec document | CLAUDE.md (1 file) |
| **Vị trí output** | `.claude/rules/` (tự load bởi Claude Code) | `.claude/` đủ loại | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Xác minh sau khi tạo** | ✅ 5 validator tự động | ❌ | ❌ | ❌ | ❌ |
| **Output đa ngôn ngữ** | ✅ 10 ngôn ngữ | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend đồng thời | ❌ Stack-agnostic | ❌ | ❌ | Một phần |
| **Memory layer bền vững** | ✅ L4 — decision log + failure pattern + đề xuất rule chấm điểm tự động (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Điều phối agent** | ❌ | ✅ 28 agent | ✅ 6 pattern | ❌ | ❌ |

### Khác biệt chính trong một câu

**Các công cụ khác cho Claude "instructions tốt nói chung". ClaudeOS-Core cho Claude "instructions trích xuất từ code thực tế của bạn".**

Đó là lý do Claude Code ngừng tạo code JPA trong dự án MyBatis,
ngừng dùng `success()` khi codebase của bạn dùng `ok()`,
và ngừng tạo thư mục `user/controller/` khi dự án của bạn dùng `controller/user/`.

### Bổ sung, không cạnh tranh

ClaudeOS-Core tập trung vào **rule và standard đặc thù dự án**.
Các công cụ khác tập trung vào **điều phối agent và workflow**.

Bạn có thể dùng ClaudeOS-Core để tạo rule cho dự án, rồi dùng ECC hoặc Harness bên trên cho agent team và tự động hóa workflow. Chúng giải quyết các vấn đề khác nhau.

---

## FAQ

**Q: Nó có sửa source code của tôi không?**
Không. Nó chỉ tạo `CLAUDE.md`, `.claude/rules/`, và `claudeos-core/`. Code hiện có của bạn không bao giờ bị sửa.

**Q: Chi phí là bao nhiêu?**
Nó gọi `claude -p` vài lần qua 4 pass. Ở split mode v2.1.0, chỉ riêng Pass 3 đã mở rộng thành 4–14+ stage tùy theo kích thước dự án (xem [Tự Động Mở Rộng](#tự-động-mở-rộng-theo-kích-thước-dự-án)). Một dự án nhỏ điển hình (1–15 domain) dùng tổng cộng 8–9 lời gọi `claude -p`; dự án 18 domain dùng 11; dự án 60 domain dùng 15–17. Mỗi stage chạy với context window mới — chi phí token mỗi lời gọi thực ra thấp hơn Pass 3 lời-gọi-đơn, vì không stage nào phải giữ toàn bộ cây file trong một context. Khi `--lang` khác tiếng Anh, đường fallback tĩnh có thể gọi thêm vài `claude -p` để dịch; kết quả được cache trong `claudeos-core/generated/.i18n-cache-<lang>.json` nên các lần chạy sau dùng lại. Vẫn nằm trong mức sử dụng Claude Code bình thường.

**Q: Pass 3 split mode là gì và tại sao được thêm ở v2.1.0?**
Trước v2.1.0, Pass 3 thực hiện một lời gọi `claude -p` đơn phải phát ra toàn bộ cây file được tạo (`CLAUDE.md`, standards, rules, skills, guides — thường 30–60 file) trong một response. Điều này hoạt động trên dự án nhỏ nhưng luôn gặp lỗi `Prompt is too long` do tích lũy output ở ~5 domain. Lỗi không thể dự đoán từ kích thước input — nó phụ thuộc vào mức độ dài dòng của mỗi file được tạo, và có thể ập đến cùng một dự án một cách không ổn định. Split mode né vấn đề này về cấu trúc: Pass 3 được chia thành các stage tuần tự (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), mỗi cái là một lời gọi `claude -p` riêng với context window mới. Tính nhất quán xuyên stage được bảo tồn bởi `pass3a-facts.md`, fact sheet đã chắt lọc 5–10 KB mà mọi stage sau tham chiếu thay vì đọc lại `pass2-merged.json`. Marker `pass3-complete.json` mang mảng `groupsCompleted` để crash trong `3c-2` resume từ `3c-2` (không phải từ `3a`), tránh chi phí token gấp đôi.
**Q: Tôi có nên commit các file được tạo vào Git không?**
Có, khuyến nghị. Team của bạn có thể chia sẻ cùng standard Claude Code. Hãy xem xét thêm `claudeos-core/generated/` vào `.gitignore` (JSON phân tích có thể tạo lại).

**Q: Còn dự án mixed-stack (ví dụ Java backend + React frontend)?**
Được hỗ trợ hoàn toàn. ClaudeOS-Core tự phát hiện cả hai stack, gắn tag domain là `backend` hoặc `frontend`, và dùng prompt phân tích theo stack cho mỗi cái. Pass 2 merge mọi thứ, và Pass 3 tạo cả standard backend và frontend qua các split stage — domain backend rơi vào một số batch 3b/3c, domain frontend vào các batch khác, tất cả đều tham chiếu cùng `pass3a-facts.md` để có tính nhất quán.

**Q: Nó có hoạt động với monorepo Turborepo / pnpm workspaces / Lerna không?**
Có. ClaudeOS-Core phát hiện `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, hoặc `package.json#workspaces` và tự động quét file `package.json` của sub-package để tìm dependency framework/ORM/DB. Quét domain bao phủ pattern `apps/*/src/` và `packages/*/src/`. Chạy từ root monorepo.

**Q: Chạy lại thì chuyện gì xảy ra?**
Nếu kết quả Pass 1/2 trước đó tồn tại, một prompt tương tác cho bạn chọn: **Continue** (tiếp tục từ chỗ dừng) hoặc **Fresh** (xóa tất cả và bắt đầu lại). Dùng `--force` để bỏ qua prompt và luôn bắt đầu mới. Ở split mode v2.1.0, resume Pass 3 hoạt động ở mức độ stage — nếu lần chạy crash trong `3c-2`, `init` tiếp theo resume từ `3c-2` thay vì bắt đầu lại từ `3a` (sẽ nhân đôi chi phí token). Marker `pass3-complete.json` ghi `mode: "split"` cộng với mảng `groupsCompleted` để điều khiển logic này.

**Q: NestJS có template riêng hay dùng của Express?**
NestJS dùng template `node-nestjs` chuyên dụng với các danh mục phân tích đặc thù NestJS: decorator `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI container, pattern CQRS, và `Test.createTestingModule`. Dự án Express dùng template `node-express` riêng biệt.

**Q: Còn dự án Vue / Nuxt?**
Vue/Nuxt dùng template `vue-nuxt` chuyên dụng bao phủ Composition API, `<script setup>`, defineProps/defineEmits, Pinia store, `useFetch`/`useAsyncData`, Nitro server route, và `@nuxt/test-utils`. Dự án Next.js/React dùng template `node-nextjs`.

**Q: Nó có hỗ trợ Kotlin không?**
Có. ClaudeOS-Core tự phát hiện Kotlin từ `build.gradle.kts` hoặc kotlin plugin trong `build.gradle`. Nó dùng template `kotlin-spring` chuyên dụng với phân tích đặc thù Kotlin (data class, sealed class, coroutine, extension function, MockK, v.v.).

**Q: Còn kiến trúc CQRS / BFF?**
Được hỗ trợ hoàn toàn cho dự án Kotlin multi-module. ClaudeOS-Core đọc `settings.gradle.kts`, phát hiện kiểu module (command, query, bff, integration) từ tên module, và nhóm cùng domain qua các module Command/Query. Các standard được tạo bao gồm rule riêng cho command controller vs query controller, pattern BFF/Feign, và convention giao tiếp liên module.

**Q: Còn Gradle multi-module monorepo?**
ClaudeOS-Core quét tất cả submodule (`**/src/main/kotlin/**/*.kt`) bất kể độ sâu nesting. Kiểu module được suy ra từ convention đặt tên (ví dụ `reservation-command-server` → domain: `reservation`, type: `command`). Các thư viện shared (`shared-lib`, `integration-lib`) cũng được phát hiện.

**Q: L4 Memory layer là gì (v2.0.0)? Tôi có nên commit `claudeos-core/memory/` không?**
Có — **luôn commit** `claudeos-core/memory/`. Đó là kiến thức team bền vững: `decision-log.md` ghi lại *lý do* đằng sau các lựa chọn kiến trúc (chỉ append), `failure-patterns.md` đăng ký các lỗi lặp lại với importance score để session tương lai tránh, `compaction.md` định nghĩa chính sách compaction 4 giai đoạn, và `auto-rule-update.md` thu thập các đề xuất cải tiến rule do máy tạo. Khác với rule (tự load theo path), file memory là **on-demand** — Claude chỉ đọc khi rule `60.memory/*` hướng dẫn (ví dụ: scan failure importance cao lúc bắt đầu session). Điều này giữ chi phí context thấp trong khi bảo toàn kiến thức dài hạn.

**Q: Nếu Pass 4 lỗi thì sao?**
Pipeline tự động (`npx claudeos-core init`) có static fallback: nếu `claude -p` lỗi hoặc thiếu `pass4-prompt.md`, nó scaffold memory layer trực tiếp qua `lib/memory-scaffold.js`. Khi `--lang` khác tiếng Anh, static fallback **phải** dịch qua CLI `claude` — nếu cũng lỗi, lần chạy sẽ abort với `InitError` (không fallback âm thầm về English). Chạy lại khi `claude` đã xác thực, hoặc dùng `--lang en` để bỏ qua dịch. Kết quả dịch được cache trong `claudeos-core/generated/.i18n-cache-<lang>.json` nên lần chạy sau dùng lại.

**Q: `memory compact` / `memory score` / `memory propose-rules` làm gì?**
Xem mục [Bảo Trì Memory Layer](#bảo-trì-memory-layer-v200) ở trên. Phiên bản ngắn: `compact` chạy chính sách 4 giai đoạn (tóm tắt cũ, merge trùng, bỏ importance thấp cũ, áp dụng giới hạn 400 dòng); `score` xếp hạng lại `failure-patterns.md` theo importance (frequency × recency); `propose-rules` nổi bật candidate rule addition từ failure lặp lại vào `auto-rule-update.md` (không tự động áp dụng — xem và accept/reject thủ công).

**Q: Tại sao `--force` (hoặc chế độ "fresh" resume) xóa `.claude/rules/`?**
v2.0.0 thêm ba silent-failure guard cho Pass 3 (Guard 3 bao phủ hai biến thể output không đầy đủ: H2 cho `guide/` và H1 cho `standard/skills`). Guard 1 ("partial staged-rules move") và Guard 3 ("incomplete output — missing/empty guide files or missing standard sentinel / empty skills") không phụ thuộc vào rule hiện có, nhưng Guard 2 ("zero rules detected") thì có — nó kích hoạt khi Claude bỏ qua directive `staging-override.md` và thử ghi trực tiếp vào `.claude/` (nơi chính sách sensitive-path của Claude Code chặn). Rule cũ từ lần chạy trước sẽ khiến Guard 2 false-negative — nên `--force`/`fresh` xóa `.claude/rules/` để đảm bảo phát hiện sạch. **Sửa rule thủ công sẽ bị mất** dưới `--force`/`fresh`; hãy backup trước nếu cần. (Lưu ý v2.1.0: Guard 3 H1 không còn kiểm tra `plan/` vì master plan không còn được tạo.)

**Q: `claudeos-core/generated/.staged-rules/` là gì và tại sao tồn tại?**
Chính sách sensitive-path của Claude Code từ chối ghi trực tiếp vào `.claude/` từ subprocess `claude -p` (ngay cả với `--dangerously-skip-permissions`). v2.0.0 đi vòng bằng cách cho prompt Pass 3/4 chuyển hướng mọi ghi `.claude/rules/` vào thư mục staging; orchestrator Node.js (không chịu chính sách đó) sau đó di chuyển cây staged vào `.claude/rules/` sau mỗi pass. Điều này trong suốt với người dùng — thư mục được tự tạo, tự dọn, và tự di chuyển. Nếu lần chạy trước crash giữa chừng di chuyển, lần chạy sau xóa staging dir trước khi thử lại. Ở split mode v2.1.0, stage runner di chuyển staged rules vào `.claude/rules/` sau mỗi stage (không chỉ cuối cùng), nên crash giữa Pass 3 vẫn để lại rule của các stage đã hoàn thành trước đó tại chỗ.

**Q: Tôi có thể chạy Pass 3 thủ công thay vì `npx claudeos-core init` không?**
Có cho dự án nhỏ (≤5 domain) — hướng dẫn thủ công lời-gọi-đơn ở [Step 6](#step-6-pass-3--tạo-toàn-bộ-tài-liệu-chia-thành-nhiều-stage) vẫn hoạt động. Cho dự án lớn hơn bạn nên dùng `npx claudeos-core init` vì split runner là cái điều phối thực thi từng stage với context mới, xử lý chia batch ở ≥16 domain, ghi shape marker `pass3-complete.json` đúng (`mode: "split"` + `groupsCompleted`), và di chuyển staged rules giữa các stage. Tái tạo điều phối đó bằng tay có thể được nhưng mệt mỏi. Nếu bạn có lý do chạy stage thủ công (ví dụ: debug một stage cụ thể), bạn có thể template `pass3-prompt.md` với directive `STAGE:` phù hợp và đưa cho `claude -p` trực tiếp — nhưng nhớ di chuyển `.staged-rules/` sau mỗi stage và tự cập nhật marker.

**Q: Dự án của tôi là upgrade từ v2.0.x và có thư mục `claudeos-core/plan/` hiện hữu. Tôi phải làm gì?**
Không cần gì cả — công cụ v2.1.0 bỏ qua `plan/` khi nó vắng mặt hoặc rỗng, và `plan-validator` vẫn xử lý các dự án legacy có thư mục `plan/` đã điền để tương thích ngược. Bạn có thể xóa an toàn `claudeos-core/plan/` nếu không cần master plan backup (git history dù sao cũng là backup tốt hơn). Nếu giữ `plan/`, chạy `npx claudeos-core init` sẽ không cập nhật nó — nội dung mới không được tổng hợp vào master plan ở v2.1.0. Công cụ xác minh xử lý sạch cả hai trường hợp.

---

## Cấu Trúc Template

```
pass-prompts/templates/
├── common/                  # header/footer dùng chung + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Vai trò + chỉ thị định dạng output (tất cả pass)
│   ├── pass3-footer.md       # Chỉ thị health-check sau Pass 3 + 5 khối guardrail CRITICAL (v2.2.0)
│   ├── pass3-phase1.md       # Khối "Read Once, Extract Facts" với Rule A-E (v2.1.0)
│   ├── pass4.md              # Prompt scaffolding memory (v2.0.0)
│   ├── staging-override.md   # Chuyển hướng write .claude/rules/** sang .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # Template CLAUDE.md 8 section tất định (v2.2.0)
│   └── lang-instructions.json # Chỉ thị output theo ngôn ngữ (10 ngôn ngữ)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` tự phát hiện các stack của bạn, rồi lắp ráp prompt theo kiểu. NestJS, Vue/Nuxt, Vite SPA và Flask mỗi cái dùng template chuyên dụng với danh mục phân tích đặc thù framework (ví dụ: `@Module`/`@Injectable`/Guards cho NestJS; `<script setup>`/Pinia/useFetch cho Vue; client-side routing/`VITE_` env cho Vite; Blueprint/`app.factory`/Flask-SQLAlchemy cho Flask). Cho dự án multi-stack, `pass1-backend-prompt.md` và `pass1-frontend-prompt.md` riêng biệt được tạo, trong khi `pass3-prompt.md` kết hợp mục tiêu tạo của cả hai stack. Ở v2.1.0, template Pass 3 được thêm `common/pass3-phase1.md` (block "Read Once, Extract Facts" với Rules A–E) vào đầu trước khi được cắt theo từng stage split-mode. Pass 4 dùng template chung `common/pass4.md` (memory scaffolding) bất kể stack.

**Trong v2.2.0**, prompt Pass 3 cũng chèn inline `common/claude-md-scaffold.md` (template CLAUDE.md 8 section tất định) vào giữa khối phase1 và thân stack-specific — điều này cố định cấu trúc section để CLAUDE.md được tạo ra không bị drift giữa các project, trong khi nội dung vẫn thích ứng theo project. Template được viết **English-first**; việc inject ngôn ngữ từ `lang-instructions.json` chỉ thị LLM dịch tiêu đề section và văn xuôi sang ngôn ngữ output đích tại thời điểm emit.

---

## Hỗ Trợ Monorepo

ClaudeOS-Core tự động phát hiện setup monorepo JS/TS và quét sub-package tìm dependency.

**Các monorepo marker được hỗ trợ** (tự phát hiện):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Chạy từ root monorepo** — ClaudeOS-Core đọc `apps/*/package.json` và `packages/*/package.json` để khám phá dependency framework/ORM/DB qua các sub-package:

```bash
cd my-monorepo
npx claudeos-core init
```

**Những gì được phát hiện:**
- Dependency từ `apps/web/package.json` (ví dụ: `next`, `react`) → frontend stack
- Dependency từ `apps/api/package.json` (ví dụ: `express`, `prisma`) → backend stack
- Dependency từ `packages/db/package.json` (ví dụ: `drizzle-orm`) → ORM/DB
- Đường dẫn workspace tùy chỉnh từ `pnpm-workspace.yaml` (ví dụ: `services/*`)

**Quét domain cũng bao phủ layout monorepo:**
- `apps/api/src/modules/*/` và `apps/api/src/*/` cho backend domain
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` cho frontend domain
- `packages/*/src/*/` cho shared package domain

```
my-monorepo/                    ← Chạy ở đây: npx claudeos-core init
├── turbo.json                  ← Tự phát hiện là Turborepo
├── apps/
│   ├── web/                    ← Next.js phát hiện từ apps/web/package.json
│   │   ├── app/dashboard/      ← Frontend domain được phát hiện
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express phát hiện từ apps/api/package.json
│       ├── src/modules/users/  ← Backend domain được phát hiện
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle phát hiện từ packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Lưu ý:** Với monorepo Kotlin/Java, phát hiện multi-module dùng `settings.gradle.kts` (xem [Phát Hiện Domain Kotlin Multi-Module](#phát-hiện-domain-kotlin-multi-module) ở trên) và không cần marker monorepo JS.

## Xử Lý Sự Cố

**"claude: command not found"** — Claude Code CLI chưa được cài đặt hoặc không trong PATH. Xem [tài liệu Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — Phiên bản Node.js có thể quá thấp. Yêu cầu v18+.

**"0 domains detected"** — Cấu trúc dự án của bạn có thể không chuẩn. Xem các pattern phát hiện ở trên cho stack của bạn.

**"0 domains detected" trên dự án Kotlin** — Đảm bảo dự án có `build.gradle.kts` (hoặc `build.gradle` với kotlin plugin) ở root, và file source nằm dưới `**/src/main/kotlin/`. Với dự án multi-module, đảm bảo `settings.gradle.kts` chứa các lệnh `include()`. Dự án Kotlin single-module (không có `settings.gradle`) cũng được hỗ trợ — domain được trích xuất từ cấu trúc package/class dưới `src/main/kotlin/`.

**"Language detected as java instead of kotlin"** — ClaudeOS-Core kiểm tra root `build.gradle(.kts)` trước, rồi tới file build submodule. Nếu file build root dùng plugin `java` không có `kotlin`, nhưng submodule dùng Kotlin, công cụ kiểm tra tối đa 5 file build submodule làm fallback. Nếu vẫn không phát hiện, đảm bảo ít nhất một `build.gradle.kts` chứa `kotlin("jvm")` hoặc `org.jetbrains.kotlin`.

**"CQRS not detected"** — Phát hiện kiến trúc dựa trên tên module chứa từ khóa `command` và `query`. Nếu module của bạn dùng tên khác (ví dụ: `write-server`, `read-server`), kiến trúc CQRS sẽ không tự phát hiện. Bạn có thể chỉnh thủ công prompt được tạo sau khi plan-installer chạy.

**"Pass 3 produced 0 rule files under .claude/rules/" (v2.0.0)** — Guard 2 kích hoạt: Claude bỏ qua directive `staging-override.md` và thử ghi trực tiếp vào `.claude/`, nơi chính sách sensitive-path của Claude Code chặn ghi. Chạy lại với `npx claudeos-core init --force`. Nếu lỗi vẫn xuất hiện, kiểm tra `claudeos-core/generated/pass3-prompt.md` để xác nhận block `staging-override.md` ở đầu.

**"Pass 3 finished but N rule file(s) could not be moved from staging" (v2.0.0)** — Guard 1 kích hoạt: việc di chuyển staging gặp khóa file tạm thời (thường là Windows antivirus hoặc file-watcher). Marker KHÔNG được ghi, nên lần chạy `init` tiếp theo tự động retry Pass 3. Chỉ cần chạy lại `npx claudeos-core init`.

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty" (v2.0.0)** — Guard 3 (H2) kích hoạt: Claude bị cắt giữa chừng sau khi viết CLAUDE.md + rules nhưng trước khi hoàn thành (hoặc bắt đầu) mục `claudeos-core/guide/` (mong đợi 9 file). Cũng kích hoạt trên file chỉ có BOM hoặc chỉ có whitespace (heading đã viết nhưng body bị cắt). Không có guard này, completion marker vẫn được ghi, để `guide/` trống vĩnh viễn ở các lần chạy sau. Marker KHÔNG được ghi ở đây, nên lần chạy `init` tiếp theo retry Pass 3 từ cùng kết quả Pass 2. Nếu cứ lặp lại, chạy lại với `npx claudeos-core init --force` để tạo lại từ đầu.

**"Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0, cập nhật v2.1.0)** — Guard 3 (H1) kích hoạt: Claude bị cắt SAU `claudeos-core/guide/` nhưng trước (hoặc trong lúc) `claudeos-core/standard/` hoặc `claudeos-core/skills/`. Yêu cầu: (a) `standard/00.core/01.project-overview.md` tồn tại và không rỗng (sentinel được ghi bởi mọi prompt Pass 3 của mọi stack), (b) `skills/` có ≥1 `.md` không rỗng. `database/` và `mcp-guide/` bị loại trừ có chủ đích (một số stack tạo ra 0 file hợp lệ). `plan/` không còn được kiểm tra kể từ v2.1.0 (master plan đã bị loại bỏ). Đường khôi phục như Guard 3 (H2): chạy lại `init`, hoặc `--force` nếu lỗi vẫn tiếp diễn.

**"Pass 3 split stage crashed partway through (v2.1.0)"** — Khi một trong các split stage (ví dụ: `3b-1`, `3c-2`) lỗi giữa chừng, marker mức stage KHÔNG được ghi, nhưng các stage đã hoàn thành ĐƯỢC ghi trong `pass3-complete.json.groupsCompleted`. Lần chạy `init` tiếp theo đọc mảng này và resume từ stage chưa hoàn thành đầu tiên, bỏ qua mọi công việc đã hoàn thành trước đó. Bạn không cần làm gì thủ công — chỉ cần chạy lại `npx claudeos-core init`. Nếu resume cứ lỗi ở cùng stage, kiểm tra `claudeos-core/generated/pass3-prompt.md` tìm nội dung bị lỗi, rồi thử `--force` để khởi động lại đầy đủ. Shape `pass3-complete.json` (`mode: "split"`, `groupsCompleted: [...]`) ổn định; một marker thiếu hoặc lỗi sẽ khiến toàn bộ Pass 3 chạy lại từ `3a`.

**"Pass 3 stale marker (shape mismatch) — treating as incomplete" (v2.1.0)** — Một `pass3-complete.json` từ lần chạy lời-gọi-đơn pre-v2.1.0 đang được diễn giải theo luật split-mode mới. Kiểm tra shape tìm `mode: "split"` và mảng `groupsCompleted`; nếu thiếu, marker được coi là partial và Pass 3 chạy lại ở split mode. Nếu bạn upgrade từ v2.0.x, điều này xảy ra một lần là mong đợi — lần chạy tiếp theo sẽ ghi shape marker đúng. Không cần hành động.

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Log thông tin, không phải lỗi. Khi resume, `init` giờ parse và validate `pass2-merged.json` (yêu cầu ≥5 top-level key, phản chiếu ngưỡng `INSUFFICIENT_KEYS` của `pass-json-validator`). Skeleton `{}` hoặc JSON lỗi từ lần chạy crash trước tự động bị xóa và Pass 2 chạy lại. Không cần hành động thủ công — pipeline tự chữa. Nếu cứ lặp lại, kiểm tra `claudeos-core/generated/pass2-prompt.md` và retry với `--force`.

**"Static fallback failed while translating to lang='ko'" (v2.0.0)** — Khi `--lang` khác tiếng Anh, Pass 4 / static fallback / gap-fill đều yêu cầu CLI `claude` để dịch. Nếu dịch lỗi (CLI chưa xác thực, timeout mạng, hoặc strict validation từ chối output: <40% độ dài, code fence hỏng, mất frontmatter, v.v.), lần chạy abort thay vì âm thầm ghi tiếng Anh. Sửa: đảm bảo `claude` đã xác thực, hoặc chạy lại với `--lang en` để bỏ qua dịch.

**"pass4-memory.json exists but memory/ is empty" (v2.0.0)** — Lần chạy trước đã ghi marker nhưng người dùng (hoặc script dọn dẹp) xóa `claudeos-core/memory/`. CLI tự phát hiện marker cũ này và chạy lại Pass 4 ở lần `init` tiếp theo. Không cần hành động thủ công.

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Log thông tin, không phải lỗi. Nội dung marker Pass 4 giờ được validate (`passNum === 4` + mảng `memoryFiles` không rỗng), không chỉ sự tồn tại. Một lỗi Claude một phần đã phát ra thứ như `{"error":"timeout"}` làm thân marker trước đây sẽ được chấp nhận như thành công mãi mãi; giờ marker bị xóa và Pass 4 tự chạy lại.

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` phát hiện marker cũ (Pass 3: CLAUDE.md bị xóa bên ngoài; Pass 4: memory/ rỗng hoặc thân marker lỗi) và thử xóa, nhưng gọi `unlinkSync` lỗi — thường vì Windows antivirus hoặc file-watcher (editor, IDE indexer) đang giữ file handle. Trước đây điều này bị bỏ qua âm thầm, khiến pipeline bỏ qua pass và dùng lại marker cũ. Giờ nó lỗi rõ ràng. Sửa: đóng mọi editor/AV scanner có thể đang mở file, rồi chạy lại `npx claudeos-core init`.

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — Bạn đang set env var chỉ dành cho test `CLAUDEOS_SKIP_TRANSLATION=1` trong shell (có thể là sót từ setup CI/test) VÀ chọn `--lang` khác tiếng Anh. Env var này short-circuit đường dịch mà static-fallback và gap-fill của Pass 4 phụ thuộc để output không phải tiếng Anh. `init` phát hiện xung đột lúc chọn ngôn ngữ và abort ngay lập tức (thay vì crash giữa Pass-4 với lỗi lồng khó hiểu). Sửa: hoặc `unset CLAUDEOS_SKIP_TRANSLATION` trước khi chạy, hoặc dùng `npx claudeos-core init --lang en`.

**Cảnh báo "⚠️ v2.2.0 upgrade detected" (v2.2.0)** — `CLAUDE.md` hiện tại được sinh bởi phiên bản trước v2.2.0. Regeneration mặc định ở resume mode sẽ skip các file existing dưới Rule B idempotency, nên các cải tiến cấu trúc v2.2.0 (CLAUDE.md scaffold 8-section, per-file paths trong `40.infra/*`, port accuracy dựa trên `.env.example`, redesign Section 8 `Common Rules & Memory (L4)` (thiết kế lại với hai sub-section: Common Rules · L4 Memory), hàng rule `60.memory/*`, forward-reference `04.doc-writing-guide.md`) sẽ KHÔNG được áp dụng. Fix: chạy lại với `npx claudeos-core init --force`. Nó overwrite file generated (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) đồng thời giữ nguyên `claudeos-core/memory/` (decision-log, failure-patterns bạn đã tích luỹ — append-only). Commit project trước nếu muốn diff các overwrite.

**Port trong CLAUDE.md khác với `.env.example` (v2.2.0)** — Parser `.env` mới của stack-detector (`lib/env-parser.js`) đọc `.env.example` trước (canonical, committed), rồi các variant `.env` làm fallback. Biến port được nhận diện: `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT`, v.v. Với Spring Boot, `server.port` trong `application.yml` vẫn ưu tiên hơn `.env` (config framework-native thắng). Nếu project dùng tên biến env bất thường, đổi thành convention hoặc mở issue để mở rộng `PORT_VAR_KEYS`. Framework default (Vite 5173, Next.js 3000, Django 8000) chỉ dùng khi cả direct detection lẫn `.env` đều im lặng.

**Giá trị secret bị redact thành `***REDACTED***` trong docs generated (v2.2.0)** — Hành vi mong đợi. Parser `.env` v2.2.0 tự động redact giá trị của biến khớp các pattern `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` trước khi tới bất kỳ generator nào. Đây là defense-in-depth chống secret bị commit nhầm vào `.env.example`. `DATABASE_URL` giữ nguyên vì back-compat nhận diện DB của stack-detector. Nếu thấy `***REDACTED***` trong `CLAUDE.md` generated thì là bug — giá trị redacted không nên tới bảng; vui lòng báo issue. Config runtime không nhạy cảm (port, host, API target, NODE_ENV, v.v.) vẫn pass qua nguyên vẹn.

---

## Đóng Góp

Đóng góp được hoan nghênh! Các khu vực cần giúp đỡ nhất:

- **Template stack mới** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Tích hợp IDE** — VS Code extension, IntelliJ plugin
- **Template CI/CD** — ví dụ GitLab CI, CircleCI, Jenkins (GitHub Actions đã có — xem `.github/workflows/test.yml`)
- **Độ phủ test** — Mở rộng test suite (hiện tại 602 test trên 30 file test bao phủ scanner, phát hiện stack, domain grouping, plan parsing, tạo prompt, CLI selector, phát hiện monorepo, phát hiện Vite SPA, công cụ xác minh, L4 memory scaffold, xác thực resume Pass 2, Pass 3 Guards 1/2/3 (sentinel H1 + empty-file nhận biết BOM H2 + unlink marker cũ nghiêm ngặt), chia batch split-mode Pass 3, resume partial-marker Pass 3 (v2.1.0), xác thực nội dung marker Pass 4 + độ nghiêm ngặt unlink marker cũ + gap-fill scaffoldSkillsManifest (v2.1.0), guard env-skip dịch + fail-fast sớm + CI workflow, di chuyển staged-rules, fallback dịch lang-aware, suite regression loại bỏ master plan (v2.1.0), regression định dạng memory score/compact (v2.1.0), và cấu trúc template AI Work Rules, và trích xuất port/host/API-target từ parser `.env` + redact biến nhạy cảm (v2.2.0))

Xem [`CONTRIBUTING.md`](./CONTRIBUTING.md) để có danh sách đầy đủ các khu vực, code style, commit convention, và hướng dẫn từng bước để thêm template stack mới.

---

## Tác Giả

Tạo bởi **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## License

ISC
