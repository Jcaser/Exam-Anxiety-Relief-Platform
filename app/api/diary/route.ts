import { NextRequest } from "next/server";
import { userFromRequest, listDiary, upsertDiary } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 读取当前用户的全部日记（未登录返回 401 —— 权限由服务端把守） */
export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });
  return Response.json({ entries: listDiary(user.id) });
}

/** 保存某一页日记：{ date, text, at, mood, card } */
export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登岛" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date: string = String(body?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return Response.json({ error: "日期格式不对" }, { status: 400 });

  upsertDiary(user.id, date, {
    text: String(body?.text ?? ""),
    at: Number(body?.at) || Date.now(),
    mood: body?.mood === undefined ? undefined : body.mood,
    card: body?.card === undefined ? undefined : body.card,
  });
  return Response.json({ ok: true });
}
