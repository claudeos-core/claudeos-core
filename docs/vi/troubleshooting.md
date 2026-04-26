# Troubleshooting

Các lỗi thường gặp và cách sửa. Nếu vấn đề của bạn không có ở đây, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) kèm các bước tái tạo.

> Bản gốc tiếng Anh: [docs/troubleshooting.md](../troubleshooting.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## Sự cố cài đặt

### "Command not found: claudeos-core"

Bạn chưa cài global, hoặc bin global của npm không có trên PATH.

**Lựa chọn A — Dùng `npx` (khuyến nghị, không cần cài):**
```bash
npx claudeos-core init
```

**Lựa chọn B — Cài global:**
```bash
npm install -g claudeos-core
claudeos-core init
```

Nếu đã `npm install` nhưng vẫn "command not found", kiểm tra PATH:
```bash
npm config get prefix
# Xác minh thư mục bin/ dưới prefix này có trong PATH
```

### "Cannot find module 'glob'" hoặc tương tự

Bạn đang chạy ClaudeOS-Core từ bên ngoài thư mục gốc dự án. Hoặc:

1. `cd` vào dự án trước.
2. Dùng `npx claudeos-core init` (chạy được từ bất kỳ thư mục nào).

### "Node.js version not supported"

ClaudeOS-Core yêu cầu Node.js 18+. Kiểm tra version:

```bash
node --version
```

Nâng cấp qua [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), hoặc package manager OS.

---

## Pre-flight check

### "Claude Code not found"

ClaudeOS-Core dùng cài đặt Claude Code local. Cài nó trước:

- [Hướng dẫn cài chính thức](https://docs.anthropic.com/en/docs/claude-code)
- Kiểm tra: `claude --version`

Nếu `claude` đã cài nhưng không trên PATH, sửa PATH của shell — không có biến môi trường override.

### "Could not detect stack"

Scanner không thể nhận diện framework của dự án. Nguyên nhân:

- Không có `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` ở thư mục gốc dự án.
- Stack của bạn không nằm trong [12 stack được hỗ trợ](stacks.md).
- Layout tùy chỉnh không khớp quy tắc auto-detection.

**Sửa:** xác minh thư mục gốc dự án có một trong các tệp được nhận. Nếu stack được hỗ trợ nhưng layout bất thường, xem [advanced-config.md](advanced-config.md) cho override `.claudeos-scan.json`.

### "Authentication test failed"

`init` chạy nhanh `claude -p "echo ok"` để xác minh Claude Code đã xác thực. Nếu fail:

```bash
claude --version           # Phải in version
claude -p "say hi"         # Phải in một response
```

Nếu `-p` trả về lỗi auth, theo luồng auth của Claude Code. ClaudeOS-Core không thể sửa auth Claude thay bạn.

---

## Sự cố runtime của init

### Init treo hoặc mất rất lâu

Pass 1 trên dự án lớn mất một lúc. Chẩn đoán:

1. **Claude Code có hoạt động?** Chạy `claude --version` ở terminal khác.
2. **Mạng OK?** Mỗi pass gọi Claude Code, vốn gọi API Anthropic.
3. **Dự án rất lớn?** Tách nhóm domain tự áp dụng (4 domain / 40 tệp mỗi nhóm), nên dự án 24 domain chạy Pass 1 sáu lần.

Nếu kẹt lâu mà không có output (ticker tiến độ không nhúc nhích), kill nó (Ctrl-C) và resume:

```bash
npx claudeos-core init   # Resume từ marker pass cuối cùng đã xong
```

Cơ chế resume chỉ chạy lại các pass chưa hoàn tất.

### Lỗi "Prompt is too long" từ Claude

Nghĩa là Pass 3 vượt context window. Các giảm thiểu công cụ đã áp dụng:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — tự động.
- **Tách nhóm domain** — tự áp dụng khi domain > 4 hoặc tệp > 40 mỗi nhóm.
- **Chia batch nhỏ** — với ≥16 domain, 3b/3c chia nhỏ thành batch ≤15 domain mỗi batch.

Nếu vẫn chạm giới hạn context bất chấp, dự án quá lớn. Lựa chọn hiện có:

1. Tách dự án thành các thư mục riêng và chạy `init` ở từng cái.
2. Thêm override `frontendScan.platformKeywords` mạnh tay qua `.claudeos-scan.json` để skip subapp không cần thiết.
3. [Mở issue](https://github.com/claudeos-core/claudeos-core/issues) — có thể cần một override mới cho trường hợp của bạn.

Không có flag để "buộc tách mạnh hơn" ngoài cái đã tự động.

### Init fail giữa chừng

Công cụ là **resume-safe**. Cứ chạy lại:

```bash
npx claudeos-core init
```

Nó nhặt từ marker pass cuối cùng đã xong. Không mất công việc.

Nếu bạn muốn slate sạch (xóa mọi marker và sinh lại tất cả), dùng `--force`:

```bash
npx claudeos-core init --force
```

Lưu ý: `--force` xóa chỉnh sửa thủ công lên `.claude/rules/`. Xem [safety.md](safety.md) để biết chi tiết.

### Windows: lỗi "EBUSY" hoặc file-lock

File locking trên Windows nghiêm hơn Unix. Nguyên nhân:

- Antivirus đang scan tệp giữa lúc ghi.
- IDE đang mở tệp với khóa độc quyền.
- Một `init` trước đã crash và để lại handle stale.

Sửa (thử theo thứ tự):

1. Đóng IDE, retry.
2. Tắt scan thời gian thực của antivirus cho thư mục dự án (hoặc whitelist đường dẫn dự án).
3. Khởi động lại Windows (xóa handle stale).
4. Nếu kéo dài, chạy từ WSL2 thay thế.

Logic move ở `lib/staged-rules.js` fallback từ `renameSync` xuống `copyFileSync + unlinkSync` để xử lý hầu hết can thiệp antivirus tự động. Nếu vẫn gặp lỗi lock, các tệp staged còn ở `claudeos-core/generated/.staged-rules/` để kiểm tra — chạy lại `init` để retry move.

### Lỗi rename xuyên volume (Linux/macOS)

`init` có thể cần rename atomic xuyên các điểm mount (ví dụ `/tmp` sang dự án trên đĩa khác). Công cụ fallback xuống copy-then-delete tự động — không cần làm gì.

Nếu bạn thấy lỗi move kéo dài, kiểm tra bạn có quyền ghi vào cả `claudeos-core/generated/.staged-rules/` lẫn `.claude/rules/`.

---

## Sự cố validation

### "STALE_PATH: file does not exist"

Một đường dẫn được nhắc trong standards/skills/guides không resolve đến tệp thực. Nguyên nhân:

- Pass 3 hallucinate đường dẫn (ví dụ bịa `featureRoutePath.ts` từ thư mục cha + tên hằng TypeScript).
- Bạn đã xóa một tệp nhưng tài liệu vẫn tham chiếu nó.
- Tệp bị gitignore nhưng allowlist của scanner đã có nó.

**Sửa:**

```bash
npx claudeos-core init --force
```

Lệnh này sinh lại Pass 3 / 4 với allowlist mới.

Nếu đường dẫn cố ý gitignore và bạn muốn scanner bỏ qua, xem [advanced-config.md](advanced-config.md) cho cái `.claudeos-scan.json` thực sự hỗ trợ (tập trường được hỗ trợ thì nhỏ).

Nếu `--force` không sửa (chạy lại có thể trigger cùng hallucination trên seed LLM hiếm), sửa tệp vi phạm bằng tay và bỏ đường dẫn xấu. Validator chạy ở mức **advisory**, nên cái này không chặn CI — bạn có thể ship và sửa sau.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

Skill đăng ký trong `claudeos-core/skills/00.shared/MANIFEST.md` nên được nhắc đâu đó trong CLAUDE.md. Validator có **ngoại lệ orchestrator/sub-skill** — sub-skill được coi là covered khi orchestrator của chúng được nhắc.

**Sửa:** nếu orchestrator của một sub-skill thực sự không được nhắc trong CLAUDE.md, chạy `init --force` để sinh lại. Nếu orchestrator CÓ được nhắc và validator vẫn gắn cờ, đó là bug validator — vui lòng [mở issue](https://github.com/claudeos-core/claudeos-core/issues) kèm đường dẫn tệp.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` yêu cầu đúng 2 heading `####` dưới Section 8 (L4 Memory Files / Memory Workflow).

Nguyên nhân khả dĩ:

- Bạn sửa thủ công CLAUDE.md và phá cấu trúc Section 8.
- Một Pass 4 pre-v2.3.0 đã chạy và append một Section 9.
- Bạn đang upgrade từ phiên bản pre-v2.2.0 (scaffold 8 section chưa được cưỡng chế).

**Sửa:**

```bash
npx claudeos-core init --force
```

Lệnh này sinh lại CLAUDE.md sạch. Tệp memory được giữ qua `--force` (chỉ tệp sinh ra mới bị ghi đè).

### "T1: section heading missing English canonical token"

Mỗi heading section `## N.` phải chứa token canonical tiếng Anh của nó (ví dụ `## 1. Role Definition` hoặc `## 1. Định nghĩa vai trò (Role Definition)`). Việc này để giữ grep multi-repo hoạt động bất kể `--lang`.

**Sửa:** sửa heading để bao gồm token tiếng Anh trong dấu ngoặc, hoặc chạy `init --force` để sinh lại (scaffold v2.3.0+ cưỡng chế quy ước này tự động).

---

## Sự cố memory layer

### "Memory file growing too large"

Chạy compaction:

```bash
npx claudeos-core memory compact
```

Lệnh này áp dụng thuật toán compaction 4-stage. Xem [memory-layer.md](memory-layer.md) để biết mỗi stage làm gì.

### "propose-rules suggests rules I disagree with"

Output là draft để xem xét, không tự áp dụng. Chỉ cần từ chối cái bạn không muốn:

- Sửa `claudeos-core/memory/auto-rule-update.md` trực tiếp để bỏ các đề xuất bạn từ chối.
- Hoặc skip hoàn toàn bước áp dụng — `.claude/rules/` của bạn không thay đổi trừ khi bạn copy nội dung đề xuất vào tệp rule thủ công.

### `memory <subcommand>` báo "not found"

Tệp memory bị thiếu. Chúng được tạo bởi Pass 4 của `init`. Nếu chúng đã bị xóa:

```bash
npx claudeos-core init --force
```

Hoặc, nếu bạn chỉ muốn tạo lại tệp memory mà không chạy lại tất cả, công cụ không có lệnh single-pass-replay. `--force` là đường.

---

## Sự cố CI

### Test pass ở local nhưng fail trong CI

Các lý do có khả năng nhất:

1. **CI không có `claude` được cài.** Test phụ thuộc dịch bail qua `CLAUDEOS_SKIP_TRANSLATION=1`. CI workflow chính thức set biến env này; nếu fork của bạn không, hãy set.

2. **Chuẩn hóa đường dẫn (Windows).** Codebase chuẩn hóa backslash Windows thành forward slash ở nhiều nơi, nhưng test có thể vướng ở khác biệt tinh tế. CI chính thức chạy trên Windows + Linux + macOS nên hầu hết vấn đề được bắt — nếu bạn thấy fail riêng Windows, có thể là bug thật.

3. **Version Node.** Test chạy trên Node 18 + 20. Nếu bạn ở Node 16 hoặc 22, có thể gặp không tương thích — pin về 18 hoặc 20 cho parity CI.

### `health` exit 0 trong CI nhưng tôi mong khác 0

`health` exit khác 0 chỉ trên phát hiện mức **fail**. **warn** và **advisory** print nhưng không chặn.

Nếu bạn muốn fail trên advisory (ví dụ để nghiêm với `STALE_PATH`), không có flag built-in — bạn cần grep output và exit phù hợp:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Lấy trợ giúp

Nếu không có cái nào ở trên phù hợp:

1. **Lấy chính xác thông báo lỗi.** Lỗi của ClaudeOS-Core bao gồm đường dẫn tệp và identifier — chúng giúp tái tạo.
2. **Kiểm tra issue tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — issue của bạn có thể đã được báo cáo.
3. **Mở issue mới** với: OS, version Node, version Claude Code (`claude --version`), stack dự án, và output lỗi. Nếu được, đính kèm `claudeos-core/generated/project-analysis.json` (biến nhạy cảm tự động được redact).

Cho vấn đề bảo mật, xem [SECURITY.md](../../SECURITY.md) — đừng mở issue công khai cho lỗ hổng.

---

## Xem thêm

- [safety.md](safety.md) — `--force` làm gì và giữ gì
- [verification.md](verification.md) — phát hiện validator có nghĩa gì
- [advanced-config.md](advanced-config.md) — override `.claudeos-scan.json`
