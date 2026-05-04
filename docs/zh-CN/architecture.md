# Architecture — 4-Pass 流水线

本文档从头到尾讲清 `claudeos-core init` 实际怎么运行。如果只想用这个工具,看[主 README](../../README.zh-CN.md) 就够了。这篇是帮你理解 _为什么_ 这么设计。

如果从没用过,[先跑一次](../../README.zh-CN.md#快速开始)。看过输出后,下面的概念会更快落地。

> 英文原文: [docs/architecture.md](../architecture.md)。中文译文与英文同步。

---

## 核心思想:"代码确认,Claude 创作"

大多数生成 Claude Code 文档的工具是一步到位的:

```
你写的描述  →  Claude  →  CLAUDE.md / rules / standards
```

Claude 只能去猜你的栈、约定、域结构。猜得不错,但终归是猜。ClaudeOS-Core 反过来做:

```
你的源代码
       ↓
[Step A: 代码读取]      ← Node.js scanner, deterministic, 无 AI
       ↓
project-analysis.json   ← 已确认事实: 栈、域、路径
       ↓
[Step B: Claude 写作]    ← 4-pass LLM 流水线, 受事实约束
       ↓
[Step C: 代码验证]       ← 5 个 validator, 自动运行
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**代码负责需要精准的部分**:你的栈、文件路径、域结构。
**Claude 负责需要表达的部分**:说明、约定、行文。
两者不重叠,也不互相二次猜测。

这点为什么重要:LLM 没法编造代码里实际不存在的路径或框架。Pass 3 的 prompt 把 scanner 的允许路径列表显式交给 Claude。Claude 引用了列表外的路径,后续的 `content-validator` 就会标记出来。

---

## Step A:Scanner(deterministic)

调用 Claude 前,一段 Node.js 进程遍历你的项目,写出 `claudeos-core/generated/project-analysis.json`。这份文件是后续所有步骤的唯一 source of truth。

### Scanner 读哪些文件

Scanner 从项目根目录的这些文件里拾取信号:

| 文件 | 它告诉 scanner 什么 |
|---|---|
| `package.json` | Node.js 项目;通过 `dependencies` 推断 framework |
| `pom.xml` | Java/Maven 项目 |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle 项目 |
| `pyproject.toml` / `requirements.txt` | Python 项目;通过 packages 推断 framework |
| `angular.json` | Angular 项目 |
| `nuxt.config.{ts,js}` | Nuxt 项目 |
| `next.config.{ts,js}` | Next.js 项目 |
| `vite.config.{ts,js}` | Vite 项目 |
| `.env*` 文件 | 运行时配置(port、host、DB URL — 见下文) |

都不匹配的话,`init` 会以明确错误停止,不会去猜。

### Scanner 写入 `project-analysis.json` 的内容

- **Stack metadata**:language、framework、ORM、DB、package manager、build tool、logger。
- **Architecture pattern**:Java 项目识别 5 种模式之一(layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal)。Kotlin 识别 CQRS / BFF / multi-module。frontend 识别 App Router / Pages Router / FSD layout 加 `components/*/` 模式,带多阶段 fallback。
- **Domain list**:遍历目录树发现,附带每个域的文件计数。Scanner 给 Pass 1 选 1~2 个代表文件。
- **Source path allowlist**:项目里所有存在的源文件路径。Pass 3 prompt 显式包含这份列表,让 Claude 没有可猜的余地。
- **Monorepo 结构**:Turborepo(`turbo.json`)、pnpm workspaces(`pnpm-workspace.yaml`)、Lerna(`lerna.json`)、npm/yarn workspaces(`package.json#workspaces`),如有。NX 不在显式自动检测之列;通用 `apps/*/` 和 `packages/*/` 模式仍会被各栈 scanner 拾取。
- **`.env` snapshot**:port、host、API target,敏感变量已脱敏。检索顺序见 [stacks.md](stacks.md)。

scanner **不调用 LLM**。同一个项目 + 同样的代码 = 同样的 `project-analysis.json`,每次都一致。

每个栈的细节(scanner 各自提取什么、怎么提取),见 [stacks.md](stacks.md)。

---

## Step B:4-pass Claude 流水线

每个 pass 职责明确。它们顺序运行,Pass N 把 Pass (N-1) 的输出读成一份小型结构化文件,而不是之前所有 pass 的全部输出。

### Pass 1:按域深度分析

**Input:** `project-analysis.json` + 每个域的代表文件。

**作用:** 读代表文件,跨数十个分析类别提取模式(通常每域 50~100+ 条 bullet 级条目,因栈而异:Kotlin/Spring 的 CQRS-aware 模板最丰富,Node.js 轻量模板最精简)。例如:"这个 controller 用 `@RestController` 还是 `@Controller`?响应封装是什么?日志库用哪个?"

**Output:** `pass1-<group-N>.json`,每个域组一个文件。

大型项目里 Pass 1 会跑多次,每个域组一次。分组规则是**每组最多 4 个域、40 个文件**,在 `plan-installer/domain-grouper.js` 中自动应用。一个 12 域的项目会跑 3 次 Pass 1。

为什么要拆:Claude 的 context window 有限。12 个域的源文件塞进同一个 prompt,要么 context 溢出,要么 LLM 只能粗略浏览。拆开让每个 pass 都聚焦。

### Pass 2:跨域合并

**Input:** 所有 `pass1-*.json` 文件。

**作用:** 合并成单一的项目级图景。两个域意见不同时(比如一个说响应封装是 `success()`,另一个说 `ok()`),Pass 2 选主导约定并记录分歧。

**Output:** `pass2-merged.json`,通常 100–400 KB。

### Pass 3:文档生成(split mode)

**Input:** `pass2-merged.json`。

**作用:** 写出真正的文档。这是最重的 pass,在 CLAUDE.md、`.claude/rules/`、`claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/`、`claudeos-core/database/`、`claudeos-core/mcp-guide/` 这些目录里产出约 40~50 个 markdown 文件。

**Output:** 所有面向用户的文件,组织成[主 README](../../README.zh-CN.md#快速开始) 中所示的目录结构。

为了让每个 stage 的输出都能装进 Claude 的 context window(合并后的 Pass 2 input 很大,生成的输出更大),Pass 3 **始终拆成多个 stage**,即便小项目也一样。拆分无条件应用,小项目只是每域 batch 更少:

| Stage | 写入内容 |
|---|---|
| **3a** | 从 `pass2-merged.json` 提取的小型"facts table"(`pass3a-facts.md`)。作为后续 stage 的压缩 input,免得重读那份大合并文件。 |
| **3b-core** | 生成 `CLAUDE.md`(Claude Code 最先读的索引)+ `claudeos-core/standard/` 的核心部分。 |
| **3b-N** | 按域的 rule 与 standard 文件,每 ≤15 个域分一组对应一个 stage。 |
| **3c-core** | 生成 `claudeos-core/skills/` 的 orchestrator 文件 + `claudeos-core/guide/`。 |
| **3c-N** | 按域的 skill 文件。 |
| **3d-aux** | 生成 `claudeos-core/database/` 与 `claudeos-core/mcp-guide/` 下的辅助内容。 |

非常大的项目(≥16 域),3b 与 3c 进一步细分成 batch。每个 batch 拿到一个新的 context window。

所有 stage 成功完成后,写出 `pass3-complete.json` 作为 marker。`init` 中途被打断,下次运行读 marker,从下一个未启动的 stage 恢复,已完成的 stage 不会重跑。

### Pass 4:Memory layer scaffolding

**Input:** `project-analysis.json`、`pass2-merged.json`、`pass3a-facts.md`。

**作用:** 生成 L4 memory layer 加上通用 scaffold rules。所有 scaffold 写入都是 **skip-if-exists**,所以重跑 Pass 4 不会覆盖任何东西。

- `claudeos-core/memory/`:4 个 markdown 文件(`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`)
- `.claude/rules/60.memory/`:4 个 rule 文件(`01.decision-log.md`、`02.failure-patterns.md`、`03.compaction.md`、`04.auto-rule-update.md`),Claude Code 编辑相关区域时自动加载对应 memory 文件
- `.claude/rules/00.core/51.doc-writing-rules.md` 和 `52.ai-work-rules.md`:通用 generic rules(Pass 3 生成项目相关的 `00.core` rules,如 `00.standard-reference.md`;Pass 4 仅在这两个文件不存在时才补上)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md`:关于如何写其他规则的元指南。数字 prefix 自动赋值为 `Math.max(existing-numbers) + 1`,通常根据 Pass 3 已写内容是 `04` 或 `05`。

**Output:** Memory 文件 + `pass4-memory.json` marker。

重点:**Pass 4 不修改 `CLAUDE.md`。** Pass 3 已经在 Section 8 写好了所有必要内容(其中引用了 memory 文件)。这里再改 CLAUDE.md 会重复声明 Section 8,导致 validator 报错。该约束由 prompt 强制,并由 `tests/pass4-claude-md-untouched.test.js` 验证。

每个 memory 文件的作用与生命周期,见 [memory-layer.md](memory-layer.md)。

---

## Step C:验证(deterministic, post-Claude)

Claude 跑完后,Node.js 代码用 5 个 validator 验证输出。**全部不调用 LLM**,所有检查都是 deterministic。

| Validator | 检查什么 |
|---|---|
| `claude-md-validator` | `CLAUDE.md` 的结构性检查(顶层 section 数、按 section 的 H3/H4 计数、memory 文件 table-row 唯一性/作用域、T1 canonical heading token)。Language-invariant,同一套检查在 10 种输出语言上都通过。 |
| `content-validator` | 10 项内容级检查:必需文件存在、standards/skills 中引用的路径真实存在、MANIFEST 一致性。 |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 的 JSON 输出是 well-formed 且包含期望的键。 |
| `plan-validator` | (Legacy)对比保存的 plan 与 disk。v2.1.0 移除了 master plan 生成,现在大多数情况下是 no-op,为向后兼容保留。 |
| `sync-checker` | 受跟踪目录下 disk 文件与 `sync-map.json` 注册项的一致性(orphaned vs. unregistered)。 |

它们有 **3 档严重度**:

- **fail**:阻断完成,CI 中非零退出。结构上坏了。
- **warn**:输出里显示,但不阻断。值得查一下。
- **advisory**:回头审阅。在不常见的项目布局下经常是误报,比如被 gitignore 的文件被报为"missing"。

每个 validator 的完整检查列表,见 [verification.md](verification.md)。

Validator 有两种触发方式:

1. **`claudeos-core lint`**:只跑 `claude-md-validator`。快速、仅结构检查。手动编辑 CLAUDE.md 之后用。
2. **`claudeos-core health`**:跑另外 4 个 validator(claude-md-validator 故意分开,因为 CLAUDE.md 的结构 drift 是 re-init 信号,不是软警告)。建议在 CI 中用。

---

## 这种架构为什么重要

### 事实注入 prompt 防止幻觉

Pass 3 运行时,prompt 大致是这样(简化):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude 没有发明路径的余地。约束是 **positive**(白名单),不是 negative("不要瞎编")。这个差别很重要:LLM 对具体肯定式约束的遵守度,比抽象否定式约束高。

Claude 还是引用了伪造路径的话,末尾跑的 `content-validator [10/10]` 会以 `STALE_PATH` 标记出来。文档发布前用户就能看到警告。

### 基于 marker 的 resume-safe

每个 pass 成功完成时写一个 marker 文件(`pass1-<N>.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`)。`init` 被打断(网络抖动、超时、Ctrl-C)时,下次运行读 marker,从上次结束处接着跑。工作不会丢。

Pass 3 的 marker 还跟踪 **哪些 sub-stage** 完成了,所以部分完成的 Pass 3(比如 3b 完成、3c 在 stage 中崩溃)从下一个 stage 恢复,而不是从 3a。

### 幂等的重跑

在已经有 rules 的项目上跑 `init`,**不会**悄悄覆盖手动修改。

机制:Claude Code 的权限系统会阻断子进程对 `.claude/` 的写入,就算用了 `--dangerously-skip-permissions` 也不行。所以 Pass 3/4 被指示把 rule 文件改写到 `claudeos-core/generated/.staged-rules/`。每个 pass 之后,Node.js orchestrator(它不受 Claude Code 权限策略约束)把 staging 文件移进 `.claude/rules/`,保留子路径。

实际效果:**新项目上重跑会重新创建一切。手动改过 rule 的项目上加 `--force` 重跑会从零再生成(你的修改会丢,这就是 `--force` 的含义)。不带 `--force` 时,resume 机制启动,只跑未完成的 pass。**

完整保留策略见 [safety.md](safety.md)。

### Language-invariant 验证

Validator 不去匹配翻译后的 heading 文本,而是匹配 **结构形状**:heading 级别、计数、顺序。所以同一个 `claude-md-validator` 在 10 种支持语言中任何一种生成的 CLAUDE.md 上,都给出逐字节一致的判定。不用各语言 dictionary,加新语言时也没维护负担。

---

## 性能预期

具体时间主要取决于:
- 项目大小(源文件数、域数)
- 到 Anthropic API 的网络延迟
- Claude Code 配置中选的 Claude model

大致参考:

| 步骤 | 小项目(<200 files) | 中型项目(~1000 files) |
|---|---|---|
| Step A(scanner) | < 5 秒 | 10–30 秒 |
| Step B(4 个 Claude pass) | 几分钟 | 10–30 分钟 |
| Step C(validators) | < 5 秒 | 10–20 秒 |

大型项目的 wall clock 由 Pass 1 主导,因为它每个域组跑一次。一个 24 域项目 = 6 次 Pass-1 调用(24 / 每组 4 域)。

想要精确数字?在你自己的项目上跑一次,这是唯一诚实的答案。

---

## 各步骤代码位置

| 步骤 | 文件 |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack 检测 | `plan-installer/stack-detector.js` |
| 各栈 scanner | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| 域分组 | `plan-installer/domain-grouper.js` |
| Prompt 组装 | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass 模板 | `pass-prompts/templates/<stack>/pass{1,2,3}.md` 各栈;`pass-prompts/templates/common/pass4.md` 跨栈共享 |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`、`content-validator/`、`pass-json-validator/`、`plan-validator/`、`sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## 延伸阅读

- [stacks.md](stacks.md):各栈对应 scanner 提取什么
- [memory-layer.md](memory-layer.md):Pass 4 详解
- [verification.md](verification.md):5 个 validator 全说明
- [diagrams.md](diagrams.md):同一套架构的 Mermaid 图版本
- [comparison.md](comparison.md):与其他 Claude Code 工具的差异
