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

Tự động phát hiện: ngôn ngữ & phiên bản, framework & phiên bản (bao gồm Vite như SPA framework), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, v.v.), database (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), package manager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), kiến trúc (CQRS, BFF — phát hiện từ tên module), cấu trúc multi-module (từ settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**Bạn không cần chỉ định gì cả. Tất cả được phát hiện tự động.**

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

Vậy thôi. Sau 5–20 phút (Pass 1×N + Pass 2 + Pass 3 + Pass 4 memory scaffolding), tất cả tài liệu được tạo và sẵn sàng sử dụng. CLI hiển thị thanh tiến trình kèm phần trăm, thời gian đã trôi qua và ETA cho mỗi pass.

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

# Guide, Plan, Database, MCP, Generated, Memory (v2.0.0: thêm memory)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated,memory}
```

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
- `pass3-prompt.md` — prompt tạo (được bọc bằng directive `staging-override.md` — xem ghi chú Step 6)
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

#### Step 6: Pass 3 — Tạo toàn bộ tài liệu

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `CLAUDE.md` phải tồn tại ở thư mục gốc dự án, và marker `claudeos-core/generated/pass3-complete.json` phải được ghi.

> **Lưu ý (v2.0.0):** Pass 3 ghi các file rule vào `claudeos-core/generated/.staged-rules/` trước, vì chính sách sensitive-path của Claude Code chặn ghi trực tiếp vào `.claude/`. Pipeline tự động (`npx claudeos-core init`) xử lý việc di chuyển tự động. Nếu bạn chạy bước này thủ công, bạn cần tự di chuyển cây staging: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (giữ nguyên subpath).

#### Step 7: Pass 4 — Memory scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `claudeos-core/memory/` phải chứa 4 file (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` phải chứa 4 file rule, `claudeos-core/plan/50.memory-master.md` phải tồn tại, và `CLAUDE.md` giờ phải có mục `## Memory (L4)` được append. Marker: `claudeos-core/generated/pass4-memory.json`.

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
    ├── [1] npm install                    ← Dependencies (~10s)
    ├── [2] Cấu trúc thư mục               ← Tạo folder (~1s)
    ├── [3] plan-installer (Node.js)       ← Quét dự án (~5s)
    │       ├── Tự phát hiện stack (multi-stack aware)
    │       ├── Trích domain list (tag: backend/frontend)
    │       ├── Chia thành domain group (theo kiểu)
    │       └── Chọn prompt theo stack (theo kiểu)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Phân tích code sâu (~2-8min)
    │       ├── ⚙️ Backend group → prompt backend
    │       └── 🎨 Frontend group → prompt frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Merge phân tích (~1min)
    │       └── Tổng hợp TẤT CẢ kết quả Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Tạo mọi thứ (~3-5min)
    │       └── Prompt kết hợp (mục tiêu backend + frontend)
    │
    ├── [7] Pass 4 × 1  (claude -p)       ← Memory scaffolding (~30s)
    │       ├── Khởi tạo memory/ (decision-log, failure-patterns, …)
    │       ├── Tạo rules 60.memory/
    │       ├── Append mục "Memory (L4)" vào CLAUDE.md
    │       └── Xây dựng plan 50.memory-master.md
    │
    └── [8] Xác minh                       ← Tự chạy health checker
```

### Tại sao 4 Pass?

**Pass 1** là pass duy nhất đọc mã nguồn của bạn. Nó chọn các file đại diện cho mỗi domain và trích xuất pattern qua 55–95 danh mục phân tích (theo stack). Với dự án lớn, Pass 1 chạy nhiều lần — mỗi lần cho một nhóm domain. Với dự án multi-stack (ví dụ Java backend + React frontend), domain backend và frontend dùng **prompt phân tích khác nhau** phù hợp từng stack.

**Pass 2** merge tất cả kết quả Pass 1 thành phân tích thống nhất: pattern chung (100% share), pattern đa số (50%+ share), pattern đặc thù domain, anti-pattern theo mức độ nghiêm trọng và các mối quan tâm cross-cutting (naming, security, DB, testing, logging, performance). Kết quả backend và frontend được merge cùng nhau.

**Pass 3** nhận phân tích đã merge và tạo toàn bộ hệ sinh thái file (CLAUDE.md, rules, standards, skills, guides). Nó không bao giờ đọc mã nguồn — chỉ đọc JSON phân tích. Ở chế độ multi-stack, prompt tạo kết hợp cả mục tiêu backend và frontend để cả hai bộ standard đều được tạo trong một pass.

**Pass 4** scaffold L4 Memory layer: các file kiến thức team bền vững (decision-log, failure-patterns, compaction policy, auto-rule-update) cộng với rules `60.memory/` chỉ dẫn các session tương lai khi nào và cách đọc/ghi các file đó. Memory layer là thứ giúp Claude Code tích lũy bài học qua các session thay vì phải khám phá lại mỗi lần. Khi `--lang` khác tiếng Anh, nội dung fallback tĩnh được dịch qua Claude trước khi ghi.

---

## Cấu Trúc File Được Tạo

```
your-project/
│
├── CLAUDE.md                          ← Entry point của Claude Code
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
│   │   ├── pass3-prompt.md            ← Prompt tạo (kết hợp)
│   │   ├── pass4-prompt.md            ← Prompt memory scaffolding (v2.0.0)
│   │   ├── pass3-complete.json        ← Marker hoàn thành Pass 3 (bỏ qua khi resume)
│   │   ├── pass4-memory.json          ← Marker hoàn thành Pass 4 (bỏ qua khi resume)
│   │   ├── .i18n-cache-<lang>.json    ← Cache bản dịch (`--lang` khác tiếng Anh)
│   │   └── .staged-rules/             ← Thư mục staging tạm cho ghi `.claude/rules/` (tự động di chuyển + dọn)
│   ├── standard/                      ← Coding standards (15-19 file)
│   │   ├── 00.core/                   ← Tổng quan, kiến trúc, naming
│   │   ├── 10.backend-api/            ← API pattern (theo stack)
│   │   ├── 20.frontend-ui/            ← Frontend pattern (nếu phát hiện)
│   │   ├── 30.security-db/            ← Security, DB schema, utilities
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Build verification, testing
│   │   └── 90.optional/               ← Convention tùy chọn (mở rộng theo stack)
│   ├── skills/                        ← Skills scaffold CRUD
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 file)
│   ├── plan/                          ← Master plans (backup/restore)
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

