# ClaudeOS-Core

**Công cụ duy nhất đọc mã nguồn trước, xác nhận stack và pattern bằng phân tích deterministic, sau đó tạo quy tắc Claude Code phù hợp chính xác với dự án của bạn.**

```bash
npx claudeos-core init
```

ClaudeOS-Core đọc codebase của bạn, trích xuất mọi pattern tìm thấy và tạo ra bộ Standards, Rules, Skills và Guides hoàn chỉnh được tùy chỉnh cho _dự án của bạn_. Sau đó, khi bạn nói với Claude Code "Tạo CRUD cho đơn hàng", nó sẽ tạo ra code khớp chính xác với các pattern hiện có của bạn.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Tại sao ClaudeOS-Core?

> Con người mô tả dự án → LLM tạo tài liệu

ClaudeOS-Core:

> Code phân tích source → Code xây dựng prompt tùy chỉnh → LLM tạo tài liệu → Code xác minh đầu ra

### Vấn đề cốt lõi: LLM đoán. Code xác nhận.

Khi bạn yêu cầu Claude "phân tích dự án này", nó **đoán** stack, ORM, cấu trúc domain.

**ClaudeOS-Core không đoán.** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### Kết quả

Các tool khác tạo tài liệu "tốt một cách chung chung".
ClaudeOS-Core tạo tài liệu biết rằng dự án sử dụng `ApiResponse.ok()` (không phải `ResponseEntity.success()`), MyBatis XML mapper nằm ở `src/main/resources/mybatis/mappers/` — vì nó đã đọc code thực tế.

### Before & After

**Không có ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**Có ClaudeOS-Core**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

Sự khác biệt này tích lũy. 10 task/ngày × 20 phút tiết kiệm = **hơn 3 giờ/ngày**.

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
| **Angular** | `package.json`, `angular.json` | 12 danh mục, 78 mục con |

