# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**让 Claude Code 第一次就遵循 _你项目的_ 约定 — 而不是 generic 默认值。**

deterministic Node.js scanner 先读取你的代码,然后 4-pass Claude 流水线写出完整的文档集 — `CLAUDE.md` + 自动加载的 `.claude/rules/` + standards + skills + L4 memory。10 种输出语言、5 个 post-generation validator,以及阻止 LLM 编造代码中不存在的文件或 framework 的明确 path allowlist。

在 [**12 个栈**](#supported-stacks)上即开即用 (含 monorepo) — 一条 `npx` 命令,无需配置,中断可 resume,重跑 idempotent。

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 这是什么?

你在用 Claude Code。它很强大,但每次会话都从零开始 — 它对 _你的_ 项目结构没有任何记忆。所以它会回退到"看上去通用"的默认值,这些默认值很少和你团队实际的做法匹配:

- 你的团队用 **MyBatis**,但 Claude 生成 JPA repository。
- 你的响应封装是 `ApiResponse.ok()`,但 Claude 写的是 `ResponseEntity.success()`。
- 你的包是 layer-first (`controller/order/`),但 Claude 创建的是 domain-first (`order/controller/`)。
- 你的错误走的是中央 middleware,但 Claude 在每个 endpoint 散布 `try/catch`。

你会希望每个项目都有一份 `.claude/rules/` — Claude Code 每个会话自动加载 — 但每个新 repo 手写这些 rules 要花数小时,且代码演进时会 drift。

**ClaudeOS-Core 从你的实际源代码为你写好它们。** deterministic Node.js scanner 先读你的项目 (栈、ORM、包 layout、约定、文件路径)。然后 4-pass Claude 流水线把抽取出的事实变成完整的文档集:

- **`CLAUDE.md`** — Claude 每次会话先读的项目索引
- **`.claude/rules/`** — 按分类自动加载的 rules (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — 参考文档 (每条 rule 背后的"为什么")
- **`claudeos-core/skills/`** — 可复用模式 (CRUD scaffolding、页面模板)
- **`claudeos-core/memory/`** — 随项目共同生长的 decision log + failure pattern

因为 scanner 把一份明确的 path allowlist 交给 Claude,LLM **无法编造代码里不存在的文件或 framework**。5 个 post-generation validator (`claude-md-validator`、`content-validator`、`pass-json-validator`、`plan-validator`、`sync-checker`) 在出货前验证输出 — language-invariant,无论你用英语、中文还是其他 8 种语言生成,都适用同一套规则。

```
之前:  你 → Claude Code → "看上去还行" 的代码 → 每次手动修正
之后:  你 → Claude Code → 与你项目匹配的代码 → 直接发布
```

---

## 在真实项目上看效果

在 [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) 上运行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files。结果:**75 generated files**,总耗时 **53 分钟**,所有 validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 终端输出 (文本版,便于搜索和复制)</strong></summary>

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
<summary><strong>📄 生成的 <code>CLAUDE.md</code> 节选 (实际输出 — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

上面所有的值 — 精确的依赖坐标、`dev.db` 文件名、`V1__create_tables.sql` 迁移名、"no JPA" — 都是 scanner 在 Claude 写文件之前先从 `build.gradle` / `application.properties` / 源码树中提取出来的。没有任何东西是猜的。

</details>

<details>
<summary><strong>🛡️ 一个被自动加载的真实 rule 文件 (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

`paths: ["**/*"]` glob 表示无论你在该项目里编辑哪个文件,Claude Code 都会自动加载这条 rule。rule 中的每个类名、包路径、exception handler 都直接来自被扫描的源代码 — 包括项目实际的 `CustomizeExceptionHandler` 与 `JacksonCustomizations`。

</details>

<details>
<summary><strong>🧠 自动生成的 <code>decision-log.md</code> 种子 (实际输出)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 用从 `pass2-merged.json` 提取的架构决策为 `decision-log.md` 播种,这样以后的会话不仅记得代码库 _长成什么样_,也记得 _为什么_ 这样。每个被考虑过的选项 ("JPA/Hibernate"、"MyBatis-Plus") 和每个 consequence 都基于实际的 `build.gradle` 依赖块。

</details>

---

## Quick Start

**前置条件:** Node.js 18+,[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 已安装并完成认证。

```bash
# 1. 进入你的项目根目录
cd my-spring-boot-project

# 2. 运行 init (它会分析你的代码并请求 Claude 写出 rules)
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
│   ├── standard/                 ← 参考文档 (镜像分类结构)
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

`rules/` 与 `standard/` 之间共享相同数字 prefix 的分类代表同一概念领域 (例如 `10.backend` rules ↔ `10.backend` standards)。Rules-only 分类:`50.sync` (文档同步提醒)、`60.memory` (Pass 4 memory)。Standard-only 分类:`90.optional` (无强制力的栈相关附加)。其他 prefix (`00`、`10`、`20`、`30`、`40`、`70`、`80`) 在 `rules/` 和 `standard/` 中都存在。现在 Claude Code 认识你的项目了。

---

## 适合谁?

| 你是… | 这个工具消除的痛点 |
|---|---|
| **用 Claude Code 启动新项目的独立开发者** | "每个会话都要教 Claude 我的约定" — 消失。`CLAUDE.md` + 8 个分类 `.claude/rules/` 一次生成完毕。 |
| **维护跨 repo 共享标准的团队负责人** | 改包名、换 ORM、改 response wrapper 时 `.claude/rules/` 会 drift。ClaudeOS-Core 以 deterministic 方式重新同步 — 同输入 → byte-identical 输出,无 diff 噪音。 |
| **已经在用 Claude Code 但厌倦修代码** | 错误的 response wrapper、错误的包 layout、明明用 MyBatis 却生成 JPA、明明有中央 middleware 却散布 `try/catch`。scanner 提取你真实的约定;每个 Claude pass 都基于明确的 path allowlist 运行。 |
| **新 repo onboarding** (既有项目 / 加入团队) | 在 repo 上跑 `init`,得到一份活的架构地图:CLAUDE.md 里的 stack 表、按 layer 的 rules with ✅/❌ 示例、用主要决策的"为什么"播种好的 decision log (JPA vs MyBatis、REST vs GraphQL 等)。读 5 个文件胜过读 5,000 个源文件。 |
| **使用中文 / 韩语 / 日语 / 其他 7 种语言** | 大多数 Claude Code rule generator 只支持英文。ClaudeOS-Core 用 **10 种语言** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) 写完整套,并提供 **byte-identical 结构验证** — 不论输出语言如何,`claude-md-validator` 给出同一个 verdict。 |
| **在 monorepo 中工作** (Turborepo、pnpm/yarn workspaces、Lerna) | 一次运行同时分析 backend + frontend 域,各用独立 prompt;`apps/*/` 与 `packages/*/` 自动 walk;按栈输出的 rules 落在 `70.domains/{type}/` 之下。 |
| **OSS 贡献者或实验项目** | 输出对 gitignore 友好 — `claudeos-core/` 是你的本地工作目录,只有 `CLAUDE.md` + `.claude/` 需要随仓库发布。中断时 resume-safe;重跑 idempotent (不带 `--force` 时手工编辑会被保留)。 |

**不适合的场景:** 你想要无需 scan 步骤、第一天就开箱即用的 one-size-fits-all 预设 agents/skills/rules 包 (各工具的定位见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md));你的项目还不属于[受支持的栈](#supported-stacks);或者你只需要单一 `CLAUDE.md` (内置的 `claude /init` 已经够用 — 不需要再装别的工具)。

---

## 它是怎么工作的?

ClaudeOS-Core 把通常的 Claude Code 工作流反过来:

```
通常:    你描述项目 → Claude 猜你的栈 → Claude 写文档
本工具:  代码读出你的栈 → 代码把已确认的事实交给 Claude → Claude 基于事实写文档
```

流水线分 **三个阶段**运行,LLM 调用的两侧都有代码:

**1. Step A — Scanner (deterministic,无 LLM)。** Node.js scanner walk 你的项目根,读 `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`,解析 `.env*` 文件 (对 `PASSWORD/SECRET/TOKEN/JWT_SECRET/...` 等敏感变量做 redaction),分类你的架构模式 (Java 5 模式 A/B/C/D/E、Kotlin CQRS / 多模块、Next.js App vs. Pages Router、FSD、components-pattern),发现领域,并构建一份所有存在的源文件路径的明确 allowlist。输出:`project-analysis.json` — 后续所有步骤的单一 source of truth。

**2. Step B — 4-Pass Claude 流水线 (受 Step A 的事实约束)。**
- **Pass 1** 按域组读取代表文件,每个域抽取 ~50–100 个约定 — response wrapper、logging library、error handling、命名约定、test pattern。每个域组运行一次 (`max 4 domains, 40 files per group`),所以 context 永远不会 overflow。
- **Pass 2** 把所有按域的分析合并成项目级全景图,在域之间不一致时挑选 dominant 约定。
- **Pass 3** 写出 `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — 切分成 stage (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide),即使 `pass2-merged.json` 很大,每个 stage 的 prompt 也能 fit 进 LLM 的 context window。≥16 域的项目把 3b/3c 进一步切成 ≤15 域 batch。
- **Pass 4** 为 L4 memory layer (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) 播种,并补充通用 scaffold rules。Pass 4 **禁止修改 `CLAUDE.md`** — Pass 3 的 Section 8 是 authoritative。

**3. Step C — Verification (deterministic,无 LLM)。** 5 个 validator 检查输出:
- `claude-md-validator` — 对 `CLAUDE.md` 做 25 项结构检查 (8 个 section、H3/H4 计数、memory file uniqueness、T1 canonical heading invariant)。Language-invariant:无论 `--lang` 是什么,verdict 相同。
- `content-validator` — 10 项内容检查,包括 path-claim 验证 (`STALE_PATH` 抓出编造的 `src/...` 引用) 和 MANIFEST drift 检测。
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section 计数。
- `plan-validator` — plan ↔ disk 一致性 (legacy,自 v2.1.0 起大部分 no-op)。
- `sync-checker` — 跨 7 个被追踪目录的 disk ↔ `sync-map.json` 注册一致性。

三档严重度 (`fail` / `warn` / `advisory`),所以对用户能手动修复的 LLM 幻觉,warning 不会卡死 CI。

把整个流程绑在一起的 invariant:**Claude 只能引用代码中实际存在的路径**,因为 Step A 给了它一份 finite allowlist。如果 LLM 仍然试图编造 (罕见但在某些 seed 上确实会发生),Step C 会在 docs 出货前抓出来。

每个 pass 的细节、基于 marker 的 resume、用于绕过 Claude Code `.claude/` sensitive-path block 的 staged-rules workaround,以及 stack 检测内部细节,见 [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md)。

---

## Supported Stacks

12 个栈,从你的项目文件中自动检测:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

多栈项目 (例如 Spring Boot 后端 + Next.js 前端) 开箱即用。

每个 scanner 的检测规则和提取内容,见 [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md)。

---

## 日常工作流

三条命令覆盖约 95% 的使用场景:

```bash
# 在某个项目首次运行
npx claudeos-core init

# 手动改了 standards 或 rules 之后
npx claudeos-core lint

# 健康检查 (commit 前或在 CI 中运行)
npx claudeos-core health
```

memory layer 维护用的另外两条:

```bash
# 压缩 failure-patterns 日志 (定期运行)
npx claudeos-core memory compact

# 把高频 failure pattern 提升为提议规则
npx claudeos-core memory propose-rules
```

每条命令的完整选项,见 [docs/zh-CN/commands.md](docs/zh-CN/commands.md)。

---

## 它有什么不同

大多数 Claude Code 文档工具是从描述出发 (你告诉工具,工具告诉 Claude)。ClaudeOS-Core 是从你的实际源代码出发 (工具读取,工具把已确认的事实告诉 Claude,Claude 只写已确认的内容)。

三个具体后果:

1. **Deterministic stack detection.** 同一个项目 + 同样的代码 = 同样的输出。不会出现"这次 Claude 又掷出了别的"。
2. **No invented paths.** Pass 3 的 prompt 显式列出所有允许的源路径;Claude 不能引用不存在的路径。
3. **Multi-stack aware.** 同一次运行中,后端和前端域使用不同的分析 prompt。

与其他工具的 scope 对比,见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md)。对比关注的是**每个工具做什么**,而不是**哪个更好** — 大部分是互补的。

---

## 验证 (post-generation)

Claude 写完文档后,代码会去验证。5 个独立 validator:

| Validator | 它检查什么 | 由谁触发 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 的结构性不变量 (8 sections,language-invariant) | `claudeos-core lint` |
| `content-validator` | 引用的路径是否真实存在;manifest 一致性 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 的输出是 well-formed JSON | `health` (warn) |
| `plan-validator` | 保存的 plan 与 disk 上的内容一致 | `health` (fail-on-error) |
| `sync-checker` | Disk 文件与 `sync-map.json` 的注册项一致 (orphaned/unregistered 检测) | `health` (fail-on-error) |

`health-checker` 用三档严重度 (fail / warn / advisory) 编排这 4 个运行时 validator,并以适合 CI 的 exit code 退出。`claude-md-validator` 通过 `lint` 命令单独运行,因为结构 drift 是 re-init 信号,不是软警告。可随时运行:

```bash
npx claudeos-core health
```

每个 validator 的检查项详情,见 [docs/zh-CN/verification.md](docs/zh-CN/verification.md)。

---

## Memory Layer (可选,适合长期项目)

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
A: 在新项目上首次运行:它会创建。不带 `--force` 重新运行:保留你的修改 — 上一次运行的 pass marker 会被检测到,对应的 pass 被跳过。带 `--force` 重新运行:全部清掉重新生成 (你的修改会丢失 — 这就是 `--force` 的含义)。见 [docs/zh-CN/safety.md](docs/zh-CN/safety.md)。

**Q: 我的栈不被支持。可以加吗?**
A: 可以。新栈需要约 3 个 prompt 模板 + 一个 domain scanner。8 步指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**Q: 如何用韩语 (或其他语言) 生成文档?**
A: `npx claudeos-core init --lang ko`。支持 10 种语言:en、ko、ja、zh-CN、es、vi、hi、ru、fr、de。

**Q: 它能用于 monorepo 吗?**
A: 可以 — Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`) 和 npm/yarn workspaces (`package.json#workspaces`) 由 stack-detector 检测。每个 app 拥有独立分析。其他 monorepo 布局 (例如 NX) 不会被特别检测,但通用的 `apps/*/` 与 `packages/*/` 模式仍会被各栈 scanner 拾取。

**Q: 如果 Claude Code 生成了我不同意的 rules 怎么办?**
A: 直接编辑。然后运行 `npx claudeos-core lint` 验证 CLAUDE.md 在结构上仍然有效。在后续 `init` 运行 (不带 `--force`) 中,你的修改会被保留 — resume 机制会跳过已有 marker 的 pass。

**Q: 在哪里报告 bug?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。安全相关问题见 [SECURITY.md](SECURITY.md)。

---

## Documentation

| 主题 | 阅读 |
|---|---|
| 4-pass 流水线如何工作 (比图更深入) | [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md) |
| 架构的可视化图示 (Mermaid) | [docs/zh-CN/diagrams.md](docs/zh-CN/diagrams.md) |
| Stack 检测 — 每个 scanner 看什么 | [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md) |
| Memory layer — decision log 和 failure pattern | [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md) |
| 5 个 validator 详解 | [docs/zh-CN/verification.md](docs/zh-CN/verification.md) |
| 所有 CLI 命令和选项 | [docs/zh-CN/commands.md](docs/zh-CN/commands.md) |
| 手动安装 (不用 `npx`) | [docs/zh-CN/manual-installation.md](docs/zh-CN/manual-installation.md) |
| Scanner 覆盖 — `.claudeos-scan.json` | [docs/zh-CN/advanced-config.md](docs/zh-CN/advanced-config.md) |
| 安全性:re-init 时保留什么 | [docs/zh-CN/safety.md](docs/zh-CN/safety.md) |
| 与同类工具的对比 (scope,而非质量) | [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md) |
| 错误与恢复 | [docs/zh-CN/troubleshooting.md](docs/zh-CN/troubleshooting.md) |

---

## 贡献

欢迎贡献 — 添加栈支持、改进 prompt、修 bug。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

行为准则与安全策略见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 和 [SECURITY.md](SECURITY.md)。

## License

[ISC](LICENSE) — 任何用途均可免费使用,包括商用。

---

<sub>由 [@claudeos-core](https://github.com/claudeos-core) 用心打造。如果它为你节省了时间,在 GitHub 上点个 ⭐ 帮助保持可见。</sub>
