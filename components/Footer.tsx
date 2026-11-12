import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/60 bg-white/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 overflow-hidden rounded-2xl bg-white ring-1 ring-peach/50">
                <img
                  src="/companion/logo.png"
                  alt="清绪之屿"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="font-display text-base font-semibold text-ink">清绪之屿</span>
            </div>
            <p className="mt-3 text-sm text-warmgray">
              和考试焦虑好好相处。基于认知行为疗法（CBT）的 AI 自助陪伴，
              把焦虑拆开、看清楚、慢慢放下。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-2 font-semibold text-ink">功能</p>
              <ul className="space-y-1.5 text-warmgray">
                <li><Link href="/assess" className="hover:text-terracotta">焦虑自评</Link></li>
                <li><Link href="/record" className="hover:text-terracotta">我的日记</Link></li>
                <li><Link href="/chat" className="hover:text-terracotta">对话陪伴</Link></li>
                <li><Link href="/progress" className="hover:text-terracotta">我的进度</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-2 font-semibold text-ink">说明</p>
              <ul className="space-y-1.5 text-warmgray">
                <li>非医疗诊断工具</li>
                <li>日记按账号隔离存储</li>
                <li>危机请拨打热线</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-white/60 pt-6 text-xs text-warmgray">
          © 2026 清绪之屿 · 传智杯全国高校 AI Web 开发挑战赛作品。本应用仅作心理自助参考，
          不替代专业医疗诊断与治疗。如遇心理危机，请立即拨打全国心理援助热线
          <span className="font-semibold text-terracotta"> 12356 </span>或前往就近医疗机构。
        </p>
      </div>
    </footer>
  );
}
