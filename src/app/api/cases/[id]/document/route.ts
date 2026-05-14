import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { KnowledgeClient } from "coze-coding-dev-sdk";

// 严格模板类文书（不发挥，只填充占位符）
const STRICT_TEMPLATES = [
  "告知书",
  "信访事项受理告知书",
  "信访事项不予受理告知书",
  "延期办理告知书",
];

// 救济途径口径
const RELIEF_PATHS = {
  city: `如对本答复不服，可以在收到本答复之日起60日内向威海市人民政府（威海市统一路406号）申请行政复议，或者在6个月内向人民法院（威海市辖区内基层法院均可）提起行政诉讼。`,
  district1: `如对本答复不服，可以在收到本答复之日起60日内向威海市人民政府（威海市统一路406号）或者当地人民政府申请行政复议，或者在6个月内向人民法院（威海市辖区内基层法院均可）提起行政诉讼。`,
  district2: `如对本答复不服，可以在收到本答复之日起60日内向威海市人民政府（威海市统一路406号）申请行政复议，或者在6个月内向人民法院（威海市辖区内基层法院均可）提起行政诉讼。`,
};

// 损害赔偿民事诉讼提示
const COMPENSATION_CLAUSE = `如您对污染损害赔偿问题答复不服，继续主张赔（补）偿，可根据《中华人民共和国民法典》第七编侵权责任、《最高人民法院关于审理生态环境侵权责任纠纷案件适用法律若干问题的解释》（法释〔2023〕5号）以及《最高人民法院关于生态环境侵权民事诉讼证据的若干规定》（法释〔2023〕6号）等向人民法院提起民事诉讼。`;

// 检查是否包含损害赔偿诉求
function hasCompensationClaim(appeals: Array<{ content: string }>): boolean {
  const keywords = ["赔偿", "补偿", "损失", "损害"];
  return appeals.some((appeal) =>
    keywords.some((keyword) => appeal.content.includes(keyword))
  );
}

// 生成严格模板文书（只填充占位符，不发挥）
function generateStrictDocument(
  template: string,
  caseData: {
    case_number: string;
    petitioner_name: string | null;
    raw_content: string;
  },
  analysisData: {
    appeals: Array<{ content: string }>;
    key_info: Record<string, unknown>;
  }
): string {
  let content = template;

  // 获取诉求摘要
  const appealSummary = analysisData.appeals
    .map((a) => a.content)
    .join("；");

  // 替换常见占位符
  const replacements: Record<string, string> = {
    "××": caseData.petitioner_name || "××",
    "×××": caseData.petitioner_name || "×××",
    "xxxx": new Date().getFullYear().toString(),
    "××××": new Date().getFullYear().toString(),
    "信访人姓名": caseData.petitioner_name || "××",
    "信访事项": appealSummary || "信访事项",
    "问题概述": appealSummary || "问题概述",
    "反映问题": appealSummary || "反映问题",
  };

  // 按长度排序，先替换长的占位符
  const sortedKeys = Object.keys(replacements).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    content = content.split(key).join(replacements[key]);
  }

  return content;
}

