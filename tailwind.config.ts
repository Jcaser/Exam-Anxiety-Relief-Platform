import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F0",
        peach: "#FFE8D6",
        blush: "#FBD9CC",
        coral: "#F0A08C",
        terracotta: "#D97E63",
        sage: "#9CB39A",
        moss: "#6F8F6E",
        warmgray: "#7A6A5D",
        ink: "#3D352E",
        honey: "#F4C77B",
      },
      fontFamily: {
        sans: [
          "Nunito",
          "PingFang SC",
          "Microsoft YaHei",
          "Hiragino Sans GB",
          "system-ui",
          "sans-serif",
        ],
        serif: ["Noto Serif SC", "Songti SC", "STSong", "SimSun", "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(217, 126, 99, 0.25)",
        card: "0 8px 30px -10px rgba(122, 106, 93, 0.22)",
        glow: "0 0 0 1px rgba(240,160,140,0.25), 0 14px 40px -12px rgba(240,160,140,0.35)",
      },
      backgroundImage: {
        "warm-radial":
          "radial-gradient(120% 120% at 50% 0%, #FFE8D6 0%, #FFF8F0 55%, #FBF1E6 100%)",
        "sunrise":
          "linear-gradient(135deg, #FFE8D6 0%, #FBD9CC 45%, #F4C77B 100%)",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        breathe: "breathe 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
