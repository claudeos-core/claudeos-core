# Manual Installation

如果你不能用 `npx`(企业防火墙、离线环境、受限 CI),这是手工安装并运行 ClaudeOS-Core 的方法。

对大多数用户,`npx claudeos-core init` 已经够了 — 你不需要读这一页。

> 英文原文: [docs/manual-installation.md](../manual-installation.md)。中文译文与英文同步。

---

## 前置条件(无论用哪种安装方式)

- **Node.js 18+** — 用 `node --version` 验证。如果更老,通过 [nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm) 或你的 OS 包管理器升级。
- **Claude Code** — 已安装并完成认证。用 `claude --version` 验证。见 [Anthropic 官方安装指南](https://docs.anthropic.com/en/docs/claude-code)。
- **Git repo(推荐)** — `init` 在项目根检查 `.git/` 与至少一个 `package.json`、`build.gradle`、`pom.xml`、`pyproject.toml`。

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

**优点:** 标准做法,适用于大多数环境。
**缺点:** 需要 npm + 对全局 `node_modules` 的写权限。

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

加到你项目的 `package.json`:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
  }
}
```

安装:

```bash
npm install
```

通过 npm scripts 使用:

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

**优点:** 按项目 pin 版本;CI 友好;不污染全局。
**缺点:** 增大 `node_modules` — 不过依赖很少(只有 `glob` 与 `gray-matter`)。

从单个项目卸载:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link(贡献者用)

用于开发或想贡献:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

现在 `claudeos-core` 在你的全局 PATH 上,指向克隆的 repo。

在另一个项目中使用本地 clone:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**优点:** 改工具源码后立刻测试。
**缺点:** 仅适合贡献者。如果你移动了 cloned repo,link 会失效。

---

## Option 4 — Vendored / 离线

对没有互联网的环境:

**在联网机器上:**

```bash
npm pack claudeos-core
# 产出 claudeos-core-2.4.0.tgz
```

**把 `.tgz` 转移到离线环境。**

**从本地文件安装:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

你还需要:
- 离线环境中已安装 Node.js 18+。
- 已安装并完成认证的 Claude Code。
- 在离线 npm 缓存中打包好 `glob` 与 `gray-matter`(或单独 `npm pack` 它们打包过去)。

要把所有传递依赖都打包好,可在解包后的 tarball 副本中运行 `npm install --omit=dev`,然后再转移。

---

## 验证安装

无论哪种安装方式,验证全部 4 个前置条件:

```bash
# 应打印版本(例如 2.4.0)
claudeos-core --version

# 应打印 Claude Code 版本
claude --version

# 应打印 Node 版本(必须 18+)
node --version

# 应打印 Help 文本
claudeos-core --help
```

如果四项都通过,你就可以在某个项目中跑 `claudeos-core init`。

---

## 卸载

```bash
# 如果全局安装
npm uninstall -g claudeos-core

# 如果按项目安装
npm uninstall claudeos-core
```

要同时移除项目里生成的内容:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core 只写入 `claudeos-core/`、`.claude/rules/` 和 `CLAUDE.md`。删这三处足以从项目中完全移除生成内容。

---

## CI 集成

GitHub Actions 中,官方工作流用 `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

对大多数 CI 用例足够 — `npx` 按需下载并缓存包。

如果你的 CI 是离线的或想要 pin 版本,用 Option 2(按项目 devDependency)并:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

对其他 CI 系统(GitLab、CircleCI、Jenkins 等),模式相同:安装 Node、安装 Claude Code、认证、运行 `npx claudeos-core <command>`。

**`health` 是推荐的 CI 检查** — 它快(无 LLM 调用)且涵盖 4 个运行时 validator。要做结构性验证,也跑 `claudeos-core lint`。

---

## 安装故障排查

### "Command not found: claudeos-core"

要么没全局安装,要么你的 PATH 不含 npm 全局 bin。

```bash
npm config get prefix
# 确保此 prefix 下的 bin/ 目录在 PATH 中
```

或者改用 `npx`:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

你在非项目根目录跑 ClaudeOS-Core。要么 `cd` 进项目,要么用 `npx`(可在任何目录工作)。

### "Node.js version not supported"

你是 Node 16 或更老。升级到 Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS 包管理器 — 各异
```

### "Claude Code not found"

ClaudeOS-Core 使用本地 Claude Code 安装。先安装 Claude Code([官方指南](https://docs.anthropic.com/en/docs/claude-code)),然后 `claude --version` 验证。

如果 `claude` 已安装但不在 PATH 上,修你的 PATH — 没有覆盖用的环境变量。

---

## 另请参阅

- [commands.md](commands.md) — 安装好后该跑什么
- [troubleshooting.md](troubleshooting.md) — `init` 期间的运行时错误
