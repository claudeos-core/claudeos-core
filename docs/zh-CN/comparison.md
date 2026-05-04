# 与同类工具的对比

本页对比 ClaudeOS-Core 与同领域(项目感知的 Claude Code 配置)的其他 Claude Code 工具。

**这是 scope 对比,不是质量评判。** 下面提到的工具大多在各自擅长的领域表现出色。重点是帮你判断 ClaudeOS-Core 是否适合你的场景,还是别的工具更合适。

> 英文原文: [docs/comparison.md](../comparison.md)。中文译文与英文同步。

---

## TL;DR

想**基于代码里实际有什么来自动生成 `.claude/rules/`**,这正是 ClaudeOS-Core 的专长。

想要其他东西(广泛的预设包、规划工作流、agent 编排、跨工具配置同步),Claude Code 生态里有更合适的工具。

---

## ClaudeOS-Core 与其他工具有何不同

ClaudeOS-Core 的定义性特征:

- **读取你的实际源代码**(deterministic Node.js scanner,没有 LLM 猜栈)。
- **4-pass Claude 流水线**,带事实注入 prompt(路径/约定一次提取后反复使用)。
- **5 个 post-generation validator**:`claude-md-validator` 看结构,`content-validator` 看路径声明与内容,`pass-json-validator` 看中间 JSON,`plan-validator` 看 legacy plan 文件,`sync-checker` 看 disk ↔ sync-map 一致性。
- **10 种输出语言**,带 language-invariant 验证。
- **按项目输出**:CLAUDE.md、`.claude/rules/`、standards、skills、guides、memory layer 全部从代码派生,不来自预设包。

同领域的其他 Claude Code 工具(你可以叠加使用,或按需选择别的):

- **Claude `/init`** — Claude Code 内建,一次 LLM 调用写出单个 `CLAUDE.md`。适合在小项目上做快速的一文件设置。
- **预设/包工具** — 分发面向"大多数项目"的精选 agents、skills 或 rules。约定与该包默认一致时最合适。
- **规划/工作流工具** — 为功能开发提供结构化方法(spec、phase 等)。想在 Claude Code 之上加一层流程时最合适。
- **Hook/DX 工具** — 给 Claude Code 会话加 auto-save、代码质量 hook 或开发者体验改进。
- **跨 agent 规则转换器** — 在 Claude Code、Cursor 等工具之间同步规则。

这些工具**多数互补,并非竞争**。ClaudeOS-Core 做的是"从代码生成项目专属规则"这件事,其他工具做别的事,多数可以一起用。

---

## 何时 ClaudeOS-Core 合适

✅ 想让 Claude Code 跟随**你的**项目约定,而不是通用约定。
✅ 在启动新项目(或带新人入职)且想快速设置。
✅ 厌倦了在代码库演变时手工维护 `.claude/rules/`。
✅ 工作在[受支持的 12 个栈](stacks.md)之一。
✅ 想要 deterministic、可重复的输出:同样的代码,每次同样的规则。
✅ 需要非英文输出(内置 10 种语言)。

## 何时 ClaudeOS-Core 不合适

❌ 想要一个开箱即用的预设 agents/skills/rules 包,无需 scan 步骤。
❌ 栈不在支持列表,也不打算贡献。
❌ 想要 agent 编排、规划工作流或编码方法,这些用专门工具更好。
❌ 只需要一个 `CLAUDE.md`,不需要完整的 standards/rules/skills 集,`claude /init` 就够了。

---

## 在 scope 上更窄 vs. 更宽

ClaudeOS-Core 比覆盖面广的预设包**更窄**(不分发预设 agent、hook 或方法,只生成你项目的 rules)。它比专注单一 artifact 的工具**更宽**(生成 CLAUDE.md 加上一棵多目录的 standards、skills、guides、memory 树)。按对你项目重要的维度选即可。

---

## "为什么不直接用 Claude /init?"

合理的问题。`claude /init` 是 Claude Code 内建命令,一次 LLM 调用写出单个 `CLAUDE.md`,快且零配置。

**它在以下场景表现良好:**

- 项目小(≤30 文件)。
- 接受 Claude 扫一眼文件树就猜你的栈。
- 只需要一个 `CLAUDE.md`,不需要完整的 `.claude/rules/` 集。

**它在以下场景吃力:**

- 项目有 Claude 一眼看不出来的自定义约定(例如 MyBatis 而非 JPA、自定义响应封装、不寻常的包布局)。
- 想要团队成员之间可复现的输出。
- 项目大到一次 Claude 调用还没分析完就触顶 context window。

ClaudeOS-Core 正是为 `/init` 吃力的场景而生。`/init` 够用的话,大概也不需要 ClaudeOS-Core。

---

## "为什么不手写规则就好?"

也是合理的问题。手写 `.claude/rules/` 是最准确的选项,毕竟你最了解自己项目。

**它在以下场景表现良好:**

- 只有一个项目、单人开发,愿意花大把时间从零写规则。
- 约定稳定且文档良好。

**它在以下场景吃力:**

- 常启动新项目,每个都要再写一遍规则。
- 团队变大,大家就忘了规则里有什么。
- 约定演变了,规则没跟上。

ClaudeOS-Core 一次运行就能给你一份接近可用的规则集,剩下的是手工调整。不少用户觉得,这比从空白起步更值。

---

## "和直接用预设包有什么区别?"

像 Everything Claude Code 这类包提供一份精选的规则 / skills / agents,适用于"大多数项目"。项目契合包的假设时,它们对快速采用很有帮助。

**包在以下场景表现良好:**

- 项目约定与包默认一致(例如标准 Spring Boot 或标准 Next.js)。
- 没有不寻常的栈选择(例如 MyBatis 而非 JPA)。
- 想要一个起点,愿意在此基础上自定义。

**包在以下场景吃力:**

- 栈用非默认工具链(包的"Spring Boot"规则假设 JPA)。
- 有强项目专属约定,包不知道。
- 想让规则随代码演变而更新。

ClaudeOS-Core 可以与包互补:用 ClaudeOS-Core 处理项目专属规则,叠加包来覆盖通用工作流规则。

---

## 在同类工具间挑选

在 ClaudeOS-Core 与另一个项目感知的 Claude Code 工具之间纠结时,问自己:

1. **想让工具读我的代码,还是想自己描述项目?**
   读代码 → ClaudeOS-Core。描述 → 大多数其他工具。

2. **每次需要相同输出吗?**
   是 → ClaudeOS-Core(deterministic)。否 → 任意。

3. **想要完整的 standards/rules/skills/guides,还是只要一个 CLAUDE.md?**
   完整 → ClaudeOS-Core。只 CLAUDE.md → Claude `/init`。

4. **输出语言是英文,还是别的语言?**
   仅英文 → 多种工具合适。其他语言 → ClaudeOS-Core(内置 10 种)。

5. **需要 agent 编排、规划工作流或 hook 吗?**
   需要 → 用对应专用工具,ClaudeOS-Core 不做这些。

并排试过 ClaudeOS-Core 和另一个工具时,欢迎[开 issue](https://github.com/claudeos-core/claudeos-core/issues) 分享经验,有助于让本对比更准确。

---

## 另请参阅

- [architecture.md](architecture.md) — 是什么让 ClaudeOS-Core 成为 deterministic
- [stacks.md](stacks.md) — ClaudeOS-Core 支持的 12 个栈
- [verification.md](verification.md) — 其他工具所没有的 post-generation 安全网
