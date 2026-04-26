# Verification

Claude 完成文档生成后,代码会用 **5 个独立 validator** 验证输出。它们都不调用 LLM — 所有检查都是 deterministic。

本页讲清楚每个 validator 检查什么、严重度档位如何工作、以及如何阅读输出。

> 英文原文: [docs/verification.md](../verification.md)。中文译文与英文同步。

---

## 为什么要 post-generation 验证

LLM 是非 deterministic 的。即使有事实注入 prompt([source path 的 allowlist](architecture.md#%E4%BA%8B%E5%AE%9E%E6%B3%A8%E5%85%A5-prompt-%E9%98%BB%E6%AD%A2%E5%B9%BB%E8%A7%89)),Claude 仍可能:

- 在 context 压力下漏掉某个必需 section。
- 引用一个差不多但不完全在 allowlist 里的路径(例如从一个父目录 + 一个 TypeScript 常量名,编出 `src/feature/routers/featureRoutePath.ts`)。
- 在 standards 与 rules 之间产生不一致的交叉引用。
- 在 CLAUDE.md 别处重复声明 Section 8 的内容。

Validator 在文档发布前抓住这些悄悄变坏的输出。

---

## 5 个 validator

### 1. `claude-md-validator` — 结构性不变量

对 `CLAUDE.md` 验证一组结构性检查(下表列出检查 ID 家族 — 因 `checkSectionsHaveContent` 与 `checkCanonicalHeadings` 等每个 section 各发出一项,所以可上报的具体 ID 数量会变化)。位于 `claude-md-validator/`。

**通过以下命令运行:**
```bash
npx claudeos-core lint
```

(`health` 不会运行 — 见下文 [为什么有两个入口](#为什么有两个入口lint-vs-health)。)

**它检查什么:**

| Check ID | 它强制什么 |
|---|---|
| `S1` | section 数恰好为 8 |
| `S2-N` | 每个 section 至少有 2 行非空正文 |
| `S-H3-4` | Section 4 有 3 或 4 个 H3 sub-section |
| `S-H3-6` | Section 6 恰好 3 个 H3 sub-section |
| `S-H3-8` | Section 8 恰好 2 个 H3 sub-section |
| `S-H4-8` | Section 8 恰好 2 个 H4 heading(L4 Memory Files / Memory Workflow) |
| `M-<file>` | 4 个 memory 文件(`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`)各只在一行 markdown 表格中出现 |
| `F2-<file>` | memory 文件的表格行限定在 Section 8 内 |
| `T1-1` 到 `T1-8` | 每个 `## N.` section heading 包含其英文 canonical token(`Role Definition`、`Project Overview`、`Build`、`Core Architecture`、`Directory Structure`、`Standard`、`DO NOT Read`、`Memory`)— 大小写不敏感的子串匹配 |

**为什么是 language-invariant:** validator 从不匹配翻译过的 heading 文本。它只匹配 markdown 结构(heading 级别、计数、顺序)与英文 canonical token。同一套检查在受支持的 10 种语言中任何一种生成的 CLAUDE.md 上都通过。

**这一点在实践中为什么重要:** 用 `--lang ja` 与 `--lang en` 生成的 CLAUDE.md 在人类看来完全不同,但 `claude-md-validator` 在两者上给出 byte-for-byte 一致的通过/失败判定。无需各语言 dictionary 维护。

### 2. `content-validator` — 路径与 manifest 检查

验证生成文件的**内容**(不是 CLAUDE.md 的结构)。位于 `content-validator/`。

**10 项检查**(前 9 项在控制台输出中标记为 `[N/9]`;第 10 项是后期添加的,标记为 `[10/10]` — 这种不对称在代码中保留,以便已有的 CI grep 仍能匹配):

| Check | 它强制什么 |
|---|---|
| `[1/9]` CLAUDE.md 存在,≥100 字符,包含必需的 section 关键词(10 语言感知) |
| `[2/9]` `.claude/rules/**/*.md` 文件有 YAML frontmatter 含 `paths:` 键,无空文件 |
| `[3/9]` `claudeos-core/standard/**/*.md` 文件 ≥200 字符,包含 ✅/❌ 示例 + markdown 表格(Kotlin standards 还检查 ` ```kotlin ` 块) |
| `[4/9]` `claudeos-core/skills/**/*.md` 文件非空;orchestrator + MANIFEST 存在 |
| `[5/9]` `claudeos-core/guide/` 含全部 9 个预期文件,各非空(BOM 感知的空检查) |
| `[6/9]` `claudeos-core/plan/` 文件非空(自 v2.1.2 起为 informational — `plan/` 不再被自动创建) |
| `[7/9]` `claudeos-core/database/` 文件存在(缺失时 warning) |
| `[8/9]` `claudeos-core/mcp-guide/` 文件存在(缺失时 warning) |
| `[9/9]` `claudeos-core/memory/` 4 个文件存在 + 结构验证(decision-log 的 ISO 日期、failure-pattern 必需字段、compaction 的 `## Last Compaction` 标记) |
| `[10/10]` 路径声明验证 + MANIFEST drift(3 个子类 — 见下文) |

**Check `[10/10]` 子类:**

| 类 | 它捕捉什么 |
|---|---|
| `STALE_PATH` | `.claude/rules/**` 或 `claudeos-core/standard/**` 中任何 `src/...\.(ts|tsx|js|jsx)` 引用必须能解析到真实文件。围栏代码块与占位路径(`src/{domain}/feature.ts`)被排除。 |
| `STALE_SKILL_ENTRY` | 在 `claudeos-core/skills/00.shared/MANIFEST.md` 中注册的每个 skill 路径都必须在磁盘上存在。 |
| `MANIFEST_DRIFT` | 每个注册的 skill 都必须在 `CLAUDE.md` 中被提及(带 **orchestrator/sub-skill 例外** — Pass 3b 在 Pass 3c 创建子 skill 之前写 Section 6,所以列出每个子 skill 在结构上不可能)。 |

orchestrator/sub-skill 例外:位于 `{category}/{parent-stem}/{NN}.{name}.md` 的注册子 skill,当 `{category}/*{parent-stem}*.md` 处的 orchestrator 在 CLAUDE.md 中被提及时,被视为已覆盖。

**严重度:** content-validator 运行在 **advisory** 档 — 在输出中显示但不阻断 CI。理由:重新运行 Pass 3 不保证能修好 LLM 幻觉,所以阻断会让用户陷入 `--force` 死循环。检测信号(非零退出 + `stale-report` 条目)对 CI 流水线和人工分诊已经足够。

### 3. `pass-json-validator` — Pass 输出 well-formedness

验证每个 pass 写出的 JSON 文件是 well-formed 且包含期望的键。位于 `pass-json-validator/`。

**被验证的文件:**

| 文件 | 必需键 |
|---|---|
| `project-analysis.json` | 5 个必需键(stack、domains 等) |
| `domain-groups.json` | 4 个必需键 |
| `pass1-*.json` | 4 个必需键 + `analysisPerDomain` 对象 |
| `pass2-merged.json` | 10 个公共 section(始终)+ 2 个 backend section(后端栈时)+ 1 个 kotlin 基础 section + 2 个 kotlin CQRS section(适用时)。带语义别名表的模糊匹配;顶层键数 <5 = ERROR、<9 = WARNING;空值检测。 |
| `pass3-complete.json` | marker 存在 + 结构 |
| `pass4-memory.json` | marker 结构:对象、`passNum === 4`、非空 `memoryFiles` 数组 |

pass2 检查是 **stack-aware**:它读取 `project-analysis.json` 来判定 backend/kotlin/cqrs,并相应调整期望的 section。

**严重度:** 运行在 **warn-only** 档 — 显示问题但不阻断 CI。

### 4. `plan-validator` — Plan ↔ disk 一致性(legacy)

把 `claudeos-core/plan/*.md` 文件与 disk 比对。位于 `plan-validator/`。

**3 种模式:**
- `--check`(默认):仅检测 drift
- `--refresh`:用 disk 更新 plan 文件
- `--execute`:把 plan 内容应用到 disk(创建 `.bak` 备份)

**v2.1.0 状态:** master plan 生成在 v2.1.0 中被移除。`claudeos-core/plan/` 不再由 `init` 自动创建。`plan/` 不存在时,该 validator 以 informational 消息跳过。

为那些手工维护 plan 文件作 ad-hoc 备份用途的用户,在 validator 套件中保留。

**安全性:** 阻断路径穿越 — `isWithinRoot(absPath)` 拒绝通过 `../` 逃逸项目根的路径。

**严重度:** 实际检测到 drift 时运行在 **fail** 档。`plan/` 不存在时为 no-op。

### 5. `sync-checker` — Disk ↔ Master Plan 一致性

验证 `sync-map.json`(由 `manifest-generator` 写出)中注册的文件与 disk 上实际文件一致。在 7 个受跟踪目录上做双向检查。位于 `sync-checker/`。

**两步检查:**

1. **Disk → Plan:** 遍历 7 个受跟踪目录(`.claude/rules`、`standard`、`skills`、`guide`、`database`、`mcp-guide`、`memory`)+ `CLAUDE.md`。报告 disk 上存在但未在 `sync-map.json` 中注册的文件。
2. **Plan → Disk:** 报告在 `sync-map.json` 中注册但 disk 上已不存在的路径(orphaned)。

**Exit code:** 只有 orphaned 文件会让 exit 1。Unregistered 文件是 informational(v2.1.0+ 的项目默认零注册路径,所以这才是常态)。

**严重度:** 对 orphaned 文件运行在 **fail** 档。`sync-map.json` 没有映射时干净跳过。

---

## 严重度档位

不是每一项失败的检查都同等严重。`health-checker` 用三档严重度编排运行时 validator:

| 档 | 符号 | 行为 |
|---|---|---|
| **fail** | `❌` | 阻断完成。CI 非零退出。必须修。 |
| **warn** | `⚠️` | 显示在输出中但不阻断。值得调查。 |
| **advisory** | `ℹ️` | 稍后审阅。在不寻常的项目布局下经常是误报。 |

**按档位的示例:**

- **fail:** plan-validator 检测到实际 drift;sync-checker 发现 orphaned 文件;必需的 guide 文件缺失。
- **warn:** pass-json-validator 发现非关键 schema 缺口。
- **advisory:** content-validator 的 `STALE_PATH` 标记了一个存在但被 gitignore 的路径(在某些项目中是误报)。

加入三档系统的目的,是让 `content-validator` 的发现(在不寻常布局中可能是误报)不会让 CI 流水线僵死。否则每条 advisory 都会阻断 — 而重新运行 `init` 也不保证能修好 LLM 幻觉。

汇总行展示分布:
```
All systems operational (1 advisory, 1 warning)
```

---

## 为什么有两个入口:`lint` vs `health`

```bash
npx claudeos-core lint     # 只跑 claude-md-validator
npx claudeos-core health   # 其他 4 个 validator
```

**为什么拆分?**

`claude-md-validator` 找到的是**结构性**问题 — section 数错、memory 文件表格被重复声明、canonical heading 缺英文 token。这些是**需要重新生成 CLAUDE.md** 的信号,不是值得调查的软警告。修法是重新运行 `init`(必要时加 `--force`)。

其他 validator 找到的是**内容**问题 — 路径、manifest 条目、schema 缺口。这些可以在不重新生成所有内容的情况下,通过审阅与手动修复。

把 `lint` 单独保留意味着它可以在 pre-commit hook 中使用(快速,只查结构),而不会拖入更慢的内容检查。

---

## 运行验证

```bash
# 对 CLAUDE.md 运行结构验证
npx claudeos-core lint

# 运行 4-validator health 套件
npx claudeos-core health
```

CI 中推荐 `health`。它仍然很快(无 LLM 调用),涵盖了 CLAUDE.md 结构检查以外的一切 — 大多数 CI 流水线不需要在每次 commit 都验证那些结构。

对 pre-commit hook,`lint` 足够快,可以在每次 commit 上运行。

---

## 输出格式

Validator 默认产生人类可读的输出:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` 把机器可读的产物写入 `claudeos-core/generated/`:

- `rule-manifest.json` — 文件列表 + 来自 gray-matter 的 frontmatter + stat
- `sync-map.json` — 已注册的路径映射(v2.1.0+:默认空数组)
- `stale-report.json` — 来自所有 validator 的合并发现

---

## CI 集成

一个最小的 GitHub Actions 示例:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

退出码仅对 `fail` 档发现非零。`warn` 与 `advisory` 打印但不导致构建失败。

官方 CI 工作流(在 `.github/workflows/test.yml`)在 `ubuntu-latest`、`windows-latest`、`macos-latest` × Node 18 / 20 上运行。

---

## 当 validator 标记的内容你不同意

误报会发生,尤其在不寻常的项目布局中(例如 gitignore 的生成文件、把内容放到非标准路径的自定义构建步骤)。

**要在某个具体文件上抑制检测**,见 [advanced-config.md](advanced-config.md) 中可用的 `.claudeos-scan.json` 覆盖项。

**如果某个 validator 在普遍意义上是错的**(不只是你的项目),[开 issue](https://github.com/claudeos-core/claudeos-core/issues) — 这些检查会根据真实反馈逐步调优。

---

## 另请参阅

- [architecture.md](architecture.md) — validator 在流水线中的位置
- [commands.md](commands.md) — `lint` 与 `health` 命令参考
- [troubleshooting.md](troubleshooting.md) — 特定 validator 错误的含义
