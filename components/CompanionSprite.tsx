"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * 兔子精灵：抠图透明素材（用户提供的表情表），表情切换带弹簧动画。
 * idle 挥手待机 / hug 拥抱（接住难过焦虑）/ listen 倾听 / sleep 睡觉 /
 * encourage 鼓励（你的好消息）/ think 思考（正在想办法）
 */
export type Mood = "idle" | "hug" | "listen" | "sleep" | "encourage" | "think";

const SRC: Record<Mood, string> = {
  idle: "/companion/rabbit_base.png",
  hug: "/companion/mood_hug.png",
  listen: "/companion/mood_listen.png",
  sleep: "/companion/mood_sleep.png",
  encourage: "/companion/mood_encourage.png",
  think: "/companion/mood_think.png",
};

const HUG_WORDS = [
  "焦虑", "慌", "怕", "害怕", "紧张", "难过", "崩溃", "哭", "委屈", "压力",
  "失眠", "睡不着", "熬夜", "累", "疲惫", "烦", "完蛋", "考砸", "砸了", "孤独",
  "低落", "丧", "难受", "心慌", "糟糕", "撑不住",
];
const HUG_WORDS_2 = ["鼓励", "谢谢", "谢啦", "辛苦", "抱抱", "安慰"];
const ENCOURAGE_WORDS = [
  "开心", "高兴", "顺利", "不错", "棒", "进步", "完成", "做到", "快乐", "通过",
  "上岸", "轻松", "踏实", "放心", "好消息",
];
const THINK_WORDS = ["怎么办", "为什么", "怎么才能", "方法", "理清", "分析", "怎么想", "搞不懂", "矛盾", "选择"];

/** 从一句话里读出精灵该摆什么表情 */
export function detectMood(text: string): Mood {
  if (!text) return "listen";
  if (HUG_WORDS.some((w) => text.includes(w))) return "hug";
  if (ENCOURAGE_WORDS.some((w) => text.includes(w))) return "encourage";
  if (HUG_WORDS_2.some((w) => text.includes(w))) return "hug";
  if (THINK_WORDS.some((w) => text.includes(w))) return "think";
  return "listen";
}

/** 每种表情专属的小动作 */
const MOOD_ANIM: Record<Mood, { animate: any; transition: any }> = {
  idle: {
    animate: { y: [0, -6, 0], rotate: [0, -2, 0, 2, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  hug: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  listen: {
    animate: { y: [0, -5, 0], rotate: [0, 3, 0, -3, 0] },
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
  },
  sleep: {
    animate: { scale: [1, 0.97, 1], opacity: [1, 0.85, 1] },
    transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
  },
  encourage: {
    animate: { y: [0, -12, 0] },
    transition: { duration: 0.9, repeat: Infinity, ease: "easeOut" },
  },
  think: {
    animate: { rotate: [0, -4, 0, 4, 0], y: [0, -2, 0] },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function CompanionSprite({
  mood = "idle",
  className = "",
  rounded = "",
  speaking = false,
  listening = false,
}: {
  mood?: Mood;
  className?: string;
  rounded?: string;
  speaking?: boolean;
  listening?: boolean;
}) {
  // 通话中：聆听时挥得更欢，说话时轻轻点头
  const base =
    listening && (mood === "listen" || mood === "idle")
      ? {
          animate: { y: [0, -8, 0], rotate: [0, 5, 0, -5, 0] },
          transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
        }
      : speaking
      ? {
          animate: { y: [0, -4, 0], scale: [1, 1.03, 1] },
          transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
        }
      : MOOD_ANIM[mood] ?? MOOD_ANIM.idle;

  return (
    <motion.span
      className={`relative inline-block ${rounded} ${className}`}
      animate={base.animate}
      transition={base.transition}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={mood}
          src={SRC[mood]}
          alt={`精灵表情：${mood}`}
          draggable={false}
          initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 8 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="h-full w-full object-contain"
        />
      </AnimatePresence>
    </motion.span>
  );
}
