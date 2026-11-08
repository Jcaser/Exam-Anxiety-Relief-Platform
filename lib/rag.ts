// ─────────────────────────────────────────────────────────────────────────
// 检索层（RAG）——四本 CBT 原典的混合检索
//
//  1. 中文按「二元词（bigram）」切分，英文按词切分 —— 不依赖分词词典，
//     避免"考试焦虑"被切错这类中文检索常见问题。
//  2. BM25 打分（k1=1.3, b=0.75），比朴素关键词命中更稳。
//  3. 中英对照词表：中文提问也能命中 Feeling Good 英文原版里的对应概念。
//  4. 摘要片段（snippet）围绕命中位置截取，前端做高亮。
//
// 全部在服务端内存中完成，索引首次使用时惰性构建并常驻，无需外部向量库。
// ─────────────────────────────────────────────────────────────────────────

import { getCorpus, type Book } from "./library";
import { retrieveTopK } from "./knowledge";

export type SearchHit = {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookEmoji: string;
  accent: string;
  lang: "zh" | "en";
  chapterIndex: number;
  chapterTitle: string;
  text: string;
  snippet: string;
  score: number;
  terms: string[];
};

type Doc = {
  book: Book;
  chapterIndex: number;
  chapterTitle: string;
  chunkId: string;
  text: string;
};

// ── 分词 ──────────────────────────────────────────────────────────────────
const CJK_RUN = /[\u4e00-\u9fa5]+/g;
const LATIN_WORD = /[a-z][a-z'-]{1,}/g;

// 高频虚词二元组，命中它们没有区分度，直接丢弃以降低噪声
const NOISE = new Set([
  "的是", "了的", "是不", "不是", "我们", "你们", "他们", "这个", "那个", "一个",
  "什么", "怎么", "可以", "就是", "因为", "所以", "但是", "如果", "已经", "还是",
  "这样", "那样", "自己", "没有", "时候", "有些", "这些", "那些", "觉得",
]);

export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const m of lower.matchAll(LATIN_WORD)) out.push(m[0]);
  for (const run of lower.match(CJK_RUN) || []) {
    if (run.length === 1) {
      out.push(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i++) {
      const bg = run.slice(i, i + 2);
      if (!NOISE.has(bg)) out.push(bg);
    }
  }
  return out;
}

// ── 中英概念对照（中文提问 → 英文原版也能命中） ────────────────────────────
export const LEXICON: Record<string, string[]> = {
  认知扭曲: ["cognitive distortion", "distortion"],
  思维扭曲: ["distortion", "twisted thinking"],
  灾难化: ["catastrophizing", "catastrophic"],
  非黑即白: ["all-or-nothing", "black-and-white"],
  全或无: ["all-or-nothing"],
  过度概括: ["overgeneralization", "overgeneralizing"],
  心理过滤: ["mental filter"],
  读心术: ["mind reading", "mind-reading"],
  先知错误: ["fortune teller", "fortune-telling"],
  情绪推理: ["emotional reasoning"],
  贴标签: ["labeling", "labelling"],
  归己化: ["personalization"],
  应该: ["should statements", "shoulds"],
  认知模型: ["cognitive model"],
  自动思维: ["automatic thoughts"],
  核心信念: ["core belief"],
  中间信念: ["intermediate belief"],
  认知概念化: ["cognitive conceptualization"],
  思维记录: ["thought record", "daily record of dysfunctional thoughts"],
  三栏法: ["triple-column", "three column"],
  证据: ["evidence"],
  替代思维: ["alternative thought", "rational response"],
  行为实验: ["behavioral experiment"],
  暴露: ["exposure"],
  回避: ["avoidance"],
  拖延: ["procrastination", "do-nothingism"],
  内疚: ["guilt"],
  羞愧: ["shame"],
  自尊: ["self-esteem"],
  自我价值: ["self-worth", "worth"],
  完美主义: ["perfectionism"],
  愤怒: ["anger"],
  焦虑: ["anxiety", "anxious"],
  抑郁: ["depression", "depressed"],
  恐惧: ["fear"],
  惊恐: ["panic"],
  失眠: ["insomnia", "sleep"],
  自杀: ["suicide", "suicidal"],
  无望: ["hopelessness", "hopeless"],
  反刍: ["rumination", "ruminating"],
  正念: ["mindfulness"],
  放松: ["relaxation"],
  家庭作业: ["homework", "action plan"],
  引导式发现: ["guided discovery"],
  苏格拉底式提问: ["socratic questioning"],
  成本收益: ["cost-benefit"],
  考试: ["exam", "test"],
  成绩: ["grade", "score"],
};

