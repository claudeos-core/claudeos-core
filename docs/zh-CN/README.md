# Documentation(简体中文)

欢迎。这个文件夹是给在[主 README](../../README.zh-CN.md)中没覆盖到、需要更深入了解时阅读的文档集合。

如果你只是想试试,主 README 已经够了 — 当你想知道某个东西 _怎么_ 工作,而不仅仅是 _能_ 工作时再回来。

> 英文原文: [docs/README.md](../README.md)。中文译文与英文同步。

---

## 我是新手 — 从哪里开始?

按顺序阅读。每篇都假设你已读过前一篇。

1. **[Architecture](architecture.md)** — `init` 在底层到底如何工作。4-pass 流水线、为什么拆分成多个 pass、在 LLM 介入之前 scanner 做了什么。从这里开始建立概念模型。

2. **[Diagrams](diagrams.md)** — 用 Mermaid 图展示同样的架构。可与 architecture 文档对照浏览。

3. **[Stacks](stacks.md)** — 受支持的 12 个栈(8 backend + 4 frontend),各自如何检测,scanner 提取了哪些事实。

4. **[Verification](verification.md)** — Claude 写完文档后运行的 5 个 validator。它们检查什么、为什么存在、如何阅读输出。

5. **[Commands](commands.md)** — 每条 CLI 命令及其作用。掌握基础后作为参考使用。

读完第 5 篇,你就有了完整的心智模型。本文件夹其余内容都是针对特定情景的。

---

## 我有具体问题

| 问题 | 阅读 |
|---|---|
| "如何不用 `npx` 安装?" | [Manual Installation](manual-installation.md) |
| "我的项目结构受支持吗?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "重新运行会把我的修改吹掉吗?" | [Safety](safety.md) |
| "出问题了 — 怎么恢复?" | [Troubleshooting](troubleshooting.md) |
| "为什么用这个,而不是工具 X?" | [Comparison](comparison.md) |
| "memory layer 是干什么的?" | [Memory Layer](memory-layer.md) |
| "怎么自定义 scanner?" | [Advanced Config](advanced-config.md) |

---

## 所有文档

| 文件 | 主题 |
|---|---|
| [architecture.md](architecture.md) | 4-pass 流水线 + scanner + validators 端到端 |
| [diagrams.md](diagrams.md) | 同一流程的 Mermaid 图 |
| [stacks.md](stacks.md) | 12 个受支持栈的详细说明 |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log、failure-patterns、compaction |
| [verification.md](verification.md) | 5 个 post-generation validator |
| [commands.md](commands.md) | 所有 CLI 命令、所有 flag、exit code |
| [manual-installation.md](manual-installation.md) | 不用 `npx` 安装(企业 / 离线 / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` override |
| [safety.md](safety.md) | re-init 时保留的内容 |
| [comparison.md](comparison.md) | 与同类工具的 scope 对比 |
| [troubleshooting.md](troubleshooting.md) | 错误与恢复 |

---

## 如何阅读这个文件夹

每篇文档都被写成**可独立阅读** — 除非你正在按上面的"新手路径"走,否则不必按顺序读。当一个概念依赖于另一个时,会用 cross-link 连接。

本目录文档使用的约定:

- **代码块**展示你实际会输入的内容或文件实际包含的内容。除非明确标注,否则不会被简化。
- **`✅` / `❌`** 在表格中表示"是" / "否",没有更细的语义。
- **像 `claudeos-core/standard/00.core/01.project-overview.md`** 这样的文件路径都是相对项目根目录的绝对路径。
- **像 *(v2.4.0)*** 这样的版本标记表示"本版本添加" — 之前版本没有。

如果文档里说某事属实但你找到了相反证据,那是文档 bug — 请[开一个 issue](https://github.com/claudeos-core/claudeos-core/issues)。

---

## 发现表述不清楚?

任何文档都欢迎 PR。本目录文档遵循以下约定:

- **平实英语而非术语堆砌。** 大多数读者是首次使用 ClaudeOS-Core。
- **示例胜于抽象。** 展示真实代码、文件路径、命令输出。
- **诚实面对局限。** 如果某事不能工作或有限制,就如实说。
- **以源码为依据。** 不文档化不存在的功能。

贡献流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。
