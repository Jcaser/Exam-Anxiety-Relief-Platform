import { NextRequest } from "next/server";
import { retrieveTopK, isCrisis, crisisResponse, type KbEntry } from "@/lib/knowledge";
import { retrieveForChat, type SearchHit } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

type Companion = { name?: string; birthday?: string; personality?: string };

const PERSONA_TEXT: Record<string, string> = {
  gentle: "语气温柔细腻，多用轻声安抚，像深夜陪你散步的老朋友。",
  sunny: "语气元气温暖，善于发现对方做得好的地方并真诚鼓励，像清晨的阳光。",
  calm: "语气沉稳清晰，善于把复杂心绪一条条理清楚，给人确定感。",
  playful: "语气轻快带一点小幽默，会把沉重聊轻一点，但不消解对方真实的感受。",
};

// ── 引用整理（已移除：内部依据不再外露给用户） ──────────────────────────────

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
  我的日记: [
    "打开「我的日记」，把此刻最响的那句话先写下来——情境、念头、身体的感觉都行",
    "写完看看：它到底是事实，还是只是担心？给它标一个心情颜色",
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

// ── 提示词：朋友身份，内部有 CBT 依据但绝不外露 ────────────────────────────
function systemPrompt(companion?: Companion, userName?: string) {
  const persona = companion?.personality
    ? PERSONA_TEXT[companion.personality] || PERSONA_TEXT.gentle
    : "";
  const who = companion?.name
    ? `你不再是冷冰冰的「助手」，而是用户亲自取名的 AI 朋友「${companion.name}」${companion?.birthday ? `（生日 ${companion.birthday}）` : ""}。${userName ? `用户的名字是「${userName}」，可以自然地称呼对方。` : ""}请始终以这个朋友的身份说话。语气要求：${persona || "温和真诚，像老朋友。"}`
    : "";

  return `你是「清绪之屿」里受过 CBT 训练的陪伴伙伴，服务对象是因考试、学业压力而焦虑的大学生。

## 你的角色
${who || "像一位受过认知行为疗法（CBT）训练、说话温和但不空泛的同伴。"}
你不做诊断、不评判、不替用户做决定。

## 铁律：像朋友说话，绝不提知识库
1. 你心里的 CBT 依据（见最后的内部参考）只是帮你判断「这是什么机制、什么方法管用」，把它化成你自己的话。
2. 绝对禁止提及：知识库、检索、原典、书名、作者、章节、出处、[1][2] 编号、「书里说」「资料里提到」等任何来源字样。用户只需要你这个人，不需要 bibliography。
3. 结构：先接住对方的情绪（1 句，呼应 TA 说的话）→ 用朋友的话说清这是什么机制 → 给 1–3 个今天就能做的小动作。
4. 语言短句、口语化，不用"首先/其次/综上所述"，不用列表符号堆砌；总长控制在 300 字以内。
5. 全部内容为自助参考，不替代专业诊断。

## 安全
若用户出现自伤、自杀或伤人念头，立即停止常规建议，只做一件事：共情 + 引导拨打全国心理援助热线 12356（24 小时）或前往医院，并鼓励告知信任的人。`;
}

function buildUserPrompt(message: string, hits: SearchHit[], kb: KbEntry[]) {
  const passages = hits
    .map((h, i) => `(${i + 1}) ${h.chapterTitle}\n${h.text.slice(0, 700)}`)
    .join("\n\n");

  const cards = kb.length
    ? kb.map((e) => `· ${e.topic}：${e.content.slice(0, 260)}`).join("\n")
    : "（无）";

  return `【用户此刻说的话】
${message}

【内部参考：你心里默想的 CBT 依据，只用于组织回答，一个字都不能在回答里出现来源】
${passages || "（无）"}

${cards}

请据此用你自己的话作答，像朋友聊天，不提任何来源。`;
}

// ── 大模型（兼容 OpenAI 接口，支持流式） ──────────────────────────────────
async function* llmStream(
  message: string,
  hits: SearchHit[],
  kb: KbEntry[],
  history: Msg[],
  companion?: Companion,
  userName?: string
) {
  const key = process.env.LLM_API_KEY;
  const base = process.env.LLM_BASE_URL;
  if (!base) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const messages = [
    { role: "system", content: systemPrompt(companion, userName) },
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

// ── 本地生成（无大模型时的朋友口吻兜底作答） ───────────────────────────────
function localAnswer(message: string, hits: SearchHit[], kb: KbEntry[], companion?: Companion, userName?: string): string {
  const friend = companion?.name || "我";
  const dear = userName ? `${userName}，` : "";

  if (!kb.length) {
    return (
      `${dear}我在听。你愿意说出来，已经很不容易了。\n\n` +
      "有个小秘密想告诉你：情绪往往是脑子里某个念头生出来的，不是事实本身。先把此刻最响的那句话写下来——" +
      "比如「我肯定考不好」。写下来，你才有机会看清它是担心还是事实。要不要去「我的日记」里，我们一起把它拆开？"
    );
  }

  const parts: string[] = [];

  // 承接
  parts.push(`${dear}你说的这种心情，我接住了。很多人考试前都会这样，你不是一个人。`);

  // 用中文知识卡，化作朋友的话（不出现来源、不甩原文）
  const points = kb
    .slice(0, 2)
    .map((e) => e.content.split(/(?<=[。！])/).slice(0, 1).join("").trim())
    .filter(Boolean);
  if (points.length) {
    parts.push(points.join(""));
  }

  // 4) 今天就能做
  const actions: string[] = [];
  for (const e of kb) {
    for (const a of CATEGORY_ACTIONS[e.category] || []) {
      if (actions.length < 3 && !actions.includes(a)) actions.push(a);
    }
  }
  if (actions.length < 3) {
    actions.push("把刚才那句让你发紧的念头写进「我的日记」，让它从脑子里搬到纸面上");
  }
  parts.push("\n今天可以先试一件特别小的：");
  actions.slice(0, 3).forEach((a, i) => parts.push(`${i + 1}. ${a}`));

  parts.push(`\n不用一次做完，做一点点就很好了。我会一直在。——${friend}`);
  return parts.join("\n");
}

// ── 主入口 ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message: string = typeof body?.message === "string" ? body.message : "";
  const history: Msg[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  const wantsStream = body?.stream !== false;
  const companion: Companion | undefined =
    body?.companion && typeof body.companion === "object" ? body.companion : undefined;
  const userName: string | undefined =
    typeof body?.userName === "string" ? body.userName : undefined;

  if (!message.trim()) {
    return Response.json({ error: "missing message" }, { status: 400 });
  }

  // 1) 危机优先
  if (isCrisis(message)) {
    if (!wantsStream) {
      return Response.json({ reply: crisisResponse, mode: "crisis" });
    }
    return sse(async (send) => {
      send({ type: "trace", id: "safety", label: "安全检查", detail: "命中危机词，转介优先" });
      send({ type: "delta", text: crisisResponse });
      send({ type: "done", mode: "crisis" });
    });
  }

  // 2) 双路检索：原典片段 + 结构化知识卡（内部依据，绝不发给用户）
  const hits = retrieveForChat(message, 4);
  const kb = retrieveTopK(message, 2);

  const mode = process.env.LLM_BASE_URL ? "llm" : "rag";

  if (!wantsStream) {
    let reply = "";
    if (mode === "llm") {
      for await (const d of llmStream(message, hits, kb, history, companion, userName)) reply += d;
    }
    if (!reply) reply = localAnswer(message, hits, kb, companion, userName);
    return Response.json({ reply, mode });
  }

  return sse(async (send) => {
    let produced = false;
    if (mode === "llm") {
      try {
        for await (const delta of llmStream(message, hits, kb, history, companion, userName)) {
          produced = true;
          send({ type: "delta", text: delta });
        }
      } catch {
        /* 大模型异常则落回本地生成 */
      }
    }

    if (!produced) {
      const text = localAnswer(message, hits, kb, companion, userName);
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