Tự động phát hiện: ngôn ngữ & phiên bản, framework & phiên bản, ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, v.v.), database (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), package manager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), kiến trúc (CQRS, BFF — phát hiện từ tên module), cấu trúc multi-module (từ settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

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
| 1 | Quét `settings.gradle.kts` tìm `include()` | Tìm thấy 14 module |
| 2 | Phát hiện loại module từ tên | `reservation-command-server` → type: `command` |
| 3 | Trích xuất domain từ tên module | `reservation-command-server` → domain: `reservation` |
| 4 | Nhóm cùng domain qua các module | `reservation-command-server` + `common-query-server` → 1 domain |
| 5 | Phát hiện kiến trúc | Có module `command` + `query` → CQRS |

Loại module hỗ trợ: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Thư viện chia sẻ (`shared-lib`, `integration-lib`) được phát hiện như domain đặc biệt.

### Phát Hiện Domain Frontend

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split**: Phát hiện pattern `client.tsx`, theo dõi tách Server/Client
- **Config fallback**: Phát hiện Next.js/Vite/Nuxt từ file config (hỗ trợ monorepo)
- **Fallback thư mục sâu**: Với dự án React/CRA/Vite/Vue/RN, quét `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` ở mọi độ sâu

---

## Bắt Đầu Nhanh

### Yêu Cầu

- **Node.js** v18+
- **Claude Code CLI** (đã cài đặt & xác thực)

### Cài Đặt

```bash
cd /your/project/root

# Cách A: npx (khuyến nghị — không cần cài đặt)
npx claudeos-core init

# Cách B: cài đặt global
npm install -g claudeos-core
claudeos-core init

# Cách C: devDependency của dự án
npm install --save-dev claudeos-core
npx claudeos-core init

# Cách D: git clone (cho phát triển/đóng góp)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Đa nền tảng (PowerShell, CMD, Bash, Zsh — mọi terminal)
node claudeos-core-tools/bin/cli.js init

# Chỉ Linux/macOS (chỉ Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Ngôn ngữ đầu ra (10 ngôn ngữ)

Khi chạy `init` không có `--lang`, bộ chọn tương tác bằng phím mũi tên hoặc phím số sẽ xuất hiện:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Các file được tạo (CLAUDE.md, Standards, Rules,
  Skills, Guides) sẽ được viết bằng tiếng Việt.

     1. en     — English
     ...
  ❯  6. vi     — Tiếng Việt (Vietnamese)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

Mô tả thay đổi sang ngôn ngữ tương ứng khi di chuyển. Bỏ qua bộ chọn:

```bash
npx claudeos-core init --lang vi    # Tiếng Việt
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **Lưu ý:** Chỉ thay đổi ngôn ngữ của file tài liệu được tạo. Phân tích mã (Pass 1–2) luôn chạy bằng tiếng Anh; chỉ kết quả tạo (Pass 3) được viết bằng ngôn ngữ đã chọn.

Chỉ vậy thôi. Sau 5–18 phút, tất cả tài liệu được tạo và sẵn sàng sử dụng. CLI hiển thị thời gian mỗi Pass và tổng thời gian trong banner hoàn thành.

### Cài Đặt Thủ Công Từng Bước

Nếu bạn muốn kiểm soát hoàn toàn từng giai đoạn — hoặc nếu pipeline tự động thất bại ở bước nào đó — bạn có thể chạy từng bước thủ công. Điều này cũng hữu ích để hiểu cách ClaudeOS-Core hoạt động bên trong.

#### Step 1: Clone và cài đặt dependencies

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Tạo cấu trúc thư mục

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: Chạy plan-installer (phân tích dự án)

Quét dự án, phát hiện stack, tìm domain, chia nhóm và tạo prompt.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Đầu ra (`claudeos-core/generated/`):**
- `project-analysis.json` — stack phát hiện, domain, thông tin frontend
- `domain-groups.json` — nhóm domain cho Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompt phân tích
- `pass2-prompt.md` — prompt hợp nhất
- `pass3-prompt.md` — prompt tạo

Bạn có thể kiểm tra các file này để xác minh độ chính xác phát hiện trước khi tiếp tục.

#### Step 4: Pass 1 — Phân tích code sâu theo nhóm domain

Chạy Pass 1 cho mỗi nhóm domain. Kiểm tra `domain-groups.json` để biết số nhóm.

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# Đối với nhóm frontend, sử dụng pass1-frontend-prompt.md
```

**Xác minh:** `ls claudeos-core/generated/pass1-*.json` phải hiển thị một JSON cho mỗi nhóm.

#### Step 5: Pass 2 — Hợp nhất kết quả phân tích

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `claudeos-core/generated/pass2-merged.json` phải tồn tại với 9+ key cấp cao nhất.

#### Step 6: Pass 3 — Tạo tất cả tài liệu

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Xác minh:** `CLAUDE.md` phải tồn tại ở thư mục gốc dự án.

#### Step 7: Chạy công cụ xác thực

```bash
# Tạo metadata (bắt buộc trước các kiểm tra khác)
node claudeos-core-tools/manifest-generator/index.js

# Chạy tất cả kiểm tra
node claudeos-core-tools/health-checker/index.js

# Hoặc chạy kiểm tra riêng lẻ:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: Xác minh kết quả

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Mẹo:** Nếu bước nào thất bại, bạn có thể chạy lại chỉ bước đó. Kết quả Pass 1/2 được cache — nếu `pass1-N.json` hoặc `pass2-merged.json` đã tồn tại, pipeline tự động sẽ bỏ qua. Dùng `npx claudeos-core init --force` để xóa kết quả trước và bắt đầu lại từ đầu.

### Bắt Đầu Sử Dụng

```
# Trong Claude Code — chỉ cần nói tự nhiên:
"Tạo CRUD cho domain đơn hàng"
"Thêm API xác thực người dùng"
"Refactor code này theo pattern của dự án"

# Claude Code tự động tham chiếu Standards, Rules và Skills đã tạo.
```

---

## Cách Hoạt Động — Pipeline 3-Pass

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Cài dependencies (~10s)
    ├── [2] Cấu trúc thư mục              ← Tạo folders (~1s)
    ├── [3] plan-installer (Node.js)       ← Quét dự án (~5s)
    │       ├── Tự động phát hiện stack (hỗ trợ multi-stack)
    │       ├── Trích xuất danh sách domain (gắn tag: backend/frontend)
    │       ├── Phân chia nhóm domain (theo loại)
    │       └── Chọn prompt theo stack (theo loại)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Phân tích code chuyên sâu (~2-8 phút)
    │       ├── ⚙️ Nhóm backend → prompt phân tích backend
    │       └── 🎨 Nhóm frontend → prompt phân tích frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Hợp nhất phân tích (~1 phút)
    │       └── Tổng hợp TẤT CẢ kết quả Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Tạo toàn bộ file (~3-5 phút)
    │       └── Prompt kết hợp (mục tiêu backend + frontend)
    │
    └── [7] Xác thực                       ← Tự động chạy health checker
```

### Tại Sao 3 Pass?

**Pass 1** là pass duy nhất đọc mã nguồn. Nó chọn file đại diện cho mỗi domain và trích xuất pattern trên 55–95 danh mục phân tích (theo stack). Với dự án lớn, Pass 1 chạy nhiều lần — mỗi nhóm domain một lần. Trong dự án multi-stack (ví dụ: Java backend + React frontend), backend và frontend sử dụng **prompt phân tích riêng biệt** phù hợp với từng stack.

**Pass 2** hợp nhất tất cả kết quả Pass 1 thành phân tích thống nhất: pattern chung (100% chia sẻ), pattern đa số (50%+ chia sẻ), pattern riêng domain, anti-pattern theo mức độ nghiêm trọng và các mối quan tâm xuyên suốt (đặt tên, bảo mật, DB, testing, logging, hiệu suất).

**Pass 3** lấy phân tích đã hợp nhất và tạo toàn bộ hệ sinh thái file. Nó không bao giờ đọc mã nguồn — chỉ đọc JSON phân tích. Trong chế độ multi-stack, prompt tạo file kết hợp mục tiêu backend và frontend để tạo cả hai bộ tiêu chuẩn trong một pass duy nhất.

---

## Cấu Trúc File Được Tạo

```
your-project/
│
├── CLAUDE.md                          ← Điểm vào Claude Code
│
├── .claude/
│   └── rules/                         ← Rules kích hoạt bằng Glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Rules nhắc nhở đồng bộ
│
├── claudeos-core/                     ← Thư mục đầu ra chính
│   ├── generated/                     ← JSON phân tích + prompt động
│   ├── standard/                      ← Tiêu chuẩn code (15-19 file)
│   ├── skills/                        ← Skills scaffolding CRUD
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 file)
│   ├── plan/                          ← Master Plans (backup/khôi phục)
│   ├── database/                      ← Schema DB, hướng dẫn migration
│   └── mcp-guide/                     ← Hướng dẫn tích hợp MCP server
│
└── claudeos-core-tools/               ← Bộ công cụ này (không chỉnh sửa)
```

Mỗi file tiêu chuẩn bao gồm ví dụ ✅ đúng, ví dụ ❌ sai và bảng tóm tắt rules — tất cả được trích xuất từ pattern code thực tế của bạn, không phải template chung.

---

## Tự Động Mở Rộng Theo Quy Mô Dự Án

| Quy Mô | Số Domain | Số Lần Pass 1 | Tổng `claude -p` | Thời Gian Ước Tính |
|---|---|---|---|---|
| Nhỏ | 1–4 | 1 | 3 | ~5 phút |
| Trung Bình | 5–8 | 2 | 4 | ~8 phút |
| Lớn | 9–16 | 3–4 | 5–6 | ~12 phút |
| Rất Lớn | 17+ | 5+ | 7+ | ~18 phút+ |

Với dự án multi-stack (ví dụ: Java + React), domain backend và frontend được đếm chung. Dự án có 6 domain backend + 4 frontend = tổng 10, mở rộng theo mức "Lớn".

---

## Công Cụ Xác Thực

ClaudeOS-Core bao gồm 5 công cụ xác thực tích hợp, chạy tự động sau khi tạo:

```bash
# Chạy tất cả kiểm tra cùng lúc (khuyến nghị)
npx claudeos-core health

