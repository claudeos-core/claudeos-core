# CLI Commands

ClaudeOS-Core 实际支持的每条命令、每个 flag、每个 exit code。

本页是 reference。新手请先读[主 README 的 Quick Start](../../README.zh-CN.md#快速开始)。

所有命令用 `npx claudeos-core <command>` 运行(或全局安装后的 `claudeos-core <command>`,见 [manual-installation.md](manual-installation.md))。

> 英文原文: [docs/commands.md](../commands.md)。中文译文与英文同步。

---

## Global flags

对所有命令生效:

| Flag | 效果 |
|---|---|
| `--help` / `-h` | 显示 help。放在命令后(如 `memory --help`)时,sub-command 自行处理 help。 |
| `--version` / `-v` | 打印已安装版本。 |
| `--lang <code>` | 输出语言。`en`、`ko`、`ja`、`zh-CN`、`es`、`vi`、`hi`、`ru`、`fr`、`de` 之一。默认 `en`。目前仅 `init` 使用。 |
| `--force` / `-f` | 跳过 resume 提示,删除上次结果。目前仅 `init` 使用。 |

CLI flag 就这 4 个。**没有 `--json`、`--strict`、`--quiet`、`--verbose`、`--dry-run` 等。** 旧文档里出现过的那些都不存在,`bin/cli.js` 只解析以上 4 个 flag。

---

## 速查

| 命令 | 何时用 |
|---|---|
| `init` | 项目首次使用。生成所有内容。 |
| `lint` | 手动改 `CLAUDE.md` 之后。跑结构验证。 |
| `health` | commit 前或 CI 中。跑 4 个 content/path validator。 |
| `restore` | 已存 plan → disk。(v2.1.0 起多为 no-op,为向后兼容保留。) |
| `refresh` | Disk → 已存 plan。(v2.1.0 起多为 no-op,为向后兼容保留。) |
| `validate` | 跑 plan-validator 的 `--check` 模式。(v2.1.0 起多为 no-op。) |
| `memory <sub>` | Memory layer 维护:`compact`、`score`、`propose-rules`。 |

`restore` / `refresh` / `validate` 保留下来,是因为对不用 legacy plan 文件的项目无害。`plan/` 不存在时(v2.1.0+ 默认),它们都用 informational 消息跳过。

---

## `init` — 生成文档集

```bash
npx claudeos-core init [--lang <code>] [--force]
```

主命令。端到端跑 [4-pass 流水线](architecture.md):

1. Scanner 产出 `project-analysis.json`。
2. Pass 1 分析各域组。
3. Pass 2 把各域合并为项目级图景。
4. Pass 3 生成 CLAUDE.md、rules、standards、skills、guides。
5. Pass 4 scaffold memory layer。

**示例:**

```bash
# 首次,英文输出
npx claudeos-core init

# 首次,韩文输出
npx claudeos-core init --lang ko

# 从零重新生成全部
npx claudeos-core init --force
```

### Resume safety

`init` 是 **resume-safe**。中断时(网络抖动、超时、Ctrl-C),下次运行从最后一个完成的 pass marker 接着跑。Marker 放在 `claudeos-core/generated/`:

- `pass1-<group>.json` — 各域 Pass 1 输出
- `pass2-merged.json` — Pass 2 输出
- `pass3-complete.json` — Pass 3 marker(也跟踪 split mode 里哪些 sub-stage 已完成)
- `pass4-memory.json` — Pass 4 marker

Marker 损坏时(例如写到一半崩溃留下 `{"error":"timeout"}`),validator 拒收,该 pass 重跑。

Pass 3 部分完成时(split mode 在 stage 之间被打断),resume 会检查 marker body:`mode === "split"` 且没有 `completedAt`,Pass 3 就再次调用,从下一个未启动的 stage 恢复。

### `--force` 做什么

`--force` 删除:
- `claudeos-core/generated/` 下所有 `.json` 与 `.md` 文件(含 4 个 pass marker)
- 上次 move 崩溃留下的 `claudeos-core/generated/.staged-rules/` 目录(如有)
- `.claude/rules/` 下所有内容(避免 Pass 3 的 "zero-rules detection" 在残留 rules 上误判)

`--force` **不会**删除:
- `claudeos-core/memory/` 文件(decision log 与 failure pattern 都保留)
- `claudeos-core/` 与 `.claude/` 之外的文件

**rule 的手动修改在 `--force` 下会丢失。** 这是 trade-off,`--force` 就是为"我想从头来过"准备的。想保留修改,直接不带 `--force` 重跑。

### Interactive vs non-interactive

不带 `--lang` 时,`init` 弹出交互式语言选择器(10 个选项,方向键或数字输入)。非 TTY 环境(CI、管道输入)下,选择器退回 readline,没有输入就退回非交互默认值。

不带 `--force` 时,检测到现有 pass marker,`init` 弹出 Continue / Fresh 提示。带 `--force` 则完全跳过该提示。

---

## `lint` — 验证 `CLAUDE.md` 结构

```bash
npx claudeos-core lint
```

对项目的 `CLAUDE.md` 运行 `claude-md-validator`。很快,无 LLM 调用,只做结构检查。

**Exit codes:**
- `0` — 通过。
- `1` — 失败。至少一项结构问题。

**检查内容**(完整 check ID 列表见 [verification.md](verification.md)):

- section 数恰好为 8。
- Section 4 有 3 或 4 个 H3 sub-section。
- Section 6 恰好 3 个 H3 sub-section。
- Section 8 恰好 2 个 H3 sub-section(Common Rules + L4 Memory)以及恰好 2 个 H4 sub-sub-section(L4 Memory Files + Memory Workflow)。
- 每个 canonical section heading 包含其英文 token(如 `Role Definition`、`Memory`),`--lang` 取什么值都不影响,这样跨 repo 的 grep 都能工作。
- 4 个 memory 文件,每个恰好出现在 Section 8 内的一行 markdown 表格中。

validator 是 **language-invariant** 的:同一套检查跑 `--lang ko`、`--lang ja` 或任何其他受支持语言生成的 CLAUDE.md 都工作。

适合 pre-commit hook 与 CI。

---

## `health` — 运行验证套件

```bash
npx claudeos-core health
```

编排 **4 个 validator**(claude-md-validator 由 `lint` 单独跑):

| 顺序 | Validator | 档 | 失败时怎么处理 |
|---|---|---|---|
| 1 | `manifest-generator`(prerequisite) | — | 失败时,`sync-checker` 跳过。 |
| 2 | `plan-validator` | fail | Exit 1。 |
| 3 | `sync-checker` | fail | Exit 1(若 manifest 成功)。 |
| 4 | `content-validator` | advisory | 显示但不阻断。 |
| 5 | `pass-json-validator` | warn | 显示但不阻断。 |

**Exit codes:**
- `0` — 没有 `fail` 档发现。可能有 warning 与 advisory。
- `1` — 至少一项 `fail` 档发现。

三档严重度(fail / warn / advisory)的设计目的,是让 `content-validator` 的发现(在不寻常布局下常有误报)不至于把 CI 流水线卡死。

每个 validator 的检查详情见 [verification.md](verification.md)。

---

## `restore` — 把已存 plan 应用到 disk(legacy)

```bash
npx claudeos-core restore
```

以 `--execute` 模式跑 `plan-validator`:把 `claudeos-core/plan/*.md` 里的内容复制到它们所描述的位置。

**v2.1.0 状态:** master plan 生成已移除。`claudeos-core/plan/` 不再由 `init` 自动创建。`plan/` 不存在时,本命令记录一条 informational 消息并干净退出。

保留下来,是为了那些手工维护 plan 文件作 ad-hoc 备份/还原的用户。在 v2.1.0+ 项目上跑没有副作用。

会为要覆盖的任何文件创建 `.bak` 备份。

---

## `refresh` — 把 disk 同步到已存 plan(legacy)

```bash
npx claudeos-core refresh
```

`restore` 的反向。以 `--refresh` 模式跑 `plan-validator`:读 disk 文件当前状态并更新 `claudeos-core/plan/*.md` 以匹配。

**v2.1.0 状态:** 同 `restore`,`plan/` 不存在时为 no-op。

---

## `validate` — Plan ↔ disk 差异(legacy)

```bash
npx claudeos-core validate
```

以 `--check` 模式跑 `plan-validator`:报告 `claudeos-core/plan/*.md` 与 disk 的差异,不修改任何东西。

**v2.1.0 状态:** `plan/` 不存在时为 no-op。多数用户改用 `health` 即可,它会和其他 validator 一起调用 `plan-validator`。

---

## `memory <subcommand>` — Memory layer 维护

```bash
npx claudeos-core memory <subcommand>
```

3 个子命令。子命令操作 `init` 的 Pass 4 写出的 `claudeos-core/memory/` 文件。这些文件缺失时,每个子命令记录 `not found` 后优雅跳过(尽力而为的工具)。

memory 模型详情见 [memory-layer.md](memory-layer.md)。

### `memory compact`

```bash
npx claudeos-core memory compact
```

对 `decision-log.md` 与 `failure-patterns.md` 应用 4 阶段压缩:

| Stage | 触发 | 动作 |
|---|---|---|
| 1 | `lastSeen > 30 days` 且未保留 | body 折叠为一行 "fix" + meta |
| 2 | 重复的 heading | 合并(frequency 求和,body 取最新) |
| 3 | `importance < 3` 且 `lastSeen > 60 days` | 删除 |
| 4 | 文件 > 400 行 | 修剪最旧的非保留条目 |

`importance >= 7`、`lastSeen < 30 days`,或者 body 引用了具体(非 glob)活跃 rule 路径的条目,自动保留。

压缩后,`compaction.md` 里只有 `## Last Compaction` section 被替换,其他内容(手动笔记)都保留。

### `memory score`

```bash
npx claudeos-core memory score
```

为 `failure-patterns.md` 里的条目重算 importance 分:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

插入前剥离已有的 importance 行(避免重复行回归)。新分数写回到条目的 body。

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

读 `failure-patterns.md`,挑出 frequency ≥ 3 的条目,请 Claude 为头部候选起草建议的 `.claude/rules/` 内容。

每个候选的 confidence:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance 默认为 0;importance 缺失时上限为 6)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = 条目引用了 disk 上存在的具体文件路径。)

