# Documentation(简体中文)

欢迎。这个文件夹收录了[主 README](../../README.zh-CN.md)没覆盖到、需要深入了解时再看的文档。

如果只是想试试,主 README 就够了。等想搞清楚某个东西 _怎么_ 工作,而不只是 _能_ 工作时再回来。

> 英文原文: [docs/README.md](../README.md)。中文译文与英文同步。

---

## 我是新手 — 从哪里开始?

按顺序读。每篇都假设你读过前一篇。

1. **[Architecture](architecture.md)** — `init` 在底层到底怎么跑。4-pass 流水线、为什么拆成多个 pass、LLM 介入前 scanner 做了什么。从这里建立概念模型。

2. **[Diagrams](diagrams.md)** — 用 Mermaid 图展示同一套架构。和 architecture 文档对照看。

3. **[Stacks](stacks.md)** — 支持的 12 个栈(8 backend + 4 frontend),各自怎么检测,scanner 提取哪些事实。

4. **[Verification](verification.md)** — Claude 写完文档后跑的 5 个 validator。各自查什么、为什么存在、输出怎么读。

5. **[Commands](commands.md)** — 每条 CLI 命令及其作用。掌握基础后当参考查。

读完第 5 篇,完整的心智模型就建好了。本文件夹其余内容都是针对特定情景的。

---

## 我有具体问题

| 问题 | 阅读 |
|---|---|
| "怎么不用 `npx` 安装?" | [Manual Installation](manual-installation.md) |
| "我的项目结构支持吗?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "重新跑一次会覆盖我的修改吗?" | [Safety](safety.md) |
| "出问题了,怎么恢复?" | [Troubleshooting](troubleshooting.md) |
| "为什么用这个,而不是工具 X?" | [Comparison](comparison.md) |
| "memory layer 是干啥的?" | [Memory Layer](memory-layer.md) |
| "scanner 怎么自定义?" | [Advanced Config](advanced-config.md) |

---

## 所有文档

| 文件 | 主题 |
|---|---|
| [architecture.md](architecture.md) | 4-pass 流水线 + scanner + validators 端到端 |
| [diagrams.md](diagrams.md) | 同一流程的 Mermaid 图 |
| [stacks.md](stacks.md) | 12 个支持栈的详细说明 |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log、failure-patterns、compaction |
| [verification.md](verification.md) | 5 个生成后 validator |
| [commands.md](commands.md) | 所有 CLI 命令、所有 flag、exit code |
| [manual-installation.md](manual-installation.md) | 不用 `npx` 安装(企业 / 离线 / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` override |
| [safety.md](safety.md) | re-init 时保留哪些内容 |
| [comparison.md](comparison.md) | 与同类工具的 scope 对比 |
| [troubleshooting.md](troubleshooting.md) | 错误与恢复 |

---

## 如何阅读这个文件夹

每篇文档都写成**可独立阅读**。除非按上面的"新手路径"走,否则不必按顺序读。概念之间有依赖时会用 cross-link 连接。

本目录文档遵循的约定:

- **代码块**展示实际要输入的内容,或文件实际包含的内容。没有特别标注就不会简化。
- **`✅` / `❌`** 在表格中表示"是" / "否",没有更细的语义。
- **像 `claudeos-core/standard/00.core/01.project-overview.md`** 这样的文件路径都是相对项目根目录的绝对路径。
- **像 *(v2.4.0)*** 这样的版本标记表示"本版本新增",之前版本没有。

如果文档里说某事属实,但你找到了相反证据,那就是文档 bug,请[提 issue](https://github.com/claudeos-core/claudeos-core/issues)。

---

## 发现表述不清楚?

欢迎给任何文档提 PR。本目录文档遵循这些约定:

- **平实表达,不堆术语。** 大多数读者是首次使用 ClaudeOS-Core。
- **例子胜过抽象。** 展示真实代码、文件路径、命令输出。
- **如实面对局限。** 哪里不能用、有什么限制,就直说。
- **以源码为准。** 不写不存在的功能。

贡献流程见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。
