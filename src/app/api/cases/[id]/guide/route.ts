import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";

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
    // 从数据库检索相关指引文件
    const { data: guidelineDocs } = await client
      .from("guideline_docs")
      .select("title, content")
      .eq("is_active", true)
      .or(`title.ilike.%${caseData.source}%,content.ilike.%${caseData.source}%`);

    let knowledgeContext = "";
    if (guidelineDocs && guidelineDocs.length > 0) {
      knowledgeContext = guidelineDocs
        .map((doc: { title: string; content: string }) => `【${doc.title}】\n${doc.content}`)
        .join("\n\n");
    }

    // 根据信访来源生成流程指引
    let guideResult;

    if (caseData.source === "信访信息系统") {
      // 信访信息系统：标准流程
      guideResult = {
        steps: [
          { step: 1, title: "受理登记", description: "收到信访件后进行登记，出具受理告知书", deadline: "收到之日起15日内", completed: false },
          { step: 2, title: "调查核实", description: "对信访事项进行调查核实，收集相关证据", deadline: "", completed: false },
          { step: 3, title: "制作答复意见书", description: "按照模板制作书面答复，逐条回应诉求要点", deadline: "", completed: false },
          { step: 4, title: "送达答复", description: "送达答复意见书，告知救济途径", deadline: "受理之日起60日内办结", completed: false },
        ],
        regulations: [
          { name: "信访工作条例", article: "第三十四条", content: "应当自受理之日起60日内办结；情况复杂的，经本机关、单位负责人批准，可以适当延长办理期限，但延长期限不得超过30日" },
        ],
        deadline_info: {
          main_deadline: "受理之日起60日内办结",
          accept_deadline: "收到之日起15日内受理",
        },
      };
    } else if (caseData.source === "首问负责制") {
      guideResult = {
        steps: [
          { step: 1, title: "登记受理", description: "在首问负责制平台登记信访事项，如不在职责范围则进行回退", deadline: "", completed: false },
          { step: 2, title: "调查处理", description: "对反映问题进行调查核实并处理", deadline: "", completed: false },
          { step: 3, title: "答复反馈", description: "针对反映问题逐条明确答复，在平台提交办理情况", deadline: "20个工作日内", completed: false },
        ],
        regulations: [],
        deadline_info: {
          main_deadline: "20个工作日",
          return_deadline: "不在职责范围内的，收到转办件后2个工作日内回退",
        },
      };
    } else if (caseData.source === "12345热线") {
      guideResult = {
        steps: [
          { step: 1, title: "签收工单", description: "在12345平台签收转办工单，如不在职责范围则进行回退", deadline: "", completed: false },
          { step: 2, title: "核实处理", description: "核实信访事项，处理来电人诉求", deadline: "", completed: false },
          { step: 3, title: "平台答复", description: "在平台提交答复内容，报送市局环境信访内网账号", deadline: "7个自然日内", completed: false },
        ],
        regulations: [],
        deadline_info: {
          main_deadline: "7个自然日",
        },
      };
    } else if (caseData.source === "全国生态环境信访投诉举报管理平台") {
      guideResult = {
        steps: [
          { step: 1, title: "确认职责归属", description: "确认投诉举报事项是否属于本部门职责范围，如不属于则附上明确依据进行回退", deadline: "收到转办件后15个自然日内", completed: false },
          { step: 2, title: "平台点击受理", description: "如属于本部门职责，在平台上点击受理（注意：60日办理时限从点击受理之日起算）", deadline: "", completed: false },
          { step: 3, title: "调查处理", description: "对举报问题进行调查核实，依法处理违法行为，督促整改落实", deadline: "", completed: false },
          { step: 4, title: "平台反馈", description: "在平台提交办理情况，上传整改前后对比照片", deadline: "自点击受理之日起60个自然日内", completed: false },
        ],
        regulations: [],
        deadline_info: {
          main_deadline: "自点击受理之日起60个自然日内回复",
          accept_deadline: "收到转办件后15个自然日内确认职责并点击受理",
          return_deadline: "不在职责范围内的，收到转办件后2个工作日内回退",
        },
      };
    } else {
      // 其他来源（书面答复要求时）
      guideResult = {
        steps: [
          { step: 1, title: "受理登记", description: "收到信访件后进行登记", deadline: "", completed: false },
          { step: 2, title: "调查核实", description: "对信访事项进行调查核实", deadline: "", completed: false },
          { step: 3, title: "制作答复函", description: "按照模板制作投诉/举报处理情况告知书", deadline: "", completed: false },
          { step: 4, title: "送达答复", description: "将答复函送达信访人", deadline: "60日内", completed: false },
        ],
        regulations: [],
      };
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
