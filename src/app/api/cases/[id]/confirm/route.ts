import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";

// 确认分析结果
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
  const { appeals, key_info } = body;

  const client = getSupabaseClient();

  // 检查权限
  const { data: caseData } = await client
    .from("petition_cases")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  if (!caseData) {
    return NextResponse.json({ error: "信访件不存在" }, { status: 404 });
  }

  if (user.role !== "admin" && caseData.created_by !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  // 更新分析结果
  const { error: updateError } = await client
    .from("analysis_results")
    .update({
      appeals,
      key_info,
      user_confirmed: true,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("case_id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 更新信访件状态
  await client
    .from("petition_cases")
    .update({
      status: "confirmed",
      current_step: 3,
    })
    .eq("id", id);

  // 记录操作日志
  await client.from("operation_logs").insert({
    user_id: user.id,
    action: "confirm_analysis",
    case_id: id,
    details: { appeal_count: appeals.length },
  });

  return NextResponse.json({ success: true });
}
