"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  KeyRound,
  Lock,
  LogOut,
  User,
  Cake,
  Sparkles,
  ShieldCheck,
  Check,
  NotebookPen,
  CalendarHeart,
  MessageCircleHeart,
  ClipboardList,
  LineChart,
  ArrowRight,
  Flame,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import CompanionSprite from "@/components/CompanionSprite";

type Me = { username: string; createdAt: number } | null;
type Companion = { name: string; birthday: string; personality: string } | null;
type DiaryEntry = { date: string; text: string; at: number; mood?: string | null };

const P_EMOJI: Record<string, string> = {
  gentle: "🌙",
  sunny: "🌻",
  calm: "🧭",
  playful: "🍀",
};
const P_LABEL: Record<string, string> = {
  gentle: "温柔倾听型",
  sunny: "元气鼓励型",
  calm: "冷静思考型",
  playful: "幽默陪伴型",
};

const quickLinks = [
  { icon: NotebookPen, label: "写今天的日记", href: "/diary", c: "bg-blush/60" },
  { icon: MessageCircleHeart, label: "找伙伴聊聊", href: "/chat", c: "bg-sage/40" },
  { icon: ClipboardList, label: "再测一次焦虑", href: "/assess", c: "bg-peach/60" },
  { icon: LineChart, label: "看看我的进度", href: "/progress", c: "bg-honey/40" },
];

