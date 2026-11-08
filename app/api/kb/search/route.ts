import { NextRequest, NextResponse } from "next/server";
import { pickQuote, searchLibrary } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/kb/search?q=&limit=
 *
 * 知识库检索：只返回"可直接嵌进界面"的片段（摘要 + 挑好的一句原文），
 * 不返回章节正文，页面也没有可跳转的"书页"——书只作为回答的依据存在。
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const limit = Math.min(6, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 3));

  if (q.length < 2) return NextResponse.json({ q, hits: [], took: 0 });

  const t0 = Date.now();
  const hits = searchLibrary(q, { limit, perBook: 2 }).map((h) => ({
    chunkId: h.chunkId,
    bookId: h.bookId,
    bookTitle: h.bookTitle,
    bookAuthor: h.bookAuthor,
    bookEmoji: h.bookEmoji,
    accent: h.accent,
    chapterTitle: h.chapterTitle,
    chapterIndex: h.chapterIndex,
    snippet: h.snippet,
    quote: pickQuote(h.text, h.terms, 24, 150),
    score: h.score,
  }));

  return NextResponse.json({ q, hits, took: Date.now() - t0 });
}
