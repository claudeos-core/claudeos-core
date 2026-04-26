# So sánh với các công cụ tương tự

Trang này so sánh ClaudeOS-Core với các công cụ Claude Code khác hoạt động trong cùng không gian chung (cấu hình Claude Code nhận biết dự án).

**Đây là so sánh phạm vi, không phải phán xét chất lượng.** Hầu hết công cụ dưới đây đều xuất sắc trong việc của chúng. Mục đích là giúp bạn hiểu liệu ClaudeOS-Core có hợp với vấn đề của bạn, hay một trong số chúng hợp hơn.

> Bản gốc tiếng Anh: [docs/comparison.md](../comparison.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## TL;DR

Nếu bạn muốn **tự động sinh `.claude/rules/` dựa trên cái thực sự có trong code của bạn**, đó là chuyên môn của ClaudeOS-Core.

Nếu bạn muốn cái khác (bundle preset rộng, workflow planning, điều phối agent, đồng bộ cấu hình đa-công-cụ), các công cụ khác trong hệ sinh thái Claude Code có khả năng phù hợp hơn.

---

## ClaudeOS-Core khác gì các công cụ khác

Đặc điểm định nghĩa của ClaudeOS-Core:

- **Đọc mã nguồn thực tế của bạn** (scanner Node.js deterministic — không có LLM đoán stack).
- **Pipeline Claude 4-pass** với prompt tiêm sự kiện (đường dẫn/quy ước được trích một lần và tái sử dụng).
- **5 validator sau khi sinh** (`claude-md-validator` cho cấu trúc, `content-validator` cho path-claim và nội dung, `pass-json-validator` cho JSON trung gian, `plan-validator` cho tệp plan legacy, `sync-checker` cho nhất quán đĩa ↔ sync-map).
- **10 ngôn ngữ output** với validation language-invariant.
- **Output theo dự án**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer — tất cả dẫn xuất từ code của bạn, không phải từ một bundle preset.

Các công cụ Claude Code khác trong không gian chung này (bạn có thể muốn xếp lớp chúng hoặc chọn cái khác tùy nhu cầu):

- **Claude `/init`** — built-in vào Claude Code; viết một `CLAUDE.md` duy nhất trong một lệnh gọi LLM. Tốt nhất cho setup nhanh một-tệp trên dự án nhỏ.
- **Công cụ Preset/bundle** — phân phối các agents, skills, hoặc rules được curate phù hợp cho "hầu hết dự án." Tốt nhất khi quy ước của bạn khớp mặc định của bundle.
- **Công cụ Planning/workflow** — cung cấp phương pháp luận có cấu trúc cho phát triển feature (specs, phases, v.v.). Tốt nhất khi bạn muốn một lớp quy trình trên Claude Code.
- **Công cụ Hook/DX** — thêm auto-save, hook chất lượng code, hoặc cải thiện trải nghiệm dev cho phiên Claude Code.
- **Cross-agent rule converters** — giữ rule của bạn đồng bộ giữa Claude Code, Cursor, v.v.

Các công cụ này phần lớn **bổ trợ, không cạnh tranh**. ClaudeOS-Core lo công việc "sinh rule theo dự án từ code của bạn"; các công cụ khác lo các công việc khác. Hầu hết có thể dùng chung.

---

## Khi nào ClaudeOS-Core phù hợp

✅ Bạn muốn Claude Code tuân theo quy ước của DỰ ÁN BẠN, không phải quy ước chung chung.
✅ Bạn đang khởi tạo dự án mới (hoặc onboard team) và muốn setup nhanh.
✅ Bạn mệt vì duy trì thủ công `.claude/rules/` khi codebase tiến hóa.
✅ Bạn làm trong một trong [12 stack được hỗ trợ](stacks.md).
✅ Bạn muốn output deterministic, lặp lại được (cùng code → cùng rule mọi lần).
✅ Bạn cần output bằng ngôn ngữ không phải tiếng Anh (10 ngôn ngữ built-in).

## Khi nào ClaudeOS-Core KHÔNG phù hợp

❌ Bạn muốn bundle preset agents/skills/rules được curate chạy được ngay từ ngày đầu mà không cần bước scan.
❌ Stack của bạn không được hỗ trợ và bạn không muốn đóng góp một cái.
❌ Bạn muốn điều phối agent, workflow planning, hoặc phương pháp luận coding — dùng công cụ chuyên môn cho việc đó.
❌ Bạn chỉ cần một `CLAUDE.md` duy nhất, không phải bộ standards/rules/skills đầy đủ — `claude /init` là đủ.

---

## Phạm vi hẹp hơn vs. rộng hơn

ClaudeOS-Core **hẹp hơn** các bundle phủ rộng (nó không ship preset agents, hooks, hay phương pháp luận — chỉ rule của dự án bạn). Nó **rộng hơn** các công cụ tập trung vào một artifact đơn (nó sinh CLAUDE.md cộng cây đa-thư-mục gồm standards, skills, guides, memory). Chọn dựa trên trục nào quan trọng cho dự án của bạn.

---

## "Sao không dùng Claude /init?"

Câu hỏi hợp lý. `claude /init` được build-in vào Claude Code và viết một `CLAUDE.md` duy nhất trong một lệnh gọi LLM. Nó nhanh và zero-config.

**Nó hoạt động tốt khi:**

- Dự án của bạn nhỏ (≤30 tệp).
- Bạn ổn với việc Claude đoán stack từ một cái nhìn thoáng cây tệp.
- Bạn chỉ cần một `CLAUDE.md`, không phải bộ `.claude/rules/` đầy đủ.

**Nó vật lộn khi:**

- Dự án có quy ước tùy chỉnh Claude không nhận ra từ cái nhìn thoáng (ví dụ MyBatis thay vì JPA, response wrapper tùy chỉnh, layout package bất thường).
- Bạn muốn output có thể tái lập giữa các thành viên team.
- Dự án đủ lớn để một lệnh gọi Claude chạm context window trước khi xong phân tích.

ClaudeOS-Core được xây cho các trường hợp `/init` vật lộn. Nếu `/init` hoạt động cho bạn, có lẽ bạn không cần ClaudeOS-Core.

---

## "Sao không tự viết rule thủ công?"

Cũng hợp lý. Tự viết tay `.claude/rules/` là lựa chọn chính xác nhất — bạn hiểu dự án mình rõ nhất.

**Nó hoạt động tốt khi:**

- Bạn có một dự án, bạn là dev duy nhất, bạn ổn với việc dành thời gian đáng kể viết rule từ đầu.
- Quy ước của bạn ổn định và được tài liệu hóa kỹ.

**Nó vật lộn khi:**

- Bạn khởi tạo dự án mới thường xuyên (mỗi cái cần thời gian viết rule).
- Team lớn lên và mọi người quên cái gì có trong rule.
- Quy ước tiến hóa, và rule lệch lại phía sau.

ClaudeOS-Core đưa bạn phần lớn quãng đường tới một bộ rule dùng được trong một lần chạy. Phần còn lại là tinh chỉnh tay — và nhiều người dùng thấy đó là cách dùng thời gian tốt hơn so với khởi đầu từ tệp trắng.

---

## "Khác gì so với chỉ dùng bundle preset?"

Các bundle như Everything Claude Code cho bạn một bộ rule / skill / agent được curate phù hợp cho "hầu hết dự án." Chúng tuyệt cho việc áp dụng nhanh khi dự án khớp giả định của bundle.

**Bundle hoạt động tốt khi:**

- Quy ước của dự án khớp mặc định của bundle (ví dụ Spring Boot chuẩn hoặc Next.js chuẩn).
- Bạn không có lựa chọn stack bất thường (ví dụ MyBatis thay vì JPA).
- Bạn muốn điểm khởi đầu và sẵn lòng tùy biến từ đó.

**Bundle vật lộn khi:**

- Stack dùng tooling không-mặc-định (rule "Spring Boot" của bundle giả định JPA).
- Bạn có quy ước riêng dự án mạnh mà bundle không biết.
- Bạn muốn rule cập nhật khi code tiến hóa.

ClaudeOS-Core có thể bổ sung bundle: dùng ClaudeOS-Core cho rule riêng dự án; xếp lớp bundle cho rule workflow chung.

---

## Chọn giữa các công cụ tương tự

Nếu bạn đang chọn giữa ClaudeOS-Core và một công cụ Claude Code nhận biết dự án khác, hãy tự hỏi:

1. **Tôi muốn công cụ đọc code của tôi, hay tôi muốn mô tả dự án?**
   Đọc code → ClaudeOS-Core. Mô tả → hầu hết các công cụ khác.

2. **Tôi cần output giống nhau mọi lần?**
   Có → ClaudeOS-Core (deterministic). Không → bất kỳ.

3. **Tôi muốn standards/rules/skills/guides đầy đủ, hay chỉ một CLAUDE.md?**
   Bộ đầy đủ → ClaudeOS-Core. Chỉ CLAUDE.md → Claude `/init`.

4. **Ngôn ngữ output là tiếng Anh, hay khác?**
   Chỉ tiếng Anh → nhiều công cụ phù hợp. Ngôn ngữ khác → ClaudeOS-Core (10 ngôn ngữ built-in).

5. **Tôi cần điều phối agent, workflow planning, hoặc hook?**
   Có → dùng công cụ chuyên môn phù hợp. ClaudeOS-Core không làm những thứ đó.

Nếu bạn đã dùng ClaudeOS-Core và một công cụ khác song song, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) với trải nghiệm — nó giúp so sánh này chính xác hơn.

---

## Xem thêm

- [architecture.md](architecture.md) — cái gì làm ClaudeOS-Core deterministic
- [stacks.md](stacks.md) — 12 stack ClaudeOS-Core hỗ trợ
- [verification.md](verification.md) — lưới an toàn sau khi sinh mà công cụ khác không có