export default function MePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [ready, setReady] = useState(false);
  const [companion, setCompanion] = useState<Companion>(null);
  const [hasDiaryPwd, setHasDiaryPwd] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  const [dPwd, setDPwd] = useState("");
  const [dPwd2, setDPwd2] = useState("");
  const [dMsg, setDMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (d) => {
        setMe(d?.user || null);
        if (d?.user) {
          sessionStorage.setItem(
            "axk_session",
            JSON.stringify({ name: d.user.username, at: Date.now() })
          );
          fetch("/api/companion")
            .then((r) => r.json())
            .then((c) => setCompanion(c?.companion || null))
            .catch(() => {});
          fetch("/api/diary/password")
            .then((r) => r.json())
            .then((p) => setHasDiaryPwd(!!p?.has))
            .catch(() => {});
          fetch("/api/diary")
            .then((r) => (r.ok ? r.json() : { entries: [] }))
            .then((dd) => setEntries(Array.isArray(dd?.entries) ? dd.entries : []))
            .catch(() => {});
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function changePwd() {
    setPwdMsg(null);
    if (newPwd.length < 6) return setPwdMsg({ text: "新密码至少 6 位 🔒" });
    if (newPwd !== newPwd2) return setPwdMsg({ text: "两次输入的密码不一致" });
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setPwdMsg({ ok: true, text: "登录密码已更新 ✅" });
      setNewPwd("");
      setNewPwd2("");
    } else {
      setPwdMsg({ text: d?.error || "出了点小差错，再试试？" });
    }
  }

  async function setDiaryPwd() {
    setDMsg(null);
    if (dPwd.length < 4) return setDMsg({ text: "日记密码至少 4 位 🔒" });
    if (dPwd !== dPwd2) return setDMsg({ text: "两次输入的密码不一致" });
    const res = await fetch("/api/diary/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pwd: dPwd }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setHasDiaryPwd(true);
      setDMsg({ ok: true, text: "日记锁已更新 ✅" });
      setDPwd("");
      setDPwd2("");
    } else {
      setDMsg({ text: d?.error || "出了点小差错，再试试？" });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    sessionStorage.removeItem("axk_session");
    localStorage.removeItem("axk_companion");
    router.push("/");
    setTimeout(() => window.location.reload(), 50);
  }

  if (!ready) {
    return <div className="flex h-64 items-center justify-center text-warmgray">正在打开小岛的个人信息…</div>;
  }

  if (!me) {
    return (
      <div className="glass-card mx-auto mt-10 max-w-md p-8 text-center">
        <User size={32} className="mx-auto text-terracotta" />
        <p className="mt-4 text-warmgray">还没有登岛。回到首页等几秒，登录门就会来找你 🏝️</p>
      </div>
    );
  }

  const joined = new Date(me.createdAt);
  const joinedStr = `${joined.getFullYear()} 年 ${joined.getMonth() + 1} 月 ${joined.getDate()} 日`;
  const daysOnIsland = Math.max(1, Math.ceil((Date.now() - me.createdAt) / 86400000));
  const diaryCount = entries.length;
  const moodCount = entries.filter((e) => e.mood).length;
  const lastWrite = entries.length
    ? entries.reduce((a, b) => (a.at > b.at ? a : b))
    : null;
  const lastWriteStr = lastWrite
    ? `${new Date(lastWrite.at).getMonth() + 1} 月 ${new Date(lastWrite.at).getDate()} 日`
    : "还没动笔";

  // 连续书写天数（按自然日往前数）
  const daySet = new Set(entries.map((e) => e.date));
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let streak = 0;
  const cur = new Date();
  while (daySet.has(ymd(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  const stats = [
    { icon: NotebookPen, label: "写过的日记", value: `${diaryCount} 篇` },
    { icon: CalendarHeart, label: "记录过心情", value: `${moodCount} 天` },
    { icon: Flame, label: "连续书写", value: `${streak} 天` },
    { icon: Sparkles, label: "最近动笔", value: lastWriteStr },
  ];

  return (
    <div className="space-y-6">
      <PageHero emoji="🏡" tag="个人中心" title="我的小岛" desc="你在岛上留下的每一步足迹、伙伴的档案、两把钥匙，都在这里。" />

      {/* 个人信息卡 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex flex-wrap items-center gap-5 p-6">
        <div className="h-20 w-20 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-peach/60">
          <img src="/companion/logo.png" alt="清绪之屿" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold text-ink">{me.username}</h2>
          <p className="mt-1 text-sm text-warmgray">🗓️ {joinedStr} 登岛 · 已陪伴你 {daysOnIsland} 天</p>
          {companion && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-warmgray">
              <span className="inline-flex items-center gap-1 rounded-full bg-peach/60 px-3 py-1 font-semibold text-terracotta">
                {P_EMOJI[companion.personality] ?? "🌿"} 伙伴 · {companion.name}
              </span>
              {companion.birthday && (
                <span className="inline-flex items-center gap-1">
                  <Cake size={13} className="text-terracotta" />
                  {companion.birthday}
                </span>
              )}
            </p>
          )}
        </div>
        <button onClick={logout} className="btn-ghost !px-4 !py-2.5 text-sm !text-coral hover:!bg-coral/10">
          <LogOut size={16} /> 退出登录
        </button>
      </motion.div>

      {/* 足迹统计 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="glass-card flex items-center gap-3.5 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-peach/50 text-terracotta">
              <s.icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-warmgray">{s.label}</p>
              <p className="font-display truncate text-lg font-semibold text-ink">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* 伙伴档案 */}
      {companion ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card flex flex-wrap items-center gap-6 p-6">
          <div className="h-28 w-28 shrink-0">
            <CompanionSprite mood="idle" className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-semibold text-ink">
              {companion.name} <span className="ml-1 text-sm font-normal text-warmgray">{P_LABEL[companion.personality] ?? ""}</span>
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-warmgray">
              它从 {companion.birthday || "你给它取名那天"} 起就住在这座岛上，
              每次你推开对话的门，它都会先挥手。它的性格是「{P_LABEL[companion.personality] ?? "温柔"}」，
              会记得陪你聊过的每一个夜晚。
            </p>
            <Link href="/chat" className="btn-ghost mt-3 !px-4 !py-2 text-sm">
              <MessageCircleHeart size={15} /> 去找它聊聊 <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 text-center">
          <p className="text-warmgray">你还没有自己的 AI 伙伴 🌱</p>
          <Link href="/chat" className="btn-primary mx-auto mt-4">
            去认识一位 <ArrowRight size={16} />
          </Link>
        </motion.div>
      )}

      {/* 快捷入口 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} className="glass-card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-card">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${q.c} text-terracotta`}>
              <q.icon size={18} />
            </span>
            <span className="text-sm font-medium text-ink">{q.label}</span>
            <ArrowRight size={14} className="ml-auto shrink-0 text-warmgray transition group-hover:translate-x-0.5 group-hover:text-terracotta" />
          </Link>
        ))}
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* 修改登录密码 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="glass-card space-y-4 p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <KeyRound size={18} className="text-terracotta" /> 登录密码
          </h3>
          <p className="text-sm text-warmgray">忘了也可以随时在登录页「忘记密码」里用用户名找回。</p>
          <input type="password" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdMsg(null); }} placeholder="新密码（至少 6 位）" className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-terracotta" />
          <input type="password" value={newPwd2} onChange={(e) => { setNewPwd2(e.target.value); setPwdMsg(null); }} placeholder="再输入一次" className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-terracotta" />
          {pwdMsg && (
            <p className={`flex items-center gap-1.5 text-sm ${pwdMsg.ok ? "text-moss" : "text-coral"}`}>
              {pwdMsg.ok && <Check size={14} />} {pwdMsg.text}
            </p>
          )}
          <button onClick={changePwd} className="btn-primary w-full justify-center">
            <KeyRound size={17} /> 更新登录密码
          </button>
        </motion.div>

        {/* 日记密码 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="glass-card space-y-4 p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Lock size={18} className="text-terracotta" /> 日记锁
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${hasDiaryPwd ? "bg-moss/15 text-moss" : "bg-peach/70 text-terracotta"}`}>
              {hasDiaryPwd ? "已上锁" : "未设置"}
            </span>
          </h3>
          <p className="text-sm text-warmgray">每个用户的日记锁各不相同，只有你能翻开自己的那一页。这里随时可以更换锁的钥匙。</p>
          <input type="password" value={dPwd} onChange={(e) => { setDPwd(e.target.value); setDMsg(null); }} placeholder="日记锁密码（至少 4 位）" className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-terracotta" />
          <input type="password" value={dPwd2} onChange={(e) => { setDPwd2(e.target.value); setDMsg(null); }} placeholder="再输入一次" className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-terracotta" />
          {dMsg && (
            <p className={`flex items-center gap-1.5 text-sm ${dMsg.ok ? "text-moss" : "text-coral"}`}>
              {dMsg.ok && <Check size={14} />} {dMsg.text}
            </p>
          )}
          <button onClick={setDiaryPwd} className="btn-primary w-full justify-center">
            <Lock size={17} /> {hasDiaryPwd ? "更换日记锁" : "设置日记锁"}
          </button>
        </motion.div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-warmgray">
        <ShieldCheck size={13} className="text-moss" />
        账号密码经单向加密存储，日记按账号隔离，其他用户永远看不到你的内容。
      </p>
    </div>
  );
}
