"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type CitationLike = {
  n: number;
  bookTitle: string;
  bookEmoji: string;
  accent: string;
  chapterTitle: string;
  snippet: string;
  quote?: string;
};

/**
 * 一条"知识库出处"。默认只露两行摘要，点开才展开完整原文。
 * 刻意做成不可跳转：书是回答的依据，不是给人翻阅的电子书。
 */
export default function KbCitation({
  c,
  defaultOpen = false,
}: {
  c: CitationLike;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const body = (open && c.quote) || c.snippet;

  return (
    <div
      className={`rounded-2xl border bg-white/70 p-3 transition ${
        open ? "border-terracotta/60 bg-white shadow-card" : "border-peach/80 hover:border-terracotta/40"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: c.accent }}
        >
          {c.n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] text-warmgray">
            <span className="text-sm leading-none">{c.bookEmoji}</span>
            <span className="truncate font-semibold text-ink">{c.bookTitle}</span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-terracotta/80">
            {c.chapterTitle}
          </span>
          <span
            className={`mt-1 block text-[11.5px] leading-relaxed text-warmgray ${
              open ? "" : "line-clamp-2"
            }`}
          >
            「{body}」
          </span>
        </span>
        <ChevronDown
          size={13}
          className={`mt-1 shrink-0 text-warmgray/70 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <p className="mt-2 border-t border-peach/60 pt-2 text-[10px] leading-relaxed text-warmgray/80">
          知识库原文片段 · 《{c.bookTitle}》{c.chapterTitle}
        </p>
      )}
    </div>
  );
}
