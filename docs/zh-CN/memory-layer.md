# Memory Layer (L4)

v2.0 起,ClaudeOS-Core 在常规文档之外还会写出一个持久化的 memory layer。它面向那些希望让 Claude Code 做以下事情的长期项目:

1. 记住架构决策及其理由。
2. 从反复出现的失败中学习。
3. 自动把高频 failure pattern 提升为永久规则。

如果你只是用 ClaudeOS-Core 做一次性生成,可以完全忽略这一层。memory 文件会被写出,但只要你不更新,它们就不会增长。

> 英文原文: [docs/memory-layer.md](../memory-layer.md)。中文译文与英文同步。

---

## 写出了什么

Pass 4 完成后,memory layer 由以下组成:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

`60.memory/` 下的 rule 文件有匹配项目文件的 `paths:` glob,memory 应在哪里加载就在哪里加载。当 Claude Code 在编辑匹配某个 glob 的文件时,对应的 memory 文件被加载到 context。

这是**按需加载** — memory 不会始终在 context,只在相关时才加载。这让 Claude 的工作 context 保持精简。

---

## 4 个 memory 文件

### `decision-log.md` — 仅追加的架构决策

当你做出非显然的技术决策时,你(或被你提示的 Claude)追加一段:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

这个文件**随时间增长**。它不会被自动删除。旧决策仍是有价值的上下文。

自动加载的 rule(`60.memory/01.decision-log.md`)告诉 Claude Code 在回答"我们为什么这样组织 X?"这类问题之前先查阅此文件。

### `failure-patterns.md` — 反复出现的错误

当 Claude Code 反复犯同一错误时(例如"Claude 总是生成 JPA,而我们项目用 MyBatis"),写一条:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

`frequency` / `importance` / `last seen` 字段驱动自动决策:

- **压缩:** `lastSeen > 60 days` 且 `importance < 3` 的条目被删除。
- **规则提升:** `frequency >= 3` 的条目通过 `memory propose-rules` 被作为新 `.claude/rules/` 的候选浮现。(importance 不是过滤条件 — 它只影响每条提议的 confidence 分。)

元数据字段由 `memory` 子命令使用锚定的正则(`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`)解析,所以字段行大致要像上面这样。容忍缩进或斜体变体。

### `compaction.md` — 压缩日志

此文件跟踪压缩历史:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

每次 `memory compact` 运行只覆盖 `## Last Compaction` section。你在文件其他地方加的内容会被保留。

### `auto-rule-update.md` — 提议规则队列

当你运行 `memory propose-rules`,Claude 读 `failure-patterns.md` 并把提议的规则内容追加到这里:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

你审阅提议,把想要的复制到真正的 rule 文件中。**propose-rules 命令不会自动应用** — 这是有意的,因为 LLM 起草的 rule 需要人审阅。

---

## 压缩算法

memory 会增长但不会膨胀。当你调用以下命令时,4 阶段压缩运行:

```bash
npx claudeos-core memory compact
```

| Stage | 触发 | 动作 |
|---|---|---|
| 1 | `lastSeen > 30 days` 且未保留 | body 折叠为一行 "fix" + meta |
| 2 | 重复的 heading | 合并(frequency 求和,body 取最新) |
| 3 | `importance < 3` 且 `lastSeen > 60 days` | 删除 |
| 4 | 文件 > 400 行 | 修剪最旧的非保留条目 |

**"被保留"的条目**在所有 stage 中存活。条目被保留的条件之一:

- `importance >= 7`
- `lastSeen < 30 days`
- body 包含一个具体(非 glob)的活跃 rule 路径(例如 `.claude/rules/10.backend/orm-rules.md`)

"活跃 rule 路径"检查很有意思:如果 memory 条目引用了一个真实存在的 rule 文件,该条目就锚定在那条 rule 的生命周期上。只要那条 rule 存在,memory 就保留。

这个压缩算法是对人类遗忘曲线的有意模拟 — 频繁、最近、重要的留下;稀有、陈旧、不重要的淡出。

压缩代码见 `bin/commands/memory.js`(`compactFile()` 函数)。

---

## Importance 评分

运行:

```bash
npx claudeos-core memory score
```

为 `failure-patterns.md` 中的条目重新计算 importance:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

