import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, updateUser } from "@/lib/auth";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 修改用户角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // 验证角色值
    if (!["admin", "user", "viewer"].includes(role)) {
      return NextResponse.json({ error: "无效的角色类型" }, { status: 400 });
    }

    // 不能修改自己的角色
    if (id === user.id) {
      return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
    }

    // 检查用户是否存在
    const { data: existingUser, error: fetchError } = await client
      .from("users")
      .select("id, username")
      .eq("id", id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 更新用户角色
    const { error: updateError } = await client
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("更新用户失败:", updateError);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "update_user_role",
      details: {
        target_user_id: id,
        target_username: existingUser.username,
        new_role: role,
      },
    });

    return NextResponse.json({ success: true, message: "角色已更新" });
  } catch (error) {
    console.error("修改用户角色失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { id } = await params;

    // 不能删除自己
    if (id === user.id) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    // 检查用户是否存在
    const { data: existingUser, error: fetchError } = await client
      .from("users")
      .select("id, username, real_name")
      .eq("id", id)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 删除用户
    const { error: deleteError } = await client
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("删除用户失败:", deleteError);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    // 记录操作日志
    await client.from("operation_logs").insert({
      user_id: user.id,
      action: "delete_user",
      details: {
        deleted_user_id: id,
        deleted_username: existingUser.username,
        deleted_real_name: existingUser.real_name,
      },
    });

    return NextResponse.json({ success: true, message: "用户已删除" });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
