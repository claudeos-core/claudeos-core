# ClaudeOS-Core

**唯一一个先读取源代码、用确定性分析确认技术栈和模式、然后生成精确匹配项目的 Claude Code 规则的工具。**

```bash
npx claudeos-core init
```

ClaudeOS-Core 读取你的代码库，提取所发现的每一个模式，生成一套完全适配 _你的_ 项目的 Standards、Rules、Skills 和 Guides。之后当你告诉 Claude Code"创建一个订单 CRUD"时，它会生成完全符合你现有模式的代码。

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## 为什么选择 ClaudeOS-Core？

其他所有 Claude Code 工具都是这样工作的：

> **人类描述项目 → LLM 生成文档**

ClaudeOS-Core 是这样工作的：

> **代码分析你的源码 → 代码构建定制提示 → LLM 生成文档 → 代码验证输出**

这不是一个小差异。为什么这很重要：

### 核心问题：LLM 会猜测。代码不会。

当你要求 Claude"分析这个项目"时，它会**猜测**你的技术栈、ORM、领域结构。
它可能在 `build.gradle` 中看到 `spring-boot`，但错过你使用的是 MyBatis（不是 JPA）。
它可能检测到 `user/` 目录，但没意识到你的项目使用层优先打包（Pattern A），而不是领域优先（Pattern B）。

**ClaudeOS-Core 不猜测。** 在 Claude 看到你的项目之前，Node.js 代码已经：

- 解析了 `build.gradle` / `package.json` / `pyproject.toml` 并**确认**了你的技术栈、ORM、数据库和包管理器
- 扫描了你的目录结构并**确认**了带文件数的领域列表
- 将你的项目结构**分类**为 Java 5 种模式、Kotlin CQRS/BFF 或 Next.js App Router/FSD 之一
- 将领域**分割**为适合 Claude 上下文窗口的最优大小分组
- **组装**了一个注入了所有确认事实的技术栈专用提示

当 Claude 收到提示时，没有任何需要猜测的。技术栈已确认。领域已确认。结构模式已确认。Claude 的唯一工作是生成与这些**已确认的事实**相匹配的文档。

### 结果

其他工具生成"一般来说不错"的文档。
ClaudeOS-Core 生成的文档知道你的项目使用 `ApiResponse.ok()`（而不是 `ResponseEntity.success()`），知道你的 MyBatis XML 映射器位于 `src/main/resources/mybatis/mappers/`，知道你的包结构是 `com.company.module.{domain}.controller` — 因为它读取了你的实际代码。

### Before & After

**没有 ClaudeOS-Core** — 你请求 Claude Code 创建一个订单 CRUD：
```
❌ 使用 JPA 风格的 repository（你的项目使用 MyBatis）
❌ 创建 ResponseEntity.success()（你的包装器是 ApiResponse.ok()）
❌ 将文件放在 order/controller/（你的项目使用 controller/order/）
❌ 生成英文注释（你的团队写中文注释）
→ 你花 20 分钟修复每个生成的文件
```

**使用 ClaudeOS-Core** — `.claude/rules/` 已经包含了你确认的模式：
```
✅ 生成 MyBatis mapper + XML（从 build.gradle 检测）
✅ 使用 ApiResponse.ok()（从你的实际源码提取）
✅ 将文件放在 controller/order/（通过结构扫描确认 Pattern A）
✅ 中文注释（应用了 --lang zh-CN）
→ 生成的代码立即匹配你的项目约定
```

这种差异会累积。每天 10 个任务 × 节省 20 分钟 = **每天 3 小时以上**。

---

## 支持的技术栈

| 技术栈 | 检测方式 | 分析深度 |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`、`pom.xml`、5 种包模式 | 10 大类、59 小项 |
| **Kotlin / Spring Boot** | `build.gradle.kts`、kotlin 插件、`settings.gradle.kts`、CQRS/BFF 自动检测 | 12 大类、95 小项 |
| **Node.js / Express** | `package.json` | 9 大类、57 小项 |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 大类、68 小项 |
| **Next.js / React** | `package.json`、`next.config.*`、FSD 支持 | 9 大类、55 小项 |
| **Vue / Nuxt** | `package.json`、`nuxt.config.*`、Composition API | 9 大类、58 小项 |
| **Python / Django** | `requirements.txt`、`pyproject.toml` | 10 大类、55 小项 |
| **Python / FastAPI** | `requirements.txt`、`pyproject.toml` | 10 大类、58 小项 |
| **Node.js / Fastify** | `package.json` | 10 大类、62 小项 |
| **Vite / React SPA** | `package.json`、`vite.config.*` | 9 大类、55 小项 |
| **Angular** | `package.json`、`angular.json` | 12 大类、78 小项 |

自动检测：语言和版本、框架和版本（包括作为 SPA 框架的 Vite）、ORM（MyBatis、JPA、Exposed、Prisma、TypeORM、SQLAlchemy 等）、数据库（PostgreSQL、MySQL、Oracle、MongoDB、SQLite）、包管理器（Gradle、Maven、npm、yarn、pnpm、pip、poetry）、架构（CQRS、BFF — 从模块名检测）、多模块结构（从 settings.gradle 检测）、单体仓库（Turborepo、pnpm-workspace、Lerna、npm/yarn workspaces）、**`.env.example` 运行时配置**（v2.2.0 — 从 Vite、Next.js、Nuxt、Angular、Node、Python 框架的 16 个以上约定变量名中提取 port/host/API-target）。

**你不需要指定任何内容。一切都会自动检测。**

### `.env`-driven 运行时配置 (v2.2.0)

v2.2.0 新增 `lib/env-parser.js`，使生成的 `CLAUDE.md` 反映项目实际声明的内容，而非框架默认值。

- **搜索顺序**：`.env.example`（canonical、已提交）→ `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`。`.example` 变体优先，因为它是 developer-neutral 的 shape-of-truth，而非某个贡献者的本地覆盖。
- **识别的 port 变量约定**：`VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / 通用 `PORT`。当两者同时存在时，framework-specific 名称优先于通用的 `PORT`。
- **Host 与 API target**：`VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` 等。
- **优先级**：Spring Boot `application.yml` 的 `server.port` 仍然优先（framework-native config），然后是 `.env` 中声明的 port，最后才是 framework 默认值（Vite 5173、Next.js 3000、Django 8000 等）作为兜底。
- **敏感变量 redaction**：匹配 `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` 模式的变量值在进入任何下游生成器之前被替换为 `***REDACTED***`。对意外提交到 `.env.example` 的 secrets 的 defense-in-depth 保护。`DATABASE_URL` 因 stack-detector DB 识别 back-compat 而被显式白名单保留。

### Java 领域检测（5 种模式，带回退）

| 优先级 | 模式 | 结构 | 示例 |
|---|---|---|---|
| A | 层优先 | `controller/{domain}/` | `controller/user/UserController.java` |
| B | 领域优先 | `{domain}/controller/` | `user/controller/UserController.java` |
| D | 模块前缀 | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/六角形 | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | 扁平 | `controller/*.java` | `controller/UserController.java` → 从类名提取 `user` |

无 Controller 的纯 Service 领域也通过 `service/`、`dao/`、`aggregator/`、`facade/`、`usecase/`、`orchestrator/`、`mapper/`、`repository/` 目录进行检测。跳过：`common`、`config`、`util`、`core`、`front`、`admin`、`v1`、`v2` 等。

### Kotlin 多模块领域检测

适用于 Gradle 多模块结构的 Kotlin 项目（如 CQRS 单体仓库）：

| 步骤 | 操作 | 示例 |
|---|---|---|
| 1 | 扫描 `settings.gradle.kts` 的 `include()` | 发现 14 个模块 |
| 2 | 从模块名检测模块类型 | `reservation-command-server` → type: `command` |
| 3 | 从模块名提取领域 | `reservation-command-server` → domain: `reservation` |
| 4 | 跨模块对同一领域分组 | `reservation-command-server` + `common-query-server` → 1 个领域 |
| 5 | 检测架构 | 有 `command` + `query` 模块 → CQRS |

支持的模块类型：`command`、`query`、`bff`、`integration`、`standalone`、`library`。共享库（`shared-lib`、`integration-lib`）被识别为特殊领域。

### 前端领域检测

