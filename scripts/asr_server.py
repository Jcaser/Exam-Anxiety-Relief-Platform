#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
清绪之屿 · 本地语音识别服务
用 Vosk 离线中文模型做流式识别，音频不出本机。

启动：python scripts/asr_server.py  →  ws://127.0.0.1:8765
协议：
  客户端 → 服务端：16kHz / 16bit / 单声道 裸 PCM 二进制块
  服务端 → 客户端：JSON  {"partial": "..."}  /  {"final": "..."}
"""
import asyncio
import json
import os
import sys
import wave
import io

try:
    import websockets
except ImportError:
    print("缺少 websockets，请先 pip install websockets", file=sys.stderr)
    sys.exit(1)

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
except ImportError:
    print("缺少 vosk，请先 pip install vosk", file=sys.stderr)
    sys.exit(1)

SetLogLevel(-1)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Windows 下 vosk 读不了中文路径，优先用英文路径的模型副本
CANDIDATES = [
    os.path.expanduser(os.path.join("~", "vosk-cn")),
    "C:/Users/Juelyn/vosk-cn",
    os.path.join(BASE, "models", "vosk-model-small-cn-0.22"),
    os.path.join(BASE, "models", "vosk-model-small-cn"),
]


def model_dir():
    for p in CANDIDATES:
        if os.path.isdir(p) and os.path.isdir(os.path.join(p, "am")):
            return p
    return CANDIDATES[0]

_model = None


def get_model():
    global _model
    if _model is None:
        d = model_dir()
        if not os.path.isdir(d):
            raise RuntimeError(f"找不到模型目录：{d}")
        print(f"[asr] 正在载入模型 {d} ...", flush=True)
        _model = Model(d)
        print("[asr] 模型已就绪", flush=True)
    return _model


async def handle(ws):
    try:
        model = await asyncio.to_thread(get_model)
    except Exception as e:
        await ws.send(json.dumps({"error": str(e)}))
        return

    rec = KaldiRecognizer(model, 16000)
    rec.SetWords(False)

    try:
        async for msg in ws:
            if isinstance(msg, str):
                # 控制指令
                try:
                    cmd = json.loads(msg)
                except Exception:
                    continue
                if cmd.get("type") == "reset":
                    rec = KaldiRecognizer(model, 16000)
                elif cmd.get("type") == "eos":
                    # 结束本次语句
                    if rec.AcceptWaveform(b""):
                        pass
                    res = json.loads(rec.FinalResult())
                    if res.get("text"):
                        await ws.send(json.dumps({"final": res["text"]}, ensure_ascii=False))
                    rec = KaldiRecognizer(model, 16000)
                continue

            data = msg
            if len(data) < 2:
                continue
            if rec.AcceptWaveform(data):
                res = json.loads(rec.Result())
                if res.get("text"):
                    await ws.send(json.dumps({"final": res["text"]}, ensure_ascii=False))
            else:
                res = json.loads(rec.PartialResult())
                if res.get("partial"):
                    await ws.send(json.dumps({"partial": res["partial"]}, ensure_ascii=False))
    except Exception:
        pass


async def main():
    port = int(os.environ.get("ASR_PORT", "8765"))
    print(f"[asr] 监听 ws://127.0.0.1:{port}", flush=True)
    # 启动前先载入模型，避免首个请求很慢
    try:
        await asyncio.to_thread(get_model)
    except Exception as e:
        print(f"[asr] 模型载入失败：{e}", flush=True)
        return
    async with websockets.serve(handle, "127.0.0.1", port, max_size=None):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
