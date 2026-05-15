import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { generateToken, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log("Login attempt for:", username);
    console.log("SUPABASE_URL set:", !!process.env.COZE_SUPABASE_URL);
    console.log("SUPABASE_KEY set:", !!process.env.COZE_SUPABASE_SERVICE_ROLE_KEY);

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 查询用户
    console.log("Querying database for user...");
    let user, error;
    try {
      const result = await client
        .from("users")
        .select("id, username, password_hash, real_name, role, department, is_active")
        .eq("username", username)
        .maybeSingle();
      user = result.data;
      error = result.error;
      console.log("Query result - user found:", !!user, "error:", error?.message);
    } catch (e) {
      console.error("Database query exception:", e);
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      );
    }

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "登录失败，请稍后重试" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "账户已被禁用，请联系管理员" },
        { status: 403 }
      );
    }

    // 验证密码
    const passwordHash = await hashPassword(password);
    console.log("Input password hash:", passwordHash);
    console.log("DB password hash:", user.password_hash);
    console.log("Hashes match:", passwordHash === user.password_hash);
    if (passwordHash !== user.password_hash) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await client
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    // 生成 token
    const token = generateToken(user.id);

    // 创建响应
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        role: user.role,
        department: user.department,
      },
    });

    // 设置 cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
