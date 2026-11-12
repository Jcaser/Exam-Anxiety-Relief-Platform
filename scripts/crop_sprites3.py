from PIL import Image, ImageChops
import os
BASE = r"C:/Users/Juelyn/Desktop/心理/心理/public/companion"

def trim(img, tol=45):
    bg = Image.new("RGB", img.size, (255, 255, 255))
    diff = ImageChops.difference(img.convert("RGB"), bg).convert("L")
    diff = diff.point(lambda p: 255 if p > tol else 0)
    bbox = diff.getbbox()
    return img.crop(bbox) if bbox else img

# 正面兔：左 1/3，修边后压缩
sheet = Image.open(os.path.join(BASE, "rabbit_sheet.jpg")).convert("RGB")
w, h = sheet.size
front = trim(sheet.crop((0, 0, int(w/3), h)))
front = front.resize((int(front.width*640/front.height), 640), Image.LANCZOS)
front.save(os.path.join(BASE, "rabbit_base.png"))
print("base", front.size)

# 表情：裁掉文字带，保留米黄底
moods = Image.open(os.path.join(BASE, "rabbit_moods.jpg")).convert("RGB")
mw, mh = moods.size
half = mh // 2
cells = {
    "hug":      (0, 0, int(mw*0.5), half),
    "listen":   (int(mw*0.5), 0, mw, half),
    "sleep":    (0, half, int(mw/3), mh),
    "encourage":(int(mw/3), half, int(mw*2/3), mh),
    "think":    (int(mw*2/3), half, mw, mh),
}
for name, box in cells.items():
    im = moods.crop(box)
    im = im.crop((int(im.width*0.03), int(im.height*0.03), int(im.width*0.97), int(im.height*0.80)))
    im = trim(im, tol=30)
    if im.width > 480:
        im = im.resize((480, int(im.height*480/im.width)), Image.LANCZOS)
    im.save(os.path.join(BASE, f"mood_{name}.png"))
    print(name, im.size)
