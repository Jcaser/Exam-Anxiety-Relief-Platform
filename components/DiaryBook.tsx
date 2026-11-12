"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  BookOpen,
  Palette,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Mic,
  MicOff,
  Stamp,
  RefreshCw,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeech";

/* ───────────────────────── 类型与存储 ───────────────────────── */

type MoodColor = { id: string; hex: string; label: string };
type Entry = { text: string; at: number }; // at = 最后一次保存的时间戳
/** 每日明信片：保存日记后由 AI 温柔回馈生成 */
type Postcard = { text: string; quote: string; book: string; at: number };

/** 日记、心情与明信片全部存数据库（按账号隔离）；心情色板是个人喜好，留在本地 */
const K_COLORS = "axk_diary_colors";

const DEFAULT_COLORS: MoodColor[] = [
  { id: "c1", hex: "#E27D8C", label: "焦虑" },
  { id: "c2", hex: "#7FB5B5", label: "平静" },
  { id: "c3", hex: "#F2C14E", label: "开心" },
  { id: "c4", hex: "#A8C686", label: "放松" },
  { id: "c5", hex: "#9B8AA5", label: "疲惫" },
  { id: "c6", hex: "#7A8694", label: "低落" },
];

/* ───────────────────────── 工具函数 ───────────────────────── */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
  return `${y}年${m}月${d}日 星期${wd}`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/* ── 明信片生成：读懂日记里的情绪，再温柔回一句 ─────────────────────── */

type Feeling = "anxious" | "tired" | "sad" | "positive" | "neutral";

const FEELING_WORDS: Record<Exclude<Feeling, "neutral">, string[]> = {
  anxious: ["焦虑", "慌", "怕", "紧张", "失眠", "睡不着", "压力", "考砸", "砸了", "完蛋", "崩溃", "烦", "担心", "害怕"],
  tired: ["累", "倦", "熬夜", "撑不住", "疲惫", "透支", "麻木"],
  sad: ["难过", "低落", "丧", "想哭", "委屈", "孤独", "失望", "难过", "心酸", "没意思"],
  positive: ["开心", "高兴", "顺利", "不错", "平静", "放松", "快乐", "棒", "完成", "做到", "踏实", "满意", "进步"],
};

const CARD_OPENINGS: Record<Feeling, string[]> = {
  anxious: [
    "今天你的字里行间都绷着一根弦，我读到了，也心疼。",
    "写得越具体，说明你扛得越多。这些紧张不是软弱，是你在乎。",
    "我知道，深夜写下这些的时候，心里一定不好受。",
  ],
  tired: [
    "你今天好像跑了很久很久，累的话，是可以停下来喘口气的。",
    "从字缝里都能看出你的疲惫。撑到现在，你已经很努力了。",
  ],
  sad: [
    "今天的你有点沉。没关系，我在这里，陪你把这块石头放一放。",
    "读你的日记时，我好像也淋到了那场雨。别怕，雨会停的。",
  ],
  positive: [
    "今天的字是亮的！你把这一天过得有光，真替你高兴。",
    "看到你记下的这些小确幸，我的岛上也跟着晴了一圈。",
  ],
  neutral: [
    "谢谢你把今天交给了这本日记。被记下来的日子，都不会白白流走。",
    "平平常常的一天也很好。你愿意记录，本身就是一种温柔的坚持。",
  ],
};

const CARD_TIPS: Record<Feeling, string[]> = {
  anxious: [
    "CBT 里有个小秘密：情绪是念头生出来的。把「我完了」换成「我现在很紧张，但紧张会过去」，弦就松了一格。",
    "试着给这份紧张打个分（0–10），再深呼吸三次重新打一次。分数会告诉你：感觉不会一直停在原地。",
  ],
  tired: [
    "心理学里这叫「情绪耗竭」——它提醒你要充电，而不是要更强。今晚早点睡，就是最好的 CBT 练习。",
    "把「我必须做完」换成「我可以先做一件最小的」，重量会立刻轻很多。",
  ],
  sad: [
    "情绪像潮水，只会流过你，不会淹没你。CBT 说：给情绪命名，它就小了一号。你已经做到了——你把它写下来了。",
    "今天允许自己什么都不修，只是安静地待一会儿。修复不在日程表里，但一直在发生。",
  ],
  positive: [
    "CBT 说，记录「做得好的证据」是大脑最好的营养。今天你给自己存了一笔，记得常回来取。",
    "把这份好心情也写进日历的颜色里吧，它值得被看见第二次。",
  ],
  neutral: [
    "日拱一卒的日子最了不起。明天见，我还在。",
    "如果愿意，可以给今天标一个心情颜色——它是日历上属于你的一枚邮票。",
  ],
};

