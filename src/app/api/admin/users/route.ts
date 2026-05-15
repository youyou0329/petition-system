import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyAuth, hashPassword } from "@/lib/auth";

// 获取用户列表
export async function GET(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 只有管理员可以访问
  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const search = searchParams.get("search") || "";

  let query = client
    .from("users")
    .select("id, username, real_name, role, department, created_at, last_login", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(`username.ilike.%${search}%,real_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: data,
    total: count,
    page,
    pageSize,
  });
}

// 创建用户
export async function POST(request: NextRequest) {
  const user = await verifyAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await request.json();
  const { username, password, real_name, role, department } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 检查用户名是否已存在
  const { data: existingUser } = await client
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
  }

  // 创建用户 - 密码需要加密
  const passwordHash = await hashPassword(password);
  const { data, error } = await client
    .from("users")
    .insert({
      username,
      password_hash: passwordHash,
      real_name,
      role: role || "user",
      department,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 记录操作日志
  await client.from("operation_logs").insert({
    user_id: user.id,
    action: "create_user",
    details: { username, real_name, role },
  });

  return NextResponse.json({ user: data });
}