其中 `recency = max(0, 1 - daysSince(lastSeen) / 90)`(在 90 天内线性衰减)。

效果:
- `frequency = 3` 且 `lastSeen = today` 的条目 → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3` 且 `lastSeen = 90+ days ago` 的条目 → `round(3 × 1.5 + 0 × 5) = 5`

**score 命令在插入前剥离 ALL 已有的 importance 行。** 这避免了多次跑 score 时的重复行回归。

---

## Rule 提升:`propose-rules`

运行:

```bash
npx claudeos-core memory propose-rules
```

它会:

1. 读 `failure-patterns.md`。
2. 过滤 `frequency >= 3` 的条目。
3. 请求 Claude 为每个候选起草建议规则内容。
4. 计算 confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance 默认为 0;importance 缺失时上限为 6)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   `anchored` 表示条目引用了 disk 上的真实文件路径。
5. 把提议写入 `auto-rule-update.md` 供人工审阅。

**当 importance 缺失时,evidence 值上限为 6** — 没有 importance 分时,仅靠 frequency 不足以把 sigmoid 推向高 confidence。(这是限制 sigmoid 的 input,不是限制提议数量。)

---

## 典型工作流

对长期项目,节奏大致是:

1. **运行一次 `init`**,与其他东西一起设置好 memory 文件。

2. **正常使用 Claude Code 几周。** 注意反复出现的错误(例如 Claude 总是用错的响应封装)。把条目追加到 `failure-patterns.md` — 手工,或请 Claude 帮忙(`60.memory/02.failure-patterns.md` 中的 rule 指示 Claude 何时追加)。

3. **定期跑 `memory score`** 刷新 importance 值。这快且幂等。

4. **当你有约 5 个以上的高分模式时**,跑 `memory propose-rules` 拿到起草规则。

5. **审阅提议** 在 `auto-rule-update.md` 中。对每条你想要的,把内容复制到 `.claude/rules/` 下的永久 rule 文件。

6. **定期跑 `memory compact`**(每月一次或在定时 CI 中)以让 `failure-patterns.md` 保持有界。

这个节奏正是这 4 个文件的设计目的。跳过任何一步都行 — memory layer 是 opt-in,未使用的文件不会碍事。

---

## 会话连续性

CLAUDE.md 在每次 Claude Code 会话中都被自动加载。memory 文件**默认不自动加载** — 它们由 `60.memory/` rules 在其 `paths:` glob 匹配 Claude 当前编辑文件时按需加载。

这意味着:在新的 Claude Code 会话中,直到你开始处理相关文件之前,memory 都不可见。

在 Claude Code 的自动压缩(约 85% context)运行后,即使 memory 文件之前被加载过,Claude 也会失去对它们的感知。CLAUDE.md 的 Section 8 包含一段 **Session Resume Protocol** 行文,提醒 Claude:

- 重新扫描 `failure-patterns.md` 中相关的条目。
- 重新读 `decision-log.md` 最近的条目。
- 重新匹配 `60.memory/` 规则与当前打开文件。

这是**行文,不是强制** — 但行文是结构化的,使 Claude 倾向于跟随。Session Resume Protocol 是 v2.3.2+ canonical scaffold 的一部分,在所有 10 种输出语言中都被保留。

---

## 何时跳过 memory layer

memory layer 在以下场景增加价值:

- **长期项目**(几个月或更久)。
- **团队** — `decision-log.md` 成为共享的机构记忆与入职工具。
- **每天调用 Claude Code ≥10 次的项目** — failure pattern 累积得足够快,可被有效利用。

它对以下场景过度:

- 一次性脚本,你下周就丢弃。
- 探针或原型项目。
- 教程或 demo。

memory 文件仍由 Pass 4 写出,但如果你不更新,它们不会增长。如果你不用它,没有维护负担。

如果你明确不想让 memory rules 自动加载任何东西(出于 context 成本考虑),可以:

- 删除 `60.memory/` rules — Pass 4 在 resume 时不会重建,只在 `--force` 时重建。
- 或者把每条 rule 的 `paths:` glob 改窄到匹配不到任何东西。

---

## 另请参阅

- [architecture.md](architecture.md) — Pass 4 在流水线 context 中
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` 参考
- [verification.md](verification.md) — content-validator 的 `[9/9]` memory 检查
