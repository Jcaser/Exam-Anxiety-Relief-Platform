import type { CSSProperties } from "react";

/** 水彩晕染 Hero 插画：柔和晕染 + 墨色远山 + 呼吸的暖阳 + 手绘植物 */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 460 440"
      className="mx-auto w-full max-w-md drop-shadow-sm"
      role="img"
      aria-label="水彩风格：山丘上的人与暖阳"
    >
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE8D6" />
          <stop offset="100%" stopColor="#FBD9CC" />
        </linearGradient>
        <radialGradient id="sun2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F7D58C" />
          <stop offset="60%" stopColor="#F4C77B" />
          <stop offset="100%" stopColor="#F0A08C" />
        </radialGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A7BDA4" />
          <stop offset="100%" stopColor="#6F8F6E" />
        </linearGradient>
        <linearGradient id="mtn3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9D6C2" />
          <stop offset="100%" stopColor="#9CB39A" />
        </linearGradient>
        <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="soft3" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* 天空底 */}
      <rect x="14" y="14" width="432" height="412" rx="36" fill="url(#sky2)" />
      <rect
        x="14"
        y="14"
        width="432"
        height="412"
        rx="36"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.6"
        strokeWidth="2"
      />

      {/* 水彩晕染斑块 */}
      <g filter="url(#soft2)">
        <ellipse cx="120" cy="120" rx="70" ry="55" fill="#F0A08C" opacity="0.35" />
        <ellipse cx="350" cy="150" rx="60" ry="48" fill="#F4C77B" opacity="0.4" />
        <ellipse cx="250" cy="300" rx="90" ry="60" fill="#9CB39A" opacity="0.3" />
        <ellipse cx="380" cy="340" rx="50" ry="40" fill="#9C6B78" opacity="0.22" />
      </g>

      {/* 远山（墨色，微模糊） */}
      <g filter="url(#soft3)">
        <path
          d="M14 330 Q 110 270 200 312 Q 300 356 360 300 Q 410 266 446 308 L446 426 L14 426 Z"
          fill="url(#mtn2)"
          opacity="0.85"
        />
        <path
          d="M14 372 Q 130 330 240 360 Q 340 386 446 350 L446 426 L14 426 Z"
          fill="url(#mtn3)"
          opacity="0.9"
        />
      </g>

      {/* 暖阳 + 柔光晕 */}
      <circle cx="330" cy="100" r="86" fill="#F7D58C" opacity="0.25" filter="url(#soft3)" />
      <g className="animate-breathe" style={{ transformOrigin: "330px 100px" }}>
        <circle cx="330" cy="100" r="50" fill="url(#sun2)" />
        <g stroke="#F0A08C" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
          <line x1="330" y1="20" x2="330" y2="38" />
          <line x1="330" y1="162" x2="330" y2="180" />
          <line x1="250" y1="100" x2="268" y2="100" />
          <line x1="392" y1="100" x2="410" y2="100" />
          <line x1="274" y1="44" x2="287" y2="57" />
          <line x1="373" y1="143" x2="386" y2="156" />
          <line x1="386" y1="44" x2="373" y2="57" />
          <line x1="287" y1="143" x2="274" y2="156" />
        </g>
      </g>

      {/* 冥想小人（柔影 + 剪影） */}
      <g transform="translate(228,318)">
        <ellipse cx="0" cy="44" rx="46" ry="11" fill="#3D352E" opacity="0.12" />
        <circle cx="0" cy="-26" r="14" fill="#D97E63" />
        <path d="M-30 46 Q0 6 30 46 Z" fill="#D97E63" />
        <path
          d="M-30 46 Q0 6 30 46"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
      </g>

      {/* 手绘植物 sprig（右下） */}
      <g transform="translate(372,300)" stroke="#6F8F6E" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M20 110 C 16 70 24 36 44 6" />
        <path d="M22 86 C 4 80 -2 64 4 50" fill="#9CB39A" fillOpacity="0.7" stroke="none" />
        <path d="M26 64 C 46 58 54 42 50 28" fill="#9CB39A" fillOpacity="0.7" stroke="none" />
        <path d="M34 38 C 18 30 14 16 22 6" fill="#9CB39A" fillOpacity="0.7" stroke="none" />
        <path d="M22 86 C 4 80 -2 64 4 50" />
        <path d="M26 64 C 46 58 54 42 50 28" />
        <path d="M34 38 C 18 30 14 16 22 6" />
      </g>

      {/* 漂浮光点 */}
      <circle cx="80" cy="90" r="5" fill="#fff" opacity="0.8" className="animate-floaty" />
      <circle cx="150" cy="170" r="4" fill="#F4C77B" className="animate-floaty" style={{ animationDelay: "1.2s" }} />
      <circle cx="406" cy="210" r="5" fill="#fff" opacity="0.85" className="animate-floaty" style={{ animationDelay: "2s" }} />
      <circle cx="60" cy="210" r="3" fill="#D97E63" className="animate-floaty" style={{ animationDelay: "0.6s" }} />
    </svg>
  );
}

/** 手绘风波浪分割线 */
export function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className="wave-divider" aria-hidden="true">
      <svg
        viewBox="0 0 1200 36"
        preserveAspectRatio="none"
        className={`h-8 w-full ${flip ? "rotate-180" : ""}`}
      >
        <path
          d="M0 18 Q 100 4 200 18 T 400 18 T 600 18 T 800 18 T 1000 18 T 1200 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M0 26 Q 120 14 240 26 T 480 26 T 720 26 T 960 26 T 1200 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
}

/** 手绘植物线描（小装饰） */
export function BotanicalSprig({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 80 96"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <g stroke="#6F8F6E" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M40 96 C 36 60 42 34 56 8" />
        <path d="M42 70 C 22 64 14 48 20 34" />
        <path d="M45 50 C 66 44 74 28 68 14" />
      </g>
      <g fill="#9CB39A" fillOpacity="0.75">
        <ellipse cx="18" cy="32" rx="11" ry="6" transform="rotate(-32 18 32)" />
        <ellipse cx="70" cy="13" rx="11" ry="6" transform="rotate(28 70 13)" />
        <ellipse cx="57" cy="7" rx="9" ry="5" transform="rotate(8 57 7)" />
      </g>
    </svg>
  );
}

/** 墨晕 blob（水彩晕染背景装饰，用 absolute 定位包一层） */
export function InkBlob({
  className,
  color = "#F0A08C",
  style,
}: {
  className?: string;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`ink-blob ${className ?? ""}`}
      style={{ background: color, ...style }}
      aria-hidden="true"
    />
  );
}
