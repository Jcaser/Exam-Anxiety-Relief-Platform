# -*- coding: utf-8 -*-
"""下载并安装 Vosk 中文小模型到英文路径（Windows 下 vosk 不支持中文路径）"""
import os
import shutil
import sys
import zipfile
import urllib.request

MIRROR = "https://hf-mirror.com/guloooovoooo/vosk-model-small-cn/resolve/main/vosk-model-small-cn.zip"
TARGET = os.path.join(os.path.expanduser("~"), "vosk-cn")
TMP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "_dl.zip")


def main():
    if os.path.isdir(os.path.join(TARGET, "am")):
        print(f"模型已存在：{TARGET}")
        return
    os.makedirs(os.path.dirname(TMP), exist_ok=True)
    print(f"从镜像下载：{MIRROR}")
    urllib.request.urlretrieve(MIRROR, TMP)
    print(f"下载完成 {os.path.getsize(TMP)//1024//1024} MB，开始解压…")
    with zipfile.ZipFile(TMP) as z:
        z.extractall(os.path.dirname(TMP))
    src = os.path.join(os.path.dirname(TMP), "vosk-model-small-cn")
    if os.path.isdir(TARGET):
        shutil.rmtree(TARGET, ignore_errors=True)
    shutil.move(src, TARGET)
    os.remove(TMP)
    print(f"安装完成：{TARGET}")


if __name__ == "__main__":
    main()