// 生成文书模板
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { document_type } = body;

  const client = getSupabaseClient();

  // 获取信访件信息
  const { data: caseData } = await client
    .from("petition_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!caseData) {
    return NextResponse.json({ error: "信访件不存在" }, { status: 404 });
  }

  // 获取分析结果
  const { data: analysisData } = await client
    .from("analysis_results")
    .select("*")
    .eq("case_id", id)
    .maybeSingle();

  if (!analysisData) {
    return NextResponse.json({ error: "请先完成诉求分析" }, { status: 400 });
  }

  try {
    const documentType = document_type || "投诉（举报）处理情况告知书";

    // 先从数据库获取模板
    const { data: templateData } = await client
      .from("document_templates")
      .select("*")
      .eq("name", documentType)
      .eq("is_active", true)
      .maybeSingle();

    let templateContent = templateData?.template_content || "";

    // 如果数据库没有模板，从知识库检索
    if (!templateContent) {
      const knowledgeClient = new KnowledgeClient(new Config());
      const searchQuery = `${documentType} 模板`;

      const searchResult = await knowledgeClient.search(
        searchQuery,
        undefined,
        3,
        0.5
      );

      if (
        searchResult.code === 0 &&
        searchResult.chunks &&
        searchResult.chunks.length > 0
      ) {
        templateContent = searchResult.chunks
          .map((chunk: { content: string }) => chunk.content)
          .join("\n\n");
      }
    }

    let generatedContent: string;

    // 判断是否为严格模板
    if (STRICT_TEMPLATES.includes(documentType)) {
      // 严格模板：只填充占位符，不发挥
      generatedContent = generateStrictDocument(
        templateContent,
        caseData,
        analysisData as { appeals: Array<{ content: string }>; key_info: Record<string, unknown> }
      );
    } else {
      // 答复类文书：调用AI生成
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const llmClient = new LLMClient(new Config(), customHeaders);

      // 检查是否有损害赔偿诉求
      const hasCompensation = hasCompensationClaim(
        analysisData.appeals as Array<{ content: string }>
      );

      // 构建救济途径说明
      let reliefInstruction = `【救济途径统一口径】
根据答复单位选择对应的救济途径表述：

1. 以市局名义答复：
"${RELIEF_PATHS.city}"

2. 环翠、文登、荣成、乳山分局以分局名义答复：
"${RELIEF_PATHS.district1}"

3. 高区、经区、临港分局以分局名义答复：
"${RELIEF_PATHS.district2}"`;

      // 如果有损害赔偿诉求，添加民事诉讼提示
      if (hasCompensation) {
        reliefInstruction += `

【损害赔偿诉求特别提示】
如诉求中包含损害赔偿要求，在救济途径后必须加上以下内容：
"${COMPENSATION_CLAUSE}"`;
      }

      const systemPrompt = `你是一位信访文书写作专家，负责根据信访信息生成规范的文书。

文书要求：
1. 格式规范，符合信访工作条例要求
2. 内容完整，逐条回应信访人诉求
3. 语言规范，表述清晰准确
4. 结构合理，逻辑清晰

文书应包含以下部分：
- 标题
- 信访人信息
- 信访事项
- 调查处理情况（逐条回应诉求）
- 处理意见
- 落款（单位名称、日期）
- 告知救济权利

${reliefInstruction}`;

      const userPrompt = `请为以下信访件生成${documentType}：

信访编号：${caseData.case_number}
信访来源：${caseData.source}
信访人：${caseData.petitioner_name || "不详"}
联系方式：${caseData.petitioner_contact || "不详"}

信访件原文：
${caseData.raw_content}

诉求要点：
${(analysisData.appeals as Array<{ content: string }>)
  .map((a, i) => `${i + 1}. ${a.content}`)
  .join("\n")}

关键信息：
${JSON.stringify(analysisData.key_info, null, 2)}

${templateContent ? `参考模板：\n${templateContent}` : ""}

请生成完整的${documentType}，要求：
1. 逐条回应每个诉求
2. 内容具体、有据可依
3. 按照救济途径统一口径告知救济权利`;

      const response = await llmClient.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { model: "doubao-seed-1-8-251228", temperature: 0.3 }
      );

      generatedContent = response.content;
    }

    // 保存生成的文书
    const { data: savedDoc, error: saveError } = await client
      .from("generated_documents")
      .insert({
        case_id: id,
        document_type: documentType,
        content: generatedContent,
        created_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error("保存文书失败");
    }

    // 更新信访件状态
    await client
      .from("petition_cases")
      .update({ current_step: 5, status: "processing" })
      .eq("id", id);

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "generate_document",
      case_id: id,
      details: { document_type: documentType },
    });

    return NextResponse.json({ document: savedDoc });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 获取已生成的文书列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("generated_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}