- **App Router**：`app/{domain}/page.tsx`（Next.js）
- **Pages Router**：`pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**：`features/*/`、`widgets/*/`、`entities/*/`
- **RSC/Client 分离**：检测 `client.tsx` 模式，跟踪 Server/Client 组件分离
- **非标准嵌套路径**：检测 `src/*/` 路径下的页面、组件和 FSD 层（例如 `src/admin/pages/dashboard/`、`src/admin/components/form/`、`src/admin/features/billing/`）
- **平台/层级分割检测 (v2.0.0)**：识别 `src/{platform}/{subapp}/` 布局 — `{platform}` 可以是设备/目标关键字（`desktop`、`pc`、`web`、`mobile`、`mc`、`mo`、`sp`、`tablet`、`tab`、`pwa`、`tv`、`ctv`、`ott`、`watch`、`wear`）或访问层关键字（`admin`、`cms`、`backoffice`、`back-office`、`portal`）。为每个 `(platform, subapp)` 对发出一个名为 `{platform}-{subapp}` 的领域，提供每个领域的 routes/components/layouts/hooks 计数。可在 Angular、Next.js、React 和 Vue 上同时运行（多扩展 glob `{tsx,jsx,ts,js,vue}`）。每个 subapp 需要 ≥2 个源文件以避免噪声 1-file 领域。
- **单体仓库平台分割 (v2.0.0)**：平台扫描也匹配 `{apps,packages}/*/src/{platform}/{subapp}/`（带 `src/` 的 Turborepo/pnpm workspace）和 `{apps,packages}/{platform}/{subapp}/`（无 `src/` 包装的 workspaces）。
- **Fallback E — routes 文件 (v2.0.0)**：当主扫描器 + Fallback A–D 都返回 0 时，glob `**/routes/*.{tsx,jsx,ts,js,vue}` 并按 `routes` 的父目录名分组。捕获不匹配 Next.js `page.tsx` 或 FSD 布局的 React Router 文件路由项目（CRA/Vite + `react-router`）。通用父名（`src`、`app`、`pages`）被过滤掉。
- **Config 回退**：当不在 `package.json` 时，从配置文件检测 Next.js/Vite/Nuxt（单体仓库支持）
- **深层目录回退**：对于 React/CRA/Vite/Vue/RN 项目，在任何深度扫描 `**/components/*/`、`**/views/*/`、`**/screens/*/`、`**/containers/*/`、`**/pages/*/`、`**/routes/*/`、`**/modules/*/`、`**/domains/*/`
- **共享忽略列表 (v2.0.0)**：所有扫描器共享 `BUILD_IGNORE_DIRS`（`node_modules`、`build`、`dist`、`out`、`.next`、`.nuxt`、`.svelte-kit`、`.angular`、`.turbo`、`.cache`、`.parcel-cache`、`coverage`、`storybook-static`、`.vercel`、`.netlify`）和 `TEST_FILE_IGNORE`（spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`），这样构建输出和测试夹具不会夸大按领域的文件计数。

### 扫描器覆盖 (v2.0.0)

在项目根目录放置可选的 `.claudeos-scan.json` 以扩展扫描器默认值，而无需编辑工具包。所有字段都是**加法的** — 用户条目扩展默认值，从不替换：

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| 字段 | 默认值 | 用途 |
|---|---|---|
| `platformKeywords` | 上述内置列表 | 平台扫描用的额外 `{platform}` 关键字（例如 `kiosk`、`vr`、`embedded`） |
| `skipSubappNames` | 仅结构目录 | 从平台扫描领域生成中排除的额外 subapp 名称 |
| `minSubappFiles` | `2` | 覆盖 subapp 成为领域所需的最小文件数 |

文件缺失或 JSON 格式错误 → 静默回退到默认值（不崩溃）。典型用途：opt-in 内置列表因过于模糊而排除的简写（`adm`、`bo`），或为嘈杂的单体仓库提高 `minSubappFiles`。

---

## 快速开始

### 前提条件

- **Node.js** v18+
- **Claude Code CLI**（已安装并认证）

### 安装

```bash
cd /your/project/root

# 选项 A：npx（推荐 — 无需安装）
npx claudeos-core init

# 选项 B：全局安装
npm install -g claudeos-core
claudeos-core init

# 选项 C：项目 devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# 选项 D：git clone（用于开发/贡献）
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# 跨平台（PowerShell、CMD、Bash、Zsh — 任何终端）
node claudeos-core-tools/bin/cli.js init

# Linux/macOS（仅 Bash）
bash claudeos-core-tools/bootstrap.sh
```

### 输出语言（10 种语言）

当你在运行 `init` 时不使用 `--lang`，会出现交互式选择器 — 使用箭头键或数字键进行选择：

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  生成的文件（CLAUDE.md、Standards、Rules、
  Skills、Guides）将以简体中文编写。

     1. en     — English
     2. ko     — 한국어 (Korean)
  ❯  3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

描述会随着你导航而切换到所选语言。要跳过选择器，直接传递 `--lang`：

```bash
npx claudeos-core init --lang ko    # Korean
npx claudeos-core init --lang ja    # Japanese
npx claudeos-core init --lang en    # English（默认）
```

> **注意：** 此设置仅更改生成文档文件的语言。代码分析（Pass 1–2）始终以英语运行；生成输出（Pass 3）以你选择的语言编写。生成文件中的代码示例保持其原始编程语言语法不变。

就这样。从 10 分钟（小型项目）到 2 小时（60+ 领域单体仓库）之后，所有文档都已生成并可以使用。CLI 显示带有百分比、经过时间和 ETA 的进度条，用于每个 Pass。关于按项目规模的详细耗时，请参阅[按项目规模自动扩展](#按项目规模自动扩展)。

### 手动分步安装

如果你希望完全控制每个阶段 — 或者自动化管道在任何步骤失败 — 你可以手动运行每个阶段。这也有助于理解 ClaudeOS-Core 的内部工作原理。

#### Step 1：克隆并安装依赖

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2：创建目录结构

```bash
# Rules（v2.0.0：添加了 60.memory）
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide、Database、MCP、Generated、Memory（v2.0.0：添加了 memory；v2.1.0：移除了 plan）
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **v2.1.0 注意：** `claudeos-core/plan/` 目录不再被创建。Master plan 生成已被移除，因为 master plan 是 Claude Code 在运行时从不读取的内部备份，而聚合它们会触发 `Prompt is too long` 失败。请使用 `git` 进行备份/恢复。

#### Step 3：运行 plan-installer（项目分析）

这会扫描你的项目、检测技术栈、查找领域、将其分成组，并生成提示。

```bash
node claudeos-core-tools/plan-installer/index.js
```

**输出（在 `claudeos-core/generated/` 中）：**
- `project-analysis.json` — 检测到的技术栈、领域、前端信息
- `domain-groups.json` — Pass 1 的领域分组
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — 分析提示
- `pass2-prompt.md` — 合并提示
- `pass3-prompt.md` — 在顶部前置了 Phase 1 "Read Once, Extract Facts" 块（Rules A–E）的 Pass 3 提示模板。自动化管道会在运行时将 Pass 3 拆分为多个阶段；该模板会喂给每个阶段。
- `pass3-context.json` — Pass 3 提示优先采用的精简项目摘要（< 5 KB，在 Pass 2 之后构建）而非完整的 `pass2-merged.json`（v2.1.0）
- `pass4-prompt.md` — L4 内存脚手架提示（v2.0.0；对 `60.memory/` 规则写入也使用相同的 `staging-override.md`）

你可以在继续之前检查这些文件以验证检测准确性。

#### Step 4：Pass 1 — 深度代码分析（按领域分组）

为每个领域分组运行 Pass 1。查看 `domain-groups.json` 了解分组数量。

```bash
# 查看有多少组
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# 为每组运行 Pass 1（替换领域和组号）
# 注意：v1.6.1+ 使用 Node.js String.replace() 而不是 perl — perl 不再
# 必需，replacement-function 语义可防止领域名中可能出现的
# $/&/$1 字符引起的 regex 注入。
#
# 对于 Group 1：
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# 对于 Group 2（如果存在）：
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# 对于前端组，将 pass1-backend-prompt.md → pass1-frontend-prompt.md 替换
```

**验证：** `ls claudeos-core/generated/pass1-*.json` 应该每组显示一个 JSON。

#### Step 5：Pass 2 — 合并分析结果

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**验证：** `claudeos-core/generated/pass2-merged.json` 应该存在，且有 9 个以上顶级键。

#### Step 6：Pass 3 — 生成所有文档（拆分为多个阶段）

**v2.1.0 注意：** Pass 3 在自动化管道中**始终以 split 模式运行**。每个阶段都是一个独立的 `claude -p` 调用，拥有全新的上下文窗口，因此无论项目规模如何，输出累积溢出在结构上都是不可能的。`pass3-prompt.md` 模板会在每个阶段组装时附带一个 `STAGE:` 指令，告诉 Claude 要输出哪一子集的文件。对于手动模式，最简单的路径仍然是喂入完整模板并让 Claude 在一次调用中生成所有内容 — 但这仅在小型项目（≤5 个领域）上可靠。对于更大的项目，请使用 `npx claudeos-core init` 让 split 运行器处理阶段编排。

**单次调用模式（仅小型项目，≤5 个领域）：**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**逐阶段模式（推荐用于所有项目规模）：**

自动化管道会运行以下这些阶段。阶段列表如下：

| 阶段 | 写入内容 | 备注 |
|---|---|---|
| `3a` | `pass3a-facts.md`（5–10 KB 蒸馏事实表） | 读取一次 `pass2-merged.json`；后续阶段引用此文件 |
| `3b-core` | `CLAUDE.md`、通用 `standard/`、通用 `.claude/rules/` | 跨项目的文件；无领域特定输出 |
| `3b-1..N` | 领域特定的 `standard/60.domains/*.md` + 领域规则 | 每阶段 ≤15 个领域的批次（≥16 领域时自动分割） |
| `3c-core` | `guide/`（9 个文件）、`skills/00.shared/MANIFEST.md`、`skills/*/` orchestrators | 共享 skills 和所有面向用户的指南 |
| `3c-1..N` | `skills/20.frontend-page/scaffold-page-feature/` 下的领域子 skills | 每阶段 ≤15 个领域的批次 |
| `3d-aux` | `database/`、`mcp-guide/` | 固定大小，与领域数量无关 |

对于 1–15 领域的项目，这会展开为 4 个阶段（`3a`、`3b-core`、`3c-core`、`3d-aux` — 无批次子分割）。对于 16–30 领域，它会展开为 8 个阶段（`3b` 和 `3c` 各自再分为 2 个批次）。完整表格请参阅[按项目规模自动扩展](#按项目规模自动扩展)。

**验证：** 你的项目根目录中应该存在 `CLAUDE.md`，并且应该写入 `claudeos-core/generated/pass3-complete.json` 标记。在 split 模式下，该标记包含 `mode: "split"` 以及一个列出每个已完成阶段的 `groupsCompleted` 数组 — 部分完成标记逻辑据此在崩溃后从正确的阶段恢复，而不是从 `3a` 重新开始（那会使 token 成本翻倍）。

> **暂存注意：** Pass 3 首先将规则文件写入 `claudeos-core/generated/.staged-rules/`，因为 Claude Code 的 sensitive-path 策略阻止直接写入 `.claude/`。自动化管道会在每个阶段后自动处理移动。如果你手动运行某个阶段，你需要自己移动暂存的树：`mv claudeos-core/generated/.staged-rules/* .claude/rules/`（保留子路径）。

#### Step 7：Pass 4 — 内存脚手架

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**验证：** `claudeos-core/memory/` 应该包含 4 个文件（`decision-log.md`、`failure-patterns.md`、`compaction.md`、`auto-rule-update.md`），`.claude/rules/60.memory/` 应该包含 4 个规则文件，并且 `CLAUDE.md` 应该附加了一个 `## Memory (L4)` 部分。标记：`claudeos-core/generated/pass4-memory.json`。

> **v2.1.0 gap-fill：** Pass 4 也会确保 `claudeos-core/skills/00.shared/MANIFEST.md` 存在。如果 Pass 3c 省略了它（在 skill-sparse 项目上可能发生，因为各 stack 的 `pass3.md` 模板将 `MANIFEST.md` 列为生成目标但未标记为 REQUIRED），gap-fill 会创建一个最小 stub，使 `.claude/rules/50.sync/02.skills-sync.md`（v2.2.0 路径 — sync 规则数量从 3 个减至 2 个，原 `03` 变为 `02`）始终有一个有效的引用目标。幂等：若文件已有真实内容（>20 字符）则跳过。

> **注意：** 如果 `claude -p` 失败或 `pass4-prompt.md` 缺失，自动化管道会回退到通过 `lib/memory-scaffold.js` 的静态脚手架（当 `--lang` 为非英语时，带有 Claude 驱动的翻译）。静态回退仅在 `npx claudeos-core init` 内部运行 — 手动模式要求 Pass 4 成功。

#### Step 8：运行验证工具

```bash
# 生成元数据（在其他检查之前必需）
node claudeos-core-tools/manifest-generator/index.js

# 运行所有检查
node claudeos-core-tools/health-checker/index.js

# 或运行单独的检查：
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk 一致性
node claudeos-core-tools/sync-checker/index.js          # 未注册/孤立文件
node claudeos-core-tools/content-validator/index.js     # 文件质量检查（包括 memory/ 部分 [9/9]）
node claudeos-core-tools/pass-json-validator/index.js   # Pass 1–4 JSON + 完成标记检查
```

#### Step 9：验证结果

```bash
# 统计生成的文件
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# 查看 CLAUDE.md
head -30 CLAUDE.md

# 查看一个 standard 文件
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# 查看规则
ls .claude/rules/*/
```

> **提示：** 如果任何步骤失败，你可以修复问题并仅重新运行该步骤。Pass 1/2 结果会被缓存 — 如果 `pass1-N.json` 或 `pass2-merged.json` 已存在，自动化管道会跳过它们。使用 `npx claudeos-core init --force` 删除之前的结果并从头开始。

### 开始使用

```
# 在 Claude Code 中 — 自然地提问：
"为 order 领域创建 CRUD"
"添加用户认证 API"
"重构这段代码以匹配项目模式"

