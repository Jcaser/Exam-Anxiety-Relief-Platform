import { NextRequest } from "next/server";
import { retrieveTopK, isCrisis, crisisResponse, type KbEntry } from "@/lib/knowledge";
import { retrieveForChat, pickQuote, type SearchHit } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type Citation = {
  n: number;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookEmoji: string;
  accent: string;
  chapterIndex: number;
  chapterTitle: string;
  snippet: string;
  /** 从原文里挑出、适合直接展示的一句 */
  quote: string;
  score: number;
};

type Msg = { role: "user" | "assistant"; content: string };

// ── 引用整理 ──────────────────────────────────────────────────────────────
function toCitations(hits: SearchHit[]): Citation[] {
  return hits.map((h, i) => ({
    n: i + 1,
    bookId: h.bookId,
    bookTitle: h.bookTitle,
    bookAuthor: h.bookAuthor,
    bookEmoji: h.bookEmoji,
    accent: h.accent,
    chapterIndex: h.chapterIndex,
    chapterTitle: h.chapterTitle,
    snippet: h.snippet,
    quote: pickQuote(h.text, h.terms, 24, 150),
    score: h.score,
  }));
}

// ── 落到"今天就能做"的动作 ────────────────────────────────────────────────
const CATEGORY_ACTIONS: Record<string, string[]> = {
  认知模型: [
    "把触发情绪的那件具体事写成一句话（谁、何时、在哪）",
    "写下当时脑子里闪过的第一句话，再标一句「这是事实，还是解释」",
  ],
  认知扭曲: [
    "给这个念头起个名字：是灾难化、读心术，还是非黑即白？",
    "用双标法回自己一句：如果是好朋友这么说，你会怎么回他？",
  ],
  重构技术: [
    "列两栏：支持它的证据 / 反对它的证据，各写三条",
    "用 0–100 分给「它成立的可能性」打分，而不是用「一定/肯定」",
  ],
  思维记录: [
    "打开「思维记录」，先只填前三栏：情境、情绪、自动思维",
    "给这个念头标一个相信度（0–100），写完再标一次，看它有没有松动",
  ],
  放松技术: [
    "做四轮 4-7-8 呼吸：吸 4 秒、屏 7 秒、呼 8 秒",
    "把手放在腹部，确认是肚子在起伏，而不是肩膀在耸",
  ],
  暴露练习: [
    "把害怕的事拆成 5 级，今天只碰最低的那一级",
    "每完成一级，记一句「实际发生了什么」，这是给大脑的新证据",
  ],
  正念: [
    "做一次三分钟呼吸空间：觉察 → 集中 → 扩展",
    "把念头换成「我注意到自己有一个……的想法」，和它拉开一步",
  ],
  考试专项: [
    "把「复习不完」拆成今天能做完的三件小事，只做第一件",
    "用五分钟法则启动：只学五分钟，不行就停",
  ],
  专业求助: [
    "如果这种状态已持续两周以上，去学校心理中心约一次评估",
    "把最近的睡眠、食欲、注意力变化记下来，咨询时能说清楚",
  ],
};

// ── 提示词：把角色、边界、引用规范一次讲清楚 ──────────────────────────────
function systemPrompt() {
  return `你是「安心考」的 CBT 陪伴助手，服务对象是因考试、学业压力而焦虑的大学生。

## 你的角色
像一位受过认知行为疗法（CBT）训练、说话温和但不空泛的同伴。你不做诊断、不评判、不替用户做决定。

## 回答规则
1. 只能依据【检索到的原典片段】和【CBT 知识卡】作答；没有依据时坦白说"书里没有直接讲这个"，再给通用但安全的建议。
2. 引用原文时，用 [1] [2] 标注编号，编号必须来自给定片段；不要编造引用。
3. 结构：先接住对方的情绪（1 句）→ 说清楚这是什么机制（结合原典）→ 给 1–3 个今天就能做的小动作。
4. 语言短句、口语化，不用"首先/其次/综上所述"，不用列表符号堆砌；总长控制在 300 字以内。
5. 全部内容为自助参考，不替代专业诊断。

## 安全
若用户出现自伤、自杀或伤人念头，立即停止常规建议，只做一件事：共情 + 引导拨打全国心理援助热线 12356（24 小时）或前往医院，并鼓励告知信任的人。`;
}

function buildUserPrompt(message: string, hits: SearchHit[], kb: KbEntry[]) {
  const passages = hits
    .map(
      (h, i) =>
        `[${i + 1}]《${h.bookTitle}》· ${h.chapterTitle}\n${h.text.slice(0, 700)}`
    )
    .join("\n\n");

  const cards = kb.length
    ? kb.map((e) => `· ${e.topic}：${e.content.slice(0, 260)}`).join("\n")
    : "（无）";

  return `【用户此刻说的话】
${message}

【检索到的原典片段】
${passages || "（未命中）"}

【CBT 知识卡】
${cards}

请据此作答，引用处标注 [编号]。`;
}

