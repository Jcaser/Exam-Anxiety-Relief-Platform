from PIL import Image, ImageChops
import os

BASE = r"C:/Users/Juelyn/Desktop/心理/心理/public/companion"

def trim_white(img, tol=18):
    bg = Image.new("RGB", img.size, (255, 255, 255))
    diff = ImageChops.difference(img.convert("RGB"), bg)
    diff = diff.point(lambda p: 255 if p > tol else 0)
    bbox = diff.getbbox()
    return img.crop(bbox) if bbox else img

# 1) 三视图 → 正面
sheet = Image.open(os.path.join(BASE, "rabbit_sheet.jpg")).convert("RGB")
w, h = sheet.size
front = sheet.crop((0, 0, int(w/3), h))
front = trim_white(front)
front.save(os.path.join(BASE, "rabbit_base.png"))

# 2) 表情表：上排2格（拥抱/倾听），下排3格（睡觉/鼓励/思考）
moods = Image.open(os.path.join(BASE, "rabbit_moods.jpg")).convert("RGB")
mw, mh = moods.size
half_h = mh // 2
cells = {
    "hug":      (0, 0, int(mw*0.5), half_h),
    "listen":   (int(mw*0.5), 0, mw, half_h),
    "sleep":    (0, half_h, int(mw/3), mh),
    "encourage":(int(mw/3), half_h, int(mw*2/3), mh),
    "think":    (int(mw*2/3), half_h, mw, mh),
}
for name, box in cells.items():
    im = moods.crop(box)
    # 裁掉文字区域（下缘 18% 是标签文字）与边缘网格
    im = im.crop((int(im.width*0.04), int(im.height*0.04), int(im.width*0.96), int(im.height*0.82)))
    im = trim_white(im)
    im.save(os.path.join(BASE, f"mood_{name}.png"))
    print(name, im.size)

# 3) Logo：去白边
logo = Image.open(os.path.join(BASE, "logo.jpg")).convert("RGB")
logo = trim_white(logo, tol=12)
logo.save(os.path.join(BASE, "logo.png"))
print("logo", logo.size, "front", front.size)
