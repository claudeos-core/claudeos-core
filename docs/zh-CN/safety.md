# Safety: re-init 时保留什么，以及什么永远不会离开你的 `.env`

一个常见担心:*"我自定义了 `.claude/rules/`。再跑一次 `npx claudeos-core init`,改动会丢吗?"*

**简短回答:** 取决于有没有用 `--force`。

本页讲清楚重跑时究竟发生了什么:哪些会动,哪些不会动。

> 英文原文: [docs/safety.md](../safety.md)。中文译文与英文同步。

---

## Re-init 的两条路径

在已有输出的项目上重跑 `init`,只会发生两件事之一:

### Path 1 — Resume(默认,无 `--force`)

`init` 读取 `claudeos-core/generated/` 中已有的 pass marker(`pass1-*.json`、`pass2-merged.json`、`pass3-complete.json`、`pass4-memory.json`)。

对每个 pass,只要 marker 存在且结构有效,这个 pass 就**跳过**。4 个 marker 都有效时,`init` 提前退出,没事可做。

**对手工修改的影响:** 手工编辑过的任何东西都保留。没有 pass 运行,没有文件被写。

这是大多数"再确认一下"工作流的推荐路径。

### Path 2 — Fresh start(`--force`)

```bash
npx claudeos-core init --force
```

`--force` 删掉 pass marker 与 rules,然后从零运行完整的 4-pass 流水线。**对 rules 的手工修改会丢。** 这是有意的:`--force` 是"我要干净重新生成"的逃生口。

`--force` 会删:
- `claudeos-core/generated/` 下所有 `.json` 与 `.md` 文件(4 个 pass marker + scanner 输出)
- 上次 move 崩溃留下的 `claudeos-core/generated/.staged-rules/` 目录(如有)
- `.claude/rules/` 下由 claudeos-core 管理的分类,即所有带 `NN.` 前缀的条目(`00.core/`、`10.backend/`、… `90.optional/`)。你自己放在那里、没有该前缀的文件或文件夹(例如 `.claude/rules/my-team-conventions.md`)**原样保留**,它们从来不是这个工具生成的

`--force` **不会**删:
- `claudeos-core/memory/` 文件(decision log 与 failure pattern 保留)
- `claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/` 等(这些会被 Pass 3 覆盖,但不会预先删除,Pass 3 不重新生成的内容会保留)
- `claudeos-core/` 与 `.claude/` 之外的文件
- 你的 CLAUDE.md(Pass 3 在正常生成中会覆盖)

**为什么 `.claude/rules/NN.*` 这些受管分类在 `--force` 下被清空,其他目录不:** Pass 3 有一个 "zero-rules detection" guard,`.claude/rules/` 为空时触发,用来决定是否跳过按域 rules stage。上次的残留 rules 还在时,该 guard 会误判,新 rules 就不会生成。

---

## 为什么会有 `.claude/rules/`(staging 机制)

这是被问得最多的问题,单独占一节。

Claude Code 有一项**敏感路径策略**:即便子进程跑了 `--dangerously-skip-permissions`,也会阻断子进程对 `.claude/` 的写入。这是 Claude Code 自身刻意设的安全边界。

ClaudeOS-Core 的 Pass 3 与 Pass 4 是 `claude -p` 的子进程调用,无法直接写入 `.claude/rules/`。变通做法是:

1. pass 的 prompt 指示 Claude 把所有 rule 文件写到 `claudeos-core/generated/.staged-rules/`,不写别处。
2. pass 完成后,**Node.js orchestrator**(*不*受 Claude Code 权限策略约束)遍历 staging 树,把每个文件移到 `.claude/rules/`,保留子路径。
3. 全部成功时,staging 目录被移除。
4. 部分失败时(文件锁或跨卷重命名错误),staging 目录**保留**,你可以查看哪些没移过去,下次 `init` 重试。

mover 在 `lib/staged-rules.js`,优先用 `fs.renameSync`,Windows 跨卷 / 杀软文件锁错误时回退到 `fs.copyFileSync + fs.unlinkSync`。

**实际你会看到什么:** 正常流程下,`.staged-rules/` 在一次 `init` 运行内创建并清空,可能根本不会注意到。某次运行在 stage 阶段崩溃时,下次 `init` 你会在那里发现文件,`--force` 会清理掉。

---

## 何时保留什么

| 文件类别 | 不带 `--force` | 带 `--force` |
|---|---|---|
| 对生成的 `.claude/rules/NN.*/` 文件的手工修改 | ✅ 保留(没有 pass 重跑) | ❌ 丢失(受管分类被清空) |
| 你自己放在 `.claude/rules/` 下、没有 `NN.` 前缀的文件 | ✅ 保留 | ✅ 保留(从不触碰) |
| 对 `claudeos-core/standard/` 的手工修改 | ✅ 保留(没有 pass 重跑) | ❌ 若 Pass 3 重新生成同名文件则被覆盖 |
| 对 `claudeos-core/skills/` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| 对 `claudeos-core/guide/` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| 对 `CLAUDE.md` 的手工修改 | ✅ 保留 | ❌ 被 Pass 3 覆盖 |
| `claudeos-core/memory/` 文件 | ✅ 保留 | ✅ 保留(`--force` 不删 memory) |
| `claudeos-core/` 与 `.claude/` 之外的文件 | ✅ 从不触碰 | ✅ 从不触碰 |
| Pass marker(`generated/*.json`) | ✅ 保留(用于 resume) | ❌ 删除(强制全量重跑) |

