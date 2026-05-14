import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// AI 分析信访诉求
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const client = getSupabaseClient();

  // 获取信访件信息
  const { data: caseData, error: caseError } = await client
    .from("petition_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (caseError || !caseData) {
    return NextResponse.json({ error: "信访件不存在" }, { status: 404 });
  }

  // 权限检查
  if (user.role !== "admin" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // 更新状态为分析中
  await client
    .from("petition_cases")
    .update({ status: "analyzing" })
    .eq("id", id);

  try {
    // 调用 AI 分析
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位专业的信访工作分析专家，负责分析信访件并提取关键信息。

请仔细阅读信访件内容，完成以下分析任务：

1. **诉求类型识别**：判断本次信访是"投诉"还是"举报"
   - 投诉：信访人反映自身权益受到侵害，要求维护自身合法权益（如噪音扰民、污染影响生活等）
   - 举报：信访人举报他人或企业的违法违规行为，与自身无直接利害关系（如举报企业偷排、举报违规项目等）
   - 如果难以区分，默认为"投诉"

2. **诉求提取**：识别信访人的所有诉求，每个诉求应该是独立、具体的

3. **诉求分类**：判断每个诉求的类型（咨询类、投诉类、建议类、求助类、其他）

4. **关键信息提取**：提取信访件中的关键信息，包括时间、地点、涉及部门、事件经过等

输出要求：
- 客观准确，不要遗漏任何诉求
- 诉求表述要简洁明确
- 关键信息要完整

请以 JSON 格式输出，格式如下：
{
  "request_type": "投诉或举报",
  "appeals": [
    {
      "id": "appeal_1",
      "content": "诉求内容",
      "type": "诉求类型"
    }
  ],
  "key_info": {
    "time": "相关时间",
    "location": "相关地点",
    "departments": ["涉及部门1", "涉及部门2"],
    "events": ["事件经过要点1", "事件经过要点2"]
  }
}`;

    const userPrompt = `请分析以下信访件内容：

信访来源：${caseData.source}
信访人：${caseData.petitioner_name || "未知"}
联系方式：${caseData.petitioner_contact || "未知"}

信访件原文：
${caseData.raw_content}

请提取诉求和关键信息，以 JSON 格式输出。`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const response = await llmClient.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

    // 解析 AI 响应
    let analysisResult;
    try {
      // 提取 JSON 部分
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI 响应格式错误");
      }
    } catch {
      // 如果解析失败，创建默认结构
      analysisResult = {
        appeals: [
          {
            id: "appeal_1",
            content: "请查看原文获取具体诉求",
            type: "其他",
          },
        ],
        key_info: {
          time: "",
          location: "",
          departments: [],
          events: [],
        },
      };
    }

    // 为每个诉求添加 confirmed 和 user_modified 字段
    const appeals = (analysisResult.appeals || []).map((appeal: { id: string; content: string; type: string }) => ({
      ...appeal,
      confirmed: true,
      user_modified: false,
    }));

    // 获取诉求类型（投诉/举报）
    const requestType = analysisResult.request_type || "投诉";

    // 保存分析结果
    const { data: savedResult, error: saveError } = await client
      .from("analysis_results")
      .upsert(
        {
          case_id: id,
          appeals,
          key_info: analysisResult.key_info || {},
          ai_raw_response: response.content,
          user_confirmed: false,
          request_type: requestType,
        },
        { onConflict: "case_id" }
      )
      .select()
      .single();

    if (saveError) {
      throw new Error("保存分析结果失败");
    }

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "analyze_case",
      case_id: id,
      details: { appeal_count: appeals.length },
    });

    return NextResponse.json({
      success: true,
      analysis: savedResult,
    });
  } catch (error) {
    // 恢复状态
    await client
      .from("petition_cases")
      .update({ status: "pending" })
      .eq("id", id);

    const errorMessage = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
