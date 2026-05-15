# Vercel 部署指南

## 前提条件

1. 一个 GitHub 账号
2. 一个 Vercel 账号（可使用 GitHub 登录）
3. 一个 Supabase 账号（用于数据库）
4. 一个 DeepSeek 或 Coze API Key（用于 AI 功能）

## 第一步：创建 Supabase 项目

1. 访问 https://supabase.com 并登录
2. 创建新项目，记下数据库密码
3. 项目创建后，进入 Settings > API，获取：
   - Project URL → `COZE_SUPABASE_URL`
   - anon public key → `COZE_SUPABASE_ANON_KEY`
   - service_role key → `COZE_SUPABASE_SERVICE_ROLE_KEY`

4. 在 SQL Editor 中执行数据库建表脚本（见下方）

## 第二步：获取 AI API Key

### 方式一：DeepSeek（推荐）
1. 访问 https://platform.deepseek.com
2. 注册并创建 API Key
3. 将 Key 设置为 `DEEPSEEK_API_KEY`

### 方式二：Coze（豆包）
1. 访问 https://www.coze.cn
2. 创建 Bot 并获取 API Token
3. 设置 `COZE_API_TOKEN` 和 `COZE_BOT_ID`

## 第三步：推送代码到 GitHub

1. 在 GitHub 创建新仓库
2. 将项目代码推送到仓库：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

## 第四步：在 Vercel 部署

1. 访问 https://vercel.com 并使用 GitHub 登录
2. 点击 "Add New" > "Project"
3. 选择刚才创建的 GitHub 仓库
4. 配置环境变量：

| 变量名 | 值 |
|-------|-----|
| COZE_SUPABASE_URL | 你的 Supabase URL |
| COZE_SUPABASE_ANON_KEY | 你的 anon key |
| COZE_SUPABASE_SERVICE_ROLE_KEY | 你的 service role key |
| DEEPSEEK_API_KEY | 你的 DeepSeek API Key |

5. 点击 "Deploy" 等待部署完成

## 第五步：创建管理员账号

部署完成后，需要在 Supabase 数据库中创建管理员账号：

```sql
INSERT INTO users (id, username, password_hash, real_name, role)
VALUES (
  gen_random_uuid(),
  'admin',
  'e6c3da5b206941d7090b9f0b9d35b2f1a8e5c8f9a6b3c2d1e0f9a8b7c6d5e4f3',
  '系统管理员',
  'admin'
);
```

默认密码：`admin123`

## 数据库建表脚本

在 Supabase SQL Editor 中执行：

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(50),
  role VARCHAR(20) DEFAULT 'user',
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 信访件表
CREATE TABLE petition_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE,
  source VARCHAR(50) NOT NULL,
  raw_content TEXT NOT NULL,
  petitioner_name VARCHAR(50),
  petitioner_contact VARCHAR(100),
  requires_written_reply BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  current_step INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 分析结果表
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE REFERENCES petition_cases(id),
  appeals JSONB,
  key_info JSONB,
  request_type VARCHAR(20) DEFAULT '投诉',
  ai_raw_response TEXT,
  user_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 文书检查表
CREATE TABLE document_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES petition_cases(id),
  document_url TEXT,
  check_result JSONB,
  issues JSONB,
  suggestions JSONB,
  passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 操作日志表
CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  case_id UUID REFERENCES petition_cases(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 指引文件表
CREATE TABLE guideline_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  content TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 文书模板表
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  template_content TEXT NOT NULL,
  placeholders JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 流程指引表
CREATE TABLE process_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE REFERENCES petition_cases(id),
  steps JSONB,
  regulations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 生成文书表
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES petition_cases(id),
  document_type VARCHAR(100),
  content TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_petition_cases_status ON petition_cases(status);
CREATE INDEX idx_petition_cases_created_by ON petition_cases(created_by);
CREATE INDEX idx_analysis_results_case_id ON analysis_results(case_id);
CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_case_id ON operation_logs(case_id);
```

## 常见问题

### Q: 部署后无法登录？
A: 检查数据库中是否有用户数据，密码是否正确加密。

### Q: AI 分析功能不工作？
A: 检查 DEEPSEEK_API_KEY 或 COZE_API_TOKEN 是否正确配置。

### Q: 数据库连接失败？
A: 检查 Supabase 项目是否暂停（免费版一段时间不活跃会暂停），以及环境变量是否正确。

## 域名配置

Vercel 支持自定义域名：
1. 在 Vercel 项目设置中添加自定义域名
2. 在域名服务商处配置 DNS 解析
3. 等待 SSL 证书自动配置完成
