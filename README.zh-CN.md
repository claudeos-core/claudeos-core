# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**从你的实际源代码自动生成 Claude Code 文档。** 一个 CLI 工具,先对项目进行静态分析,再运行 4-pass Claude 流水线生成 `.claude/rules/`、standards、skills 和 guides — 这样 Claude Code 遵循的就是**你项目的**约定,而不是通用约定。

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 这是什么?

你在用 Claude Code。它很聪明,但它不知道**你项目的约定**:
- 你的团队用 MyBatis,但 Claude 生成 JPA 代码。
- 你的封装是 `ApiResponse.ok()`,但 Claude 写 `ResponseEntity.success()`。
- 你的包是 `controller/order/`,但 Claude 创建 `order/controller/`。

于是你花了大量时间去修正每一个生成的文件。

**ClaudeOS-Core 解决这个问题。** 它扫描你的实际源代码,推断出你的约定,然后把一整套规则写入 `.claude/rules/` — 这是 Claude Code 自动读取的目录。下次你说 *"给 orders 做一个 CRUD"*,Claude 第一次就会按你的约定来。

```
之前:  你 → Claude Code → "看上去还行" 的代码 → 手动修正
之后:  你 → Claude Code → 与项目匹配的代码 → 直接发布
```

---

## 在真实项目上看效果

在 [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) 上运行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files。结果:**75 generated files**,总耗时 **53 分钟**,所有 validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 终端输出(文本版,便于搜索和复制)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>📄 生成的 <code>CLAUDE.md</code> 节选(实际输出)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

注意:上面所有的论断都基于实际源码 — 类名、包路径、配置键、dead-config 标记,都是 scanner 在 Claude 写文件之前先提取好的。

</details>

