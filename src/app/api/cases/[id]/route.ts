import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";

// 获取单个信访件详情
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

  // 获取信访件基本信息
  const { data: caseData, error: caseError } = await client
    .from("petition_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  if (!caseData) {
    return NextResponse.json({ error: "信访件不存在" }, { status: 404 });
  }

  // 权限检查：非管理员只能看自己创建的
  if (user.role !== "admin" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "无权限查看此信访件" }, { status: 403 });
  }

  // 获取分析结果
  const { data: analysisData } = await client
    .from("analysis_results")
    .select("*")
    .eq("case_id", id)
    .maybeSingle();

  // 获取流程指引
  const { data: guideData } = await client
    .from("process_guides")
    .select("*")
    .eq("case_id", id)
    .maybeSingle();

  // 获取生成的文书
  const { data: documentsData } = await client
    .from("generated_documents")
    .select("*")
    .eq("case_id", id);

  // 获取文书检查结果
  const { data: checkData } = await client
    .from("document_checks")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    case: caseData,
    analysis: analysisData,
    guide: guideData,
    documents: documentsData || [],
    check: checkData,
  });
}

// 更新信访件
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const client = getSupabaseClient();

  // 检查权限
  const { data: existingCase } = await client
    .from("petition_cases")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  if (!existingCase) {
    return NextResponse.json({ error: "信访件不存在" }, { status: 404 });
  }

  if (user.role !== "admin" && existingCase.created_by !== user.id) {
    return NextResponse.json({ error: "无权限修改此信访件" }, { status: 403 });
  }

  const { data, error } = await client
    .from("petition_cases")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 记录操作日志
  await client.from("operation_logs").insert({
    user_id: user.id,
    action: "update_case",
    case_id: id,
    details: body,
  });

  return NextResponse.json({ case: data });
}
