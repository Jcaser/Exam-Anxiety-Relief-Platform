"use client";

import { useEffect, useState } from "react";

export default function BreathWidget() {
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");

  useEffect(() => {
    const t = setInterval(
      () => setPhase((p) => (p === "inhale" ? "exhale" : "inhale")),
      4000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-52 w-52 items-center justify-center">
        <div
          className={`absolute h-44 w-44 rounded-full bg-sunrise transition-transform duration-[4000ms] ease-in-out ${
            phase === "inhale" ? "scale-110" : "scale-65"
          }`}
        />
        <div className="absolute h-32 w-32 rounded-full bg-white/40" />
        <div className="relative text-center text-ink">
          <p className="text-xl font-bold">{phase === "inhale" ? "吸气" : "呼气"}</p>
          <p className="text-xs text-warmgray">
            {phase === "inhale" ? "慢慢把气吸满" : "缓缓呼出去"}
          </p>
        </div>
      </div>
      <p className="text-sm text-warmgray">跟着圆圆，4 秒一换，先松一口气。</p>
    </div>
  );
}
