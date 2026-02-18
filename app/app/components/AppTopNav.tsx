"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/app/reports", label: "Reports" },
  { href: "/app/checkin", label: "Check-in" },
  { href: "/app/gratitude", label: "Gratitude" },
  { href: "/app/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" },
];

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export default function AppTopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">

        {/* LEFT — Brand */}
        <Link href="/app/reports" className="flex items-center gap-2">
          <Image
            src="/logo-mark.png"
            alt="BondIQ"
            width={28}
            height={28}
            priority
          />
          <span className="font-semibold text-neutral-900 text-lg">
            BondIQ
          </span>
        </Link>

        {/* RIGHT — Nav */}
        <div className="ml-auto flex items-center gap-2">

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
      </div>
    </header>
  );
}