**说实话:** ClaudeOS-Core 没有 diff-and-merge 层,也没有"应用前审阅变更"的提示。保留策略是二元的:要么只重跑缺失的(默认),要么清空并重新生成(`--force`)。

做了大量手工修改、又想整合新生成内容时,推荐工作流是:

1. 先把改动 commit 到 git。
2. 在另一个分支上跑 `npx claudeos-core init --force`。
3. 用 `git diff` 查看变化。
4. 手工合并想要的内容。

这是有意做得笨重的流程。工具刻意不自动合并:那种合并很容易在隐微处把 rules 弄坏。

---

## Pre-v2.2.0 升级检测

在用旧版本(pre-v2.2.0,8-section scaffold 强制之前)生成的 CLAUDE.md 项目上跑 `init` 时,工具通过 heading 计数(`^## ` heading 计数 ≠ 8,这是与语言无关的启发式)检测到这一情况,并发出警告:

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

警告是 informational,工具会继续正常运行,可以忽略它,继续保留旧格式。但在 `--force` 下,结构升级会被应用,`claude-md-validator` 也会通过。

**memory 文件在 `--force` 升级中保留**,只有生成文件被覆盖。

---

## Pass 4 immutability(v2.3.0+)

一个具体的细节:**Pass 4 不会动 `CLAUDE.md`。** Pass 3 的 Section 8 已经写了所有必需的 L4 memory 文件引用。Pass 4 再写 CLAUDE.md,就会重复声明 Section 8 的内容,触发 `[S1]`/`[M-*]`/`[F2-*]` validator 错误。

这一点是双向强制的:
- Pass 4 的 prompt 明确写着 "CLAUDE.md MUST NOT BE MODIFIED."
- `lib/memory-scaffold.js` 里的 `appendClaudeMdL4Memory()` 是 3 行 no-op(无条件返回 true,什么都不写)。
- 回归测试 `tests/pass4-claude-md-untouched.test.js` 强制这一契约。

**作为用户需要知道的:** 在 pre-v2.3.0 的项目上重跑(那时旧的 Pass 4 会向 CLAUDE.md 追加 Section 9),会看到 `claude-md-validator` 报错。跑一次 `npx claudeos-core init --force` 干净地重新生成即可。

---

## `restore` 命令做什么

```bash
npx claudeos-core restore
```

`restore` 以 `--execute` 模式运行 `plan-validator`。历史上,它把 `claudeos-core/plan/*.md` 文件中的内容复制到它们所描述的位置。

**v2.1.0 状态:** master plan 生成在 v2.1.0 中已移除,`claudeos-core/plan/` 不再被 `init` 自动创建。没有 `plan/` 文件时,`restore` 是 no-op:记录一条 informational 消息然后干净退出。

保留这命令是为了那些手工维护 plan 文件、用作 ad-hoc 备份 / 还原的用户。想要真正的备份,用 git。

---

## 恢复模式

### "我把 ClaudeOS 工作流之外的某些文件删了"

```bash
npx claudeos-core init --force
```

从零重跑 Pass 3 / Pass 4,被删的文件会重新生成。其他文件的手工修改会丢(因为 `--force`),配合 git 保险。

### "我想移除某条特定 rule"

直接删文件即可。下次 `init`(不带 `--force`)不会重建,因为 Pass 3 的 resume marker 会跳过整个 pass。

下次 `init --force` 时想重建,什么都不用做,重新生成是自动的。

想永久删除(不再被重新生成),就得把项目固定在当前状态,不再跑 `--force`。工具没有内置的"不要重新生成这个文件"机制。

### "我想永久自定义某个生成文件"

工具没有 HTML 风格的 begin/end 标记自定义区域。两个选项:

1. **不在该项目上跑 `--force`**:默认 resume 下,改动可以无限期保留。
2. **Fork prompt 模板**:改自己 fork 的 `pass-prompts/templates/<stack>/pass3.md`,安装 fork,重新生成的文件就会反映你的自定义。

对简单的项目级覆盖,选项 1 通常够用。

---

## validator 检查什么(re-init 之后)

`init` 完成后(不论 resume 还是 `--force`),validator 自动运行:

- `claude-md-validator`:通过 `lint` 单独运行
- `health-checker`:运行 4 个 content/path validator

有问题时(文件缺失、交叉引用断、伪造路径)会看到 validator 输出。检查清单见 [verification.md](verification.md)。

validator 不修任何东西,只报告。你看报告,自己决定是重跑 `init` 还是手工修。

---

## 通过测试建立信任

"保留用户修改"这条路径(不带 `--force` 的 resume)由 `tests/init-command.test.js` 与 `tests/pass3-marker.test.js` 下的集成测试覆盖。

