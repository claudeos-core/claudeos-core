# Lệnh CLI

Mọi lệnh, mọi flag, mọi exit code mà ClaudeOS-Core thực sự hỗ trợ.

Trang này là reference. Nếu bạn mới, đọc [Quick Start trong README chính](../../README.vi.md#quick-start) trước.

Mọi lệnh chạy qua `npx claudeos-core <command>` (hoặc `claudeos-core <command>` nếu cài global — xem [manual-installation.md](manual-installation.md)).

> Bản gốc tiếng Anh: [docs/commands.md](../commands.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## Global flags

Các flag này áp dụng cho mọi lệnh:

| Flag | Hiệu ứng |
|---|---|
| `--help` / `-h` | Hiện help. Khi đặt sau lệnh (ví dụ `memory --help`), subcommand tự xử lý help của mình. |
| `--version` / `-v` | In phiên bản đã cài. |
| `--lang <code>` | Ngôn ngữ output. Một trong: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Mặc định: `en`. Hiện chỉ `init` dùng. |
| `--force` / `-f` | Skip prompt resume; xóa kết quả cũ. Hiện chỉ `init` dùng. |

Đó là toàn bộ list flag CLI. **Không có `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run`, v.v.** Nếu bạn thấy chúng trong tài liệu cũ thì chúng không có thật — `bin/cli.js` chỉ parse 4 flag trên.

---

## Quick reference

| Lệnh | Dùng khi |
|---|---|
| `init` | Lần đầu trên một dự án. Sinh tất cả. |
| `lint` | Sau khi sửa thủ công `CLAUDE.md`. Chạy validation cấu trúc. |
| `health` | Trước khi commit, hoặc trong CI. Chạy bốn validator content/path. |
| `restore` | Plan đã lưu → đĩa. (Phần lớn no-op từ v2.1.0; giữ cho tương thích ngược.) |
| `refresh` | Đĩa → plan đã lưu. (Phần lớn no-op từ v2.1.0; giữ cho tương thích ngược.) |
| `validate` | Chạy mode `--check` của plan-validator. (Phần lớn no-op từ v2.1.0.) |
| `memory <sub>` | Bảo trì memory layer: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` được giữ lại vì chúng vô hại trên các dự án không dùng tệp plan legacy. Nếu `plan/` không tồn tại (mặc định v2.1.0+), tất cả đều skip với message informational.

---

## `init` — Sinh bộ tài liệu

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Lệnh chính. Chạy [pipeline 4-pass](architecture.md) từ đầu đến cuối:

1. Scanner sản xuất `project-analysis.json`.
2. Pass 1 phân tích từng nhóm domain.
3. Pass 2 hợp nhất các domain thành bức tranh toàn dự án.
4. Pass 3 sinh CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 scaffold memory layer.

**Ví dụ:**

```bash
# Lần đầu, output tiếng Anh
npx claudeos-core init

# Lần đầu, output tiếng Việt
npx claudeos-core init --lang vi

# Làm lại tất cả từ đầu
npx claudeos-core init --force
```

### Resume safety

`init` là **resume-safe**. Nếu bị gián đoạn (mạng nháy, timeout, Ctrl-C), lần chạy tiếp theo nhặt từ marker pass cuối cùng đã hoàn tất. Marker nằm ở `claudeos-core/generated/`:

- `pass1-<group>.json` — output Pass 1 theo domain
- `pass2-merged.json` — output Pass 2
- `pass3-complete.json` — marker Pass 3 (cũng theo dõi sub-stage nào của split mode đã xong)
- `pass4-memory.json` — marker Pass 4

Nếu một marker bị malformed (ví dụ crash giữa lúc ghi để lại `{"error":"timeout"}`), validator từ chối và pass chạy lại.

Với một Pass 3 dở dang (split mode bị gián đoạn giữa các stage), cơ chế resume kiểm tra body marker — nếu `mode === "split"` và `completedAt` thiếu, Pass 3 được gọi lại và tiếp tục từ stage chưa bắt đầu.

### `--force` làm gì

`--force` xóa:
- Mọi tệp `.json` và `.md` dưới `claudeos-core/generated/` (gồm cả 4 marker pass)
- Thư mục `claudeos-core/generated/.staged-rules/` còn sót nếu lần chạy trước đã crash giữa lúc move
- Mọi thứ dưới `.claude/rules/` (để guard "zero-rules detection" của Pass 3 không false-negative trên rule cũ)

`--force` **không** xóa:
- Tệp `claudeos-core/memory/` (decision log và failure pattern của bạn được giữ)
- Tệp ngoài `claudeos-core/` và `.claude/`

**Chỉnh sửa thủ công lên rule sẽ mất khi dùng `--force`.** Đó là đánh đổi — `--force` tồn tại cho "tôi muốn slate sạch." Nếu muốn giữ chỉnh sửa, chạy lại không kèm `--force`.

### Interactive vs non-interactive

Không có `--lang`, `init` hiện trình chọn ngôn ngữ tương tác (10 lựa chọn, phím mũi tên hoặc nhập số). Trong môi trường non-TTY (CI, input piped), bộ chọn fallback xuống readline, rồi xuống mặc định non-interactive nếu không có input.

Không có `--force`, nếu phát hiện marker pass đã có, `init` hiện prompt Continue / Fresh. Truyền `--force` skip hoàn toàn prompt này.

---

## `lint` — Xác minh cấu trúc `CLAUDE.md`

```bash
npx claudeos-core lint
```

Chạy `claude-md-validator` lên `CLAUDE.md` của dự án. Nhanh — không gọi LLM, chỉ kiểm tra cấu trúc.

**Exit codes:**
- `0` — Pass.
- `1` — Fail. Có ít nhất một vấn đề cấu trúc.

**Kiểm tra gì** (xem [verification.md](verification.md) cho danh sách check ID đầy đủ):

- Số section phải đúng 8.
- Section 4 phải có 3 hoặc 4 sub-section H3.
- Section 6 phải có đúng 3 sub-section H3.
- Section 8 phải có đúng 2 sub-section H3 (Common Rules + L4 Memory) VÀ đúng 2 sub-sub-section H4 (L4 Memory Files + Memory Workflow).
- Mỗi heading section canonical phải chứa token tiếng Anh của nó (ví dụ `Role Definition`, `Memory`) để grep multi-repo hoạt động bất kể `--lang`.
- Mỗi trong 4 tệp memory xuất hiện trong đúng MỘT hàng bảng markdown, giới hạn trong Section 8.

Validator là **language-invariant**: cùng các kiểm tra hoạt động trên CLAUDE.md sinh với `--lang ko`, `--lang ja`, hoặc bất kỳ ngôn ngữ hỗ trợ nào.

Phù hợp cho pre-commit hook và CI.

---

## `health` — Chạy bộ verification

```bash
npx claudeos-core health
```

Điều phối **4 validator** (claude-md-validator chạy riêng qua `lint`):

| Thứ tự | Validator | Tier | Khi fail |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | Nếu fail, `sync-checker` skip. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (nếu manifest thành công). |
| 4 | `content-validator` | advisory | Hiển thị nhưng không chặn. |
| 5 | `pass-json-validator` | warn | Hiển thị nhưng không chặn. |

**Exit codes:**
- `0` — Không có phát hiện mức `fail`. Có thể có warning và advisory.
- `1` — Có ít nhất một phát hiện mức `fail`.

Mức nghiêm trọng 3-tier (fail / warn / advisory) được thêm để các phát hiện `content-validator` (thường có false positive trong layout bất thường) không deadlock pipeline CI.

Chi tiết kiểm tra của từng validator xem [verification.md](verification.md).

---

## `restore` — Áp dụng plan đã lưu lên đĩa (legacy)

```bash
npx claudeos-core restore
```

Chạy `plan-validator` ở mode `--execute`: copy nội dung từ tệp `claudeos-core/plan/*.md` vào các vị trí chúng mô tả.

**Trạng thái v2.1.0:** Sinh master plan đã bị gỡ. `claudeos-core/plan/` không còn được tự động tạo. Nếu `plan/` không tồn tại, lệnh này log message informational và thoát sạch.

Lệnh được giữ cho người dùng tự bảo trì tệp plan cho mục đích backup/restore ad-hoc. Vô hại khi chạy trên dự án v2.1.0+.

Tạo backup `.bak` cho mọi tệp nó ghi đè.

---

## `refresh` — Đồng bộ đĩa với plan đã lưu (legacy)

```bash
npx claudeos-core refresh
```

Đảo ngược của `restore`. Chạy `plan-validator` ở mode `--refresh`: đọc trạng thái hiện tại của tệp đĩa và cập nhật `claudeos-core/plan/*.md` cho khớp.

**Trạng thái v2.1.0:** Giống `restore` — no-op khi `plan/` vắng.

---

## `validate` — Plan ↔ đĩa diff (legacy)

```bash
npx claudeos-core validate
```

Chạy `plan-validator` ở mode `--check`: báo cáo khác biệt giữa `claudeos-core/plan/*.md` và đĩa, nhưng không sửa gì.

**Trạng thái v2.1.0:** No-op khi `plan/` vắng. Hầu hết người dùng nên chạy `health` thay thế, vì nó gọi `plan-validator` cùng các validator khác.

---

## `memory <subcommand>` — Bảo trì memory layer

```bash
npx claudeos-core memory <subcommand>
```

Ba subcommand. Subcommand thao tác trên các tệp `claudeos-core/memory/` được Pass 4 của `init` ghi. Nếu các tệp đó thiếu, mỗi subcommand log `not found` và skip sạch (best-effort tools).

Chi tiết về mô hình memory xem [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Áp dụng compaction 4-stage lên `decision-log.md` và `failure-patterns.md`:

| Stage | Trigger | Hành động |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body thu lại thành "fix" 1-dòng + meta |
| 2 | Heading trùng | Merge (frequencies cộng dồn, body = mới nhất) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Bỏ |
| 4 | Tệp > 400 dòng | Trim các entry non-preserved cũ nhất |

Entry với `importance >= 7`, `lastSeen < 30 days`, hoặc body tham chiếu đường dẫn rule active cụ thể (non-glob) được tự động preserve.

Sau compaction, chỉ section `## Last Compaction` của `compaction.md` được thay — mọi thứ khác (ghi chú thủ công của bạn) được giữ.

### `memory score`

```bash
npx claudeos-core memory score
```

Tính lại điểm importance cho các entry trong `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), cap ở 10
```

Bỏ mọi dòng importance hiện hữu trước khi chèn (ngăn duplicate-line regression). Điểm mới được ghi lại vào body của entry.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Đọc `failure-patterns.md`, lấy entry có frequency ≥ 3, và yêu cầu Claude soạn nội dung `.claude/rules/` đề xuất cho các ứng viên hàng đầu.

Confidence cho mỗi ứng viên:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance mặc định 0; cap ở 6 nếu importance thiếu)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = entry nhắc đường dẫn tệp cụ thể tồn tại trên đĩa.)

Output được **append vào `claudeos-core/memory/auto-rule-update.md`** để bạn xem xét. **Nó không tự động áp dụng** — bạn quyết định đề xuất nào sao chép vào tệp rule thực.

---

## Biến môi trường

| Biến | Hiệu ứng |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Short-circuit đường dịch của memory-scaffold; throw trước khi gọi `claude -p`. Dùng bởi CI và các test phụ thuộc dịch để chúng không cần cài Claude CLI thật. Ngữ nghĩa nghiêm ngặt `=== "1"` — giá trị khác không kích hoạt. |
| `CLAUDEOS_ROOT` | Tự động set bởi `bin/cli.js` thành thư mục gốc dự án người dùng. Nội bộ — đừng override. |

Đó là toàn bộ list. Không có `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR`, v.v. — chúng không tồn tại.

---

## Exit code

| Code | Ý nghĩa |
|---|---|
| `0` | Thành công. |
| `1` | Validation fail (phát hiện mức `fail`) hoặc `InitError` (ví dụ prerequisite thiếu, marker malformed, file lock). |
| Khác | Bubble lên từ tiến trình Node hoặc sub-tool — exception chưa bắt, lỗi ghi, v.v. |

Không có exit code đặc biệt cho "bị gián đoạn" — Ctrl-C chỉ kết thúc tiến trình. Chạy lại `init` và cơ chế resume tiếp quản.

---

## `npm test` chạy gì (cho người đóng góp)

Nếu bạn đã clone repo và muốn chạy bộ test ở local:

```bash
npm test
```

Lệnh này chạy `node tests/*.test.js` trên 33 tệp test. Bộ test dùng runner `node:test` built-in của Node (không Jest, không Mocha) và `node:assert/strict` của Node.

Cho một tệp test đơn:

```bash
node tests/scan-java.test.js
```

CI chạy bộ test trên Linux / macOS / Windows × Node 18 / 20. CI workflow set `CLAUDEOS_SKIP_TRANSLATION=1` để các test phụ thuộc dịch không cần `claude` CLI.

---

## Xem thêm

- [architecture.md](architecture.md) — `init` thực sự làm gì bên trong
- [verification.md](verification.md) — validator kiểm tra gì
- [memory-layer.md](memory-layer.md) — các subcommand `memory` thao tác trên cái gì
- [troubleshooting.md](troubleshooting.md) — khi lệnh fail
