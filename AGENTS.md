# 信访工作智能辅助系统

## 项目概述

本系统为信访工作提供智能化辅助，主要解决两个核心问题：
1. 诉求分析不到位导致答复缺漏项
2. 答复口径与文书格式混乱

通过引导式交互界面，帮助工作人员规范、完整地处理信访件。

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **AI**: LLM 技能 (豆包/DeepSeek)
- **Storage**: 对象存储技能
- **Knowledge**: 知识库技能

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── (auth)/         # 认证相关页面 (登录)
│   │   ├── (main)/         # 主应用页面
│   │   │   ├── dashboard/  # 首页仪表盘
│   │   │   ├── cases/      # 信访件管理
│   │   │   └── admin/      # 管理后台
│   │   └── api/            # API 路由
│   │       ├── auth/       # 认证接口
│   │       ├── cases/      # 信访件接口
│   │       └── admin/      # 管理接口
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── lib/                # 工具库
│   │   └── auth.ts         # 认证工具函数
│   └── storage/            # 存储相关
│       └── database/       # 数据库配置与 Schema
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

## 核心功能

### 五步流程

1. **Step1: 信息录入** - 选择信访来源、填写信访基本信息
2. **Step2: AI分析** - AI 提取诉求要点，人工确认
3. **Step3: 流程指引** - 根据来源显示对应办理流程
4. **Step4: 文书模板** - 生成标准文书模板
5. **Step5: 文书检查** - 上传文书，AI 检查合规性

### 三种流程模式

| 模式 | 来源 | 是否需要文书 |
|------|------|-------------|
| 简化流程 | 首问负责制、12345热线、生态环境平台 | 否 |
| 书面答复流程 | 上述来源 + 书面答复要求 | 是 |
| 标准流程 | 信访信息系统 | 必须 |

### 信访来源

- 首问负责制
- 12345热线
- 全国生态环境信访投诉举报管理平台
- 信访信息系统

## API 接口

### 认证接口
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 信访件接口
- `GET /api/cases` - 获取信访件列表
- `POST /api/cases` - 创建信访件
- `GET /api/cases/[id]` - 获取信访件详情
- `PUT /api/cases/[id]` - 更新信访件
- `POST /api/cases/[id]/analyze` - AI 分析诉求
- `POST /api/cases/[id]/confirm` - 确认分析结果
- `GET /api/cases/[id]/guide` - 获取流程指引
- `GET /api/cases/[id]/document` - 获取文书模板
- `POST /api/cases/[id]/check` - 文书合规检查

### 管理接口
- `GET /api/admin/users` - 用户管理
- `GET /api/admin/guidelines` - 指引文件管理
- `GET /api/admin/templates` - 文书模板管理
- `GET /api/admin/logs` - 操作日志

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

常用命令：
- 安装依赖：`pnpm install`
- 添加依赖：`pnpm add <package>`
- 开发依赖：`pnpm add -D <package>`
- 移除依赖：`pnpm remove <package>`

## 开发命令

```bash
# 开发环境
pnpm dev

# 类型检查
pnpm ts-check

# 代码检查
pnpm lint

# 构建
pnpm build

# 生产运行
pnpm start
```

## 数据库表结构

### users - 用户表
- id, username, password_hash, real_name, role, department, created_at

### petition_cases - 信访件表
- id, case_number, source, raw_content, petitioner_name, petitioner_contact, requires_written_reply, status, created_by, created_at

### analysis_results - 分析结果表
- id, case_id, appeals (JSONB), key_info (JSONB), user_confirmed, confirmed_by, confirmed_at

### document_checks - 文书检查表
- id, case_id, document_url, check_result (JSONB), issues (JSONB), suggestions (JSONB)

### operation_logs - 操作日志表
- id, user_id, action, case_id, details (JSONB), created_at

### guideline_docs - 指引文件表
- id, title, category, content, file_url, is_active

### document_templates - 文书模板表
- id, name, category, template_content, placeholders (JSONB), is_active

## 用户角色

| 角色 | 权限 |
|------|------|
| admin | 管理用户、指引文件、模板，查看所有日志 |
| user | 使用五步流程处理信访件 |

## 开发规范

### 编码规范
- 默认按 TypeScript `strict` 模式编写
- 禁止隐式 `any` 和 `as any`
- 函数参数、返回值、事件对象需有明确类型

### Hydration 问题防范
- 严禁在 JSX 中直接使用 `typeof window`、`Date.now()`、`Math.random()`
- 动态内容使用 `useEffect` + `useState` 在客户端渲染
- 禁止非法 HTML 嵌套（如 `<p>` 嵌套 `<div>`）

### UI 组件
- 默认采用 shadcn/ui 组件、风格和规范
- 组件位于 `src/components/ui/` 目录