# Lệnh riêng lẻ
npx claudeos-core validate     # So sánh Plan ↔ đĩa
npx claudeos-core refresh      # Đồng bộ Đĩa → Plan
npx claudeos-core restore      # Khôi phục Plan → Đĩa
```

| Công Cụ | Chức Năng |
|---|---|
| **manifest-generator** | Xây dựng JSON metadata (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | So sánh khối `<file>` của Master Plan với đĩa — 3 chế độ: check, refresh, restore |
| **sync-checker** | Phát hiện file chưa đăng ký (trên đĩa nhưng không trong plan) và mục mồ côi |
| **content-validator** | Xác thực chất lượng file — file trống, thiếu ví dụ ✅/❌, phần bắt buộc |
| **pass-json-validator** | Xác thực cấu trúc JSON Pass 1–3, khóa bắt buộc và tính đầy đủ của phần |

---

## Claude Code Sử Dụng Tài Liệu Như Thế Nào

Đây là cách Claude Code thực sự đọc tài liệu được ClaudeOS-Core tạo ra:

### File được đọc tự động

| File | Thời điểm | Đảm bảo |
|---|---|---|
| `CLAUDE.md` | Mỗi lần bắt đầu cuộc trò chuyện | Luôn luôn |
| `.claude/rules/00.core/*` | Khi chỉnh sửa file (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/10.backend/*` | Khi chỉnh sửa file (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/30.security-db/*` | Khi chỉnh sửa file (`paths: ["**/*"]`) | Luôn luôn |
| `.claude/rules/40.infra/*` | Chỉ khi chỉnh sửa file config/infra (paths giới hạn) | Có điều kiện |
| `.claude/rules/50.sync/*` | Chỉ khi chỉnh sửa file claudeos-core (paths giới hạn) | Có điều kiện |

