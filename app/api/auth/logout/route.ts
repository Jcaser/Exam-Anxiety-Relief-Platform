import { NextRequest } from "next/server";
import { clearCookie } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)island_session=([^;]+)/);
  if (m) {
    const { destroySession } = await import("@/lib/db");
    destroySession(decodeURIComponent(m[1]));
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } });
}
