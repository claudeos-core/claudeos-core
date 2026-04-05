# ClaudeOS-Core

**唯一一个先读取源代码、用确定性分析确认技术栈和模式、然后生成精确匹配项目的 Claude Code 规则的工具。**

```bash
npx claudeos-core init
```

ClaudeOS-Core 读取你的代码库，提取所有模式，生成一套完全适配 _你的_ 项目的 Standards、Rules、Skills 和 Guides。之后，当你告诉 Claude Code "创建一个订单 CRUD"时，它会生成完全符合你现有模式的代码。

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## 为什么选择 ClaudeOS-Core？

> 人类描述项目 → LLM 生成文档

ClaudeOS-Core:

> 代码分析源码 → 代码构建定制提示 → LLM 生成文档 → 代码验证输出

### 核心问题：LLM 猜测，代码确定。

当你要求 Claude "分析这个项目"时，它会**猜测**你的技术栈、ORM、领域结构。

**ClaudeOS-Core 不猜测。** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### 结果

其他工具生成"一般性好的"文档。
ClaudeOS-Core 生成的文档知道你的项目使用 `ApiResponse.ok()`（而不是 `ResponseEntity.success()`），MyBatis XML 映射器位于 `src/main/resources/mybatis/mappers/`，包结构为 `com.company.module.{domain}.controller` — 因为它读了你的实际代码。

### Before & After

**没有 ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**使用 ClaudeOS-Core 后**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

这种差异会累积。每天10个任务 × 节省20分钟 = **每天3小时以上**。

---

## 支持的技术栈

