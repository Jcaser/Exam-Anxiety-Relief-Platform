# -*- coding: utf-8 -*-
"""验证本地 ASR 服务：合成一段中文语音 → 走 WebSocket → 看能否识别出文字"""
import asyncio, json, os, sys, wave
import websockets

WAV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_test.wav")


def make_wav():
    """用 Windows SAPI 合成一句中文（不依赖外部服务）"""
    try:
        import win32com.client as win32
    except ImportError:
        return False
    try:
        sp = win32.Dispatch("SAPI.SpVoice")
        fs = win32.Dispatch("SAPI.SpFileStream")
        fs.Open(WAV, 3, False)
        sp.AudioOutputStream = fs
        sp.Speak("明天就要考试了，我有一点紧张")
        fs.Close()
        return True
    except Exception as e:
        print("TTS failed:", e)
        return False


def to_pcm16k(path):
    w = wave.open(path, "rb")
    sr = w.getframerate()
    ch = w.getnchannels()
    sw = w.getsampwidth()
    data = w.readframes(w.getnframes())
    w.close()
    print(f"wav: {sr}Hz {ch}ch {sw*8}bit")
    # 已经是 16k 单声道 16bit 就直接返回
    if sr == 16000 and ch == 1 and sw == 2:
        return data, sr
    # 简单重采样（线性插值）
    import array
    if sw != 2:
        return data, sr
    a = array.array("h")
    a.frombytes(data)
    if ch == 2:
        a = array.array("h", [a[i] for i in range(0, len(a), 2)])
    if sr != 16000:
        ratio = sr / 16000
        n = int(len(a) / ratio)
        out = array.array("h", [0] * n)
        for i in range(n):
            out[i] = a[min(len(a) - 1, int(i * ratio))]
        a = out
    return a.tobytes(), 16000


async def main():
    if not os.path.exists(WAV):
        if not make_wav():
            print("SKIP: 无法合成测试音频")
            return
    pcm, sr = to_pcm16k(WAV)
    print(f"pcm bytes: {len(pcm)}  sr={sr}")
    finals = []
    partials = []
    async with websockets.connect("ws://127.0.0.1:8765", max_size=None) as ws:
        async def reader():
            try:
                async for msg in ws:
                    d = json.loads(msg)
                    if d.get("partial"):
                        partials.append(d["partial"])
                    if d.get("final"):
                        finals.append(d["final"])
            except Exception:
                pass
        task = asyncio.create_task(reader())
        step = 8000  # 0.5s
        for i in range(0, len(pcm), step):
            await ws.send(pcm[i:i + step])
            await asyncio.sleep(0.08)
        await ws.send(json.dumps({"type": "eos"}))
        await asyncio.sleep(1.5)
        task.cancel()
    print("partials:", partials[-3:])
    print("FINALS:", finals)


asyncio.run(main())
