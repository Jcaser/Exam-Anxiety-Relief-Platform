import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "清绪之屿 · 和考试焦虑好好相处",
  description:
    "清绪之屿是一座基于认知行为疗法（CBT）的情绪小岛：AI 朋友陪你聊、日记本收藏每一天的心情，用温柔的方式把焦虑拆开、看清、慢慢放下。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-x-clip">
        {/* 纸纹颗粒叠层：给整站覆一层手作印刷质感 */}
        <div className="paper-grain" aria-hidden="true" />
        {/* 登录门：每次进入都要登岛 */}
        <AuthGate />
        <Nav />
        <main className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-28 sm:px-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