### Đề xuất gitignore

**Nên commit** (kiến thức team — có mục đích chia sẻ):
- `CLAUDE.md` — entry point của Claude Code
- `.claude/rules/**` — rules tự động load
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — tài liệu được tạo
- `claudeos-core/memory/**` — lịch sử quyết định, failure pattern, đề xuất rule

**KHÔNG commit** (build artifact có thể tạo lại):

```gitignore
# ClaudeOS-Core — phân tích được tạo & cache dịch
claudeos-core/generated/
```

Thư mục `generated/` chứa JSON phân tích (`pass1-*.json`, `pass2-merged.json`), prompts (`pass1/2/3/4-prompt.md`), Pass completion marker (`pass3-complete.json`, `pass4-memory.json`), translation cache (`.i18n-cache-<lang>.json`), và thư mục staging tạm (`.staged-rules/`) — tất cả có thể xây lại bằng cách chạy lại `npx claudeos-core init`.

---

## Tự Động Mở Rộng Theo Kích Thước Dự Án

| Kích thước | Domain | Số lần Pass 1 | Tổng `claude -p` | Thời gian ước tính |
|---|---|---|---|---|
| Nhỏ | 1–4 | 1 | 4 (Pass 1 + 2 + 3 + 4) | ~5–6min |
| Vừa | 5–8 | 2 | 5 | ~8–9min |
| Lớn | 9–16 | 3–4 | 6–7 | ~12–13min |
| Rất lớn | 17+ | 5+ | 8+ | ~18min+ |

