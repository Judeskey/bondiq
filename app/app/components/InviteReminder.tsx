// app/app/components/InviteReminder.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Meta = {
  ok: boolean;
  coupleId?: string;
  memberCount?: number;
  pendingInviteCount?: number;
  latestInvite?: { email: string | null; expiresAt: string | null } | null;
  needsInviteReminder?: boolean;
  reason?: "SOLO" | "SOLO_PENDING_INVITE" | "NO_COUPLE";
};

const BRAND = "#ec4899";
const DISMISS_KEY = "bi_invite_reminder_dismiss_until";

function nowMs() {
  return Date.now();
}

function setDismiss(hours: number) {
  const until = nowMs() + hours * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

function isDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  const until = raw ? Number(raw) : 0;
  return Number.isFinite(until) && until > nowMs();
}

export default function InviteReminder() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [partnerEmail, setPartnerEmail] = useState("");
  const partnerEmailClean = useMemo(() => partnerEmail.trim().toLowerCase(), [partnerEmail]);

  const [inviteUrl, setInviteUrl] = useState<string>("");

  async function loadMeta() {
    try {
      const res = await fetch("/api/couple/invite/meta", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as Meta | null;
      if (!res.ok || !data?.ok) {
        setMeta(null);
        return;
      }
      setMeta(data);

      // auto-show only if needed and not dismissed
      if (data.needsInviteReminder && !isDismissed()) {
        setOpen(true);
      }
    } catch {
      setMeta(null);
    }
  }

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createInvite() {
    setBusy(true);
    setMsg(null);
    setInviteUrl("");

    try {
      const res = await fetch("/api/invite/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: partnerEmailClean || undefined }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // handle your "ALREADY_CONNECTED" guard
        if (data?.error === "ALREADY_CONNECTED") {
          setMsg(
            data?.message ||
              "You are already connected. Disconnect first before inviting a new partner."
          );
          return;
        }
        setMsg(data?.error || "Failed to create invite.");
        return;
      }

      setInviteUrl(data.inviteUrl || "");
      if (data.emailed) setMsg("✅ Invite sent. If they don’t see it, ask them to check spam/promotions.");
      else setMsg("✅ Invite link created. Copy and share it.");

      // refresh meta after invite
      await loadMeta();
    } catch {
      setMsg("Network error creating invite.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMsg("✅ Copied invite link!");
    } catch {
      setMsg("Could not copy. Please copy manually.");
    }
  }

  function dismiss(hours: number) {
    setDismiss(hours);
    setOpen(false);
  }

  if (!meta?.needsInviteReminder) return null;

  const title =
    meta.reason === "SOLO_PENDING_INVITE"
      ? "Your partner hasn’t joined yet"
      : "Connect your partner to unlock the full experience";

  const subtitle =
    meta.reason === "SOLO_PENDING_INVITE"
      ? "You’re one step away. Resend the invite or share a fresh link."
      : "BondIQ gets dramatically better when both partners check in — richer insights, clearer patterns, better weekly reflections.";

  return (
    <>
      {/* Slim banner (always visible while solo, even if modal dismissed) */}
      <div className="mb-4 rounded-2xl border border-pink-200 bg-white/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              You’re currently solo in BondIQ
            </div>
            <div className="mt-1 text-sm text-slate-700">
              Invite your partner to unlock shared insights and better reflections.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              Invite partner
            </button>

            <button
              onClick={() => dismiss(24)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Remind me tomorrow
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{title}</div>
                <div className="mt-1 text-sm text-slate-700">{subtitle}</div>
              </div>

              <button
                onClick={() => dismiss(12)}
                className="rounded-lg border px-3 py-1 text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Send an invite</div>
              <div className="mt-1 text-sm text-slate-700">
                Add their email (optional). You can also copy a link and share anywhere.
              </div>

              <div className="mt-3 space-y-2">
                <label className="text-sm font-medium text-slate-800">Partner email (optional)</label>
                <input
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="partner@example.com"
                  autoComplete="email"
                />

                <button
                  disabled={busy}
                  onClick={createInvite}
                  className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: BRAND }}
                >
                  {busy ? "Working…" : "Send invite / Create link"}
                </button>
              </div>
            </div>

            {inviteUrl ? (
              <div className="mt-4 rounded-2xl border p-4">
                <div className="text-sm font-semibold text-slate-900">Invite link</div>
                <div className="mt-2 break-all rounded-xl border bg-slate-50 p-3 text-sm text-slate-800">
                  {inviteUrl}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={copyInvite}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    Copy link
                  </button>

                  <button
                    onClick={() => dismiss(72)}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}

            {msg ? (
              <div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-3 text-sm text-slate-900">
                {msg}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                onClick={() => dismiss(24)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Remind me tomorrow
              </button>

              <button
                onClick={() => dismiss(168)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Don’t show for a week
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tip: if your partner didn’t receive an email, share the link directly (WhatsApp/SMS).
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
