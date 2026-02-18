"use client";

import { useEffect, useState } from "react";

type EntResp = {
  ok: boolean;
  planType?: "FREE" | "PREMIUM";
  isPremium?: boolean;
  proUntil?: string | null;
  error?: string;
};

function gaEvent(name: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params || {});
}

export default function PlanStatusBadge({
  className = "",
  showManageButton = true,
}: {
  className?: string;
  showManageButton?: boolean;
}) {
  const [data, setData] = useState<EntResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/entitlements", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as EntResp;
        if (cancelled) return;
        setData(json);
      } catch (e: any) {
        if (cancelled) return;
        setData({ ok: false, error: e?.message || "Failed to load plan" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isPremium = Boolean(data?.ok && data?.isPremium);
  const planLabel = isPremium ? "Premium" : "Free";

  async function openBillingPortal() {
    try {
      setPortalLoading(true);
      gaEvent("billing_portal_open", { location: "plan_badge" });

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        alert(json?.error || "Couldn’t open billing portal");
        return;
      }

      window.location.href = json.url;
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          Plan: Loading…
        </span>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 shadow-sm">
          Plan: Unknown
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
          isPremium
            ? "border-pink-200 bg-pink-50 text-[#ec4899]"
            : "border-slate-200 bg-white/70 text-slate-700",
        ].join(" ")}
      >
        Plan: {planLabel}
      </span>

      {isPremium && showManageButton ? (
        <button
          type="button"
          onClick={openBillingPortal}
          disabled={portalLoading}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {portalLoading ? "Opening…" : "Manage / Cancel"}
        </button>
      ) : null}

      {!isPremium ? (
        <a
          href="/pricing"
          onClick={() => gaEvent("upgrade_click", { location: "plan_badge" })}
          className="rounded-full bg-[#ec4899] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:brightness-95"
        >
          Upgrade
        </a>
      ) : null}
    </div>
  );
}
