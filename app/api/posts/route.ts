import { NextRequest } from "next/server";
import {
  db,
  userFromRequest,
  listPosts,
  createPost,
  resonatePost,
  userResonated,
  type PostRow,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOODS = ["anxious", "tired", "sad", "lonely", "overwhelmed", "hopeful", "calm", "happy"];

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  const { searchParams } = new URL(req.url);
  const mood = searchParams.get("mood");
  const mine = searchParams.get("mine") === "1";

  const rows = listPosts({
    mood: mood && MOODS.includes(mood) ? mood : null,
    mine: mine && user ? user.id : null,
  }) as PostRow[];

  const out = rows.map((r) => ({
    id: r.id,
    text: r.text,
    mood: r.mood,
    anonymous: !!r.anonymous,
    author: r.anonymous ? "一位岛友" : r.username,
    resonates: r.resonates,
    resonated: user ? userResonated(r.id, user.id) : false,
    createdAt: r.created_at,
  }));
  return Response.json({ posts: out });
}

export async function POST(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登录再分享" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text: string = String(body?.text || "").trim();
  const mood: string = String(body?.mood || "");
  const anonymous: boolean = !!body?.anonymous;

  if (text.length < 2) return Response.json({ error: "说点什么吧，哪怕一句话" }, { status: 400 });
  if (mood && !MOODS.includes(mood)) return Response.json({ error: "情绪标签不认识" }, { status: 400 });

  createPost(user.id, text, mood || null, anonymous);
  return Response.json({ ok: true });
}

// 共鸣（点赞）：切换
export async function PUT(req: NextRequest) {
  const user = userFromRequest(req);
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return Response.json({ error: "缺少帖子 id" }, { status: 400 });
  const count = resonatePost(id, user.id);
  return Response.json({ ok: true, resonates: count });
}
