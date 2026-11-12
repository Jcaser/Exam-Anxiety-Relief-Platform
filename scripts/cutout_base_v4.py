# -*- coding: utf-8 -*-
"""正面兔抠图 v4：行背景色用中位数 + 垂直平滑，抗星星/噪点污染"""
from PIL import Image
from collections import deque

BASE = r"C:/Users/Juelyn/Desktop/心理/心理/public/companion"


def cutout_rowbg(img, tol=70):
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()

    # 每行背景色：左右边缘各 8 像素，取每通道中位数
    raw = []
    for y in range(h):
        samples = [px[x, y] for x in list(range(8)) + list(range(w - 8, w))]
        med = tuple(sorted(s[i] for s in samples)[len(samples) // 2] for i in range(3))
        raw.append(med)
    # 垂直移动平均 ±7 行，抹平星星造成的尖峰
    bgrow = []
    for y in range(h):
        lo, hi = max(0, y - 7), min(h - 1, y + 7)
        seg = raw[lo : hi + 1]
        bgrow.append(tuple(sum(s[i] for s in seg) // len(seg) for i in range(3)))

    def is_bg(x, y):
        p = px[x, y]
        b = bgrow[y]
        return abs(p[0] - b[0]) + abs(p[1] - b[1]) + abs(p[2] - b[2]) <= tol

    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y):
                visited[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not visited[y * w + x]:
                visited[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and is_bg(nx, ny):
                visited[ny * w + nx] = 1
                q.append((nx, ny))

    out = img.convert("RGBA")
    opx = out.load()
    for y in range(h):
        base = y * w
        for x in range(w):
            if visited[base + x]:
                r, g, b = opx[x, y][:3]
                opx[x, y] = (r, g, b, 0)
    return out


def trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def soft_edge(img):
    px = img.load()
    w, h = img.size
    edge = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 255:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        r, g, b = px[x, y][:3]
                        d = abs(r - 250) + abs(g - 243) + abs(b - 224)
                        a = min(255, int(d * 6))
                        if a < 255:
                            edge.append((x, y, r, g, b, max(40, a)))
                        break
    for x, y, r, g, b, a in edge:
        px[x, y] = (r, g, b, a)
    return img


sheet = Image.open(BASE + "/rabbit_sheet.jpg")
w, h = sheet.size
im = cutout_rowbg(sheet.crop((0, 0, w // 3, h)))
im = trim(im)
if im.width > 640:
    im = im.resize((640, int(im.height * 640 / im.width)), Image.LANCZOS)
im = soft_edge(im)
im.save(BASE + "/rabbit_base.png")
print("rabbit_base v4:", im.size)

# 品红自检图
bg = Image.new("RGB", im.size, (255, 0, 255))
bg.paste(im, (0, 0), im)
bg.save(r"C:/Users/Juelyn/Desktop/心理/check_base.png")
print("check saved")
