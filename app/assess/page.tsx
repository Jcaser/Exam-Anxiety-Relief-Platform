"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Heart, RefreshCw, Shuffle } from "lucide-react";
import PageHero from "@/components/PageHero";

/** 每个维度对应的知识库检索词与一句 CB 定位说明 */
const ASPECT_KB: Record<string, { q: string; note: string }> = {
  physio: { q: "放松 身体 呼吸", note: "身体的紧张会喂养焦虑，身体松下来，脑子才有空间。" },
  worry: { q: "担忧 灾难化 预期焦虑", note: "担忧是大脑在预演危险，把「万一」写成「如果…那么…」，它就老实了。" },
  attention: { q: "注意力 专注 分心", note: "焦虑抢走注意力，不是因为你不努力，而是警报系统太吵。" },
  sleep: { q: "失眠 睡眠", note: "睡眠是焦虑的第一张多米诺骨牌，也最先被它推倒。" },
  avoid: { q: "回避 拖延 恐惧", note: "逃避让焦虑短期舒服、长期更壮。小步暴露是它的解药。" },
  self: { q: "自我否定 自我批评 完美主义", note: "对自己苛刻的评分标准，是焦虑最深的根。" },
  eval: { q: "评价 恐惧 别人眼光", note: "「聚光灯效应」：你以为是全场注视，其实大家都在担心自己。" },
  ruminate: { q: "反刍 后悔 思维反刍", note: "反复咀嚼过去，等于把已经结束的考试再考一遍。" },
};

type KbHit = { bookTitle: string; bookAuthor: string; chapterTitle: string; quote?: string; snippet?: string; bookEmoji?: string; accent?: string };

