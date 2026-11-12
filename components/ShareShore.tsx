"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Heart, Waves, Lock } from "lucide-react";
import { getSession } from "@/components/AuthGate";

type Post = {
  id: number;
  text: string;
  mood: string | null;
  anonymous: boolean;
  author: string;
  resonates: number;
  resonated: boolean;
  createdAt: number;
};

const MOODS: Record<string, { label: string; emoji: string; cls: string }> = {
  anxious: { label: "焦虑", emoji: "😰", cls: "bg-amber-100 text-amber-700" },
  tired: { label: "疲惫", emoji: "😪", cls: "bg-slate-100 text-slate-600" },
  sad: { label: "难过", emoji: "😢", cls: "bg-blue-100 text-blue-700" },
  lonely: { label: "孤独", emoji: "🫥", cls: "bg-indigo-100 text-indigo-700" },
  overwhelmed: { label: "崩溃边缘", emoji: "🌧️", cls: "bg-cyan-100 text-cyan-700" },
  hopeful: { label: "有盼头", emoji: "🌱", cls: "bg-emerald-100 text-emerald-700" },
  calm: { label: "平静", emoji: "🌊", cls: "bg-teal-100 text-teal-700" },
  happy: { label: "开心", emoji: "😊", cls: "bg-rose-100 text-rose-700" },
};

/**
 * 分享小屋：首页内嵌区块。任何人都能看到大家的感受，
 * 登录后可以留下自己的、和岛友「我也在」共鸣。
 */
export default function ShareShore() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string>("anxious");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function load() {
    try {
      const q = filter ? `?mood=${filter}` : "";
      const r = await fetch(`/api/posts${q}`).then((x) => x.json());
      setPosts(r.posts || []);
    } catch {}
  }
  useEffect(() => {
    load();
  }, [filter]);

  async function publish() {
    if (!getSession()) {
      setErr("先在右上角登录/安家，才能把感受留在这里 🔑");
      return;
    }
    if (text.trim().length < 2) {
      setErr("说点什么吧，哪怕一句话");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mood, anonymous: anon }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "发布失败");
      }
      setText("");
      setExpanded(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "发布失败，稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function resonate(p: Post) {
    if (!getSession()) {
      setErr("先登录，才能和岛友共鸣 🔑");
      return;
    }
    const r = await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    }).then((x) => x.json());
    setPosts((ps) =>
      ps.map((x) =>
        x.id === p.id ? { ...x, resonates: r.resonates ?? x.resonates, resonated: !x.resonated } : x
      )
    );
  }

  return (
    <section id="shore" className="mx-auto w-full max-w-6xl">
      <div className="text-center">
        <span className="pill bg-moss/15 text-moss">
          <Waves size={15} /> 分享小屋
        </span>
        <h2 className="section-title mt-4 font-semibold">同样的感受，有人在陪你</h2>
        <p className="mx-auto mt-3 max-w-xl text-warmgray">
          把此刻的心情留在这里。看到和你一样的感受时，点一句「我也在」——
          <br className="hidden sm:block" />
          一句话，就足够温暖。
        </p>
      </div>

      {/* 发布 */}
      <div className="glass-card mx-auto mt-8 max-w-2xl space-y-3 p-5">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErr("");
          }}
          onFocus={() => setExpanded(true)}
          rows={expanded ? 3 : 2}
          placeholder="今天，你心里装着什么？写下来，小岛会替你收着…"
          className="w-full resize-none rounded-2xl border border-peach bg-white/80 p-3 text-sm text-ink outline-none transition placeholder:text-warmgray/60 focus:border-terracotta"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(MOODS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setMood(k)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  mood === k
                    ? `${v.cls} ring-2 ring-terracotta/40`
                    : "bg-cream text-warmgray hover:bg-peach/60"
                }`}
              >
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-warmgray">
            <Lock size={13} /> 匿名
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              className="accent-terracotta"
            />
          </label>
          <button
            onClick={publish}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            <Send size={14} /> 留在这里
          </button>
        </div>
        {err && <p className="text-center text-sm text-coral">{err}</p>}
      </div>

      {/* 情绪筛选 */}
      <div className="mx-auto mt-6 flex max-w-2xl flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !filter ? "bg-terracotta text-white" : "bg-cream text-warmgray hover:bg-peach/60"
          }`}
        >
          全部
        </button>
        {Object.entries(MOODS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === k
                ? `${v.cls} ring-2 ring-terracotta/40`
                : "bg-cream text-warmgray hover:bg-peach/60"
            }`}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      {/* 感受墙 */}
      <div className="mx-auto mt-5 grid max-w-4xl gap-4 sm:grid-cols-2">
        {posts.length === 0 && (
          <p className="py-10 text-center text-sm text-warmgray sm:col-span-2">
            还没有人留在这里。做第一个把感受说出来的岛友吧 🌿
          </p>
        )}
        {posts.slice(0, 12).map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="glass-card p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-warmgray">
              <span className="font-semibold text-ink">{p.author}</span>
              {p.mood && MOODS[p.mood] && (
                <span className={`rounded-full px-2 py-0.5 ${MOODS[p.mood].cls}`}>
                  {MOODS[p.mood].emoji} {MOODS[p.mood].label}
                </span>
              )}
              <span className="ml-auto text-warmgray/60">
                {new Date(p.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink/90">{p.text}</p>
            <div className="mt-3">
              <button
                onClick={() => resonate(p)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  p.resonated
                    ? "bg-terracotta/15 text-terracotta ring-1 ring-terracotta/30"
                    : "bg-cream text-warmgray hover:bg-peach/60"
                }`}
              >
                <Heart size={13} className={p.resonated ? "fill-terracotta" : ""} />
                我也在 · {p.resonates}
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
