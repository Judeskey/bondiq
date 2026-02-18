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

function StepPill({ n, active }: { n: number; active: boolean }) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        active
          ? "border-[#ec4899] bg-pink-50 text-[#ec4899]"
          : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
          active ? "bg-[#ec4899] text-white" : "bg-slate-100 text-slate-700",
        ].join(" ")}
      >
        {n}
      </span>
      Step {n}
    </div>
  );
}

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

  // ✅ Auto-skip Step 2 when couple already has 2 members
  useEffect(() => {
    if (step !== 2) return;
    if (alreadySkippedStep2Ref.current) return;

    (async () => {
      const info = await loadCoupleInfo();
      const memberCount = info?.members?.length ?? 0;

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
    if (!res.ok) {
      // ✅ Show the real server error (super helpful for “not progressing”)
      throw new Error(data?.error || `Failed to save step (HTTP ${res.status})`);
    }

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
        setMsg(d1?.error || `Unable to save name (HTTP ${r1.status}).`);
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
        setMsg(d2?.error || `Unable to save love profile (HTTP ${r2.status}).`);
        return;
      }

      // ✅ 3) Move forward
      // IMPORTANT FIX: setStep immediately so the UI progresses even if route refresh is flaky.
      const stepData = await saveStep(2);
      setStep(stepData.onboardingStep);

      // Refresh server state so page.tsx recomputes based on the newly-created loveProfile
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Network error saving profile");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ec4899]/30 focus:border-[#ec4899]";
  const pinkBtn =
    "rounded-xl bg-[#ec4899] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition";
  const pinkBtnFull = "w-full " + pinkBtn;
  const pinkOutline =
    "rounded-xl border border-[#ec4899] px-4 py-2 text-sm font-semibold text-[#ec4899] hover:bg-pink-50 disabled:opacity-60 disabled:cursor-not-allowed transition";

  function isCheckedDisabled(list: LoveLanguage[], t: LoveLanguage) {
    return !list.includes(t) && list.length >= 3;
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("✅ Copied invite link!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setMsg("✅ Copied invite link!");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl border bg-gradient-to-b from-pink-50 to-white p-6">
        <div className="text-sm font-semibold text-[#ec4899]">BondIQ Onboarding</div>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Welcome 👋</h1>
        <p className="mt-2 text-slate-700">
          Signed in as <span className="font-semibold">{email}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <StepPill n={1} active={step === 1} />
          <StepPill n={2} active={step === 2} />
          <StepPill n={3} active={step === 3} />
        </div>

        <p className="mt-4 text-sm text-slate-600">
          These choices power your weekly reflections, insights, and gentle repair suggestions.
        </p>
      </div>

      {msg ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {msg}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Step 1 — Your love profile</h2>
              <p className="mt-1 text-slate-700">
                Pick up to <span className="font-semibold">3 primary</span> and up to{" "}
                <span className="font-semibold">3 secondary</span> love languages. BondIQ uses this to personalize your
                insights.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Your name</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Jayne"
                className={input}
              />
              <div className="text-xs text-slate-500">This is what your partner will see.</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Primary (max 3)</div>
                <div className="text-xs text-slate-600">
                  Selected: <span className="font-semibold">{primary.length}</span>/3
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {LOVE.map((t) => (
                  <label
                    key={t}
                    className={[
                      "flex items-center gap-3 rounded-xl border px-3 py-2",
                      primary.includes(t) ? "border-[#ec4899] bg-pink-50" : "border-slate-200 bg-white",
                      isCheckedDisabled(primary, t) ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={primary.includes(t)}
                      disabled={isCheckedDisabled(primary, t)}
                      onChange={() => setPrimary((prev) => toggleMax3(prev, t))}
                      className="h-4 w-4 accent-[#ec4899]"
                    />
                    <span className="text-sm text-slate-900">{label(t)}</span>
                  </label>
                ))}
              </div>

              {primary.length >= 3 ? (
                <div className="mt-3 text-xs text-slate-600">
                  You’ve selected the maximum of 3 primary languages.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Secondary (optional, max 3)</div>
                <div className="text-xs text-slate-600">
                  Selected: <span className="font-semibold">{secondary.length}</span>/3
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {LOVE.map((t) => (
                  <label
                    key={t}
                    className={[
                      "flex items-center gap-3 rounded-xl border px-3 py-2",
                      secondary.includes(t) ? "border-[#ec4899] bg-pink-50" : "border-slate-200 bg-white",
                      isCheckedDisabled(secondary, t) ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={secondary.includes(t)}
                      disabled={isCheckedDisabled(secondary, t)}
                      onChange={() => setSecondary((prev) => toggleMax3(prev, t))}
                      className="h-4 w-4 accent-[#ec4899]"
                    />
                    <span className="text-sm text-slate-900">{label(t)}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 text-xs text-slate-600">
                If a selection overlaps with Primary, it will be ignored automatically.
              </div>
            </div>

            <button disabled={saving || primary.length < 1} className={pinkBtnFull} onClick={submitProfile}>
              {saving ? "Saving…" : "Save & Continue"}
            </button>

            <div className="text-xs text-slate-500">
              Tip: Don’t overthink it — you can refine this later in Settings.
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Step 2 — Connect your partner</h2>
              <p className="mt-1 text-slate-700">
                Invite your partner by email, or share a link / QR code.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Partner email (optional)</div>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="partner@example.com"
                className={input}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={saving}
                className={pinkBtn}
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
                {saving ? "Working…" : partnerEmailClean ? "Send invite" : "Create invite link"}
              </button>

              <button
                type="button"
                disabled={!inviteUrl}
                className={pinkOutline}
                onClick={async () => {
                  if (!inviteUrl) return;
                  await copyToClipboard(inviteUrl);
                }}
              >
                Copy link
              </button>

              <button
                disabled={saving}
                className={pinkOutline}
                onClick={async () => {
                  try {
                    setSaving(true);
                    setMsg(null);
                    const data = await saveStep(3);
                    setStep(data.onboardingStep);
                    router.refresh();
                  } catch (e: any) {
                    setMsg(e?.message || "Unable to continue. Please try again.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Continue
              </button>
            </div>

            {inviteUrl ? (
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-600">Invite link</div>
                <div className="mt-2 break-all rounded-xl border bg-white p-3 text-sm text-slate-900">
                  {inviteUrl}
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-900">QR code</div>

                  {qrErr ? (
                    <div className="mt-2 rounded-xl border bg-rose-50 p-3 text-sm text-rose-900">
                      {qrErr}
                    </div>
                  ) : qr ? (
                    <div className="mt-2 inline-block rounded-xl border bg-white p-3">
                      <img src={qr} alt="Invite QR code" className="h-[220px] w-[220px]" />
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-600">Generating QR…</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Step 3 — Your first check-in</h2>
              <p className="mt-1 text-slate-700">
                Weekly check-ins power your report, trends, and gentle repair suggestions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a className={pinkOutline} href="/app/checkin">
                Start check-in
              </a>

              <button
                disabled={saving}
                className={pinkBtn}
                onClick={async () => {
                  setSaving(true);
                  setMsg(null);
                  try {
                    const data = await saveStep(3);
                    if (data.onboardingCompleted) window.location.href = "/app";
                    else setMsg("If you already checked in, try refreshing the page once.");
                  } catch (e: any) {
                    setMsg(e?.message || "Unable to confirm. Please try again.");
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
      </div>
    </main>
  );
}