Pass 4 (memory scaffolding) thêm khoảng ~30s lên trên các pass phân tích. Với dự án multi-stack (ví dụ Java + React), domain backend và frontend được đếm cộng lại. Dự án 6 backend + 4 frontend = 10 tổng, mở rộng như "Lớn".

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
| **manifest-generator** | Tạo JSON metadata (rule-manifest, sync-map, plan-manifest); index 7 thư mục bao gồm `memory/` (`totalMemory` trong summary) |
| **plan-validator** | So sánh block `<file>` Master Plan với disk — 3 chế độ: check, refresh, restore |
| **sync-checker** | Phát hiện file chưa đăng ký (trên disk nhưng không có trong plan) và entry orphan — bao phủ 7 thư mục (thêm `memory/` ở v2.0.0) |
| **content-validator** | Kiểm tra chất lượng 9 mục — file rỗng, thiếu ví dụ ✅/❌, mục bắt buộc, cộng với toàn vẹn scaffold L4 memory (ngày heading decision-log, trường bắt buộc failure-pattern, parse nhận biết fence) |
| **pass-json-validator** | Xác minh cấu trúc JSON Pass 1–4 cộng với marker hoàn thành `pass3-complete.json` và `pass4-memory.json` |

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
| `claudeos-core/plan/` | Master Plan backup (~340KB). Dùng `npx claudeos-core refresh` để sync. |
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
# Khôi phục mọi thứ từ Master Plan
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
```

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
Nó gọi `claude -p` 4–8 lần (Pass 1 × N + Pass 2 + Pass 3 + Pass 4). Nằm trong mức sử dụng Claude Code bình thường. Khi `--lang` khác tiếng Anh, đường fallback tĩnh có thể gọi thêm vài `claude -p` để dịch; kết quả được cache trong `claudeos-core/generated/.i18n-cache-<lang>.json` nên các lần chạy sau dùng lại.

**Q: Tôi có nên commit các file được tạo vào Git không?**
Có, khuyến nghị. Team của bạn có thể chia sẻ cùng standard Claude Code. Hãy xem xét thêm `claudeos-core/generated/` vào `.gitignore` (JSON phân tích có thể tạo lại).

**Q: Còn dự án mixed-stack (ví dụ Java backend + React frontend)?**
Được hỗ trợ hoàn toàn. ClaudeOS-Core tự phát hiện cả hai stack, gắn tag domain là `backend` hoặc `frontend`, và dùng prompt phân tích theo stack cho mỗi cái. Pass 2 merge mọi thứ, và Pass 3 tạo cả standard backend và frontend trong một pass.

**Q: Nó có hoạt động với monorepo Turborepo / pnpm workspaces / Lerna không?**
Có. ClaudeOS-Core phát hiện `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, hoặc `package.json#workspaces` và tự động quét file `package.json` của sub-package để tìm dependency framework/ORM/DB. Quét domain bao phủ pattern `apps/*/src/` và `packages/*/src/`. Chạy từ root monorepo.

**Q: Chạy lại thì chuyện gì xảy ra?**
Nếu kết quả Pass 1/2 trước đó tồn tại, một prompt tương tác cho bạn chọn: **Continue** (tiếp tục từ chỗ dừng) hoặc **Fresh** (xóa tất cả và bắt đầu lại). Dùng `--force` để bỏ qua prompt và luôn bắt đầu mới. Pass 3 luôn chạy lại. Các phiên bản trước có thể được khôi phục từ Master Plan.

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
v2.0.0 thêm ba silent-failure guard cho Pass 3 (Guard 3 bao phủ hai biến thể output không đầy đủ: H2 cho `guide/` và H1 cho `standard/skills/plan`). Guard 1 ("partial staged-rules move") và Guard 3 ("incomplete output — missing/empty guide files or missing standard sentinel / empty skills / empty plan") không phụ thuộc vào rule hiện có, nhưng Guard 2 ("zero rules detected") thì có — nó kích hoạt khi Claude bỏ qua directive `staging-override.md` và thử ghi trực tiếp vào `.claude/` (nơi chính sách sensitive-path của Claude Code chặn). Rule cũ từ lần chạy trước sẽ khiến Guard 2 false-negative — nên `--force`/`fresh` xóa `.claude/rules/` để đảm bảo phát hiện sạch. **Sửa rule thủ công sẽ bị mất** dưới `--force`/`fresh`; hãy backup trước nếu cần.