/** 知识库锦囊：检索四本原典，给高分维度配原文建议 */
function KbAdvice({ aspects }: { aspects: { key: string; label: string; emoji: string; mean: number }[] }) {
  const [hits, setHits] = useState<KbHit[] | null>(null);
  const top = aspects.slice(0, 2);
  const queries = top.map((a) => ASPECT_KB[a.key]).filter(Boolean);

  useEffect(() => {
    if (!queries.length) return;
    Promise.all(
      queries.map((c) =>
        fetch(`/api/kb/search?q=${encodeURIComponent(c.q)}&limit=1`)
          .then((r) => (r.ok ? r.json() : { hits: [] }))
          .catch(() => ({ hits: [] }))
      )
    ).then((rs) => setHits(rs.map((r) => r?.hits?.[0]).filter(Boolean)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <BookOpen size={15} className="text-terracotta" /> 知识库锦囊 · 针对你的焦虑集中点
      </h3>
      <p className="mb-4 text-xs text-warmgray">以下内容按你的高分维度，从 CBT 原典知识库里检索而来。</p>
      <div className="space-y-3">
        {top.map((a, i) => (
          <div key={a.key} className="rounded-3xl bg-cream/70 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span>{a.emoji}</span> 「{a.label}」偏高，书里这样说——
            </p>
            <p className="mt-1.5 text-xs text-warmgray">{ASPECT_KB[a.key]?.note}</p>
            {hits?.[i] ? (
              <blockquote className="mt-3 border-l-2 border-terracotta/50 pl-3 text-sm leading-relaxed text-ink/85">
                「{(hits[i].quote || hits[i].snippet || "").slice(0, 120)}」
                <footer className="mt-1.5 text-xs text-warmgray">
                  —— 《{hits[i].bookTitle}》 {hits[i].bookAuthor} · {hits[i].chapterTitle}
                </footer>
              </blockquote>
            ) : (
              <p className="mt-3 text-xs text-warmgray/70">（正在为你检索原典…）</p>
            )}
          </div>
        ))}
        {!top.length && (
          <p className="rounded-3xl bg-moss/10 p-5 text-sm text-moss">
            各维度都平稳，没有需要重点照顾的部位。保持当前的节奏就是最好的策略 🌿
          </p>
        )}
      </div>
    </div>
  );
}

// ── 题库：按测评维度组织，每维 4 题，每次随机抽 2 题 ──────────────────────
type Aspect = { key: string; label: string; emoji: string; items: string[] };
type Q = { id: string; text: string; aspect: Aspect };

const ASPECTS: Aspect[] = [
  {
    key: "physio",
    label: "生理唤醒",
    emoji: "💓",
    items: [
      "一想到考试，我就开始心慌、心跳明显加快",
      "考试前后我容易手抖、出汗或口干",
      "临考时我会胃不舒服、想上厕所或没胃口",
      "考试时我会感到头晕、胸闷或喘不上气",
    ],
  },
  {
    key: "worry",
    label: "认知担忧",
    emoji: "🧠",
    items: [
      "我总担心自己复习得不够，怕考砸",
      "我常把一次考试的结果，等同于自己行不行",
      "还没考，我就已经在脑子里预演考砸的画面",
      "考试前我满脑子都是「万一考不好怎么办」",
    ],
  },
  {
    key: "attention",
    label: "注意力",
    emoji: "🔍",
    items: [
      "考前我容易走神，越想学越学不进",
      "考试遇到难题，我会立刻慌神、大脑一片空白",
      "复习时我常常记不住刚看过的东西",
      "考试时我很难集中注意力，容易被干扰",
    ],
  },
  {
    key: "sleep",
    label: "睡眠",
    emoji: "🌙",
    items: [
      "考试前我很难入睡，或睡得很浅",
      "我常因为考试而早醒、睡不踏实",
      "考前一晚我往往整夜辗转反侧",
      "考试期间我总感觉睡不够、白天没精神",
    ],
  },
  {
    key: "avoid",
    label: "行为回避",
    emoji: "🚪",
    items: [
      "我会因为考试而回避朋友、娱乐或休息",
      "越临近考试，我越想拖延、逃避复习",
      "我常通过刷手机、发呆来躲开复习任务",
      "考试前后我不太想跟人说话，只想一个人躲着",
    ],
  },
  {
    key: "self",
    label: "自我否定",
    emoji: "🪞",
    items: [
      "我觉得必须考好，否则就说明我很差",
      "我怕考砸会让父母或重要的人失望",
      "我对自己考试的要求近乎苛刻，容不得失误",
      "考得不理想时，我会狠狠否定自己",
    ],
  },
  {
    key: "eval",
    label: "评价恐惧",
    emoji: "👀",
    items: [
      "我很在意别人怎么看我的成绩",
      "考试时我总感觉有人在拿我和别人比",
      "我怕在考场上出丑、被同学觉得笨",
      "出成绩前我特别焦虑别人会怎么议论我",
    ],
  },
  {
    key: "ruminate",
    label: "考后反刍",
    emoji: "🔁",
    items: [
      "考完之后，我仍反复纠结自己考得不好",
      "一出考场我就忍不住对答案、算能得多少分",
      "我常为已经过去的考试后悔很久",
      "哪怕考得还行，我也会盯着失误的地方不放",
    ],
  },
];

const PER_ASPECT = 2;

const options = [
  { label: "从不", v: 0 },
  { label: "偶尔", v: 1 },
  { label: "经常", v: 2 },
  { label: "总是", v: 3 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 每次从每个维度随机抽 2 题，再把整批打乱顺序
function buildQuiz(): Q[] {
  const picked: Q[] = [];
  for (const aspect of ASPECTS) {
    const idx = shuffle(aspect.items.map((_, i) => i)).slice(0, PER_ASPECT);
    idx.forEach((i) =>
      picked.push({ id: `${aspect.key}-${i}`, text: aspect.items[i], aspect })
    );
  }
  return shuffle(picked);
}

// 按「每题平均分（0–3）」判档，档位对称对应四种回答的重心：
// 全「从不」=正常，围绕「偶尔」=轻度，围绕「经常」=中度，围绕「总是」=高度
function interpret(mean: number) {
  if (mean < 0.5)
    return {
      band: "正常范围",
      color: "text-moss",
      tip: "你的状态总体平稳，紧张感在健康范围内。保持节奏，把这份清醒用在复习上就好。",
    };
  if (mean < 1.5)
    return {
      band: "轻度焦虑",
      color: "text-honey",
      tip: "焦虑刚开始冒头。试试用「我的日记」把担心写下来，你会发现很多念头其实站不住脚。",
    };
  if (mean < 2.5)
    return {
      band: "中度焦虑",
      color: "text-coral",
      tip: "焦虑已经开始抢戏了。先别逼自己，从几次深呼吸和「我的日记」开始，一点点把重量卸下来。",
    };
  return {
    band: "高度焦虑",
    color: "text-terracotta",
    tip: "你正扛着很重的压力，这很辛苦。先照顾好睡眠和身体，再借助「我的日记」慢慢拆解，必要时寻求专业支持。",
  };
}

// 单维度强度分级（均分 0–3），与总档位同尺度
function aspectLevel(m: number) {
  if (m < 0.5) return { label: "平稳", bar: "bg-moss", txt: "text-moss" };
  if (m < 1.5) return { label: "偏高", bar: "bg-honey", txt: "text-honey" };
  if (m < 2.5) return { label: "明显", bar: "bg-coral", txt: "text-coral" };
  return { label: "较强", bar: "bg-terracotta", txt: "text-terracotta" };
}

export default function AssessPage() {
  const [quiz, setQuiz] = useState<Q[]>(() => buildQuiz());
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const allAnswered = quiz.every((q) => answers[q.id] !== undefined);
  const total = quiz.reduce((s, q) => s + (answers[q.id] ?? 0), 0);
  const max = quiz.length * 3;
  const mean = total / quiz.length;
  const res = interpret(mean);

  // 分维度统计
  const byAspect = ASPECTS.map((a) => {
    const qs = quiz.filter((q) => q.aspect.key === a.key);
    if (!qs.length) return null;
    const sum = qs.reduce((s, q) => s + (answers[q.id] ?? 0), 0);
    return { ...a, mean: sum / qs.length };
  }).filter(Boolean) as (Aspect & { mean: number })[];

  const ranked = [...byAspect].sort((x, y) => y.mean - x.mean);
  const elevated = ranked.filter((a) => a.mean >= 0.5).slice(0, 2);

  function reshuffle() {
    setQuiz(buildQuiz());
    setAnswers({});
    setDone(false);
  }

  function finish() {
    localStorage.setItem(
      "axk_assess",
      JSON.stringify({
        score: total,
        max,
        band: res.band,
        pct: Math.round((total / max) * 100),
        date: Date.now(),
      })
    );
    setDone(true);
  }

  return (
    <div className="space-y-8">
      <PageHero
        emoji="📝"
        tag="焦虑自评"
        title="先看看，焦虑卡在哪一环"
        desc="凭第一感觉选就好，没有标准答案。这只是一个帮你自我觉察的小工具，不是诊断。"
      />

      {/* 量表导览：8 个维度一目了然 */}
      <div className="glass-card p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-ink">这份量表看什么</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-warmgray">
          考试焦虑不是一团笼统的「慌」，它有八个可以被看清的切面。每次测评会从下面每个维度随机抽 2 题，
          结束后告诉你焦虑集中在哪几个切面、CBT 原典里对应怎么说。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ASPECTS.map((a) => (
            <div key={a.key} className="flex items-center gap-2.5 rounded-2xl bg-cream/70 px-3.5 py-3">
              <span className="text-lg">{a.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{a.label}</p>
                <p className="text-[11px] text-warmgray">4 题 · 每次抽 2</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-peach/30 px-4 py-3 text-xs leading-relaxed text-warmgray">
          🌿 填写时不需要思考「应该怎样」，凭最近两周的真实感受选就好。结果只用于自我觉察，不会上传给任何人。
        </p>
      </div>

      {!done ? (
        <div className="glass-card space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-warmgray">
              本批随机抽取自 <span className="font-semibold text-ink">8 个维度</span> · 共{" "}
              {quiz.length} 题
            </p>
            <button
              onClick={reshuffle}
              className="btn-ghost !px-4 !py-1.5 text-sm"
            >
              <Shuffle size={14} /> 换一批题
            </button>
          </div>

          {quiz.map((q, i) => (
            <div key={q.id}>
              <p className="mb-3 font-medium text-ink">
                <span className="text-terracotta">{i + 1}.</span> {q.text}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-peach/60 px-2 py-0.5 text-[11px] text-terracotta">
                  {q.aspect.emoji} {q.aspect.label}
                </span>
                <div className="grid flex-1 grid-cols-4 gap-2">
                  {options.map((o) => (
                    <button
                      key={o.v}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: o.v }))
                      }
                      className={`rounded-2xl border px-2 py-2.5 text-sm font-medium transition ${
                        answers[q.id] === o.v
                          ? "border-terracotta bg-terracotta text-white shadow-soft"
                          : "border-peach bg-white/70 text-warmgray hover:border-terracotta/60"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            disabled={!allAnswered}
            onClick={finish}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            查看我的结果 <ArrowRight size={18} />
          </button>
          {!allAnswered && (
            <p className="text-center text-sm text-warmgray">还有题目没选哦～</p>
          )}
        </div>
      ) : (
        <div className="glass-card space-y-7 p-8 sm:p-12">
          <div className="flex flex-col items-center text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-peach text-terracotta">
              <Heart size={28} />
            </span>
            <p className="mt-4 text-sm text-warmgray">你的焦虑指数</p>
            <p className={`text-5xl font-bold ${res.color}`}>
              {total} <span className="text-2xl text-warmgray">/ {max}</span>
            </p>
            <p className={`mt-1 text-lg font-semibold ${res.color}`}>{res.band}</p>
            <p className="mt-1 text-xs text-warmgray">
              每题平均 {mean.toFixed(2)} / 3
            </p>
          </div>

          {/* 分维度拆解 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">焦虑主要体现在哪些方面</h3>
            <div className="space-y-2.5">
              {ranked.map((a) => {
                const lv = aspectLevel(a.mean);
                return (
                  <div key={a.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink">
                        {a.emoji} {a.label}
                      </span>
                      <span className={lv.txt}>
                        {lv.label} · {a.mean.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream">
                      <div
                        className={`h-full rounded-full ${lv.bar}`}
                        style={{ width: `${Math.round((a.mean / 3) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-warmgray">
              {elevated.length
                ? `目前看来，焦虑主要集中在${elevated
                    .map((a) => `「${a.label}」`)
                    .join("和")}方面。`
                : "目前各个方面都还算平稳，没有明显的焦虑集中点。"}
            </p>
          </div>

          <p className="mx-auto max-w-md text-warmgray">{res.tip}</p>

          {/* 知识库锦囊：针对高分维度检索原典 */}
          <KbAdvice aspects={ranked} />

          <p className="mx-auto max-w-md rounded-2xl bg-cream/70 px-4 py-3 text-xs leading-relaxed text-warmgray">
            说明：本量表为<span className="font-semibold text-ink">自我觉察工具</span>
            ，条目参考常见焦虑筛查维度（如 GAD-7 思路）并结合考试情境改编，
            每次随机抽取、分维度评估，不构成临床诊断。若结果为「高度焦虑」且持续两周以上、
            明显影响睡眠或学业，建议前往学校心理咨询中心或精神科 / 心理科就诊。
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/diary" className="btn-primary">
              用我的日记拆一拆 <ArrowRight size={18} />
            </Link>
            <Link href="/chat" className="btn-ghost">
              和 AI 聊聊
            </Link>
          </div>
          <button
            onClick={reshuffle}
            className="mx-auto flex items-center gap-1.5 text-sm text-warmgray hover:text-terracotta"
          >
            <RefreshCw size={14} /> 重新测一次（换一批题目）
          </button>
        </div>
      )}
    </div>
  );
}
