"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Props = { sessionId?: string };

export default function SuccessClient({ sessionId }: Props) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(12);
  const [busyPortal, setBusyPortal] = useState(false);

  // ✅ Confirm subscription + persist premium
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!sessionId) return;

      try {
        toast.loading("Activating your Premium…", { id: "activate" });

        const res = await fetch(
          `/api/stripe/checkout/status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.error || "Could not confirm payment.");

        if (data?.paid) toast.success("Premium unlocked ✅", { id: "activate" });
        else toast("Payment still processing… refresh in a moment.", { id: "activate" });
      } catch (e: any) {
        toast.error(e?.message || "Could not activate subscription.", { id: "activate" });
      } finally {
        if (!cancelled) router.refresh();
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  // ✅ Auto-redirect to reports
  useEffect(() => {
    if (seconds <= 0) {
      router.replace("/app/reports");
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, router]);

  async function openPortal() {
    setBusyPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not open billing portal.");
      if (!data?.url) throw new Error("No portal URL returned.");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Could not open billing portal.");
      setBusyPortal(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-[#ec4899]">Payment successful</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">You’re Premium ✅</h1>

        <p className="mt-2 text-sm text-slate-600">
          Want your invoice/receipt? Open billing, download it, then you’ll return to your reports.
          <br />
          Redirecting you to reports in <span className="font-semibold">{seconds}s</span>.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => router.replace("/app/reports")}
            className="w-full rounded-lg bg-[#ec4899] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            Go to reports now
          </button>

          <button
            type="button"
            onClick={openPortal}
            disabled={busyPortal}
            className="w-full rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {busyPortal ? "Opening billing…" : "Manage billing / Download invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