# Claude Code 会自动引用你生成的 Standards、Rules 和 Skills。
```

---

## 工作原理 — 4-Pass 管道

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← 依赖（~10 秒）
    ├── [2] 目录结构                            ← 创建文件夹（~1 秒）
    ├── [3] plan-installer (Node.js)           ← 项目扫描（~5 秒）
    │       ├── 自动检测技术栈（多技术栈感知）
    │       ├── 提取领域列表（标记：backend/frontend）
    │       ├── 分成领域分组（按类型）
    │       ├── 构建 pass3-context.json（精简摘要，v2.1.0）
    │       └── 选择技术栈专用提示（按类型）
    │
    ├── [4] Pass 1 × N  (claude -p)            ← 深度代码分析（~2-8 分钟）
    │       ├── ⚙️ 后端分组 → 后端专用提示
    │       └── 🎨 前端分组 → 前端专用提示
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← 合并分析（~1 分钟）
    │       └── 将所有 Pass 1 结果合并到 pass2-merged.json
    │
    ├── [6] Pass 3 (split 模式, v2.1.0)        ← 生成一切
    │       │
    │       ├── 3a     × 1  (claude -p)        ← 事实提取（~5-10 分钟）
    │       │       └── 读取 pass2-merged.json 一次 → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + 通用 standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← 领域 standards/rules（每批 ≤15 个领域）
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + 共享 skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← 领域子 skills（每批 ≤15 个领域）
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← database/ + mcp-guide/ 存根
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← 内存脚手架（~30 秒-5 分钟）
    │       ├── 种子 memory/（decision-log、failure-patterns、…）
    │       ├── 生成 60.memory/ 规则
    │       ├── 将 "Memory (L4)" 部分附加到 CLAUDE.md
    │       └── Gap-fill：确保 skills/00.shared/MANIFEST.md 存在（v2.1.0）
    │
    └── [8] 验证                               ← 自动运行 health checker
```

### 为什么是 4 个 Pass？

**Pass 1** 是唯一读取你的源代码的 pass。它为每个领域选择代表性文件，并跨 55–95 个分析类别（每个技术栈）提取模式。对于大型项目，Pass 1 会多次运行 — 每个领域分组一次。在多技术栈项目中（例如 Java backend + React frontend），backend 和 frontend 领域使用**针对每个技术栈定制的不同分析提示**。

**Pass 2** 将所有 Pass 1 结果合并成统一的分析：共同模式（100% 共享）、多数模式（50%+ 共享）、领域特定模式、按严重性的反模式和横切关注点（命名、安全、DB、测试、日志记录、性能）。Backend 和 frontend 结果一起合并。

**Pass 3**（split 模式，v2.1.0）接受合并后的分析，并跨多个顺序的 `claude -p` 调用生成整个文件生态系统（CLAUDE.md、rules、standards、skills、guides）。关键的洞察在于输出累积溢出无法从输入规模预测：单次调用的 Pass 3 在 2 领域项目上运行正常，在约 5 领域时可靠失败，而失败边界会根据每个文件碰巧多么冗长而移动。Split 模式完全绕开了这个问题 — 每个阶段以全新的上下文窗口开始，并写入有限的文件子集。跨阶段一致性（这是单次调用方法的主要优势）通过 `pass3a-facts.md` 得以保留，它是一个 5–10 KB 的蒸馏事实表，之后的每个阶段都会引用它。

Pass 3 提示模板还包括一个 **Phase 1 "Read Once, Extract Facts" 块**，其中有五条进一步约束输出量的规则：

- **Rule A** — 引用事实表；不要重新读取 `pass2-merged.json`。
- **Rule B** — 幂等文件写入（如果目标存在且有真实内容则跳过），使 Pass 3 在中断后可安全地重新运行。
- **Rule C** — 通过事实表作为单一可信源强制跨文件一致性。
- **Rule D** — 输出简洁：文件写入之间仅一行（`[WRITE]`/`[SKIP]`），不复述事实表，不回显文件内容。
- **Rule E** — 批量幂等检查：在 PHASE 2 开始时进行一次 `Glob`，而不是每个目标调用 `Read`。

在 **v2.2.0** 中，Pass 3 会将一个确定性的 CLAUDE.md scaffold（`pass-prompts/templates/common/claude-md-scaffold.md`）内联到提示中。这固定了 8 个顶层章节的标题和顺序，使生成的 `CLAUDE.md` 不会在项目之间漂移，同时仍允许每个章节的内容适应各个项目。stack-detector 的新 `.env` 解析器（`lib/env-parser.js`）向提示供应 `stack.envInfo`，使 port/host/API target 行匹配项目实际声明的值，而不是 framework 默认值。

