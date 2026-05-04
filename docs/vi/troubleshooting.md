# Troubleshooting

Các lỗi thường gặp và cách sửa. Nếu vấn đề không có ở đây, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) kèm các bước tái tạo.

> Bản gốc tiếng Anh: [docs/troubleshooting.md](../troubleshooting.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Sự cố cài đặt

### "Command not found: claudeos-core"

Chưa cài global, hoặc bin global của npm không có trên PATH.

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

Đang chạy ClaudeOS-Core từ bên ngoài thư mục gốc dự án. Cách xử lý:

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

Nếu `claude` đã cài nhưng không trên PATH, sửa PATH của shell. Không có biến môi trường override.

### "Could not detect stack"

Scanner không nhận diện được framework của dự án. Nguyên nhân:

- Không có `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` ở thư mục gốc dự án.
- Stack không nằm trong [12 stack được hỗ trợ](stacks.md).
- Layout tùy chỉnh không khớp quy tắc auto-detection.

**Sửa:** xác minh thư mục gốc dự án có một trong các tệp nhận diện. Nếu stack được hỗ trợ nhưng layout bất thường, xem [advanced-config.md](advanced-config.md) để biết override `.claudeos-scan.json`.

### "Authentication test failed"

`init` chạy nhanh `claude -p "echo ok"` để xác minh Claude Code đã xác thực. Nếu fail:

```bash
claude --version           # Phải in version
claude -p "say hi"         # Phải in một response
```

Nếu `-p` trả về lỗi auth, theo luồng auth của Claude Code. ClaudeOS-Core không thể sửa auth Claude thay được.

---

## Sự cố runtime của init

### Init treo hoặc mất rất lâu

Pass 1 trên dự án lớn mất một lúc. Cách chẩn đoán:

1. **Claude Code có hoạt động?** Chạy `claude --version` ở terminal khác.
2. **Mạng OK?** Mỗi pass gọi Claude Code, vốn gọi API Anthropic.
3. **Dự án rất lớn?** Tách nhóm domain tự áp dụng (4 domain / 40 tệp mỗi nhóm), nên dự án 24 domain sẽ chạy Pass 1 sáu lượt.

Nếu kẹt lâu mà không có output (ticker tiến độ không nhúc nhích), kill (Ctrl-C) rồi resume:

```bash
npx claudeos-core init   # Resume từ marker pass cuối cùng đã xong
```

Cơ chế resume chỉ chạy lại các pass chưa xong.

### Lỗi "Prompt is too long" từ Claude

Nghĩa là Pass 3 vượt context window. Các giảm thiểu công cụ đã áp dụng:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux): tự động.
- **Tách nhóm domain**: tự áp dụng khi domain > 4 hoặc tệp > 40 mỗi nhóm.
- **Chia batch nhỏ**: với ≥16 domain, 3b/3c chia nhỏ thành batch ≤15 domain mỗi batch.

Nếu vẫn chạm giới hạn context, nghĩa là dự án quá lớn. Các lựa chọn:

