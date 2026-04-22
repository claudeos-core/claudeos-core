# CLAUDE.md — sample-project

> 简体中文 validator 测试用 CLAUDE.md 样例。

## 1. Role Definition (角色定义)

作为本仓库的高级开发者,您负责代码编写、修改和审查。回复必须使用简体中文。
基于 PostgreSQL 关系数据库之上的 Node.js Express REST API 服务器。

## 2. Project Overview (项目概览)

| 项 | 值 |
|---|---|
| 语言 | TypeScript 5.4 |
| 框架 | Express 4.19 |
| 构建工具 | tsc |
| 包管理器 | npm |
| 服务器端口 | 3000 |
| 数据库 | PostgreSQL 15 |
| ORM | Prisma 5 |
| 测试运行器 | Vitest |

## 3. Build & Run Commands (构建与运行命令)

```bash
npm install
npm run dev
npm run build
npm test
```

将 `package.json` 的 scripts 视为唯一真实来源。

## 4. Core Architecture (核心架构)

### 整体结构

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### 数据流

1. 请求到达路由器。
2. 中间件验证认证。
3. 服务执行业务逻辑。
4. Prisma 读写数据库。
5. 响应序列化。

### 核心模式

- **分层**: router → service → repository。
- **DTO 校验**: 路由边界的 zod 模式。
- **错误中间件**: 集中错误处理。

## 5. Directory Structure (目录结构)

```
sample-project/
├─ src/
└─ tests/
```

**自动生成**: 无。
**测试范围**: `tests/` 镜像 `src/`。
**构建输出**: `dist/`。

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills 参考)

### Standard (唯一真实来源)

| 路径 | 说明 |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | 项目概览 |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | 文档编写指南 |

### Rules (自动加载守卫)

| 路径 | 说明 |
|---|---|
| `.claude/rules/00.core/*` | 核心规则 |
| `.claude/rules/60.memory/*` | L4 记忆守卫 |

### Skills (自动化流程)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (请勿读取)

| 路径 | 原因 |
|---|---|
| `claudeos-core/guide/` | 面向人类的文档 |
| `dist/` | 构建输出 |
| `node_modules/` | 依赖 |

## 8. Common Rules & Memory (L4) (通用规则与记忆 (L4))

### 通用规则 (每次编辑时自动加载)

| 规则文件 | 职责 | 核心强制 |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | 文档编写规则 | paths 必需,禁止硬编码 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 工作规则 | 基于事实,编辑前 Read |

详见 `claudeos-core/standard/00.core/04.doc-writing-guide.md`。

### L4 记忆 (按需参考)

长期上下文(决策 · 失败 · 压缩 · 自动提案)存储于 `claudeos-core/memory/`。
与通过 `paths` 通配符自动加载的 rules 不同,此层按 **按需** 参考。

#### L4 记忆文件

| 文件 | 目的 | 行为 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 设计决策的原因 | 仅追加。会话开始时浏览。 |
| `claudeos-core/memory/failure-patterns.md` | 重复错误 | 会话开始时搜索。 |
| `claudeos-core/memory/compaction.md` | 4 阶段压缩策略 | 仅策略变化时修改。 |
| `claudeos-core/memory/auto-rule-update.md` | 规则变更提议 | 审查并接受。 |

#### 记忆工作流

1. 会话开始时扫描 failure-patterns。
2. 浏览最近的决策。
3. 记录新决策以追加方式。
4. 以 pattern-id 登记重复错误。
5. 文件接近 400 行时运行 compact。
6. 审查 rule-update 提议。

## 9. 记忆 (L4)

> 每次编辑自动加载的通用守卫和按需参考的长期记忆文件。

### 通用规则 (每次编辑时自动加载)

| 规则文件 | 职责 |
|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | 文档编写规则 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 工作规则 |

### L4 记忆文件

| 文件 | 目的 | 行为 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 设计决策的原因 | 仅追加。 |
| `claudeos-core/memory/failure-patterns.md` | 重复错误 | 会话开始时搜索。 |
| `claudeos-core/memory/compaction.md` | 4 阶段压缩策略 | 仅策略变化时修改。 |
| `claudeos-core/memory/auto-rule-update.md` | 规则变更提议 | 审查。 |
