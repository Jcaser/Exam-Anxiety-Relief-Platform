"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";

type Hit = {
  chunkId: string;
  bookTitle: string;
  bookEmoji: string;
  accent: string;
  chapterTitle: string;
  snippet: string;
  quote: string;
};

/**
 * 思维记录里的"原典参考"：
 * 你写下的情境和念头，会实时拿去知识库里检索，把相关原文片段摊在旁边。
 * 不是让你去翻书，而是让书的判断陪着你写。
 */
export default function KbGrounding({ query }: { query: string }) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState("");
  const seq = useRef(0);

  const q = query.replace(/\s+/g, " ").trim();

  useEffect(() => {
    if (q.length < 4) {
      setHits([]);
      setAsked("");
      return;
    }
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(q)}&limit=2`);
        const data = await res.json();
        if (seq.current === id) {
          setHits(data.hits || []);
          setAsked(q);
        }
      } catch {
        if (seq.current === id) setHits([]);
      } finally {
        if (seq.current === id) setLoading(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [q]);

  return (
    <aside className="rounded-3xl border border-peach/70 bg-cream/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta">
          <BookOpen size={13} /> 知识库 · 书里怎么说
        </span>
        {loading && <Loader2 size={12} className="animate-spin text-warmgray" />}
      </div>

      {q.length < 4 ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-warmgray/90">
          写下情境或那句自动思维，这里会同步翻出四本原典里相关的段落——
          不用你去找书，书会先一步递到眼前。
        </p>
      ) : hits.length === 0 && !loading ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-warmgray/90">
          知识库里没有直接对应的段落。这也是有用的信息：它可能是很个人化的经历，
          不必硬套术语，照着「证据」两栏写下去就好。
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {hits.map((h) => (
            <div key={h.chunkId} className="rounded-2xl bg-white/80 p-3 shadow-card">
              <div className="flex items-center gap-1 text-[10.5px] text-warmgray">
                <span className="text-sm leading-none">{h.bookEmoji}</span>
                <span className="truncate font-semibold text-ink">{h.bookTitle}</span>
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-terracotta/80">
                {h.chapterTitle}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-warmgray">
                「{h.quote || h.snippet}」
              </p>
            </div>
          ))}
          {asked && (
            <p className="pt-0.5 text-[10px] text-warmgray/70">
              按「{asked.length > 18 ? asked.slice(0, 18) + "…" : asked}」检索
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