1. Tách dự án thành các thư mục riêng rồi chạy `init` ở từng cái.
2. Thêm override `frontendScan.platformKeywords` mạnh tay qua `.claudeos-scan.json` để skip subapp không cần thiết.
3. [Mở issue](https://github.com/claudeos-core/claudeos-core/issues): biết đâu cần một override mới cho trường hợp này.

Không có flag để "ép tách mạnh hơn" ngoài phần đã tự động.

### Init fail giữa chừng

Công cụ là **resume-safe**. Cứ chạy lại:

```bash
npx claudeos-core init
```

Nó nhặt từ marker pass cuối cùng đã xong. Không mất công sức gì.

Muốn slate sạch (xóa mọi marker và sinh lại tất cả) thì dùng `--force`:

```bash
npx claudeos-core init --force
```

Lưu ý: `--force` xóa chỉnh sửa thủ công lên `.claude/rules/`. Xem [safety.md](safety.md) để biết chi tiết.

### Windows: lỗi "EBUSY" hoặc file-lock

File locking trên Windows nghiêm hơn Unix. Nguyên nhân:

- Antivirus đang scan tệp giữa lúc ghi.
- IDE đang mở tệp với khóa độc quyền.
- Lần `init` trước đã crash và để lại handle stale.

Sửa (thử theo thứ tự):

1. Đóng IDE, retry.
2. Tắt scan thời gian thực của antivirus cho thư mục dự án (hoặc whitelist đường dẫn dự án).
3. Khởi động lại Windows (xóa handle stale).
4. Nếu kéo dài, chạy từ WSL2 thay thế.

Logic move ở `lib/staged-rules.js` rơi từ `renameSync` xuống `copyFileSync + unlinkSync` để xử lý phần lớn can thiệp antivirus tự động. Nếu vẫn gặp lỗi lock, các tệp staged còn ở `claudeos-core/generated/.staged-rules/` để kiểm tra. Chạy lại `init` để retry move.

### Lỗi rename xuyên volume (Linux/macOS)

`init` đôi khi cần rename atomic xuyên các điểm mount (ví dụ `/tmp` sang dự án trên đĩa khác). Công cụ rơi xuống copy-then-delete tự động, không cần làm gì.

Nếu thấy lỗi move kéo dài, kiểm tra quyền ghi vào cả `claudeos-core/generated/.staged-rules/` lẫn `.claude/rules/`.

---

## Sự cố validation

### "STALE_PATH: file does not exist"

Một đường dẫn được nhắc trong standards/skills/guides không resolve đến tệp thực. Nguyên nhân:

- Pass 3 hallucinate đường dẫn (ví dụ bịa `featureRoutePath.ts` từ thư mục cha + tên hằng TypeScript).
- Đã xóa một tệp nhưng tài liệu vẫn tham chiếu nó.
- Tệp bị gitignore nhưng allowlist của scanner đã có nó.

**Sửa:**

```bash
npx claudeos-core init --force
```

Lệnh này sinh lại Pass 3 / 4 với allowlist mới.

Nếu đường dẫn cố ý gitignore và muốn scanner bỏ qua, xem [advanced-config.md](advanced-config.md) để biết các trường `.claudeos-scan.json` thực sự hỗ trợ (tập trường hỗ trợ khá nhỏ).

Nếu `--force` không sửa được (chạy lại có khi trigger cùng hallucination trên seed LLM hiếm), sửa tệp vi phạm bằng tay và bỏ đường dẫn xấu. Validator chạy ở mức **advisory** nên không chặn CI, ship được và sửa sau.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

Skill đăng ký trong `claudeos-core/skills/00.shared/MANIFEST.md` cần được nhắc đâu đó trong CLAUDE.md. Validator có **ngoại lệ orchestrator/sub-skill**: sub-skill được coi là covered khi orchestrator được nhắc.

**Sửa:** nếu orchestrator của một sub-skill thực sự không được nhắc trong CLAUDE.md, chạy `init --force` để sinh lại. Nếu orchestrator CÓ được nhắc mà validator vẫn gắn cờ, đó là bug validator. Hãy [mở issue](https://github.com/claudeos-core/claudeos-core/issues) kèm đường dẫn tệp.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` yêu cầu đúng 2 heading `####` dưới Section 8 (L4 Memory Files / Memory Workflow).

Nguyên nhân khả dĩ:

- Sửa thủ công CLAUDE.md và phá cấu trúc Section 8.
- Một Pass 4 pre-v2.3.0 đã chạy và append thêm Section 9.
- Đang upgrade từ phiên bản pre-v2.2.0 (scaffold 8 section chưa cưỡng chế).

**Sửa:**

```bash
npx claudeos-core init --force
```

Lệnh này sinh lại CLAUDE.md sạch. Tệp memory giữ qua `--force` (chỉ tệp sinh ra mới ghi đè).

### "T1: section heading missing English canonical token"

Mỗi heading section `## N.` phải chứa token canonical tiếng Anh tương ứng (ví dụ `## 1. Role Definition` hoặc `## 1. Định nghĩa vai trò (Role Definition)`). Việc này để grep multi-repo chạy bất kể `--lang`.

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

Output là draft để xem xét, không tự áp dụng. Cứ từ chối cái không muốn:

- Sửa `claudeos-core/memory/auto-rule-update.md` trực tiếp để bỏ các đề xuất từ chối.
- Hoặc skip hoàn toàn bước áp dụng. `.claude/rules/` không thay đổi trừ khi tự tay copy nội dung đề xuất vào tệp rule.

### `memory <subcommand>` báo "not found"

Tệp memory bị thiếu. Chúng do Pass 4 của `init` tạo. Nếu đã bị xóa:

```bash
npx claudeos-core init --force
```

Hoặc, nếu chỉ muốn tạo lại tệp memory mà không chạy lại tất cả, công cụ không có lệnh single-pass-replay. `--force` là đường duy nhất ra.

---

## Sự cố CI

### Test pass ở local nhưng fail trong CI

Các lý do khả dĩ nhất:

1. **CI không cài `claude`.** Test phụ thuộc dịch bail qua `CLAUDEOS_SKIP_TRANSLATION=1`. CI workflow chính thức set biến env này; nếu fork không có thì set thêm.

2. **Chuẩn hóa đường dẫn (Windows).** Codebase chuẩn hóa backslash Windows thành forward slash ở nhiều nơi, nhưng test đôi khi vướng ở khác biệt tinh tế. CI chính thức chạy trên Windows + Linux + macOS nên phần lớn vấn đề đều bắt được. Nếu thấy fail riêng Windows, có khi là bug thật.

3. **Version Node.** Test chạy trên Node 18 + 20. Nếu đang ở Node 16 hoặc 22, dễ gặp không tương thích, pin về 18 hoặc 20 cho parity CI.

### `health` exit 0 trong CI nhưng tôi mong khác 0

`health` exit khác 0 chỉ trên phát hiện mức **fail**. **warn** và **advisory** print nhưng không chặn.

Cần fail trên advisory (ví dụ để nghiêm với `STALE_PATH`)? Không có flag built-in, phải grep output rồi exit cho phù hợp:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Lấy trợ giúp

Nếu không có cái nào ở trên phù hợp:

1. **Lấy chính xác thông báo lỗi.** Lỗi của ClaudeOS-Core kèm đường dẫn tệp và identifier, giúp tái tạo dễ dàng.
2. **Kiểm tra issue tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues), issue đang gặp biết đâu đã được báo cáo.
3. **Mở issue mới** kèm: OS, version Node, version Claude Code (`claude --version`), stack dự án, và output lỗi. Nếu được, đính kèm `claudeos-core/generated/project-analysis.json` (biến nhạy cảm tự động redact).

Với vấn đề bảo mật, xem [SECURITY.md](../../SECURITY.md). Đừng mở issue công khai cho các lỗ hổng.

---

## Xem thêm

- [safety.md](safety.md): `--force` làm gì và giữ gì
- [verification.md](verification.md): phát hiện validator có nghĩa gì
- [advanced-config.md](advanced-config.md): override `.claudeos-scan.json`
