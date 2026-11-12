"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cake,
  Check,
  Loader2,
  Mic,
  Pencil,
  Phone,
  PhoneOff,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import MicCheck from "@/components/MicCheck";
import CompanionSprite, { detectMood, type Mood } from "@/components/CompanionSprite";
import { useSpeechRecognition, speak, stopSpeaking } from "@/hooks/useSpeech";
import { useLocalSpeech } from "@/hooks/useLocalSpeech";
import { isInSandboxedPreview } from "@/lib/micEnv";

/* ── 类型 ─────────────────────────────────────────────── */

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

type Trace = { id: string; label: string; detail: string; done?: boolean };

type Msg = {
  role: "user" | "assistant";
  content: string;
  traces?: Trace[];
  crisis?: boolean;
  mode?: string;
  pending?: boolean;
};

type Personality = { id: string; label: string; emoji: string; desc: string };

const PERSONALITIES: Personality[] = [
  { id: "gentle", label: "温柔倾听型", emoji: "🌙", desc: "说话轻轻的，先接住情绪，再慢慢聊" },
  { id: "sunny", label: "元气鼓励型", emoji: "🌻", desc: "热乎乎的打气小队长，总能找到亮点" },
  { id: "calm", label: "冷静思考型", emoji: "🧭", desc: "稳稳帮你理清思路，一句是一句" },
  { id: "playful", label: "幽默陪伴型", emoji: "🍀", desc: "会讲小笑话，把沉重的事聊轻一点" },
];

const PERSONA_TEXT: Record<string, string> = {
  gentle: "语气温柔细腻，多用安抚性的轻声细语，像深夜陪你散步的老朋友。",
  sunny: "语气元气温暖，善于发现对方做得好的地方并真诚地鼓励，像清晨的阳光。",
  calm: "语气沉稳清晰，善于把复杂的心绪一条条理清楚，给人确定感。",
  playful: "语气轻快带一点小幽默，会用俏皮话把沉重聊轻，但不消解对方的真实感受。",
};

type Companion = { name: string; birthday: string; personality: string };

function greetingOf(c: Companion, userName: string): Msg {
  const p = PERSONALITIES.find((x) => x.id === c.personality);
  const hello = userName ? `嗨 ${userName}，` : "嗨，";
  const openers: Record<string, string> = {
    gentle: "我在呢。这里很安静，什么都可以慢慢说。",
    sunny: "今天有什么想聊的？好事坏事我都想听！",
    calm: "把心里乱糟糟的事带来吧，我们一条一条理。",
    playful: "我来啦～今天的心情天气怎么样？多云转晴还是小雨绵绵？",
  };
  return {
    role: "assistant",
    content: `${hello}我是${c.name} ${p?.emoji ?? "🌿"} ${
      openers[c.personality] ?? openers.gentle
    }\n\n今天心里是什么天气？说出来，我们一起慢慢理。`,
  };
}

const prompts = [
  "考试前总是睡不着怎么办",
  "我一进考场就大脑空白",
  "我总觉得别人在背后评价我",
  "怎么停止灾难化的想象",
];

/* ── 页面 ─────────────────────────────────────────────── */

/** 收音中动画：绿色声波条，传达「正在聆听」而不是「麦克风被关」 */
function VoiceBars() {
  const delays = [0, 0.15, 0.3, 0.45];
  return (
    <span className="flex h-5 w-5 items-end justify-center gap-[2px]" aria-hidden>
      {delays.map((d, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full bg-current"
          style={{ height: 18, originY: 1 }}
          animate={{ scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: d }}
        />
      ))}
    </span>
  );
}