**Pass 4** 搭建 L4 内存层：持久化的团队知识文件（decision-log、failure-patterns、compaction 策略、auto-rule-update）加上告诉未来会话何时以及如何读/写这些文件的 `60.memory/` 规则。内存层是 Claude Code 能够跨会话积累教训而不是每次重新发现的原因。当 `--lang` 是非英语时，回退的静态内容在被写入之前会通过 Claude 翻译。v2.1.0 为 `skills/00.shared/MANIFEST.md` 添加了一个 gap-fill，以防 Pass 3c 省略它。

---

## 生成的文件结构

```
your-project/
│
├── CLAUDE.md                          ← Claude Code 入口点（8 部分确定性结构，v2.2.0）
│
├── .claude/
│   └── rules/                         ← Glob 触发规则
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← 同步提醒规则
│       └── 60.memory/                 ← L4 内存按需作用域规则（v2.0.0）
│
├── claudeos-core/                     ← 主输出目录
│   ├── generated/                     ← 分析 JSON + 动态提示 + Pass 标记（gitignore 这个）
│   │   ├── project-analysis.json      ← 技术栈信息（多技术栈感知）
│   │   ├── domain-groups.json         ← 带 type: backend/frontend 的分组
│   │   ├── pass1-backend-prompt.md    ← 后端分析提示
│   │   ├── pass1-frontend-prompt.md   ← 前端分析提示（如果检测到）
│   │   ├── pass2-prompt.md            ← 合并提示
│   │   ├── pass2-merged.json          ← Pass 2 输出（仅由 Pass 3a 消费）
│   │   ├── pass3-context.json         ← Pass 3 的精简摘要（< 5 KB，v2.1.0）
│   │   ├── pass3-prompt.md            ← Pass 3 提示模板（Phase 1 块前置）
│   │   ├── pass3a-facts.md            ← 由 Pass 3a 写入、被 3b/3c/3d 读取的事实表（v2.1.0）
│   │   ├── pass4-prompt.md            ← 内存脚手架提示（v2.0.0）
│   │   ├── pass3-complete.json        ← Pass 3 完成标记（split 模式：包含 groupsCompleted，v2.1.0）
│   │   ├── pass4-memory.json          ← Pass 4 完成标记（恢复时跳过）
│   │   ├── rule-manifest.json         ← 供验证工具使用的文件索引
│   │   ├── sync-map.json              ← Plan ↔ disk 映射（v2.1.0 中为空；为 sync-checker 兼容保留）
│   │   ├── stale-report.json          ← 合并的验证结果
│   │   ├── .i18n-cache-<lang>.json    ← 翻译缓存（非英语 `--lang`）
│   │   └── .staged-rules/             ← `.claude/rules/` 写入的临时暂存目录（自动移动 + 清理）
│   ├── standard/                      ← 编码标准（15-19 个文件 + 60.domains/ 下的每个领域文件）
│   │   ├── 00.core/                   ← 概述、架构、命名
│   │   ├── 10.backend-api/            ← API 模式（技术栈专用）
│   │   ├── 20.frontend-ui/            ← 前端模式（如果检测到）
│   │   ├── 30.security-db/            ← 安全、DB schema、工具
│   │   ├── 40.infra/                  ← 配置、日志、CI/CD
│   │   ├── 50.verification/           ← 构建验证、测试
│   │   ├── 60.domains/                ← 每个领域的 standards（由 Pass 3b-N 写入，v2.1.0）
│   │   └── 90.optional/               ← 可选约定（技术栈专用附加）
│   ├── skills/                        ← CRUD/page 脚手架技能
│   │   └── 00.shared/MANIFEST.md      ← 已注册 skills 的单一可信源
│   ├── guide/                         ← 入门、FAQ、故障排除（9 个文件）
│   ├── database/                      ← DB schema、迁移指南
│   ├── mcp-guide/                     ← MCP 服务器集成指南
│   └── memory/                        ← L4：团队知识（4 个文件）— 提交这些
│       ├── decision-log.md            ← 设计决策背后的"为什么"
│       ├── failure-patterns.md        ← 重现错误 & 修复（自动评分 — `npx claudeos-core memory score`）
│       ├── compaction.md              ← 4 阶段压缩策略（运行 `npx claudeos-core memory compact`）
│       └── auto-rule-update.md        ← 规则改进提议（`npx claudeos-core memory propose-rules`）
│
└── claudeos-core-tools/               ← 此工具包（不要修改）
```

每个 standard 文件都包含 ✅ 正确示例、❌ 错误示例和规则摘要表 — 全部来自你的实际代码模式，而不是通用模板。

> **v2.1.0 注意：** `claudeos-core/plan/` 不再生成。Master plan 是 Claude Code 在运行时不消费的内部备份，而在 Pass 3 中聚合它们是输出累积溢出的主要原因。请使用 `git` 进行备份/恢复。从 v2.0.x 升级的项目可以安全地删除任何现存的 `claudeos-core/plan/` 目录。

### Gitignore 建议

**提交**（团队知识 — 旨在共享）：
- `CLAUDE.md` — Claude Code 入口点
- `.claude/rules/**` — 自动加载的规则
- `claudeos-core/standard/**`、`skills/**`、`guide/**`、`database/**`、`mcp-guide/**`、`plan/**` — 生成的文档
- `claudeos-core/memory/**` — 决策历史、失败模式、规则提议

**不要提交**（可重新生成的构建产物）：

```gitignore
# ClaudeOS-Core — 生成的分析 & 翻译缓存
claudeos-core/generated/
```

`generated/` 目录包含分析 JSON（`pass1-*.json`、`pass2-merged.json`）、提示（`pass1/2/3/4-prompt.md`）、Pass 完成标记（`pass3-complete.json`、`pass4-memory.json`）、翻译缓存（`.i18n-cache-<lang>.json`）和临时暂存目录（`.staged-rules/`）— 全部可以通过重新运行 `npx claudeos-core init` 重建。

---

## 按项目规模自动扩展

Pass 3 的 split 模式会随领域数扩展阶段数。批次子分割在 16 个领域时启动，使每个阶段的输出保持在 ~50 个文件以下，这是在输出累积溢出开始之前 `claude -p` 的经验安全范围。

| 项目规模 | 领域 | Pass 3 阶段 | 总 `claude -p` | 预计时间 |
|---|---|---|---|---|
| 小型 | 1–4 | 4（`3a`、`3b-core`、`3c-core`、`3d-aux`） | 7（Pass 1 + 2 + 4 个 Pass 3 阶段 + Pass 4） | ~10–15 分钟 |
| 中型 | 5–15 | 4 | 8–9 | ~25–45 分钟 |
| 大型 | 16–30 | **8**（3b、3c 各分为 2 个批次） | 11–12 | **~60–105 分钟** |
| 超大型 | 31–45 | 10 | 13–14 | ~100–150 分钟 |
| 超超大型 | 46–60 | 12 | 15–16 | ~150–200 分钟 |
| 超超超大型 | 61+ | 14+ | 17+ | 200 分钟+ |

阶段数公式（分批时）：`1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`，其中 `N = ceil(totalDomains / 15)`。

Pass 4（内存脚手架）根据运行 Claude 驱动的生成还是静态回退，额外增加 ~30 秒到 5 分钟。对于多技术栈项目（例如 Java + React），backend 和 frontend 领域一起计数。6 个 backend + 4 个 frontend 领域的项目 = 总共 10 个 = 中型层级。

---

## 验证工具

ClaudeOS-Core 包含 5 个内置验证工具，它们在生成后自动运行：

