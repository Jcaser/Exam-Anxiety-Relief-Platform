import { NextRequest } from "next/server";
import { db, hashPassword, createSession, sessionCookie } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 找回密码：输入用户名即可重置（小岛是自助工具，不做邮件验证）。
 * 重置成功即视为重新登录。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username: string = String(body?.username || "").trim();
  const password: string = String(body?.password || "");

  if (password.length < 6)
    return Response.json({ error: "新密码至少 6 位 🔒" }, { status: 400 });

  const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as any;
  if (!user)
    return Response.json({ error: "没有找到这座岛，检查一下用户名？" }, { status: 404 });

  const { hash, salt } = hashPassword(password);
  db.prepare("UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?").run(hash, salt, user.id);

  // 踢掉旧会话
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

  const { token, maxAge } = createSession(user.id);
  return Response.json(
    { ok: true, username },
    { headers: { "Set-Cookie": sessionCookie(token, maxAge) } }
  );
}