**Q: `claudeos-core/generated/.staged-rules/` là gì và tại sao tồn tại?**
Chính sách sensitive-path của Claude Code từ chối ghi trực tiếp vào `.claude/` từ subprocess `claude -p` (ngay cả với `--dangerously-skip-permissions`). v2.0.0 đi vòng bằng cách cho prompt Pass 3/4 chuyển hướng mọi ghi `.claude/rules/` vào thư mục staging; orchestrator Node.js (không chịu chính sách đó) sau đó di chuyển cây staged vào `.claude/rules/` sau mỗi pass. Điều này trong suốt với người dùng — thư mục được tự tạo, tự dọn, và tự di chuyển. Nếu lần chạy trước crash giữa chừng di chuyển, lần chạy sau xóa staging dir trước khi thử lại.

---

## Cấu Trúc Template

```
pass-prompts/templates/
├── common/                  # header/footer dùng chung + pass4 + staging-override
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

`plan-installer` tự phát hiện các stack của bạn, rồi lắp ráp prompt theo kiểu. NestJS, Vue/Nuxt, Vite SPA và Flask mỗi cái dùng template chuyên dụng với danh mục phân tích đặc thù framework (ví dụ: `@Module`/`@Injectable`/Guards cho NestJS; `<script setup>`/Pinia/useFetch cho Vue; client-side routing/`VITE_` env cho Vite; Blueprint/`app.factory`/Flask-SQLAlchemy cho Flask). Cho dự án multi-stack, `pass1-backend-prompt.md` và `pass1-frontend-prompt.md` riêng biệt được tạo, trong khi `pass3-prompt.md` kết hợp mục tiêu tạo của cả hai stack. Pass 4 dùng template chung `common/pass4.md` (memory scaffolding) bất kể stack.

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

**"Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0)** — Guard 3 (H1) kích hoạt: Claude bị cắt SAU `claudeos-core/guide/` nhưng trước (hoặc trong lúc) `claudeos-core/standard/`, `claudeos-core/skills/`, hoặc `claudeos-core/plan/`. Yêu cầu: (a) `standard/00.core/01.project-overview.md` tồn tại và không rỗng (sentinel được ghi bởi mọi prompt Pass 3 của mọi stack), (b) `skills/` có ≥1 `.md` không rỗng, (c) `plan/` có ≥1 `.md` không rỗng. `database/` và `mcp-guide/` bị loại trừ có chủ đích (một số stack tạo ra 0 file hợp lệ). Đường khôi phục như Guard 3 (H2): chạy lại `init`, hoặc `--force` nếu lỗi vẫn tiếp diễn.

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Log thông tin, không phải lỗi. Khi resume, `init` giờ parse và validate `pass2-merged.json` (yêu cầu ≥5 top-level key, phản chiếu ngưỡng `INSUFFICIENT_KEYS` của `pass-json-validator`). Skeleton `{}` hoặc JSON lỗi từ lần chạy crash trước tự động bị xóa và Pass 2 chạy lại. Không cần hành động thủ công — pipeline tự chữa. Nếu cứ lặp lại, kiểm tra `claudeos-core/generated/pass2-prompt.md` và retry với `--force`.

**"Static fallback failed while translating to lang='ko'" (v2.0.0)** — Khi `--lang` khác tiếng Anh, Pass 4 / static fallback / gap-fill đều yêu cầu CLI `claude` để dịch. Nếu dịch lỗi (CLI chưa xác thực, timeout mạng, hoặc strict validation từ chối output: <40% độ dài, code fence hỏng, mất frontmatter, v.v.), lần chạy abort thay vì âm thầm ghi tiếng Anh. Sửa: đảm bảo `claude` đã xác thực, hoặc chạy lại với `--lang en` để bỏ qua dịch.

**"pass4-memory.json exists but memory/ is empty" (v2.0.0)** — Lần chạy trước đã ghi marker nhưng người dùng (hoặc script dọn dẹp) xóa `claudeos-core/memory/`. CLI tự phát hiện marker cũ này và chạy lại Pass 4 ở lần `init` tiếp theo. Không cần hành động thủ công.

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Log thông tin, không phải lỗi. Nội dung marker Pass 4 giờ được validate (`passNum === 4` + mảng `memoryFiles` không rỗng), không chỉ sự tồn tại. Một lỗi Claude một phần đã phát ra thứ như `{"error":"timeout"}` làm thân marker trước đây sẽ được chấp nhận như thành công mãi mãi; giờ marker bị xóa và Pass 4 tự chạy lại.

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` phát hiện marker cũ (Pass 3: CLAUDE.md bị xóa bên ngoài; Pass 4: memory/ rỗng hoặc thân marker lỗi) và thử xóa, nhưng gọi `unlinkSync` lỗi — thường vì Windows antivirus hoặc file-watcher (editor, IDE indexer) đang giữ file handle. Trước đây điều này bị bỏ qua âm thầm, khiến pipeline bỏ qua pass và dùng lại marker cũ. Giờ nó lỗi rõ ràng. Sửa: đóng mọi editor/AV scanner có thể đang mở file, rồi chạy lại `npx claudeos-core init`.

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — Bạn đang set env var chỉ dành cho test `CLAUDEOS_SKIP_TRANSLATION=1` trong shell (có thể là sót từ setup CI/test) VÀ chọn `--lang` khác tiếng Anh. Env var này short-circuit đường dịch mà static-fallback và gap-fill của Pass 4 phụ thuộc để output không phải tiếng Anh. `init` phát hiện xung đột lúc chọn ngôn ngữ và abort ngay lập tức (thay vì crash giữa Pass-4 với lỗi lồng khó hiểu). Sửa: hoặc `unset CLAUDEOS_SKIP_TRANSLATION` trước khi chạy, hoặc dùng `npx claudeos-core init --lang en`.

