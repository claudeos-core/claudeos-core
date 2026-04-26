# Cài đặt thủ công

Nếu bạn không thể dùng `npx` (firewall doanh nghiệp, môi trường air-gapped, CI bị khóa chặt), đây là cách cài và chạy ClaudeOS-Core thủ công.

Với hầu hết người dùng, `npx claudeos-core init` là đủ — bạn không cần đọc trang này.

> Bản gốc tiếng Anh: [docs/manual-installation.md](../manual-installation.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## Yêu cầu trước (bất kể cách cài)

- **Node.js 18+** — kiểm tra với `node --version`. Nếu cũ hơn, nâng cấp qua [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), hoặc package manager OS của bạn.
- **Claude Code** — đã cài và xác thực. Kiểm tra với `claude --version`. Xem [hướng dẫn cài chính thức của Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Git repo (ưu tiên)** — `init` kiểm tra `.git/` và ít nhất một trong `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` ở thư mục gốc dự án.

---

## Cách 1 — Cài npm global

```bash
npm install -g claudeos-core
```

Kiểm tra:

```bash
claudeos-core --version
```

Sau đó dùng không cần `npx`:

```bash
claudeos-core init
```

**Ưu:** Chuẩn, hoạt động trên hầu hết setup.
**Nhược:** Cần npm + quyền ghi vào `node_modules` global.

Nâng cấp sau này:

```bash
npm install -g claudeos-core@latest
```

Gỡ cài:

```bash
npm uninstall -g claudeos-core
```

---

## Cách 2 — devDependency theo dự án

Thêm vào `package.json` của dự án:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
  }
}
```

Cài:

```bash
npm install
```

Dùng qua npm scripts:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Sau đó:

```bash
npm run claudeos:init
```

**Ưu:** Phiên bản pin theo dự án; thân thiện CI; không gây ô nhiễm global.
**Nhược:** Phình `node_modules` — dù dependency là tối thiểu (chỉ `glob` và `gray-matter`).

Gỡ cài khỏi một dự án:

```bash
npm uninstall claudeos-core
```

---

## Cách 3 — Clone & link (cho người đóng góp)

Cho phát triển hoặc khi bạn muốn đóng góp:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Giờ `claudeos-core` đã có trên PATH global, trỏ tới repo đã clone.

Để dùng bản clone local trong dự án khác:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Ưu:** Sửa source công cụ và test ngay thay đổi.
**Nhược:** Chỉ hữu ích cho người đóng góp. Link sẽ vỡ nếu bạn move repo đã clone.

---

## Cách 4 — Vendored / air-gapped

Cho môi trường không có internet:

**Trên máy có kết nối:**

```bash
npm pack claudeos-core
# Tạo claudeos-core-2.4.0.tgz
```

**Chuyển `.tgz` sang môi trường air-gapped.**

**Cài từ tệp local:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

Bạn cũng cần:
- Node.js 18+ đã cài sẵn trong môi trường air-gapped.
- Claude Code đã cài và xác thực.
- Các package npm `glob` và `gray-matter` đóng gói trong cache npm offline (hoặc vendored bằng cách `npm pack` chúng riêng).

Để có tất cả transitive dependency, bạn có thể chạy `npm install --omit=dev` bên trong bản unpack của tarball trước khi chuyển.

---

## Xác minh cài đặt

Sau bất kỳ cách cài nào, kiểm tra cả bốn yêu cầu:

```bash
# Phải in version (ví dụ 2.4.0)
claudeos-core --version

# Phải in version Claude Code
claude --version

# Phải in version Node (phải 18+)
node --version

# Phải in text Help
claudeos-core --help
```

Nếu cả bốn đều chạy, bạn đã sẵn sàng chạy `claudeos-core init` trong dự án.

---

## Gỡ cài

```bash
# Nếu cài global
npm uninstall -g claudeos-core

# Nếu cài theo dự án
npm uninstall claudeos-core
```

Để cũng gỡ nội dung sinh ra khỏi dự án:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core chỉ ghi vào `claudeos-core/`, `.claude/rules/`, và `CLAUDE.md`. Gỡ ba thứ đó là đủ để loại bỏ hoàn toàn nội dung sinh ra khỏi dự án.

---

## Tích hợp CI

Cho GitHub Actions, workflow chính thức dùng `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Đủ cho hầu hết trường hợp CI — `npx` tải package theo nhu cầu và cache lại.

Nếu CI của bạn air-gapped hoặc bạn muốn phiên bản pin, dùng Cách 2 (devDependency theo dự án) và:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Cho các hệ CI khác (GitLab, CircleCI, Jenkins, v.v.), pattern là như nhau: cài Node, cài Claude Code, xác thực, chạy `npx claudeos-core <command>`.

**`health` là kiểm tra CI khuyến nghị** — nhanh (không gọi LLM) và phủ bốn validator runtime. Cho validation cấu trúc, chạy thêm `claudeos-core lint`.

---

## Sự cố cài đặt

### "Command not found: claudeos-core"

Hoặc nó chưa được cài global, hoặc PATH của bạn không bao gồm bin global của npm.

```bash
npm config get prefix
# Đảm bảo thư mục bin/ dưới prefix này có trong PATH
```

Hoặc dùng `npx` thay thế:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

Bạn đang chạy ClaudeOS-Core từ thư mục không phải gốc dự án. Hoặc `cd` vào dự án, hoặc dùng `npx` (chạy được từ bất cứ đâu).

### "Node.js version not supported"

Bạn có Node 16 hoặc cũ hơn. Nâng cấp lên Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager — tùy
```

### "Claude Code not found"

ClaudeOS-Core dùng cài đặt Claude Code local. Cài Claude Code trước ([hướng dẫn chính thức](https://docs.anthropic.com/en/docs/claude-code)), rồi kiểm tra với `claude --version`.

Nếu `claude` đã cài nhưng không có trên PATH, sửa PATH — không có biến môi trường override.

---

## Xem thêm

- [commands.md](commands.md) — sau khi cài, chạy gì
- [troubleshooting.md](troubleshooting.md) — lỗi runtime trong `init`
