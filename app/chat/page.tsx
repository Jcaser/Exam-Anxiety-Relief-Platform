"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Check,
  Loader2,
  RotateCcw,
  Database,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import KbCitation from "@/components/KbCitation";

type Citation = {
  n: number;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookEmoji: string;
  accent: string;
  chapterIndex: number;
  chapterTitle: string;
  snippet: string;
  quote?: string;
  score: number;
};

type KbInfo = {
  sources: { id: string; title: string; emoji: string; accent: string }[];
  stats: { chapters: number; chunks: number; chars: number };
};

type Trace = { id: string; label: string; detail: string; done?: boolean };

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  traces?: Trace[];
  crisis?: boolean;
  mode?: string;
  pending?: boolean;
};

const greet: Msg = {
  role: "assistant",
  content:
    "嗨，我是安心考的陪伴助手 🌤️ 这里很安全，什么都可以说。\n\n我背后接着四本 CBT 原典的知识库：回答之前，先去原文里找依据，再组织成话。所以每段建议后面都标着出处。你此刻最被什么困扰着？",
  citations: [],
};

const prompts = [
  "考试前总是睡不着怎么办",
  "我一进考场就大脑空白",
  "我总觉得别人在背后评价我",
  "怎么停止灾难化的想象",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([greet]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const [kb, setKb] = useState<KbInfo | null>(null);

  useEffect(() => {
    fetch("/api/kb")
      .then((r) => r.json())
      .then((d) => setKb({ sources: d.sources || [], stats: d.stats }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // 支持从书库/阅读页带问题跳转过来：/chat?q=...
  useEffect(() => {
    if (sentInitial.current) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = messages
      .filter((m) => !m.pending && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "", pending: true, traces: [] },
    ]);

    const patch = (fn: (m: Msg) => Msg) =>
      setMessages((all) => {
        const copy = [...all];
        const i = copy.length - 1;
        copy[i] = fn(copy[i]);
        return copy;
      });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, stream: true }),
      });

      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() || "";

        for (const block of blocks) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          let evt: any;
          try {
            evt = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (evt.type === "trace") {
            patch((m) => ({ ...m, traces: [...(m.traces || []), { id: evt.id, label: evt.label, detail: evt.detail }] }));
          } else if (evt.type === "citations") {
            patch((m) => ({ ...m, citations: evt.items || [] }));
          } else if (evt.type === "delta") {
            acc += evt.text || "";
            patch((m) => ({ ...m, content: acc }));
          } else if (evt.type === "done") {
            patch((m) => ({
              ...m,
              pending: false,
              crisis: evt.mode === "crisis",
              mode: evt.mode,
              traces: (m.traces || []).map((t) => ({ ...t, done: true })),
            }));
          }
        }
      }

      patch((m) => ({ ...m, pending: false }));
    } catch {
      patch((m) => ({
        ...m,
        pending: false,
        content: m.content || "网络好像打了个嗝，稍等再试试？",
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        emoji="💬"
        tag="对话陪伴"
        title="随时，陪你聊一会儿"
        desc="回答不是凭空生成的：先去四本 CBT 原典里检索，再组织成话。每段建议都带着出处，你可以点开看原文。"
      />

      {/* 知识库状态：书在后台，不在书架上 */}
      {kb && (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-peach/70 bg-white/60 px-4 py-3 text-[11px] text-warmgray">
          <span className="inline-flex items-center gap-1.5 font-semibold text-terracotta">
            <Database size={13} /> 知识库已接入
          </span>
          {kb.sources.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1"
            >
              <span className="text-[12px] leading-none">{s.emoji}</span>
              <span className="text-ink/80">{s.title}</span>
            </span>
          ))}
          <span className="text-warmgray/70">
            {kb.stats.chapters} 章 · {kb.stats.chunks.toLocaleString()} 片段 · 全文检索
          </span>
        </div>
      )}

      <div className="glass-card flex h-[64vh] flex-col p-4 sm:p-6">
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] ${m.role === "user" ? "" : "w-full sm:max-w-[88%]"}`}>
                {/* 思考轨迹 */}
                {m.role === "assistant" && m.traces && m.traces.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {m.traces.map((t, ti) => (
                      <span
                        key={t.id + ti}
                        className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-warmgray shadow-card ring-1 ring-peach/70"
                        title={t.detail}
                      >
                        {t.done ? (
                          <Check size={11} className="text-moss" />
                        ) : (
                          <Loader2 size={11} className="animate-spin text-coral" />
                        )}
                        {t.label}
                        <span className="text-warmgray/60">· {t.detail}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className={`whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed sm:text-[15px] ${
                    m.role === "user"
                      ? "rounded-br-md bg-terracotta text-white"
                      : m.crisis
                      ? "rounded-bl-md bg-blush text-ink shadow-card ring-1 ring-coral/40"
                      : "rounded-bl-md bg-white text-ink shadow-card"
                  }`}
                >
                  {m.content || (m.pending ? "" : "…")}
                  {m.pending && !m.content && (
                    <span className="inline-flex gap-1 align-middle">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coral [animation-delay:0s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coral [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-coral [animation-delay:0.3s]" />
                    </span>
                  )}
                  {m.pending && m.content && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-terracotta align-middle" />
                  )}
                </div>

                {/* 知识库出处：默认摘要，点开展开原文 */}
                {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-warmgray">
                      <BookOpen size={12} className="text-terracotta" />
                      知识库出处（{m.citations.length}）
                      <span className="text-warmgray/60">· 点开看原文</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {m.citations.map((c) => (
                        <KbCitation key={`${c.bookId}-${c.chapterIndex}-${c.n}`} c={c} />
                      ))}
                    </div>
                    {m.mode && (
                      <p className="text-[10px] text-warmgray/80">
                        {m.mode === "llm" ? "大模型 + 知识库检索生成" : "知识库检索 · 本地抽取作答"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* 快捷提问 */}
        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-peach bg-white/70 px-3 py-1.5 text-xs text-warmgray transition hover:border-terracotta hover:text-terracotta"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-card"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="把此刻的念头写在这里…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-warmgray/70"
          />
          {messages.length > 1 && (
            <button
              type="button"
              onClick={() => setMessages([greet])}
              title="重新开始"
              className="flex h-9 w-9 items-center justify-center rounded-full text-warmgray transition hover:bg-peach/60"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta text-white transition hover:bg-coral disabled:opacity-40"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-warmgray">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-moss" />
          敏感内容将引导你寻求专业帮助（热线 12356）
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-terracotta" />
          答案检索自四本原典，不是凭空生成
        </span>
      </div>
    </div>
  );
}
