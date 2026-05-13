import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { KnowledgeClient } from "coze-coding-dev-sdk";

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
  const { document_type } = body; // 答复意见书, 受理告知书, etc.

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
    // 从知识库检索模板
    const knowledgeClient = new KnowledgeClient(new Config());
    const searchQuery = `${document_type || "答复意见书"} 模板`;
    
    const searchResult = await knowledgeClient.search(searchQuery, undefined, 3, 0.5);
    
    let templateContext = "";
    if (searchResult.code === 0 && searchResult.chunks && searchResult.chunks.length > 0) {
      templateContext = searchResult.chunks
        .map((chunk: { content: string }) => chunk.content)
        .join("\n\n");
    }

    // 调用 AI 生成文书
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(new Config(), customHeaders);

    const documentType = document_type || "投诉/举报事项答复函";

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
- 告知救济权利`;

    const userPrompt = `请为以下信访件生成${documentType}：

信访编号：${caseData.case_number}
信访来源：${caseData.source}
信访人：${caseData.petitioner_name || "不详"}
联系方式：${caseData.petitioner_contact || "不详"}

信访件原文：
${caseData.raw_content}

诉求要点：
${(analysisData.appeals as Array<{ content: string }>).map((a, i) => `${i + 1}. ${a.content}`).join("\n")}

关键信息：
${JSON.stringify(analysisData.key_info, null, 2)}

${templateContext ? `参考模板：\n${templateContext}` : ""}

请生成完整的${documentType}，要求：
1. 逐条回应每个诉求
2. 内容具体、有据可依
3. 告知救济权利和时限`;

    const response = await llmClient.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "doubao-seed-1-8-251228", temperature: 0.3 }
    );

    // 保存生成的文书
    const { data: savedDoc, error: saveError } = await client
      .from("generated_documents")
      .insert({
        case_id: id,
        document_type: documentType,
        content: response.content,
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