---

## Đóng Góp

Đóng góp được hoan nghênh! Các khu vực cần giúp đỡ nhất:

- **Template stack mới** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Tích hợp IDE** — VS Code extension, IntelliJ plugin
- **Template CI/CD** — ví dụ GitLab CI, CircleCI, Jenkins (GitHub Actions đã có — xem `.github/workflows/test.yml`)
- **Độ phủ test** — Mở rộng test suite (hiện tại 489 test trên 24 file test bao phủ scanner, phát hiện stack, domain grouping, plan parsing, tạo prompt, CLI selector, phát hiện monorepo, phát hiện Vite SPA, công cụ xác minh, L4 memory scaffold, xác thực resume Pass 2, Pass 3 Guards 1/2/3 (sentinel H1 + empty-file nhận biết BOM H2 + unlink marker cũ nghiêm ngặt), xác thực nội dung marker Pass 4 + độ nghiêm ngặt unlink marker cũ, guard env-skip dịch + fail-fast sớm + CI workflow, di chuyển staged-rules, fallback dịch lang-aware, và cấu trúc template AI Work Rules)

Xem [`CONTRIBUTING.md`](./CONTRIBUTING.md) để có danh sách đầy đủ các khu vực, code style, commit convention, và hướng dẫn từng bước để thêm template stack mới.

---

## Tác Giả

Tạo bởi **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## License

ISC
