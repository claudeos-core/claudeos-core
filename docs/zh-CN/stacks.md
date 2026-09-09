# Supported Stacks

12 个栈,全部从项目文件自动检测。**8 个 backend** + **4 个 frontend**。

本页讲每个栈怎么检测,以及对应 scanner 提取了什么。可以用来:

- 看看你的栈是否支持。
- 了解 scanner 在生成文档前会把哪些事实交给 Claude。
- 看看 `claudeos-core/generated/project-analysis.json` 里会出现什么。

如果项目结构不常见,见 [advanced-config.md](advanced-config.md) 的 `.claudeos-scan.json` 覆盖项。

> 英文原文: [docs/stacks.md](../stacks.md)。中文译文与英文同步。

---

## 检测怎么工作

`init` 运行时,scanner 大致按这个顺序打开项目根目录的这些文件:

| 文件 | 它告诉 scanner 什么 |
|---|---|
| `package.json` | Node.js 项目;通过 `dependencies` 推断 framework |
| `pom.xml` | Java/Maven 项目 |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle 项目 |
| `pyproject.toml` / `requirements.txt` | Python 项目;通过 packages 推断 framework |
| `angular.json` | Angular 项目 |
| `nuxt.config.{ts,js}` | Vue/Nuxt 项目 |
| `next.config.{ts,js}` | Next.js 项目 |
| `vite.config.{ts,js}` | Vite 项目 |

都不匹配时,`init` 直接以明确错误停止,而不是去猜。没有"提示 LLM 帮忙搞清楚"这种 fallback。宁可大声报错,也不要悄悄输出错的文档。

想看真正的检测逻辑,scanner 在 `plan-installer/stack-detector.js`。

---

## Backend stacks(8)

### Java / Spring Boot

**何时检测:** `build.gradle` 或 `pom.xml` 包含 `spring-boot-starter`。Java 靠 Gradle 插件块与 Kotlin 区分。

**架构模式检测。** Scanner 把项目归到 **5 种模式之一**:

| 模式 | 示例结构 |
|---|---|
| **A. Layer-first** | `controller/order/`、`service/order/`、`repository/order/` |
| **B. Domain-first** | `order/controller/`、`order/service/`、`order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`、`service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`、`order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`、`application/`、`infrastructure/`、`presentation/` |

按顺序尝试(A → B/D → E → C)。Scanner 还有两项细化:(1)**root-package 检测** 选取覆盖 ≥80% 含 layer 文件的最长 package prefix(跨重跑 deterministic);(2)**deep-sweep fallback** 用于 Pattern B/D:当标准 glob 在某个已注册域上返回零文件时,scanner 重新 glob `**/${domain}/**/*.java`,沿每个文件路径找最近的 layer 目录,捕获跨域耦合布局如 `core/{otherDomain}/{layer}/{domain}/`。

**提取的事实:**
- Stack、framework version、ORM(JPA / MyBatis / jOOQ)
- DB 类型(Postgres / MySQL / Oracle / MariaDB / H2:H2 检测用 `\bh2\b` 词边界正则,避开 `oauth2`、`cache2k` 之类的误报)
- Package manager(Gradle / Maven)、build tool、logger(Logback / Log4j2)
- 域列表与文件计数(controller、service、mapper、dto、MyBatis XML mapper)

scanner 在 `plan-installer/scanners/scan-java.js`。

---

### Java / Spring Framework (不用 Boot) 与遗留 JVM (v2.5.1+) — 上面 Java 栈的变体，模板相同

**触发条件：** 构建声明了 JVM 插件，或声明了 group **精确等于** `org.springframework` (Spring 1.x 为 `springframework`) 的依赖 — 无论有没有 Spring Boot。`org.springframework.boot` / `.security` / `.data` / `.cloud` 是各自独立的项目，绝不会被报告为 Spring Framework。

