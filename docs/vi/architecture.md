# Architecture — Pipeline 4-Pass

Tài liệu này giải thích `claudeos-core init` chạy ra sao, từ đầu đến cuối. Nếu chỉ muốn dùng công cụ thì [README chính](../../README.vi.md) là đủ. Tài liệu này dành cho việc hiểu *vì sao* thiết kế lại như vậy.

Nếu chưa từng dùng công cụ, [hãy chạy thử một lần trước](../../README.vi.md#bắt-đầu-nhanh). Các khái niệm bên dưới sẽ thấm nhanh hơn nhiều sau khi đã thấy đầu ra.

> Bản gốc tiếng Anh: [docs/architecture.md](../architecture.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Ý tưởng cốt lõi — "Code xác nhận, Claude tạo"

Hầu hết công cụ sinh tài liệu Claude Code chạy trong một bước:

```
Mô tả của bạn  →  Claude  →  CLAUDE.md / rules / standards
```

Claude phải đoán stack, quy ước, cấu trúc domain của dự án. Đoán giỏi, nhưng vẫn là đoán. ClaudeOS-Core đảo ngược cách làm:

```
Mã nguồn của bạn
       ↓
[Step A: Code đọc]        ← scanner Node.js, deterministic, không AI
       ↓
project-analysis.json     ← sự kiện đã xác nhận: stack, domains, paths
       ↓
[Step B: Claude viết]     ← pipeline LLM 4-pass, bị ràng buộc bởi sự kiện
       ↓
[Step C: Code xác minh]   ← 5 validator, chạy tự động
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**Code lo phần cần chính xác** (stack, đường dẫn tệp, cấu trúc domain).
**Claude lo phần cần biểu đạt** (giải thích, quy ước, văn xuôi).
Hai bên không chồng lên nhau, cũng không hoài nghi lẫn nhau.

Vì sao chuyện này quan trọng: LLM không bịa được đường dẫn hay framework không có thật trong code. Prompt Pass 3 đưa cho Claude một allowlist đường dẫn nguồn lấy từ scanner. Nếu Claude cố trích một đường dẫn ngoài list, `content-validator` sau sinh sẽ gắn cờ.

---

## Step A — Scanner (deterministic)

Trước khi Claude được gọi, một tiến trình Node.js đi qua dự án và ghi `claudeos-core/generated/project-analysis.json`. Tệp này là single source of truth cho mọi bước sau đó.

### Scanner đọc gì

Scanner nhặt tín hiệu từ các tệp sau ở thư mục gốc dự án:

| Tệp | Cho scanner biết gì |
|---|---|
| `package.json` | Dự án Node.js; framework qua `dependencies` |
| `pom.xml` | Dự án Java/Maven |
| `build.gradle` / `build.gradle.kts` | Dự án Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Dự án Python; framework qua packages |
| `angular.json` | Dự án Angular |
| `nuxt.config.{ts,js}` | Dự án Nuxt |
| `next.config.{ts,js}` | Dự án Next.js |
| `vite.config.{ts,js}` | Dự án Vite |
| Tệp `.env*` | Cấu hình runtime (port, host, DB URL — xem bên dưới) |

Nếu không khớp tệp nào, `init` dừng với lỗi rõ ràng thay vì đoán.

### Scanner ghi gì vào `project-analysis.json`

- **Stack metadata**: language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern**: với Java, một trong 5 pattern (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Với Kotlin, phát hiện CQRS / BFF / multi-module. Với frontend, layout App Router / Pages Router / FSD cộng pattern `components/*/`, kèm fallback nhiều bước.
- **Danh sách domain**: phát hiện khi đi qua cây thư mục, kèm số tệp mỗi domain. Scanner chọn 1–2 tệp tiêu biểu mỗi domain để Pass 1 đọc.
- **Allowlist đường dẫn nguồn**: mọi đường dẫn tệp nguồn có trong dự án. Prompt Pass 3 đính kèm tường minh list này nên Claude không còn chỗ đoán.
- **Cấu trúc monorepo**: Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), npm/yarn workspaces (`package.json#workspaces`), nếu có. NX không tự động phát hiện cụ thể; pattern chung `apps/*/` và `packages/*/` vẫn do scanner theo từng stack nhặt.
- **Snapshot `.env`**: port, host, API target, các biến nhạy cảm sẽ redact. Thứ tự tìm kiếm xem [stacks.md](stacks.md).

Scanner **không gọi LLM**. Cùng dự án + cùng code = cùng `project-analysis.json`, mọi lần.

Chi tiết theo từng stack (mỗi scanner trích gì và trích thế nào) xem [stacks.md](stacks.md).

---

## Step B — Pipeline Claude 4-pass

Mỗi pass có nhiệm vụ riêng. Chúng chạy tuần tự, Pass N đọc đầu ra Pass (N-1) dưới dạng tệp có cấu trúc nhỏ, không phải toàn bộ output của các pass trước.

### Pass 1 — Phân tích sâu theo domain

**Đầu vào:** `project-analysis.json` + một tệp tiêu biểu của mỗi domain.

**Nó làm gì:** Đọc các tệp tiêu biểu và trích pattern qua hàng chục danh mục phân tích theo stack (thường 50–100+ điểm bullet, tùy stack: template CQRS-aware của Kotlin/Spring dày nhất, các template Node.js nhẹ thì gọn nhất). Ví dụ: "Controller này dùng `@RestController` hay `@Controller`? Wrapper response nào? Logging library nào?"

**Đầu ra:** `pass1-<group-N>.json`, một tệp cho mỗi nhóm domain.

Với dự án lớn, Pass 1 chạy nhiều lần, mỗi lần một nhóm domain. Quy tắc nhóm là **tối đa 4 domain và 40 tệp mỗi nhóm**, áp dụng tự động trong `plan-installer/domain-grouper.js`. Một dự án 12 domain sẽ chạy Pass 1 ba lần.

Tách như vậy là vì context window của Claude có hạn. Nhồi 12 domain vào một prompt sẽ hoặc vỡ context, hoặc ép LLM đọc lướt. Tách ra giúp mỗi pass tập trung.

### Pass 2 — Hợp nhất xuyên domain

**Đầu vào:** Tất cả tệp `pass1-*.json`.

**Nó làm gì:** Hợp nhất chúng thành bức tranh toàn dự án. Khi hai domain bất đồng (ví dụ: một bên nói wrapper response là `success()`, bên kia nói `ok()`), Pass 2 chọn quy ước trội và ghi nhận chỗ bất đồng.

**Đầu ra:** `pass2-merged.json`, thường 100–400 KB.

### Pass 3 — Sinh tài liệu (split mode)

**Đầu vào:** `pass2-merged.json`.

**Nó làm gì:** Viết tài liệu thực tế. Đây là pass nặng nhất, tạo ~40–50 tệp markdown trải rộng CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` và `claudeos-core/mcp-guide/`.

**Đầu ra:** Mọi tệp người dùng nhìn thấy, sắp xếp theo cấu trúc thư mục trong [README chính](../../README.vi.md#bắt-đầu-nhanh).

Để giữ output mỗi stage trong context window của Claude (input Pass 2 đã merge thì lớn, output sinh ra còn lớn hơn), Pass 3 **luôn tách thành các stage**, kể cả với dự án nhỏ. Tách áp dụng vô điều kiện; dự án nhỏ chỉ ít batch theo domain hơn:

| Stage | Viết gì |
|---|---|
| **3a** | Một "facts table" nhỏ (`pass3a-facts.md`) trích từ `pass2-merged.json`. Đóng vai trò input nén cho các stage sau để chúng khỏi phải đọc lại tệp merged lớn. |
| **3b-core** | Sinh `CLAUDE.md` (chỉ mục Claude Code đọc đầu tiên) + phần lõi của `claudeos-core/standard/`. |
| **3b-N** | Tệp rule và standard theo domain (mỗi stage một nhóm ≤15 domain). |
| **3c-core** | Sinh tệp orchestrator của `claudeos-core/skills/` + `claudeos-core/guide/`. |
| **3c-N** | Tệp skill theo domain. |
| **3d-aux** | Sinh nội dung phụ trợ trong `claudeos-core/database/` và `claudeos-core/mcp-guide/`. |

Với dự án rất lớn (≥16 domain), 3b và 3c chia nhỏ hơn nữa thành các batch. Mỗi batch nhận một context window mới.

Sau khi mọi stage hoàn tất, `pass3-complete.json` ghi ra làm marker. Nếu `init` bị gián đoạn giữa chừng, lần chạy sau đọc marker và tiếp tục từ stage chưa bắt đầu, các stage đã xong không chạy lại.

### Pass 4 — Scaffold memory layer

**Đầu vào:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Nó làm gì:** Sinh L4 memory layer + các rule scaffold dùng chung. Mọi thao tác ghi của scaffold đều **skip-if-exists**, nên chạy lại Pass 4 không ghi đè gì.

- `claudeos-core/memory/`: 4 tệp markdown (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/`: 4 tệp rule (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) tự nạp các tệp memory khi Claude Code đang chỉnh vùng liên quan
- `.claude/rules/00.core/51.doc-writing-rules.md` và `52.ai-work-rules.md`: rule chung phổ quát (Pass 3 sinh các rule `00.core` đặc thù dự án như `00.standard-reference.md`; Pass 4 thêm hai tệp slot dành sẵn này nếu chưa có)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md`: meta-guide cho việc viết thêm rule. Tiền tố số tự động gán bằng `Math.max(existing-numbers) + 1`, nên thường là `04` hoặc `05` tùy Pass 3 đã viết những gì.

**Đầu ra:** Tệp memory + marker `pass4-memory.json`.

Quan trọng: **Pass 4 không chỉnh `CLAUDE.md`.** Pass 3 đã viết Section 8 (tham chiếu tới các tệp memory). Sửa lại CLAUDE.md ở đây sẽ khai báo lại nội dung Section 8 và kích hoạt lỗi validator. Quy tắc này do prompt cưỡng chế và `tests/pass4-claude-md-untouched.test.js` kiểm.

Chi tiết về vai trò mỗi tệp memory và vòng đời xem [memory-layer.md](memory-layer.md).

---

## Step C — Verification (deterministic, sau Claude)

Sau khi Claude xong, code Node.js xác minh đầu ra qua 5 validator. **Không validator nào gọi LLM**, mọi kiểm tra đều deterministic.

| Validator | Kiểm tra gì |
|---|---|
| `claude-md-validator` | Kiểm tra cấu trúc `CLAUDE.md` (số section top-level, số H3/H4 mỗi section, tính duy nhất/phạm vi của hàng bảng tệp memory, token canonical heading T1). Language-invariant: cùng kiểm tra pass cho cả 10 ngôn ngữ output. |
| `content-validator` | 10 kiểm tra mức nội dung: tệp bắt buộc tồn tại, đường dẫn nêu trong standards/skills là thực, MANIFEST nhất quán. |
| `pass-json-validator` | Output JSON Pass 1 / 2 / 3 / 4 đúng cú pháp và chứa các key kỳ vọng. |
| `plan-validator` | (Legacy) So sánh tệp plan đã lưu với đĩa. Sinh master plan đã gỡ ở v2.1.0, nên giờ chủ yếu là no-op, giữ lại cho tương thích ngược. |
| `sync-checker` | Tệp đĩa trong các thư mục theo dõi khớp với đăng ký trong `sync-map.json` (orphaned vs. unregistered). |

Có **3 mức nghiêm trọng**:

- **fail**: Chặn hoàn tất, exit khác 0 trong CI. Có gì đó hỏng cấu trúc.
- **warn**: Hiện trong output nhưng không chặn. Đáng điều tra.
- **advisory**: Xem lại sau. Thường là false positive trong các layout dự án bất thường (ví dụ tệp gitignored bị gắn cờ "missing").

Danh sách kiểm tra đầy đủ theo từng validator xem [verification.md](verification.md).

Validator điều phối theo hai cách:

1. **`claudeos-core lint`**: chỉ chạy `claude-md-validator`. Nhanh, chỉ về cấu trúc. Dùng sau khi sửa thủ công CLAUDE.md.
2. **`claudeos-core health`**: chạy 4 validator còn lại (claude-md-validator tách ra có chủ ý, vì lệch cấu trúc CLAUDE.md là tín hiệu re-init, không phải warning nhẹ). Khuyến nghị trong CI.

---

## Vì sao kiến trúc này quan trọng

### Prompt tiêm sự kiện ngăn hallucination

Khi Pass 3 chạy, prompt trông đại loại như sau (đơn giản hóa):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude không còn khe hở bịa đường dẫn. Ràng buộc là **dương** (whitelist), không âm ("đừng bịa"). Khác biệt này quan trọng vì LLM tuân thủ ràng buộc dương cụ thể tốt hơn ràng buộc âm trừu tượng.

Nếu Claude vẫn trích một đường dẫn bịa, kiểm tra `content-validator [10/10]` ở cuối sẽ gắn cờ là `STALE_PATH`. Người dùng thấy cảnh báo trước khi tài liệu giao đi.

### Resume-safe qua marker

Mỗi pass ghi một tệp marker (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) khi xong. Nếu `init` bị gián đoạn (mạng nháy, timeout, Ctrl-C), lần chạy sau đọc marker và tiếp tục từ chỗ vừa dừng. Không mất công việc.

Marker của Pass 3 còn theo dõi **sub-stage nào** đã xong, nên một Pass 3 dở dang (ví dụ 3b xong, 3c crash giữa stage) tiếp tục từ stage kế, không phải từ 3a.

### Chạy lại idempotent

Chạy `init` trên dự án đã có rule **không** lặng lẽ ghi đè lên chỉnh sửa thủ công.

Cơ chế: hệ thống quyền của Claude Code chặn subprocess ghi vào `.claude/`, kể cả với `--dangerously-skip-permissions`. Vì vậy Pass 3/4 nhận chỉ thị ghi tệp rule vào `claudeos-core/generated/.staged-rules/` thay vì ghi thẳng vào đó. Sau mỗi pass, orchestrator Node.js (nằm ngoài chính sách quyền của Claude Code) chuyển các tệp đã staged vào `.claude/rules/`.

Trong thực tế: **trên dự án mới, chạy lại tạo lại mọi thứ. Trên dự án đã chỉnh tay rule, chạy lại với `--force` sinh lại từ đầu (chỉnh sửa tay mất, đúng nghĩa `--force`). Không kèm `--force`, cơ chế resume kích hoạt và chỉ pass chưa xong mới chạy.**

Toàn bộ chính sách bảo toàn xem [safety.md](safety.md).

### Xác minh language-invariant

Validator không khớp text heading đã dịch. Chúng khớp **hình dạng cấu trúc** (cấp heading, count, thứ tự). Nghĩa là cùng `claude-md-validator` cho ra verdict byte-for-byte y hệt trên CLAUDE.md sinh ở bất kỳ ngôn ngữ nào trong 10 ngôn ngữ hỗ trợ. Không có dictionary theo ngôn ngữ. Không có chi phí bảo trì khi thêm ngôn ngữ mới.

---

## Hiệu năng — kỳ vọng gì

Thời gian cụ thể phụ thuộc nhiều vào:
- Kích thước dự án (số tệp nguồn, số domain)
- Độ trễ mạng tới API của Anthropic
- Model Claude được chọn trong cấu hình Claude Code

Hướng dẫn đại khái:

| Bước | Thời gian dự án nhỏ (<200 files) | Thời gian dự án vừa (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 giây | 10–30 giây |
| Step B (4 Claude pass) | Vài phút | 10–30 phút |
| Step C (validators) | < 5 giây | 10–20 giây |

Pass 1 chiếm phần lớn thời gian thực trên dự án lớn vì nó chạy mỗi nhóm domain một lần. Dự án 24 domain = 6 lần gọi Pass 1 (24 / 4 domain mỗi nhóm).

Muốn con số chính xác, hãy chạy một lần trên dự án của mình. Đó là câu trả lời trung thực duy nhất.

---

## Code mỗi bước nằm ở đâu

| Bước | Tệp |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Phát hiện stack | `plan-installer/stack-detector.js` |
| Scanner theo stack | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Lắp ráp prompt | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Template Pass | `pass-prompts/templates/<stack>/pass{1,2,3}.md` theo stack; `pass-prompts/templates/common/pass4.md` dùng chung mọi stack |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## Đọc thêm

- [stacks.md](stacks.md): mỗi scanner trích xuất gì theo stack
- [memory-layer.md](memory-layer.md): chi tiết Pass 4
- [verification.md](verification.md): đầy đủ 5 validator
- [diagrams.md](diagrams.md): cùng kiến trúc dưới dạng sơ đồ Mermaid
- [comparison.md](comparison.md): khác biệt với các công cụ Claude Code khác
