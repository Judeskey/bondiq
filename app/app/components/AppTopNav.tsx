// app/app/components/AppTopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/app/reports", label: "Reports" },
  { href: "/app/checkin", label: "Check-in" },
  { href: "/app/gratitude", label: "Gratitude" },
  { href: "/app/settings", label: "Settings" },
  { href: "/settings/privacy", label: "Privacy" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app/reports") return pathname === "/app/reports";
  if (href === "/app/settings") return pathname === "/app/settings";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppTopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/app/reports" className="font-semibold tracking-tight">
          BondIQ
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "bond-btn " +
                  (active ? "bond-btn-primary" : "bond-btn-secondary")
                }
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bond-btn bond-btn-secondary"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
