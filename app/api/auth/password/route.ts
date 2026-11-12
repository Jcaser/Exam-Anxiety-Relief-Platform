import { NextRequest } from "next/server";
import { userFromRequest, hashPassword, db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 已登录用户修改自己的登录密码 */
export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const password: string = String(body?.password || "");
  if (password.length < 6)
    return Response.json({ error: "新密码至少 6 位 🔒" }, { status: 400 });

  const { hash, salt } = hashPassword(password);
  db.prepare("UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?").run(hash, salt, user.id);
  return Response.json({ ok: true });
}