function expand(query: string): { zhTerms: string[]; enTokens: string[] } {
  const zhTerms: string[] = [];
  const enTokens: string[] = [];
  for (const [zh, ens] of Object.entries(LEXICON)) {
    if (query.includes(zh)) {
      zhTerms.push(zh);
      for (const e of ens) for (const t of tokenize(e)) enTokens.push(t);
    }
  }
  return { zhTerms, enTokens };
}

/**
 * 口语 → 概念的桥。
 * 学生不会说"我在做读心术"，只会说"总觉得别人在评价我"。
 * 这些映射把大白话翻成原典里的术语，检索才有落点。
 */
const CONCEPT_HINTS: { test: RegExp; concepts: string[] }[] = [
  { test: /(家人|父母|爸妈|我妈|我爸|亲人|家里).{0,6}(失望|丢脸|没面子|伤心|看不起)/, concepts: ["应该", "内疚", "核心信念", "取悦"] },
  { test: /(让|使).{0,4}(失望|丢脸|伤心)/, concepts: ["应该", "内疚", "核心信念"] },
  { test: /(别人|同学|大家|所有人).{0,6}(评价|看我|议论|嘲笑|笑话|觉得我)/, concepts: ["读心术", "社交焦虑", "评价"] },
  { test: /(出丑|丢人|没面子|被看不起)/, concepts: ["读心术", "羞愧", "社交焦虑"] },
  { test: /(考砸|考不好|考差|挂科|不及格|成绩不好)/, concepts: ["灾难化", "失败", "成绩"] },
  { test: /(大脑空白|脑子.{0,2}空白|一片空白|卡住|断片)/, concepts: ["考试", "焦虑", "灾难化"] },
  { test: /(睡不着|失眠|入睡|睡不好|半夜醒)/, concepts: ["失眠", "睡眠", "焦虑"] },
  { test: /(拖延|不想复习|开始不了|学不进去|坐不住)/, concepts: ["拖延", "考试", "完美主义"] },
  { test: /(完美|必须.{0,4}最好|不能出错|一点错都不能)/, concepts: ["完美主义", "应该"] },
  { test: /(心跳|心慌|手抖|出汗|胸闷|喘不上气|发抖|紧张)/, concepts: ["焦虑", "放松", "惊恐"] },
  { test: /(反复想|想太多|反刍|一直回想|停不下来)/, concepts: ["反刍", "焦虑"] },
  { test: /(我不行|我不够好|没用|废物|一无是处|配不上)/, concepts: ["核心信念", "自我价值", "贴标签"] },
  { test: /(复习不完|来不及|时间不够)/, concepts: ["考试", "焦虑", "完美主义"] },
];

function conceptTermsOf(query: string): string[] {
  const out: string[] = [];
  for (const { test, concepts } of CONCEPT_HINTS) {
    if (test.test(query)) for (const c of concepts) if (!out.includes(c)) out.push(c);
  }
  return out;
}

// ── 索引 ──────────────────────────────────────────────────────────────────
type Index = {
  docs: Doc[];
  postings: Map<string, number[]>; // token -> [docIdx, tf, docIdx, tf, ...]
  titleTokens: Set<string>[]; // 每个片段所属章的标题词，用于标题加权
  lens: number[];
  avgdl: number;
  N: number;
};

let INDEX: Index | null = null;

