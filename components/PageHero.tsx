import React from "react";
import { BotanicalSprig } from "@/components/Decor";

export default function PageHero({
  emoji,
  tag,
  title,
  desc,
}: {
  emoji: string;
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-peach via-blush to-cream p-8 shadow-card sm:p-12">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute -bottom-14 -left-8 h-44 w-44 rounded-full bg-honey/30 blur-2xl" />
      <BotanicalSprig className="absolute right-6 top-6 h-16 w-12 rotate-12 opacity-60 sm:right-10" />
      <div className="relative">
        <span className="pill bg-white/70 text-terracotta shadow-card">
          <span>{emoji}</span> {tag}
        </span>
        <h1 className="font-display mt-4 text-4xl font-semibold text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-warmgray">{desc}</p>
      </div>
    </header>
  );
}