输出**追加到 `claudeos-core/memory/auto-rule-update.md`** 供审阅。**不会自动应用**,由用户决定把哪些建议复制到真正的 rule 文件。

---

## 环境变量

| 变量 | 效果 |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | 短路 memory-scaffold 的翻译路径,在调用 `claude -p` 之前抛错。CI 与依赖翻译的测试场景下用,免得真去安装 Claude CLI。严格 `=== "1"` 语义,其他值不会激活。 |
| `CLAUDEOS_ROOT` | 由 `bin/cli.js` 自动设为用户的项目根。内部使用,不要覆盖。 |

完整列表就这两个。没有 `CLAUDE_PATH`、`DEBUG=claudeos:*`、`CLAUDEOS_NO_COLOR` 等,它们都不存在。

---

## Exit codes

| Code | 含义 |
|---|---|
| `0` | 成功。 |
| `1` | 验证失败(`fail` 档发现)或 `InitError`(如 prerequisite 缺失、marker 损坏、文件锁)。 |
| 其他 | 从底层 Node 进程或 sub-tool 透传:未捕获异常、写错误等。 |

没有专门的 "interrupted" exit code。Ctrl-C 直接终止进程,重跑 `init` 即可,resume 机制接管。

---

## `npm test` 跑什么(贡献者用)

clone 了 repo 想本地跑测试:

```bash
npm test
```

这会跨 33 个测试文件运行 `node tests/*.test.js`。测试套件用 Node 内建的 `node:test` runner(无 Jest、无 Mocha)和 `node:assert/strict`。

单个测试文件:

```bash
node tests/scan-java.test.js
```

CI 在 Linux / macOS / Windows × Node 18 / 20 上跑套件。CI 工作流设了 `CLAUDEOS_SKIP_TRANSLATION=1`,这样依赖翻译的测试就不需要 `claude` CLI。

---

## 另请参阅

- [architecture.md](architecture.md) — `init` 内部到底做什么
- [verification.md](verification.md) — validator 检查什么
- [memory-layer.md](memory-layer.md) — `memory` 子命令操作的对象
- [troubleshooting.md](troubleshooting.md) — 命令失败时怎么办