| 技术栈 | 检测方式 | 分析深度 |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`、`pom.xml`、5种包模式自动回退 | 10 大类，59 小项 |
| **Kotlin / Spring Boot** | `build.gradle.kts`、kotlin 插件、`settings.gradle.kts`、CQRS/BFF 自动检测 | 12 大类，95 小项 |
| **Node.js / Express / NestJS** | `package.json` | 9 大类，57 小项 |
| **Next.js / React / Vue** | `package.json`（next、react、vue） | 9 大类，55 小项 |
| **Python / Django** | `requirements.txt`、`pyproject.toml` | 10 大类，55 小项 |
| **Python / FastAPI** | `requirements.txt`、`pyproject.toml` | 10 大类，58 小项 |
| **Node.js / Fastify** | `package.json` | 10 大类，62 小项 |
| **Angular** | `package.json`、`angular.json` | 12 大类，78 小项 |

自动检测：语言及版本、框架及版本、ORM（MyBatis、JPA、Exposed、Prisma、TypeORM、SQLAlchemy 等）、数据库（PostgreSQL、MySQL、Oracle、MongoDB、SQLite）、包管理器（Gradle、Maven、npm、yarn、pnpm、pip、poetry）、架构（CQRS、BFF — 从模块名检测）、多模块结构（从 settings.gradle 检测）。

**你不需要指定任何内容，一切自动检测。**


### Java 域检测（5种模式自动回退）

| 优先级 | 模式 | 结构 | 示例 |
|---|---|---|---|
| A | 层优先 | `controller/{domain}/` | `controller/user/UserController.java` |
| B | 域优先 | `{domain}/controller/` | `user/controller/UserController.java` |
| D | 模块前缀 | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/六角形 | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | 扁平 | `controller/*.java` | `controller/UserController.java` → 从类名提取 `user` |

无 Controller 的纯 Service 域也会通过 `service/`、`dao/`、`aggregator/`、`mapper/`、`repository/` 目录被检测。跳过：`common`、`config`、`util`、`core`、`front`、`admin`、`v1`、`v2` 等。


### Kotlin 多模块域检测

适用于 Gradle 多模块结构的 Kotlin 项目（如 CQRS 单体仓库）：

| 步骤 | 操作 | 示例 |
|---|---|---|
| 1 | 扫描 `settings.gradle.kts` 中的 `include()` | 发现 14 个模块 |
| 2 | 从模块名检测类型 | `reservation-command-server` → type: `command` |
| 3 | 从模块名提取域 | `reservation-command-server` → domain: `reservation` |
| 4 | 跨模块合并相同域 | `reservation-command-server` + `common-query-server` → 1 个域 |
| 5 | 检测架构 | 有 `command` + `query` 模块 → CQRS |

支持的模块类型：`command`、`query`、`bff`、`integration`、`standalone`、`library`。共享库（`shared-lib`、`integration-lib`）作为特殊域检测。

### 前端域检测

- **App Router**：`app/{domain}/page.tsx`（Next.js）
- **Pages Router**：`pages/{domain}/index.tsx`
- **FSD（功能切片设计）**：`features/*/`、`widgets/*/`、`entities/*/`
- **RSC/Client 分离**：检测 `client.tsx` 模式，追踪服务端/客户端组件分离
- **配置文件回退**：从配置文件检测 Next.js/Vite/Nuxt（monorepo 支持）
- **深层目录回退**：React/CRA/Vite/Vue/RN 项目扫描任意深度的 `**/components/*/`、`**/views/*/`、`**/screens/*/`、`**/containers/*/`、`**/pages/*/`、`**/routes/*/`、`**/modules/*/`、`**/domains/*/`

---

## 快速开始

### 前提条件

- **Node.js** v18+
- **Claude Code CLI**（已安装并认证）

### 安装

```bash
cd /your/project/root

# 方式 A：npx（推荐 — 无需安装）
npx claudeos-core init

# 方式 B：全局安装
npm install -g claudeos-core
claudeos-core init

# 方式 C：项目 devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# 方式 D：git clone（用于开发/贡献）
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# 跨平台（PowerShell、CMD、Bash、Zsh — 任何终端）
node claudeos-core-tools/bin/cli.js init

# 仅 Linux/macOS（仅 Bash）
bash claudeos-core-tools/bootstrap.sh
```

### 输出语言（支持 10 种语言）

不带 `--lang` 运行 `init` 时，会显示交互选择器（支持方向键或数字键）：

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  生成的文件（CLAUDE.md、Standards、Rules、
  Skills、Guides）将以简体中文编写。

     1. en     — English
     2. ko     — 한국어 (Korean)
  ❯  3. zh-CN  — 简体中文 (Chinese Simplified)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

选择移动时说明会切换为对应语言。跳过选择器直接指定：

```bash
npx claudeos-core init --lang zh-CN  # 简体中文
npx claudeos-core init --lang en     # English
npx claudeos-core init --lang ko     # 한국어
```

> **注意：** 此设置仅更改生成文档的语言。代码分析（Pass 1–2）始终以英文运行，仅生成结果（Pass 3）以所选语言编写。代码示例保持原始编程语言语法。

就这样。5–18 分钟后，所有文档生成完毕，即可使用。

### 手动逐步安装

如果您想完全控制每个阶段，或者自动管道在某个步骤失败，可以手动运行每个阶段。这也有助于理解 ClaudeOS-Core 的内部工作原理。

#### Step 1：克隆并安装依赖

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2：创建目录结构

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3：运行 plan-installer（项目分析）

扫描您的项目，检测技术栈，发现域，分组，并生成提示词。

```bash
node claudeos-core-tools/plan-installer/index.js
```

**输出（`claudeos-core/generated/`）：**
- `project-analysis.json` — 检测到的技术栈、域、前端信息
- `domain-groups.json` — Pass 1 的域分组
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — 分析提示词
- `pass2-prompt.md` — 合并提示词
- `pass3-prompt.md` — 生成提示词

在继续之前，您可以检查这些文件以验证检测准确性。

#### Step 4：Pass 1 — 按域组深度代码分析

为每个域组运行 Pass 1。检查 `domain-groups.json` 获取组数。

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# 前端分组请使用 pass1-frontend-prompt.md
```

**验证：** `ls claudeos-core/generated/pass1-*.json` 应显示每组一个 JSON。

#### Step 5：Pass 2 — 合并分析结果

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**验证：** `claudeos-core/generated/pass2-merged.json` 应存在且包含 9 个以上顶层键。

#### Step 6：Pass 3 — 生成所有文档

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**验证：** 项目根目录应存在 `CLAUDE.md`。

#### Step 7：运行验证工具

```bash
# 生成元数据（其他检查前必须运行）
node claudeos-core-tools/manifest-generator/index.js

# 运行全部检查
node claudeos-core-tools/health-checker/index.js

# 或运行单独检查：
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8：验证结果

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **提示：** 如果某个步骤失败，可以仅重新运行该步骤。Pass 1/2 结果会被缓存 — 如果 `pass1-N.json` 或 `pass2-merged.json` 已存在，自动管道会跳过。使用 `npx claudeos-core init --force` 删除之前的结果并重新开始。

### 开始使用

```
# 在 Claude Code 中直接用自然语言：
"帮我创建订单域的 CRUD"
"添加用户认证 API"
"按照项目规范重构这段代码"

# Claude Code 会自动引用生成的 Standards、Rules 和 Skills。
```

---

## 工作原理 — 3-Pass 流水线

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← 安装依赖（~10秒）
    ├── [2] 创建目录结构                    ← 创建文件夹（~1秒）
    ├── [3] plan-installer (Node.js)       ← 项目扫描（~5秒）
    │       ├── 自动检测技术栈（支持多栈）
    │       ├── 提取领域列表（标记：backend/frontend）
    │       ├── 按类型分割领域组
    │       └── 选择栈特定的提示词（按类型）
    │
    ├── [4] Pass 1 × N  (claude -p)       ← 代码深度分析（~2-8分钟）
    │       ├── ⚙️ 后端组 → 后端专用分析提示
    │       └── 🎨 前端组 → 前端专用分析提示
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← 合并分析结果（~1分钟）
    │       └── 整合所有 Pass 1 结果（后端 + 前端）
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← 生成全部文件（~3-5分钟）
    │       └── 合并提示（后端 + 前端目标）
    │
    └── [7] 验证                           ← 自动运行健康检查
```

### 为什么是 3 个 Pass？

**Pass 1** 是唯一读取源代码的阶段。它为每个领域选择代表性文件，跨 55–95 个分析类别提取模式。对于大型项目，Pass 1 会运行多次——每个领域组一次。在多栈项目中（如 Java 后端 + React 前端），后端和前端使用 **各自专用的分析提示**。

**Pass 2** 将所有 Pass 1 结果合并为统一分析：通用模式（100% 共享）、多数模式（50%+ 共享）、领域特定模式、按严重度分级的反模式，以及横切关注点（命名、安全、数据库、测试、日志、性能）。

**Pass 3** 基于合并后的分析生成整个文件体系。它不再读取源代码——只读分析 JSON。在多栈模式下，生成提示会合并后端和前端的目标，一次生成所有标准文档。

---

## 生成的文件结构

```
your-project/
│
├── CLAUDE.md                          ← Claude Code 入口
│
├── .claude/
│   └── rules/                         ← Glob 触发的规则
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← 同步提醒规则
│
├── claudeos-core/                     ← 主要输出目录
│   ├── generated/                     ← 分析 JSON + 动态提示
│   ├── standard/                      ← 编码标准（15-19 个文件）
│   ├── skills/                        ← CRUD 脚手架技能
│   ├── guide/                         ← 入门、FAQ、故障排除（9 个文件）
│   ├── plan/                          ← Master Plans（备份/恢复）
│   ├── database/                      ← 数据库 Schema、迁移指南
│   └── mcp-guide/                     ← MCP 服务器集成指南
│
└── claudeos-core-tools/               ← 本工具包（请勿修改）
```

每个标准文件都包含 ✅ 正确示例、❌ 错误示例和规则总结表——全部基于你的实际代码模式，而非通用模板。

---

## 按项目规模自动扩展

| 规模 | 领域数 | Pass 1 次数 | `claude -p` 总次数 | 预估时间 |
|---|---|---|---|---|
| 小型 | 1–4 | 1 | 3 | ~5分钟 |
| 中型 | 5–8 | 2 | 4 | ~8分钟 |
| 大型 | 9–16 | 3–4 | 5–6 | ~12分钟 |
| 超大型 | 17+ | 5+ | 7+ | ~18分钟+ |

对于多栈项目（如 Java + React），后端和前端领域合并计数。6 个后端 + 4 个前端领域 = 共 10 个，按"大型"扩展。

---

## 验证工具

ClaudeOS-Core 内置 5 个验证工具，生成后自动运行：

```bash
# 一次运行所有检查（推荐）
npx claudeos-core health

# 单独命令
npx claudeos-core validate     # Plan ↔ 磁盘对比
npx claudeos-core refresh      # 磁盘 → Plan 同步
npx claudeos-core restore      # Plan → 磁盘恢复
```

| 工具 | 功能 |
|---|---|
| **manifest-generator** | 构建元数据 JSON（rule-manifest、sync-map、plan-manifest） |
| **plan-validator** | 比较 Master Plan `<file>` 块与磁盘内容——3 种模式：check、refresh、restore |
| **sync-checker** | 检测未注册文件（磁盘有但计划中没有）和孤立条目 |
| **content-validator** | 验证文件质量——空文件、缺少 ✅/❌ 示例、必需章节 |
| **pass-json-validator** | 验证 Pass 1–3 JSON 结构、必需键和章节完整性 |

---

## Claude Code 如何使用你的文档

ClaudeOS-Core 生成的文档，Claude Code 实际读取方式如下：

### 自动读取的文件

| 文件 | 时机 | 保证 |
|---|---|---|
| `CLAUDE.md` | 每次对话开始 | 始终 |
| `.claude/rules/00.core/*` | 编辑文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/10.backend/*` | 编辑文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/30.security-db/*` | 编辑文件时（`paths: ["**/*"]`） | 始终 |
| `.claude/rules/40.infra/*` | 仅编辑 config/infra 文件时（范围限定 paths） | 有条件 |
| `.claude/rules/50.sync/*` | 仅编辑 claudeos-core 文件时（范围限定 paths） | 有条件 |