### File được đọc theo yêu cầu qua tham chiếu trong quy tắc

Mỗi file quy tắc liên kết đến standard tương ứng trong phần `## Reference`. Claude chỉ đọc standard liên quan đến tác vụ hiện tại:

- `claudeos-core/standard/**` — Pattern coding, ví dụ ✅/❌, quy tắc đặt tên
- `claudeos-core/database/**` — DB schema (cho query, mapper, migration)

`00.standard-reference.md` đóng vai trò thư mục để khám phá các standard không có quy tắc tương ứng.

### File KHÔNG đọc (tiết kiệm context)

Được loại trừ rõ ràng qua phần `DO NOT Read` của quy tắc standard-reference:

| Thư mục | Lý do loại trừ |
|---|---|
| `claudeos-core/plan/` | Backup Master Plan (~340KB). Dùng `npx claudeos-core refresh` để đồng bộ. |
| `claudeos-core/generated/` | JSON metadata build. Không dùng cho coding. |
| `claudeos-core/guide/` | Hướng dẫn onboarding cho người dùng. |
| `claudeos-core/mcp-guide/` | Tài liệu MCP server. Không dùng cho coding. |

---

## Quy Trình Làm Việc Hàng Ngày

### Sau Khi Cài Đặt

```
# Sử dụng Claude Code bình thường — nó tự động tham chiếu tiêu chuẩn:
"Tạo CRUD cho domain đơn hàng"
"Thêm API cập nhật hồ sơ người dùng"
"Refactor code này theo pattern của dự án"
```

### Sau Khi Chỉnh Sửa Thủ Công Standards

```bash
# Sau khi chỉnh sửa file standard hoặc rules:
npx claudeos-core refresh

# Xác minh mọi thứ nhất quán
npx claudeos-core health
```

### Khi Tài Liệu Bị Hỏng

```bash
# Khôi phục mọi thứ từ Master Plan
npx claudeos-core restore
```

### Tích Hợp CI/CD

```yaml
# Ví dụ GitHub Actions
- run: npx claudeos-core validate
# Mã thoát 1 chặn PR
```

---

## Khác Biệt Gì?

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**H: Nó có sửa đổi mã nguồn của tôi không?**
Không. Chỉ tạo `CLAUDE.md`, `.claude/rules/` và `claudeos-core/`. Code hiện có của bạn không bao giờ bị sửa đổi.

**H: Chi phí bao nhiêu?**
Gọi `claude -p` từ 3–7 lần. Nằm trong phạm vi sử dụng bình thường của Claude Code.