function buildIndex(): Index {
  const corpus = getCorpus();
  const docs: Doc[] = [];
  for (const book of corpus.books) {
    for (const ch of book.chapters) {
      for (const c of ch.chunks) {
        docs.push({
          book,
          chapterIndex: ch.index,
          chapterTitle: ch.title,
          chunkId: c.id,
          text: ch.text.slice(c.start, c.end),
        });
      }
    }
  }

  const postings = new Map<string, number[]>();
  const lens = new Array<number>(docs.length);
  const titleTokens: Set<string>[] = new Array(docs.length);
  let totalLen = 0;

  docs.forEach((d, i) => {
    const toks = tokenize(d.text);
    lens[i] = toks.length;
    titleTokens[i] = new Set(tokenize(d.chapterTitle));
    totalLen += toks.length;
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    tf.forEach((n, t) => {
      let arr = postings.get(t);
      if (!arr) {
        arr = [];
        postings.set(t, arr);
      }
      arr.push(i, n);
    });
  });

  return {
    docs,
    postings,
    titleTokens,
    lens,
    avgdl: totalLen / Math.max(1, docs.length),
    N: docs.length,
  };
}

export function ensureIndex(): Index {
  if (!INDEX) INDEX = buildIndex();
  return INDEX;
}

export function indexStats() {
  const idx = ensureIndex();
  return { chunks: idx.N, terms: idx.postings.size, avgdl: Math.round(idx.avgdl) };
}

// ── 生僻字表：用于挑引用句时避开 OCR 噪声 ─────────────────────────────────
// 《理智胜过情感》是扫描 OCR 版，偶尔会把「心脏」认成「心睚」。
// 全语料里出现次数极少的汉字，多半是识别错误或罕见人名，挑摘录句时给它们记一笔。
let RARE: Set<string> | null = null;

function rareChars(): Set<string> {
  if (RARE) return RARE;
  const freq = new Map<string, number>();
  for (const book of getCorpus().books) {
    for (const ch of book.chapters) {
      for (const c of ch.text) {
        if (c >= "\u4e00" && c <= "\u9fa5") freq.set(c, (freq.get(c) || 0) + 1);
      }
    }
  }
  RARE = new Set(Array.from(freq.entries()).filter(([, n]) => n <= 3).map(([c]) => c));
  return RARE;
}

/** 一句话里有多少「生僻字／疑似 OCR 错字」 */
export function noiseScore(sentence: string): number {
  const rare = rareChars();
  let n = 0;
  for (const ch of sentence) if (rare.has(ch)) n++;
  return n;
}

/**
 * 片段质量惩罚：原书是整章切片的，里面混着参考文献、习题答案、图表标题。
 * 这些段落虽然也"命中"关键词，但拿它当依据会很难看，所以降权而不是删除
 * ——毕竟有时确实只有它讲过这件事。
 */
function chunkPenalty(text: string): number {
  const head = text.slice(0, 200);
  let p = 1;

  if (/参考文献|references|bibliography/i.test(head)) p *= 0.2;
  const years = (head.match(/\b(19|20)\d{2}\b/g) || []).length;
  if (years >= 4) p *= 0.5; // 一整段都是年份，多半是文献列表
  if (/^\s*(表|图|table|figure)\s?\d/i.test(head)) p *= 0.75;
  if (/答案[：:]|参考答案/.test(head)) p *= 0.7;

  // 填空、选择、量表条目：下划线/破折号连成串，读起来是碎片，不适合当依据
  const junk = (text.match(/_{2,}|—{3,}|\.{4,}/g) || []).length;
  if (junk >= 3) p *= 0.35;
  else if (junk >= 1) p *= 0.75;

  // OCR 噪声重的段落（扫描版常见）
  if (noiseScore(text) / Math.max(1, text.length) > 0.015) p *= 0.7;

  const ascii = (text.match(/[A-Za-z0-9]/g) || []).length / Math.max(1, text.length);
  if (ascii > 0.6) p *= 0.85; // 公式、代码、人名索引

  return p;
}

