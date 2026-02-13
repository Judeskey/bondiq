// app/app/onboarding/OnboardingClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

type LoveLanguage = "WORDS" | "TIME" | "GIFTS" | "SERVICE" | "TOUCH";
const LOVE: LoveLanguage[] = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"];

function label(tag: LoveLanguage) {
  switch (tag) {
    case "WORDS":
      return "Words of Affirmation";
    case "TIME":
      return "Quality Time";
    case "GIFTS":
      return "Thoughtful Gifts";
    case "SERVICE":
      return "Acts of Support";
    case "TOUCH":
      return "Physical Touch";
  }
}

function toggleMax3(list: LoveLanguage[], t: LoveLanguage) {
  if (list.includes(t)) return list.filter((x) => x !== t);
  if (list.length >= 3) return list;
  return [...list, t];
}

type CoupleMembersResponse = {
  viewerUserId: string;
  viewerLabel: string;
  partnerLabel: string;
  members: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    image: string | null;
    nickname: string | null;
    label: string;
  }>;
  couple: { id: string; status: string };
};

export default function OnboardingClient({
  email,
  name,
  initialStep,
  onboardingCompleted,
}: {
  email: string;
  name: string | null;
  initialStep: number;
  onboardingCompleted: boolean;
}) {
  const router = useRouter();

  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Step 1 form
  const [displayName, setDisplayName] = useState(name || "");
  const [primary, setPrimary] = useState<LoveLanguage[]>([]);
  const [secondary, setSecondary] = useState<LoveLanguage[]>([]);

  // Step 2 invite (inviter only)
  const [partnerEmail, setPartnerEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string>("");

  // Couple info (to decide if Step 2 is needed)
  const [coupleInfo, setCoupleInfo] = useState<CoupleMembersResponse | null>(null);

  // QR
  const [qr, setQr] = useState<string>("");
  const [qrErr, setQrErr] = useState<string | null>(null);

  const partnerEmailClean = useMemo(() => partnerEmail.trim().toLowerCase(), [partnerEmail]);
  const alreadySkippedStep2Ref = useRef(false);

  useEffect(() => {
    if (!onboardingCompleted) return;
    const t = setTimeout(() => {
      window.location.href = "/app";
    }, 400);
    return () => clearTimeout(t);
  }, [onboardingCompleted]);

  // Load couple info (needed to skip Step 2 cleanly when couple already has 2 members)
  async function loadCoupleInfo() {
    try {
      const res = await fetch("/api/couple/members", { method: "GET", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as CoupleMembersResponse | null;
      if (!res.ok || !data || !Array.isArray(data.members)) {
        setCoupleInfo(null);
        return null;
      }
      setCoupleInfo(data);
      return data;
    } catch {
      setCoupleInfo(null);
      return null;
    }
  }

  // ✅ Auto-skip Step 2 when couple already has 2 members (invited partner should never see Step 2)
  useEffect(() => {
    if (step !== 2) return;
    if (alreadySkippedStep2Ref.current) return;

    (async () => {
      const info = await loadCoupleInfo();
      const memberCount = info?.members?.length ?? 0;

      // If both partners are connected, Step 2 is pointless → go to Step 3
      if (memberCount >= 2) {
        alreadySkippedStep2Ref.current = true;
        try {
          setSaving(true);
          setMsg(null);
          const data = await saveStep(3);
          setStep(data.onboardingStep);
          router.replace("/app/onboarding");
          router.refresh();
        } catch (e: any) {
          // fallback: still allow manual continue button if saveStep fails
          setMsg(e?.message || "Unable to advance. Please try again.");
        } finally {
          setSaving(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Generate QR when inviteUrl changes
  useEffect(() => {
    let cancelled = false;

    async function genQr() {
      setQrErr(null);

      if (!inviteUrl) {
        setQr("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(inviteUrl, { margin: 1, width: 220 });
        if (!cancelled) setQr(dataUrl);
      } catch {
        if (!cancelled) {
          setQr("");
          setQrErr("Unable to generate QR code.");
        }
      }
    }

    genQr();
    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

  async function saveStep(nextStep: number) {
    const res = await fetch("/api/onboarding/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to save step");
    return data as { onboardingStep: number; onboardingCompleted: boolean };
  }

  async function submitProfile() {
    setSaving(true);
    setMsg(null);

    try {
      const nm = displayName.trim();
      if (nm.length < 2) {
        setMsg("Please enter your name (at least 2 characters).");
        return;
      }
      if (primary.length < 1) {
        setMsg("Select at least 1 primary love language (max 3).");
        return;
      }

      // Disallow overlap: secondary cannot contain primary
      const secondaryClean = secondary.filter((x) => !primary.includes(x));

      // 1) Save name
      const r1 = await fetch("/api/user/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm }),
      });
      const d1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        setMsg(d1?.error || "Unable to save name.");
        return;
      }

      // 2) Save love profile
      const r2 = await fetch("/api/love-profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryLanguages: primary,
          secondaryLanguages: secondaryClean,
        }),
      });
      const d2 = await r2.json().catch(() => ({}));
      if (!r2.ok) {
        setMsg(d2?.error || "Unable to save love profile.");
        return;
      }

      // 3) Move forward (server page will recompute best step on reload)
      await saveStep(2);
      router.replace("/app/onboarding");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Network error saving profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-semibold">Welcome to BondIQ</h1>
      <p className="mt-2 text-slate-700">
        Signed in as <b>{email}</b>
      </p>

      <div className="mt-6 rounded-lg border p-5">
        <div className="text-sm text-slate-600">Current step: {step}</div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <h2 className="text-xl font-semibold">Step 1 — Your love profile</h2>
            <p className="text-slate-700">
              Choose up to 3 primary and up to 3 secondary love languages. This powers your reports and insights.
            </p>

            <div className="space-y-2">
              <div className="text-sm font-medium">Your name</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Jayne"
                className="w-full rounded-md border px-3 py-2"
              />
              <div className="text-xs text-slate-500">This is what your partner will see.</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Primary (max 3)</div>
              <div className="grid gap-2">
                {LOVE.map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={primary.includes(t)}
                      onChange={() => setPrimary((prev) => toggleMax3(prev, t))}
                    />
                    <span>{label(t)}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-slate-500">Selected: {primary.length}/3</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Secondary (optional, max 3)</div>
              <div className="grid gap-2">
                {LOVE.map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={secondary.includes(t)}
                      onChange={() => setSecondary((prev) => toggleMax3(prev, t))}
                    />
                    <span>{label(t)}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-slate-500">Selected: {secondary.length}/3</div>
              <div className="text-xs text-slate-500">
                If a selection overlaps Primary, it will be ignored automatically.
              </div>
            </div>

            <button
              disabled={saving || primary.length < 1}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
              onClick={submitProfile}
            >
              {saving ? "Saving…" : "Save & Continue"}
            </button>
          </div>
        )}

        {/* STEP 2 (ONLY useful when couple has 1 member; otherwise auto-skips to Step 3) */}
        {step === 2 && (
          <div className="mt-4 space-y-3">
            <h2 className="text-xl font-semibold">Step 2 — Connect your partner</h2>
            <p className="text-slate-700">
              Invite your partner by email, or share a link / QR code instantly.
            </p>

            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="Partner email (optional)"
              className="w-full rounded-md border px-3 py-2"
            />

            <div className="flex flex-wrap gap-2">
              <button
                disabled={saving}
                className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
                onClick={async () => {
                  setSaving(true);
                  setMsg(null);

                  try {
                    const res = await fetch("/api/invite/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: partnerEmailClean ? partnerEmailClean : undefined,
                      }),
                    });

                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setMsg(data?.error || "Failed to create invite");
                      return;
                    }

                    setInviteUrl(data.inviteUrl || "");
                    setMsg(data.emailed ? "✅ Invite sent by email!" : "✅ Invite link created.");
                  } catch {
                    setMsg("Network error creating invite");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Working…" : "Send invite / Create link"}
              </button>

              <button
                type="button"
                disabled={!inviteUrl}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                onClick={async () => {
                  if (!inviteUrl) return;
                  await navigator.clipboard.writeText(inviteUrl);
                  setMsg("✅ Copied invite link!");
                }}
              >
                Copy link
              </button>

              {/* ✅ Always allow moving forward; if partner later joins, app still works */}
              <button
                disabled={saving}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                onClick={async () => {
                  try {
                    setSaving(true);
                    setMsg(null);
                    const data = await saveStep(3);
                    setStep(data.onboardingStep);
                    router.replace("/app/onboarding");
                    router.refresh();
                  } catch (e: any) {
                    setMsg(e?.message || "Invalid step");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Continue to Step 3
              </button>

              <button
                disabled={saving}
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                onClick={async () => {
                  try {
                    const data = await saveStep(3);
                    setStep(data.onboardingStep);
                    if (data.onboardingCompleted) window.location.href = "/app";
                  } catch (e: any) {
                    setMsg(e?.message || "Invalid step");
                  }
                }}
              >
                Skip for now
              </button>
            </div>

            {inviteUrl && (
              <div className="rounded-md border bg-slate-50 p-3 text-sm break-all">{inviteUrl}</div>
            )}

            {inviteUrl ? (
              <div className="mt-4">
                <div className="text-sm font-semibold">QR code</div>
                <div className="text-xs text-slate-600">
                  Your partner can scan this to open the invite instantly.
                </div>

                {qrErr ? (
                  <div className="mt-2 rounded-md border bg-rose-50 p-3 text-sm">{qrErr}</div>
                ) : qr ? (
                  <div className="mt-2 inline-block rounded-md border bg-white p-3">
                    <img src={qr} alt="Invite QR code" className="h-[220px] w-[220px]" />
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-600">Generating QR…</div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="mt-4 space-y-3">
            <h2 className="text-xl font-semibold">Step 3 — First check-in</h2>
            <p className="text-slate-700">Your weekly check-ins power reports, trends, and insights.</p>

            <div className="flex gap-2">
              <a className="rounded-md border px-4 py-2" href="/app/checkin">
                Start check-in
              </a>

              <button
                disabled={saving}
                className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
                onClick={async () => {
                  setSaving(true);
                  setMsg(null);
                  try {
                    const data = await saveStep(3);
                    if (data.onboardingCompleted) window.location.href = "/app";
                    else setMsg("If you already checked in, try refreshing the page once.");
                  } catch (e: any) {
                    setMsg(e?.message || "Invalid step");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "I completed my check-in"}
              </button>
            </div>
          </div>
        )}

        {msg && <div className="mt-4 rounded-md border bg-white p-3 text-sm">{msg}</div>}
      </div>
    </main>
  );
}
