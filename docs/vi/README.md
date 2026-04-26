# Documentation (Tiếng Việt)

Chào mừng. Thư mục này dành cho khi bạn cần đào sâu hơn so với những gì [README chính](../../README.vi.md) đã trình bày.

Nếu bạn chỉ đang thử nghiệm, README chính là đủ — quay lại đây khi bạn muốn biết *cách* một thứ hoạt động, không chỉ *rằng* nó hoạt động.

> Bản gốc tiếng Anh: [docs/README.md](../README.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## Tôi mới — bắt đầu từ đâu?

Đọc theo thứ tự sau. Mỗi mục giả định bạn đã đọc mục trước.

1. **[Architecture](architecture.md)** — Lệnh `init` thực sự hoạt động như thế nào dưới gầm xe. Pipeline 4-pass, vì sao tách thành nhiều pass, scanner làm gì trước khi LLM được gọi. Bắt đầu ở đây để có mô hình khái niệm.

2. **[Diagrams](diagrams.md)** — Cùng kiến trúc đó nhưng giải thích bằng các sơ đồ Mermaid. Đọc lướt song song với tài liệu architecture.

3. **[Stacks](stacks.md)** — 12 stack được hỗ trợ (8 backend + 4 frontend), cách phát hiện từng stack, scanner theo stack trích xuất những sự kiện gì.

4. **[Verification](verification.md)** — 5 validator chạy sau khi Claude sinh tài liệu. Chúng kiểm tra gì, vì sao tồn tại, và cách đọc đầu ra.

5. **[Commands](commands.md)** — Mọi lệnh CLI và những gì nó làm. Dùng làm reference khi đã nắm vững nền tảng.

Sau bước 5 bạn sẽ có mô hình tâm trí đầy đủ. Phần còn lại trong thư mục này dành cho những tình huống cụ thể.

---

## Tôi có một câu hỏi cụ thể

| Câu hỏi | Đọc |
|---|---|
| "Cài đặt mà không dùng `npx` thế nào?" | [Manual Installation](manual-installation.md) |
| "Cấu trúc dự án của tôi có được hỗ trợ không?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "Chạy lại có làm bay hết chỉnh sửa của tôi không?" | [Safety](safety.md) |
| "Có gì đó hỏng — phục hồi thế nào?" | [Troubleshooting](troubleshooting.md) |
| "Tại sao dùng cái này thay vì công cụ X?" | [Comparison](comparison.md) |
| "Memory layer dùng để làm gì?" | [Memory Layer](memory-layer.md) |
| "Làm sao tùy biến scanner?" | [Advanced Config](advanced-config.md) |

---

## Toàn bộ tài liệu

| Tệp | Chủ đề |
|---|---|
| [architecture.md](architecture.md) | Pipeline 4-pass + scanner + validators từ đầu đến cuối |
| [diagrams.md](diagrams.md) | Sơ đồ Mermaid của cùng luồng đó |
| [stacks.md](stacks.md) | Chi tiết 12 stack được hỗ trợ |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | 5 validator chạy sau khi sinh |
| [commands.md](commands.md) | Mọi lệnh CLI, mọi flag, exit code |
| [manual-installation.md](manual-installation.md) | Cài mà không dùng `npx` (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | Override `.claudeos-scan.json` |
| [safety.md](safety.md) | Cái gì được giữ khi re-init |
| [comparison.md](comparison.md) | So sánh phạm vi với các công cụ tương tự |
| [troubleshooting.md](troubleshooting.md) | Lỗi và phục hồi |

---

## Cách đọc thư mục này

Mỗi tài liệu được viết để **đọc độc lập** — bạn không cần đọc theo thứ tự trừ khi đang theo lộ trình người mới ở trên. Cross-link chỉ tồn tại khi một khái niệm phụ thuộc vào khái niệm khác.

Quy ước dùng trong các tài liệu này:

- **Khối code** thể hiện những gì bạn thực sự gõ hoặc nội dung thực sự có trong tệp. Không lược bỏ trừ khi nói rõ.
- **`✅` / `❌`** trong bảng nghĩa là "có" / "không", không có sắc thái nào khác.
- **Đường dẫn tệp** như `claudeos-core/standard/00.core/01.project-overview.md` là tuyệt đối tính từ thư mục gốc dự án.
- **Marker phiên bản** như *(v2.4.0)* gắn vào một tính năng nghĩa là "thêm vào ở phiên bản này" — phiên bản trước đó không có.

Nếu một tài liệu nói điều gì đó là đúng nhưng bạn tìm thấy bằng chứng ngược lại, đó là lỗi tài liệu — vui lòng [mở issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Bạn thấy điều gì chưa rõ?

Hoan nghênh PR cho bất kỳ tài liệu nào. Tài liệu tuân theo các quy ước:

- **Tiếng Anh đời thường, hơn là biệt ngữ.** Phần lớn người đọc dùng ClaudeOS-Core lần đầu.
- **Ví dụ, hơn là trừu tượng.** Hiển thị code, đường dẫn tệp, output lệnh thật.
- **Trung thực về giới hạn.** Nếu thứ gì đó không hoạt động hoặc có cảnh báo, hãy nói rõ.
- **Đã đối chiếu với mã nguồn.** Không tài liệu hóa các tính năng không tồn tại.

Quy trình đóng góp xem [CONTRIBUTING.md](../../CONTRIBUTING.md).
