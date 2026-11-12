import { NextRequest } from "next/server";
import { userFromRequest, db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = userFromRequest(req);
  const hasUsers =
    ((db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c ?? 0) > 0;
  if (!user) return Response.json({ user: null, hasUsers }, { status: 200 });
  return Response.json(
    { user: { username: user.username, createdAt: user.created_at }, hasUsers },
    { status: 200 }
  );
}
