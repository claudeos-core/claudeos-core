# Troubleshooting

常见错误及修复办法。如果你的问题不在这里,[开 issue](https://github.com/claudeos-core/claudeos-core/issues) 并附复现步骤。

> 英文原文: [docs/troubleshooting.md](../troubleshooting.md)。中文译文与英文同步。

---

## 安装问题

### "Command not found: claudeos-core"

要么没全局安装,要么 npm 全局 bin 不在 PATH 上。

**Option A — 用 `npx`(推荐,免安装):**
```bash
npx claudeos-core init
```

**Option B — 全局安装:**
```bash
npm install -g claudeos-core
claudeos-core init
```

如果 npm 已安装但仍 "command not found",检查 PATH:
```bash
npm config get prefix
# 验证此 prefix 下的 bin/ 目录在 PATH 中
```

### "Cannot find module 'glob'" 之类

你在项目根之外跑 ClaudeOS-Core。要么:

1. 先 `cd` 进项目。
2. 用 `npx claudeos-core init`(在任意目录都能用)。

### "Node.js version not supported"

ClaudeOS-Core 需要 Node.js 18+。检查版本:

```bash
node --version
```

通过 [nvm](https://github.com/nvm-sh/nvm)、[fnm](https://github.com/Schniz/fnm) 或 OS 包管理器升级。

---

## 预检

### "Claude Code not found"

ClaudeOS-Core 用本地 Claude Code 安装。先安装:

- [官方安装指南](https://docs.anthropic.com/en/docs/claude-code)
- 验证:`claude --version`

如果 `claude` 已装但不在 PATH 上,修你 shell 的 PATH — 没有覆盖用的环境变量。

### "Could not detect stack"

scanner 无法识别项目框架。原因:

- 项目根没有 `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml`。
- 你的栈不在[受支持的 12 个栈](stacks.md)中。
- 自定义布局,不匹配自动检测规则。

**修法:** 验证项目根有上述文件之一。如果你的栈受支持但布局不寻常,见 [advanced-config.md](advanced-config.md) 的 `.claudeos-scan.json` 覆盖项。

### "Authentication test failed"

`init` 跑一次快速的 `claude -p "echo ok"` 来验证 Claude Code 已认证。如果失败:

```bash
claude --version           # 应打印版本
claude -p "say hi"         # 应打印响应
```

如果 `-p` 返回认证错误,按 Claude Code 的认证流程走。ClaudeOS-Core 不能替你修 Claude 认证。

---

## Init 运行时问题

### Init 卡住或耗时长

大型项目的 Pass 1 会跑一会儿。诊断:

1. **Claude Code 还工作吗?** 在另一个终端跑 `claude --version`。
2. **网络 OK 吗?** 每个 pass 都调用 Claude Code,而它调用 Anthropic API。
3. **项目很大吗?** 域分组自动应用(每组 4 域 / 40 文件),所以 24 域项目跑 6 次 Pass 1。

如果长时间无输出(进度 ticker 不前进),Ctrl-C 停止,然后 resume:

```bash
npx claudeos-core init   # 从最后完成的 pass marker 恢复
```

resume 机制只重跑未完成的 pass。

### Claude 报 "Prompt is too long"

意思是 Pass 3 的 context window 用完了。工具已经应用的缓解措施:

- **Pass 3 split mode**(3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux)— 自动。
- **域组分组** — 每组域 > 4 或文件 > 40 时自动应用。
- **Batch sub-division** — ≥16 域时,3b/3c 进一步细分为 ≤15 域 per batch。

如果尽管如此仍触到 context 限制,项目就是异常大。当前选项:

1. 把项目拆到独立目录,各自跑 `init`。
2. 通过 `.claudeos-scan.json` 加积极的 `frontendScan.platformKeywords` 覆盖,跳过非必要 subapp。
3. [开 issue](https://github.com/claudeos-core/claudeos-core/issues) — 你的情况可能需要新的覆盖。

没有"强制更激进的拆分"flag,自动已经做得最大了。

### Init 中途失败

工具是 **resume-safe**。直接重跑:

```bash
npx claudeos-core init
```

它从最后完成的 pass marker 接续。工作不丢。

如果你想要干净起点(删除所有 marker 重新生成),用 `--force`:

```bash
npx claudeos-core init --force
```

注意:`--force` 删除对 `.claude/rules/` 的手工修改。详见 [safety.md](safety.md)。

### Windows: "EBUSY" 或文件锁错误

Windows 文件锁比 Unix 更严。原因:

- 杀软在写入中扫描文件。
- IDE 持有文件独占锁。
- 上次 `init` 崩溃留下的陈旧句柄。

修(按顺序尝试):

1. 关 IDE,重试。
2. 在项目目录禁用杀软实时扫描(或把项目路径加白名单)。
3. 重启 Windows(清陈旧句柄)。
4. 仍不行,改用 WSL2。

`lib/staged-rules.js` 的 move 逻辑从 `renameSync` 回退到 `copyFileSync + unlinkSync`,大多数杀软干扰会被自动处理。如果仍遇锁错误,staged 文件保留在 `claudeos-core/generated/.staged-rules/` 供查看 — 重跑 `init` 重试 move。

### 跨卷 rename 失败(Linux/macOS)

`init` 可能需要跨挂载点原子 rename(例如 `/tmp` 到不同盘上的项目)。工具自动回退到 copy-then-delete — 无需操作。

如果你看到持续的 move 失败,检查你对 `claudeos-core/generated/.staged-rules/` 与 `.claude/rules/` 都有写权限。

---

## 验证问题

### "STALE_PATH: file does not exist"

standards/skills/guides 中提到的某条路径解析不到真实文件。原因:

- Pass 3 编造了一条路径(例如从父目录 + TypeScript 常量名编出 `featureRoutePath.ts`)。
- 你删了某个文件但 docs 仍引用它。
- 文件被 gitignore,但 scanner 的 allowlist 含它。

**修法:**

```bash
npx claudeos-core init --force
```

它会用新的 allowlist 重新跑 Pass 3 / 4。

如果路径是有意 gitignore 而你想让 scanner 忽略,见 [advanced-config.md](advanced-config.md) — 看 `.claudeos-scan.json` 实际支持什么(支持的字段集很小)。

如果 `--force` 不修(在某些罕见 LLM seed 下重跑会再次触发同一幻觉),手工编辑出问题的文件,删去坏路径。该 validator 运行在 **advisory** 档,不会阻断 CI — 你可以发布并稍后修。

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

在 `claudeos-core/skills/00.shared/MANIFEST.md` 中注册的 skill 应在 CLAUDE.md 中被提及。validator 有 **orchestrator/sub-skill 例外** — 当其 orchestrator 被提及时,sub-skill 视为已覆盖。

**修法:** 如果某 sub-skill 的 orchestrator 确实没在 CLAUDE.md 中被提及,跑 `init --force` 重新生成。如果 orchestrator 已被提及而 validator 仍标记,那是 validator bug — 请[开 issue](https://github.com/claudeos-core/claudeos-core/issues) 附文件路径。

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` 要求 Section 8 下恰好 2 个 `####` heading(L4 Memory Files / Memory Workflow)。

可能原因:

- 你手工编辑了 CLAUDE.md,弄坏了 Section 8 结构。
- pre-v2.3.0 的 Pass 4 跑过,追加了一个 Section 9。
- 你正从 pre-v2.2.0 升级(8-section scaffold 还未强制)。

**修法:**

```bash
npx claudeos-core init --force
```

它会干净地重新生成 CLAUDE.md。memory 文件在 `--force` 中保留(只有生成文件被覆盖)。

### "T1: section heading missing English canonical token"

每个 `## N.` section heading 必须包含其英文 canonical token(例如 `## 1. Role Definition` 或 `## 1. 角色定义 (Role Definition)`)。这是为了让多 repo grep 不论 `--lang` 都工作。

**修法:** 编辑 heading,在括号里加上英文 token,或跑 `init --force` 重新生成(v2.3.0+ scaffold 自动遵循该约定)。

---

## Memory layer 问题

### "Memory file growing too large"

跑压缩:

```bash
npx claudeos-core memory compact
```

它应用 4 阶段压缩算法。各阶段做什么,见 [memory-layer.md](memory-layer.md)。

### "propose-rules 提议了我不同意的规则"

输出是供审阅的草稿,不会自动应用。直接拒掉你不要的:

- 直接编辑 `claudeos-core/memory/auto-rule-update.md`,移除你拒绝的提议。
- 或干脆跳过 apply — 你的 `.claude/rules/` 在你手工把提议复制进 rule 文件之前不会改。

### `memory <subcommand>` 报 "not found"

memory 文件缺失。它们由 `init` 的 Pass 4 创建。如果被删:

```bash
npx claudeos-core init --force
```

或者,如果你只想重建 memory 文件而不重跑全部,工具没有单 pass 重放命令。`--force` 是路径。

---

## CI 问题

### 本地通过但 CI 失败

最可能原因:

1. **CI 没装 `claude`。** 依赖翻译的测试通过 `CLAUDEOS_SKIP_TRANSLATION=1` 退出。官方 CI 工作流设了此环境变量;如果你的 fork 没设,设上。

2. **路径规范化(Windows)。** 代码库在很多地方把 Windows 反斜杠规范化成正斜杠,但测试在细节差异上可能踩雷。官方 CI 在 Windows + Linux + macOS 都跑,大多数问题都能抓到 — 如果你看到 Windows 专属失败,可能是真 bug。

3. **Node 版本。** 测试在 Node 18 + 20 上跑。如果你在 Node 16 或 22,可能撞上不兼容 — pin 到 18 或 20 与 CI 对齐。

### `health` 在 CI 里 exit 0,但我期望非零

`health` 仅对 **fail** 档发现非零退出。**warn** 与 **advisory** 打印但不阻断。

如果你想在 advisory 上失败(例如对 `STALE_PATH` 严格),没有内置 flag — 你需要 grep 输出再相应退出:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## 求助

如果以上都不合:

1. **抓住准确错误信息。** ClaudeOS-Core 的错误含文件路径与标识符 — 这些有助复现。
2. **查 issue tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — 你的问题可能已被报告。
3. **开新 issue** 附:OS、Node 版本、Claude Code 版本(`claude --version`)、项目栈、错误输出。如可能,附 `claudeos-core/generated/project-analysis.json`(敏感变量已自动脱敏)。

安全相关问题见 [SECURITY.md](../../SECURITY.md) — 不要为漏洞开公开 issue。

---

## 另请参阅

- [safety.md](safety.md) — `--force` 做什么、保留什么
- [verification.md](verification.md) — validator 发现的含义
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` 覆盖项
