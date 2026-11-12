"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Palette, CalendarHeart, Sparkles } from "lucide-react";
import PageHero from "@/components/PageHero";

type MoodColor = { id: string; hex: string; label: string };

const FALLBACK_COLORS: MoodColor[] = [
  { id: "c1", hex: "#E27D8C", label: "焦虑" },
  { id: "c2", hex: "#7FB5B5", label: "平静" },
  { id: "c3", hex: "#F2C14E", label: "开心" },
  { id: "c4", hex: "#A8C686", label: "放松" },
  { id: "c5", hex: "#9B8AA5", label: "疲惫" },
  { id: "c6", hex: "#7A8694", label: "低落" },
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProgressPage() {
  const [entries, setEntries] = useState<Record<string, unknown>>({});
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<MoodColor[]>(FALLBACK_COLORS);
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    // 日记与心情改从数据库读取（按账号隔离）
    fetch("/api/diary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const raw = d?.entries || {};
        const es: Record<string, unknown> = {};
        const ms: Record<string, string> = {};
        for (const [date, row] of Object.entries<any>(raw)) {
          if (row?.text) es[date] = row;
          if (row?.mood) ms[date] = row.mood;
        }
        setEntries(es);
        setMoods(ms);
      })
      .catch(() => {});
    const c = localStorage.getItem("axk_diary_colors");
    if (c) {
      try {
        setColors(JSON.parse(c));
      } catch {}
    }
    const a = localStorage.getItem("axk_assess");
    if (a) {
      const d = JSON.parse(a);
      setBaseline(
        typeof d.pct === "number" ? d.pct : Math.round((d.score / 24) * 100)
      );
    }
  }, []);

  const entryDays = Object.keys(entries).length;
  const moodDays = Object.keys(moods).length;

  // 心情分布
  const counts: Record<string, number> = {};
  Object.values(moods).forEach((id) => (counts[id] = (counts[id] || 0) + 1));
  const total = moodDays || 1;
  const sorted = colors
    .map((c) => ({ ...c, n: counts[c.id] || 0 }))
    .sort((a, b) => b.n - a.n);
  const top = sorted.find((c) => c.n > 0);

  // 近 14 天心情条
  const strip: { d: string; id: string | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const k = ymd(dt);
    strip.push({ d: k, id: moods[k] ?? null });
  }

  return (
    <div className="space-y-8">
      <PageHero
        emoji="📈"
        tag="我的进度"
        title="看见，自己稳下来的痕迹"
        desc="每一次写日记、给一天标上心情，都是一次和情绪相处的小练习。这里留住它们的变化。"
      />

      {entryDays === 0 && moodDays === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-warmgray">
            还没有数据。先去「我的日记」写第一篇、给今天标个心情吧。
          </p>
          <Link href="/record" className="btn-primary mt-5">
            去写日记
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="写日记天数"
              value={`${entryDays} 天`}
              icon={<BookOpen size={18} />}
            />
            <Stat
              label="标记心情天数"
              value={`${moodDays} 天`}
              icon={<Palette size={18} />}
            />
            <Stat
              label="最常有的心情"
              value={top ? top.label : "—"}
              icon={<CalendarHeart size={18} />}
              accent={!!top}
              color={top?.hex}
            />
          </div>

          {/* 心情分布 */}
          <div className="glass-card p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold text-ink">心情分布</h2>
            <div className="space-y-3">
              {sorted.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm text-ink">
                    {c.label}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(c.n / total) * 100}%`,
                        background: c.hex,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-warmgray">
                    {c.n}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 近 14 天心情条 */}
          <div className="glass-card p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold text-ink">近 14 天心情</h2>
            <div className="flex justify-between gap-1.5">
              {strip.map((s) => {
                const col = s.id ? colors.find((c) => c.id === s.id) : null;
                return (
                  <div key={s.d} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="aspect-square w-full rounded-lg"
                      style={{
                        background: col ? col.hex : "rgba(0,0,0,0.05)",
                        boxShadow: col ? `0 0 0 1px ${col.hex}55` : "none",
                      }}
                      title={col ? col.label : "未标记"}
                    />
                    <span className="text-[10px] text-warmgray">
                      {Number(s.d.slice(8))}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-warmgray">
              {colors
                .filter((c) => (counts[c.id] || 0) > 0)
                .map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c.hex }}
                    />
                    {c.label}
                  </span>
                ))}
            </div>
          </div>

          {baseline !== null && (
            <p className="rounded-3xl bg-sage/15 p-5 text-sm text-warmgray">
              你还做过一次焦虑自评（基线 {baseline} 分）。数字只是参考，真正的进步常常藏在
              “这次我没那么慌”的体感里。继续写下去，你会越来越熟悉和自己相处的方式。
            </p>
          )}
        </>
      )}

      {entryDays === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-warmgray">
          <Sparkles size={13} className="text-moss" />
          提示：在「我的日记」里给每天标一个心情颜色，这里就会长出你的心情地图。
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          accent ? "text-white" : "bg-peach text-terracotta"
        }`}
        style={accent && color ? { background: color } : undefined}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs text-warmgray">{label}</p>
        <p className="text-xl font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
