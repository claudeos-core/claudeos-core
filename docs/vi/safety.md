# Safety: Cái gì được giữ khi re-init

Một lo ngại phổ biến: *"Tôi đã tùy biến `.claude/rules/`. Chạy lại `npx claudeos-core init` có mất chỉnh sửa không?"*

**Trả lời ngắn:** Tùy có dùng `--force` hay không.

Trang này giải thích chính xác chuyện gì xảy ra khi chạy lại, cái gì bị động đến và cái gì không.

> Bản gốc tiếng Anh: [docs/safety.md](../safety.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Hai con đường khi re-init

Khi chạy lại `init` trên một dự án đã có output, một trong hai điều xảy ra:

### Đường 1 — Resume (mặc định, không có `--force`)

`init` đọc các marker pass hiện có (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) trong `claudeos-core/generated/`.

Với mỗi pass, nếu marker tồn tại và đúng cấu trúc, pass đó **skip**. Nếu cả bốn marker đều hợp lệ, `init` thoát sớm vì không còn gì để làm.

**Tác động lên chỉnh sửa của ta:** mọi thứ chỉnh tay đều giữ nguyên. Không pass nào chạy, không tệp nào bị ghi.

Đây là đường khuyến nghị cho hầu hết workflow "chỉ kiểm tra lại".

### Đường 2 — Bắt đầu lại (`--force`)

```bash
npx claudeos-core init --force
```

`--force` xóa các marker pass và rule, rồi chạy đầy đủ pipeline 4-pass từ đầu. **Chỉnh sửa thủ công lên rule sẽ mất.** Đây là chủ ý: `--force` là cửa thoát cho "muốn sinh lại sạch".

`--force` xóa:
- Mọi tệp `.json` và `.md` dưới `claudeos-core/generated/` (4 marker pass + output scanner)
- Thư mục `claudeos-core/generated/.staged-rules/` còn sót nếu lần chạy trước crash giữa lúc move
- Mọi thứ dưới `.claude/rules/`

`--force` **không** xóa:
- Tệp `claudeos-core/memory/` (decision log và failure pattern giữ nguyên)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, v.v. (Pass 3 ghi đè, nhưng không xóa trước. Bất cứ thứ gì Pass 3 không sinh lại đều ở lại)
- Tệp ngoài `claudeos-core/` và `.claude/`
- CLAUDE.md (Pass 3 ghi đè như một phần của sinh tài liệu thông thường)

**Vì sao `.claude/rules/` bị wipe dưới `--force` còn các thư mục khác thì không:** Pass 3 có guard "zero-rules detection" kích hoạt khi `.claude/rules/` rỗng, dùng để quyết định có skip stage rule theo domain hay không. Nếu rule cũ từ lần chạy trước còn đó, guard sẽ false-negative và rule mới không sinh.

---

## Vì sao `.claude/rules/` tồn tại (cơ chế staging)

Đây là câu hỏi hay gặp nhất, nên có section riêng.

Claude Code có **chính sách đường dẫn nhạy cảm** chặn subprocess ghi vào `.claude/`, kể cả khi subprocess chạy với `--dangerously-skip-permissions`. Đây là ranh giới an toàn có chủ ý trong chính Claude Code.

Pass 3 và Pass 4 của ClaudeOS-Core là các lời gọi subprocess `claude -p`, nên không ghi trực tiếp vào `.claude/rules/` được. Cách giải quyết:

1. Prompt pass chỉ thị Claude ghi mọi tệp rule vào `claudeos-core/generated/.staged-rules/` thay thế.
2. Sau khi pass xong, **orchestrator Node.js** (vốn *không* thuộc phạm vi chính sách quyền của Claude Code) đi qua cây staging và move từng tệp vào `.claude/rules/`, giữ sub-path.
3. Khi thành công đầy đủ, thư mục staging xóa đi.
4. Khi fail một phần (file lock hoặc lỗi rename xuyên volume), thư mục staging **giữ lại** để kiểm tra cái gì không qua, lần `init` tiếp theo sẽ retry.

Trình move ở `lib/staged-rules.js`. Nó dùng `fs.renameSync` trước, rơi xuống `fs.copyFileSync + fs.unlinkSync` cho lỗi xuyên volume / file-lock antivirus của Windows.

**Cái thực sự thấy:** trong luồng bình thường, `.staged-rules/` tạo ra và làm rỗng trong cùng một lần chạy `init`, có khi chẳng bao giờ để ý. Nếu một lần chạy crash giữa stage, sẽ thấy tệp còn ở đó vào lần `init` tiếp theo, và `--force` dọn sạch.

---

## Cái gì được giữ khi nào

| Loại tệp | Không có `--force` | Có `--force` |
|---|---|---|
| Chỉnh sửa thủ công lên `.claude/rules/` | ✅ Giữ (không pass nào chạy lại) | ❌ Mất (thư mục bị wipe) |
| Chỉnh sửa thủ công lên `claudeos-core/standard/` | ✅ Giữ (không pass nào chạy lại) | ❌ Pass 3 ghi đè nếu sinh lại cùng tệp |
| Chỉnh sửa thủ công lên `claudeos-core/skills/` | ✅ Giữ | ❌ Pass 3 ghi đè |
| Chỉnh sửa thủ công lên `claudeos-core/guide/` | ✅ Giữ | ❌ Pass 3 ghi đè |
| Chỉnh sửa thủ công lên `CLAUDE.md` | ✅ Giữ | ❌ Pass 3 ghi đè |
| Tệp `claudeos-core/memory/` | ✅ Giữ | ✅ Giữ (`--force` không xóa memory) |
| Tệp ngoài `claudeos-core/` và `.claude/` | ✅ Không bao giờ động đến | ✅ Không bao giờ động đến |
| Marker pass (`generated/*.json`) | ✅ Giữ (dùng cho resume) | ❌ Xóa (buộc chạy lại đầy đủ) |

**Tóm tắt trung thực:** ClaudeOS-Core không có lớp diff-and-merge. Không có prompt "review changes before applying". Câu chuyện preserve là nhị phân: hoặc chỉ chạy lại phần thiếu (mặc định), hoặc wipe và sinh lại (`--force`).

Nếu đã có chỉnh sửa thủ công đáng kể và cần tích hợp nội dung mới do công cụ sinh, workflow khuyến nghị là:

1. Commit chỉnh sửa vào git trước.
2. Chạy `npx claudeos-core init --force` trên một branch riêng.
3. Dùng `git diff` để xem có gì thay đổi.
4. Merge tay những gì cần từ mỗi bên.

Workflow này nặng nề chủ ý. Công cụ cố tình không auto-merge: sai ở đó sẽ làm hỏng rule một cách âm thầm và tinh vi.

---

## Phát hiện upgrade pre-v2.2.0

Khi chạy `init` trên một dự án có CLAUDE.md sinh bởi phiên bản cũ hơn (pre-v2.2.0, trước khi scaffold 8 section thành cưỡng chế), công cụ phát hiện qua số heading (số heading `^## ` ≠ 8, heuristic không phụ thuộc ngôn ngữ) và phát warning:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

Warning chỉ mang tính informational. Công cụ tiếp tục bình thường, cứ bỏ qua nếu muốn giữ định dạng cũ. Nhưng với `--force`, upgrade cấu trúc sẽ áp dụng và `claude-md-validator` sẽ pass.

**Tệp memory giữ qua các lần upgrade `--force`.** Chỉ tệp sinh ra mới ghi đè.

---

## Pass 4 immutability (v2.3.0+)

Một tinh tế cụ thể: **Pass 4 không động đến `CLAUDE.md`.** Section 8 của Pass 3 đã viết tất cả tham chiếu tệp memory L4 cần thiết. Nếu Pass 4 cũng ghi vào CLAUDE.md, nó sẽ tái khai báo nội dung Section 8, gây lỗi validator `[S1]`/`[M-*]`/`[F2-*]`.

Điều này cưỡng chế cả hai chiều:
- Prompt Pass 4 nói rõ "CLAUDE.md MUST NOT BE MODIFIED."
- Hàm `appendClaudeMdL4Memory()` trong `lib/memory-scaffold.js` là no-op 3 dòng (luôn return true, không ghi gì).
- Test regression `tests/pass4-claude-md-untouched.test.js` cưỡng chế hợp đồng này.

**Người dùng cần biết:** nếu chạy lại một dự án pre-v2.3.0 mà Pass 4 cũ đã append Section 9 vào CLAUDE.md, sẽ thấy lỗi `claude-md-validator`. Chạy `npx claudeos-core init --force` để sinh lại sạch.

---

## Lệnh `restore` làm gì

```bash
npx claudeos-core restore
```

`restore` chạy `plan-validator` ở mode `--execute`. Trước đây nó copy nội dung từ tệp `claudeos-core/plan/*.md` vào các vị trí chúng mô tả.

**Trạng thái v2.1.0:** Sinh master plan đã gỡ ở v2.1.0. `claudeos-core/plan/` không còn do `init` tạo tự động. Thiếu tệp `plan/`, `restore` là no-op: log một message informational rồi thoát sạch.

Lệnh giữ lại cho người dùng tự bảo trì tệp plan cho mục đích backup/restore ad-hoc. Cần backup thật thì dùng git.

---

## Pattern phục hồi

### "Tôi đã xóa vài tệp ngoài workflow của ClaudeOS"

```bash
npx claudeos-core init --force
```

Chạy lại Pass 3 / Pass 4 từ đầu. Tệp đã xóa sẽ sinh lại. Chỉnh sửa thủ công lên các tệp khác sẽ mất (vì `--force`), kết hợp với git để an toàn.

### "Tôi muốn xóa một rule cụ thể"

Cứ xóa tệp. Lần `init` tiếp theo (không kèm `--force`) sẽ không tạo lại, vì marker resume của Pass 3 sẽ skip toàn bộ pass.

Muốn nó tạo lại trên `init --force` tiếp theo thì khỏi cần làm gì, sinh lại là tự động.

Muốn xóa vĩnh viễn (không bao giờ sinh lại) thì phải giữ dự án ở trạng thái hiện tại và không chạy `--force` nữa. Không có cơ chế "do not regenerate this file" sẵn.

### "Tôi muốn tùy biến vĩnh viễn một tệp được sinh"

Công cụ không có marker bắt đầu/kết thúc kiểu HTML cho vùng tùy chỉnh. Hai lựa chọn:

1. **Đừng chạy `--force` trên dự án này**: chỉnh sửa giữ vô thời hạn dưới resume mặc định.
2. **Fork template prompt**: sửa `pass-prompts/templates/<stack>/pass3.md` trong bản sao công cụ, cài fork đó, tệp sinh lại sẽ phản ánh tùy biến.

Với các override đơn giản theo dự án, lựa chọn 1 thường là đủ.

---

## Validator kiểm tra gì (sau re-init)

Sau khi `init` xong (dù resume hay `--force`), validator chạy tự động:

- `claude-md-validator`: chạy riêng qua `lint`
- `health-checker`: chạy bốn validator content/path

Nếu có gì sai (tệp thiếu, cross-reference vỡ, đường dẫn bịa), sẽ thấy output validator. Xem [verification.md](verification.md) để biết danh sách kiểm tra.

Validator không sửa gì, chỉ báo cáo. Đọc báo cáo rồi quyết định chạy lại `init` hay sửa tay.

---

## Niềm tin qua test

Đường "preserve user edits" (resume không có `--force`) có test integration thực thi dưới `tests/init-command.test.js` và `tests/pass3-marker.test.js`.

CI chạy trên Linux / macOS / Windows × Node 18 / 20.

Nếu phát hiện trường hợp ClaudeOS-Core làm mất chỉnh sửa theo cách trái với tài liệu này, đó là bug. [Báo cáo](https://github.com/claudeos-core/claudeos-core/issues) kèm các bước tái tạo.

---

## Xem thêm

- [architecture.md](architecture.md): cơ chế staging trong context
- [commands.md](commands.md): `--force` và các flag khác
- [troubleshooting.md](troubleshooting.md): phục hồi từ các lỗi cụ thể
