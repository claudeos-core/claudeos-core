# Safety: re-init 时保留什么

一个常见担心:*"我自定义了 `.claude/rules/`。如果我再跑 `npx claudeos-core init`,我的修改会丢吗?"*

**简短回答:** 取决于你是否用 `--force`。

本页说清楚重跑时究竟发生什么、哪些被触碰、哪些不被触碰。

> 英文原文: [docs/safety.md](../safety.md)。中文译文与英文同步。

---

## Re-init 的两条路径

在已有输出的项目上重跑 `init`,会发生两件事之一:

### Path 1 — Resume(默认,无 `--force`)

`init` 读取 `claudeos-core/generated/` 中已有的 pass marker(`pass1-*.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`)。

对每个 pass,如果 marker 存在且结构有效,该 pass 被**跳过**。如果 4 个 marker 都有效,`init` 提前退出 — 没事可做。

**对你修改的影响:** 你手工编辑过的任何东西都被保留。没有 pass 运行,没有文件被写。

这是大多数"我只是再确认一下"工作流的推荐路径。

### Path 2 — Fresh start(`--force`)

```bash
npx claudeos-core init --force
```

`--force` 删除 pass marker 与 rules,然后从零运行完整的 4-pass 流水线。**对 rules 的手工修改丢失。** 这是有意的 — `--force` 是"我要干净的重新生成"的逃生口。

`--force` 删除什么:
- `claudeos-core/generated/` 下所有 `.json` 与 `.md` 文件(4 个 pass marker + scanner 输出)
- 上次 move 中崩溃留下的 `claudeos-core/generated/.staged-rules/` 目录(如有)
- `.claude/rules/` 下的所有内容

`--force` **不会**删除什么:
- `claudeos-core/memory/` 文件(decision log 与 failure pattern 被保留)
- `claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/` 等(这些被 Pass 3 覆盖,但不会预先删除 — Pass 3 不重新生成的内容会保留下来)
- `claudeos-core/` 与 `.claude/` 之外的文件
- 你的 CLAUDE.md(Pass 3 作为正常生成的一部分会覆盖它)

**为什么 `.claude/rules/` 在 `--force` 下被清空,而其他目录不:** Pass 3 有一个 "zero-rules detection" guard,在 `.claude/rules/` 为空时触发,用于决定是否跳过按域 rules stage。如果上次的残留 rules 还在,该 guard 会误判,新 rules 不会生成。

---

## 为什么会有 `.claude/rules/`(staging 机制)

这是被问得最多的问题,所以独占一节。

Claude Code 有一项**敏感路径策略**:即便子进程跑了 `--dangerously-skip-permissions`,也阻断子进程对 `.claude/` 的写入。这是 Claude Code 自身刻意的安全边界。

ClaudeOS-Core 的 Pass 3 与 Pass 4 是 `claude -p` 的子进程调用,所以无法直接写入 `.claude/rules/`。变通做法:

1. pass 的 prompt 指示 Claude 把所有 rule 文件写到 `claudeos-core/generated/.staged-rules/` 而不是别处。
2. pass 完成后,**Node.js orchestrator**(它*不*受 Claude Code 权限策略约束)遍历 staging 树,把每个文件移动到 `.claude/rules/`,保留子路径。
3. 完全成功时,staging 目录被移除。
4. 部分失败时(文件锁或跨卷重命名错误),staging 目录被**保留**,你可以查看哪些没移过去,下次 `init` 重试。

mover 在 `lib/staged-rules.js`。它优先用 `fs.renameSync`,在 Windows 跨卷 / 杀软文件锁错误时回退到 `fs.copyFileSync + fs.unlinkSync`。

**实际你看到的:** 正常流程中,`.staged-rules/` 在一次 `init` 运行内被创建并清空 — 你可能从不会注意到。如果某次运行在 stage 中崩溃,下次 `init` 时你会在那里发现文件,而 `--force` 会清理它们。

---

## 何时保留什么

| 文件类别 | 不带 `--force` | 带 `--force` |
|---|---|---|
| 对 `.claude/rules/` 的手工修改 | ✅ 保留(没有 pass 重跑) | ❌ 丢失(目录被清空) |
| 对 `claudeos-core/standard/` 的手工修改 | ✅ 保留(没有 pass 重跑) | ❌ 若 Pass 3 重新生成同名文件则被覆盖 |
| 对 `claudeos-core/skills/` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| 对 `claudeos-core/guide/` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| 对 `CLAUDE.md` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| `claudeos-core/memory/` 文件 | ✅ 保留 | ✅ 保留(`--force` 不删 memory) |
| `claudeos-core/` 与 `.claude/` 之外的文件 | ✅ 从不触碰 | ✅ 从不触碰 |
| Pass marker(`generated/*.json`) | ✅ 保留(用于 resume) | ❌ 删除(强制全量重跑) |

**诚实小结:** ClaudeOS-Core 没有 diff-and-merge 层。没有"在应用前审阅变更"的提示。保留策略是二元的:要么只重跑缺失的(默认),要么清空并重新生成(`--force`)。

