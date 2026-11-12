"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ship,
  Compass,
  Sparkles,
  Lock,
  KeyRound,
  UserPlus,
  LifeBuoy,
  ArrowLeft,
} from "lucide-react";

/**
 * 登录门：每个人进入都需要先「登岛」（用户名 + 密码）。
 * 账号密码存数据库；注册时一并设置「日记独立密码」（每用户隔离）。
 * 浏览器关闭后重新进入会再次要求登录。
 */
const K_SESSION = "axk_session";
const K_LAST = "axk_last_nick";

type Session = { name: string; at: number };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(sessionStorage.getItem(K_SESSION) || "null");
    return s && s.name ? s : null;
  } catch {
    return null;
  }
}

type Mode = "login" | "register" | "reset";

export default function AuthGate() {
  const [authed, setAuthed] = useState(true); // SSR 首帧默认可避免空白
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [dpwd, setDpwd] = useState(""); // 日记独立密码
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hello, setHello] = useState(false);

  // 进入时判定：本地会话标记存在才算登录，否则强制弹门（不依赖可能被缓存的 cookie）
  useEffect(() => {
    const local = (() => {
      try {
        const s = JSON.parse(sessionStorage.getItem(K_SESSION) || "null");
        return !!(s && s.name);
      } catch {
        return false;
      }
    })();

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (local && d?.user?.username) {
          setAuthed(true);
        } else {
          // 无论接口是否报错，未登录就必须弹门
          sessionStorage.removeItem(K_SESSION);
          setAuthed(false);
          setName(localStorage.getItem(K_LAST) || "");
          if (d?.hasUsers === false) setMode("register");
        }
        setReady(true);
      })
      .catch(() => {
        // 接口异常也绝不放行
        sessionStorage.removeItem(K_SESSION);
        setAuthed(false);
        setReady(true);
      });
  }, []);

  // 关闭/刷新离开时清掉本地登录标记，下次进入需重新登录
  useEffect(() => {
    const clear = () => sessionStorage.removeItem(K_SESSION);
    window.addEventListener("pagehide", clear);
    return () => window.removeEventListener("pagehide", clear);
  }, []);

  async function call(url: string, payload: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "好像出了点小差错，再试试？");
    return data;
  }

  function afterAuth(username: string) {
    sessionStorage.setItem(K_SESSION, JSON.stringify({ name: username, at: Date.now() }));
    localStorage.setItem(K_LAST, username);
    setAuthed(true);
    setHello(true);
    setPwd("");
    setPwd2("");
    setDpwd("");
    setErr("");
    setTimeout(() => setHello(false), 2200);
  }

  async function submit() {
    if (busy) return;
    const n = name.trim();
    setErr("");
    try {
      if (mode === "login") {
        if (!n || !pwd) throw new Error("用户名和密码都要填哦");
        setBusy(true);
        await call("/api/auth/login", { username: n, password: pwd });
        afterAuth(n);
      } else if (mode === "register") {
        if (!n) throw new Error("先给自己起个名字吧，哪怕只是一个小昵称 🌱");
        if (pwd.length < 6) throw new Error("登录密码至少 6 位");
        if (pwd !== pwd2) throw new Error("两次输入的登录密码不一致");
        if (dpwd.length < 4) throw new Error("日记密码至少 4 位，它只属于你");
        setBusy(true);
        await call("/api/auth/register", { username: n, password: pwd, diaryPassword: dpwd });
        afterAuth(n);
      } else {
        if (!n) throw new Error("先填你的用户名");
        if (pwd.length < 6) throw new Error("新密码至少 6 位");
        if (pwd !== pwd2) throw new Error("两次输入的密码不一致");
        setBusy(true);
        await call("/api/auth/reset", { username: n, password: pwd });
        afterAuth(n);
      }
    } catch (e: any) {
      setErr(e?.message || "网络打了个嗝，稍后再试试？");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "欢迎回到清绪之屿",
    register: "在清绪之屿安家",
    reset: "钥匙丢了？没关系",
  };
  const descs: Record<Mode, string> = {
    login: "输入用户名和密码，继续你的小岛生活。",
    register: "起个名字、设好两个密码——登录密码保护账号，日记密码只守护你的心绪。",
    reset: "只要还记得用户名，就能重新设置密码。",
  };

  return (
    <>
      <AnimatePresence>
        {hello && authed && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed left-1/2 top-20 z-[95] -translate-x-1/2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-soft"
          >
            欢迎回到清绪之屿，{name.trim() || getSession()?.name} 🏝️
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ready && !authed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4"
            style={{
              background: "linear-gradient(160deg,#2b1a12 0%,#432a1c 45%,#6b3f27 100%)",
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              {[
                { l: "8%", t: "18%", s: 22, d: "0s" },
                { l: "84%", t: "12%", s: 16, d: "1.2s" },
                { l: "76%", t: "68%", s: 26, d: "0.6s" },
                { l: "14%", t: "74%", s: 14, d: "1.8s" },
                { l: "50%", t: "8%", s: 12, d: "2.4s" },
              ].map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full bg-[#ffcfa2]/25 blur-[1px]"
                  style={{ left: p.l, top: p.t, width: p.s, height: p.s }}
                  animate={{ y: [0, -14, 0], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 5, repeat: Infinity, delay: parseFloat(p.d) }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="relative w-full max-w-sm rounded-5xl border border-[#ffcfa2]/25 bg-[#241610]/80 p-8 shadow-soft backdrop-blur-md"
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto h-16 w-16 overflow-hidden rounded-3xl bg-white/90 shadow-soft"
                >
                  <img src="/companion/logo.png" alt="清绪之屿" className="h-full w-full object-cover" />
                </motion.div>
                <h1 className="font-display mt-4 text-3xl font-semibold text-[#ffe9d2]">
                  {titles[mode]}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#ffcfa2]/80">{descs[mode]}</p>
              </div>

              <div className="mt-7 space-y-3">
                <div className="relative">
                  <Ship size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffcfa2]/60" />
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErr("");
                    }}
                    placeholder={mode === "reset" ? "你的用户名" : "用户名 / 昵称"}
                    maxLength={12}
                    autoFocus
                    className="w-full rounded-2xl border border-[#ffcfa2]/30 bg-[#2e1c13]/90 py-3 pl-10 pr-4 text-[15px] text-[#ffe9d2] outline-none transition placeholder:text-[#ffcfa2]/40 focus:border-[#ffcfa2]/70"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffcfa2]/60" />
                  <input
                    type="password"
                    value={pwd}
                    onChange={(e) => {
                      setPwd(e.target.value);
                      setErr("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={mode === "reset" ? "设置新登录密码（至少 6 位）" : "登录密码（至少 6 位）"}
                    className="w-full rounded-2xl border border-[#ffcfa2]/30 bg-[#2e1c13]/90 py-3 pl-10 pr-4 text-[15px] text-[#ffe9d2] outline-none transition placeholder:text-[#ffcfa2]/40 focus:border-[#ffcfa2]/70"
                  />
                </div>

                {mode !== "login" && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffcfa2]/60" />
                    <input
                      type="password"
                      value={pwd2}
                      onChange={(e) => {
                        setPwd2(e.target.value);
                        setErr("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder="再输入一次登录密码"
                      className="w-full rounded-2xl border border-[#ffcfa2]/30 bg-[#2e1c13]/90 py-3 pl-10 pr-4 text-[15px] text-[#ffe9d2] outline-none transition placeholder:text-[#ffcfa2]/40 focus:border-[#ffcfa2]/70"
                    />
                  </div>
                )}

                {mode === "register" && (
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffcfa2]/60" />
                    <input
                      type="password"
                      value={dpwd}
                      onChange={(e) => {
                        setDpwd(e.target.value);
                        setErr("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder="日记独立密码（至少 4 位，只有你能打开日记）"
                      className="w-full rounded-2xl border border-[#ffcfa2]/40 bg-[#2e1c13]/90 py-3 pl-10 pr-4 text-[15px] text-[#ffe9d2] outline-none transition placeholder:text-[#ffcfa2]/40 focus:border-[#ffcfa2]/70"
                    />
                  </div>
                )}

                {err && <p className="text-center text-sm text-[#ffb3a0]">{err}</p>}
                <button
                  onClick={submit}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffcfa2] to-[#e8946a] py-3 font-semibold text-[#2b1a12] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                >
                  {mode === "login" && (
                    <>
                      <Compass size={17} /> {busy ? "正在登岛…" : "登岛"}
                    </>
                  )}
                  {mode === "register" && (
                    <>
                      <UserPlus size={17} /> {busy ? "正在安家…" : "安家并登岛"}
                    </>
                  )}
                  {mode === "reset" && (
                    <>
                      <KeyRound size={17} /> {busy ? "正在重置…" : "重置密码并登岛"}
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 flex items-center justify-center gap-4 text-xs text-[#ffcfa2]/75">
                {mode !== "login" ? (
                  <button
                    onClick={() => {
                      setMode("login");
                      setErr("");
                    }}
                    className="inline-flex items-center gap-1 transition hover:text-[#ffe9d2]"
                  >
                    <ArrowLeft size={12} /> 返回登录
                  </button>
                ) : null}
                {mode !== "register" && (
                  <button
                    onClick={() => {
                      setMode("register");
                      setErr("");
                    }}
                    className="inline-flex items-center gap-1 transition hover:text-[#ffe9d2]"
                  >
                    <UserPlus size={12} /> 第一次来？安个家
                  </button>
                )}
                {mode !== "reset" && (
                  <button
                    onClick={() => {
                      setMode("reset");
                      setErr("");
                    }}
                    className="inline-flex items-center gap-1 transition hover:text-[#ffe9d2]"
                  >
                    <LifeBuoy size={12} /> 忘记密码
                  </button>
                )}
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-[#ffcfa2]/60">
                <Sparkles size={12} />
                每次进入都需要登岛 · 登录密码与日记密码相互独立，按账号隔离
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
