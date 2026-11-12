"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页" },
  { href: "/assess", label: "焦虑自评" },
  { href: "/chat", label: "对话陪伴" },
  { href: "/diary", label: "我的日记" },
  { href: "/progress", label: "我的进度" },
  { href: "/me", label: "我的小岛" },
];

export default function Nav() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/50 bg-cream/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-10 w-10 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-peach/50">
            <img
              src="/companion/logo.png"
              alt="清绪之屿"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-display text-xl font-semibold text-ink">清绪之屿</span>
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-peach/80 text-terracotta"
                      : "text-warmgray hover:bg-peach/50 hover:text-terracotta"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/assess" className="btn-primary !px-5 !py-2 text-sm">
          开始评估
        </Link>
      </nav>
      <ul className="flex items-center gap-1 overflow-x-auto px-5 pb-2 text-sm md:hidden">
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`inline-block whitespace-nowrap rounded-full px-3 py-1.5 ${
                  active ? "bg-peach/80 text-terracotta" : "text-warmgray"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </header>
  );
}