如果你做了大量手工修改,且需要整合新的工具生成内容,推荐工作流是:

1. 先把你的修改 commit 到 git。
2. 在另一个分支上跑 `npx claudeos-core init --force`。
3. 用 `git diff` 查看变化。
4. 手工合并你想要的内容。

这是有意的笨重流程。工具刻意不去自动合并 — 那容易在隐微处把 rules 弄坏。

---

## Pre-v2.2.0 升级检测

当你在用旧版本(pre-v2.2.0,在 8-section scaffold 强制之前)生成的 CLAUDE.md 的项目上跑 `init`,工具通过 heading 计数(`^## ` heading 计数 ≠ 8 — 与语言无关的启发式)检测到这一情况,并发出警告:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

警告是 informational。工具继续正常 — 你可以忽略它,继续保留旧格式。但在 `--force` 下,结构升级被应用,`claude-md-validator` 也会通过。

**memory 文件在 `--force` 升级中被保留。** 只有生成文件被覆盖。

---

## Pass 4 immutability(v2.3.0+)

一个具体的细微点:**Pass 4 不会触碰 `CLAUDE.md`。** Pass 3 的 Section 8 已经编写了所有必需的 L4 memory 文件引用。如果 Pass 4 也写入 CLAUDE.md,它会重复声明 Section 8 的内容,造成 `[S1]`/`[M-*]`/`[F2-*]` validator 错误。

这一点是双向强制的:
- Pass 4 的 prompt 显式地说 "CLAUDE.md MUST NOT BE MODIFIED."
- `lib/memory-scaffold.js` 中的 `appendClaudeMdL4Memory()` 函数是一个 3 行 no-op(无条件返回 true,不写)。
- 回归测试 `tests/pass4-claude-md-untouched.test.js` 强制此契约。

**作为用户你需要知道的:** 如果你在 pre-v2.3.0 的项目上重跑(那时旧的 Pass 4 会向 CLAUDE.md 追加一个 Section 9),你会看到 `claude-md-validator` 报错。跑 `npx claudeos-core init --force` 干净地重新生成。

---

## `restore` 命令做什么

```bash
npx claudeos-core restore
```

`restore` 以 `--execute` 模式运行 `plan-validator`。从历史看,它把 `claudeos-core/plan/*.md` 文件中的内容复制到它们所描述的位置。

**v2.1.0 状态:** master plan 生成在 v2.1.0 中被移除。`claudeos-core/plan/` 不再被 `init` 自动创建。在没有 `plan/` 文件时,`restore` 是 no-op — 它记录一条 informational 消息并干净退出。

为那些手工维护 plan 文件作 ad-hoc 备份/还原用途的用户保留。如果你想要真正的备份,用 git。

---

## 恢复模式

### "我把 ClaudeOS 工作流之外的某些文件删了"

```bash
npx claudeos-core init --force
```

从零重跑 Pass 3 / Pass 4。被删的文件被重新生成。你对其他文件的手工修改丢失(因为 `--force`)— 配合 git 保险。

### "我想移除某条特定 rule"

直接删文件即可。下次 `init`(不带 `--force`)不会重建它,因为 Pass 3 的 resume marker 会跳过整个 pass。

如果你想下次 `init --force` 时重建,什么都不用做 — 重新生成是自动的。

如果你想永久删除(不再被重新生成),你需要把项目固定在当前状态,不要再跑 `--force`。没有内置的"不要重新生成此文件"机制。

### "我想永久自定义某个生成文件"

工具没有 HTML 风格的 begin/end 标记自定义区域。两个选项:

1. **不要在该项目上跑 `--force`** — 在默认 resume 下你的修改可以被无限期保留。
2. **Fork prompt 模板** — 修改你自己 fork 的 `pass-prompts/templates/<stack>/pass3.md`,安装你的 fork,重新生成的文件就会反映你的自定义。

对简单的项目级覆盖,选项 1 通常够用。

---

## validator 检查什么(re-init 之后)

`init` 完成后(不论 resume 还是 `--force`),validator 自动运行:

- `claude-md-validator` — 通过 `lint` 单独运行
- `health-checker` — 运行 4 个 content/path validator

如果有问题(文件缺失、交叉引用断、伪造路径),你会看到 validator 输出。检查列表见 [verification.md](verification.md)。

validator 不修任何东西 — 它们只报告。你阅读报告,然后决定是重跑 `init` 还是手工修。

---

## 通过测试建立信任

"保留用户修改"路径(不带 `--force` 的 resume)由 `tests/init-command.test.js` 与 `tests/pass3-marker.test.js` 下的集成测试覆盖。

CI 在 Linux / macOS / Windows × Node 18 / 20 上运行。

如果你发现 ClaudeOS-Core 以与本文档相悖的方式丢了你的修改,那是 bug。[报告它](https://github.com/claudeos-core/claudeos-core/issues)并附复现步骤。

---

## 另请参阅

- [architecture.md](architecture.md) — staging 机制在上下文中的位置
- [commands.md](commands.md) — `--force` 与其他 flag
- [troubleshooting.md](troubleshooting.md) — 从特定错误恢复
