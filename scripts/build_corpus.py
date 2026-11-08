# -*- coding: utf-8 -*-
"""
build_corpus.py —— 把四本 CBT 原典拆成「章节 + 检索片段」，产出 data/library/corpus.json

输入（放在 raw/ 目录下）：
  raw/mind_over_mood.txt      《理智胜过情感》中文 OCR 文本
  raw/feeling_good_en.txt     Feeling Good 英文原版
  raw/burns_zh.txt            《伯恩斯新情绪疗法》中文版
  raw/cbt_beck.txt            《认知行为疗法：基础与应用》中文版

输出：
  data/library/corpus.json    { books: [{ ..., chapters: [{ index, title, text, chunks: [{id,start,end}] }] }] }

只在开发期运行：python scripts/build_corpus.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
OUT_DIR = os.path.join(ROOT, "data", "library")
OUT_FILE = os.path.join(OUT_DIR, "corpus.json")

CHUNK_MAX = 420        # 单个检索片段最大字数
CHUNK_MIN = 140        # 低于此长度的尾巴并入上一片
OVERLAP_SENTENCES = 1  # 相邻片段重叠句数


# ── 文本清洗 ──────────────────────────────────────────────────────────────
def normalize(text: str) -> str:
    text = text.replace("\ufeff", "").replace("\u00a0", " ").replace("\u3000", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # 去掉页码行、纯符号行
    lines = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s:
            lines.append("")
            continue
        if re.fullmatch(r"[\d\s\.\-—·…,，。、]+", s):
            continue
        if re.fullmatch(r"[第\d]{0,3}\s*[页pP]\s*[\d\-/]{1,12}", s):
            continue
        lines.append(re.sub(r"[ \t]{2,}", " ", s))
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_ocrmarks(text: str) -> str:
    """清掉 OCR 常见的乱码与书籍广告尾巴。"""
    text = re.sub(r"[□■▪●◆◇※]", "", text)
    text = re.sub(r"(.)\1{6,}", r"\1\1\1", text)  # 连续重复字符收敛
    return text


# ── 分句 & 切片 ───────────────────────────────────────────────────────────
SENT_SPLIT = re.compile(r"(?<=[。！？!?；;…])|(?<=\.)\s+(?=[A-Z])|\n+")


def split_sentences(text: str):
    parts = [p.strip() for p in SENT_SPLIT.split(text)]
    return [p for p in parts if p]


def chunk_chapter(text: str, book_id: str, chapter_index: int):
    """把一章切成若干片段，返回 [(chunk_id, start, end)]，偏移基于 chapter.text。"""
    sents = split_sentences(text)
    spans = []
    pos = 0
    for s in sents:
        i = text.find(s, pos)
        if i < 0:
            i = pos
        spans.append((i, i + len(s)))
        pos = i + len(s)

    chunks = []
    buf = []
    ci = 0

    def flush():
        nonlocal buf, ci
        if not buf:
            return
        start = buf[0][0]
        end = buf[-1][1]
        piece = text[start:end].strip()
        if len(piece) >= 40:
            chunks.append({"id": f"{book_id}-c{chapter_index}-p{ci}", "start": start, "end": end})
            ci += 1
        # 保留最后 1 句作为下一片的重叠
        buf = buf[-OVERLAP_SENTENCES:] if OVERLAP_SENTENCES else []

    for sp in spans:
        buf.append(sp)
        cur_len = buf[-1][1] - buf[0][0]
        if cur_len >= CHUNK_MAX:
            if len(buf) > 1 and cur_len - (buf[-1][1] - buf[-1][0]) >= CHUNK_MIN:
                last = buf.pop()
                flush()
                buf = [last]
            else:
                flush()
    flush()
    return chunks


# ── 各书章节切分规则 ──────────────────────────────────────────────────────
def split_by_regex(text, pattern, min_len=200, strip_marks=True):
    """按标题正则切章，返回 [(title, body)]。"""
    idxs = [m.start() for m in re.finditer(pattern, text)]
    if not idxs:
        return [("全文", text)]
    out = []
    for n, i in enumerate(idxs):
        end = idxs[n + 1] if n + 1 < len(idxs) else len(text)
        block = text[i:end]
        first, _, rest = block.partition("\n")
        title = first.strip()[:60] or f"第{n + 1}节"
        if strip_marks:
            title = re.sub(r"^#+\s*", "", title).strip()
        out.append((title, rest.strip()))
    return [(t, b) for t, b in out if len(b) >= min_len]


def parse_mind(text: str):
    """《理智胜过情感》：章节标题形如「第1章　了解你的问题」；剔掉目录与版权/广告页。"""
    text = clean_ocrmarks(text)
    # 正文从第一个「第1章　了解你的问题」的第二次出现开始（第一次在目录里）
    pat = re.compile(r"(?m)^\s*第\s*\d+\s*章\s*[\u3000 ]?\s*\S.{0,40}$")
    hits = list(pat.finditer(text))
    if not hits:
        return [("全文", text)]
    # 跳过目录：找到连续「第N章」行区间
    body_start = hits[0].start()
    for i in range(len(hits) - 1):
        gap = text[hits[i].start():hits[i + 1].start()]
        if len(gap) > 800:  # 目录里各章之间距离很短，正文段落很长
            body_start = hits[i + 1].start()
            break
    body = text[body_start:]
    # 去掉书末广告
    cut = body.find("读者服务卡")
    if cut > 0:
        body = body[:cut]
    return split_by_regex(body, r"(?m)^\s*第\s*\d+\s*章[\u3000 ]?\s*\S.{0,40}$")


def parse_burns_zh(text: str):
    """《伯恩斯新情绪疗法》：正文内联「第2章 如何诊断你的情绪(2)」分页标记。"""
    text = clean_ocrmarks(text)
    text = re.sub(r"第\s*(\d+)\s*章[\s\u3000]+([^\s\d(（]{2,24})\s*[（(]\s*\d+\s*[）)]", lambda m: f"\n\n@@CH|{m.group(1)}|{m.group(2)}@@\n\n", text)
    parts = re.split(r"@@CH\|(\d+)\|([^@]+)@@", text)
    # parts: [pre, num, title, body, num, title, body...]
    chapters = {}
    for i in range(1, len(parts), 3):
        num = int(parts[i])
        title = parts[i + 1].strip()
        body = parts[i + 2] if i + 2 < len(parts) else ""
        if len(re.sub(r"\s", "", body)) < 150:
            continue
        chapters.setdefault(num, {"title": title, "body": []})
        chapters[num]["body"].append(body)
    out = []
    for num in sorted(chapters):
        c = chapters[num]
        out.append((f"第{num}章 {c['title']}", "\n".join(c["body"]).strip()))
    return out


def parse_cbt(text: str):
    """《认知行为疗法：基础与应用》：Markdown 风格，# 第X章 为章标题。"""
    text = clean_ocrmarks(text)
    text = re.sub(r"(?m)^### .{0,6}$", "", text)
    pat = re.compile(r"(?m)^#\s*第[一二三四五六七八九十百]+章\s*.{0,40}$")
    hits = list(pat.finditer(text))
    if not hits:
        return [("全文", text)]
    # 目录之后的第一章（目录里密集出现章标题）
    body_start = hits[0].start()
    for i in range(len(hits) - 1):
        if hits[i + 1].start() - hits[i].start() > 3000:
            body_start = hits[i].start()
            break
    return split_by_regex(text[body_start:], r"(?m)^#\s*第[一二三四五六七八九十百]+章\s*.{0,40}$")


