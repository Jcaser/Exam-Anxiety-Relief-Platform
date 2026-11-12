"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircleHeart,
  NotebookPen,
  Quote,
} from "lucide-react";

/** 每种考前焦虑：内心独白（echo）→ AI 温柔回应（reply）→ CBT 小知识（tip） */
const worries = [
  {
    tag: "复习不完的慌",
    echo: "我看不完了，这次肯定要考砸。",
    reply:
      "先别管还剩多少页——把今天这一个小时安排好，就已经是在往前走了。复习从来不是“全部看完”才算数，而是“今天又稳稳走了一步”。",
    tip: "这是典型的「灾难化思维」：把“没复习完”放大成“一定考砸”。把两件事拆开看，慌就小了一圈。",
  },
  {
    tag: "怕让家人失望",
    echo: "要是考不好，他们会不会对我失望？",
    reply:
      "他们在意的从来不是那张成绩单，而是好好吃饭、好好睡觉的你。把“我必须让他们满意”换成“我想让他们放心”，担子会轻很多。",
    tip: "这叫「读心术谬误」——我们替别人预演了失望，却从没真正和他们确认过。一句“我尽力了”，比你想象的更有分量。",
  },
  {
    tag: "考场上大脑空白",
    echo: "万一坐进考场，脑子突然一片空白怎么办？",
    reply:
      "空白是大脑超载时的自我保护，不是能力消失了。放下笔，吸气 4 秒、呼气 6 秒，做三次；再从最简单的第一题开始——熟悉感一回来，它就会自己接上。",
    tip: "焦虑会悄悄占用「工作记忆」，这正是空白的来源。呼吸练习把带宽还给你——先稳身体，再动笔。",
  },
  {
    tag: "考完还反复纠结",
    echo: "那道题我明明会做，为什么要去改答案……",
    reply:
      "交卷铃响的那一刻，这件事就已经翻篇了。与其反复回放，不如把这次的懊恼写下来，告诉自己：记下了，下次就不亏。",
    tip: "反复回想叫「思维反刍」，它只会放大懊悔、不改变结果。把它写进我的日记，是给大脑一个“已归档”的信号。",
  },
];

export default function EmpathySection() {
  const [active, setActive] = useState(0);
  const w = worries[active];

  return (
    <section id="empathy" className="glass-card relative overflow-hidden p-8 sm:p-12">
      {/* 呼吸的暖色光斑，呼应手作纸面 */}
      <motion.div
        className="absolute right-[-40px] top-[-30px] h-48 w-48 rounded-full bg-[#9CB39A]/40 blur-2xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="absolute bottom-[-50px] left-[-30px] h-40 w-40 rounded-full bg-[#FBD9CC]/60 blur-2xl"
        animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        aria-hidden
      />

      <div className="relative">
        <motion.h2
          className="font-display text-3xl font-semibold text-ink sm:text-4xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          考前那几天，你不是一个人
        </motion.h2>
        <motion.p
          className="mt-4 max-w-2xl leading-relaxed text-warmgray"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
        >
          心跳加速、睡不着、越复习越慌、脑子一片空白……这些不是你“不行”，
          而是身体在提醒你：这件事对你很重要。清绪之屿想做的，是接住这份紧绷，
          陪你一点点把它理顺。
        </motion.p>

        <motion.p
          className="mt-7 flex items-center gap-2 text-[13px] font-medium text-coral/80"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-terracotta" />
          </span>
          哪个最像此刻的你？点一下，看看 AI 会怎么接住你。
        </motion.p>

        {/* 焦虑标签：可点选，选中后展开回应卡片 */}
        <div className="mt-4 flex flex-wrap gap-3" role="tablist" aria-label="选择你的考前感受">
          {worries.map((x, i) => {
            const on = i === active;
            return (
              <motion.button
                key={x.tag}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: 0.25 + i * 0.09, duration: 0.45, ease: "easeOut" }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  on
                    ? "bg-terracotta text-white shadow-soft"
                    : "bg-peach/70 text-terracotta hover:bg-peach"
                }`}
              >
                {x.tag}
              </motion.button>
            );
          })}
        </div>

        {/* AI 回应卡片：跟随选中标签切换 */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="mt-6 rounded-4xl bg-white/75 p-6 shadow-card ring-1 ring-peach/50 sm:p-7"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blush text-terracotta">
                <Quote size={13} />
              </span>
              <p className="text-[14.5px] italic leading-relaxed text-warmgray">
                {w.echo}
              </p>
            </div>

            <p className="mt-4 text-[15.5px] leading-relaxed text-ink">
              {w.reply}
            </p>

            <div className="mt-4 rounded-3xl bg-peach/40 px-4 py-3 text-[13px] leading-relaxed text-terracotta/90">
              💡 {w.tip}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-coral"
              >
                <MessageCircleHeart size={15} />
                和 AI 聊聊这个念头
              </Link>
              <Link
                href="/record"
                className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/40 px-5 py-2.5 text-sm font-semibold text-terracotta transition hover:bg-peach/60"
              >
                <NotebookPen size={15} />
                写进我的日记
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
