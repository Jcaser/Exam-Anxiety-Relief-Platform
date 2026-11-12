import { NextRequest } from "next/server";
import { userFromRequest, getCompanion, saveCompanion } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 每个用户自己的 AI 伙伴设定 */
export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });
  return Response.json({ companion: getCompanion(user.id) });
}

export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const c = body?.companion;
  if (!c || typeof c !== "object" || !String(c.name || "").trim())
    return Response.json({ error: "伙伴设定不完整" }, { status: 400 });

  saveCompanion(user.id, {
    name: String(c.name).slice(0, 10),
    birthday: String(c.birthday || "").slice(0, 10),
    personality: String(c.personality || "gentle").slice(0, 12),
  });
  return Response.json({ ok: true });
}