**H: Có nên commit file được tạo vào Git không?**
Khuyến nghị. Team của bạn có thể chia sẻ cùng tiêu chuẩn Claude Code. Cân nhắc thêm `claudeos-core/generated/` vào `.gitignore` (JSON phân tích có thể tạo lại).

**H: Dự án multi-stack (ví dụ: Java backend + React frontend) thì sao?**
Hỗ trợ hoàn toàn. ClaudeOS-Core tự phát hiện cả hai stack, gắn tag domain là `backend` hoặc `frontend`, và sử dụng prompt phân tích riêng cho từng loại. Pass 2 hợp nhất tất cả, Pass 3 tạo tiêu chuẩn cho cả backend và frontend trong một pass duy nhất.

**H: Chạy lại thì sao?**
Nếu kết quả Pass 1/2 trước đó tồn tại, prompt tương tác cho phép bạn chọn: **Continue** (tiếp tục từ nơi dừng lại) hoặc **Fresh** (xóa tất cả và bắt đầu lại). Dùng `--force` để bỏ qua prompt và luôn bắt đầu lại từ đầu. Pass 3 luôn chạy lại. Phiên bản trước có thể khôi phục từ Master Plans.

**H: Có hoạt động với Turborepo / pnpm workspaces / Lerna monorepo không?**
Có. ClaudeOS-Core phát hiện `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, hoặc `package.json#workspaces` và tự động quét file `package.json` của sub-package để tìm dependency framework/ORM/DB. Quét domain bao gồm pattern `apps/*/src/` và `packages/*/src/`. Chạy từ thư mục gốc monorepo.

