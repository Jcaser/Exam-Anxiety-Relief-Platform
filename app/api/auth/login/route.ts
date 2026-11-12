import { NextRequest } from "next/server";
import { db, verifyPassword, createSession, sessionCookie } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username: string = String(body?.username || "").trim();
  const password: string = String(body?.password || "");

  const user = db
    .prepare("SELECT id, username, pw_hash, pw_salt FROM users WHERE username = ?")
    .get(username) as any;

  if (!user || !verifyPassword(password, user.pw_salt, user.pw_hash))
    return Response.json({ error: "用户名或密码不对，再试试？" }, { status: 401 });

  const { token, maxAge } = createSession(user.id);
  return Response.json(
    { ok: true, username: user.username },
    { headers: { "Set-Cookie": sessionCookie(token, maxAge) } }
  );
}