function detectFeeling(text: string): Feeling {
  let best: Feeling = "neutral";
  let bestScore = 0;
  (Object.keys(FEELING_WORDS) as Exclude<Feeling, "neutral">[]).forEach((f) => {
    const score = FEELING_WORDS[f].reduce(
      (n, w) => n + (text.includes(w) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  });
  return best;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/* ───────────────────────── 日记本主组件 ───────────────────────── */

export default function DiaryBook() {
  const [ready, setReady] = useState(false);
  const [hasPwd, setHasPwd] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // 密码设置 / 解锁
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");

  // 数据
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<MoodColor[]>(DEFAULT_COLORS);
  const [cards, setCards] = useState<Record<string, Postcard>>({});
  const [cardBusy, setCardBusy] = useState(false);
  const [nick, setNick] = useState("");

  // 语音输入
  const handleVoice = (t: string) => setDraft((d) => (d ? `${d}${t}` : t));
  const {
    supported: voiceSupported,
    listening,
    interim: voiceInterim,
    start: voiceStart,
    stop: voiceStop,
  } = useSpeechRecognition(handleVoice);

  // 视图
  const [sel, setSel] = useState<string>(ymd(new Date()));
  const [viewY, setViewY] = useState(new Date().getFullYear());
  const [viewM, setViewM] = useState(new Date().getMonth());
  const [draft, setDraft] = useState("");
  const [dir, setDir] = useState(1); // 翻页方向
  const [savedFlash, setSavedFlash] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const firstRun = useRef(true);

  /* 启动时：锁状态 + 日记数据都从数据库来 */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (d) => {
        if (d?.user?.username) setNick(d.user.username);
        const [pwdRes, diaryRes] = await Promise.all([
          fetch("/api/diary/password").then((r) => r.json()).catch(() => null),
          fetch("/api/diary").then((r) => r.json()).catch(() => null),
        ]);
        setHasPwd(!!pwdRes?.has);
        const raw = diaryRes?.entries || {};
        const es: Record<string, Entry> = {};
        const ms: Record<string, string> = {};
        const cs: Record<string, Postcard> = {};
        for (const [date, row] of Object.entries<any>(raw)) {
          if (row?.text) es[date] = { text: row.text, at: row.at };
          if (row?.mood) ms[date] = row.mood;
          if (row?.card) cs[date] = row.card;
        }
        setEntries(es);
        setMoods(ms);
        setCards(cs);
        const c = localStorage.getItem(K_COLORS);
        if (c) {
          try {
            setColors(JSON.parse(c));
          } catch {}
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  /* 切换日期时把该日内容载入草稿 */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
    }
    setDraft(entries[sel]?.text ?? "");
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 心情色板留在本地 */
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(K_COLORS, JSON.stringify(colors));
  }, [colors, ready]);

  /* ── 密码逻辑（服务端校验，每个用户一把锁） ── */
  async function setup() {
    if (pwd.length < 4) return setErr("密码至少 4 位，保护你的小秘密 🔒");
    if (pwd !== pwd2) return setErr("两次输入的密码不一致");
    const res = await fetch("/api/diary/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pwd }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return setErr(d?.error || "出了点小差错，再试试？");
    }
    setHasPwd(true);
    setUnlocked(true);
    setPwd("");
    setPwd2("");
    setErr("");
  }

  async function unlock() {
    const res = await fetch("/api/diary/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pwd }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setUnlocked(true);
      setPwd("");
      setErr("");
    } else {
      setErr(d?.error || "密码不对，再试试？");
    }
  }

  /** 忘记日记密码：只要还登着岛，就能用自己的身份换一把新钥匙 */
  async function resetDiaryPwd() {
    if (pwd.length < 4) return setErr("新密码至少 4 位 🔒");
    if (pwd !== pwd2) return setErr("两次输入的密码不一致");
    const res = await fetch("/api/diary/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pwd }),
    });
    if (res.ok) {
      setHasPwd(true);
      setUnlocked(true);
      setPwd("");
      setPwd2("");
      setErr("");
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d?.error || "出了点小差错，再试试？");
    }
  }

  function lock() {
    setUnlocked(false);
    setPwd("");
    setErr("");
  }

  /* ── 日记操作（存数据库） ── */
  function persist(
    date: string,
    data: { text: string; at: number; mood?: string | null; card?: Postcard | null }
  ) {
    fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        text: data.text,
        at: data.at,
        mood: data.mood ?? moods[date] ?? null,
        card: data.card ?? cards[date] ?? null,
      }),
    }).catch(() => {});
  }

  function save() {
    if (!draft.trim()) return;
    setEntries((e) => ({ ...e, [sel]: { text: draft, at: Date.now() } }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    generateCard(sel, draft);
  }

  /** 每日明信片：根据日记内容，从原典里找一句话，织成温柔回馈 */
  async function generateCard(date: string, text: string) {
    setCardBusy(true);
    const feeling = detectFeeling(text);
    const opening = pick(CARD_OPENINGS[feeling]);
    const tip = pick(CARD_TIPS[feeling]);
    const dear = nick ? `亲爱的 ${nick}：` : "亲爱的你：";

    // 从知识库检索一句与日记内容相关的原典金句（检索增强回馈）
    let quote = "";
    let book = "";
    try {
      const res = await fetch(`/api/kb/search?q=${encodeURIComponent(text.slice(0, 60))}&limit=1`);
      const data = await res.json();
      const h = data?.hits?.[0];
      if (h?.quote) {
        quote = h.quote;
        book = `《${h.bookTitle}》· ${h.chapterTitle}`;
      }
    } catch {
      /* 离线也能生成：quote 留空 */
    }

    const body = [
      opening,
      quote ? `\n书里有一句话，想轻轻念给你听：\n「${quote}」\n——${book}` : "",
      `\n${tip}`,
      "\n今天的你辛苦了。明天推开这页日记时，愿你已经轻了一点。",
    ]
      .filter(Boolean)
      .join("\n");

    setCards((c) => {
      const next = {
        ...c,
        [date]: { text: `${dear}\n${body}\n\n——来自「清绪之屿」的明信片 🏝️`, quote, book, at: Date.now() },
      };
      // 明信片也存进数据库
      persist(date, {
        text: entries[date]?.text ?? draft,
        at: entries[date]?.at ?? Date.now(),
        card: next[date],
      });
      return next;
    });
    setCardBusy(false);
  }

  async function regenCard() {
    if (!entries[sel]?.text) return;
    await generateCard(sel, entries[sel].text);
  }

  function gotoDate(d: Date) {
    setSel(ymd(d));
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }

  function step(delta: number) {
    const d = parseYmd(sel);
    d.setDate(d.getDate() + delta);
    setDir(delta > 0 ? 1 : -1);
    gotoDate(d);
  }

  function setMood(colorId: string) {
    setMoods((m) => {
      const next = { ...m };
      if (next[sel] === colorId) delete next[sel];
      else next[sel] = colorId;
      // 心情随日记页一起存数据库
      persist(sel, {
        text: entries[sel]?.text ?? draft,
        at: entries[sel]?.at ?? Date.now(),
        mood: next[sel] ?? null,
      });
      return next;
    });
  }

  /* ── 日历网格 ── */
  const calendar = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const lead = first.getDay();
    const days = new Date(viewY, viewM + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(ymd(new Date(viewY, viewM, d)));
    return cells;
  }, [viewY, viewM]);

  const today = ymd(new Date());
  const colorOf = (id: string) => colors.find((c) => c.id === id);
  const selMood = moods[sel];

  /* ── 渲染：未就绪 ── */
  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center text-warmgray">
        正在翻开日记本…
      </div>
    );
  }

  /* ── 渲染：首次设置密码 ── */
  if (!hasPwd) {
    return (
      <LockShell title="先给日记本上一把锁">
        <p className="mb-5 text-center text-sm leading-relaxed text-warmgray">
          你的日记存在你的账号里，其他用户看不到。设一个专属密码，只有你能打开它 🔐
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="设置密码（至少 4 位）"
          className="diary-input mb-3"
          autoFocus
        />
        <input
          type="password"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          placeholder="再输入一次"
          className="diary-input mb-3"
          onKeyDown={(e) => e.key === "Enter" && setup()}
        />
        {err && <p className="mb-3 text-center text-sm text-coral">{err}</p>}
        <button onClick={setup} className="btn-primary w-full justify-center">
          <Lock size={18} /> 设定并开启
        </button>
      </LockShell>
    );
  }

  /* ── 渲染：解锁 ── */
  if (!unlocked) {
    return (
      <LockShell title="我的日记 · 已上锁">
        <p className="mb-5 text-center text-sm leading-relaxed text-warmgray">
          输入密码，翻开属于你自己的那一页。
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="输入密码"
          className="diary-input mb-3"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && unlock()}
        />
        {err && <p className="mb-3 text-center text-sm text-coral">{err}</p>}
        <button onClick={unlock} className="btn-primary w-full justify-center">
          <Unlock size={18} /> 解锁
        </button>
        <button
          onClick={resetDiaryPwd}
          className="mt-3 text-xs text-warmgray underline-offset-2 transition hover:text-terracotta hover:underline"
        >
          忘记密码了？用当前账号换一把新钥匙
        </button>
      </LockShell>
    );
  }

  /* ── 渲染：日记本主体 ── */
  return (
    <div className="space-y-5">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-terracotta" size={22} />
          <h1 className="font-display text-2xl font-semibold text-ink">
            我的日记
          </h1>
          <span className="rounded-full bg-moss/15 px-3 py-1 text-xs text-moss">
            云端加密 · 按账号隔离 · 仅你可见
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="btn-ghost !px-3 !py-2 text-sm"
          >
            <Palette size={16} /> 心情色板
          </button>
          <button onClick={lock} className="btn-ghost !px-3 !py-2 text-sm">
            <Lock size={16} /> 上锁
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[330px_1fr]">
        {/* 左栏：心情日历 */}
        <aside className="glass-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() =>
                viewM === 0
                  ? (setViewY(viewY - 1), setViewM(11))
                  : setViewM(viewM - 1)
              }
              className="rounded-full p-1.5 text-warmgray hover:bg-peach/60"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-display text-lg font-semibold text-ink">
              {viewY} 年 {viewM + 1} 月
            </span>
            <button
              onClick={() =>
                viewM === 11
                  ? (setViewY(viewY + 1), setViewM(0))
                  : setViewM(viewM + 1)
              }
              className="rounded-full p-1.5 text-warmgray hover:bg-peach/60"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-warmgray">
            {WEEK.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
            {calendar.map((c, i) =>
              c === null ? (
                <div key={i} />
              ) : (
                <button
                  key={c}
                  onClick={() => {
                    setDir(
                      parseYmd(c) > parseYmd(sel) ? 1 : -1
                    );
                    gotoDate(parseYmd(c));
                  }}
                  className="relative aspect-square rounded-lg text-sm transition"
                  style={{
                    background: moods[c]
                      ? `${colorOf(moods[c])?.hex}33`
                      : "rgba(255,255,255,0.5)",
                    color: c === sel ? "#fff" : "#3d352e",
                    boxShadow:
                      c === sel
                        ? "0 0 0 2px #d97e63 inset"
                        : "none",
                    fontWeight: c === today ? 700 : 400,
                  }}
                >
                  {Number(c.slice(8)) === Number(today.slice(8)) &&
                  c.slice(0, 7) === today.slice(0, 7) ? (
                    <span className="absolute left-1 top-0.5 text-[10px] text-terracotta">
                      今
                    </span>
                  ) : null}
                  {Number(c.slice(8))}
                  {moods[c] && (
                    <span
                      className="absolute bottom-1 right-1 h-2 w-2 rounded-full"
                      style={{ background: colorOf(moods[c])?.hex }}
                    />
                  )}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => {
              setDir(0);
              gotoDate(new Date());
            }}
            className="w-full rounded-full bg-peach/70 py-2 text-sm font-medium text-terracotta hover:bg-peach"
          >
            跳到今天
          </button>

          {/* 给选中日标记心情 */}
          <div className="border-t border-peach/40 pt-4">
            <p className="mb-2 text-sm font-semibold text-ink">
              给 {fmtDate(sel).replace(/星期.$/, "")} 标记心情
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setMood(c.id)}
                  title={c.label}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition"
                  style={{
                    background:
                      selMood === c.id ? c.hex : `${c.hex}22`,
                    color: selMood === c.id ? "#fff" : "#3d352e",
                    boxShadow:
                      selMood === c.id ? `0 0 0 2px ${c.hex} inset` : "none",
                  }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: c.hex }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* 右栏：日记书页 */}
        <section className="relative">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => step(-1)}
              className="btn-ghost !px-3 !py-2 text-sm"
            >
              <ChevronLeft size={16} /> 前一天
            </button>
            <span className="text-sm text-warmgray">
              第 {Object.keys(entries).length} 篇日记
            </span>
            <button
              onClick={() => step(1)}
              className="btn-ghost !px-3 !py-2 text-sm"
            >
              后一天 <ChevronRight size={16} />
            </button>
          </div>

          {/* 翻页书页 */}
          <div
            className="relative overflow-hidden rounded-3xl shadow-soft"
            style={{ perspective: 1600 }}
          >
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={sel}
                custom={dir}
                initial={{
                  rotateY: dir === 0 ? 0 : dir > 0 ? -75 : 75,
                  opacity: dir === 0 ? 1 : 0,
                }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{
                  rotateY: dir === 0 ? 0 : dir > 0 ? 75 : -75,
                  opacity: 0,
                }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{
                  transformOrigin: "left center",
                  transformStyle: "preserve-3d",
                  background:
                    "linear-gradient(180deg,#fffaf2 0%, #fdf3e3 100%)",
                }}
                className="relative min-h-[420px] p-7 sm:p-9"
              >
                {/* 纸张装订线质感 */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-10"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.06), transparent)",
                  }}
                />
                {/* 第一行：自动填写的时间 */}
                <div className="mb-4 flex items-baseline gap-2 border-b border-dashed border-terracotta/40 pb-3">
                  <CalendarDays
                    size={18}
                    className="text-terracotta"
                  />
                  <span className="font-display text-lg font-semibold text-ink">
                    {fmtDate(sel)}
                  </span>
                  <span className="text-sm text-warmgray">
                    {entries[sel]
                      ? `· 写于 ${fmtTime(entries[sel].at)}`
                      : "· 还没写哦，今天想记点什么？"}
                  </span>
                </div>

                {/* 横线纸面书写区 */}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="把今天发生的事、心里的念头、身体的感觉，慢慢写下来……"
                  className="diary-paper h-[300px] w-full resize-none bg-transparent text-[15px] leading-[2.1rem] text-ink outline-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 2.0rem, rgba(217,126,99,0.18) 2.0rem, rgba(217,126,99,0.18) 2.1rem)",
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={save} className="btn-primary">
              <Save size={18} /> 保存这一页
            </button>
            {voiceSupported && (
              <button
                onClick={() => (listening ? voiceStop() : voiceStart())}
                className={`btn-ghost !px-3 !py-2 text-sm ${
                  listening ? "!bg-coral/15 !text-coral" : ""
                }`}
                title={listening ? "停止语音输入" : "对着日记说话（语音输入）"}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                {listening ? "在听…" : "语音输入"}
              </button>
            )}
            <AnimatePresence>
              {savedFlash && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1 text-sm text-moss"
                >
                  <Check size={16} /> 已保存
                  {cardBusy && <span className="ml-1 text-warmgray">· 明信片正在路上…</span>}
                </motion.span>
              )}
            </AnimatePresence>
            {listening && voiceInterim && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-coral/80"
              >
                「{voiceInterim}」
              </motion.span>
            )}
          </div>

          {/* 每日明信片：AI 根据今天的日记温柔回馈 */}
          <AnimatePresence>
            {(cards[sel] || cardBusy) && (
              <motion.div
                initial={{ opacity: 0, y: 16, rotate: -0.5 }}
                animate={{ opacity: 1, y: 0, rotate: -0.5 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: "spring", stiffness: 100, damping: 16 }}
                className="relative mt-5 overflow-hidden rounded-3xl border border-dashed border-terracotta/50 bg-[#fffdf7] p-6 shadow-soft sm:p-7"
              >
                {/* 明信片右侧：邮票 + 邮戳 */}
                <div className="pointer-events-none absolute right-5 top-5 flex flex-col items-end gap-2">
                  <div
                    className="flex h-16 w-14 rotate-2 flex-col items-center justify-center rounded-md border-2 border-white shadow-card"
                    style={{
                      background:
                        moods[sel] && colorOf(moods[sel])
                          ? `linear-gradient(150deg, ${colorOf(moods[sel])!.hex}, ${colorOf(moods[sel])!.hex}bb)`
                          : "linear-gradient(150deg,#f2b98a,#d97e63)",
                    }}
                  >
                    <span className="text-xl">{moods[sel] ? "🌤️" : "📮"}</span>
                    <span className="mt-0.5 text-[9px] font-semibold text-white/90">
                      {moods[sel] ? colorOf(moods[sel])?.label : "清绪之屿"}
                    </span>
                  </div>
                  <span className="rounded-full border border-terracotta/30 px-2 py-0.5 text-[9px] text-terracotta/70">
                    {sel.replace(/-/g, ".")}
                  </span>
                </div>

                <div className="flex items-center gap-2 pr-24">
                  <Stamp size={16} className="text-terracotta" />
                  <h4 className="font-display text-base font-semibold text-ink">
                    来自小屿的明信片
                  </h4>
                  {!cardBusy && (
                    <button
                      onClick={regenCard}
                      title="重新生成一张"
                      className="ml-1 rounded-full p-1 text-warmgray/70 transition hover:bg-peach/50 hover:text-terracotta"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                </div>
                {cardBusy ? (
                  <p className="mt-4 animate-pulse text-sm text-warmgray">
                    小屿正在读你今天写下的字，把明信片一笔一笔写好…
                  </p>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap pr-24 text-[14px] leading-relaxed text-ink/85">
                    {cards[sel]?.text}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 border-t border-dashed border-terracotta/30 pt-3 text-[10.5px] text-warmgray/80">
                  <ShieldCheck size={12} className="text-moss" />
                  这张明信片由你的日记生成，引用自 CBT 原典，只存进你的账号
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* 心情色板设置弹层 */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md space-y-4 p-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-ink">
                  心情色板
                </h3>
                <button
                  onClick={() => setPaletteOpen(false)}
                  className="rounded-full bg-peach/60 px-3 py-1 text-sm text-terracotta"
                >
                  完成
                </button>
              </div>
              <p className="text-sm text-warmgray">
                给每种颜色起个名字，定义它代表的心情。日历上点一下就能标记那一天。
              </p>
              <div className="space-y-2">
                {colors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-2xl bg-white/60 p-2"
                  >
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) =>
                        setColors((cs) =>
                          cs.map((x) =>
                            x.id === c.id ? { ...x, hex: e.target.value } : x
                          )
                        )
                      }
                      className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <input
                      value={c.label}
                      onChange={(e) =>
                        setColors((cs) =>
                          cs.map((x) =>
                            x.id === c.id ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                      className="diary-input flex-1 !py-2"
                      placeholder="心情名称"
                    />
                    <button
                      onClick={() =>
                        setColors((cs) => cs.filter((x) => x.id !== c.id))
                      }
                      className="rounded-full p-2 text-warmgray hover:bg-coral/15 hover:text-coral"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setColors((cs) => [
                    ...cs,
                    {
                      id: `c${Date.now()}`,
                      hex: "#D9A441",
                      label: "新心情",
                    },
                  ])
                }
                className="btn-ghost w-full justify-center"
              >
                <Plus size={16} /> 新增一种心情
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="flex items-center justify-center gap-1.5 text-xs text-warmgray">
        <ShieldCheck size={13} className="text-moss" />
        日记与心情存进你的专属账号，密码单向加密，其他用户谁也看不到。
      </p>

      <style jsx global>{`
        .diary-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #ffe8d6;
          background: rgba(255, 255, 255, 0.85);
          padding: 0.7rem 0.9rem;
          color: #3d352e;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .diary-input:focus {
          border-color: #d97e63;
          box-shadow: 0 0 0 3px rgba(240, 160, 140, 0.25);
        }
      `}</style>
    </div>
  );
}

/* 锁屏外壳 */
function LockShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card space-y-2 p-8 text-center"
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sunrise text-2xl shadow-soft">
          🔐
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {title}
        </h1>
        {children}
      </motion.div>
    </div>
  );
}