```bash
# 一次运行所有检查（推荐）
npx claudeos-core health

# 单独命令
npx claudeos-core validate     # Plan ↔ disk 比较
npx claudeos-core refresh      # Disk → Plan 同步
npx claudeos-core restore      # Plan → Disk 恢复

# 或直接使用 node（git clone 用户）
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| 工具 | 作用 |
|---|---|
| **manifest-generator** | 构建元数据 JSON（`rule-manifest.json`、`sync-map.json`，初始化 `stale-report.json`）；索引包括 `memory/` 在内的 7 个目录（摘要中的 `totalMemory`）。v2.1.0：由于 master plans 已被移除，`plan-manifest.json` 不再生成。 |
| **plan-validator** | 为仍保有 `claudeos-core/plan/` 的项目（旧版升级情形）验证 master plan 的 `<file>` 块与 disk 一致。v2.1.0：当 `plan/` 缺失或为空时跳过 `plan-sync-status.json` 的生成 — `stale-report.json` 仍然会记录一条通过的 no-op。 |
| **sync-checker** | 检测未注册的文件（在 disk 上但不在 plan 中）和孤立条目 — 覆盖 7 个目录（v2.0.0 中添加了 `memory/`）。当 `sync-map.json` 没有映射时干净退出（v2.1.0 默认状态）。 |
| **content-validator** | 9 部分质量检查 — 空文件、缺失的 ✅/❌ 示例、必需部分，加上 L4 内存脚手架完整性（decision-log 标题日期、failure-pattern 必需字段、fence-aware 解析） |
| **pass-json-validator** | 验证 Pass 1–4 JSON 结构以及 `pass3-complete.json`（split-mode 形状，v2.1.0）和 `pass4-memory.json` 完成标记 |

---

## Claude Code 如何使用你的文档

ClaudeOS-Core 生成 Claude Code 实际读取的文档 — 以下是它的工作方式：

### Claude Code 自动读取的内容

| 文件 | 时机 | 保证 |
|---|---|---|
| `CLAUDE.md` | 每次会话开始时 | 始终 |
| `.claude/rules/00.core/*` | 编辑任何文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/10.backend/*` | 编辑任何文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/20.frontend/*` | 编辑任何前端文件时（限定在 component/page/style 路径） | 条件性 |
| `.claude/rules/30.security-db/*` | 编辑任何文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/40.infra/*` | 仅编辑 config/infra 文件时（限定路径） | 条件性 |
| `.claude/rules/50.sync/*` | 仅编辑 claudeos-core 文件时（限定路径） | 条件性 |
| `.claude/rules/60.memory/*` | 编辑 `claudeos-core/memory/*` 时（限定到 memory 路径）— 指示**如何**读/写按需内存层 | 条件性（v2.0.0） |

### Claude Code 通过规则引用按需读取的内容

每个规则文件通过 `## Reference` 部分链接到其对应的 standard。Claude 只读取与当前任务相关的 standard：

- `claudeos-core/standard/**` — 编码模式、✅/❌ 示例、命名约定
- `claudeos-core/database/**` — DB schema（用于查询、映射器、迁移）
- `claudeos-core/memory/**`（v2.0.0）— L4 团队知识层；**不**自动加载（在每次会话中都会太嘈杂）。相反，`60.memory/*` 规则告诉 Claude *何时* 读取这些文件：在会话开始时（浏览最近的 `decision-log.md` + 高重要性的 `failure-patterns.md`），以及在做出决策或遇到重现错误时按需追加。

`00.standard-reference.md` 充当所有 standard 文件的目录，用于发现没有对应规则的 standards。

### Claude Code 不读取的内容（节省上下文）

这些文件夹通过 standard-reference 规则中的 `DO NOT Read` 部分明确排除：

| 文件夹 | 排除原因 |
|---|---|
| `claudeos-core/plan/` | 旧版项目（v2.0.x 及更早）的 Master Plan 备份。v2.1.0 不再生成。如果存在，Claude Code 不会自动加载 — 仅按需读取。 |
| `claudeos-core/generated/` | 构建元数据 JSON、提示、Pass 标记、翻译缓存、`.staged-rules/`。不用于编码。 |
| `claudeos-core/guide/` | 面向人类的入门指南。 |
| `claudeos-core/mcp-guide/` | MCP 服务器文档。不用于编码。 |
| `claudeos-core/memory/`（自动加载） | **设计上禁用自动加载** — 会在每次会话中膨胀上下文。改为通过 `60.memory/*` 规则按需读取（例如 `failure-patterns.md` 的会话开始扫描）。始终提交这些文件。 |

---

## 日常工作流

### 安装后

```
# 像往常一样使用 Claude Code — 它会自动引用你的标准：
"为 order 领域创建 CRUD"
"添加用户资料更新 API"
"重构这段代码以匹配项目模式"
```

### 手动编辑标准后

```bash
# 编辑 standards 或 rules 文件后：
npx claudeos-core refresh

# 验证一切都是一致的
npx claudeos-core health
```

### 当文档损坏时

```bash
# v2.1.0 推荐：使用 git 恢复（因为 master plans 不再生成）。
# 定期提交你生成的文档，这样你可以回滚特定文件而无需重新生成：
git checkout HEAD -- .claude/rules/ claudeos-core/

# 旧版（仍保留 claudeos-core/plan/ 的 v2.0.x 项目）：
npx claudeos-core restore
```

### 内存层维护（v2.0.0）

L4 内存层（`claudeos-core/memory/`）跨会话积累团队知识。3 个 CLI 子命令保持其健康：

```bash
# Compact：执行 4 阶段压缩策略（定期 — 例如每月）
npx claudeos-core memory compact
#   Stage 1：总结过期条目（>30 天，正文 → 一行）
#   Stage 2：合并重复标题（frequency 求和，保留最新 fix）
#   Stage 3：丢弃低重要性 + 过期（importance <3 AND lastSeen >60 天）
#   Stage 4：强制每个文件 400 行上限（最古老的低重要性首先丢弃）

# Score：按重要性重新排名 failure-patterns.md 条目
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5)，最大 10
#   在追加几个新的失败模式后运行

# Propose-rules：从重现的失败中提出候选规则添加
npx claudeos-core memory propose-rules
#   读取 frequency ≥ 3 的 failure-patterns.md 条目
#   计算 confidence（加权证据的 sigmoid × 锚点乘数）
#   将提议写入 memory/auto-rule-update.md（不自动应用）
#   Confidence ≥ 0.70 值得认真审查；接受 → 编辑规则 + 记录决策

# v2.1.0：`memory --help` 现在路由到子命令帮助（之前显示顶层）
npx claudeos-core memory --help
```

> **v2.1.0 修复：** `memory score` 在第一次运行后不再留下重复的 `importance` 行（之前会将自动评分的行加到上面，而把原始的普通行留在下面）。`memory compact` 的 Stage 1 summary 标记现在是正确的 markdown 列表项（`- _Summarized on ..._`），因此能够干净地渲染，并在后续压缩中被正确地重新解析。

何时写入内存（Claude 按需执行此操作，但你也可以手动编辑）：
- **`decision-log.md`** — 每当你在竞争模式之间选择、选择库、定义团队约定或决定*不*做某事时追加新条目。仅追加；从不编辑历史条目。
- **`failure-patterns.md`** — 在重现错误或不明显根本原因的**第二次出现**时追加。首次错误不需要条目。
- `compaction.md` 和 `auto-rule-update.md` — 由上面的 CLI 子命令生成/管理；不要手动编辑。

### CI/CD 集成

```yaml
# GitHub Actions 示例
- run: npx claudeos-core validate
# Exit code 1 阻止 PR

# 可选：每月内存维护（单独的 cron workflow）
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## 这有什么不同？

### 与其他 Claude Code 工具对比

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **方法** | 代码先分析，然后 LLM 生成 | 预构建配置预设 | LLM 设计 agent 团队 | LLM 生成规范文档 | LLM 编写 CLAUDE.md |
| **读取你的源代码** | ✅ 确定性静态分析 | ❌ | ❌ | ❌（LLM 读取） | ❌（LLM 读取） |
| **技术栈检测** | 代码确认（ORM、DB、构建工具、pkg manager） | N/A（技术栈无关） | LLM 猜测 | LLM 猜测 | LLM 猜测 |
| **领域检测** | 代码确认（Java 5 模式、Kotlin CQRS、Next.js FSD） | N/A | LLM 猜测 | N/A | N/A |
| **相同项目 → 相同结果** | ✅ 确定性分析 | ✅（静态文件） | ❌（LLM 变化） | ❌（LLM 变化） | ❌（LLM 变化） |
| **大型项目处理** | 领域分组切分（每组 4 个领域 / 40 个文件） | N/A | 无切分 | 无切分 | 上下文窗口限制 |
| **输出** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans（40-50+ 文件） | Agents + Skills + Commands + Hooks | Agents + Skills | 6 个规范文档 | CLAUDE.md（1 个文件） |
| **输出位置** | `.claude/rules/`（由 Claude Code 自动加载） | `.claude/` 各种 | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **生成后验证** | ✅ 5 个自动验证器 | ❌ | ❌ | ❌ | ❌ |
| **多语言输出** | ✅ 10 种语言 | ❌ | ❌ | ❌ | ❌ |
| **多技术栈** | ✅ Backend + Frontend 同时 | ❌ 技术栈无关 | ❌ | ❌ | 部分 |
| **持久内存层** | ✅ L4 — 决策日志 + 失败模式 + 自动评分规则提议（v2.0.0） | ❌ | ❌ | ❌ | ❌ |
| **Agent 编排** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### 一句话的关键区别

**其他工具给 Claude "一般来说不错的指令"。ClaudeOS-Core 给 Claude "从你的实际代码中提取的指令"。**

这就是为什么 Claude Code 在你的 MyBatis 项目中停止生成 JPA 代码，
当你的代码库使用 `ok()` 时停止使用 `success()`，
当你的项目使用 `controller/user/` 时停止创建 `user/controller/` 目录。

### 互补，而非竞争

ClaudeOS-Core 专注于**项目特定规则和标准**。
其他工具专注于**agent 编排和工作流**。

你可以使用 ClaudeOS-Core 生成项目规则，然后在其之上使用 ECC 或 Harness 进行 agent 团队和工作流自动化。它们解决不同的问题。

---

## FAQ

**Q：它会修改我的源代码吗？**
不会。它只创建 `CLAUDE.md`、`.claude/rules/` 和 `claudeos-core/`。你现有的代码永远不会被修改。

**Q：花费多少？**
它跨 4 个 pass 多次调用 `claude -p`。在 v2.1.0 split 模式中，仅 Pass 3 就根据项目规模展开为 4–14+ 个阶段（参见[按项目规模自动扩展](#按项目规模自动扩展)）。一个典型的小型项目（1–15 领域）总共使用 8–9 次 `claude -p` 调用；18 领域项目使用 11 次；60 领域项目使用 15–17 次。每个阶段都以全新的上下文窗口运行 — 每次调用的 token 成本实际上比过去的单次调用 Pass 3 还低，因为没有任何阶段需要将整个文件树保存在一个上下文中。当 `--lang` 是非英语时，静态回退路径可能会调用几个额外的 `claude -p` 进行翻译；结果会缓存在 `claudeos-core/generated/.i18n-cache-<lang>.json` 中，以便后续运行重用。这在 Claude Code 的正常使用范围内。

**Q：什么是 Pass 3 split 模式，为什么在 v2.1.0 中添加？**
在 v2.1.0 之前，Pass 3 进行一次 `claude -p` 调用，必须在一次响应中输出整个生成文件树（`CLAUDE.md`、standards、rules、skills、guides — 通常 30–60 个文件）。这在小型项目上有效，但在约 5 个领域时就会可靠地触发 `Prompt is too long` 输出累积失败。失败无法从输入规模预测 — 它取决于每个生成文件碰巧多么冗长，并且可能间歇性地击中同一个项目。Split 模式在结构上绕开了这个问题：Pass 3 被拆分为顺序阶段（`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`），每个都是具有全新上下文窗口的独立 `claude -p` 调用。跨阶段一致性通过 `pass3a-facts.md` 保留，这是一个 5–10 KB 的蒸馏事实表，之后每个阶段都引用它而不是重新读取 `pass2-merged.json`。`pass3-complete.json` 标记携带一个 `groupsCompleted` 数组，因此 `3c-2` 期间的崩溃会从 `3c-2` 恢复（而不是从 `3a`），避免 token 成本翻倍。
**Q：我应该将生成的文件提交到 Git 吗？**
是的，推荐。你的团队可以共享相同的 Claude Code 标准。考虑将 `claudeos-core/generated/` 添加到 `.gitignore`（分析 JSON 可以重新生成）。

**Q：混合技术栈项目（例如 Java backend + React frontend）怎么办？**
完全支持。ClaudeOS-Core 自动检测两个技术栈，将领域标记为 `backend` 或 `frontend`，并为每个使用特定技术栈的分析提示。Pass 2 合并一切，Pass 3 跨其 split 阶段生成 backend 和 frontend 标准 — backend 领域进入某些 3b/3c 批次，frontend 领域进入其他批次，全都引用同一份 `pass3a-facts.md` 以保证一致性。

**Q：它适用于 Turborepo / pnpm workspaces / Lerna 单体仓库吗？**
是的。ClaudeOS-Core 检测 `turbo.json`、`pnpm-workspace.yaml`、`lerna.json` 或 `package.json#workspaces`，并自动扫描子包 `package.json` 文件以查找 framework/ORM/DB 依赖项。领域扫描覆盖 `apps/*/src/` 和 `packages/*/src/` 模式。从单体仓库根目录运行。

**Q：重新运行时会发生什么？**
如果存在之前的 Pass 1/2 结果，会出现一个交互式提示让你选择：**Continue**（从停止的地方恢复）或 **Fresh**（删除所有并重新开始）。使用 `--force` 跳过提示并始终重新开始。在 v2.1.0 split 模式中，Pass 3 恢复以阶段粒度工作 — 如果运行在 `3c-2` 期间崩溃，下一次 `init` 将从 `3c-2` 恢复，而不是从 `3a` 重新开始（那会使 token 成本翻倍）。`pass3-complete.json` 标记记录 `mode: "split"` 加上一个 `groupsCompleted` 数组来驱动这一逻辑。

**Q：NestJS 是使用自己的模板还是 Express 的？**
NestJS 使用专用的 `node-nestjs` 模板，具有 NestJS 特定的分析类别：`@Module`、`@Injectable`、`@Controller` decorators、Guards、Pipes、Interceptors、DI 容器、CQRS 模式和 `Test.createTestingModule`。Express 项目使用单独的 `node-express` 模板。

**Q：Vue / Nuxt 项目怎么办？**
Vue/Nuxt 使用专用的 `vue-nuxt` 模板，涵盖 Composition API、`<script setup>`、defineProps/defineEmits、Pinia stores、`useFetch`/`useAsyncData`、Nitro 服务器路由和 `@nuxt/test-utils`。Next.js/React 项目使用 `node-nextjs` 模板。

**Q：它支持 Kotlin 吗？**
是的。ClaudeOS-Core 从 `build.gradle.kts` 或 `build.gradle` 中的 kotlin 插件自动检测 Kotlin。它使用专用的 `kotlin-spring` 模板，具有 Kotlin 特定的分析（data classes、sealed classes、coroutines、extension functions、MockK 等）。

**Q：CQRS / BFF 架构怎么办？**
对于 Kotlin 多模块项目完全支持。ClaudeOS-Core 读取 `settings.gradle.kts`，从模块名检测模块类型（command、query、bff、integration），并跨 Command/Query 模块对同一领域进行分组。生成的标准包括 command controllers 与 query controllers 的单独规则、BFF/Feign 模式和模块间通信约定。

**Q：Gradle 多模块单体仓库怎么办？**
ClaudeOS-Core 扫描所有子模块（`**/src/main/kotlin/**/*.kt`），不论嵌套深度。模块类型从命名约定推断（例如 `reservation-command-server` → domain: `reservation`，type: `command`）。也检测共享库（`shared-lib`、`integration-lib`）。

**Q：L4 内存层（v2.0.0）是什么？我应该提交 `claudeos-core/memory/` 吗？**
是的 — **始终提交** `claudeos-core/memory/`。它是持久化的团队知识：`decision-log.md` 记录架构选择背后的*为什么*（仅追加），`failure-patterns.md` 注册重现错误及其重要性分数，以便未来会话避免它们，`compaction.md` 定义 4 阶段压缩策略，`auto-rule-update.md` 收集机器生成的规则改进提议。与规则（按路径自动加载）不同，内存文件是**按需的** — Claude 只在 `60.memory/*` 规则指示它时读取它们（例如会话开始时扫描高重要性故障）。这样可以保持上下文成本低，同时保留长期知识。

**Q：如果 Pass 4 失败怎么办？**
自动化管道（`npx claudeos-core init`）有静态回退：如果 `claude -p` 失败或 `pass4-prompt.md` 缺失，它通过 `lib/memory-scaffold.js` 直接搭建内存层。当 `--lang` 是非英语时，静态回退**必须**通过 `claude` CLI 翻译 — 如果那也失败，运行以 `InitError` 中止（没有静默的英语回退）。在 `claude` 已认证时重新运行，或使用 `--lang en` 跳过翻译。翻译结果缓存在 `claudeos-core/generated/.i18n-cache-<lang>.json` 中，以便后续运行重用它们。

**Q：`memory compact` / `memory score` / `memory propose-rules` 做什么？**
请参阅上面的[内存层维护](#内存层维护v200)部分。简短版本：`compact` 运行 4 阶段策略（总结过期、合并重复、丢弃低重要性过期、强制 400 行上限）；`score` 按重要性（frequency × recency）重新排名 `failure-patterns.md`；`propose-rules` 从重现的失败中将候选规则添加表面化到 `auto-rule-update.md`（不自动应用 — 手动审查和接受/拒绝）。

**Q：为什么 `--force`（或 "fresh" 恢复模式）删除 `.claude/rules/`？**
v2.0.0 添加了三个 Pass 3 silent-failure 守卫（Guard 3 覆盖两个不完整输出变体：H2 用于 `guide/`，H1 用于 `standard/skills`）。Guard 1（"部分 staged-rules 移动"）和 Guard 3（"不完整输出 — 缺失/空的 guide 文件或缺失的 standard 哨兵 / 空的 skills"）不依赖现有规则，但 Guard 2（"检测到零规则"）依赖 — 当 Claude 忽略 `staging-override.md` 指令并试图直接写入 `.claude/` 时（Claude Code 的 sensitive-path 策略阻止的地方）会触发。先前运行的陈旧规则会让 Guard 2 假阴性 — 所以 `--force`/`fresh` 清除 `.claude/rules/` 以确保干净的检测。**在 `--force`/`fresh` 下，对规则文件的手动编辑将丢失**；如有需要，请先备份。（v2.1.0 注意：由于 master plans 不再生成，Guard 3 H1 不再检查 `plan/`。）

**Q：`claudeos-core/generated/.staged-rules/` 是什么，为什么存在？**
Claude Code 的 sensitive-path 策略拒绝从 `claude -p` 子进程直接写入 `.claude/`（即使带 `--dangerously-skip-permissions`）。v2.0.0 通过让 Pass 3/4 提示将所有 `.claude/rules/` 写入重定向到暂存目录来绕过这一点；然后 Node.js 编排器（不受该策略约束）在每次 pass 后将暂存树移动到 `.claude/rules/`。这对用户是透明的 — 目录自动创建、自动清理、自动移动。如果先前的运行在移动中途崩溃，下一次运行在重试之前清除暂存目录。在 v2.1.0 split 模式中，阶段运行器会在**每个阶段之后**（而不仅在结束时）将暂存规则移动到 `.claude/rules/`，因此 Pass 3 中途崩溃仍然会在原地保留先前已完成阶段的规则。

**Q：我能手动运行 Pass 3 而不使用 `npx claudeos-core init` 吗？**
小型项目（≤5 领域）可以 — [Step 6](#step-6pass-3--生成所有文档拆分为多个阶段) 中的单次调用手动说明仍然有效。对于更大的项目，你应该使用 `npx claudeos-core init`，因为 split 运行器负责编排带全新上下文的逐阶段执行、处理 ≥16 领域时的批次子分割、写入正确的 `pass3-complete.json` 标记形状（`mode: "split"` + `groupsCompleted`），以及在阶段之间移动暂存规则。手工复现这种编排是可能的但很繁琐。如果你有理由手动运行阶段（例如调试特定阶段），你可以用合适的 `STAGE:` 指令模板化 `pass3-prompt.md` 并直接喂给 `claude -p` — 但请记住在每个阶段之后移动 `.staged-rules/` 并自行更新标记。

**Q：我的项目是从 v2.0.x 升级过来的，并且存在一个现有的 `claudeos-core/plan/` 目录。我该怎么办？**
无需任何操作 — v2.1.0 工具在 `plan/` 缺失或为空时会忽略它，而 `plan-validator` 仍然处理具有已填充 `plan/` 目录的旧版项目以保持向后兼容。如果你不需要 master plan 备份，可以安全地删除 `claudeos-core/plan/`（git 历史无论如何都是更好的备份）。如果保留 `plan/`，运行 `npx claudeos-core init` 不会更新它 — 在 v2.1.0 中新内容不再聚合到 master plans。验证工具干净地处理两种情况。

---

## 模板结构

```
pass-prompts/templates/
├── common/                  # 共享 header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # 角色 + 输出格式指令（所有 pass）
│   ├── pass3-footer.md       # Pass 3 完成后 health-check 指令 + 5 个 CRITICAL 护栏块 (v2.2.0)
│   ├── pass3-phase1.md       # "Read Once, Extract Facts" 块（Rule A-E）(v2.1.0)
│   ├── pass4.md              # 内存脚手架提示 (v2.0.0)
│   ├── staging-override.md   # 将 .claude/rules/** 写入重定向至 .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # 确定性 8 节 CLAUDE.md 模板 (v2.2.0)
│   └── lang-instructions.json # 按语言的输出指令（10 种语言）
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` 自动检测你的技术栈，然后组装特定于类型的提示。NestJS、Vue/Nuxt、Vite SPA 和 Flask 分别使用专用模板，具有框架特定的分析类别（例如 NestJS 的 `@Module`/`@Injectable`/Guards；Vue 的 `<script setup>`/Pinia/useFetch；Vite 的 client-side routing/`VITE_` env；Flask 的 Blueprint/`app.factory`/Flask-SQLAlchemy）。对于多技术栈项目，分别生成 `pass1-backend-prompt.md` 和 `pass1-frontend-prompt.md`，而 `pass3-prompt.md` 结合两个技术栈的生成目标。在 v2.1.0 中，Pass 3 模板在被按 split-mode 阶段切片前，会被前置 `common/pass3-phase1.md`（包含 Rules A–E 的 "Read Once, Extract Facts" 块）。Pass 4 使用共享的 `common/pass4.md` 模板（内存脚手架），与技术栈无关。

**在 v2.2.0 中**，Pass 3 提示词还在 phase1 块和栈特定主体之间内联嵌入 `common/claude-md-scaffold.md`（确定性 8 节 CLAUDE.md 模板）——这固定了 8 节的结构以避免生成的 CLAUDE.md 在项目间漂移，同时内容仍按项目自适应。`claude-md-scaffold.md` 采用 **English-first** 编写；来自 `lang-instructions.json` 的语言注入指示 LLM 在输出时将节标题和散文翻译为目标输出语言。

---

## 单体仓库支持

ClaudeOS-Core 自动检测 JS/TS 单体仓库设置，并扫描子包的依赖项。

**支持的单体仓库标记**（自动检测）：
- `turbo.json`（Turborepo）
- `pnpm-workspace.yaml`（pnpm workspaces）
- `lerna.json`（Lerna）
- `package.json#workspaces`（npm/yarn workspaces）

**从单体仓库根目录运行** — ClaudeOS-Core 读取 `apps/*/package.json` 和 `packages/*/package.json` 以跨子包发现 framework/ORM/DB 依赖项：

```bash
cd my-monorepo
npx claudeos-core init
```

**检测到的内容：**
- 来自 `apps/web/package.json` 的依赖项（例如 `next`、`react`）→ frontend 技术栈
- 来自 `apps/api/package.json` 的依赖项（例如 `express`、`prisma`）→ backend 技术栈
- 来自 `packages/db/package.json` 的依赖项（例如 `drizzle-orm`）→ ORM/DB
- 来自 `pnpm-workspace.yaml` 的自定义工作空间路径（例如 `services/*`）

**领域扫描也涵盖单体仓库布局：**
- 后端领域的 `apps/api/src/modules/*/` 和 `apps/api/src/*/`
- 前端领域的 `apps/web/app/*/`、`apps/web/src/app/*/`、`apps/web/pages/*/`
- 共享包领域的 `packages/*/src/*/`

```
my-monorepo/                    ← 在此运行：npx claudeos-core init
├── turbo.json                  ← 自动检测为 Turborepo
├── apps/
│   ├── web/                    ← 从 apps/web/package.json 检测到 Next.js
│   │   ├── app/dashboard/      ← 检测到前端领域
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← 从 apps/api/package.json 检测到 Express
│       ├── src/modules/users/  ← 检测到后端领域
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← 从 packages/db/package.json 检测到 Drizzle
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **注意：** 对于 Kotlin/Java 单体仓库，多模块检测使用 `settings.gradle.kts`（请参阅上面的 [Kotlin 多模块领域检测](#kotlin-多模块领域检测)），不需要 JS 单体仓库标记。

## 故障排除

**"claude: command not found"** — Claude Code CLI 未安装或不在 PATH 中。参见 [Claude Code 文档](https://code.claude.com/docs/en/overview)。

**"npm install failed"** — Node.js 版本可能太低。需要 v18+。

**"0 domains detected"** — 你的项目结构可能不标准。请参阅上面适合你技术栈的检测模式。

**Kotlin 项目上的 "0 domains detected"** — 确保你的项目在根目录有 `build.gradle.kts`（或带有 kotlin 插件的 `build.gradle`），并且源文件在 `**/src/main/kotlin/` 下。对于多模块项目，确保 `settings.gradle.kts` 包含 `include()` 语句。也支持单模块 Kotlin 项目（没有 `settings.gradle`）— 领域从 `src/main/kotlin/` 下的包/类结构提取。

**"Language detected as java instead of kotlin"** — ClaudeOS-Core 首先检查根 `build.gradle(.kts)`，然后检查子模块构建文件。如果根构建文件使用 `java` 插件而没有 `kotlin`，但子模块使用 Kotlin，该工具会作为回退检查最多 5 个子模块构建文件。如果仍未检测到，请确保至少一个 `build.gradle.kts` 包含 `kotlin("jvm")` 或 `org.jetbrains.kotlin`。

**"CQRS not detected"** — 架构检测依赖于包含 `command` 和 `query` 关键字的模块名称。如果你的模块使用不同的命名（例如 `write-server`、`read-server`），CQRS 架构不会被自动检测。你可以在 plan-installer 运行后手动调整生成的提示。

**"Pass 3 produced 0 rule files under .claude/rules/"（v2.0.0）** — Guard 2 触发：Claude 忽略了 `staging-override.md` 指令并试图直接写入 `.claude/`，这是 Claude Code 的 sensitive-path 策略阻止写入的地方。使用 `npx claudeos-core init --force` 重新运行。如果错误持续，请检查 `claudeos-core/generated/pass3-prompt.md` 以验证 `staging-override.md` 块在顶部。

**"Pass 3 finished but N rule file(s) could not be moved from staging"（v2.0.0）** — Guard 1 触发：暂存移动遇到瞬态文件锁（通常是 Windows 杀毒软件或文件监视器）。标记未写入，因此下一次 `init` 运行会自动重试 Pass 3。只需重新运行 `npx claudeos-core init`。

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty"（v2.0.0）** — Guard 3 (H2) 触发：Claude 在写入 CLAUDE.md + rules 之后，但在完成（或开始）`claudeos-core/guide/` 部分（预期 9 个文件）之前响应被截断。在仅 BOM 或仅空白的文件上也会触发（标题已写入但正文被截断）。没有这个守卫，完成标记仍会被写入，使 `guide/` 在后续运行中永久为空。标记在这里不会被写入，所以下一次 `init` 运行会从相同的 Pass 2 结果重试 Pass 3。如果持续重复，使用 `npx claudeos-core init --force` 从头重新生成。

**"Pass 3 finished but the following required output(s) are missing or empty"（v2.0.0，v2.1.0 更新）** — Guard 3 (H1) 触发：Claude 在 `claudeos-core/guide/` 之后但在（或期间）`claudeos-core/standard/` 或 `claudeos-core/skills/` 之前截断。要求：(a) `standard/00.core/01.project-overview.md` 存在且非空（每个技术栈的 Pass 3 提示都写入的哨兵），(b) `skills/` 有 ≥1 个非空 `.md`。`database/` 和 `mcp-guide/` 被故意排除（某些技术栈合法地产生零文件）。从 v2.1.0 开始不再检查 `plan/`（master plans 已被移除）。与 Guard 3 (H2) 相同的恢复路径：重新运行 `init`，如果持续则 `--force`。

**"Pass 3 split 阶段中途崩溃（v2.1.0）"** — 当其中一个 split 阶段（例如 `3b-1`、`3c-2`）在运行中途失败时，阶段级标记不会被写入，但已完成的阶段**会**被记录在 `pass3-complete.json.groupsCompleted` 中。下一次 `init` 运行读取此数组并从第一个未完成的阶段恢复，跳过所有较早已完成的工作。你无需手动做任何事 — 只需重新运行 `npx claudeos-core init`。如果 resume 在同一阶段持续失败，请检查 `claudeos-core/generated/pass3-prompt.md` 是否有格式错误的内容，然后尝试 `--force` 进行完整重启。`pass3-complete.json` 形状（`mode: "split"`、`groupsCompleted: [...]`）是稳定的；缺失或格式错误的标记会使完整的 Pass 3 从 `3a` 重新运行。

**"Pass 3 stale marker (shape mismatch) — treating as incomplete"（v2.1.0）** — 一个来自 v2.1.0 之前的单次调用运行的 `pass3-complete.json` 被按新的 split-mode 规则解释。形状检查查找 `mode: "split"` 和一个 `groupsCompleted` 数组；如果其中任何一个缺失，标记会被视为部分完成，Pass 3 会在 split 模式下重新运行。如果你从 v2.0.x 升级，这是预期的一次行为 — 下一次运行将写入正确的标记形状。无需操作。

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running"（v2.0.0）** — 信息日志，不是错误。在恢复时，`init` 现在解析并验证 `pass2-merged.json`（需要 ≥5 个顶级键，镜像 `pass-json-validator` 的 `INSUFFICIENT_KEYS` 阈值）。来自先前崩溃运行的骨架 `{}` 或格式错误的 JSON 会被自动删除，Pass 2 重新运行。不需要手动操作 — 管道自愈。如果持续出现，请检查 `claudeos-core/generated/pass2-prompt.md` 并使用 `--force` 重试。

**"Static fallback failed while translating to lang='ko'"（v2.0.0）** — 当 `--lang` 是非英语时，Pass 4 / 静态回退 / gap-fill 都需要 `claude` CLI 进行翻译。如果翻译失败（CLI 未认证、网络超时或 strict validation 拒绝输出：<40% 长度、损坏的代码围栏、丢失的 frontmatter 等），运行将中止而不是静默地写入英语。修复：确保 `claude` 已认证，或使用 `--lang en` 重新运行以跳过翻译。

**"pass4-memory.json exists but memory/ is empty"（v2.0.0）** — 之前的运行写入了标记，但用户（或清理脚本）删除了 `claudeos-core/memory/`。CLI 自动检测这个陈旧标记并在下一次 `init` 上重新运行 Pass 4。不需要手动操作。

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4"（v2.0.0）** — 信息日志，不是错误。Pass 4 标记内容现在被验证（`passNum === 4` + 非空 `memoryFiles` 数组，不仅仅是存在）。将像 `{"error":"timeout"}` 这样的东西作为标记正文发出的部分 Claude 失败以前会被永远接受为成功；现在标记被删除并 Pass 4 自动重新运行。

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError（v2.0.0）** — `init` 检测到陈旧标记（Pass 3：CLAUDE.md 被外部删除；Pass 4：memory/ 为空或标记正文格式错误）并试图将其删除，但 `unlinkSync` 调用失败 — 通常是因为 Windows 杀毒软件或文件监视器（编辑器、IDE 索引器）保持着文件句柄。以前这被静默忽略，导致管道跳过 pass 并重用陈旧标记。现在它大声失败。修复：关闭可能打开该文件的任何编辑器/AV 扫描器，然后重新运行 `npx claudeos-core init`。

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError（v2.0.0）** — 你在 shell 中设置了仅用于测试的环境变量 `CLAUDEOS_SKIP_TRANSLATION=1`（可能是 CI/测试设置遗留下来的）并选择了非英语 `--lang`。这个环境变量使 Pass 4 的静态回退和 gap-fill 依赖的翻译路径短路以用于非英语输出。`init` 在语言选择时检测冲突并立即中止（而不是在 Pass 4 中途带着令人困惑的嵌套错误崩溃）。修复：在运行之前 `unset CLAUDEOS_SKIP_TRANSLATION`，或使用 `npx claudeos-core init --lang en`。

**"⚠️ v2.2.0 upgrade detected" 警告 (v2.2.0)** — 现有的 `CLAUDE.md` 是用 v2.2.0 之前的版本生成的。默认 resume 模式重新生成会根据 Rule B idempotency 跳过现有文件，因此 v2.2.0 的结构性改进（8 节 CLAUDE.md scaffold、`40.infra/*` 每文件 paths、`.env.example` 端口准确性、Section 8 `Common Rules & Memory (L4)` 重新设计（通用规则 · L4 内存两个子节结构）、`60.memory/*` 规则行、forward-reference 的 `04.doc-writing-guide.md`）不会被应用。解决：使用 `npx claudeos-core init --force` 重新运行。生成文件（`CLAUDE.md`、`.claude/rules/`、`claudeos-core/standard/`、`claudeos-core/skills/`、`claudeos-core/guide/`）会被覆盖，但 `claudeos-core/memory/` 内容（decision-log、failure-patterns 等累积条目——append-only）完全保留。如需在覆盖前检查 diff，请在 `--force` 之前先 git commit 项目。

**CLAUDE.md 中的 port 与 `.env.example` 不一致 (v2.2.0)** — v2.2.0 的新 `.env` 解析器（`lib/env-parser.js`）优先读取 `.env.example`（提交的 canonical 文件），然后 fallback 到 `.env` 变种。识别的端口变量名：`PORT`、`VITE_PORT`、`VITE_DESKTOP_PORT`、`NEXT_PUBLIC_PORT`、`NUXT_PORT`、`DJANGO_PORT` 等。对于 Spring Boot，`application.yml` 的 `server.port` 仍然优先于 `.env`（framework-native config 优先）。如果项目使用非标准 env 变量名，请改用惯例名称或提 issue 请求扩展 `PORT_VAR_KEYS`。framework 默认值（Vite 5173、Next.js 3000、Django 8000）仅在直接检测和 `.env` 都静默时使用。

**生成的文档中显示 `***REDACTED***` 值 (v2.2.0)** — 预期行为。v2.2.0 的 `.env` 解析器会自动将匹配 `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` 模式的变量值替换为 `***REDACTED***`，然后传递给所有生成器。这是对 `.env.example` 中意外提交的敏感信息的 defense-in-depth 保护。`DATABASE_URL` 因 stack-detector DB 识别 back-compat 而保留。如果在生成的 `CLAUDE.md` 表格中看到 `***REDACTED***`，这是 bug，请提交 issue——redacted 值不应到达表格。非敏感运行时配置（port、host、API target、NODE_ENV 等）照常通过。

---

## 贡献

欢迎贡献！最需要帮助的领域：

- **新技术栈模板** — Ruby/Rails、Go (Gin/Fiber/Echo)、PHP (Laravel/Symfony)、Rust (Axum/Actix)、Svelte/SvelteKit、Remix
- **IDE 集成** — VS Code 扩展、IntelliJ 插件
- **CI/CD 模板** — GitLab CI、CircleCI、Jenkins 示例（GitHub Actions 已经自带 — 参见 `.github/workflows/test.yml`）
- **测试覆盖率** — 扩展测试套件（当前 30 个测试文件中的 602 个测试，涵盖扫描器、技术栈检测、领域分组、计划解析、提示生成、CLI 选择器、单体仓库检测、Vite SPA 检测、验证工具、L4 内存脚手架、Pass 2 恢复验证、Pass 3 Guards 1/2/3（H1 哨兵 + H2 BOM-aware 空文件 + 严格陈旧标记 unlink）、Pass 3 split-mode 批次子分割、Pass 3 部分标记 resume（v2.1.0）、Pass 4 标记内容验证 + 陈旧标记 unlink 严格性 + scaffoldSkillsManifest gap-fill（v2.1.0）、翻译 env-skip 守卫 + early fail-fast + CI 工作流、staged-rules 移动、语言感知翻译回退、master plan 移除回归套件（v2.1.0）、memory score/compact 格式化回归（v2.1.0）和 AI Work Rules 模板结构、`.env` 解析器 port/host/API-target 提取 + 敏感变量 redaction (v2.2.0)）

查看 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 以获取完整的领域列表、代码风格、提交约定和添加新技术栈模板的分步指南。

---

## 作者

由 **claudeos-core** 创建 — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## 许可证

ISC
