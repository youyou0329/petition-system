import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { KnowledgeClient } from "coze-coding-dev-sdk";

// 生成流程指引
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
    // 从知识库检索相关指引
    const knowledgeClient = new KnowledgeClient(new Config());
    const searchQuery = `${caseData.source} 信访处理流程 时限要求`;
    
    const searchResult = await knowledgeClient.search(searchQuery, undefined, 5, 0.5);
    
    let knowledgeContext = "";
    if (searchResult.code === 0 && searchResult.chunks && searchResult.chunks.length > 0) {
      knowledgeContext = searchResult.chunks
        .map((chunk: { content: string }) => chunk.content)
        .join("\n\n");
    }

    // 调用 AI 生成流程指引
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(new Config(), customHeaders);

    const systemPrompt = `你是一位信访工作流程专家，负责根据信访件信息生成详细的处理流程指引。

根据信访来源和诉求情况，你需要：
1. 明确办理流程步骤
2. 标注每个步骤的时限要求
3. 引用相关法规依据

输出格式要求（JSON）：
{
  "steps": [
    {
      "step": 1,
      "title": "步骤名称",
      "description": "详细说明",
      "deadline": "时限要求（如有）",
      "completed": false
    }
  ],
  "regulations": [
    {
      "name": "法规名称",
      "article": "条款",
      "content": "具体内容"
    }
  ]
}`;

    const userPrompt = `请为以下信访件生成处理流程指引：

信访来源：${caseData.source}
是否需要书面答复：${caseData.requires_written_response ? "是" : "否"}

诉求要点：
${(analysisData.appeals as Array<{ content: string }>).map((a, i) => `${i + 1}. ${a.content}`).join("\n")}

关键信息：
${JSON.stringify(analysisData.key_info, null, 2)}

${knowledgeContext ? `参考指引：\n${knowledgeContext}` : ""}

请生成详细的处理流程指引。`;

    const response = await llmClient.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "doubao-seed-1-8-251228", temperature: 0.3 }
    );

    // 解析响应
    let guideResult;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guideResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("解析失败");
      }
    } catch {
      // 默认流程
      const hasWrittenResponse = caseData.requires_written_response || caseData.source === "信访信息系统";
      
      if (hasWrittenResponse) {
        guideResult = {
          steps: [
            { step: 1, title: "受理登记", description: "收到信访件后进行登记", deadline: "收到之日起15日内", completed: false },
            { step: 2, title: "调查核实", description: "对信访事项进行调查核实", deadline: "根据实际情况", completed: false },
            { step: 3, title: "研究处理意见", description: "研究确定处理意见", deadline: "", completed: false },
            { step: 4, title: "制作答复意见书", description: "根据调查结果制作书面答复", deadline: "", completed: false },
            { step: 5, title: "送达并告知救济权利", description: "送达答复意见书并告知救济权利", deadline: "60日内办结", completed: false },
          ],
          regulations: [
            { name: "信访工作条例", article: "第三十三条", content: "信访事项应当自受理之日起60日内办结" },
          ],
        };
      } else {
        guideResult = {
          steps: [
            { step: 1, title: "平台登记", description: "在相关平台进行登记处理", deadline: "1个工作日", completed: false },
            { step: 2, title: "核实情况", description: "核实信访事项基本情况", deadline: "根据平台要求", completed: false },
            { step: 3, title: "平台答复", description: "通过平台规范答复", deadline: "", completed: false },
          ],
          regulations: [],
        };
      }
    }

    // 保存流程指引
    const { data: savedGuide, error: saveError } = await client
      .from("process_guides")
      .upsert(
        {
          case_id: id,
          steps: guideResult.steps || [],
          regulations: guideResult.regulations || [],
        },
        { onConflict: "case_id" }
      )
      .select()
      .single();

    if (saveError) {
      throw new Error("保存流程指引失败");
    }

    // 更新信访件状态
    await client
      .from("petition_cases")
      .update({ current_step: 4 })
      .eq("id", id);

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "generate_guide",
      case_id: id,
      details: { step_count: guideResult.steps?.length || 0 },
    });

    return NextResponse.json({ guide: savedGuide });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 获取流程指引
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
    .from("process_guides")
    .select("*")
    .eq("case_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ guide: data });
}
