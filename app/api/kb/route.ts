import { NextResponse } from "next/server";
import { kbSources, libraryStats } from "@/lib/library";
import { indexStats } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/kb —— 知识库自述：接入了哪些原典、切成多少片段、索引覆盖多少词 */
export async function GET() {
  return NextResponse.json({
    sources: kbSources(),
    stats: libraryStats(),
    index: indexStats(),
  });
}
