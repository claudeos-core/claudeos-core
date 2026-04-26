# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**从你实际的源代码自动生成 `CLAUDE.md` + `.claude/rules/` 的 deterministic CLI — Node.js scanner + 4-pass Claude 流水线 + 5 个 validator。12 个栈、10 种语言、不会编造路径。**

```bash
npx claudeos-core init
```

适用于 [**12 个栈**](#supported-stacks) (含 monorepo) — 一条命令、零配置、可 resume、重跑 idempotent。

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 这是什么?

每次会话,Claude Code 都会回退到 framework 默认值。你的团队用 **MyBatis**,而 Claude 写 JPA。你的 wrapper 是 `ApiResponse.ok()`,而 Claude 写 `ResponseEntity.success()`。你的包是 layer-first 的,而 Claude 生成 domain-first。每个 repo 都手写 `.claude/rules/` 可以解决 — 直到代码演进、规则漂移。

**ClaudeOS-Core 从你实际的源代码 deterministic 地重新生成它们。** Node.js scanner 先读取 (栈、ORM、包布局、文件路径)。随后 4-pass Claude 流水线写出完整集合 — `CLAUDE.md` + 自动加载的 `.claude/rules/` + standards + skills — 受 LLM 无法逃逸的明确 path allowlist 约束。5 个 validator 在 ship 前验证输出。

结果:相同输入 → byte-identical 输出,可输出 10 种语言中任一种,不会编造路径。(详见下方 [有什么不同](#有什么不同)。)

针对长期项目,会单独 seed 一个 [Memory Layer](#memory-layer-可选用于长期项目)。

---

## 在真实项目上看看

在 [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) 上运行 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 个源文件。结果:**生成 75 个文件**,总耗时 **53 分钟**,所有 validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>终端输出 (文本版,便于搜索 & 复制)</strong></summary>

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
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
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
<summary><strong>最终落到你 <code>CLAUDE.md</code> 里的内容 (真实节选 — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

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

上面的每一个值 — 准确的依赖坐标、`dev.db` 文件名、`V1__create_tables.sql` 迁移名、"no JPA" — 都是 Claude 写文件之前由 scanner 从 `build.gradle` / `application.properties` / 源代码树中提取的。没有任何一项是猜的。

</details>

<details>
<summary><strong>一个真实的自动加载 rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

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

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

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

`paths: ["**/*"]` glob 意味着只要你编辑项目里任何一个文件,Claude Code 就会自动加载这条 rule。rule 中所有的类名、包路径和 exception handler 都直接来自被扫描的源代码 — 包括项目实际存在的 `CustomizeExceptionHandler` 和 `JacksonCustomizations`。

</details>

<details>
<summary><strong>自动生成的 <code>decision-log.md</code> 种子 (真实节选)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 用从 `pass2-merged.json` 中提取的架构决策来 seed `decision-log.md`,这样后续会话不仅记得代码 _长什么样_,还记得 _为什么_ 是这样。每个选项 ("JPA/Hibernate"、"MyBatis-Plus") 和每个后果都基于真实的 `build.gradle` 依赖块。

</details>

---

## 已测试

ClaudeOS-Core 提供基于真实 OSS 项目的参考基准。如果你在公开 repo 上跑过它,欢迎 [开 issue](https://github.com/claudeos-core/claudeos-core/issues) — 我们会把它加到这个表里。

| 项目 | 栈 | Scanned → Generated | 状态 |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 文件 | ✅ 5 个 validator 全部通过 |

---

## 快速开始

**前置条件:** Node.js 18+,已安装并认证的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)。

```bash
# 1. 进入你的项目根目录
cd my-spring-boot-project

# 2. 运行 init (它会分析你的代码,然后请 Claude 写规则)
npx claudeos-core init

# 3. 完成。打开 Claude Code 开始编码 — 规则已经加载好了。
```

`init` 完成后**你会得到**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code 自动加载
│       ├── 00.core/              (通用规则 — 命名、架构)
│       ├── 10.backend/           (后端栈规则,如有)
│       ├── 20.frontend/          (前端栈规则,如有)
│       ├── 30.security-db/       (安全 & DB 约定)
│       ├── 40.infra/             (env、日志、CI/CD)
│       ├── 50.sync/              (文档同步提醒 — 仅 rules)
│       ├── 60.memory/            (内存规则 — Pass 4,仅 rules)
│       ├── 70.domains/{type}/    (按域规则,type = backend|frontend)
│       └── 80.verification/      (测试策略 + 构建验证提醒)
├── claudeos-core/
│   ├── standard/                 ← 参考文档 (镜像分类结构)
│   │   ├── 00.core/              (项目概览、架构、命名)
│   │   ├── 10.backend/           (后端参考 — 如果是后端栈)
│   │   ├── 20.frontend/          (前端参考 — 如果是前端栈)
│   │   ├── 30.security-db/       (安全 & DB 参考)
│   │   ├── 40.infra/             (env / 日志 / CI-CD 参考)
│   │   ├── 70.domains/{type}/    (按域参考)
│   │   ├── 80.verification/      (构建 / 启动 / 测试参考 — 仅 standard)
│   │   └── 90.optional/          (栈相关附加 — 仅 standard)
│   ├── skills/                   (Claude 可应用的可复用模式)
│   ├── guide/                    (常见任务的 how-to 指南)
│   ├── database/                 (Schema 概览、迁移指南)
│   ├── mcp-guide/                (MCP 集成笔记)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude 最先读的索引)
```

`rules/` 和 `standard/` 中共享相同数字前缀的分类代表同一个概念领域 (例如 `10.backend` rules ↔ `10.backend` standards)。仅 rules 的分类:`50.sync` (文档同步提醒)、`60.memory` (Pass 4 内存)。仅 standard 的分类:`90.optional` (无强制力的栈附加)。其他所有前缀 (`00`、`10`、`20`、`30`、`40`、`70`、`80`) 在 `rules/` 和 `standard/` 中**都**会出现。现在 Claude Code 了解你的项目了。

---

## 这是给谁用的?

| 你是... | 它解决的痛点 |
|---|---|
| **用 Claude Code 启动新项目的独立开发者** | "每个会话都教 Claude 我的约定" — 不存在了。`CLAUDE.md` + 8 类 `.claude/rules/` 一次生成。 |
| **维护多个 repo 共享标准的团队负责人** | 重命名包、换 ORM、改 response wrapper 时 `.claude/rules/` 漂移。ClaudeOS-Core 会 deterministic 地重新同步 — 相同输入、byte-identical 输出、无 diff 噪音。 |
| **已经在用 Claude Code 但厌倦了修生成代码** | response wrapper 错、包布局错、用 MyBatis 却写 JPA、用了集中式 middleware 却到处 `try/catch`。scanner 提取你真实的约定;每个 Claude pass 都对照明确的 path allowlist 运行。 |
| **正在 onboard 一个新 repo** (老项目、加入新团队) | 在 repo 上跑 `init`,得到一份活的架构地图:CLAUDE.md 中的栈表、按层 rules 含 ✅/❌ 示例、用主要决策的 "为什么" seed 出来的 decision log (JPA 还是 MyBatis、REST 还是 GraphQL 等)。读 5 个文件比读 5,000 个源文件强。 |
| **用韩语 / 日语 / 中文 / 等 7 种语言工作** | 大多数 Claude Code 规则生成器只支持英语。ClaudeOS-Core 用 **10 种语言** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) 写完整集合,并附带 **byte-identical 结构验证** — 无论输出哪种语言,`claude-md-validator` 的判定都一致。 |
| **运行在 monorepo 上** (Turborepo、pnpm/yarn workspaces、Lerna) | 一次运行中后端 + 前端域用各自 prompt 分析;`apps/*/` 和 `packages/*/` 自动遍历;按栈的规则 emit 到 `70.domains/{type}/` 下。 |
| **为 OSS 贡献或做实验** | 输出对 gitignore 友好 — `claudeos-core/` 是你本地的工作目录,只有 `CLAUDE.md` + `.claude/` 需要 ship。中断时 resume-safe;重跑 idempotent (不加 `--force` 时你手动改的规则会被保留)。 |

**不适合的情况:**你想要一个 day-one 就能用、不需要扫描步骤的 one-size-fits-all preset 包 (哪个工具适合哪种场景见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md));你的项目还不属于 [支持的栈](#supported-stacks);或你只需要一个 `CLAUDE.md` (内置的 `claude /init` 就够用 — 不必再装别的工具)。

---

## 工作原理

ClaudeOS-Core 把通常的 Claude Code 工作流反过来:

```
通常:    你描述项目 → Claude 猜你的栈 → Claude 写文档
本工具:  代码读你的栈 → 代码把已确认事实交给 Claude → Claude 基于事实写文档
```

流水线分**三个阶段**运行,LLM 调用两边都有代码:

**1. Step A — Scanner (deterministic、无 LLM)。** Node.js scanner 遍历你的项目根目录,读 `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`,解析 `.env*` 文件 (对 `PASSWORD/SECRET/TOKEN/JWT_SECRET/...` 等敏感变量做 redaction),分类架构模式 (Java 的 5 种模式 A/B/C/D/E、Kotlin CQRS / 多模块、Next.js App vs Pages Router、FSD、components-pattern),发现域,并构建一份所有存在源文件路径的明确 allowlist。输出:`project-analysis.json` — 后续所有阶段的单一事实源。

**2. Step B — 4-Pass Claude 流水线 (受 Step A 事实约束)。**
- **Pass 1** 按域组读取代表性文件,提取每个域 ~50–100 条约定 — response wrapper、日志库、错误处理、命名约定、测试模式。每个域组运行一次 (`max 4 domains, 40 files per group`),context 永远不会溢出。
- **Pass 2** 把所有按域的分析合并为项目级全景,在域之间存在分歧时挑选主导约定。
- **Pass 3** 写出 `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — 拆成多个 stage (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide),即使 `pass2-merged.json` 很大,每个 stage 的 prompt 也能装进 LLM 的 context window。≥16 域的项目会把 3b/3c 拆成 ≤15 域的 batch。
- **Pass 4** 为 L4 内存层 (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) 播种,并加入通用 scaffold rules。Pass 4 **禁止修改 `CLAUDE.md`** — Pass 3 的 Section 8 是 authoritative。

**3. Step C — Verification (deterministic、无 LLM)。** 5 个 validator 检查输出:
- `claude-md-validator` — 对 `CLAUDE.md` 进行 25 项结构检查 (8 个 section、H3/H4 计数、内存文件唯一性、T1 canonical heading 不变量)。Language-invariant:无论 `--lang` 是什么,判定一致。
- `content-validator` — 10 项内容检查,含 path-claim 校验 (`STALE_PATH` 抓出虚构的 `src/...` 引用) 和 MANIFEST 漂移检测。
- `pass-json-validator` — Pass 1/2/3/4 输出的 JSON well-formedness + 栈感知的 section 计数。
- `plan-validator` — plan ↔ disk 一致性 (legacy,自 v2.1.0 起基本是 no-op)。
- `sync-checker` — 7 个跟踪目录上的 disk ↔ `sync-map.json` 注册一致性。

三档严重度 (`fail` / `warn` / `advisory`),所以警告不会因为用户能手动修复的 LLM hallucination 把 CI 卡死。

把所有这些串起来的不变量是:**Claude 只能引用你代码中真实存在的路径**,因为 Step A 给了它一份有限的 allowlist。如果 LLM 还是想编 (在某些 seed 下偶尔会发生),Step C 会在 docs ship 之前抓出来。

每个 pass 的细节、基于 marker 的 resume、绕开 Claude Code 的 `.claude/` 敏感路径限制的 staged-rules workaround、栈检测内部机制,见 [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md)。

---

## Supported Stacks

12 个栈,从你的项目文件中自动检测:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

多栈项目 (例如 Spring Boot 后端 + Next.js 前端) 开箱即用。

检测规则与每个 scanner 提取的内容,见 [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md)。

---

## 日常工作流

三个命令覆盖 ~95% 的使用场景:

```bash
# 在项目上首次运行
npx claudeos-core init

# 你手动改完 standards 或 rules 之后
npx claudeos-core lint

# 健康检查 (commit 前或在 CI 中跑)
npx claudeos-core health
```

每条命令的全部选项,见 [docs/zh-CN/commands.md](docs/zh-CN/commands.md)。Memory layer 命令 (`memory compact`、`memory propose-rules`) 在下方 [Memory Layer](#memory-layer-可选用于长期项目) 章节里说明。

---

## 有什么不同

大多数 Claude Code 文档工具是从描述生成的 (你告诉工具,工具告诉 Claude)。ClaudeOS-Core 是从你实际的源代码生成的 (工具读、工具告诉 Claude 已确认的内容、Claude 只写已确认的内容)。

三个具体后果:

1. **Deterministic 栈检测。** 同样的项目 + 同样的代码 = 同样的输出。不会出现 "这次 Claude 又另一种走法"。
2. **不会编造路径。** Pass 3 prompt 明确列出每条允许的源代码路径;Claude 不可能引用不存在的路径。
3. **多栈感知。** 同一次运行内,后端和前端域使用不同的分析 prompt。

与其他工具的 scope 并排对照,见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md)。比较关心的是 **每个工具做什么**,而不是 **谁更好** — 多数是互补关系。

---

## 验证 (生成后)

Claude 写完 docs 之后,代码再去验证它们。5 个独立 validator:

| Validator | 检查内容 | 由谁运行 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 结构不变量 (8 个 section、language-invariant) | `claudeos-core lint` |
| `content-validator` | path 引用是否真实存在;manifest 一致性 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 输出是合法 JSON | `health` (warn) |
| `plan-validator` | 保存的 plan 是否与磁盘匹配 | `health` (fail-on-error) |
| `sync-checker` | 磁盘文件是否与 `sync-map.json` 注册匹配 (检测孤儿/未注册) | `health` (fail-on-error) |

`health-checker` 会以三档严重度 (fail / warn / advisory) 编排四个运行时 validator,并以适合 CI 的退出码退出。`claude-md-validator` 通过 `lint` 命令单独运行,因为结构漂移是 re-init 信号,而非软警告。可随时运行:

```bash
npx claudeos-core health
```

每个 validator 的具体检查项,见 [docs/zh-CN/verification.md](docs/zh-CN/verification.md)。

---

## Memory Layer (可选,用于长期项目)

在以上的 scaffolding 流水线之外,ClaudeOS-Core 会为 context 跨越单次会话存活的项目 seed 一个 `claudeos-core/memory/` 文件夹。它是可选的 — 如果你只想要 `CLAUDE.md` + rules,可以忽略它。

四个文件,都由 Pass 4 写入:

- `decision-log.md` — append-only 形式的"为什么选 X 而不是 Y",从 `pass2-merged.json` seed
- `failure-patterns.md` — 带 frequency/importance 评分的复发错误
- `compaction.md` — 内存如何随时间自动 compaction
- `auto-rule-update.md` — 应该升格为新 rule 的模式

两个命令长期维护这一层:

```bash
# 压缩 failure-patterns 日志 (定期跑)
npx claudeos-core memory compact

# 把高频 failure pattern 升格为提议的 rule
npx claudeos-core memory propose-rules
```

内存模型与生命周期,见 [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md)。

---

## FAQ

**Q: 我需要 Claude API key 吗?**
A: 不需要。ClaudeOS-Core 用你已有的 Claude Code 安装 — 它把 prompt pipe 给你机器上的 `claude -p`。无需额外账号。

**Q: 它会覆盖我已有的 CLAUDE.md 或 `.claude/rules/` 吗?**
A: 在干净项目上首次运行:它会创建。不带 `--force` 重跑:你的编辑会被保留 — 上次运行的 pass marker 被检测到,这些 pass 会被跳过。带 `--force` 重跑:全部抹掉重新生成 (你的编辑会丢失 — 这就是 `--force` 的含义)。见 [docs/zh-CN/safety.md](docs/zh-CN/safety.md)。

**Q: 我的栈不在支持列表。我能加一个吗?**
A: 可以。新栈大约需要 3 个 prompt 模板 + 一个域 scanner。8 步指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**Q: 怎么用中文 (或其他语言) 生成文档?**
A: `npx claudeos-core init --lang zh-CN`。支持 10 种语言:en、ko、ja、zh-CN、es、vi、hi、ru、fr、de。

**Q: 它能用在 monorepo 上吗?**
A: 可以 — Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) 都会被 stack-detector 检测到。每个 app 都有自己的分析。其他 monorepo 布局 (例如 NX) 不会专门检测,但通用的 `apps/*/` 和 `packages/*/` 模式仍会被各栈 scanner 识别。

**Q: 如果 Claude Code 生成了我不同意的规则怎么办?**
A: 直接编辑它们。然后跑 `npx claudeos-core lint` 确认 CLAUDE.md 结构仍然有效。在不带 `--force` 的后续 `init` 运行中,你的编辑会被保留 — resume 机制会跳过有 marker 的 pass。

**Q: 在哪里报 bug?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。安全问题见 [SECURITY.md](SECURITY.md)。

---

## 如果这为你节省了时间

GitHub 上点一个 ⭐ 能让项目保持可见,也帮别人发现它。Issue、PR 和栈模板贡献都欢迎 — 见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 文档

| 主题 | 阅读 |
|---|---|
| 4-pass 流水线如何工作 (比图更深) | [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md) |
| 架构的可视化图 (Mermaid) | [docs/zh-CN/diagrams.md](docs/zh-CN/diagrams.md) |
| 栈检测 — 每个 scanner 看什么 | [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md) |
| 内存层 — decision log 与 failure pattern | [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md) |
| 5 个 validator 详解 | [docs/zh-CN/verification.md](docs/zh-CN/verification.md) |
| 所有 CLI 命令与选项 | [docs/zh-CN/commands.md](docs/zh-CN/commands.md) |
| 手动安装 (不用 `npx`) | [docs/zh-CN/manual-installation.md](docs/zh-CN/manual-installation.md) |
| Scanner 覆盖 — `.claudeos-scan.json` | [docs/zh-CN/advanced-config.md](docs/zh-CN/advanced-config.md) |
| 安全:re-init 时保留什么 | [docs/zh-CN/safety.md](docs/zh-CN/safety.md) |
| 与同类工具对比 (scope,不是质量) | [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md) |
| 错误与恢复 | [docs/zh-CN/troubleshooting.md](docs/zh-CN/troubleshooting.md) |

---

## 贡献

欢迎贡献 — 增加栈支持、改进 prompt、修 bug。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

行为准则与安全策略见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 与 [SECURITY.md](SECURITY.md)。

## 许可证

[ISC License](LICENSE)。可自由用于任何用途,含商业用途。© 2025–2026 ClaudeOS-Core contributors。

---

<sub>由 [claudeos-core](https://github.com/claudeos-core) 团队维护。Issue 与 PR:<https://github.com/claudeos-core/claudeos-core>。</sub>