export default function ChatPage() {
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [companionReady, setCompanionReady] = useState(false);
  const [userName, setUserName] = useState("");

  // 伙伴设定表单
  const [fName, setFName] = useState("");
  const [fBirth, setFBirth] = useState("");
  const [fPerson, setFPerson] = useState("gentle");
  const [setupErr, setSetupErr] = useState("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const [mood, setMood] = useState<Mood>("idle");

  // 是否处于预览面板 / iframe 中（麦克风会被浏览器禁用，需提示用户去真实浏览器）
  const [inPreview, setInPreview] = useState(false);
  useEffect(() => {
    setInPreview(isInSandboxedPreview());
  }, []);

  // 语音 / 视频通话
  const [callActive, setCallActive] = useState(false);
  const [videoCall, setVideoCall] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const callRef = useRef(false);
  const videoRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  callRef.current = callActive;
  videoRef.current = videoCall;

  function handleVoiceFinal(text: string) {
    if (callRef.current) {
      send(text, true);
      return;
    }
    committedRef.current = committedRef.current + text;
    setInput(committedRef.current);
  }
  const {
    supported: voiceSupported,
    listening,
    interim,
    error: voiceError,
    start,
    stop,
    setError: setVoiceError,
  } = useSpeechRecognition(handleVoiceFinal, { keepAlive: callActive });

  // 本地离线识别（Vosk）：可用时优先用它，网络不通也能说话
  const local = useLocalSpeech(handleVoiceFinal, { keepAlive: callActive });
  const useLocal = local.ready;
  const micListening = useLocal ? local.listening : listening;
  const micInterim = useLocal ? local.interim : interim;
  const micError = useLocal ? local.error : voiceError;
  const micStart = useLocal ? local.start : start;
  const micStop = useLocal ? local.stop : stop;
  const micSupported = useLocal || voiceSupported;
  const clearMicError = () => (useLocal ? local.setError("") : setVoiceError(""));
  const committedRef = useRef("");
  // 语音识别时，把已确认文本 + 正在识别的文本实时回填输入框
  useEffect(() => {
    if (!micListening) committedRef.current = input;
  }, [input, micListening]);
  useEffect(() => {
    if (micListening && !callRef.current) setInput(committedRef.current + (micInterim || ""));
  }, [micInterim, micListening]);

  useEffect(() => {
    // 伙伴设定存在数据库里（每用户独立）
    if (userName) {
      fetch("/api/companion")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const c = d?.companion;
          if (c && c.name) {
            setCompanion(c);
            setMessages([greetingOf(c, userName)]);
          }
        })
        .catch(() => {});
    }
    setCompanionReady(true);
  }, [userName]);

  // 重新登录后若知道用户名，且还是初始问候，补上称呼
  useEffect(() => {
    if (!userName || messages.length !== 1) return;
    setMessages((m) =>
      m.length === 1 && companion
        ? [greetingOf(companion, userName)]
        : m
    );
  }, [userName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, micInterim]);

  // 本地会话里的用户名（登录门写入）
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("axk_session") || "null");
      if (s?.name) setUserName(s.name);
    } catch {}
    setCompanionReady(true);
  }, []);

  // 支持 /chat?q=... 带问题跳转
  useEffect(() => {
    if (sentInitial.current || !companion) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion]);

  // 语音通话循环：空闲且对方没在说话时自动开始聆听
  useEffect(() => {
    if (!callActive || busy || aiSpeaking || micListening) return;
    const t = setTimeout(() => micStart(), 500);
    return () => clearTimeout(t);
  }, [callActive, busy, aiSpeaking, micListening, micStart]);

  function saveCompanion() {
    const n = fName.trim();
    if (!n) return setSetupErr("给它取个名字吧，哪怕叫「小屿」🕯️");
    if (n.length > 10) return setSetupErr("名字最多 10 个字哦");
    const c: Companion = { name: n, birthday: fBirth, personality: fPerson };
    setCompanion(c);
    setMessages([greetingOf(c, userName)]);
    setSetupErr("");
    // 存进数据库（每个用户有自己的伙伴）
    fetch("/api/companion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companion: c }),
    }).catch(() => {});
  }

  async function send(text: string, viaCall = false) {
    if (!text.trim() || busy || !companion) return;
    const history = messages
      .filter((m) => !m.pending && m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    setInput("");
    setBusy(true);
    setMood("think"); // 精灵正在思考
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
        body: JSON.stringify({ message: text, history, stream: true, companion, userName }),
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

      // 根据你刚说的话，让精灵摆出对应的表情
      const felt = detectMood(text);
      setMood(felt === "think" ? "listen" : felt);

      // 语音通话模式：把回复读出来
      if (callRef.current && acc.trim()) {
        setAiSpeaking(true);
        speak(acc, () => setAiSpeaking(false));
      }
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

  function hangUp() {
    setCallActive(false);
    callRef.current = false;
    setVideoCall(false);
    micStop();
    stopSpeaking();
    setAiSpeaking(false);
    setMood("idle");
  }

  function startCall(withVideo: boolean) {
    setVideoCall(withVideo);
    setCallActive(true);
    setMood("listen");
  }

  /* ── 伙伴设定（初次进入） ── */
  if (companionReady && !companion) {
    return (
      <div className="space-y-6">
        <PageHero emoji="🌿" tag="对话陪伴" title="先认识一下你的 AI 朋友" desc="它将一直在这里陪你聊，给它起个名字、记住它的生日、选一种你喜欢的性格吧。" />
        {/* 精灵亮相 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="flex justify-center"
        >
          <CompanionSprite mood="idle" className="h-36 w-36 shadow-soft ring-1 ring-peach/60" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mx-auto max-w-lg space-y-6 p-8"
        >
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles size={15} className="text-terracotta" /> 它叫什么名字？
            </label>
            <input
              value={fName}
              onChange={(e) => { setFName(e.target.value); setSetupErr(""); }}
              maxLength={10}
              placeholder="比如：小屿、阿澈、木木…"
              className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-warmgray/60 focus:border-terracotta"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Cake size={15} className="text-terracotta" /> 它的生日（可选）
            </label>
            <input
              type="date"
              value={fBirth}
              onChange={(e) => setFBirth(e.target.value)}
              className="w-full rounded-2xl border border-peach bg-white/80 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-terracotta"
            />
            <p className="mt-1.5 text-xs text-warmgray">到那天，它会收到你的祝福，也会谢谢你记得 🎂</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">它是什么性格？</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFPerson(p.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    fPerson === p.id
                      ? "border-terracotta bg-peach/50 shadow-card"
                      : "border-peach/70 bg-white/60 hover:border-terracotta/50"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="ml-1.5 text-sm font-semibold text-ink">{p.label}</span>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-warmgray">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {setupErr && <p className="text-center text-sm text-coral">{setupErr}</p>}
          <button onClick={saveCompanion} className="btn-primary w-full justify-center">
            <Check size={18} /> 就这样，开始聊吧
          </button>
        </motion.div>
      </div>
    );
  }

  const p = companion ? PERSONALITIES.find((x) => x.id === companion.personality) : null;

  return (
    <div className="space-y-6">
      {/* 伙伴信息条 */}
      {companion && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-peach/70 bg-white/60 px-4 py-3 text-xs text-warmgray">
          <CompanionSprite mood={mood} className="h-12 w-12" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-peach/60 px-3 py-1 font-semibold text-terracotta">
            {p?.emoji} {companion.name}
          </span>
          <span>{p?.label}</span>
          {companion.birthday && (
            <span className="inline-flex items-center gap-1">
              <Cake size={12} className="text-terracotta" />
              {companion.birthday}
            </span>
          )}
          <span className="text-warmgray/70">
            {mood === "idle" && "🌱 在岛上等你"}
            {mood === "think" && "💭 正在为你想"}
            {mood === "hug" && "🫂 想抱抱你"}
            {mood === "encourage" && "🎉 为你高兴"}
            {mood === "listen" && "👂 在听你说"}
          </span>
          <button
            onClick={() => {
              if (confirm("重新设定会更换你的 AI 朋友（聊天记录会清空），确定吗？")) {
                setCompanion(null);
                setMessages([]);
                setFName("");
                setFBirth("");
                setFPerson("gentle");
              }
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-warmgray transition hover:bg-peach/60 hover:text-terracotta"
          >
            <Pencil size={12} /> 重新设定
          </button>
        </div>
      )}

      <div className="glass-card flex h-[64vh] flex-col p-4 sm:p-6">
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* 兔子形象头像：代替名字文字 */}
              {m.role === "assistant" && companion && (
                <CompanionSprite
                  mood={m.pending && !m.content ? "think" : detectMood(m.content)}
                  className="mt-0.5 h-10 w-10 shrink-0 sm:h-11 sm:w-11"
                />
              )}
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
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* 快捷提问 */}
        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {prompts.map((pr) => (
              <button
                key={pr}
                onClick={() => send(pr)}
                className="rounded-full border border-peach bg-white/70 px-3 py-1.5 text-xs text-warmgray transition hover:border-terracotta hover:text-terracotta"
              >
                {pr}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        {inPreview && (
          <div className="mb-2 rounded-2xl bg-honey/10 px-4 py-2.5 text-xs text-honey">
            🎙️ 语音输入需在独立浏览器中使用：当前是预览面板，浏览器出于安全禁用了麦克风。请在
            <span className="font-semibold"> 本机 Chrome / Edge 打开 http://localhost:3000 </span>
            后点麦克风、允许一次即可。
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-card"
        >
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!micListening) committedRef.current = e.target.value;
            }}
            placeholder={micListening ? "在听你说…" : "把此刻的念头写在这里…"}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-warmgray/70"
          />
          {/* 语音输入 */}
          {micSupported && (
            <button
              type="button"
              onClick={() => (micListening ? micStop() : micStart())}
              title={micListening ? "正在聆听，点击停止" : "语音输入"}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                micListening
                  ? "bg-moss/20 text-moss ring-1 ring-moss/50"
                  : "text-warmgray hover:bg-peach/60"
              }`}
            >
              {micListening ? <VoiceBars /> : <Mic size={16} />}
            </button>
          )}
          {/* 语音输入错误提示 */}
          {micError && (
            <div className="mt-2 rounded-2xl bg-coral/10 px-4 py-3 text-xs text-coral">
              <div className="flex items-start gap-1.5">
                🎙️ <span className="flex-1">{micError}</span>
                <button
                  onClick={() => clearMicError("")}
                  className="shrink-0 underline underline-offset-2"
                >
                  知道了
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <MicCheck />
              </div>
            </div>
          )}
          {/* 正常显示时也留一个自检入口 */}
          {!micError && micSupported && (
            <div className="mt-2 flex justify-end">
              <MicCheck />
            </div>
          )}
          {!micSupported && (
            <p className="mt-2 rounded-2xl bg-honey/10 px-4 py-2.5 text-xs text-honey">
              🎙️ 语音功能需要 Chrome 或 Edge 浏览器（Firefox / 部分国产浏览器不支持）
            </p>
          )}
          {/* 语音通话：真语音，说出来它就会听、会用声音回答 */}
          {micSupported && companion && (
            <button
              type="button"
              onClick={() => startCall(false)}
              title="和它打个语音电话"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-moss/15 text-moss transition hover:bg-moss/25"
            >
              <Phone size={15} />
            </button>
          )}
          {messages.length > 1 && (
            <button
              type="button"
              onClick={() => companion && setMessages([greetingOf(companion, userName)])}
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
          由 AI 生成，供自助参考 · 危机信号会引导专业帮助
        </span>
      </div>

      {/* ── 语音通话覆盖层 ── */}
      <AnimatePresence>
        {callActive && companion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-8 p-6"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(66,40,25,0.97) 0%, rgba(36,22,16,0.99) 75%)",
            }}
          >
            <motion.div
              animate={
                micListening
                  ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0 0 rgba(255,207,162,0.35)", "0 0 0 24px rgba(255,207,162,0)", "0 0 0 0 rgba(255,207,162,0)"] }
                  : { scale: 1 }
              }
              transition={{ duration: 1.6, repeat: Infinity }}
              className="h-40 w-40 cursor-pointer select-none"
              title={aiSpeaking ? "点一下打断它" : undefined}
              onClick={() => {
                // 打断：它说话时点一下，立刻停、转回聆听
                if (aiSpeaking) {
                  stopSpeaking();
                  setAiSpeaking(false);
                }
              }}
            >
              <CompanionSprite
                rounded="rounded-full"
                className="h-full w-full shadow-soft ring-4 ring-[#ffcfa2]/30"
                speaking={aiSpeaking}
                micListening={micListening}
                mood={
                  busy
                    ? "think"
                    : aiSpeaking
                    ? mood === "think"
                      ? "listen"
                      : mood
                    : micListening
                    ? "listen"
                    : "idle"
                }
              />
            </motion.div>

            <div className="text-center">
              <h2 className="font-display text-3xl font-semibold text-[#ffe9d2]">
                {companion.name}
              </h2>
              <p className="mt-2 flex items-center justify-center gap-2 text-sm text-[#ffcfa2]/85">
                {busy || aiSpeaking ? (
                  <>
                    <Volume2 size={15} className="animate-pulse" />
                    {aiSpeaking ? "正在和你说…" : "正在想怎么回答…"}
                  </>
                ) : micListening ? (
                  <>
                    <Mic size={15} className="animate-pulse text-[#8fd0a8]" />
                    在听你说…{micInterim && <span className="text-[#ffcfa2]/60">「{micInterim}」</span>}
                  </>
                ) : micSupported ? (
                  "正在准备聆听…"
                ) : (
                  "这个浏览器暂不支持语音 🥲"
                )}
              </p>
              {micError && (
                <p className="mx-auto mt-2 max-w-sm rounded-2xl bg-[#e05d4b]/25 px-4 py-2 text-xs text-[#ffd9d2]">
                  🎙️ {micError}
                </p>
              )}
            </div>

            {/* 最近一轮对话回显 */}
            <div className="max-h-40 w-full max-w-lg overflow-y-auto rounded-3xl bg-[#2e1c13]/70 p-5 text-sm leading-relaxed text-[#ffe9d2]/90 ring-1 ring-[#ffcfa2]/20">
              {messages.filter((m) => m.content).slice(-2).map((m, i) => (
                <p key={i} className={m.role === "user" ? "text-right text-[#ffcfa2]/75" : ""}>
                  {m.role === "assistant" && <span className="font-semibold text-[#ffcfa2]">{companion.name}：</span>}
                  {m.content.length > 180 ? m.content.slice(0, 180) + "…" : m.content}
                </p>
              ))}
            </div>

            <button
              onClick={hangUp}
              className="flex items-center gap-2.5 rounded-full bg-[#e05d4b] px-8 py-4 font-semibold text-white shadow-soft transition hover:brightness-110 active:scale-95"
            >
              <PhoneOff size={20} /> 挂断
            </button>
            <p className="text-xs text-[#ffcfa2]/50">
              直接说话就好，{companion.name}听到后会回答你 · 通话内容不会保存
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
