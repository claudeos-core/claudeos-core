# Memory Layer (L4)

Từ v2.0, ClaudeOS-Core ghi một memory layer bền vững song song với tài liệu thông thường. Layer này dành cho dự án dài hạn, khi cần Claude Code:

1. Ghi nhớ các quyết định kiến trúc và lý do.
2. Học từ các lỗi tái diễn.
3. Tự động đề xuất các pattern lỗi thường xuyên thành rule cố định.

Chỉ dùng ClaudeOS-Core để sinh một lần thì cứ bỏ qua layer này. Tệp memory vẫn ghi ra nhưng không phình to nếu không cập nhật.

> Bản gốc tiếng Anh: [docs/memory-layer.md](../memory-layer.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Cái gì được ghi

Sau khi Pass 4 hoàn tất, memory layer gồm:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "vì sao chọn X thay vì Y")
    ├── failure-patterns.md      (lỗi tái diễn, kèm frequency + importance)
    ├── compaction.md            (cách memory được compact theo thời gian)
    └── auto-rule-update.md      (pattern cần được biến thành rule mới)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule tự nạp decision-log.md)
        ├── 02.failure-patterns.md   (rule tự nạp failure-patterns.md)
        ├── 03.compaction.md         (rule tự nạp compaction.md)
        └── 04.auto-rule-update.md   (rule tự nạp auto-rule-update.md)
```

Các tệp rule `60.memory/` có glob `paths:` khớp các tệp dự án nơi memory cần nạp. Khi Claude Code đang chỉnh tệp khớp glob, tệp memory tương ứng nạp vào context.

Đây là **nạp theo nhu cầu**: memory không luôn ở trong context, chỉ khi liên quan. Việc đó giữ context làm việc của Claude gọn nhẹ.

---

## Bốn tệp memory

### `decision-log.md` — quyết định kiến trúc append-only

Khi đưa ra một quyết định kỹ thuật không hiển nhiên, ta (hoặc Claude khi nhắc tới) append một block:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Tệp này **tăng theo thời gian**, không tự xóa. Quyết định cũ vẫn là context có giá trị.

Rule tự nạp (`60.memory/01.decision-log.md`) chỉ thị Claude Code tham khảo tệp này trước khi trả lời câu hỏi như "Vì sao ta cấu trúc X như vậy?"

### `failure-patterns.md` — lỗi tái diễn

Khi Claude Code mắc lỗi tái diễn (ví dụ "Claude cứ sinh JPA dù dự án dùng MyBatis"), một entry sẽ ghi vào đây:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

Trường `frequency` / `importance` / `last seen` điều khiển các quyết định tự động:

- **Compaction:** entry có `lastSeen > 60 days` AND `importance < 3` sẽ bỏ.
- **Đề xuất rule:** entry có `frequency >= 3` nổi lên thành ứng viên cho mục `.claude/rules/` mới qua `memory propose-rules`. (Importance không phải bộ lọc, chỉ ảnh hưởng điểm confidence của mỗi đề xuất.)

Subcommand `memory` parse các trường metadata bằng regex anchored (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`), nên dòng trường phải gần giống ví dụ trên. Biến thể có thụt lề hoặc in nghiêng đều ok.

### `compaction.md` — log compaction

Tệp này theo dõi lịch sử compaction:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Chỉ section `## Last Compaction` ghi đè ở mỗi lần `memory compact`. Bất cứ gì thêm vào chỗ khác trong tệp đều giữ nguyên.

### `auto-rule-update.md` — hàng đợi đề xuất rule

Khi chạy `memory propose-rules`, Claude đọc `failure-patterns.md` rồi append nội dung rule đề xuất vào đây:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

Ta xem xét các đề xuất, sao chép cái muốn vào tệp rule thật. **Lệnh propose-rules không tự áp dụng**, đây là chủ ý vì rule do LLM soạn cần người review.

---

## Thuật toán compaction

Memory tăng nhưng không phình. Compaction bốn-stage chạy khi gọi:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Hành động |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | Body thu lại thành "fix" 1-dòng + meta |
| 2 | Heading trùng | Merge (frequencies cộng dồn, body = mới nhất) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | Bỏ |
| 4 | Tệp > 400 dòng | Trim các entry non-preserved cũ nhất |

**Entry "preserved"** sống sót qua mọi stage. Một entry được preserve nếu thỏa bất kỳ điều kiện nào sau:

- `importance >= 7`
- `lastSeen < 30 days`
- Body chứa đường dẫn rule active cụ thể (non-glob), ví dụ `.claude/rules/10.backend/orm-rules.md`

Kiểm tra "đường dẫn rule active" khá thú vị: nếu một entry memory tham chiếu một tệp rule thực đang tồn tại, entry đó neo vào vòng đời của rule. Rule còn bao lâu thì memory còn bấy lâu.

Thuật toán compaction là mô phỏng chủ ý đường cong quên của con người: thứ thường xuyên, gần đây, quan trọng thì ở lại; thứ hiếm, cũ, không quan trọng thì phai dần.

Code compaction xem ở `bin/commands/memory.js` (hàm `compactFile()`).

---

