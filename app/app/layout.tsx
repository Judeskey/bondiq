// app/app/layout.tsx
import type { ReactNode } from "react";
import AppTopNav from "./components/AppTopNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <AppTopNav />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
