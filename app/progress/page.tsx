"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Sparkles, TrendingDown } from "lucide-react";
import PageHero from "@/components/PageHero";

type Record = {
  id: string;
  date: string;
  intensity: number;
  reIntensity: number;
};

const STORAGE = "axk_records";

export default function ProgressPage() {
  const [list, setList] = useState<Record[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (raw) setList(JSON.parse(raw));
    const a = localStorage.getItem("axk_assess");
    if (a) {
      const d = JSON.parse(a);
      setBaseline(
        typeof d.pct === "number" ? d.pct : Math.round((d.score / 24) * 100)
      );
    }
  }, []);

  const chrono = [...list].reverse(); // 旧 -> 新
  const avgInitial =
    list.length && Math.round(list.reduce((s, r) => s + r.intensity, 0) / list.length);
  const avgRe =
    list.length && Math.round(list.reduce((s, r) => s + r.reIntensity, 0) / list.length);
  const avgDrop = list.length && avgInitial - avgRe;

  return (
    <div className="space-y-8">
      <PageHero
        emoji="📈"
        tag="我的进度"
        title="看见，自己稳下来的痕迹"
        desc="每一条思维记录，都是一次把焦虑拆开又放下的练习。这里留住它们的变化。"
      />

      {list.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-warmgray">还没有数据。先去「思维记录」写第一条吧。</p>
          <Link href="/record" className="btn-primary mt-5">
            去写一条
          </Link>
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="已记录" value={`${list.length} 条`} icon={<Sparkles size={18} />} />
            <Stat
              label="重新评估后平均情绪强度"
              value={`${avgRe}%`}
              icon={<LineChart size={18} />}
            />
            <Stat
              label="平均下降"
              value={`-${avgDrop}%`}
              icon={<TrendingDown size={18} />}
              accent
            />
          </div>

          {/* 情绪曲线 */}
          <div className="glass-card p-6 sm:p-8">
            <h2 className="mb-4 text-lg font-bold text-ink">情绪强度变化</h2>
            <EmotionChart chrono={chrono} baseline={baseline} />
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-warmgray">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coral" /> 记录时强度
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-moss" /> 平衡后强度
              </span>
              {baseline !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-warmgray" /> 自评基线
                </span>
              )}
            </div>
          </div>

          <p className="rounded-3xl bg-sage/15 p-5 text-sm text-warmgray">
            小提醒：数字只是参考，真正的进步常常藏在“这次我没那么慌”的体感里。
            继续写下去，你会越来越熟悉和自己相处的方式。
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          accent ? "bg-moss/20 text-moss" : "bg-peach text-terracotta"
        }`}
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

function EmotionChart({
  chrono,
  baseline,
}: {
  chrono: Record[];
  baseline: number | null;
}) {
  const W = 600;
  const H = 240;
  const pad = 36;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const n = chrono.length;
  const xAt = (i: number) => (n <= 1 ? pad + innerW / 2 : pad + (innerW * i) / (n - 1));
  const yAt = (v: number) => pad + (innerH * v) / 100;

  const toPath = (key: "intensity" | "reIntensity") =>
    chrono
      .map((r, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(r[key]).toFixed(1)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {/* 网格 */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={pad}
            y1={yAt(v)}
            x2={W - pad}
            y2={yAt(v)}
            stroke="#f0a08c"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
          <text x={8} y={yAt(v) + 4} fontSize={11} fill="#7a6a5d">
            {v}
          </text>
        </g>
      ))}

      {/* 基线 */}
      {baseline !== null && (
        <line
          x1={pad}
          y1={yAt(baseline)}
          x2={W - pad}
          y2={yAt(baseline)}
          stroke="#7a6a5d"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
      )}

      {/* 线 */}
      {n > 1 && (
        <>
          <path d={toPath("intensity")} fill="none" stroke="#f0a08c" strokeWidth={2.5} />
          <path d={toPath("reIntensity")} fill="none" stroke="#6f8f6e" strokeWidth={2.5} />
        </>
      )}

      {/* 点 */}
      {chrono.map((r, i) => (
        <g key={r.id}>
          <circle cx={xAt(i)} cy={yAt(r.intensity)} r={4} fill="#f0a08c" />
          <circle cx={xAt(i)} cy={yAt(r.reIntensity)} r={4} fill="#6f8f6e" />
        </g>
      ))}

      {n === 1 && (
        <text x={W / 2} y={H / 2} fontSize={12} fill="#7a6a5d" textAnchor="middle">
          再写一条，就能看到变化趋势啦
        </text>
      )}
    </svg>
  );
}
