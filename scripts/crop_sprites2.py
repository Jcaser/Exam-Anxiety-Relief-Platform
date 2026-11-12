from PIL import Image
import os
BASE = r"C:/Users/Juelyn/Desktop/心理/心理/public/companion"

def alpha_bg(img, tol=30):
    """把四角相近的浅色背景转透明（按边缘采样色）"""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    corners = [px[2,2][:3], px[w-3,2][:3], px[2,h-3][:3], px[w-3,h-3][:3]]
    base = tuple(sum(c[i] for c in corners)//4 for i in range(3))
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            if abs(r-base[0])+abs(g-base[1])+abs(b-base[2]) < tol*3:
                px[x,y] = (r,g,b,0)
    return img

for f, maxw in [("rabbit_base.png", 560), ("mood_hug.png",480), ("mood_listen.png",480),
                ("mood_sleep.png",480), ("mood_encourage.png",480), ("mood_think.png",480)]:
    p = os.path.join(BASE, f)
    im = Image.open(p)
    im = alpha_bg(im)
    if im.width > maxw:
        im = im.resize((maxw, int(im.height*maxw/im.width)), Image.LANCZOS)
    im.save(p)
    print(f, im.size)

logo = Image.open(os.path.join(BASE, "logo.png"))
logo.save(os.path.join(BASE, "icon-256.png"), [("resized", logo.resize((256,256), Image.LANCZOS))] if False else None)
logo.resize((256,256), Image.LANCZOS).save(os.path.join(BASE, "logo-256.png"))
print("done")