CI 在 Linux / macOS / Windows × Node 18 / 20 上运行。

发现 ClaudeOS-Core 以与本文档相悖的方式丢了改动,那就是 bug。[报告它](https://github.com/claudeos-core/claudeos-core/issues),并附复现步骤。

---

## 永远不会进入生成文件的东西: `.env` 里的密钥

上面所有内容讲的是 *你的文件* 如何在 ClaudeOS 下存活。本节讲的是 *你的密钥* 不会从中泄出。它放在这里，是因为"这个工具会不会把我的 `.env` 复制进 LLM 会读的东西里?"是一个安全问题，而人们正是为此打开这一页。

`init` 会读取一个 `.env*` 文件 (搜索顺序见 [stacks.md](stacks.md#env-提取v220))，好让生成的 CLAUDE.md 写出真实的 port、host 和数据库。解析出的变量写入 `claudeos-core/generated/project-analysis.json`，而 Pass 3 / Pass 4 的 prompt 会指示模型读取该文件。写入之前，每个值都按此顺序经过三条规则:

1. **按键名遮蔽。** 匹配 `PASSWORD`、`PASS`、`PW`、`SECRET`、`TOKEN`、`API_KEY`、`CREDENTIAL`、`PRIVATE_KEY`、`JWT_SECRET`、`SSH_KEY`、`MASTER_KEY`、`SERVICE_ACCOUNT` 等的键会变成 `***REDACTED***`。键本身保留，所以"这个变量存在"仍然是文档可以陈述的事实。
2. **连接串内部的凭据遮蔽。** 对第一条规则没抓到的键 (`DATABASE_URL`、`REDIS_URL`、`MONGO_URI`、`SPRING_DATASOURCE_URL` 等)，只重写*凭据部分*并保留其余内容，因此 DB 类型、host、port 和 path 仍然可读:
   - URL userinfo: `postgres://app:s3cret@db:5432/app` → `postgres://***:***@db:5432/app`
   - query / property 参数: `?user=app&password=x` → `?user=app&password=***`
   - Go / MySQL DSN: `user:pw@tcp(host:3306)/db` → `***:***@tcp(host:3306)/db`
   - Oracle JDBC (v2.5.3): `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` → `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` (`@host:port:SID`、`@(DESCRIPTION=…)` 和 `jdbc:oracle:oci:` 形式同样处理)
3. **整值丢弃 (v2.5.2)。** 当第二条规则无法安全重写凭据时 — 密码含有原始的 `/`、`?`、`#` 或空格，以数字开头，或者 Oracle DSN 的 user 部分本身含有 `@` 而无法确定 user 与密码的分界 (v2.5.3) — 该值会被整个丢弃 (`***REDACTED***`)，而不是部分遮蔽。丢掉 host 远比泄露密码便宜。`init` 会在 Phase 1 摘要里列出受影响的键名 (仅键名)。把密码做 percent-encoding (`/` 写成 `%2F`) 即可保住 host 可见。

从 `.env` 派生的两个标量字段 — `envInfo.host` 和 `envInfo.apiTarget` — 会直接渲染进 CLAUDE.md 第 3 节; 若其值被丢弃则为 `null`，该行整体省略，因此 sentinel 绝不会出现在生成文档里。

**未覆盖的部分。** 未展开的 `${VAR}` 模板原样保留 (其中没有真实密钥)。注释，以及被选中的那一个 `.env*` 之外的文件，都不会被读取。scanner 自身的 DB 类型检测只在内存中读 `.env` 原文，从不写出。如果你的项目以上述规则都不认识的形式保存凭据，请提交 issue 并附上那个*形式* (绝不要附值) — 这里列出的每一条规则都是这么来的。

**这些规则只覆盖 `.env*` 文件。** 写在框架配置文件里的凭据 —— `application.yml`、`application.properties`、`appsettings.json`、Spring profile、Django 的 `settings.py` —— **不会**被遮蔽,因为扫描器只从这些文件里读取服务器 port 之类的事实,从不把它们的值复制进 `project-analysis.json`。但 Pass 1 到 Pass 3 会直接读你的源码树,所以提交在配置文件里的明文密码对模型是可见的,并且可能被引用进生成的文档。请把密钥从会提交的配置里移走。注意下面的 **如何检查** 那一步找不到它们 —— 它们根本不会进入 `project-analysis.json`。请改为 grep 生成的*文档*:`CLAUDE.md`、`claudeos-core/**/*.md` 和 `.claude/rules/**/*.md`。

**如何验证。** `init` 之后，在 `claudeos-core/generated/project-analysis.json` 里 `grep -i` 你的密码。它不该在那里。遮蔽规则由 `tests/env-parser.test.js` 中的测试固定，包括曾经真的泄露过的那些形式。

## 另请参阅

- [stacks.md](stacks.md#env-提取v220) — `.env` 搜索顺序与提取的字段
- [architecture.md](architecture.md) — staging 机制在上下文中的位置
- [commands.md](commands.md) — `--force` 与其他 flag
- [troubleshooting.md](troubleshooting.md) — 从特定错误恢复
