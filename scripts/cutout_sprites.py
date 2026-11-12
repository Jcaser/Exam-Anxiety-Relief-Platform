# -*- coding: utf-8 -*-
"""从边缘洪泛填充抠图：背景转透明，保留兔子白色身体（深色轮廓挡住洪水）"""
from PIL import Image
from collections import deque
import os

BASE = r"C:/Users/Juelyn/Desktop/心理/心理/public/companion"


def cutout(img, tol=30):
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()
    corners = [px[1, 1], px[w - 2, 1], px[1, h - 2], px[w - 2, h - 2]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def near_bg(p):
        return abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= tol

    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_bg(px[x, y]):
                visited[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if near_bg(px[x, y]) and not visited[y * w + x]:
                visited[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and near_bg(px[nx, ny]):
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


def shrink(img, maxw):
    if img.width > maxw:
        img = img.resize((maxw, int(img.height * maxw / img.width)), Image.LANCZOS)
    return img


def soft_edge(img):
    """给边缘一圈半透明过渡，去掉奶油色残边"""
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
                        # 越接近背景色（奶油色）越透明
                        d = abs(r - 250) + abs(g - 243) + abs(b - 224)
                        a = min(255, int(d * 6))
                        if a < 255:
                            edge.append((x, y, r, g, b, max(40, a)))
                        break
    for x, y, r, g, b, a in edge:
        px[x, y] = (r, g, b, a)
    return img


# 1) 正面兔
sheet = Image.open(os.path.join(BASE, "rabbit_sheet.jpg"))
w, h = sheet.size
base = cutout(sheet.crop((0, 0, w // 3, h)))
base = trim(base)
base = shrink(base, 640)
base = soft_edge(base)
base.save(os.path.join(BASE, "rabbit_base.png"))
print("rabbit_base", base.size)

# 2) 表情表：上排2（拥抱/倾听） 下排3（睡觉/鼓励/思考）
moods = Image.open(os.path.join(BASE, "rabbit_moods.jpg"))
mw, mh = moods.size
half = mh // 2
cells = {
    "hug": (0, 0, int(mw * 0.5), half),
    "listen": (int(mw * 0.5), 0, mw, half),
    "sleep": (0, half, mw // 3, mh),
    "encourage": (mw // 3, half, int(mw * 2 / 3), mh),
    "think": (int(mw * 2 / 3), half, mw, mh),
}
for name, box in cells.items():
    im = moods.crop(box)
    im = im.crop((int(im.width * 0.03), int(im.height * 0.03), int(im.width * 0.97), int(im.height * 0.80)))
    im = cutout(im)
    im = trim(im)
    im = shrink(im, 480)
    im = soft_edge(im)
    im.save(os.path.join(BASE, f"mood_{name}.png"))
    print(name, im.size)

# 3) Logo 抠图 + favicon
logo = cutout(Image.open(os.path.join(BASE, "logo.jpg")), tol=26)
logo = trim(logo)
logo.save(os.path.join(BASE, "logo.png"))
logo.resize((256, 256), Image.LANCZOS).save(os.path.join(BASE, "logo-256.png"))
logo.resize((256, 256), Image.LANCZOS).save(
    r"C:/Users/Juelyn/Desktop/心理/心理/app/icon.png"
)
print("logo", logo.size)
print("ALL DONE")
