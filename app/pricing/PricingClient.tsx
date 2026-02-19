"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Interval = "month" | "year";

type Props = {
  checkout?: string;
  sessionId?: string;
};

export default function PricingClient({ checkout, sessionId }: Props) {
  const router = useRouter();

  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState(false);

  // ✅ After Stripe redirect: confirm & persist premium server-side
  useEffect(() => {
    let cancelled = false;

    async function confirmCheckout() {
      if (checkout !== "success" || !sessionId) return;

      try {
        toast.loading("Finalizing your subscription…", { id: "finalize" });

        const res = await fetch(
          `/api/stripe/checkout/status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Could not confirm subscription.");
        }

        if (data?.paid) {
          toast.success("Premium unlocked ✅", { id: "finalize" });
        } else {
          toast("Payment not completed yet. If you were charged, refresh in a moment.", {
            id: "finalize",
          });
        }

        if (!cancelled) {
          router.refresh();
          router.replace("/pricing"); // ✅ clean URL
        }
      } catch (e: any) {
        toast.error(e?.message || "Could not finalize subscription.", { id: "finalize" });

        if (!cancelled) {
          router.replace("/pricing"); // ✅ avoid looping
        }
      }
    }

    confirmCheckout();

    return () => {
      cancelled = true;
    };
  }, [checkout, sessionId, router]);

  async function startCheckout() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Checkout failed.");
      if (!data?.url) throw new Error("No checkout URL returned.");

      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout.");
      setBusy(false);
    }
  }

  const premiumPrice = interval === "year" ? "79.99" : "9.99";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Start free. Upgrade when it matters.
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          BondIQ helps couples build consistency, clarity, and momentum.
        </p>

        <div className="mt-6 inline-flex rounded-lg border bg-white p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`rounded-md px-4 py-2 text-sm ${
              interval === "month"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`rounded-md px-4 py-2 text-sm ${
              interval === "year"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm font-semibold">Free</div>
          <div className="mt-1 text-sm text-slate-600">Great for building consistency.</div>

          <div className="mt-6 text-4xl font-semibold">$0</div>

          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li>✅ Weekly report</li>
            <li>✅ Check-ins & trends</li>
            <li>✅ Gratitude vault</li>
            <li className="text-slate-400">⛔ Partner visibility</li>
          </ul>

          <button
            type="button"
            className="mt-8 w-full rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={() => router.push("/signin")}
          >
            Continue Free
          </button>
        </div>

        {/* Premium */}
        <div className="rounded-2xl border border-pink-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold">Premium</div>

          <div className="mt-4 flex items-baseline gap-2">
            <div className="text-4xl font-semibold">${premiumPrice}</div>
            <div className="text-sm text-slate-600">
              per {interval === "year" ? "year" : "month"}
            </div>
          </div>

          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li>✅ Everything in Free</li>
            <li>✅ Partner visibility controls</li>
            <li>✅ Deep insights</li>
            <li>✅ 30/90 day trends</li>
            <li>✅ Narrative polish</li>
          </ul>

          <button
            type="button"
            onClick={startCheckout}
            disabled={busy}
            className="mt-8 w-full rounded-lg bg-[#ec4899] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Starting checkout…" : "Go Premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
