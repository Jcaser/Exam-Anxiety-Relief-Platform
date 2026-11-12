import { NextRequest } from "next/server";
import { userFromRequest, getSettings, saveDiaryPassword, verifyPassword } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 日记锁状态：是否已设置密码（每用户一把锁，存在数据库里） */
export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });
  const s = getSettings(user.id);
  return Response.json({ has: !!s?.diary_pw_hash });
}

/** 验证日记密码 */
export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pwd = String(body?.pwd || "");
  const s = getSettings(user.id);
  if (!s?.diary_pw_hash)
    return Response.json({ ok: true, fresh: true }); // 还没设过，直接放行去设置

  if (!verifyPassword(pwd, s.diary_pw_salt, s.diary_pw_hash))
    return Response.json({ error: "密码不对，再试试？" }, { status: 401 });
  return Response.json({ ok: true });
}

/** 设置 / 重置日记密码（已登录身份即可重置——忘记密码不再找不回） */
export async function PUT(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pwd = String(body?.pwd || "");
  if (pwd.length < 4)
    return Response.json({ error: "密码至少 4 位，保护你的小秘密 🔒" }, { status: 400 });

  saveDiaryPassword(user.id, pwd);
  return Response.json({ ok: true });
}
