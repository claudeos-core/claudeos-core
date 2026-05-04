# So sánh với các công cụ tương tự

Trang này so sánh ClaudeOS-Core với các công cụ Claude Code khác cùng hoạt động trong không gian "cấu hình Claude Code nhận biết dự án".

**Đây là so sánh phạm vi, không phán xét chất lượng.** Phần lớn công cụ dưới đây đều xuất sắc ở mảng của chúng. Mục đích là giúp ta xác định ClaudeOS-Core có hợp vấn đề mình đang gặp hay một công cụ khác hợp hơn.

> Bản gốc tiếng Anh: [docs/comparison.md](../comparison.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## TL;DR

Cần **tự động sinh `.claude/rules/` dựa trên những gì thực sự có trong code**? Đó là chuyên môn của ClaudeOS-Core.

Cần thứ khác (bundle preset rộng, workflow planning, điều phối agent, đồng bộ cấu hình đa-công-cụ)? Các công cụ khác trong hệ sinh thái Claude Code có thể phù hợp hơn.

---

## ClaudeOS-Core khác gì các công cụ khác

Đặc điểm định nghĩa của ClaudeOS-Core:

- **Đọc mã nguồn thực tế** (scanner Node.js deterministic, không để LLM đoán stack).
- **Pipeline Claude 4-pass** kèm prompt tiêm sự kiện (đường dẫn/quy ước trích một lần rồi tái sử dụng).
- **5 validator sau khi sinh**: `claude-md-validator` lo cấu trúc, `content-validator` lo path-claim và nội dung, `pass-json-validator` lo JSON trung gian, `plan-validator` lo tệp plan legacy, `sync-checker` lo nhất quán đĩa ↔ sync-map.
- **10 ngôn ngữ output** với validation language-invariant.
- **Output theo dự án**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer, tất cả đều dẫn xuất từ code, không phải từ bundle preset.

Các công cụ Claude Code khác trong cùng không gian (xếp lớp chung được, hoặc chọn cái khác tùy nhu cầu):

- **Claude `/init`**: built-in trong Claude Code, viết một `CLAUDE.md` duy nhất qua một lệnh gọi LLM. Hợp nhất cho setup nhanh một tệp trên dự án nhỏ.
- **Công cụ Preset/bundle**: phân phối agents, skills hoặc rules đã curate phù hợp cho "phần lớn dự án". Hợp nhất khi quy ước khớp mặc định của bundle.
- **Công cụ Planning/workflow**: cung cấp phương pháp luận có cấu trúc cho phát triển feature (specs, phases...). Hợp nhất khi cần một lớp quy trình trên Claude Code.
- **Công cụ Hook/DX**: thêm auto-save, hook chất lượng code, hoặc cải thiện trải nghiệm dev cho phiên Claude Code.
- **Cross-agent rule converters**: giữ rule đồng bộ giữa Claude Code, Cursor, v.v.

Các công cụ này phần lớn **bổ trợ, không cạnh tranh**. ClaudeOS-Core lo việc "sinh rule theo dự án từ code"; các công cụ khác lo việc khác. Phần lớn dùng chung được.

---

## Khi nào ClaudeOS-Core phù hợp

✅ Cần Claude Code tuân theo quy ước của DỰ ÁN MÌNH, không phải quy ước chung chung.
✅ Đang khởi tạo dự án mới (hoặc onboard team) và muốn setup nhanh.
✅ Mệt vì duy trì thủ công `.claude/rules/` khi codebase tiến hóa.
✅ Làm trong một trong [12 stack được hỗ trợ](stacks.md).
✅ Cần output deterministic, lặp lại được (cùng code → cùng rule mọi lần).
✅ Cần output bằng ngôn ngữ không phải tiếng Anh (10 ngôn ngữ built-in).

## Khi nào ClaudeOS-Core KHÔNG phù hợp

❌ Cần bundle preset agents/skills/rules đã curate, chạy được ngay từ ngày đầu mà không qua bước scan.
❌ Stack không được hỗ trợ và cũng không muốn đóng góp thêm stack mới.
❌ Cần điều phối agent, workflow planning, hoặc phương pháp luận coding. Hãy dùng công cụ chuyên cho việc đó.
❌ Chỉ cần một `CLAUDE.md` duy nhất chứ không phải bộ standards/rules/skills đầy đủ. `claude /init` là đủ.

---

## Phạm vi hẹp hơn vs. rộng hơn

ClaudeOS-Core **hẹp hơn** các bundle phủ rộng: không ship preset agents, hooks, hay phương pháp luận, chỉ rule riêng của dự án. Nhưng nó **rộng hơn** các công cụ tập trung vào một artifact đơn: sinh CLAUDE.md cộng cây đa thư mục gồm standards, skills, guides, memory. Chọn dựa trên trục nào quan trọng cho dự án.

---

## "Sao không dùng Claude /init?"

Câu hỏi hợp lý. `claude /init` build-in trong Claude Code và viết một `CLAUDE.md` duy nhất qua một lệnh gọi LLM. Nhanh và zero-config.

**Hoạt động tốt khi:**

- Dự án nhỏ (≤30 tệp).
- Ổn với việc Claude đoán stack qua một cái nhìn thoáng cây tệp.
- Chỉ cần một `CLAUDE.md`, không phải bộ `.claude/rules/` đầy đủ.

**Vật lộn khi:**

- Dự án có quy ước tùy chỉnh mà Claude không nhận ra từ cái nhìn thoáng (ví dụ MyBatis thay vì JPA, response wrapper tùy chỉnh, layout package bất thường).
- Cần output tái lập được giữa các thành viên team.
- Dự án đủ lớn để một lệnh gọi Claude chạm context window trước khi phân tích xong.

ClaudeOS-Core sinh ra cho các trường hợp `/init` vật lộn. Nếu `/init` chạy ổn, có lẽ không cần đến ClaudeOS-Core.

---

## "Sao không tự viết rule thủ công?"

Cũng hợp lý. Tự viết tay `.claude/rules/` là lựa chọn chính xác nhất, vì chính ta hiểu dự án mình rõ nhất.

**Hoạt động tốt khi:**

- Một dự án, dev duy nhất, ổn với việc dành thời gian đáng kể viết rule từ đầu.
- Quy ước ổn định và đã tài liệu hóa kỹ.

**Vật lộn khi:**

- Khởi tạo dự án mới thường xuyên (mỗi lần lại cần thời gian viết rule).
- Team lớn lên, mọi người quên dần cái gì có trong rule.
- Quy ước tiến hóa, rule lệch lại phía sau.

ClaudeOS-Core đưa ta đi phần lớn quãng đường tới một bộ rule dùng được chỉ trong một lần chạy. Phần còn lại là tinh chỉnh tay. Nhiều người dùng thấy đó là cách dùng thời gian tốt hơn so với khởi đầu từ tệp trắng.

---

## "Khác gì so với chỉ dùng bundle preset?"

Các bundle như Everything Claude Code cung cấp một bộ rule / skill / agent đã curate, phù hợp cho "phần lớn dự án". Chúng tuyệt vời khi áp dụng nhanh và dự án khớp giả định của bundle.

**Bundle hoạt động tốt khi:**

- Quy ước dự án khớp mặc định của bundle (ví dụ Spring Boot chuẩn hoặc Next.js chuẩn).
- Không có lựa chọn stack bất thường (ví dụ MyBatis thay vì JPA).
- Cần một điểm khởi đầu và sẵn lòng tùy biến từ đó.

**Bundle vật lộn khi:**

- Stack dùng tooling không-mặc-định (rule "Spring Boot" của bundle giả định JPA).
- Có quy ước riêng dự án mạnh mà bundle không biết.
- Cần rule cập nhật khi code tiến hóa.

ClaudeOS-Core bổ sung bundle: dùng ClaudeOS-Core cho rule riêng dự án, xếp lớp bundle cho rule workflow chung.

---

## Chọn giữa các công cụ tương tự

Khi đang chọn giữa ClaudeOS-Core và một công cụ Claude Code nhận biết dự án khác, hãy tự hỏi:

1. **Muốn công cụ đọc code, hay muốn mô tả dự án?**
   Đọc code → ClaudeOS-Core. Mô tả → hầu hết các công cụ khác.

2. **Cần output giống nhau mọi lần?**
   Có → ClaudeOS-Core (deterministic). Không → công cụ nào cũng được.

3. **Muốn standards/rules/skills/guides đầy đủ, hay chỉ một CLAUDE.md?**
   Bộ đầy đủ → ClaudeOS-Core. Chỉ CLAUDE.md → Claude `/init`.

4. **Ngôn ngữ output là tiếng Anh, hay khác?**
   Chỉ tiếng Anh → nhiều công cụ đều phù hợp. Ngôn ngữ khác → ClaudeOS-Core (10 ngôn ngữ built-in).

5. **Cần điều phối agent, workflow planning, hoặc hook?**
   Có → dùng công cụ chuyên phù hợp. ClaudeOS-Core không làm những thứ đó.

Nếu đã dùng ClaudeOS-Core và một công cụ khác song song, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) chia sẻ trải nghiệm. Việc đó giúp so sánh này chính xác hơn.

---

## Xem thêm

- [architecture.md](architecture.md): điều gì khiến ClaudeOS-Core deterministic
- [stacks.md](stacks.md): 12 stack ClaudeOS-Core hỗ trợ
- [verification.md](verification.md): lưới an toàn sau khi sinh mà công cụ khác không có
