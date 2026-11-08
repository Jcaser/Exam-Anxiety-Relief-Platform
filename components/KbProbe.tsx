"use client";

import { useState } from "react";
import { Search, Loader2, CornerDownLeft } from "lucide-react";

type Hit = {
  chunkId: string;
  bookTitle: string;
  bookEmoji: string;
  accent: string;
  chapterTitle: string;
  snippet: string;
  quote: string;
  score: number;
};

const examples = ["一想到考试就灾难化", "怕考砸让家人失望", "完美主义拖到最后一刻", "总觉得别人在评价我"];

/**
 * 首页的"知识库试一句"：
 * 让人亲眼看见——输入的是日常口语，翻出来的是原典原文。
 * 这是知识库的入口演示，不是书籍目录。
 */
export default function KbProbe() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [took, setTook] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState("");

  async function run(text: string) {
    const query = text.trim();
    if (query.length < 2 || loading) return;
    setQ(query);
    setLoading(true);
    try {
      const res = await fetch(`/api/kb/search?q=${encodeURIComponent(query)}&limit=3`);
      const data = await res.json();
      setHits(data.hits || []);
      setTook(typeof data.took === "number" ? data.took : null);
      setAsked(query);
    } catch {
      setHits([]);
      setTook(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-4xl border border-peach/70 bg-white/70 p-5 shadow-card sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
        className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-card"
      >
        <Search size={15} className="shrink-0 text-warmgray" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="用你自己的话说一句，比如：我总是怕考砸"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-warmgray/70"
        />
        <button
          type="submit"
          disabled={loading || q.trim().length < 2}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta text-white transition hover:bg-coral disabled:opacity-40"
          title="检索知识库"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <CornerDownLeft size={15} />}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((e) => (
          <button
            key={e}
            onClick={() => run(e)}
            className="rounded-full border border-peach bg-cream/70 px-3 py-1 text-[11px] text-warmgray transition hover:border-terracotta hover:text-terracotta"
          >
            {e}
          </button>
        ))}
      </div>

      {asked && (
        <div className="mt-4 space-y-2.5">
          {hits.length === 0 ? (
            <p className="rounded-2xl bg-cream/70 px-4 py-3 text-[12px] text-warmgray">
              没翻到直接对应的段落。知识库只答它有的；没把握的时候，它会说没有。
            </p>
          ) : (
            hits.map((h) => (
              <div
                key={h.chunkId}
                className="relative overflow-hidden rounded-2xl bg-white/85 py-3 pl-4 pr-3 shadow-card"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ background: h.accent }}
                  aria-hidden
                />
                <div className="flex items-center gap-1.5 text-[11px] text-warmgray">
                  <span className="text-base leading-none">{h.bookEmoji}</span>
                  <span className="font-semibold text-ink">{h.bookTitle}</span>
                  <span className="text-warmgray/50">·</span>
                  <span className="truncate">{h.chapterTitle}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-warmgray">
                  「{h.quote || h.snippet}」
                </p>
              </div>
            ))
          )}
          <p className="text-[10px] text-warmgray/70">
            检索「{asked.length > 24 ? asked.slice(0, 24) + "…" : asked}」
            {took !== null && ` · 命中 ${hits.length} 段 · ${took} ms`} · BM25 + 中英概念映射
          </p>
        </div>
      )}
    </div>
  );
}
