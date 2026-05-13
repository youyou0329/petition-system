import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import type { User } from "@/storage/database/shared/schema";

export interface AuthUser {
  id: string;
  username: string;
  real_name: string;
  role: string;
  department: string | null;
}

// 验证用户登录
export async function verifyAuth(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    // 解析 token (格式: userId:timestamp:hash)
    const parts = token.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const [userId] = parts;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from("users")
      .select("id, username, real_name, role, department")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as AuthUser;
  } catch {
    return null;
  }
}

// 生成简单的 token
export function generateToken(userId: string): string {
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}:${timestamp}:secret`).toString("base64").slice(0, 16);
  return `${userId}:${timestamp}:${hash}`;
}

// 密码哈希 (使用简单的 bcrypt 替代方案)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "petition_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 检查是否是管理员
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin";
}

// 获取用户列表 (管理员用)
export async function getUsers() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("users")
    .select("id, username, real_name, role, department, is_active, last_login, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`获取用户列表失败: ${error.message}`);
  }

  return data;
}

// 创建用户 (管理员用)
export async function createUser(userData: {
  username: string;
  password: string;
  real_name: string;
  role: string;
  department?: string;
}) {
  const client = getSupabaseClient();
  const passwordHash = await hashPassword(userData.password);

  const { data, error } = await client
    .from("users")
    .insert({
      username: userData.username,
      password_hash: passwordHash,
      real_name: userData.real_name,
      role: userData.role,
      department: userData.department || null,
    })
    .select("id, username, real_name, role, department, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("用户名已存在");
    }
    throw new Error(`创建用户失败: ${error.message}`);
  }

  return data;
}

// 更新用户信息
export async function updateUser(
  userId: string,
  userData: Partial<{
    real_name: string;
    role: string;
    department: string;
    is_active: boolean;
  }>
) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("users")
    .update({
      ...userData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, username, real_name, role, department, is_active")
    .single();

  if (error) {
    throw new Error(`更新用户失败: ${error.message}`);
  }

  return data;
}

// 修改密码
export async function changePassword(userId: string, newPassword: string) {
  const client = getSupabaseClient();
  const passwordHash = await hashPassword(newPassword);

  const { error } = await client
    .from("users")
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`修改密码失败: ${error.message}`);
  }
}
