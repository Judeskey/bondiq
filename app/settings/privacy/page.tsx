// app/settings/privacy/page.tsx
import PrivacyControlsCard from "@/components/settings/PrivacyControlsCard";
import AppTopNav from "@/app/app/components/AppTopNav";

export default function PrivacySettingsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <AppTopNav />

      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="mt-1 text-sm text-slate-600">Control what’s shared with your partner.</p>

      <div className="mt-6">
        <PrivacyControlsCard />
      </div>
    </main>
  );
}
