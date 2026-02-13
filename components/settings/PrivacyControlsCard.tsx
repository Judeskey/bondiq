// components/settings/PrivacyControlsCard.tsx
"use client";

import { useEffect, useState } from "react";

type VisibilityLevel = "PRIVATE" | "PARTNER" | "COUPLE";

type Settings = {
  id: string;
  coupleId: string;
  userId: string;
  shareEmotionState: VisibilityLevel;
  shareTags: VisibilityLevel;
  shareCheckinText: VisibilityLevel;
  shareInsights: VisibilityLevel;
};

function OptionRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: VisibilityLevel;
  onChange: (v: VisibilityLevel) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">{description}</div>
        </div>

        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value as VisibilityLevel)}
        >
          <option value="PRIVATE">Private</option>
          <option value="PARTNER">Share with partner (Pro)</option>
          <option value="COUPLE">Shared (both)</option>
        </select>
      </div>
    </div>
  );
}

export default function PrivacyControlsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [settings, setSettings] = useState<Settings | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      const res = await fetch("/api/privacy/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Failed to load privacy settings");
        setSettings(null);
        return;
      }
      setSettings(data?.settings || null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load privacy settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  async function savePatch(patch: Partial<Settings>) {
    if (!settings) return;

    setSaving(true);
    setErr("");
    setOk("");

    // Optimistic update
    const next = { ...settings, ...patch };
    setSettings(next);

    try {
      const res = await fetch("/api/privacy/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Failed to save settings");
        // rollback by reloading
        await load();
        return;
      }
      setSettings(data?.settings || next);
      setOk("Saved.");
      setTimeout(() => setOk(""), 1500);
    } catch (e: any) {
      setErr(e?.message || "Failed to save settings");
      await load();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="border rounded-lg p-4 bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">Privacy controls</div>
          <div className="text-xs text-slate-600 mt-1">
            Choose what your partner can see. Partner visibility is available on Pro plans.
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading || saving}
          className="rounded-md border bg-white px-3 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      {ok && <div className="mt-3 text-sm text-green-700">{ok}</div>}

      {loading && <div className="mt-4 text-sm text-slate-700">Loading…</div>}

      {!loading && settings && (
        <div className="mt-4 grid gap-3">
          <OptionRow
            title="Mood signal"
            description="Whether your partner can see your mood orb and reasons."
            value={settings.shareEmotionState}
            onChange={(v) => savePatch({ shareEmotionState: v })}
          />

          <OptionRow
            title="Language tags"
            description="Whether your partner can see your check-in tags used for insights."
            value={settings.shareTags}
            onChange={(v) => savePatch({ shareTags: v })}
          />

          <OptionRow
            title="Check-in text"
            description="Whether your partner can see your raw check-in text. Recommended: Private."
            value={settings.shareCheckinText}
            onChange={(v) => savePatch({ shareCheckinText: v })}
          />

          <OptionRow
            title="Insights about you"
            description="Whether your partner can see the per-partner insights derived from your check-ins."
            value={settings.shareInsights}
            onChange={(v) => savePatch({ shareInsights: v })}
          />

          <div className="text-xs text-slate-500 mt-1">
            Tip: If you set something to “Share with partner (Pro)” and you’re on Free, the app will still
            keep partner visibility locked until upgraded.
          </div>
        </div>
      )}
    </section>
  );
}
