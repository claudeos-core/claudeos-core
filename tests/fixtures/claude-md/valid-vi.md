# CLAUDE.md — sample-project

> Mẫu CLAUDE.md hợp lệ bằng tiếng Việt cho kiểm thử validator.

## 1. Role Definition (Định nghĩa Vai trò)

Với tư cách là nhà phát triển cấp cao của kho lưu trữ này, bạn chịu trách nhiệm viết, sửa đổi và xem xét mã. Các phản hồi phải được viết bằng tiếng Việt.
Máy chủ REST API Node.js Express trên kho lưu trữ quan hệ PostgreSQL.

## 2. Project Overview (Tổng quan Dự án)

| Mục | Giá trị |
|---|---|
| Ngôn ngữ | TypeScript 5.4 |
| Framework | Express 4.19 |
| Công cụ xây dựng | tsc |
| Trình quản lý gói | npm |
| Cổng máy chủ | 3000 |
| Cơ sở dữ liệu | PostgreSQL 15 |
| ORM | Prisma 5 |
| Trình chạy kiểm thử | Vitest |

## 3. Build & Run Commands (Lệnh Xây dựng và Chạy)

```bash
npm install
npm run dev
npm run build
npm test
```

Coi scripts của `package.json` là nguồn tin duy nhất.

## 4. Core Architecture (Kiến trúc Cốt lõi)

### Cấu trúc Tổng thể

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### Luồng Dữ liệu

1. Yêu cầu đến router.
2. Middleware xác thực.
3. Service thực thi logic nghiệp vụ.
4. Prisma đọc/ghi DB.
5. Phản hồi được tuần tự hóa.

### Mẫu Cốt lõi

- **Phân lớp**: router → service → repository.
- **Xác thực DTO**: các lược đồ zod ở biên router.
- **Middleware lỗi**: xử lý lỗi tập trung.

## 5. Directory Structure (Cấu trúc Thư mục)

```
sample-project/
├─ src/
└─ tests/
```

**Tự động tạo**: không có.
**Phạm vi kiểm thử**: `tests/` phản chiếu `src/`.
**Đầu ra xây dựng**: `dist/`.

## 6. Standard / Rules / Skills Reference (Tham chiếu Standard / Rules / Skills)

### Standard (Nguồn tin Duy nhất)

| Đường dẫn | Mô tả |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Tổng quan dự án |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | Hướng dẫn viết tài liệu |

### Rules (Lan can Tự động tải)

| Đường dẫn | Mô tả |
|---|---|
| `.claude/rules/00.core/*` | Quy tắc cốt lõi |
| `.claude/rules/60.memory/*` | Lan can bộ nhớ L4 |

### Skills (Quy trình Tự động)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (KHÔNG Đọc)

| Đường dẫn | Lý do |
|---|---|
| `claudeos-core/guide/` | Tài liệu hướng đến con người |
| `dist/` | Đầu ra xây dựng |
| `node_modules/` | Phụ thuộc |

## 8. Common Rules & Memory (L4) (Quy tắc Chung và Bộ nhớ (L4))

### Quy tắc Chung (tự động tải trên mỗi chỉnh sửa)

| Tệp Quy tắc | Vai trò | Thực thi Cốt lõi |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Quy tắc viết tài liệu | paths bắt buộc, không hardcoding |
| `.claude/rules/00.core/52.ai-work-rules.md` | Quy tắc làm việc AI | dựa trên sự thật, Read trước chỉnh sửa |

Để hướng dẫn chi tiết, Đọc `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### Bộ nhớ L4 (tham chiếu theo yêu cầu)

Ngữ cảnh dài hạn (quyết định · thất bại · nén · đề xuất tự động) được lưu trữ trong `claudeos-core/memory/`.
Khác với các quy tắc tự động tải qua glob `paths`, lớp này được tham chiếu **theo yêu cầu**.

#### Tệp Bộ nhớ L4

| Tệp | Mục đích | Hành vi |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Lý do của các quyết định thiết kế | Chỉ nối thêm. Lướt xem khi bắt đầu phiên. |
| `claudeos-core/memory/failure-patterns.md` | Lỗi lặp lại | Tìm kiếm khi bắt đầu phiên. |
| `claudeos-core/memory/compaction.md` | Chính sách nén 4 giai đoạn | Chỉ sửa đổi khi chính sách thay đổi. |
| `claudeos-core/memory/auto-rule-update.md` | Đề xuất thay đổi quy tắc | Xem xét và chấp nhận. |

#### Quy trình Bộ nhớ

1. Quét failure-patterns khi bắt đầu phiên.
2. Lướt xem các quyết định gần đây.
3. Ghi lại các quyết định mới dưới dạng nối thêm.
4. Đăng ký lỗi lặp lại với pattern-id.
5. Chạy compact khi các tệp gần đạt 400 dòng.
6. Xem xét các đề xuất rule-update.