## Tính điểm importance

Chạy:

```bash
npx claudeos-core memory score
```

Tính lại importance cho các entry trong `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), cap ở 10
```

Trong đó `recency = max(0, 1 - daysSince(lastSeen) / 90)` (suy giảm tuyến tính qua 90 ngày).

Hiệu ứng:
- Entry có `frequency = 3` và `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Entry có `frequency = 3` và `lastSeen = 90+ ngày trước` → `round(3 × 1.5 + 0 × 5) = 5`

**Lệnh score bỏ TẤT CẢ dòng importance đang có trước khi chèn.** Việc này ngăn duplicate-line regression khi chạy lại score nhiều lần.

---

## Đề xuất rule: `propose-rules`

Chạy:

```bash
npx claudeos-core memory propose-rules
```

Lệnh này:

1. Đọc `failure-patterns.md`.
2. Lọc entry có `frequency >= 3`.
3. Yêu cầu Claude soạn nội dung rule đề xuất cho mỗi ứng viên.
4. Tính confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance mặc định 0; cap ở 6 nếu importance thiếu)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   trong đó `anchored` nghĩa là entry tham chiếu đường dẫn tệp thực trên đĩa.
5. Ghi đề xuất vào `auto-rule-update.md` cho con người xem xét.

**Giá trị evidence cap ở 6 khi thiếu importance**: không có điểm importance, mình frequency không đủ để đẩy sigmoid về confidence cao. (Đây là cap input vào sigmoid, không phải số đề xuất.)

---

## Workflow điển hình

Với dự án dài hạn, nhịp điệu sẽ như sau:

1. **Chạy `init` một lần** để dựng các tệp memory cùng mọi thứ khác.

2. **Dùng Claude Code bình thường vài tuần.** Để ý các lỗi tái diễn (ví dụ Claude cứ dùng wrapper response sai). Append entry vào `failure-patterns.md`, làm tay hoặc nhờ Claude (rule trong `60.memory/02.failure-patterns.md` bảo Claude khi nào append).

3. **Định kỳ chạy `memory score`** để làm tươi điểm importance. Nhanh và idempotent.

4. **Khi đã có ~5+ pattern điểm cao**, chạy `memory propose-rules` để có rule soạn sẵn.

5. **Xem xét đề xuất** trong `auto-rule-update.md`. Với mỗi cái muốn dùng, sao chép nội dung vào tệp rule cố định dưới `.claude/rules/`.

6. **Chạy `memory compact` định kỳ** (mỗi tháng một lần, hoặc trong CI lập lịch) để `failure-patterns.md` có giới hạn.

Nhịp điệu này chính là cái bốn tệp thiết kế ra để phục vụ. Bỏ bước nào cũng không sao, memory layer là opt-in, tệp không dùng cũng không cản đường.

---

## Tính liên tục giữa các phiên

CLAUDE.md được Claude Code tự nạp mỗi phiên. Tệp memory **không tự nạp mặc định**, chúng nạp theo nhu cầu bởi rule `60.memory/` khi glob `paths:` khớp tệp Claude đang chỉnh.

Nghĩa là: trong một phiên Claude Code mới, memory không hiện diện cho đến khi bắt đầu làm việc trên tệp liên quan.

Sau khi auto-compaction của Claude Code chạy (khoảng 85% context), Claude mất nhận thức về tệp memory dù chúng đã nạp trước đó. Section 8 của CLAUDE.md có một block văn bản **Session Resume Protocol** nhắc Claude:

- Quét lại `failure-patterns.md` để tìm các entry liên quan.
- Đọc lại các entry gần đây nhất của `decision-log.md`.
- Khớp lại rule `60.memory/` với các tệp đang mở.

Đây là **văn bản, không cưỡng chế**, nhưng văn bản cấu trúc sao cho Claude có xu hướng tuân theo. Session Resume Protocol là một phần của scaffold canonical v2.3.2+ và giữ qua cả 10 ngôn ngữ output.

---

## Khi nào bỏ memory layer

Memory layer thêm giá trị cho:

- **Dự án lâu dài** (nhiều tháng trở lên).
- **Team**: `decision-log.md` trở thành ký ức tổ chức chung và công cụ onboarding.
- **Dự án có Claude Code chạy ≥10 lần/ngày**: pattern lỗi tích lũy đủ nhanh để hữu ích.

Quá đà cho:

- Script một lần sẽ vứt sau một tuần.
- Dự án spike hoặc prototype.
- Tutorial hoặc demo.

Tệp memory vẫn do Pass 4 ghi, nhưng không cập nhật thì không phình. Không có gánh nặng bảo trì khi không dùng.

Nếu chủ động không muốn rule memory tự nạp gì cả (vì chi phí context):

- Xóa rule `60.memory/`. Pass 4 không tạo lại khi resume, chỉ tạo lại khi `--force`.
- Hoặc thu hẹp glob `paths:` trong mỗi rule sao cho không khớp gì.

---

## Xem thêm

- [architecture.md](architecture.md): Pass 4 trong context của pipeline
- [commands.md](commands.md): reference `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md): kiểm tra `[9/9]` memory của content-validator
