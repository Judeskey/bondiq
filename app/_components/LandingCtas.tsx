// app/_components/LandingCtas.tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type VariantKey = "A" | "B" | "C";

export default function LandingCtas({
  variant,
  proTip,
}: {
  variant: VariantKey;
  proTip: ReactNode;
}) {
  async function track(target: "signin" | "open_app") {
    try {
      await fetch("/api/exp/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, target }),
        // don't block navigation on slow networks
        keepalive: true,
      });
    } catch {
      // ignore tracking failures
    }
  }

  return (
    <div className="mt-6">
      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          className="bond-btn bond-btn-primary w-full sm:w-auto"
          href="/signin"
          onClick={() => track("signin")}
        >
          Sign in <span aria-hidden>→</span>
        </Link>

        <Link
          className="bond-btn bond-btn-secondary w-full sm:w-auto"
          href="/app"
          onClick={() => track("open_app")}
        >
          Open app
        </Link>

        <div className="text-xs text-slate-500 sm:ml-2">
          Invite your partner when ready • No pressure
        </div>
      </div>

      {/* Pro conversion tip (tiny addition, big impact) */}
      <div className="mt-4 rounded-2xl border border-pink-200 bg-white/70 p-4 shadow-sm">
        <div className="text-xs font-semibold text-pink-700">Pro conversion tip</div>
        <div className="mt-1 text-sm leading-relaxed text-slate-700">{proTip}</div>
      </div>
    </div>
  );
}
