// app/support/page.tsx
import { Suspense } from "react";
import SupportClient from "./SupportClient";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<SupportFallback />}>
        <SupportClient />
      </Suspense>
    </main>
  );
}

function SupportFallback() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100" />
        <div className="mt-6 h-10 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}