def parse_feeling_good(text: str):
    """Feeling Good：### Chapter N 为章标题，紧跟一行章名。"""
    text = clean_ocrmarks(text)
    lines = text.split("\n")
    starts = []
    for i, ln in enumerate(lines):
        m = re.fullmatch(r"#{2,4}\s*Chapter\s+(\d+)\s*", ln.strip())
        if not m:
            continue
        num = int(m.group(1))
        title = ""
        for j in range(i + 1, min(i + 5, len(lines))):
            cand = lines[j].strip("# ").strip()
            if not cand or re.fullmatch(r"Chapter\s+\d+", cand):
                continue
            # 只有像「标题」的短句才当章名：不长、不以句号结尾、不含过多小写单词
            words = cand.split()
            if len(cand) <= 90 and not cand.endswith(".") and len(words) <= 14:
                title = cand
            break
        starts.append((i, num, title))
    if not starts:
        return [("Full Text", text)]

    # 跳过目录区：目录里 Chapter 标题几乎首尾相接
    body_i = 0
    for k in range(len(starts) - 1):
        if starts[k + 1][0] - starts[k][0] > 40:
            body_i = k
            break

    merged = {}
    for k in range(body_i, len(starts)):
        s = starts[k][0]
        e = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        body = "\n".join(lines[s + 1:e]).strip()
        if len(body) < 400:
            continue
        num, title = starts[k][1], starts[k][2]
        label = f"Chapter {num}" + (f": {title}" if title else "")
        # 同章号出现多次时保留正文最长的一段
        if num not in merged or len(body) > len(merged[num][1]):
            merged[num] = (label, body)
    return [merged[n] for n in sorted(merged)]