**H: NestJS có template riêng hay dùng chung với Express?**
NestJS sử dụng template `node-nestjs` chuyên dụng với các danh mục phân tích riêng cho NestJS: decorator `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, DI container, pattern CQRS, và `Test.createTestingModule`. Dự án Express sử dụng template `node-express` riêng biệt.

**H: Dự án Vue / Nuxt thì sao?**
Vue/Nuxt sử dụng template `vue-nuxt` chuyên dụng bao gồm Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, Nitro server routes, và `@nuxt/test-utils`. Dự án Next.js/React sử dụng template `node-nextjs`.

**H: Có hỗ trợ Kotlin không?**
Có. ClaudeOS-Core tự động phát hiện Kotlin từ `build.gradle.kts` hoặc kotlin plugin trong `build.gradle`. Sử dụng template chuyên dụng `kotlin-spring` để phân tích các pattern đặc thù của Kotlin (data class, sealed class, coroutine, extension function, MockK, v.v.).

**H: Kiến trúc CQRS / BFF thì sao?**
Hỗ trợ đầy đủ cho các dự án Kotlin multi-module. ClaudeOS-Core đọc `settings.gradle.kts`, phát hiện loại module (command, query, bff, integration) từ tên module, và nhóm các module Command/Query cùng domain lại. Các standard được tạo bao gồm quy tắc riêng cho command controller vs query controller, pattern BFF/Feign và quy ước giao tiếp giữa các module.

**H: Gradle multi-module monorepo thì sao?**
ClaudeOS-Core quét tất cả submodule (`**/src/main/kotlin/**/*.kt`) bất kể độ sâu lồng nhau. Loại module được suy luận từ quy ước đặt tên (ví dụ: `reservation-command-server` → domain: `reservation`, type: `command`). Thư viện chia sẻ (`shared-lib`, `integration-lib`) cũng được phát hiện.

---

## Cấu Trúc Template

```
pass-prompts/templates/
├── common/                  # Header/footer chung
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` tự phát hiện stack của bạn, sau đó lắp ráp prompt theo loại. NestJS và Vue/Nuxt sử dụng template chuyên dụng với các danh mục phân tích riêng cho từng framework (ví dụ: `@Module`/`@Injectable`/Guards cho NestJS, `<script setup>`/Pinia/useFetch cho Vue). Với dự án multi-stack, `pass1-backend-prompt.md` và `pass1-frontend-prompt.md` được tạo riêng, trong khi `pass3-prompt.md` kết hợp mục tiêu tạo file của cả hai stack.

---

## Hỗ Trợ Monorepo

ClaudeOS-Core tự động phát hiện thiết lập monorepo JS/TS và quét các sub-package để tìm dependency.

**Monorepo marker được hỗ trợ** (tự động phát hiện):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Chạy từ thư mục gốc monorepo** — ClaudeOS-Core đọc `apps/*/package.json` và `packages/*/package.json` để tìm dependency framework/ORM/DB trong các sub-package:

```bash
cd my-monorepo
npx claudeos-core init
```

**Những gì được phát hiện:**
- Dependency từ `apps/web/package.json` (ví dụ: `next`, `react`) → frontend stack
- Dependency từ `apps/api/package.json` (ví dụ: `express`, `prisma`) → backend stack
- Dependency từ `packages/db/package.json` (ví dụ: `drizzle-orm`) → ORM/DB
- Đường dẫn workspace tùy chỉnh từ `pnpm-workspace.yaml` (ví dụ: `services/*`)

**Quét domain cũng bao gồm cấu trúc monorepo:**
- `apps/api/src/modules/*/` và `apps/api/src/*/` cho domain backend
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` cho domain frontend
- `packages/*/src/*/` cho domain package chia sẻ

```
my-monorepo/                    ← Chạy ở đây: npx claudeos-core init
├── turbo.json                  ← Tự động phát hiện là Turborepo
├── apps/
│   ├── web/                    ← Next.js phát hiện từ apps/web/package.json
│   │   ├── app/dashboard/      ← Domain frontend được phát hiện
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express phát hiện từ apps/api/package.json
│       ├── src/modules/users/  ← Domain backend được phát hiện
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle phát hiện từ packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Lưu ý:** Với monorepo Kotlin/Java, phát hiện multi-module sử dụng `settings.gradle.kts` (xem [Phát Hiện Domain Kotlin Multi-Module](#phát-hiện-domain-kotlin-multi-module) ở trên) và không yêu cầu JS monorepo marker.

## Xử Lý Sự Cố

**"claude: command not found"** — Claude Code CLI chưa được cài đặt hoặc không nằm trong PATH. Xem [tài liệu Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — Phiên bản Node.js có thể quá thấp. Yêu cầu v18+.

**"0 domains detected"** — Cấu trúc dự án có thể không chuẩn. Xem pattern phát hiện trong [tài liệu tiếng Hàn](./README.ko.md#트러블슈팅) cho stack của bạn.

**Dự án Kotlin "phát hiện 0 domain"** — Đảm bảo thư mục gốc có `build.gradle.kts` (hoặc `build.gradle` với kotlin plugin), và file nguồn nằm dưới `**/src/main/kotlin/`. Với dự án multi-module, `settings.gradle.kts` phải chứa câu lệnh `include()`. Dự án Kotlin đơn module (không có `settings.gradle`) cũng được hỗ trợ — domain được trích xuất từ cấu trúc package/class dưới `src/main/kotlin/`.

**"Ngôn ngữ phát hiện là java thay vì kotlin"** — ClaudeOS-Core kiểm tra `build.gradle(.kts)` gốc trước, sau đó kiểm tra file build của submodule. Đảm bảo ít nhất một file chứa `kotlin("jvm")` hoặc `org.jetbrains.kotlin`.

**"Không phát hiện CQRS"** — Phát hiện kiến trúc phụ thuộc vào tên module chứa từ khóa `command` và `query`. Nếu module của bạn dùng tên khác, có thể điều chỉnh thủ công các prompt đã tạo.

---

## Đóng Góp

Chào đón mọi đóng góp! Các lĩnh vực cần hỗ trợ nhất:

- **Template stack mới** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Hỗ trợ monorepo sâu** — Root sub-project riêng, phát hiện workspace
- **Độ phủ test** — Mở rộng bộ test (hiện tại 256 test bao gồm tất cả scanner, phát hiện stack, nhóm domain, phân tích plan, tạo prompt, bộ chọn CLI, phát hiện monorepo và công cụ xác thực)

---

## Tác Giả

Được tạo bởi **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Giấy Phép

ISC
