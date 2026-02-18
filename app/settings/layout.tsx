// app/settings/layout.tsx
import AppTopNav from "@/app/app/components/AppTopNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Keep nav OUTSIDE any max-w container */}
      <AppTopNav />

      {/* Page content can be constrained per page (like max-w-3xl in privacy) */}
      {children}
    </>
  );
}