# ── 书籍元数据 ────────────────────────────────────────────────────────────
BOOKS = [
    {
        "id": "mind-over-mood",
        "file": "mind_over_mood.txt",
        "parse": parse_mind,
        "title": "理智胜过情感",
        "subtitle": "改变思维模式，排除情绪障碍",
        "original": "Mind Over Mood",
        "author": "Dennis Greenberger & Christine A. Padesky",
        "extra": "张忆家 译 · 中国轻工业出版社",
        "year": "2000",
        "lang": "zh",
        "emoji": "🌤️",
        "accent": "#D97E63",
        "intro": "CBT 自助书里最像「工作手册」的一本。七栏思维记录表就出自这里——把一次情绪波动拆成情境、情绪、自动思维、正反证据与平衡想法，一步一步写下来。",
        "tags": ["七栏思维记录", "自动思维", "证据检验", "工作手册"],
    },
    {
        "id": "feeling-good",
        "file": "feeling_good_en.txt",
        "parse": parse_feeling_good,
        "title": "Feeling Good",
        "subtitle": "The New Mood Therapy",
        "original": "Feeling Good",
        "author": "David D. Burns, M.D.",
        "extra": "Original English Edition (1999)",
        "year": "1999",
        "lang": "en",
        "emoji": "📗",
        "accent": "#6F8F6E",
        "intro": "认知疗法走向大众的里程碑。10 种认知扭曲、三栏法、成本收益分析都在这里第一次被系统地讲给普通人听，全球销量逾 500 万册。",
        "tags": ["认知扭曲", "三栏法", "英文原版", "循证经典"],
        "titles": {
            4: "Start by Building Self-Esteem",
            5: "Do-Nothingism: How to Beat It",
            9: "Sadness Is Not Depression",
            10: "The Cause of It All",
            11: "The Approval Addiction",
            12: "The Love Addiction",
            13: "Your Work Is Not Your Worth",
            14: "Dare to Be Average: Ways to Overcome Perfectionism",
        },
    },
    {
        "id": "burns-zh",
        "file": "burns_zh.txt",
        "parse": parse_burns_zh,
        "title": "伯恩斯新情绪疗法",
        "subtitle": "Feeling Good 中文版",
        "original": "Feeling Good (中文版)",
        "author": "David D. Burns",
        "extra": "中文译本",
        "year": "—",
        "lang": "zh",
        "emoji": "📕",
        "accent": "#9C6B78",
        "intro": "Feeling Good 的中文全译本。伯恩斯抑郁清单（BDI）、拖延与内疚的处理、以及「你的工作不等于你的价值」等章节，最适合中文读者直接对照练习。",
        "tags": ["认知扭曲", "BDI 自评", "内疚", "自我价值"],
    },
    {
        "id": "cbt-beck",
        "file": "cbt_beck.txt",
        "parse": parse_cbt,
        "title": "认知行为疗法：基础与应用",
        "subtitle": "原著第三版",
        "original": "Cognitive Behavior Therapy: Basics and Beyond (3rd ed.)",
        "author": "Judith S. Beck",
        "extra": "中文译本",
        "year": "2021",
        "lang": "zh",
        "emoji": "📘",
        "accent": "#5E7FA6",
        "intro": "CBT 的「教科书」：认知概念化、自动思维与中间信念的识别、引导式发现、家庭作业。想知道咨询室里到底怎么做，答案在这本。",
        "tags": ["认知概念化", "引导式发现", "治疗关系", "专业教材"],
    },
]