| 构建形态 | 读取的依据 |
|---|---|
| Gradle，`apply plugin:` 时代 | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`；`compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`；`group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`；`org.springframework:spring:2.5.6` (2.x 时代的单一 jar) |
| Gradle，`plugins { }` / Kotlin DSL | `id 'java'`、裸写的 `java` / `war` / `` `java-library` ``、`apply(plugin = "war")`；经由 `platform()` / `mavenBom` 的 `spring-framework-bom`；版本目录 `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle，变量 | `ext { springVersion = '…' }`、`def` / `val`、**`gradle.properties`** (同文件内的定义优先)、`${project.x}` / `${rootProject.ext.x}`、Groovy map `${versions.spring}`、buildSrc `${Versions.spring}`、`apply from:` 脚本；Boot 1.x/2.x 的 `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`；`options.release = 17` |
| Spring 1.x | 不带 `org.` 的 group `springframework` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`；`<groupId>org.springframework</groupId>` 依赖 (已剥离注释)；`spring-framework-bom` import；`<spring.version>` / `<spring.maven.version>` 属性；`spring-boot-starter-parent` 的 `<version>`；`spring-boot-dependencies` BOM；`<maven.compiler.release>`；Maven 2 时代 `maven-compiler-plugin` 的 `<source>1.5</source>`；**多模块** `<modules>` 子模块 (≤30) |
| 仓库形态 | 只有 `settings.gradle` 的根目录；根目录没有构建文件但存在 `*/pom.xml` 同级项目 (深度 1，≤30) |
| IDE 元数据 | `.settings/org.eclipse.jdt.core.prefs` 的 compliance；`.classpath` 中的 JRE 名称 (`jdk1.6.0_45`) 与 `kind="lib"/"var"` 的 jar 路径 (jar 可以没有提交)；`.idea/misc.xml` 的 `languageLevel`；`nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`)、`ivy.xml` (`org="org.springframework"` 精确匹配、`rev="…"`) |
| Eclipse WTP / 无构建工具 | `.classpath` 的 JRE 容器 (`JavaSE-1.7`)、`.project` 的 `javanature`；`**/{WEB-INF/lib,lib,libs}/**/*.jar` 的文件名 → Spring 版本 (`spring-webmvc-3.0.5.RELEASE.jar`)、JDBC 驱动 (`ojdbc*`、`mysql-connector`、`mariadb-java-client`、`postgresql-`、`h2-`、`sqlite-jdbc`、`mssql-jdbc` / `jtds`、`db2jcc`、Tibero / Altibase / Cubrid)、ORM (`ibatis-*`、`mybatis-*`、`hibernate-*`) — 仅当旁边有 `*.java` 源码时 |
| 部署描述符 | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC、`war`)、Struts 过滤器 (标签)、`<web-app version>`；Spring XML 的 `spring-*-3.0.xsd` → major.minor 版本，优先级最低 |
| eGovFrame | `egovframework.rte[.*]` 坐标 → `spring-framework`，并在 `detected` 中加上 `egovframe <version>` 标签 |

**提取到的事实 (在上面 Spring Boot 列表之外)：** 带 `frameworkVersion` 的 `framework: "spring-framework"`、`packaging` (`war` / `ear` / `jar` / `pom` — 仅在声明时)、`springFrameworkVersion` (显式固定了 Framework 版本的 Boot 项目也会填充)、源码根目录不是 `src/main/java` 时的 `sourceLayout: "legacy"`。

**版本策略。** 每一个版本字符串都是构建文件、jar 文件名，或同一项目内定义的变量/属性的子串。无法解析的 `${var}` 得到 `null` 而不是字面量；没有版本号的 Spring 2.0 时代 `spring.jar` 只报告框架，`frameworkVersion: null`。没有任何值取自框架默认。

**优先级。** 先是构建文件 (Gradle / Maven)，然后是 Node / Python 清单，最后才是上述遗留依据。遗留依据只能填补无人认领的语言，或者收回一个*临时的* Node 语言 (根 `package.json` 既没有检出框架也没有前端框架 — 属于资源工具链)，且必须有强依据：`build.xml`、带 javanature 的 `.project`、同级构建文件，或 `WEB-INF/web.xml`。Next.js / Django 项目不会因为一个游离的 `.idea/` 或 vendored jar 被翻成 Java；没有 `*.java` 源码的 jar 目录什么都不认领。

**误报防护。** 完全不用 Spring 的 JVM 项目 (`java-library`、`application`、仅有 servlet 的 `war`、单独的 Struts 1/2) 会被报告为 `framework: null` 的 Java。`com.android.application` 不是 JVM 的 `application` 插件。使用 Spring Framework 的 Kotlin 项目保持 `language: kotlin`。

**源码根目录。** `scan-java` 会按发现的根目录改写自己的 `src/main/java` / `src/main/resources` 模式。只要存在任意 `[<module>/]src/main/java`，就只用这些。否则依次是：`.classpath` 的 `kind="src"` 条目 (排除测试目录)、`build.xml` 的 `<javac srcdir>` (含 `<property>` 解析)，然后是含有 `*.java` 的 `src/java`、`src`、`JavaSource`、`java`、`WebContent/WEB-INF/src`。之后套用的仍是同样的五种 domain 模式，所以 `src/com/acme/erp/controller/*.java` 与它位于 `src/main/java` 之下时一样是 Pattern C。

**已知限制。** Gradle 文件不做注释剥离 (被 `//` 注释掉的坐标仍会计入 — 这一点对 Boot 向来如此)。不解析仓库之外父 pom 的继承。eGovFrame 的 `web/` 控制器层尚未被 Pattern A/B 识别为层名。

辅助函数在 `plan-installer/jvm-detect.js` (纯文本函数，有独立的单元测试)。

---

### Kotlin / Spring Boot

**何时检测:** 存在 `build.gradle.kts` 且与 Spring Boot 一起应用了 Kotlin 插件。代码路径与 Java 完全独立,不复用 Java 模式。

**专门检测:**
- **CQRS**:分离的 command/query 包
- **BFF**:backend-for-frontend 模式
- **Multi-module Gradle**:`settings.gradle.kts` 中含 `include(":module")`
- **跨模块共享 query 域**:`resolveSharedQueryDomains()` 用 package/类名分解,把共享 query 模块的文件重新分配

**支持的 ORM:** Exposed、jOOQ、JPA(Hibernate)、R2DBC。

**Kotlin 为什么单独有 scanner:** Java 模式不太适合 Kotlin 代码库。Kotlin 项目倾向于 CQRS 和多模块结构,Java 的 A 到 E 模式没法干净地表达。

scanner 在 `plan-installer/scanners/scan-kotlin.js`。

---

### Node / Express

**何时检测:** `package.json` 的 dependencies 中含 `express`。

**Stack detector 识别:** ORM(Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose)、DB 类型、package manager(npm / yarn / pnpm)、是否用 TypeScript。

**域发现:** 共享的 Node.js scanner(`plan-installer/scanners/scan-node.js`)遍历 `src/*/`(存在 NestJS 风格的 `src/modules/*/` 时优先用),计数匹配 `controller|router|route|handler`、`service`、`dto|schema|type` 与 entity/module/guard/pipe/interceptor 模式的文件。Express、Fastify、NestJS 共用同一段 scanner 代码,框架名只决定选哪个 Pass 1 prompt,而不是选哪个 scanner 跑。

---

### Node / Fastify

**何时检测:** dependencies 中含 `fastify`。

域发现走上面提到的同一个共享 `scan-node.js`。Pass 1 用 Fastify 专用 prompt 模板,让 Claude 找 Fastify 的 plugin 模式与路由 schema。

---

### Node / NestJS

**何时检测:** dependencies 中含 `@nestjs/core`。

域发现走共享的 `scan-node.js`。NestJS 标准的 `src/modules/<module>/` 布局会被自动检测(同时存在时优先于 `src/*/`),每个 module 是一个域。Pass 1 用 NestJS 专用 prompt 模板。

---

### Python / Django

**何时检测:** `requirements.txt` 或 `pyproject.toml` 中出现子串 `django`(小写)。标准包管理声明都是小写,典型项目都能匹配。

**域发现:** scanner 遍历 `**/models.py`,把每个含 `models.py` 的目录当作 Django app/域。它不解析 `settings.py` 里的 `INSTALLED_APPS`,信号就是磁盘上 `models.py` 是否存在。

**按域统计:** 计数匹配 `views`、`models`、`serializers`、`admin`、`forms`、`urls`、`tasks` 的文件。

---

### Python / FastAPI

**何时检测:** dependencies 中含 `fastapi`。

**域发现:** glob `**/{router,routes,endpoints}*.py`,每个唯一的父目录成为一个域。Scanner 不解析 `APIRouter(...)` 调用,信号就是文件名。

**Stack-detector 检测的 ORM:** SQLAlchemy、Tortoise ORM。

---

### Python / Flask

**何时检测:** dependencies 中含 `flask`。

**域发现:** 与 FastAPI 相同的 `**/{router,routes,endpoints}*.py` glob。该 glob 无结果时,scanner 退回 `{app,src/app}/*/` 目录。

**扁平项目 fallback(v1.7.1):** 找不到任何域候选时,scanner 在项目根找 `{main,app}.py`,把项目当作单域"app"。

---

## Frontend stacks(4)

### Node / Next.js

**何时检测:** 存在 `next.config.{ts,js}`,或 `package.json` 的 dependencies 中含 `next`。

**检测路由约定:**

- **App Router**(Next.js 13+):`app/` 目录配 `page.tsx`/`layout.tsx`
- **Pages Router**(legacy):`pages/` 目录
- **FSD(Feature-Sliced Design)**:`src/features/`、`src/widgets/`、`src/entities/`

**Scanner 提取:**
- 路由模式(App Router / Pages Router / FSD)
- RSC vs Client 组件计数(Next.js App Router:计数文件名含 `client.` 的文件如 `client.tsx`,而不是解析源代码里的 `"use client"` 指令)
- 来自 `app/` 或 `pages/`(以及 FSD 的 `src/features/` 等)的域列表

状态管理、样式、数据获取库不在 scanner 层面检测。Pass 1 prompt 改让 Claude 去源码里找这些模式。

---

### Node / Vite

**何时检测:** 存在 `vite.config.{ts,js}`,或 dependencies 中含 `vite`。

默认端口 `5173`(Vite 约定),作为 last-resort fallback 应用。Scanner 不解析 `vite.config` 里的 `server.port`;项目在 `.env*` 中声明了端口时,env-parser 会先拾取。

stack detector 只识别 Vite 本身;底层 UI 框架(若不是默认 fallback 的 React)由 LLM 在 Pass 1 里从源码识别,不靠 scanner。

---

### Angular

**何时检测:** 存在 `angular.json`,或 dependencies 中含 `@angular/core`。

**检测:**
- **Feature module** 结构:`src/app/<feature>/`
- **Monorepo workspaces**:通用的 `apps/*/src/app/*/` 与 `packages/*/src/app/*/` 模式(适用于 NX 布局,就算 `nx.json` 不是显式检测信号也行)

默认端口 `4200`(Angular 约定),作为 last-resort fallback 应用。Scanner 只为 stack 检测读 `angular.json`,不用于端口提取;项目在 `.env*` 中声明了端口时,env-parser 会先拾取。

---

### Vue / Nuxt

**何时检测:** Nuxt 时存在 `nuxt.config.{ts,js}`,或纯 Vue 时 dependencies 中含 `vue`。

scanner 识别框架并跑 frontend 域提取(App/Pages/FSD/components 模式)。Nuxt 版本与模块检测(Pinia、VueUse 等)交给 Pass 1:Claude 读源码识别在用什么,而不是 scanner 去 `package.json` 里做模式匹配。

---

## 多栈项目

同时含 backend 与 frontend 的项目(比如 `backend/` 里的 Spring Boot + `frontend/` 里的 Next.js)完全支持。

每个栈用 **自己的 scanner** 和 **自己的分析 prompt** 跑。合并后的 Pass 2 输出涵盖两个栈。Pass 3 为各栈生成独立的 rule 与 standard 文件,组织成:

```
.claude/rules/
├── 10.backend/                  ← Spring Boot rules
├── 20.frontend/                 ← Next.js rules
└── 70.domains/
    ├── backend/                 ← per-backend-domain
    └── frontend/                ← per-frontend-domain

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

`70.domains/{type}/` 类型化**始终启用**:即使项目是单栈,布局也用 `70.domains/backend/`(或 `frontend/`)。这样约定一致,单栈项目以后加第二个栈时不用迁移。

**多栈检测**会拾取:
- 项目根的 monorepo 清单:`turbo.json`、`pnpm-workspace.yaml`、`lerna.json`
- 含 `workspaces` 字段的根 `package.json`

检测到 monorepo 时,scanner 遍历 `apps/*/package.json` 与 `packages/*/package.json`(加上清单里的任何自定义 workspace glob),合并依赖列表,按需跑 backend 与 frontend scanner。

---

## Frontend platform-split 检测

有些前端项目按平台(PC、移动、admin)在顶层组织:

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

scanner 检测 `src/{platform}/{subapp}/`,把每个 `{platform}-{subapp}` 作为独立域产出。默认平台关键词:

- **设备 / 目标环境:** `desktop`、`pc`、`web`、`mobile`、`mc`、`mo`、`sp`、`tablet`、`tab`、`pwa`、`tv`、`ctv`、`ott`、`watch`、`wear`
- **访问层级 / 受众:** `admin`、`cms`、`backoffice`、`back-office`、`portal`

可以在 `.claudeos-scan.json` 的 `frontendScan.platformKeywords` 里加自定义关键词(见 [advanced-config.md](advanced-config.md))。

**Single-SPA skip 规则(v2.3.0):** 整个项目树里只匹配到一个平台关键词时(比如项目只有 `src/admin/api/`、`src/admin/dto/`、`src/admin/routers/`,没别的平台),subapp 产出会被跳过。否则架构层(`api`、`dto`、`routers`)会被错认成功能域产出。

要强制 subapp 产出,在 `.claudeos-scan.json` 里设 `frontendScan.forceSubappSplit: true`。见 [advanced-config.md](advanced-config.md)。

---

## `.env` 提取(v2.2.0+)

scanner 读 `.env*` 文件里的运行时配置,这样生成的文档能反映真实的端口、host、DB URL。

**检索顺序**(首个匹配胜出):

1. `.env.example`(canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**敏感变量脱敏:** 匹配 `PASSWORD`、`PASS`、`PW`、`PASSPHRASE`、`SECRET`、`TOKEN`、`API_KEY`、`CREDENTIAL`、`PRIVATE_KEY`、`JWT_SECRET`、`SSH_KEY`、`MASTER_KEY`、`SERVICE_ACCOUNT` 等的键,复制到 `project-analysis.json` 前会自动脱敏为 `***REDACTED***`。其他所有 URL 形态的值(`DATABASE_URL`、`REDIS_URL`、`MONGO_URI`、`jdbc:postgresql://…`)只把凭据脱敏为 `***:***`,scheme、host、port 和 path 原样保留(`postgres://***:***@db.internal:5432/app`)。DB 类型仍然可辨认,而密码永远不会写进文件。scanner 自己的 DB 类型检测直接读 `.env` 原文,不受影响。 自 v2.5.2 起,该规则无法改写其 userinfo 的值不再原样通过,而是被整体丢弃(`***REDACTED***`):密码中含有未编码的 `/`、`?`、`#` 或空格,或者密码以数字开头导致被截断的 authority 看起来像 `host:port`。host 也会随之丢失,`init` 会在 Phase 1 摘要中列出受影响的 key 名(`envInfo.credentialWarnings`,仅 key 名,涵盖根 `.env` 与子目录 SPA 自己的 `.env`)。`envInfo.host` / `envInfo.apiTarget` 会变成 `null`,而不是把 sentinel 带进 CLAUDE.md §3。请对密码做 percent-encoding(`/` 写作 `%2F`)以保留 host。

**端口解析优先级:**
1. Spring Boot `application.yml` 的 `server.port`
2. `.env` 端口键(检查 16+ 个约定键,按特异性排序:Vite 专用最先,通用 `PORT` 最后)
3. 栈默认值(FastAPI/Django=8000、Flask=5000、Vite=5173、Express/NestJS/Fastify=3000、默认=8080)

parser 在 `lib/env-parser.js`。测试在 `tests/env-parser.test.js`。

---

## Scanner 产出:`project-analysis.json`

Step A 完成后,这份文件会出现在 `claudeos-core/generated/project-analysis.json`。顶层 key(因栈而异):

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

可以直接读这份文件,看 scanner 到底从你的项目里提取了什么。

---

## 添加新栈

scanner 架构是模块化的。加新栈需要:

1. 一个 `plan-installer/scanners/scan-<stack>.js` 文件(域提取逻辑)。
2. 三个 Claude prompt 模板:`pass-prompts/templates/<stack>/` 下的 `pass1.md`、`pass2.md`、`pass3.md`。
3. 在 `plan-installer/stack-detector.js` 里加 stack 检测规则。
4. 在 `bin/commands/init.js` 的 dispatcher 里加路由。
5. 在 `tests/fixtures/<stack>/` 下加 fixture 项目对应的测试。

完整指南和可参考实现,见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

---

## 覆盖 scanner 行为

项目结构不常见,或者自动检测选错了栈时,在项目根放一个 `.claudeos-scan.json` 文件。

可用覆盖字段见 [advanced-config.md](advanced-config.md)。