### 通过规则引用按需读取的文件

每个规则文件底部的 `## Reference` 部分链接到对应的 standard。Claude 仅读取与当前任务相关的 standard：

- `claudeos-core/standard/**` — 编码模式、✅/❌ 示例、命名规范
- `claudeos-core/database/**` — 数据库 schema（查询、mapper、迁移用）

`00.standard-reference.md` 作为目录，用于发现没有对应规则的 standard 文件。

### 不读取的文件（节省上下文）

通过 standard-reference 规则的 `DO NOT Read` 部分明确排除：

| 文件夹 | 排除原因 |
|---|---|
| `claudeos-core/plan/` | Master Plan 备份（~340KB）。使用 `npx claudeos-core refresh` 同步。 |
| `claudeos-core/generated/` | 构建元数据 JSON。非编码参考。 |
| `claudeos-core/guide/` | 面向人类的入门指南。 |
| `claudeos-core/mcp-guide/` | MCP 服务器文档。非编码参考。 |

---

## 日常工作流

### 安装后

```
# 像平常一样使用 Claude Code——它会自动引用你的标准：
"帮我创建订单域的 CRUD"
"添加用户资料更新 API"
"按照项目规范重构这段代码"
```

### 手动编辑标准文件后

```bash
# 编辑 standard 或 rules 文件后：
npx claudeos-core refresh

# 验证一切一致
npx claudeos-core health
```

