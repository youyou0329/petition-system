import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";
import { callLLM, checkLLMConfig } from "@/lib/llm-client";

// 文书检查
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const documentContent = formData.get("content") as string | null;

  if (!file && !documentContent) {
    return NextResponse.json(
      { error: "请上传文件或提供文书内容" },
      { status: 400 }
    );
  }

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

  // 获取已生成的文书作为参考
  const { data: generatedDocs } = await client
    .from("generated_documents")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  let fileUrl: string | null = null;
  let contentToCheck = documentContent;

  try {
    // 如果上传了文件，读取内容
    if (file) {
      // 对于文本文件，直接读取
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        contentToCheck = await file.text();
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        // 对于 docx 文件，提示用户复制内容
        return NextResponse.json({
          error: "请将 Word 文档内容复制粘贴到文本框中进行检查，暂不支持直接上传 docx 文件"
        }, { status: 400 });
      }
    }

    // 检查 LLM 配置
    const llmConfig = checkLLMConfig();
    if (!llmConfig.configured) {
      return NextResponse.json({ error: llmConfig.error }, { status: 500 });
    }

    // 判断是否需要出具文书（信访信息系统必须出具）
    const requiresDocument = caseData.source === "信访信息系统";
    
    // 判断是否有经济赔偿等诉求（需要检查救济途径）
    const appeals = analysisData?.appeals as Array<{ content: string; type?: string }> || [];
    const hasCompensationAppeal = appeals.some(a => 
      a.content.includes("赔偿") || 
      a.content.includes("补偿") || 
      a.content.includes("经济损失") ||
      a.type === "求助类"
    );

    let systemPrompt = "";
    
    if (requiresDocument) {
      // 信访信息系统 - 完整检查标准
      systemPrompt = `你是一位信访工作审核专家，负责检查信访答复文书的合规性。

信访来源：信访信息系统（必须出具正式文书）

检查维度：
1. 程序合规
   - 是否符合受理时限要求（收到之日起15日内受理）
   - 是否在法定期限内答复（受理之日起60日内）
   - 是否遗漏必要的告知事项

2. 格式规范
   - 标题是否规范
   - 编号是否正确
   - 落款是否完整（单位名称、日期、盖章位置）
   - 整体格式是否符合信访文书规范

3. 内容完整
   - 是否逐条回应诉求要点
   - 是否存在答非所问的情况
   - 调查情况是否详实
   - 处理意见是否明确

4. 语言规范
   - 是否存在不当表述
   - 是否有错别字或语病
   - 是否告知了救济权利和时限（60日内申请复议，6个月内提起诉讼）

请以 JSON 格式返回检查结果：
{
  "passed": boolean,
  "score": number,
  "checks": [
    {
      "category": "程序合规|格式规范|内容完整|语言规范",
      "item": "检查项名称",
      "status": "pass|warning|fail",
      "message": "说明"
    }
  ],
  "issues": ["问题列表"],
  "suggestions": ["改进建议"],
  "summary": "整体评价"
}`;
    } else {
      // 首问负责制、12345热线、生态环境平台 - 简化检查标准
      systemPrompt = `你是一位信访工作审核专家，负责检查信访答复内容的合规性。

信访来源：${caseData.source}（无需出具正式文书，仅需平台答复）

检查标准：

1. 诉求回应
   - 是否针对反映问题逐条进行明确答复
   - 措辞是否得当、通俗易懂
   - 是否存在敷衍了事、语句不通、晦涩难懂的情况

2. 办理情况
   - 是否体现举报人所反映单位的规范全称
   - 是否说明反映问题是否属实
   - 是否描述现场查处情况及采取的措施
   - 是否说明是否整改完成
   - 如需整改：是否跟踪督导并上传整改前后对比照片
   - 如不在职责范围：是否明确描述核查情况及不属于职责范围的条文依据

${hasCompensationAppeal ? `3. 救济途径
   - 信访人提出了经济赔偿等诉求，需要检查是否告知了救济途径（如申请行政复议、提起行政诉讼等）` : ""}

请以 JSON 格式返回检查结果：
{
  "passed": boolean,
  "score": number,
  "checks": [
    {
      "category": "诉求回应|办理情况${hasCompensationAppeal ? "|救济途径" : ""}",
      "item": "检查项名称",
      "status": "pass|warning|fail",
      "message": "说明"
    }
  ],
  "issues": ["问题列表"],
  "suggestions": ["改进建议"],
  "summary": "整体评价"
}`;
    }

    const appealsList = analysisData?.appeals
      ? (analysisData.appeals as Array<{ content: string }>)
          .map((a, i) => `${i + 1}. ${a.content}`)
          .join("\n")
      : "暂无";

    const referenceDoc = generatedDocs?.[0]?.content || "";

    const userPrompt = `请检查以下信访答复文书：

信访编号：${caseData.case_number}
信访来源：${caseData.source}
信访人诉求：
${appealsList}

${referenceDoc ? `参考模板内容：\n${referenceDoc.substring(0, 1000)}...\n\n` : ""}
待检查的文书内容：
${contentToCheck || "（已上传文件，请告知用户复制文件内容进行检查）"}

请逐项检查并给出详细的检查报告。`;

    const response = await callLLM(systemPrompt, userPrompt);
    
    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    // 解析 AI 返回的 JSON
    let checkResult;
    try {
      // 尝试从返回内容中提取 JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        checkResult = JSON.parse(jsonMatch[0]);
      } else {
        checkResult = {
          passed: false,
          score: 0,
          checks: [],
          issues: ["无法解析检查结果"],
          suggestions: [],
          summary: response.content,
        };
      }
    } catch {
      checkResult = {
        passed: false,
        score: 0,
        checks: [],
        issues: ["检查结果解析失败"],
        suggestions: [],
        summary: response.content,
      };
    }

    // 保存检查结果
    const { data: savedCheck, error: saveError } = await client
      .from("document_checks")
      .insert({
        case_id: id,
        document_url: fileUrl,
        check_result: checkResult,
        issues: checkResult.issues || [],
        suggestions: checkResult.suggestions || [],
        passed: checkResult.passed || false,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error("保存检查结果失败");
    }

    // 更新信访件状态
    if (checkResult.passed) {
      await client
        .from("petition_cases")
        .update({ current_step: 5, status: "completed" })
        .eq("id", id);
    }

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "check_document",
      case_id: id,
      details: { passed: checkResult.passed, score: checkResult.score },
    });

    return NextResponse.json({ check: savedCheck, result: checkResult });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "检查失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 获取检查历史
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
    .from("document_checks")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checks: data });
}
