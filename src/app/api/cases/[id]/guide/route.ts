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
      // 根据信访来源生成默认流程
      const hasWrittenResponse = caseData.requires_written_response || caseData.source === "信访信息系统";
      
      if (caseData.source === "信访信息系统") {
        // 信访信息系统：标准流程
        guideResult = {
          steps: [
            { step: 1, title: "受理登记", description: "收到信访件后进行登记，出具受理告知书", deadline: "收到之日起15日内", completed: false },
            { step: 2, title: "调查核实", description: "对信访事项进行调查核实，收集相关证据", deadline: "根据实际情况", completed: false },
            { step: 3, title: "研究处理意见", description: "根据调查结果研究确定处理意见", deadline: "", completed: false },
            { step: 4, title: "制作答复意见书", description: "按照模板制作书面答复，逐条回应诉求要点", deadline: "", completed: false },
            { step: 5, title: "送达并告知救济权利", description: "送达答复意见书，告知复议、诉讼等救济途径", deadline: "受理之日起60日内办结", completed: false },
          ],
          regulations: [
            { name: "信访工作条例", article: "第三十四条", content: "应当自受理之日起60日内办结；情况复杂的，经本机关、单位负责人批准，可以适当延长办理期限，但延长期限不得超过30日" },
            { name: "信访工作条例", article: "第三十五条", content: "信访人对信访处理意见不服的，可以自收到书面答复之日起30日内请求原办理机关、单位的上一级机关、单位复查" },
          ],
          deadline_info: {
            main_deadline: "受理之日起60日内办结",
            return_deadline: undefined,
          },
        };
      } else if (caseData.source === "首问负责制") {
        guideResult = {
          steps: [
            { step: 1, title: "登记受理", description: "在首问负责制平台登记信访事项", deadline: "1个工作日", completed: false },
            { step: 2, title: "现场调查", description: "对反映问题进行现场核实调查", deadline: "根据实际情况", completed: false },
            { step: 3, title: "处理答复", description: "针对反映问题逐条明确答复，在平台提交办理情况", deadline: "20个工作日内", completed: false },
          ],
          regulations: [],
          deadline_info: {
            main_deadline: "20个工作日",
            return_deadline: "不在职责范围内的，2个工作日内回退",
          },
        };
      } else if (caseData.source === "12345热线") {
        guideResult = {
          steps: [
            { step: 1, title: "签收工单", description: "在12345平台签收转办工单", deadline: "1个工作日", completed: false },
            { step: 2, title: "核实处理", description: "核实信访事项，处理来电人诉求", deadline: "根据实际情况", completed: false },
            { step: 3, title: "平台答复", description: "在平台提交答复内容，报送市局环境信访内网账号", deadline: "7个自然日内", completed: false },
          ],
          regulations: [],
          deadline_info: {
            main_deadline: "7个自然日",
            return_deadline: "不在职责范围内的，1个工作日内回退",
          },
        };
      } else if (caseData.source === "全国生态环境信访投诉举报管理平台") {
        guideResult = {
          steps: [
            { step: 1, title: "确认职责归属", description: "确认投诉举报事项是否属于本部门职责范围", deadline: "收到转办件后15个自然日内", completed: false },
            { step: 2, title: "平台点击受理", description: "如属于本部门职责，在平台上点击受理", deadline: "确认后15个自然日内", completed: false },
            { step: 3, title: "现场核查", description: "对举报问题进行现场核查，拍照取证", deadline: "根据实际情况", completed: false },
            { step: 4, title: "处理整改", description: "依法处理违法行为，督促整改落实，上传整改前后对比照片", deadline: "根据实际情况", completed: false },
            { step: 5, title: "平台反馈", description: "在平台提交办理情况，逐条答复反映问题", deadline: "原则上60个自然日内", completed: false },
          ],
          regulations: [],
          deadline_info: {
            main_deadline: "原则上60个自然日内回复",
            accept_deadline: "15个自然日内确认是否属于本部门职责，若属于则在15个自然日内点击受理",
            return_deadline: "不在职责范围内的，收到转办件后2个工作日内附上明确依据进行回退",
          },
        };
      } else {
        // 其他来源（书面答复要求时）
        guideResult = {
          steps: [
            { step: 1, title: "受理登记", description: "收到信访件后进行登记", deadline: "1个工作日", completed: false },
            { step: 2, title: "调查核实", description: "对信访事项进行调查核实", deadline: "根据实际情况", completed: false },
            { step: 3, title: "制作答复函", description: "按照模板制作投诉/举报事项答复函", deadline: "", completed: false },
            { step: 4, title: "送达答复", description: "将答复函送达信访人", deadline: "60日内", completed: false },
          ],
          regulations: [
            { name: "生态环境信访工作办法", article: "第二十条", content: "应当自受理之日起60日内办结" },
          ],
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
