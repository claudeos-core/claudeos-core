# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**直接读取项目源码,自动生成 `CLAUDE.md` 与 `.claude/rules/` 的命令行工具。Node.js scanner、4-pass Claude 流水线和 5 个 validator 协同工作,支持 12 种技术栈、10 种语言,绝不会编造代码里不存在的路径。**

```bash
npx claudeos-core init
```

[**12 个栈**](#supported-stacks)开箱即用,monorepo 也照样支持。一行命令搞定,免配置,中断后能续跑,反复执行也安全。

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 这是什么?

每开一个新会话,Claude Code 都会回到通用的框架默认值。团队明明在用 **MyBatis**,Claude 却写成 JPA;响应包装器是 `ApiResponse.ok()`,Claude 偏偏写成 `ResponseEntity.success()`;包结构是 layer-first,生成出来却变成 domain-first。给每个仓库手写一份 `.claude/rules/` 确实能解决问题,可代码一旦演进,规则就开始跟实际脱节。

**ClaudeOS-Core 的做法是直接读源码,稳定地把这些文件重新生成出来。** 第一步,Node.js scanner 扫一遍项目,把技术栈、ORM、包结构、文件路径都摸清楚。第二步,4-pass Claude 流水线产出完整的内容:`CLAUDE.md`、自动加载的 `.claude/rules/`、standards、skills,全部限定在一份明确的路径白名单里,LLM 越不出这个范围。最后,5 个 validator 在交付前再把结果过一遍。

这样一来,同样的输入永远得到同样的输出。10 种语言里随便选一种,产物在字节层面也完全一致,代码里没有的路径绝不会出现。(细节看下面[有什么不同](#有什么不同)。)

长期维护的项目,还会顺带生成一份 [Memory Layer](#memory-layer-可选用于长期项目)。

---

## 在真实项目上看看

拿 [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) 跑了一遍。Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 个源文件。结果生成 **75 个文件**,总耗时 **53 分钟**,所有 validator ✅。

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>终端输出 (文本版本,方便搜索和复制)</strong></summary>

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
<summary><strong>实际写进 <code>CLAUDE.md</code> 的内容 (真实片段 — Section 1 + 2)</strong></summary>

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

表里的每一项 —— 精确的依赖坐标、`dev.db` 文件名、`V1__create_tables.sql` 迁移名,乃至 "no JPA" 这种判断 —— 都是 Claude 动笔前,scanner 从 `build.gradle`、`application.properties` 和源码目录里实打实读出来的,没有一处靠猜。

</details>

<details>
<summary><strong>真实自动加载的规则 (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

`paths: ["**/*"]` 这个 glob 的意思是:只要在项目里编辑任何文件,Claude Code 都会自动加载这条规则。规则里的类名、包路径、异常处理器全都来自扫描到的源码,所以连项目实际使用的 `CustomizeExceptionHandler` 和 `JacksonCustomizations` 也都对得上号。

</details>

<details>
<summary><strong>自动生成的 <code>decision-log.md</code> 种子内容 (真实片段)</strong></summary>

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

Pass 4 会把 `pass2-merged.json` 里抽出的架构决策提前写进 `decision-log.md`。这样以后开新会话时,不仅能看到代码*长什么样*,也能记住*为什么会变成这样*。每一个候选方案 ("JPA/Hibernate"、"MyBatis-Plus") 和它的取舍后果,都是从真实的 `build.gradle` 依赖块里推出来的。

</details>

---

## 已测试的项目

ClaudeOS-Core 在真实开源项目上跑过基准测试,结果也一并公开。如果你也在公开仓库里试用过,欢迎[提个 issue](https://github.com/claudeos-core/claudeos-core/issues),我们会把它加到下面的表里。

| 项目 | 技术栈 | Scanned → Generated | 状态 |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ 5 个 validator 全部通过 |

---

## 快速开始

**前置条件:** Node.js 18+,以及已安装并完成认证的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)。

```bash
# 1. 进入项目根目录
cd my-spring-boot-project

# 2. 跑 init (它会先分析代码,再让 Claude 写规则)
npx claudeos-core init

# 3. 完成。打开 Claude Code 直接写代码,规则已经就位。
```

`init` 跑完之后,会得到这样一份产物:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code 自动加载
│       ├── 00.core/              (通用规则 — 命名、架构)
│       ├── 10.backend/           (后端栈规则,如有)
│       ├── 20.frontend/          (前端栈规则,如有)
│       ├── 30.security-db/       (安全 & 数据库规范)
│       ├── 40.infra/             (env、日志、CI/CD)
│       ├── 50.sync/              (文档同步提醒 — 仅 rules)
│       ├── 60.memory/            (记忆规则 — Pass 4,仅 rules)
│       ├── 70.domains/{type}/    (按域划分的规则,type = backend|frontend)
│       └── 80.verification/      (测试策略 + 构建验证提醒)
├── claudeos-core/
│   ├── standard/                 ← 参考文档 (与上面分类一一对应)
│   │   ├── 00.core/              (项目概览、架构、命名)
│   │   ├── 10.backend/           (后端参考 — 当存在后端栈时)
│   │   ├── 20.frontend/          (前端参考 — 当存在前端栈时)
│   │   ├── 30.security-db/       (安全 & 数据库参考)
│   │   ├── 40.infra/             (env / 日志 / CI-CD 参考)
│   │   ├── 70.domains/{type}/    (按域划分的参考)
│   │   ├── 80.verification/      (构建 / 启动 / 测试参考 — 仅 standard)
│   │   └── 90.optional/          (按栈附加的资料 — 仅 standard)
│   ├── skills/                   (Claude 可复用的模式)
│   ├── guide/                    (常见任务的 how-to 指南)
│   ├── database/                 (Schema 概览、迁移指南)
│   ├── mcp-guide/                (MCP 集成说明)
│   └── memory/                   (decision log、failure patterns、compaction)
└── CLAUDE.md                     (Claude 最先读的索引)
```

`rules/` 和 `standard/` 里前缀编号相同的分类,对应同一个概念领域 (比如 `10.backend` 规则 ↔ `10.backend` standard)。只在 rules 出现的有两类:`50.sync` (文档同步提醒) 和 `60.memory` (Pass 4 记忆);只在 standard 出现的是 `90.optional` (栈相关的附加资料,不强制执行)。其余前缀 (`00`、`10`、`20`、`30`、`40`、`70`、`80`) 两边都有。到这里,Claude Code 就已经"认识"这个项目了。

---

## 这是给谁用的?

| 你是... | 它能帮你解决什么 |
|---|---|
| **打算用 Claude Code 启动新项目的独立开发者** | 不用每个会话都把规范从头讲一遍。`CLAUDE.md` 加上 8 大类的 `.claude/rules/`,一次跑完就有了。 |
| **要在多个仓库之间维护共享标准的技术负责人** | 重命名包、换 ORM、改响应包装器之后,`.claude/rules/` 总是慢半拍跟不上。ClaudeOS-Core 用一致的方式重新对齐:同样的输入产出字节级一致的结果,diff 里不会有多余噪音。 |
| **已经在用 Claude Code,却被生成代码搞得头大的人** | 包装器写错、包结构不对、明明用 MyBatis 却生成 JPA、明明有统一中间件却到处 `try/catch`。Scanner 把项目真实的规范抽出来,每一次 Claude pass 都在明确的路径白名单内运行。 |
| **刚加入一个新仓库的人** (老项目、新团队) | 在仓库里跑一下 `init`,就能拿到一张活的架构地图:CLAUDE.md 里的栈表格、按层划分的规则配 ✅/❌ 示例,加上预先写好"为什么"的 decision log (JPA vs MyBatis、REST vs GraphQL 等)。读 5 份文件,胜过翻 5,000 个源文件。 |
| **要用中文 / 韩语 / 日语等英语以外的语言工作的人** | 大多数 Claude Code 规则生成器只支持英语。ClaudeOS-Core 把整套产物以 **10 种语言** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) 输出,而结构校验在所有语言下完全一致 —— `claude-md-validator` 的判定不受输出语言影响。 |
| **在 monorepo 里干活** (Turborepo、pnpm/yarn workspaces、Lerna) | 跑一次就能用不同 prompt 分别分析后端和前端域;`apps/*/`、`packages/*/` 自动遍历;按栈生成的规则放在 `70.domains/{type}/` 下面。 |
| **做开源贡献或个人实验** | 输出对 gitignore 很友好。`claudeos-core/` 是本地工作目录,真正要提交的只有 `CLAUDE.md` 和 `.claude/`。中断后能续跑,反复执行也安全 (手工改过的规则,只要不加 `--force` 都会保留)。 |

**不太合适的情况:** 想要一份开箱即用、无需扫描的万能 preset 套装 (各工具的定位差异参见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md));项目暂时还不在[受支持的栈](#supported-stacks)里;只想要一份 `CLAUDE.md` —— 这种情况下,内置的 `claude /init` 已经够用,没必要再装一个工具。

---

## 工作原理

ClaudeOS-Core 把常见的 Claude Code 流程倒过来跑:

```
常规:    用户描述项目 → Claude 猜测栈 → Claude 写文档
本工具:  代码读出栈   → 把确认过的事实交给 Claude → Claude 根据事实写文档
```

整条流水线分**三个阶段**,LLM 调用的两端都有代码把关。

**1. Step A — Scanner (确定性,不调用 LLM)。** Node.js scanner 遍历项目根目录,读取 `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`,解析 `.env*` 文件 (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` 这类敏感变量自动脱敏)。接着归类架构模式 (Java 的 5 种 A/B/C/D/E、Kotlin 的 CQRS / 多模块、Next.js 的 App vs Pages Router、FSD、components-pattern),识别业务域,再为每一个真实存在的源文件路径生成一份明确的白名单。结果汇总到 `project-analysis.json`,后续所有步骤都以它为唯一事实来源。

**2. Step B — 4-Pass Claude 流水线 (受 Step A 的事实约束)。**
- **Pass 1** 按域分组读取代表性文件,从每个域里提炼大约 50–100 条规范:响应包装器、日志库、错误处理、命名约定、测试模式等。每个域分组只跑一次 (`max 4 domains, 40 files per group`),所以 context 不会爆。
- **Pass 2** 把各域的分析结果合并成一张项目级全景图;域之间出现冲突时,取占主导地位的那种写法。
- **Pass 3** 产出 `CLAUDE.md`、`.claude/rules/`、`claudeos-core/standard/`、skills 和 guides。这一步分阶段走 (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide),即便 `pass2-merged.json` 体积很大,每个阶段的 prompt 也能塞进 LLM 的 context window。域数超过 16 时,3b/3c 还会再细分成不超过 15 个域的批次。
- **Pass 4** 给 L4 记忆层 (`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`) 写入种子内容,并补上通用的 scaffold rules。Pass 4 **不允许碰 `CLAUDE.md`**,Section 8 由 Pass 3 独占。

**3. Step C — Verification (确定性,不调用 LLM)。** 5 个 validator 把结果再过一遍:
- `claude-md-validator` —— 对 `CLAUDE.md` 做 25 项结构检查 (8 个 section、H3/H4 数量、记忆文件唯一性、T1 canonical heading 不变量)。语言无关,无论 `--lang` 选什么,判定结果都一样。
- `content-validator` —— 10 项内容检查,涵盖路径引用核验 (`STALE_PATH` 会抓出虚构的 `src/...` 引用) 和 MANIFEST 漂移检测。
- `pass-json-validator` —— 检查 Pass 1/2/3/4 输出的 JSON 是否合规,以及各栈预期的 section 数量。
- `plan-validator` —— 校验 plan ↔ 磁盘的一致性 (legacy,自 v2.1.0 起基本是 no-op)。
- `sync-checker` —— 在 7 个被追踪的目录里核对磁盘文件 ↔ `sync-map.json` 注册关系。

severity 分三档 (`fail` / `warn` / `advisory`),这样用户能手动修掉的 LLM 幻觉就不会因为一个 warning 把 CI 卡死。

把这些串起来的核心约束就一句话:**Claude 只能引用代码里真实存在的路径**,因为 Step A 给了它一份有限的白名单。万一 LLM 还是想自己造点东西 (个别 seed 下偶尔会冒一两条),Step C 也会在交付前把它抓住。

每个 pass 的细节、基于 marker 的续跑机制、绕开 Claude Code `.claude/` 敏感路径限制的 staged-rules 处理,以及栈检测的内部逻辑,都收在 [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md) 里。

---

## Supported Stacks

12 种技术栈,从项目文件里自动识别:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

多栈项目 (例如 Spring Boot 后端 + Next.js 前端) 也能直接跑。

具体的识别规则、每个 scanner 抽取了什么内容,详见 [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md)。

---

## 日常工作流

绝大多数场景靠这三条命令就够了:

```bash
# 项目第一次跑
npx claudeos-core init

# 手动改过 standards 或规则之后
npx claudeos-core lint

# 健康检查 (提交前或在 CI 里跑)
npx claudeos-core health
```

每条命令的完整选项见 [docs/zh-CN/commands.md](docs/zh-CN/commands.md)。记忆层相关命令 (`memory compact`、`memory propose-rules`) 在下面的 [Memory Layer](#memory-layer-可选用于长期项目) 里说明。

---

## 有什么不同

大多数 Claude Code 文档工具都从"用户描述"出发:用户告诉工具,工具再告诉 Claude。ClaudeOS-Core 反过来,从源码出发:工具自己读代码,把确定下来的事实交给 Claude,Claude 只根据这些事实写文档。

具体落到三件事上:

1. **栈识别可复现。** 同样的项目 + 同样的代码 = 同样的输出,不会出现"这次 Claude 又写得不一样"的情况。
2. **不编造路径。** Pass 3 prompt 里写明了所有允许的源码路径,Claude 没法引用不存在的路径。
3. **多栈感知。** 同一次执行里,后端域和前端域走不同的分析 prompt。

跟其它工具的范围对比参见 [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md)。这份对比讲的是**每个工具各做什么**,而不是**谁更好** —— 大多数工具其实是互补关系。

---

## 验证 (生成后)

Claude 写完文档,接下来轮到代码来核对结果。5 个独立的 validator:

| Validator | 检查内容 | 由谁运行 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 的结构不变量 (8 sections,语言无关) | `claudeos-core lint` |
| `content-validator` | path claim 是否真实存在;manifest 一致性 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 输出是否为合规 JSON | `health` (warn) |
| `plan-validator` | 保存的 plan 是否与磁盘对得上 | `health` (fail-on-error) |
| `sync-checker` | 磁盘文件是否与 `sync-map.json` 注册一致 (检测 orphaned/unregistered) | `health` (fail-on-error) |

`health-checker` 会把这 4 个运行时 validator 按三档 severity (fail / warn / advisory) 串起来跑,并以适合 CI 的 exit code 收尾。`claude-md-validator` 单独通过 `lint` 命令运行,因为结构层面的偏离不算软警告,而是该重新 init 的信号。随时都能跑:

```bash
npx claudeos-core health
```

每个 validator 具体检查什么,看 [docs/zh-CN/verification.md](docs/zh-CN/verification.md)。

---

## Memory Layer (可选,用于长期项目)

除了上面的 scaffolding 流水线,ClaudeOS-Core 还会在 `claudeos-core/memory/` 下放一套文件,专门服务于 context 需要跨会话延续的长期项目。这部分是可选的,只需要 `CLAUDE.md` 加规则的话,完全可以忽略。

一共 4 个文件,全部由 Pass 4 写入:

- `decision-log.md` —— append-only 的"为什么选 X 不选 Y",从 `pass2-merged.json` 取种子。
- `failure-patterns.md` —— 反复出现的错误,带 frequency / importance 分数。
- `compaction.md` —— 记忆随时间自动压缩的方式。
- `auto-rule-update.md` —— 应当晋升为新规则的模式。

项目持续推进时,这两条命令负责维护这一层:

```bash
# 压缩 failure-patterns 日志 (定期执行)
npx claudeos-core memory compact

# 把高频 failure pattern 提为候选规则
npx claudeos-core memory propose-rules
```

记忆模型和生命周期说明见 [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md)。

---

## FAQ

**Q: 需要 Claude API key 吗?**
A: 不需要。ClaudeOS-Core 直接用本机已经装好的 Claude Code,通过 `claude -p` 把 prompt 喂进去,不用额外开账号。

**Q: 会覆盖现有的 CLAUDE.md 或 `.claude/rules/` 吗?**
A: 在新项目里第一次跑会创建。不带 `--force` 重跑时,手工改过的内容都会保留 —— 上一次执行留下的 pass marker 会被识别,对应 pass 直接跳过。带 `--force` 重跑则会清空再生成 (改动也会一起没,这正是 `--force` 的本意)。详见 [docs/zh-CN/safety.md](docs/zh-CN/safety.md)。

**Q: 我用的栈不在支持列表里,能加进去吗?**
A: 能。新增一个栈大致需要 3 个 prompt 模板加一个域 scanner。完整的 8 步指南在 [CONTRIBUTING.md](CONTRIBUTING.md)。

**Q: 怎么生成中文 (或其它语言) 文档?**
A: `npx claudeos-core init --lang zh-CN`。10 种语言可选:en、ko、ja、zh-CN、es、vi、hi、ru、fr、de。

**Q: monorepo 能用吗?**
A: 能。Turborepo (`turbo.json`)、pnpm workspaces (`pnpm-workspace.yaml`)、Lerna (`lerna.json`)、npm/yarn workspaces (`package.json#workspaces`) 都由 stack-detector 自动识别,每个 app 单独分析。别的布局 (比如 NX) 虽然没有专门识别,但通用的 `apps/*/`、`packages/*/` 仍然能被各栈的 scanner 抓到。

**Q: 如果 Claude Code 生成了我不认同的规则怎么办?**
A: 直接改文件就行。改完顺手跑一下 `npx claudeos-core lint`,确认 CLAUDE.md 结构依然有效。之后 (不带 `--force`) 再跑 `init` 时,改动会保留 —— resume 机制会跳过已经有 marker 的 pass。

**Q: bug 该报到哪里?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues)。安全相关的问题参见 [SECURITY.md](SECURITY.md)。

---

## 如果这为你省下了时间

GitHub 上一颗 ⭐ 能让项目更容易被看到,也方便其他人发现它。issue、PR、栈模板贡献都欢迎,详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 文档

| 主题 | 阅读 |
|---|---|
| 4-pass 流水线的运作方式 (比图更深入) | [docs/zh-CN/architecture.md](docs/zh-CN/architecture.md) |
| 架构的可视化图示 (Mermaid) | [docs/zh-CN/diagrams.md](docs/zh-CN/diagrams.md) |
| 栈检测 — 每个 scanner 看的是什么 | [docs/zh-CN/stacks.md](docs/zh-CN/stacks.md) |
| 记忆层 — decision log 与 failure patterns | [docs/zh-CN/memory-layer.md](docs/zh-CN/memory-layer.md) |
| 5 个 validator 的详细说明 | [docs/zh-CN/verification.md](docs/zh-CN/verification.md) |
| 所有 CLI 命令与选项 | [docs/zh-CN/commands.md](docs/zh-CN/commands.md) |
| 手动安装 (不用 `npx`) | [docs/zh-CN/manual-installation.md](docs/zh-CN/manual-installation.md) |
| Scanner 覆盖配置 — `.claudeos-scan.json` | [docs/zh-CN/advanced-config.md](docs/zh-CN/advanced-config.md) |
| 安全:重新执行时哪些会被保留 | [docs/zh-CN/safety.md](docs/zh-CN/safety.md) |
| 与同类工具的对比 (按范围,不是质量) | [docs/zh-CN/comparison.md](docs/zh-CN/comparison.md) |
| 错误与恢复 | [docs/zh-CN/troubleshooting.md](docs/zh-CN/troubleshooting.md) |

---

## 贡献

欢迎贡献,新增栈支持、改进 prompt、修 bug 都很欢迎。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

行为准则与安全策略见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 和 [SECURITY.md](SECURITY.md)。

## 许可证

[ISC License](LICENSE)。可自由用于任何用途,包括商业。© 2025–2026 ClaudeOS-Core contributors.

---

<sub>由 [claudeos-core](https://github.com/claudeos-core) 团队维护。issue 与 PR 请发至 <https://github.com/claudeos-core/claudeos-core>。</sub>
