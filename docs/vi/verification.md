# Verification

Sau khi Claude hoàn tất sinh tài liệu, code xác minh output qua **5 validator độc lập**. Không validator nào gọi LLM, mọi kiểm tra đều deterministic.

Trang này nói rõ mỗi validator kiểm tra gì, mức nghiêm trọng hoạt động ra sao, và cách đọc output.

> Bản gốc tiếng Anh: [docs/verification.md](../verification.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Vì sao cần xác minh sau khi sinh

LLM là non-deterministic. Ngay cả khi prompt tiêm sự kiện ([allowlist đường dẫn nguồn](architecture.md#prompt-tiêm-sự-kiện-ngăn-hallucination)), Claude vẫn:

- Bỏ một section bắt buộc dưới áp lực context.
- Trích đường dẫn gần đúng nhưng không có trong allowlist (ví dụ `src/feature/routers/featureRoutePath.ts` bịa từ thư mục cha + tên hằng TypeScript).
- Sinh cross-reference không nhất quán giữa standards và rules.
- Khai báo lại nội dung Section 8 ở chỗ khác của CLAUDE.md.

Validator bắt các output xấu lặng lẽ này trước khi tài liệu giao đi.

---

## 5 validator

### 1. `claude-md-validator` — bất biến cấu trúc

Xác minh `CLAUDE.md` với một tập kiểm tra cấu trúc (bảng dưới liệt kê các họ check ID; tổng số ID báo cáo riêng có thể thay đổi vì `checkSectionsHaveContent` và `checkCanonicalHeadings` phát một ID cho mỗi section). Nằm ở `claude-md-validator/`.

**Chạy qua:**
```bash
npx claudeos-core lint
```

(Không chạy bởi `health` — xem [Vì sao hai entry point](#vì-sao-hai-entry-point-lint-vs-health) bên dưới.)

**Kiểm tra gì:**

| Check ID | Cưỡng chế gì |
|---|---|
| `S1` | Số section đúng 8 |
| `S2-N` | Mỗi section có ít nhất 2 dòng nội dung không rỗng |
| `S-H3-4` | Section 4 có 3 hoặc 4 sub-section H3 |
| `S-H3-6` | Section 6 có đúng 3 sub-section H3 |
| `S-H3-8` | Section 8 có đúng 2 sub-section H3 |
| `S-H4-8` | Section 8 có đúng 2 heading H4 (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Mỗi trong 4 tệp memory (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) xuất hiện trong đúng MỘT hàng bảng markdown |
| `F2-<file>` | Hàng bảng tệp memory bị giới hạn trong Section 8 |
| `T1-1` đến `T1-8` | Mỗi heading section `## N.` chứa token canonical tiếng Anh tương ứng (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`), khớp substring không phân biệt hoa thường |

**Vì sao language-invariant:** validator không bao giờ khớp văn bản heading đã dịch. Nó chỉ khớp cấu trúc markdown (cấp heading, count, thứ tự) và token canonical tiếng Anh. Cùng bộ kiểm tra này pass cho CLAUDE.md sinh ở bất kỳ ngôn ngữ nào trong 10 ngôn ngữ hỗ trợ.

**Ý nghĩa thực tế:** một CLAUDE.md sinh với `--lang ja` và một bản sinh với `--lang en` trông khác hẳn nhau với mắt người, nhưng `claude-md-validator` cho ra verdict pass/fail byte-for-byte y hệt trên cả hai. Khỏi tốn công bảo trì dictionary theo ngôn ngữ.

### 2. `content-validator` — kiểm tra path & manifest

Xác minh **nội dung** các tệp đã sinh (không phải cấu trúc CLAUDE.md). Nằm ở `content-validator/`.

**10 kiểm tra** (9 cái đầu gắn nhãn `[N/9]` trong output console, cái thứ 10 thêm sau và gắn nhãn `[10/10]`; sự bất đối xứng này giữ lại trong code để các grep CI cũ vẫn khớp):

| Check | Cưỡng chế gì |
|---|---|
| `[1/9]` CLAUDE.md tồn tại, ≥100 ký tự, chứa các từ khóa section bắt buộc (10-language aware) |
| `[2/9]` Tệp `.claude/rules/**/*.md` có YAML frontmatter với key `paths:`, không có tệp rỗng |
| `[3/9]` Tệp `claudeos-core/standard/**/*.md` ≥200 ký tự và chứa ví dụ ✅/❌ + một bảng markdown (standards Kotlin còn kiểm tra block ` ```kotlin `) |
| `[4/9]` Tệp `claudeos-core/skills/**/*.md` không rỗng; orchestrator + MANIFEST hiện diện |
| `[5/9]` `claudeos-core/guide/` có đủ 9 tệp kỳ vọng, mỗi cái không rỗng (kiểm tra rỗng nhận biết BOM) |
| `[6/9]` Tệp `claudeos-core/plan/` không rỗng (informational từ v2.1.2, vì `plan/` không còn tạo tự động) |
| `[7/9]` Tệp `claudeos-core/database/` tồn tại (warning nếu thiếu) |
| `[8/9]` Tệp `claudeos-core/mcp-guide/` tồn tại (warning nếu thiếu) |
| `[9/9]` `claudeos-core/memory/` 4 tệp tồn tại + xác minh cấu trúc (decision-log ngày ISO, trường bắt buộc của failure-pattern, marker `## Last Compaction` của compaction) |
| `[10/10]` Xác minh đường dẫn được trích + MANIFEST drift (3 sub-class — xem dưới) |

**Sub-class của Check `[10/10]`:**

| Class | Bắt cái gì |
|---|---|
| `STALE_PATH` | Bất kỳ tham chiếu `src/...\.(ts|tsx|js|jsx)` nào trong `.claude/rules/**` hoặc `claudeos-core/standard/**` phải resolve đến tệp thật. Block code có fence và đường dẫn placeholder (`src/{domain}/feature.ts`) loại trừ. |
| `STALE_SKILL_ENTRY` | Mỗi đường dẫn skill đăng ký trong `claudeos-core/skills/00.shared/MANIFEST.md` phải tồn tại trên đĩa. |
| `MANIFEST_DRIFT` | Mỗi skill đã đăng ký phải được nhắc trong `CLAUDE.md` (kèm **ngoại lệ orchestrator/sub-skill**: Pass 3b viết Section 6 trước khi Pass 3c tạo sub-skills, nên liệt kê mọi sub-skill ngay từ đầu là không khả thi). |

Ngoại lệ orchestrator/sub-skill: sub-skill đăng ký tại `{category}/{parent-stem}/{NN}.{name}.md` coi như đã covered khi orchestrator tại `{category}/*{parent-stem}*.md` được nhắc trong CLAUDE.md.

**Severity:** content-validator chạy ở mức **advisory**, hiển thị trong output nhưng không chặn CI. Lý do: chạy lại Pass 3 không đảm bảo sửa được hallucination LLM, nên chặn sẽ làm người dùng kẹt trong vòng lặp `--force`. Tín hiệu phát hiện (exit khác 0 + entry trong `stale-report`) đủ cho pipeline CI và triage thủ công.

### 3. `pass-json-validator` — Output Pass đúng cú pháp

Xác minh các tệp JSON do từng pass ghi đúng cú pháp và chứa các key kỳ vọng. Nằm ở `pass-json-validator/`.

**Tệp được xác minh:**

| Tệp | Key bắt buộc |
|---|---|
| `project-analysis.json` | 5 key bắt buộc (stack, domains, v.v.) |
| `domain-groups.json` | 4 key bắt buộc |
| `pass1-*.json` | 4 key bắt buộc + object `analysisPerDomain` |
| `pass2-merged.json` | 10 section chung (luôn có) + 2 section backend (khi có backend stack) + 1 section base kotlin + 2 section CQRS kotlin (khi áp dụng). Khớp mờ với map alias ngữ nghĩa, số top-level key <5 = ERROR, <9 = WARNING, phát hiện giá trị rỗng. |
| `pass3-complete.json` | Marker hiện diện + cấu trúc |
| `pass4-memory.json` | Cấu trúc marker: object, `passNum === 4`, mảng `memoryFiles` không rỗng |

Kiểm tra pass2 **stack-aware**: nó đọc `project-analysis.json` để xác định backend/kotlin/cqrs rồi điều chỉnh các section kỳ vọng.

**Severity:** chạy ở mức **warn-only**, hiển thị vấn đề nhưng không chặn CI.

### 4. `plan-validator` — nhất quán Plan ↔ đĩa (legacy)

So sánh tệp `claudeos-core/plan/*.md` với đĩa. Nằm ở `plan-validator/`.

**3 mode:**
- `--check` (mặc định): chỉ phát hiện drift
- `--refresh`: cập nhật tệp plan từ đĩa
- `--execute`: áp dụng nội dung plan lên đĩa (tạo backup `.bak`)

**Trạng thái v2.1.0:** Sinh master plan đã bị gỡ ở v2.1.0. `claudeos-core/plan/` không còn do `init` tạo tự động. Khi `plan/` vắng, validator này skip kèm message informational.

Vẫn giữ trong bộ validator cho người tự bảo trì tệp plan để backup ad-hoc.

**Bảo mật:** path traversal bị chặn, `isWithinRoot(absPath)` từ chối các đường thoát ra khỏi gốc dự án qua `../`.

**Severity:** chạy ở mức **fail** khi phát hiện drift thật. No-op nếu `plan/` vắng.

### 5. `sync-checker` — nhất quán đĩa ↔ `sync-map.json`

Xác minh các tệp đăng ký trong `sync-map.json` (do `manifest-generator` ghi) khớp với tệp thực tế trên đĩa. Kiểm tra hai chiều qua 7 thư mục theo dõi. Nằm ở `sync-checker/`.

**Kiểm tra hai bước:**

1. **Disk → Plan:** Đi qua 7 thư mục theo dõi (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Báo cáo tệp có trên đĩa mà không đăng ký trong `sync-map.json`.
2. **Plan → Disk:** Báo cáo các đường dẫn đăng ký trong `sync-map.json` mà không còn trên đĩa (orphaned).

**Exit code:** Chỉ tệp orphaned gây exit 1. Tệp unregistered là informational (dự án v2.1.0+ mặc định có 0 đường dẫn đăng ký, nên đây là tình huống phổ biến).

**Severity:** chạy ở mức **fail** cho tệp orphaned. Skip sạch nếu `sync-map.json` không có mapping.

---

## Mức nghiêm trọng

Không phải mọi check fail đều nghiêm trọng như nhau. `health-checker` điều phối các runtime validator với mức nghiêm trọng 3 bậc:

| Tier | Ký hiệu | Hành vi |
|---|---|---|
| **fail** | `❌` | Chặn hoàn tất. CI exit khác 0. Phải sửa. |
| **warn** | `⚠️` | Hiển thị trong output nhưng không chặn. Nên điều tra. |
| **advisory** | `ℹ️` | Xem lại sau. Thường là false positive trong các layout bất thường. |

**Ví dụ theo tier:**

- **fail:** plan-validator phát hiện drift thật, sync-checker tìm thấy tệp orphaned, tệp guide bắt buộc thiếu.
- **warn:** pass-json-validator tìm thấy lỗ hổng schema không nghiêm trọng.
- **advisory:** `STALE_PATH` của content-validator gắn cờ một đường dẫn tồn tại nhưng bị gitignore (false positive ở một số dự án).

Hệ thống 3-tier thêm vào để phát hiện của `content-validator` (đôi khi có false positive trong layout bất thường) không deadlock pipeline CI. Thiếu nó thì mọi advisory đều chặn, mà chạy lại `init` không đáng tin để sửa được hallucination LLM.

Dòng tóm tắt cho thấy phân tách:
```
All systems operational (1 advisory, 1 warning)
```

---

## Vì sao hai entry point: `lint` vs `health`

```bash
npx claudeos-core lint     # chỉ claude-md-validator
npx claudeos-core health   # 4 validator còn lại
```

**Vì sao tách?**

`claude-md-validator` tìm vấn đề **cấu trúc**: sai số section, bảng tệp memory bị khai báo lại, heading canonical thiếu token tiếng Anh. Đó là tín hiệu **CLAUDE.md cần sinh lại**, không phải warning nhẹ để điều tra. Sửa bằng cách chạy lại `init` (`--force` nếu cần).

Các validator khác tìm vấn đề **nội dung**: đường dẫn, mục manifest, lỗ hổng schema. Có thể xem rồi sửa tay, không cần sinh lại tất cả.

Tách `lint` ra cho phép dùng trong pre-commit hook (nhanh, chỉ cấu trúc) mà không kéo theo các kiểm tra nội dung chậm hơn.

---

## Chạy validation

```bash
# Chạy validation cấu trúc trên CLAUDE.md
npx claudeos-core lint

# Chạy bộ health 4 validator
npx claudeos-core health
```

Với CI, `health` là kiểm tra khuyến nghị. Vẫn nhanh (không gọi LLM) và phủ mọi thứ trừ kiểm tra cấu trúc CLAUDE.md, mà phần lớn pipeline CI không cần verify mỗi commit.

Với pre-commit hook, `lint` đủ nhanh để chạy mỗi commit.

---

## Định dạng output

Validator sinh output dễ đọc cho người, theo mặc định:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` ghi các artifact dạng máy đọc được vào `claudeos-core/generated/`:

- `rule-manifest.json`: danh sách tệp + frontmatter từ gray-matter + stat
- `sync-map.json`: mapping đường dẫn đã đăng ký (v2.1.0+: mảng rỗng mặc định)
- `stale-report.json`: phát hiện hợp nhất từ mọi validator

---

## Tích hợp CI

Một ví dụ GitHub Actions tối thiểu:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Exit code chỉ khác 0 với phát hiện ở mức `fail`. `warn` và `advisory` print nhưng không làm fail build.

CI workflow chính thức (trong `.github/workflows/test.yml`) chạy trên `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Khi validator gắn cờ thứ bạn không đồng ý

False positive vẫn xảy ra, nhất là trong các layout bất thường (ví dụ tệp sinh bị gitignore, build step tùy chỉnh emit ra đường dẫn không chuẩn).

**Để chặn phát hiện trên một tệp cụ thể**, xem [advanced-config.md](advanced-config.md) cho các override `.claudeos-scan.json` có sẵn.

**Nếu một validator sai về mặt tổng quát** (không chỉ riêng dự án của bạn), [mở issue](https://github.com/claudeos-core/claudeos-core/issues): các kiểm tra này tinh chỉnh dần theo thời gian dựa trên báo cáo thật.

---

## Xem thêm

- [architecture.md](architecture.md): vị trí của validator trong pipeline
- [commands.md](commands.md): reference lệnh `lint` và `health`
- [troubleshooting.md](troubleshooting.md): ý nghĩa của các lỗi validator cụ thể
