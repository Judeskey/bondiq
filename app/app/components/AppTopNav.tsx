"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string; short: string; icon: string };

const NAV: NavItem[] = [
  { href: "/app/reports", label: "Reports", short: "Reports", icon: "📊" },
  { href: "/app/checkin", label: "Check-in", short: "Check-in", icon: "✅" },
  { href: "/app/gratitude", label: "Gratitude", short: "Gratitude", icon: "💗" },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "⚙️" },
  { href: "/pricing", label: "Pricing", short: "Pricing", icon: "⭐" },
];

function isActive(pathname: string, href: string) {
  if (href === "/pricing") return pathname === "/pricing" || pathname.startsWith("/pricing/");
  return pathname.startsWith(href);
}

export default function AppTopNav() {
  const pathname = usePathname();

  return (
    <>
      {/* TOP NAV */}
      <header className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/app/reports" className="flex items-center gap-2 shrink-0">
            <Image src="/logo-mark.png" alt="BondIQ" width={28} height={28} priority />
            <span className="text-lg font-semibold text-neutral-900">BondIQ</span>
          </Link>

          {/* Desktop pills */}
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <nav className="flex items-center gap-2">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition border",
                      active
                        ? "text-white border-transparent bg-gradient-to-r from-pink-500 to-purple-500 shadow-sm"
                        : "text-neutral-800 border-neutral-200 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
            >
              Sign out
            </button>
          </div>

          {/* Mobile sign-out */}
          <div className="ml-auto sm:hidden">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
              aria-label="Sign out"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM TAB BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur">
        <nav
          className="mx-auto flex max-w-6xl items-stretch justify-between px-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2",
                  "rounded-xl transition",
                  active ? "text-[#ec4899]" : "text-slate-600",
                ].join(" ")}
              >
                <span className={["text-lg leading-none", active ? "" : "opacity-80"].join(" ")}>
                  {item.icon}
                </span>

                <span className="text-[11px] font-medium leading-none">{item.short}</span>

                <span
                  className={[
                    "mt-1 h-1 w-8 rounded-full",
                    active ? "bg-[#ec4899]" : "bg-transparent",
                  ].join(" ")}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Global: make room for the bottom bar on mobile WITHOUT adding any top space */}
      <style jsx global>{`
        @media (max-width: 639px) {
          body {
            padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
    </>
  );
}
