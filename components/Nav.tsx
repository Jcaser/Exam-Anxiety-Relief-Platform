import Link from "next/link";

const links = [
  { href: "/", label: "首页" },
  { href: "/method", label: "我们的方法" },
  { href: "/assess", label: "焦虑自评" },
  { href: "/record", label: "思维记录" },
  { href: "/chat", label: "对话陪伴" },
  { href: "/progress", label: "我的进度" },
];

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/50 bg-cream/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sunrise text-lg shadow-soft">
            🌤️
          </span>
          <span className="font-display text-xl font-semibold text-ink">安心考</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-warmgray transition hover:bg-peach/70 hover:text-terracotta"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/assess" className="btn-primary !px-5 !py-2 text-sm">
          开始评估
        </Link>
      </nav>
      <ul className="flex items-center gap-1 overflow-x-auto px-5 pb-2 text-sm md:hidden">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-warmgray"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
