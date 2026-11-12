"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, Loader2, Mic, XCircle } from "lucide-react";

type Check = { key: string; label: string; state: "wait" | "run" | "ok" | "fail"; detail?: string };

const ASR_URL = "ws://127.0.0.1:8765";

/**
 * 麦克风与本地识别自检
 * 1) 本地识别服务（Vosk，ws://127.0.0.1:8765）是否在线
 * 2) 麦克风权限与设备
 * 3) 声音电平是否在跳动
 * 4) 实际识别是否出文字
 */
export default function MicCheck() {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<Check[]>([
    { key: "svc", label: "本地识别服务（Vosk）", state: "wait" },
    { key: "perm", label: "麦克风权限与设备", state: "wait" },
    { key: "level", label: "声音采集", state: "wait" },
    { key: "recog", label: "实时识别", state: "wait" },
  ]);
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [running, setRunning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);

  const set = (key: string, patch: Partial<Check>) =>
    setChecks((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    try {
      procRef.current?.disconnect();
    } catch {}
    procRef.current = null;
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
    setRunning(false);
  }

  useEffect(() => () => cleanup(), []);

  async function run() {
    cleanup();
    setTranscript("");
    setLevel(0);
    setChecks((cs) => cs.map((c) => ({ ...c, state: "wait", detail: undefined })));
    setRunning(true);

    // 1) 本地服务
    set("svc", { state: "run" });
    const svcOk = await new Promise<boolean>((resolve) => {
      try {
        const ws = new WebSocket(ASR_URL);
        const t = setTimeout(() => resolve(false), 3000);
        ws.onopen = () => {
          clearTimeout(t);
          ws.close();
          resolve(true);
        };
        ws.onerror = () => {
          clearTimeout(t);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
    if (!svcOk) {
      set("svc", {
        state: "fail",
        detail: "本地识别服务没启动：运行 python scripts/asr_server.py（或联系我启动）",
      });
      setRunning(false);
      return;
    }
    set("svc", { state: "ok", detail: "ws://127.0.0.1:8765 在线，识别完全在本机完成" });

    // 2) 麦克风
    set("perm", { state: "run" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      const map: Record<string, string> = {
        NotAllowedError: "权限被拒绝：点地址栏图标 → 麦克风 → 允许",
        NotFoundError: "找不到麦克风设备",
        NotReadableError: "麦克风被其他程序占用",
      };
      set("perm", { state: "fail", detail: map[e?.name] || e?.message || "无法访问麦克风" });
      setRunning(false);
      return;
    }
    streamRef.current = stream;
    set("perm", { state: "ok", detail: `已连接：${stream.getAudioTracks()[0]?.label || "默认麦克风"}` });

    // 3) 电平 + 4) 识别
    set("level", { state: "run", detail: "请对着麦克风说句话…" });
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    let peak = 0;
    let okLevel = false;
    const tick = () => {
      an.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length;
      peak = Math.max(peak, avg);
      setLevel(Math.min(100, Math.round(avg * 1.8)));
      if (!okLevel && peak > 8) {
        okLevel = true;
        set("level", { state: "ok", detail: `采集正常（峰值 ${peak.toFixed(0)}）` });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    // 识别链路
    set("recog", { state: "run", detail: "请说一句话，等待文字出现…" });
    const ws = new WebSocket(ASR_URL);
    wsRef.current = ws;
    const ratio = ctx.sampleRate / 16000;
    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
      ws.onerror = () => resolve();
      setTimeout(resolve, 3000);
    });
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        const text = d.partial || d.final || "";
        if (text) {
          setTranscript(text);
          set("recog", { state: "ok", detail: `识别成功：「${text}」` });
        }
      } catch {}
    };
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    procRef.current = proc;
    proc.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const outLen = Math.floor(input.length / ratio);
      const out = new Int16Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      ws.send(out.buffer);
    };
    src.connect(proc);
    proc.connect(ctx.destination);
  }

  const icon = (s: Check["state"]) =>
    s === "ok" ? (
      <CheckCircle2 size={16} className="text-moss" />
    ) : s === "fail" ? (
      <XCircle size={16} className="text-coral" />
    ) : s === "run" ? (
      <Loader2 size={16} className="animate-spin text-honey" />
    ) : (
      <span className="h-4 w-4 rounded-full border border-warmgray/40" />
    );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-peach/60 px-3.5 py-2 text-xs font-medium text-terracotta transition hover:bg-peach"
      >
        <Activity size={13} /> 语音自检
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-peach bg-white/85 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Activity size={15} className="text-terracotta" /> 语音链路自检
        </h4>
        <button
          onClick={() => {
            cleanup();
            setOpen(false);
          }}
          className="text-xs text-warmgray hover:text-terracotta"
        >
          收起
        </button>
      </div>
      <div className="space-y-2.5">
        {checks.map((c) => (
          <div key={c.key} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5">{icon(c.state)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">{c.label}</p>
              {c.detail && (
                <p className={`text-xs ${c.state === "fail" ? "text-coral" : "text-warmgray"}`}>
                  {c.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {checks[2].state === "run" && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-gradient-to-r from-moss to-honey transition-all"
              style={{ width: `${level}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-warmgray">说话时这个条应当跳动</p>
        </div>
      )}

      {transcript && (
        <p className="mt-3 rounded-2xl bg-cream px-3 py-2 text-sm text-ink">识别到：{transcript}</p>
      )}

      <button onClick={run} className="btn-primary mt-4 w-full justify-center !py-2.5 text-sm">
        {running ? (
          <>检测中…（对着麦说话）</>
        ) : (
          <>
            <Mic size={15} /> 开始检测
          </>
        )}
      </button>
      <p className="mt-2 text-center text-[11px] text-warmgray">音频只在本机处理，不会上传</p>
    </div>
  );
}
