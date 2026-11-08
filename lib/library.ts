// ─────────────────────────────────────────────────────────────────────────
// 书库（Library）——四本 CBT 原典的结构化语料
//
// 仅服务端使用：语料来自 data/library/corpus.json（由 scripts/build_corpus.py 生成）
// 客户端请通过 /api/library 系列接口读取，不要把这份 2.8MB 的语料打进浏览器。
// ─────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";

export type ChunkRef = { id: string; start: number; end: number };

export type Chapter = {
  index: number;
  title: string;
  chars: number;
  text: string;
  chunks: ChunkRef[];
};

export type Book = {
  id: string;
  title: string;
  subtitle: string;
  original: string;
  author: string;
  extra: string;
  year: string;
  lang: "zh" | "en";
  emoji: string;
  accent: string;
  intro: string;
  tags: string[];
  chapterCount: number;
  chunkCount: number;
  charCount: number;
  chapters: Chapter[];
};

export type Corpus = {
  version: number;
  books: Book[];
  stats: { books: number; chapters: number; chunks: number; chars: number };
};

/** 书籍公开信息（不含正文，可安全返回给前端） */
export type BookMeta = Omit<Book, "chapters"> & {
  chapters: { index: number; title: string; chars: number }[];
};

let cache: Corpus | null = null;

export function getCorpus(): Corpus {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "library", "corpus.json");
  cache = JSON.parse(fs.readFileSync(file, "utf-8")) as Corpus;
  return cache;
}

export function getBook(id: string): Book | undefined {
  return getCorpus().books.find((b) => b.id === id);
}

export function toMeta(book: Book): BookMeta {
  return {
    ...book,
    chapters: book.chapters.map((c) => ({ index: c.index, title: c.title, chars: c.chars })),
  };
}

export function listBookMetas(): BookMeta[] {
  return getCorpus().books.map(toMeta);
}

/**
 * 每本书在知识库里承担的职能——它不只是"一本书"，
 * 而是检索链路里补上的一块：扭曲分类、记录格式、概念化框架……
 */
const KB_ROLE: Record<string, { role: string; use: string }> = {
  "mind-over-mood": {
    role: "认知扭曲分类学",
    use: "把「自动思维」拆成可检验的句子，10 种扭曲的名字与例句最全，三栏法原始表述也在这里。",
  },
  "feeling-good": {
    role: "英文原版 · 自助作业",
    use: "中文译本丢掉的口语与练习步骤，用来补全拖延、自我价值、应该式思维的处理方式。",
  },
  "burns-zh": {
    role: "思维记录 · 行为改变",
    use: "七栏表怎么填、填不动时怎么办，以及从「想通」走到「做出改变」的具体作业。",
  },
  "cbt-beck": {
    role: "个案概念化 · 治疗结构",
    use: "把零散技巧放回完整框架：信念层级、会谈结构、家庭作业设计与常见卡点。",
  },
};

const KB_FALLBACK = {
  role: "CBT 循证原典",
  use: "为回答提供理论依据与原文出处。",
};

export type KbSource = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  emoji: string;
  accent: string;
  lang: "zh" | "en";
  chapterCount: number;
  chunkCount: number;
  charCount: number;
  role: string;
  use: string;
};

/** 知识库来源清单（不含正文，可安全返回给前端） */
export function kbSources(): KbSource[] {
  return getCorpus().books.map((b) => {
    const extra = KB_ROLE[b.id] || KB_FALLBACK;
    return {
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      author: b.author,
      emoji: b.emoji,
      accent: b.accent,
      lang: b.lang,
      chapterCount: b.chapterCount,
      chunkCount: b.chunkCount,
      charCount: b.charCount,
      role: extra.role,
      use: extra.use,
    };
  });
}

export function libraryStats() {
  return getCorpus().stats;
}
