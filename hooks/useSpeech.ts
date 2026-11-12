"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DENIED_MIC_HINT, isInSandboxedPreview, PREVIEW_MIC_HINT } from "@/lib/micEnv";

type Options = {
  /** 连续模式：说完一段不自动停（适合通话） */
  continuous?: boolean;
  /** 保活：意外停止时自动重启（通话模式用） */
  keepAlive?: boolean;
};

function humanError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return DENIED_MIC_HINT;
    case "no-speech":
      return "没听到声音，再靠近一点说～";
    case "audio-capture":
      return "找不到麦克风设备，检查一下有没有插麦 🎤";
    case "network":
      return "语音识别服务连不上网，请检查网络后重试";
    case "aborted":
      return "";
    default:
      return "语音识别出了点小差错，再试一次试试";
  }
}

/**
 * 浏览器语音识别 Hook（Web Speech API，Chrome / Edge，zh-CN）。
 * - 实时 interim 文本
 * - 错误以 error 字段暴露（不再静默失败）
 * - 通话模式：continuous + keepAlive 自动重启
 */
export function useSpeechRecognition(
  onFinal: (text: string) => void,
  opts: Options = {}
) {
  const { continuous = false, keepAlive = false } = opts;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;
  const manualStopRef = useRef(false);
  const wantListenRef = useRef(false);

  // 预热 TTS 声音列表（Chrome 首次为空）
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = continuous;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let fin = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else inter += r[0].transcript;
      }
      if (inter) setInterim(inter);
      if (fin) {
        setInterim("");
        finalRef.current(fin.trim());
      }
    };
    rec.onend = () => {
      setListening(false);
      // 保活：非手动停止时自动重启（no-speech 也会触发 end）
      if (wantListenRef.current && keepAliveRef.current && !manualStopRef.current) {
        setTimeout(() => {
          if (!wantListenRef.current) return;
          try {
            recRef.current?.start();
            setListening(true);
            setInterim("");
          } catch {
            /* already started */
          }
        }, 300);
      }
    };
    rec.onerror = (e: any) => {
      const msg = humanError(e?.error || "");
      if (msg) setError(msg);
      if (e?.error === "not-allowed" || e?.error === "audio-capture") {
        wantListenRef.current = false; // 权限类错误不保活
      }
    };
    recRef.current = rec;
    return () => {
      wantListenRef.current = false;
      try {
        rec.abort();
      } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if (!recRef.current) {
      setError("这个浏览器不支持语音识别，请换 Chrome 或 Edge 🌐");
      return;
    }
    // 预览面板 / iframe 里麦克风被浏览器禁用，提前给出清晰引导，而不是报「权限被拒绝」
    if (isInSandboxedPreview()) {
      setError(PREVIEW_MIC_HINT);
      return;
    }
    setError("");
    manualStopRef.current = false;
    wantListenRef.current = true;
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* start 已在进行中，忽略 */
    }
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    wantListenRef.current = false;
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {}
    setListening(false);
    setInterim("");
  }, []);

  return { supported, listening, interim, error, start, stop, setError };
}

/** 语音合成：把 AI 的话读出来 */
export function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // 去掉引用标记、markdown 符号，让朗读自然
  const clean = text
    .replace(/\[\d+\]/g, "")
    .replace(/[#*_`>~|-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean.slice(0, 600));
  u.lang = "zh-CN";
  u.rate = 0.95;
  u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const zh = voices.find((v) => v.lang.startsWith("zh"));
  if (zh) u.voice = zh;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