### 文档损坏时

```bash
# 从 Master Plan 恢复一切
npx claudeos-core restore
```

### CI/CD 集成

```yaml
# GitHub Actions 示例
- run: npx claudeos-core validate
# 退出码 1 阻止 PR
```

---

## 有何不同？

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**Q：会修改我的源代码吗？**
不会。只创建 `CLAUDE.md`、`.claude/rules/` 和 `claudeos-core/`。你的现有代码不会被修改。

**Q：费用多少？**
调用 `claude -p` 3–7 次，属于 Claude Code 正常用量范围。

**Q：生成的文件应该提交到 Git 吗？**
推荐提交。团队可以共享相同的 Claude Code 标准。可考虑将 `claudeos-core/generated/` 加入 `.gitignore`（分析 JSON 可重新生成）。

**Q：混合栈项目怎么办（如 Java 后端 + React 前端）？**
完全支持。ClaudeOS-Core 自动检测两个栈，将领域标记为 `backend` 或 `frontend`，并为每个使用栈特定的分析提示。Pass 2 合并所有结果，Pass 3 一次生成后端和前端的标准文档。

**Q：重新运行会怎样？**
如果之前的 Pass 1/2 结果存在，交互式提示让您选择：**Continue**（从中断处继续）或 **Fresh**（删除全部重新开始）。使用 `--force` 跳过提示，始终重新开始。Pass 3 始终重新运行。旧版本可从 Master Plans 恢复。

**Q：支持 Kotlin 吗？**
支持。ClaudeOS-Core 从 `build.gradle.kts` 或 `build.gradle` 中的 kotlin 插件自动检测 Kotlin。使用专用的 `kotlin-spring` 模板进行 Kotlin 特定分析（data class、sealed class、协程、扩展函数、MockK 等）。

