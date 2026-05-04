# Manual Installation

不能用 `npx` 时(企业防火墙、离线环境、受限 CI),本页讲怎么手工安装并运行 ClaudeOS-Core。

多数用户用 `npx claudeos-core init` 就够了,不需要读这一页。

> 英文原文: [docs/manual-installation.md](../manual-installation.md)。中文译文与英文同步。

---

## 前置条件(无论用哪种安装方式)

- **Node.js 18+** — 用 `node --version` 验证。版本更老时,用 [nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm) 或 OS 包管理器升级。
- **Claude Code** — 已安装并完成认证。用 `claude --version` 验证。见 [Anthropic 官方安装指南](https://docs.anthropic.com/en/docs/claude-code)。
- **Git repo(推荐)** — `init` 在项目根检查 `.git/` 与 `package.json`、`build.gradle`、`pom.xml`、`pyproject.toml` 中至少一个。

---

## Option 1 — 全局 npm 安装

```bash
npm install -g claudeos-core
```

验证:

```bash
claudeos-core --version
```

然后无需 `npx` 直接用:

```bash
claudeos-core init
```

**优点:** 标准做法,大多数环境通用。
**缺点:** 需要 npm 和对全局 `node_modules` 的写权限。

之后升级:

```bash
npm install -g claudeos-core@latest
```

卸载:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — 按项目 devDependency

加到项目的 `package.json`:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

安装:

```bash
npm install
```

用 npm scripts 调用:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

然后:

```bash
npm run claudeos:init
```

**优点:** 按项目 pin 版本,CI 友好,不污染全局。
**缺点:** 增大 `node_modules`,不过依赖很少(只有 `glob` 与 `gray-matter`)。

从单个项目卸载:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link(贡献者用)

用于开发或贡献代码:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

现在 `claudeos-core` 进入了全局 PATH,指向克隆的 repo。

在别的项目里用本地 clone:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**优点:** 改工具源码后立即测试。
**缺点:** 只适合贡献者。挪动 cloned repo 后 link 就失效。

---

## Option 4 — Vendored / 离线

用于没有互联网的环境:

**在联网机器上:**

```bash
npm pack claudeos-core
# 产出 claudeos-core-2.4.4.tgz
```

**把 `.tgz` 转移到离线环境。**

**从本地文件安装:**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

还需要:
- 离线环境里装好 Node.js 18+。
- 装好并已认证的 Claude Code。
- 在离线 npm 缓存里打包好 `glob` 与 `gray-matter`(或者单独 `npm pack` 把它们带过去)。

想把所有传递依赖都打包好,在解包后的 tarball 副本里跑 `npm install --omit=dev`,再转移过去即可。

---

## 验证安装

不管用哪种安装方式,都先验证 4 个前置条件:

```bash
# 应打印版本(例如 2.4.4)
claudeos-core --version

# 应打印 Claude Code 版本
claude --version

# 应打印 Node 版本(必须 18+)
node --version

# 应打印 Help 文本
claudeos-core --help
```

四项都通过,就可以在项目里跑 `claudeos-core init` 了。

---

## 卸载

```bash
# 如果全局安装
npm uninstall -g claudeos-core

# 如果按项目安装
npm uninstall claudeos-core
```

想同时移除项目里生成的内容:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core 只写入 `claudeos-core/`、`.claude/rules/` 和 `CLAUDE.md`。删这三处就能从项目里彻底移除生成内容。

---

## CI 集成

GitHub Actions 里,官方工作流用 `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

对多数 CI 场景够用,`npx` 按需下载并缓存包。

CI 离线或想 pin 版本时,用 Option 2(按项目 devDependency)并配:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

其他 CI 系统(GitLab、CircleCI、Jenkins 等),模式相同:装 Node、装 Claude Code、认证、跑 `npx claudeos-core <command>`。

**`health` 是推荐的 CI 检查**:快(无 LLM 调用),覆盖 4 个运行时 validator。要做结构性验证,也跑一下 `claudeos-core lint`。

---

## 安装故障排查

### "Command not found: claudeos-core"

要么没全局安装,要么 PATH 里没有 npm 全局 bin。

```bash
npm config get prefix
# 确保此 prefix 下的 bin/ 目录在 PATH 中
```

或者改用 `npx`:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

在非项目根目录跑了 ClaudeOS-Core。要么 `cd` 进项目,要么用 `npx`(任意目录都能用)。

### "Node.js version not supported"

用的是 Node 16 或更老。升级到 Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS 包管理器 — 各异
```

### "Claude Code not found"

ClaudeOS-Core 用本地 Claude Code 安装。先装 Claude Code([官方指南](https://docs.anthropic.com/en/docs/claude-code)),再用 `claude --version` 验证。

`claude` 已装但不在 PATH 上,就修 PATH。没有覆盖用的环境变量。

---

## 另请参阅

- [commands.md](commands.md) — 装好后该跑什么
- [troubleshooting.md](troubleshooting.md) — `init` 期间的运行时错误
