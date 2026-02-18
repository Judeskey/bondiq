"use client";

import { useSearchParams } from "next/navigation";

export default function SupportClient() {
  const sp = useSearchParams();

  // Example: read params safely
  const sent = sp.get("sent"); // or whatever you're using

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>

        {sent ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Message sent ✅ We’ll reply soon.
          </div>
        ) : null}

        <p className="mt-3 text-sm text-slate-600">
          Need help? Email us at{" "}
          <a className="text-[#ec4899] underline" href="mailto:care@bondiq.app">
            care@bondiq.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
