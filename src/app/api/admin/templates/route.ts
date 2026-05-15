import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth } from "@/lib/auth";

// 获取文书模板列表
export async function GET(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const category = searchParams.get("category") || "";

  let query = client
    .from("document_templates")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    templates: data,
    total: count,
    page,
    pageSize,
  });
}

// 添加文书模板
export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await request.json();
  const { name, category, template_content, placeholders } = body;

  if (!name || !template_content) {
    return NextResponse.json({ error: "名称和模板内容不能为空" }, { status: 400 });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from("document_templates")
    .insert({
      name,
      category,
      template_content,
      placeholders: placeholders || {},
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
    action: "create_template",
    details: { name, category },
  });

  return NextResponse.json({ template: data });
}

// 删除文书模板
export async function DELETE(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少ID" }, { status: 400 });
  }

  const client = getSupabaseClient();

  const { error } = await client.from("document_templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 记录操作日志
  await client.from("operation_logs").insert({
    user_id: user.id,
    action: "delete_template",
    details: { id },
  });

  return NextResponse.json({ success: true });
}
