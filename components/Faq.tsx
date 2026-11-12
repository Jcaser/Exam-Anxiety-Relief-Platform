"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const items = [
  {
    q: "清绪之屿能代替心理咨询或看病吗？",
    a: "不能，也不想代替。清绪之屿是自助参考工具，基于认知行为疗法（CBT）的公开循证框架，帮你日常练习。如果你长期被情绪困扰，或想到伤害自己，请一定寻求专业心理咨询或精神科帮助。",
  },
  {
    q: "我的隐私安全吗？",
    a: "你的思维记录、自评结果都只保存在你自己的浏览器本地（localStorage），不会上传到任何服务器。我们刻意把数据留在你的设备上，让你更安心地倾诉。",
  },
  {
    q: "AI 给的建议靠谱吗？",
    a: "所有回答都限定在 CBT 循证知识框架内生成，不会编造医疗诊断，也不会替你做人生决定。它更像一位温和的练习伙伴，而不是医生。",
  },
  {
    q: "没有 API Key 也能用吗？",
    a: "能。未配置大模型时，对话会自动走本地知识库检索（RAG-lite），依然可以给出温暖、有依据的回应。配置 Key 后会切换到真实大模型。",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="glass-card overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <span className="font-semibold text-ink">{it.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-terracotta transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm text-warmgray">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
