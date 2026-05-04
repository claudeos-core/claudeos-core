# Documentation (Tiếng Việt)

Chào mừng. Thư mục này dành cho khi cần đào sâu hơn so với phần [README chính](../../README.vi.md) đã trình bày.

Nếu chỉ thử nghiệm thôi thì README chính là đủ. Quay lại đây khi muốn biết *cách* một thứ hoạt động, không chỉ *rằng* nó hoạt động.

> Bản gốc tiếng Anh: [docs/README.md](../README.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Mới đến đây — bắt đầu từ đâu?

Đọc theo thứ tự sau. Mỗi mục giả định đã đọc mục trước.

1. **[Architecture](architecture.md)** — Lệnh `init` chạy ra sao dưới gầm xe. Pipeline 4-pass, lý do tách nhiều pass, scanner làm gì trước khi LLM được gọi. Bắt đầu ở đây để có mô hình khái niệm.

2. **[Diagrams](diagrams.md)** — Cùng kiến trúc đó, giải thích bằng sơ đồ Mermaid. Đọc lướt song song với tài liệu architecture.

3. **[Stacks](stacks.md)** — 12 stack hỗ trợ (8 backend + 4 frontend), cách phát hiện từng stack, scanner theo stack trích xuất sự kiện gì.

4. **[Verification](verification.md)** — 5 validator chạy sau khi Claude sinh tài liệu. Kiểm tra gì, lý do tồn tại, cách đọc đầu ra.

5. **[Commands](commands.md)** — Mọi lệnh CLI và việc nó làm. Dùng làm reference sau khi đã nắm vững nền tảng.

Xong bước 5 là có mô hình đầy đủ trong đầu. Phần còn lại của thư mục này dành cho các tình huống cụ thể.

---

## Có một câu hỏi cụ thể

| Câu hỏi | Đọc |
|---|---|
| "Cài đặt không dùng `npx` thì sao?" | [Manual Installation](manual-installation.md) |
| "Cấu trúc dự án của mình có được hỗ trợ không?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "Chạy lại có làm bay hết chỉnh sửa tay không?" | [Safety](safety.md) |
| "Có gì đó hỏng, phục hồi thế nào?" | [Troubleshooting](troubleshooting.md) |
| "Tại sao dùng cái này thay vì công cụ X?" | [Comparison](comparison.md) |
| "Memory layer để làm gì?" | [Memory Layer](memory-layer.md) |
| "Tùy biến scanner thế nào?" | [Advanced Config](advanced-config.md) |

---

## Toàn bộ tài liệu

| Tệp | Chủ đề |
|---|---|
| [architecture.md](architecture.md) | Pipeline 4-pass + scanner + validator, từ đầu đến cuối |
| [diagrams.md](diagrams.md) | Sơ đồ Mermaid cho cùng luồng đó |
| [stacks.md](stacks.md) | Chi tiết 12 stack hỗ trợ |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | 5 validator chạy sau khi sinh |
| [commands.md](commands.md) | Mọi lệnh CLI, mọi flag, exit code |
| [manual-installation.md](manual-installation.md) | Cài đặt không dùng `npx` (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | Override `.claudeos-scan.json` |
| [safety.md](safety.md) | Cái gì còn lại khi re-init |
| [comparison.md](comparison.md) | So sánh phạm vi với công cụ tương tự |
| [troubleshooting.md](troubleshooting.md) | Lỗi và phục hồi |

---

## Cách đọc thư mục này

Mỗi tài liệu viết để **đọc độc lập**, không cần đọc theo thứ tự trừ khi đang theo lộ trình mới đến ở trên. Cross-link chỉ xuất hiện khi một khái niệm phải dựa vào khái niệm khác.

Quy ước dùng trong các tài liệu này:

- **Khối code** thể hiện những gì thực sự gõ hoặc nội dung có thật trong tệp. Không lược bỏ, trừ khi nói rõ.
- **`✅` / `❌`** trong bảng nghĩa là "có" / "không", không có sắc thái nào khác.
- **Đường dẫn tệp** như `claudeos-core/standard/00.core/01.project-overview.md` là tuyệt đối, tính từ thư mục gốc dự án.
- **Marker phiên bản** như *(v2.4.0)* gắn vào một tính năng nghĩa là "thêm vào ở phiên bản này", phiên bản trước đó chưa có.

Nếu tài liệu nói điều gì đó là đúng mà bạn tìm thấy bằng chứng ngược lại, đó là lỗi tài liệu, hãy [mở issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Thấy điều gì chưa rõ?

Hoan nghênh PR cho bất kỳ tài liệu nào. Tài liệu tuân theo các quy ước:

- **Tiếng Anh đời thường, không biệt ngữ.** Phần lớn người đọc lần đầu dùng ClaudeOS-Core.
- **Ví dụ, không trừu tượng.** Hiển thị code, đường dẫn tệp, output lệnh thật.
- **Trung thực về giới hạn.** Nếu cái gì đó không chạy hoặc có cảnh báo, nói rõ.
- **Đối chiếu với mã nguồn.** Không tài liệu hóa các tính năng không có thật.

Quy trình đóng góp xem [CONTRIBUTING.md](../../CONTRIBUTING.md).