def main():
    if not os.path.isdir(RAW):
        print(f"[!] 缺少 raw/ 目录，请先把四本书的文本放进去：{RAW}")
        sys.exit(1)

    books_out = []
    total_chunks = 0
    total_chars = 0

    for meta in BOOKS:
        path = os.path.join(RAW, meta["file"])
        if not os.path.exists(path):
            print(f"[!] 跳过（文件不存在）：{meta['file']}")
            continue
        raw = open(path, encoding="utf-8", errors="ignore").read()
        text = normalize(raw)
        raw_chapters = meta["parse"](text)

        # 章名补全：解析器没抓到的章名，用已知目录补齐
        titles = meta.get("titles") or {}
        if titles:
            fixed = []
            for title, body in raw_chapters:
                m = re.match(r"^Chapter\s+(\d+)$", title)
                if m and int(m.group(1)) in titles:
                    title = f"Chapter {m.group(1)}: {titles[int(m.group(1))]}"
                fixed.append((title, body))
            raw_chapters = fixed

        chapters = []
        book_chunks = 0
        for ci, (title, body) in enumerate(raw_chapters):
            body = body.strip()
            if len(body) < 120:
                continue
            chunks = chunk_chapter(body, meta["id"], ci)
            if not chunks:
                continue
            chapters.append({
                "index": len(chapters),
                "title": title,
                "chars": len(body),
                "text": body,
                "chunks": [{"id": c["id"].replace(f"-c{ci}-", f"-c{len(chapters)}-"),
                            "start": c["start"], "end": c["end"]} for c in chunks],
            })
            book_chunks += len(chunks)

        book = {k: v for k, v in meta.items() if k not in ("file", "parse", "titles")}
        book.update({
            "chapterCount": len(chapters),
            "chunkCount": book_chunks,
            "charCount": sum(c["chars"] for c in chapters),
            "chapters": chapters,
        })
        books_out.append(book)
        total_chunks += book_chunks
        total_chars += book["charCount"]
        print(f"[✓] {book['title']}: {len(chapters)} 章 / {book_chunks} 片段 / {book['charCount']:,} 字")

    os.makedirs(OUT_DIR, exist_ok=True)
    payload = {
        "version": 1,
        "books": books_out,
        "stats": {"books": len(books_out), "chapters": sum(b["chapterCount"] for b in books_out),
                  "chunks": total_chunks, "chars": total_chars},
    }
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT_FILE) / 1024 / 1024
    print(f"\n[✓] 写入 {OUT_FILE}  ({size:.2f} MB)")
    print(f"[✓] 合计 {len(books_out)} 本 / {payload['stats']['chapters']} 章 / {total_chunks} 片段 / {total_chars:,} 字")


if __name__ == "__main__":
    main()