<details>
<summary><strong>🛡️ 一个被自动加载的真实 rule 文件 (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

`paths: ["**/*"]` glob 表示无论你在该项目里编辑哪个文件,Claude Code 都会自动加载这条 rule。✅/❌ 示例直接来自这个代码库的实际约定和已有的 bug 模式。

</details>

<details>
<summary><strong>🧠 自动生成的 <code>decision-log.md</code> 种子(实际输出)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 用从 `pass2-merged.json` 中提取的架构决策为 `decision-log.md` 播种 — 这样以后的会话不仅记得代码库 _长成什么样_,也记得 _为什么_ 这样。

</details>

---

## Quick Start

**前置条件:** Node.js 18+,[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 已安装并完成认证。

```bash
# 1. 进入你的项目根目录
cd my-spring-boot-project

# 2. 运行 init(它会分析你的代码并请求 Claude 写出 rules)
npx claudeos-core init

# 3. 完成。打开 Claude Code 开始编码 — rules 已经加载好了。
```

`init` 完成后**你会得到**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code 自动加载
│       ├── 00.core/              (通用 rules — 命名、架构)
│       ├── 10.backend/           (后端栈 rules,如有)
│       ├── 20.frontend/          (前端栈 rules,如有)
│       ├── 30.security-db/       (安全 & DB 约定)
│       ├── 40.infra/             (env、日志、CI/CD)
│       ├── 50.sync/              (文档同步提醒 — rules only)
│       ├── 60.memory/            (memory rules — Pass 4,rules only)
│       ├── 70.domains/{type}/    (按域 rules,type = backend|frontend)
│       └── 80.verification/      (测试策略 + 构建验证提醒)
├── claudeos-core/
│   ├── standard/                 ← 参考文档(镜像分类结构)
│   │   ├── 00.core/              (项目概览、架构、命名)
│   │   ├── 10.backend/           (后端 reference — 仅当存在后端栈)
│   │   ├── 20.frontend/          (前端 reference — 仅当存在前端栈)
│   │   ├── 30.security-db/       (安全 & DB reference)
│   │   ├── 40.infra/             (env / 日志 / CI-CD reference)
│   │   ├── 70.domains/{type}/    (按域 reference)
│   │   ├── 80.verification/      (构建 / 启动 / 测试 reference — standard only)
│   │   └── 90.optional/          (栈相关附加 — standard only)
│   ├── skills/                   (Claude 可应用的可复用模式)
│   ├── guide/                    (常见任务的 how-to 指南)
│   ├── database/                 (schema 概览、迁移指南)
│   ├── mcp-guide/                (MCP 集成笔记)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude 最先读取的索引)
```

`rules/` 与 `standard/` 之间共享相同数字 prefix 的分类代表同一概念领域(例如 `10.backend` rules ↔ `10.backend` standards)。Rules-only 分类:`50.sync`(文档同步提醒)、`60.memory`(Pass 4 memory)。Standard-only 分类:`90.optional`(无强制力的栈相关附加)。其他 prefix(`00`、`10`、`20`、`30`、`40`、`70`、`80`)在 `rules/` 和 `standard/` 中都存在。现在 Claude Code 认识你的项目了。

---

## 适合谁?

| 你是… | 这工具帮你… |
|---|---|
| **用 Claude Code 启动新项目的独立开发者** | 完全跳过"教 Claude 我的约定"这一步 |
| **维护共享标准的团队负责人** | 自动化 `.claude/rules/` 的繁琐维护 |
| **已经在用 Claude Code 但厌倦修代码的人** | 让 Claude 跟随**你的**模式,而非"看上去通用"的模式 |

**不适合的场景:** 你想要一个开箱即用的预设 agents/skills/rules 包,不需要 scan 步骤(参见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md));或者你的项目还不属于[受支持的栈](#supported-stacks)之一。

---

## 它是怎么工作的?

ClaudeOS-Core 把通常的 Claude Code 工作流反过来:

```
通常:    你描述项目 → Claude 猜你的栈 → Claude 写文档
本工具:  代码读出你的栈 → 代码把已确认的事实交给 Claude → Claude 基于事实写文档
```

核心思想:**Node.js scanner 先读你的源代码**(deterministic,没有 AI),然后 4-pass Claude 流水线在 scanner 找到的事实约束下写文档。Claude 没法编造代码里实际不存在的路径或框架。

完整架构见 [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md)。

---

## Supported Stacks

12 个栈,从你的项目文件中自动检测:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

多栈项目(例如 Spring Boot 后端 + Next.js 前端)开箱即用。

每个 scanner 的检测规则和提取内容,见 [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md)。

---

## 日常工作流

三条命令覆盖约 95% 的使用场景:

```bash
# 在某个项目首次运行
npx claudeos-core init

# 手动改了 standards 或 rules 之后
npx claudeos-core lint

# 健康检查(commit 前或在 CI 中运行)
npx claudeos-core health
```

memory layer 维护用的另外两条:

```bash
# 压缩 failure-patterns 日志(定期运行)
npx claudeos-core memory compact

# 把高频 failure pattern 提升为提议规则
npx claudeos-core memory propose-rules
```

每条命令的完整选项,见 [docs/zh-CN/commands.md](docs/zh-CN/commands.md)。

---

## 它有什么不同

大多数 Claude Code 文档工具是从描述出发(你告诉工具,工具告诉 Claude)。ClaudeOS-Core 是从你的实际源代码出发(工具读取,工具把已确认的事实告诉 Claude,Claude 只写已确认的内容)。

三个具体后果:

1. **Deterministic stack detection.** 同一个项目 + 同样的代码 = 同样的输出。不会出现"这次 Claude 又掷出了别的"。
2. **No invented paths.** Pass 3 的 prompt 显式列出所有允许的源路径;Claude 不能引用不存在的路径。
3. **Multi-stack aware.** 同一次运行中,后端和前端域使用不同的分析 prompt。

与其他工具的 scope 对比,见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md)。对比关注的是**每个工具做什么**,而不是**哪个更好** — 大部分是互补的。

---

## 验证(post-generation)

Claude 写完文档后,代码会去验证。5 个独立 validator:

| Validator | 它检查什么 | 由谁触发 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 的结构性不变量(8 sections,language-invariant) | `claudeos-core lint` |
| `content-validator` | 引用的路径是否真实存在;manifest 一致性 | `health`(advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 的输出是 well-formed JSON | `health`(warn) |
| `plan-validator` | 保存的 plan 与 disk 上的内容一致 | `health`(fail-on-error) |
| `sync-checker` | Disk 文件与 `sync-map.json` 的注册项一致(orphaned/unregistered 检测) | `health`(fail-on-error) |

`health-checker` 用三档严重度(fail / warn / advisory)编排这 4 个运行时 validator,并以适合 CI 的 exit code 退出。`claude-md-validator` 通过 `lint` 命令单独运行,因为结构 drift 是 re-init 信号,不是软警告。可随时运行:

```bash
npx claudeos-core health
```

每个 validator 的检查项详情,见 [docs/zh-CN/verification.md](docs/zh-CN/verification.md)。

---

## Memory Layer(可选,适合长期项目)

v2.0 起,ClaudeOS-Core 会写出一个包含 4 个文件的 `claudeos-core/memory/` 文件夹:

- `decision-log.md` — 仅追加的"为什么选 X 而不是 Y"
- `failure-patterns.md` — 带有 frequency/importance 评分的反复出现的错误
- `compaction.md` — memory 如何随时间被自动压缩
- `auto-rule-update.md` — 应当成为新规则的模式

可以运行 `npx claudeos-core memory propose-rules` 让 Claude 查看近期的 failure pattern,并提议要添加的新规则。

memory 模型与生命周期,见 [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md)。

---

## FAQ

**Q: 我需要 Claude API key 吗?**
A: 不需要。ClaudeOS-Core 使用你已安装的 Claude Code — 它把 prompt 通过管道送给本机的 `claude -p`。不用额外开账号。

**Q: 这会覆盖我现有的 CLAUDE.md 或 `.claude/rules/` 吗?**
A: 在新项目上首次运行:它会创建。不带 `--force` 重新运行:保留你的修改 — 上一次运行的 pass marker 会被检测到,对应的 pass 被跳过。带 `--force` 重新运行:全部清掉重新生成(你的修改会丢失 — 这就是 `--force` 的含义)。见 [docs/zh-CN/safety.md](docs/zh-CN/safety.md)。

**Q: 我的栈不被支持。可以加吗?**
A: 可以。新栈需要约 3 个 prompt 模板 + 一个 domain scanner。8 步指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**Q: 如何用韩语(或其他语言)生成文档?**
A: `npx claudeos-core init --lang ko`。支持 10 种语言:en、ko、ja、zh-CN、es、vi、hi、ru、fr、de。

**Q: 它能用于 monorepo 吗?**
A: 可以 — Turborepo(`turbo.json`)、pnpm workspaces(`pnpm-workspace.yaml`)、Lerna(`lerna.json`)和 npm/yarn workspaces(`package.json#workspaces`)由 stack-detector 检测。每个 app 拥有独立分析。其他 monorepo 布局(例如 NX)不会被特别检测,但通用的 `apps/*/` 与 `packages/*/` 模式仍会被各栈 scanner 拾取。

**Q: 如果 Claude Code 生成了我不同意的 rules 怎么办?**
A: 直接编辑。然后运行 `npx claudeos-core lint` 验证 CLAUDE.md 在结构上仍然有效。在后续 `init` 运行(不带 `--force`)中,你的修改会被保留 — resume 机制会跳过已有 marker 的 pass。

**Q: 在哪里报告 bug?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。安全相关问题见 [SECURITY.md](SECURITY.md)。

---

## Documentation

| 主题 | 阅读 |
|---|---|
| 4-pass 流水线如何工作(比图更深入) | [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md) |
| 架构的可视化图示(Mermaid) | [docs/zh-CN/diagrams.md](docs/zh-CN/diagrams.md) |
| Stack 检测 — 每个 scanner 看什么 | [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md) |
| Memory layer — decision log 和 failure pattern | [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md) |
| 5 个 validator 详解 | [docs/zh-CN/verification.md](docs/zh-CN/verification.md) |
| 所有 CLI 命令和选项 | [docs/zh-CN/commands.md](docs/zh-CN/commands.md) |
| 手动安装(不用 `npx`) | [docs/zh-CN/manual-installation.md](docs/zh-CN/manual-installation.md) |
| Scanner 覆盖 — `.claudeos-scan.json` | [docs/zh-CN/advanced-config.md](docs/zh-CN/advanced-config.md) |
| 安全性:re-init 时保留什么 | [docs/zh-CN/safety.md](docs/zh-CN/safety.md) |
| 与同类工具的对比(scope,而非质量) | [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md) |
| 错误与恢复 | [docs/zh-CN/troubleshooting.md](docs/zh-CN/troubleshooting.md) |

---

## 贡献

欢迎贡献 — 添加栈支持、改进 prompt、修 bug。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

行为准则与安全策略见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 和 [SECURITY.md](SECURITY.md)。

## License

[ISC](LICENSE) — 任何用途均可免费使用,包括商用。

---

<sub>由 [@claudeos-core](https://github.com/claudeos-core) 用心打造。如果它为你节省了时间,在 GitHub 上点个 ⭐ 帮助保持可见。</sub>
