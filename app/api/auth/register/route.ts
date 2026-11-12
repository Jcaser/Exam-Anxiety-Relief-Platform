import { NextRequest } from "next/server";
import { db, hashPassword, createSession, sessionCookie, saveDiaryPassword } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username: string = String(body?.username || "").trim();
  const password: string = String(body?.password || "");
  const diaryPassword: string = String(body?.diaryPassword || "");

  if (username.length < 2 || username.length > 12)
    return Response.json({ error: "用户名需要 2–12 个字" }, { status: 400 });
  if (password.length < 6)
    return Response.json({ error: "登录密码至少 6 位，保护你的小岛 🔒" }, { status: 400 });
  if (diaryPassword.length < 4)
    return Response.json({ error: "日记密码至少 4 位，它只属于你" }, { status: 400 });

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exists)
    return Response.json({ error: "这个名字已经被一座岛注册啦，换一个试试" }, { status: 409 });

  const { hash, salt } = hashPassword(password);
  const info = db
    .prepare("INSERT INTO users (username, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?)")
    .run(username, hash, salt, Date.now());

  const userId = Number(info.lastInsertRowid);
  // 注册时一并设置「日记独立密码」（每用户隔离）
  saveDiaryPassword(userId, diaryPassword);

  const { token, maxAge } = createSession(userId);
  return Response.json(
    { ok: true, username },
    { headers: { "Set-Cookie": sessionCookie(token, maxAge) } }
  );
}
