// app/app/onboarding/AcceptInviteClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Unable to accept invite");
        return;
      }

      // ✅ remove token from URL after success
      router.replace("/app/onboarding");
      router.refresh();
    }

    run();
  }, [token, router]);

  if (!token) return null;

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-2xl px-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-rose-700">Invite issue</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            We couldn’t connect you
          </div>
          <div className="mt-2 text-sm text-slate-700">{error}</div>

          <div className="mt-5 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            What you can do:
            <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">
              <li>Make sure you opened the newest invite link.</li>
              <li>If you already accepted before, just continue to onboarding.</li>
              <li>If it keeps failing, ask your partner to generate a fresh invite.</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              className="rounded-xl bg-[#ec4899] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              href="/app/onboarding"
            >
              Go to onboarding
            </a>
            <a
              className="rounded-xl border border-[#ec4899] px-4 py-2 text-sm font-semibold text-[#ec4899] hover:bg-pink-50 transition"
              href="mailto:care@bondiq.app?subject=BondIQ%20Invite%20Help"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl px-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-[#ec4899]">BondIQ</div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          Connecting you to your partner…
        </div>
        <div className="mt-2 text-sm text-slate-700">
          Hang tight — this usually takes a second.
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 rounded-full bg-[#ec4899]" />
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Once connected, we’ll take you to onboarding automatically.
        </div>
      </div>
    </div>
  );
}
