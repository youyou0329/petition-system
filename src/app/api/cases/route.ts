import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";

// 获取信访件列表
export async function GET(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");

  let query = client
    .from("petition_cases")
    .select("id, case_number, source, requires_written_response, raw_content, petitioner_name, petitioner_contact, status, current_step, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // 非管理员只能看自己创建的
  if (user.role !== "admin") {
    query = query.eq("created_by", user.id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases: data });
}

// 创建信访件
export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { source, requires_written_response, raw_content, petitioner_name, petitioner_contact } = body;

  if (!source || !raw_content) {
    return NextResponse.json({ error: "来源和信访内容不能为空" }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 生成信访编号: XF + 年月日 + 4位序号
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  
  // 获取今日已有数量
  const { count } = await client
    .from("petition_cases")
    .select("*", { count: "exact", head: true })
    .like("case_number", `XF${dateStr}%`);

  const seq = String((count || 0) + 1).padStart(4, "0");
  const caseNumber = `XF${dateStr}${seq}`;

  const { data, error } = await client
    .from("petition_cases")
    .insert({
      case_number: caseNumber,
      source,
      requires_written_response: requires_written_response || false,
      raw_content,
      petitioner_name: petitioner_name || null,
      petitioner_contact: petitioner_contact || null,
      status: "pending",
      current_step: 1,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 记录操作日志
  await client.from("operation_logs").insert({
    user_id: user.id,
    action: "create_case",
    case_id: data.id,
    details: { case_number: caseNumber, source },
  });

  return NextResponse.json({ case: data });
}
