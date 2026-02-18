// C:\Users\User\bondiq\app\app\layout.tsx
import type { ReactNode } from "react";
import AppTopNav from "./components/AppTopNav";
import AppLegalFooter from "@/app/app/components/AppLegalFooter";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <AppTopNav />

      {/* ✅ One consistent page width for everything under /app/* */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      <AppLegalFooter />
    </div>
  );
}
