"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const LOVE = [
  { id: "WORDS", label: "Words of Affirmation" },
  { id: "TIME", label: "Quality Time" },
  { id: "GIFTS", label: "Receiving Gifts" },
  { id: "SERVICE", label: "Acts of Service" },
  { id: "TOUCH", label: "Physical Touch" },
] as const;

type LoveId = (typeof LOVE)[number]["id"];

function toggle(arr: LoveId[], id: LoveId, max: number) {
  if (arr.includes(id)) return arr.filter((x) => x !== id);
  if (arr.length >= max) return arr; // enforce max
  return [...arr, id];
}

export default function OnboardingPage() {
  const sp = useSearchParams();
  const inviteToken = sp.get("invite");

  const [loading, setLoading] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Profile state (multi-select)
  const [primaryLanguages, setPrimaryLanguages] = useState<LoveId[]>(["WORDS"]);
  const [secondaryLanguages, setSecondaryLanguages] = useState<LoveId[]>([]);
  const [avoidText, setAvoidText] = useState("");
  const [extraLovedText, setExtraLovedText] = useState("");
  const [saved, setSaved] = useState(false);

  async function refreshMe() {
    const res = await fetch("/api/profile/me");
    const data = await res.json();

    if (res.ok) {
      setCoupleId(data.coupleId ?? null);

      const profile = data.profile;
      if (profile?.expressionStyle?.loveLanguages) {
        const ll = profile.expressionStyle.loveLanguages;

        const prim = Array.isArray(ll.primary) ? ll.primary.map((x: any) => x?.id).filter(Boolean) : [];
        const sec = Array.isArray(ll.secondary) ? ll.secondary.map((x: any) => x?.id).filter(Boolean) : [];

        if (prim.length) setPrimaryLanguages(prim.slice(0, 3));
        if (sec.length) setSecondaryLanguages(sec.slice(0, 3));

        setExtraLovedText(ll.extraLovedText ?? "");
        setAvoidText(Array.isArray(profile.avoidList) ? profile.avoidList.join(", ") : "");
        setSaved(true);
      } else if (profile) {
        // fallback for older saved profiles
        setPrimaryLanguages([profile.primaryLanguage]);
        setSecondaryLanguages(profile.secondaryLanguage ? [profile.secondaryLanguage] : []);
        setAvoidText(Array.isArray(profile.avoidList) ? profile.avoidList.join(", ") : "");
        setSaved(true);
      }
    }
  }

  async function createCouple() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/couple/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setCoupleId(data.coupleId);
      setMsg(data.already ? "You already have a couple." : "Couple created.");
      await refreshMe();
    } catch (e: any) {
      setMsg(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateInvite() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/couple/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setInviteUrl(data.inviteUrl);
      setMsg("Invite link created. Share it with your partner.");
    } catch (e: any) {
      setMsg(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvite(token: string) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/couple/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setCoupleId(data.coupleId);
      setMsg("Invite accepted 🎉 You’re now connected.");
      await refreshMe();
    } catch (e: any) {
      setMsg(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setLoading(true);
    setMsg(null);
    setSaved(false);

    try {
      if (primaryLanguages.length === 0) {
        throw new Error("Pick at least 1 primary love language.");
      }

      // prevent overlap: anything in primary is removed from secondary
      const secondaryClean = secondaryLanguages.filter((x) => !primaryLanguages.includes(x));

      const avoidList = avoidText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);

      const res = await fetch("/api/profile/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryLanguages,
          secondaryLanguages: secondaryClean,
          avoidList,
          extraLovedText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      setSaved(true);
      setMsg("Profile saved ✅ Next: Weekly check-in.");
    } catch (e: any) {
      setMsg(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inviteToken) acceptInvite(inviteToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Onboarding</h1>

      {/* Step 1: Connect */}
      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Step 1 — Connect</h2>
        <p className="mt-1 text-slate-700">
          Create a couple, then invite your partner.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <button
            disabled={loading}
            onClick={createCouple}
            className="w-fit rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            Create my couple
          </button>

          <button
            disabled={loading}
            onClick={generateInvite}
            className="w-fit rounded-md border px-4 py-2 disabled:opacity-60"
          >
            Generate invite link
          </button>

          {inviteUrl && (
            <div className="rounded-md border p-3">
              <div className="text-sm text-slate-600">Share this with your partner:</div>
              <div className="mt-1 break-all font-mono text-sm">{inviteUrl}</div>
            </div>
          )}

          {coupleId && (
            <div className="rounded-md bg-green-50 p-3 text-sm">
              Connected coupleId: <span className="font-mono">{coupleId}</span>
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Love profile */}
      <section className="mt-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Step 2 — Your Love Profile</h2>
        <p className="mt-1 text-slate-700">
          Pick up to <b>3</b> primary and <b>3</b> secondary. This powers weekly insights.
        </p>

        {!coupleId ? (
          <div className="mt-3 text-sm text-slate-600">
            Connect with your partner first (Step 1).
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <div className="text-sm font-medium">Primary (up to 3)</div>
              <div className="mt-2 grid gap-2">
                {LOVE.map((l) => (
                  <label key={l.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={primaryLanguages.includes(l.id)}
                      onChange={() => setPrimaryLanguages((prev) => toggle(prev, l.id, 3))}
                    />
                    <span>{l.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Selected: {primaryLanguages.length}/3
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Secondary (up to 3)</div>
              <div className="mt-2 grid gap-2">
                {LOVE.map((l) => (
                  <label key={l.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={secondaryLanguages.includes(l.id)}
                      onChange={() => setSecondaryLanguages((prev) => toggle(prev, l.id, 3))}
                      disabled={primaryLanguages.includes(l.id)}
                    />
                    <span className={primaryLanguages.includes(l.id) ? "text-slate-400" : ""}>
                      {l.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Selected: {secondaryLanguages.filter((x) => !primaryLanguages.includes(x)).length}/3
                <span className="ml-2">•</span>
                <span className="ml-2">Items already in Primary are disabled</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Anything else that makes you feel loved? (optional)
              </label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2"
                rows={3}
                value={extraLovedText}
                onChange={(e) => setExtraLovedText(e.target.value)}
                placeholder="e.g. When you defend me in public, when we plan dates together, when you check in during the day…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Avoid list (comma-separated)
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={avoidText}
                onChange={(e) => setAvoidText(e.target.value)}
                placeholder="e.g. sarcasm, late replies, public criticism"
              />
            </div>

            <button
              disabled={loading}
              onClick={saveProfile}
              className="w-fit rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              Save my profile
            </button>

            {saved && (
              <div className="rounded-md bg-green-50 p-3 text-sm">
                Saved ✅
              </div>
            )}
          </div>
        )}
      </section>

      {msg && <div className="mt-4 text-sm text-slate-700">{msg}</div>}
    </main>
  );
}
