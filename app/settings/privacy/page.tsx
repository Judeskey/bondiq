// app/settings/privacy/page.tsx
import PrivacyControlsCard from "@/components/settings/PrivacyControlsCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function PrivacySettingsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="mt-1 text-sm text-slate-600">Control what’s shared with your partner.</p>

      <div className="mt-6">
        <PrivacyControlsCard />
      </div>
    </main>
  );
}
