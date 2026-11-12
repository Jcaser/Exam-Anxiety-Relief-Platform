"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 本地离线语音识别 Hook
 * 音频 → WebAudio 重采样到 16k → WebSocket → 本机 Vosk 模型 → 文字
 * 不依赖 Google 语音服务，离线可用。
 */

const ASR_URL = "ws://127.0.0.1:8765";

type Options = { keepAlive?: boolean };

export function useLocalSpeech(onFinal: (text: string) => void, opts: Options = {}) {
  const { keepAlive = false } = opts;
  const [ready, setReady] = useState(false); // 服务在线？
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;

  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const runningRef = useRef(false);
  const restartTimer = useRef<any>(null);

  // 探测服务是否在线
  useEffect(() => {
    let alive = true;
    const ping = () => {
      try {
        const ws = new WebSocket(ASR_URL);
        ws.onopen = () => {
          if (alive) setReady(true);
          ws.close();
        };
        ws.onerror = () => alive && setReady(false);
        ws.onclose = () => {};
      } catch {
        if (alive) setReady(false);
      }
    };
    ping();
    const t = setInterval(ping, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    try {
      procRef.current?.disconnect();
    } catch {}
    try {
      srcRef.current?.disconnect();
    } catch {}
    procRef.current = null;
    srcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    clearTimeout(restartTimer.current);
    // 通知服务端收尾，把最后一句吐出来
    try {
      wsRef.current?.send(JSON.stringify({ type: "eos" }));
    } catch {}
    setTimeout(() => cleanupAudio(), 250);
    setListening(false);
    setInterim("");
  }, [cleanupAudio]);

  const begin = useCallback(async () => {
    if (runningRef.current) return;
    setError("");
    runningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ws = new WebSocket(ASR_URL);
      wsRef.current = ws;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const src = ctx.createMediaStreamSource(stream);
      srcRef.current = src;

      // 重采样到 16k：用 ScriptProcessor 手动降采样（兼容性最稳）
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      const inRate = ctx.sampleRate;
      const ratio = inRate / 16000;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("连接本地识别服务失败"));
        setTimeout(() => reject(new Error("连接本地识别服务超时")), 4000);
      });

      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.partial) setInterim(d.partial);
          if (d.final) {
            setInterim("");
            finalRef.current(String(d.final).trim());
          }
          if (d.error) setError(d.error);
        } catch {}
      };
      ws.onclose = () => {
        if (runningRef.current && keepAliveRef.current) {
          // 服务断了，稍后重试一次
          setError("本地识别服务断开了，正在重连…");
          restartTimer.current = setTimeout(() => {
            runningRef.current = false;
            cleanupAudio();
            begin();
          }, 1200);
        }
      };

      // 起点累积，做线性插值降采样
      proc.onaudioprocess = (e) => {
        if (!runningRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const outLen = Math.floor(input.length / ratio);
        const out = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const idx = Math.floor(i * ratio);
          const s = Math.max(-1, Math.min(1, input[idx]));
          out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(out.buffer);
      };

      src.connect(proc);
      proc.connect(ctx.destination);
      setListening(true);
      setReady(true);
    } catch (e: any) {
      runningRef.current = false;
      cleanupAudio();
      setListening(false);
      const name = e?.name || "";
      if (name === "NotAllowedError")
        setError("麦克风权限被拒绝：点地址栏左侧图标 → 麦克风 → 允许，然后刷新页面 🔒");
      else if (name === "NotFoundError") setError("找不到麦克风设备，检查是否插好或已被禁用 🎤");
      else if (name === "NotReadableError")
        setError("麦克风被其他程序占用（会议软件等），先关掉它再试");
      else setError(e?.message || "启动语音识别失败，请重试");
    }
  }, [cleanupAudio]);

  return { ready, listening, interim, error, start: begin, stop, setError };
}