// ── 片段摘要 ──────────────────────────────────────────────────────────────
function clean(t: string) {
  return t.replace(/\s*\n+\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * 从原文里挑一句最"能引用"的话：
 * 优先含查询词、带方法与结论意味、OCR 噪声低、长度适中。
 * 中文按句号类标点切句，英文按句点切句。
 */
export function pickQuote(text: string, terms: string[], min = 26, max = 160): string {
  const flat = clean(text);
  const isLatin = /[a-zA-Z]{4,}/.test(flat) && !/[\u4e00-\u9fa5]/.test(flat);
  const sentences = (
    isLatin
      ? flat.split(/(?<=[.!?])\s+(?=[A-Z“"])/)
      : flat.split(/(?<=[。！？；!?;])/)
  )
    .map((s) => s.trim())
    .filter((s) => s.length >= min && s.length <= max * 2 && !/_{2,}|—{3,}|\.{4,}/.test(s));
  if (!sentences.length) return flat.slice(0, max);

  let best = sentences[0];
  let bestScore = -Infinity;
  for (const s of sentences) {
    let sc = 0;
    for (const t of terms) if (s.includes(t)) sc += 3;
    if (/(你可以|试着|建议|关键是|意味着|方法|练习|第一步|其实|注意|当你|you can|try|key is)/i.test(s)) sc += 2;
    sc -= noiseScore(s) * 3;
    sc -= Math.abs(s.length - 80) / 120;
    if (sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  return best.length > max ? best.slice(0, max) + "…" : best;
}

function makeSnippet(text: string, terms: string[], anchors: string[], width = 130): string {
  const flat = clean(text);
  const pick = (list: string[]) => {
    let at = -1;
    for (const t of list) {
      const i = flat.toLowerCase().indexOf(t.toLowerCase());
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    return at;
  };
  // 先用完整词定位；不行再退到二元词，至少让摘要落在命中密度高的地方
  let at = pick(terms);
  if (at < 0) at = pick(anchors);
  if (at < 0) return flat.slice(0, width * 2) + (flat.length > width * 2 ? "…" : "");
  const start = Math.max(0, at - width);
  const end = Math.min(flat.length, at + width);
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "");
}

// ── 检索 ──────────────────────────────────────────────────────────────────
export type SearchOptions = {
  limit?: number;
  bookId?: string;
  /** 每本书最多返回几段，避免某本书霸榜 */
  perBook?: number;
};

export function searchLibrary(query: string, opts: SearchOptions = {}): SearchHit[] {
  const q = (query || "").trim();
  if (q.length < 1) return [];

  const { limit = 12, bookId, perBook = 3 } = opts;
  const idx = ensureIndex();

  const { zhTerms, enTokens } = expand(q);
  const concepts = conceptTermsOf(q);
  const conceptTokens: string[] = [];
  for (const c of concepts) {
    for (const t of tokenize(c)) conceptTokens.push(t);
    for (const e of LEXICON[c] || []) for (const t of tokenize(e)) conceptTokens.push(t);
  }

  const baseTokens = Array.from(new Set(tokenize(q)));
  const weights = new Map<string, number>();
  for (const t of baseTokens) weights.set(t, 1);
  // 中英对照扩展：英文线索权重低一些，避免英文原版压过中文译本
  for (const t of enTokens) weights.set(t, Math.max(weights.get(t) || 0, 0.45));
  // 概念桥：语料里本来就没有"考砸"这个词，靠术语把查询接上去
  for (const t of conceptTokens) {
    if (baseTokens.includes(t)) continue;
    weights.set(t, Math.max(weights.get(t) || 0, 0.8));
  }

  // 概念扩展：先用结构化知识卡认出「这是哪一类问题」，
  // 再把卡片关键词作为弱线索——"怕让家人失望"才落得到「应该式 / 内疚」这类章节上。
  for (const card of retrieveTopK(q, 2)) {
    for (const kw of card.keywords) {
      for (const t of tokenize(kw)) {
        if (baseTokens.includes(t)) continue;
        weights.set(t, Math.max(weights.get(t) || 0, 0.4));
      }
    }
  }

  const conceptSet = new Set(concepts);
  const highlight = Array.from(
    new Set([
      ...zhTerms,
      ...concepts,
      ...q
        .split(/[，。？！、；：\s,.?!;:"'“”‘’（）()《》]+/)
        .filter((s) => s.length >= 2 && s.length <= 14),
    ])
  ).filter((s) => q.includes(s) || zhTerms.includes(s) || conceptSet.has(s));

  const k1 = 1.3;
  const b = 0.75;
  const scores = new Map<number, number>();
  const idfOf = new Map<string, number>();

  weights.forEach((w, token) => {
    const arr = idx.postings.get(token);
    if (!arr) return;
    const df = arr.length / 2;
    const idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));
    if (idf <= 0) return;
    idfOf.set(token, idf);
    for (let j = 0; j < arr.length; j += 2) {
      const di = arr[j];
      const tf = arr[j + 1];
      const dl = idx.lens[di] || 1;
      const norm = tf * (k1 + 1) / (tf + k1 * (1 - b + (b * dl) / idx.avgdl));
      scores.set(di, (scores.get(di) || 0) + w * idf * norm);
    }
  });

  // 章标题命中加权：问「内疚」时，《战胜内疚的方法》这一章应当排前面
  const titleBoost = new Map<number, number>();
  scores.forEach((_, di) => {
    let bonus = 0;
    weights.forEach((w, token) => {
      if (idx.titleTokens[di]?.has(token)) bonus += 0.9 * w * (idfOf.get(token) || 1);
    });
    if (bonus > 0) titleBoost.set(di, bonus);
  });
  titleBoost.forEach((bonus, di) => scores.set(di, (scores.get(di) || 0) + bonus));

  // 摘要／摘录用的词：完整词优先，再补上 idf 最高的几个二元词。
  // 整句提问时，完整句子几乎不会原文出现，靠这些词才能定位到真正相关的那一句。
  const salient = baseTokens
    .filter((t) => t.length >= 2)
    .sort((a, b2) => (idfOf.get(b2) || 0) - (idfOf.get(a) || 0))
    .slice(0, 6);
  const lookupTerms = Array.from(new Set([...highlight, ...salient]));

  const ranked = Array.from(scores.entries())
    .filter(([di]) => !bookId || idx.docs[di].book.id === bookId)
    .map(([di, s]) => [di, s * chunkPenalty(idx.docs[di].text)] as [number, number])
    .sort((a, b2) => b2[1] - a[1]);

  // 每本书限量，保证结果来自多本原典
  const perBookCount = new Map<string, number>();
  const picked: SearchHit[] = [];

  for (const [di, score] of ranked) {
    const d = idx.docs[di];
    const used = perBookCount.get(d.book.id) || 0;
    if (used >= perBook) continue;
    perBookCount.set(d.book.id, used + 1);
    picked.push({
      chunkId: d.chunkId,
      bookId: d.book.id,
      bookTitle: d.book.title,
      bookAuthor: d.book.author,
      bookEmoji: d.book.emoji,
      accent: d.book.accent,
      lang: d.book.lang,
      chapterIndex: d.chapterIndex,
      chapterTitle: d.chapterTitle,
      text: clean(d.text),
      snippet: makeSnippet(d.text, lookupTerms, baseTokens),
      score: Math.round(score * 1000) / 1000,
      terms: lookupTerms,
    });
    if (picked.length >= limit) break;
  }

  return picked;
}

/** 供对话使用：取最相关的若干段原文，并控制上下文长度 */
export function retrieveForChat(query: string, k = 4): SearchHit[] {
  const hits = searchLibrary(query, { limit: k, perBook: 2 });
  return hits.map((h) => ({ ...h, text: h.text.slice(0, 900) }));
}