**Q：CQRS / BFF 架构呢？**
完全支持 Kotlin 多模块项目。ClaudeOS-Core 读取 `settings.gradle.kts`，从模块名检测模块类型（command、query、bff、integration），并将同一域的 Command/Query 模块分组。生成的标准包含 command controller 与 query controller 的独立规则、BFF/Feign 模式和模块间通信规范。

**Q：Gradle 多模块 monorepo 呢？**
ClaudeOS-Core 扫描所有子模块（`**/src/main/kotlin/**/*.kt`），不受嵌套深度限制。模块类型从命名规则推断（例如 `reservation-command-server` → 域: `reservation`，类型: `command`）。共享库（`shared-lib`、`integration-lib`）也会被检测。

---

## 模板结构

```
pass-prompts/templates/
├── common/                  # 共享头部/尾部
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot（CQRS、BFF、多模块）
├── node-express/            # Node.js / Express / NestJS
├── node-nextjs/             # Next.js / React / Vue
├── python-django/           # Python / Django (DRF)
├── node-fastify/            # Node.js / Fastify
├── angular/                 # Angular
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` 自动检测你的技术栈，然后组装类型特定的提示。对于多栈项目，会分别生成 `pass1-backend-prompt.md` 和 `pass1-frontend-prompt.md`，而 `pass3-prompt.md` 则合并两个栈的生成目标。

---

## Monorepo 支持

ClaudeOS-Core 读取**当前目录**的 `package.json`。在 Monorepo（Turborepo、Nx、Lerna、pnpm workspaces）环境中，根 `package.json` 通常不包含 `next`、`express`、`react` 等框架依赖——它们在各个应用目录中。

**从应用目录运行，而不是 Monorepo 根目录：**

```bash
# 示例：Turborepo 的 apps/my-app
cd apps/my-app
npx claudeos-core init

# 示例：Nx 工作空间
cd apps/frontend
npx claudeos-core init
```

每个应用获得独立的 Standards、Rules、Skills 和 Guides，针对该应用的技术栈和模式定制。

**典型 Monorepo 结构：**

```
my-monorepo/                    ← 不要在这里运行（根目录没有框架依赖）
├── apps/
│   ├── web/                    ← 在这里运行：cd apps/web && npx claudeos-core init
│   ├── api/                    ← 在这里运行：cd apps/api && npx claudeos-core init
│   └── storybook/
├── packages/
│   ├── ui/
│   └── utils/
└── package.json                ← 只有 devDependencies（turbo、eslint 等）
```

## 故障排除

**"claude: command not found"** — Claude Code CLI 未安装或不在 PATH 中。参见 [Claude Code 文档](https://code.claude.com/docs/en/overview)。

**"npm install failed"** — Node.js 版本可能过低，需要 v18+。

**"0 domains detected"** — 你的项目结构可能不标准。请参阅[韩文文档](./README.ko.md#트러블슈팅)了解你的技术栈的检测模式。

**Kotlin 项目「检测到 0 个域」** — 确保根目录有 `build.gradle.kts`，源文件在 `**/src/main/kotlin/` 下。多模块项目需要 `settings.gradle.kts` 包含 `include()` 语句。单模块 Kotlin 项目（无 `settings.gradle`）也受支持——从 `src/main/kotlin/` 下的包/类结构中提取域。

**「语言检测为 java 而非 kotlin」** — 先检查根 build 文件，再检查最多 5 个子模块 build 文件。确保至少一个包含 `kotlin("jvm")` 或 `org.jetbrains.kotlin`。

**「未检测到 CQRS」** — 架构检测依赖模块名中包含 `command` 和 `query` 关键字。

---

## 参与贡献

欢迎贡献！最需要帮助的领域：

- **新技术栈模板** — Ruby/Rails、Go/Gin、PHP/Laravel、Rust/Axum
- **Monorepo 深度支持** — 独立子项目根目录、Workspace 检测
- **测试覆盖** — 持续扩展测试套件（当前 87 项测试，覆盖技术栈检测、域分组、计划验证、结构扫描和验证工具）

---

## 作者

由 **claudeos-core** 创建 — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## 许可证

ISC