// ── 大模型（兼容 OpenAI 接口，支持流式） ──────────────────────────────────
async function* llmStream(message: string, hits: SearchHit[], kb: KbEntry[], history: Msg[]) {
  const key = process.env.LLM_API_KEY;
  const base = process.env.LLM_BASE_URL;
  if (!base) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const messages = [
    { role: "system", content: systemPrompt() },
    ...history.slice(-6),
    { role: "user", content: buildUserPrompt(message, hits, kb) },
  ];

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "deepseek-chat",
      messages,
      temperature: 0.6,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const payload = s.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* 忽略心跳与解析噪声 */
      }
    }
  }
}

// ── 本地生成（无大模型时的 RAG 抽取式作答） ───────────────────────────────
function localAnswer(message: string, hits: SearchHit[], kb: KbEntry[]): string {
  if (!hits.length && !kb.length) {
    return (
      "我在听。你愿意说出来，已经很不容易了。\n\n" +
      "这次我手边的书里没有直接对应的段落，但有一件事几乎总是有用：先把此刻最响的那句话写下来——" +
      "比如「我肯定考不好」。写下来，你才有机会看清它是担心，还是事实。要不要去「思维记录」里，我们一起把它拆开？"
    );
  }

  const parts: string[] = [];
  const topic = kb[0]?.topic ?? hits[0]?.chapterTitle;

  // 1) 承接
  parts.push(
    hits.length
      ? `你说的这件事，书里其实讨论得很细（先落在「${topic}」上）。`
      : `你说的这种感受，在 CBT 里有个很具体的位置：${topic}。`
  );

  // 2) 原典怎么说
  if (hits.length) {
    parts.push("\n书里是这样说的：");
    hits.slice(0, 2).forEach((h, i) => {
      const quote = pickQuote(h.text, h.terms, 24, 140);
      parts.push(`「${quote}」\n——《${h.bookTitle}》· ${h.chapterTitle} [${i + 1}]`);
    });
  }

  // 3) 机制
  if (kb.length) {
    const two = kb[0].content.split(/(?<=[。])/).slice(0, 2).join("");
    parts.push(`\n这背后的机制是：${two}`);
  }

  // 4) 今天就能做
  const actions: string[] = [];
  for (const e of kb) {
    for (const a of CATEGORY_ACTIONS[e.category] || []) {
      if (actions.length < 3 && !actions.includes(a)) actions.push(a);
    }
  }
  if (actions.length < 3) {
    actions.push("把刚才那句让你发紧的念头写进「思维记录」，让它从脑子里搬到纸面上");
  }
  parts.push("\n今天可以先做一件：");
  actions.slice(0, 3).forEach((a, i) => parts.push(`${i + 1}. ${a}`));

  parts.push("\n不用一次做完，做一点点就算数。");
  return parts.join("\n");
}

// ── 主入口 ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message: string = typeof body?.message === "string" ? body.message : "";
  const history: Msg[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  const wantsStream = body?.stream !== false;

  if (!message.trim()) {
    return Response.json({ error: "missing message" }, { status: 400 });
  }

  // 1) 危机优先
  if (isCrisis(message)) {
    if (!wantsStream) {
      return Response.json({ reply: crisisResponse, mode: "crisis", citations: [] });
    }
    return sse(async (send) => {
      send({ type: "trace", id: "safety", label: "安全检查", detail: "命中危机词，转介优先" });
      send({ type: "delta", text: crisisResponse });
      send({ type: "done", mode: "crisis" });
    });
  }

  // 2) 双路检索：原典片段 + 结构化知识卡
  const hits = retrieveForChat(message, 4);
  const kb = retrieveTopK(message, 2);
  const citations = toCitations(hits);

  const mode = process.env.LLM_BASE_URL ? "llm" : "rag";

  if (!wantsStream) {
    let reply = "";
    if (mode === "llm") {
      for await (const d of llmStream(message, hits, kb, history)) reply += d;
    }
    if (!reply) reply = localAnswer(message, hits, kb);
    return Response.json({ reply, mode, citations });
  }

  return sse(async (send) => {
    send({ type: "trace", id: "safety", label: "安全检查", detail: "通过 · 未命中危机词" });
    send({
      type: "trace",
      id: "retrieve",
      label: "原典检索",
      detail: hits.length
        ? `命中 ${hits.length} 段原文 · ${new Set(hits.map((h) => h.bookId)).size} 本书`
        : "未命中原文，改用知识卡",
    });
    send({ type: "citations", items: citations });
    send({
      type: "trace",
      id: "compose",
      label: "组织回答",
      detail: mode === "llm" ? "大模型 · 带引用生成" : "本地 RAG · 抽取式作答",
    });

    let produced = false;
    if (mode === "llm") {
      try {
        for await (const delta of llmStream(message, hits, kb, history)) {
          produced = true;
          send({ type: "delta", text: delta });
        }
      } catch {
        /* 大模型异常则落回本地生成 */
      }
    }

    if (!produced) {
      const text = localAnswer(message, hits, kb);
      // 本地生成：按句切片推送，前端呈现自然的打字节奏
      for (const piece of text.match(/[^。！？\n]+[。！？\n]?|\n/g) || [text]) {
        send({ type: "delta", text: piece });
        await new Promise((r) => setTimeout(r, 22));
      }
    }

    send({ type: "done", mode: produced ? "llm" : "rag" });
  });
}

// ── SSE 包装 ──────────────────────────────────────────────────────────────
function sse(run: (send: (obj: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* 客户端已断开 */
        }
      };
      try {
        await run(send);
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
