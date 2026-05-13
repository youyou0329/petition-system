import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index, serial, uuid } from "drizzle-orm/pg-core";

// ==================== 用户表 ====================
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    real_name: varchar("real_name", { length: 50 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"), // admin, user, viewer
    department: varchar("department", { length: 100 }),
    is_active: boolean("is_active").default(true).notNull(),
    last_login: timestamp("last_login", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_username_idx").on(table.username),
    index("users_role_idx").on(table.role),
  ]
);

// ==================== 信访件表 ====================
export const petitionCases = pgTable(
  "petition_cases",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_number: varchar("case_number", { length: 50 }).notNull().unique(), // 信访编号
    source: varchar("source", { length: 30 }).notNull(), // 首问负责制, 12345热线, 生态环境信访平台, 信访信息系统
    requires_written_response: boolean("requires_written_response").default(false).notNull(), // 是否需要书面答复
    raw_content: text("raw_content").notNull(), // 信访件原文
    petitioner_name: varchar("petitioner_name", { length: 50 }), // 信访人姓名
    petitioner_contact: varchar("petitioner_contact", { length: 50 }), // 联系方式
    // 状态: pending(待处理), analyzing(AI分析中), confirmed(已确认), processing(处理中), completed(已完成)
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    current_step: integer("current_step").notNull().default(1), // 当前步骤 1-5
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("petition_cases_case_number_idx").on(table.case_number),
    index("petition_cases_source_idx").on(table.source),
    index("petition_cases_status_idx").on(table.status),
    index("petition_cases_created_by_idx").on(table.created_by),
    index("petition_cases_created_at_idx").on(table.created_at),
  ]
);

// ==================== AI分析结果表 ====================
export const analysisResults = pgTable(
  "analysis_results",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => petitionCases.id),
    // 诉求列表 [{id, content, type, confirmed}]
    appeals: jsonb("appeals").notNull().$type<Array<{
      id: string;
      content: string;
      type: string;
      confirmed: boolean;
      user_modified: boolean;
    }>>(),
    // 关键信息 {time, location, departments, events, ...}
    key_info: jsonb("key_info").notNull().$type<{
      time?: string;
      location?: string;
      departments?: string[];
      events?: string[];
      [key: string]: string | string[] | undefined;
    }>(),
    // AI原始响应
    ai_raw_response: text("ai_raw_response"),
    // 用户是否已确认
    user_confirmed: boolean("user_confirmed").default(false).notNull(),
    confirmed_by: varchar("confirmed_by", { length: 36 }).references(() => users.id),
    confirmed_at: timestamp("confirmed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("analysis_results_case_id_idx").on(table.case_id),
    index("analysis_results_confirmed_by_idx").on(table.confirmed_by),
  ]
);

// ==================== 流程指引记录表 ====================
export const processGuides = pgTable(
  "process_guides",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => petitionCases.id),
    // 流程步骤 [{step, title, description, deadline, completed}]
    steps: jsonb("steps").notNull().$type<Array<{
      step: number;
      title: string;
      description: string;
      deadline?: string;
      completed: boolean;
    }>>(),
    // 相关法规引用
    regulations: jsonb("regulations").$type<Array<{
      name: string;
      article: string;
      content: string;
    }>>(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("process_guides_case_id_idx").on(table.case_id),
  ]
);

// ==================== 文书模板使用记录表 ====================
export const documentTemplates = pgTable(
  "document_templates",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(), // 受理告知书, 答复意见书, etc.
    source_type: varchar("source_type", { length: 30 }), // 适用来源类型，null表示通用
    template_content: text("template_content").notNull(),
    // 占位符说明 [{key, description, required}]
    placeholders: jsonb("placeholders").$type<Array<{
      key: string;
      description: string;
      required: boolean;
    }>>(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("document_templates_category_idx").on(table.category),
    index("document_templates_source_type_idx").on(table.source_type),
  ]
);

// ==================== 生成的文书表 ====================
export const generatedDocuments = pgTable(
  "generated_documents",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => petitionCases.id),
    template_id: varchar("template_id", { length: 36 }).references(() => documentTemplates.id),
    document_type: varchar("document_type", { length: 50 }).notNull(), // 文书类型
    content: text("content").notNull(), // 生成的文书内容
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("generated_documents_case_id_idx").on(table.case_id),
    index("generated_documents_template_id_idx").on(table.template_id),
    index("generated_documents_created_by_idx").on(table.created_by),
  ]
);

// ==================== 文书检查结果表 ====================
export const documentChecks = pgTable(
  "document_checks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    case_id: varchar("case_id", { length: 36 }).notNull().references(() => petitionCases.id),
    document_url: varchar("document_url", { length: 500 }).notNull(), // 上传文书的存储key
    // 检查结果
    check_result: jsonb("check_result").notNull().$type<{
      program_compliance: {
        passed: boolean;
        issues: string[];
      };
      format_compliance: {
        passed: boolean;
        issues: string[];
      };
      content_completeness: {
        passed: boolean;
        issues: string[];
        coverage: number; // 诉求覆盖率
      };
    }>(),
    // 问题列表
    issues: jsonb("issues").notNull().$type<Array<{
      type: string; // program, format, content
      severity: string; // error, warning, info
      description: string;
      suggestion: string;
    }>>(),
    // 改进建议
    suggestions: jsonb("suggestions").$type<string[]>(),
    passed: boolean("passed").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("document_checks_case_id_idx").on(table.case_id),
    index("document_checks_passed_idx").on(table.passed),
  ]
);

// ==================== 操作日志表 ====================
export const operationLogs = pgTable(
  "operation_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(), // login, create_case, analyze, confirm, generate_doc, check_doc, etc.
    case_id: varchar("case_id", { length: 36 }).references(() => petitionCases.id),
    details: jsonb("details"), // 操作详情
    ip_address: varchar("ip_address", { length: 45 }),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("operation_logs_user_id_idx").on(table.user_id),
    index("operation_logs_action_idx").on(table.action),
    index("operation_logs_case_id_idx").on(table.case_id),
    index("operation_logs_created_at_idx").on(table.created_at),
  ]
);

// ==================== 指引文件表 ====================
export const guidelineDocs = pgTable(
  "guideline_docs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(), // 法规, 流程, 口径, etc.
    source_type: varchar("source_type", { length: 30 }), // 适用来源类型
    content: text("content"),
    file_url: varchar("file_url", { length: 500 }), // 文件存储key
    file_name: varchar("file_name", { length: 200 }),
    is_active: boolean("is_active").default(true).notNull(),
    created_by: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("guideline_docs_category_idx").on(table.category),
    index("guideline_docs_source_type_idx").on(table.source_type),
    index("guideline_docs_created_by_idx").on(table.created_by),
  ]
);

// 系统健康检查表（必须保留）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 类型导出
export type User = typeof users.$inferSelect;
export type PetitionCase = typeof petitionCases.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type ProcessGuide = typeof processGuides.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type DocumentCheck = typeof documentChecks.$inferSelect;
export type OperationLog = typeof operationLogs.$inferSelect;
export type GuidelineDoc = typeof guidelineDocs.$inferSelect;
