// app/app/settings/DisconnectPartnerCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function DisconnectPartnerCard() {
  const [info, setInfo] = useState<CoupleMembersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [partnerEmail, setPartnerEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [phrase, setPhrase] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const memberCount = info?.members?.length ?? 0;

  const pinkBtn =
    "rounded-xl bg-[#ec4899] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition";
  const pinkOutline =
    "rounded-xl border border-[#ec4899] px-4 py-2 text-sm font-semibold text-[#ec4899] hover:bg-pink-50 disabled:opacity-60 disabled:cursor-not-allowed transition";

  const canStart = !loading && memberCount >= 2;

  const canConfirm =
    !!token &&
    !!phrase &&
    typed === phrase &&
    partnerEmail.trim().length > 3 &&
    !busy;

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/couple/members", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as CoupleMembersResponse | null;
      if (!res.ok || !data) {
        setInfo(null);
        return;
      }
      setInfo(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function startDisconnect() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/couple/disconnect/request", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Unable to start disconnect.");
        return;
      }
      setToken(data.token);
      setPhrase(data.phrase);
      setStarted(true);
      setTyped("");
      setMsg("Type the phrase exactly, confirm your partner’s email, then disconnect.");
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisconnect() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/couple/disconnect/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          phrase: typed,
          partnerEmail: partnerEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || "Unable to disconnect.");
        return;
      }

      setMsg("✅ Disconnected. Redirecting to onboarding…");
      window.location.href = data.redirectTo || "/app/onboarding";
    } catch {
      setMsg("Network error confirming disconnect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-rose-900">Danger zone</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Disconnect from partner</h3>
          <p className="mt-1 text-sm text-slate-700">
            This removes you from your current couple and creates a new solo couple for you.
            Your previous couple history stays with the old couple.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4 text-sm text-slate-700">
        <ul className="list-disc pl-5 space-y-1">
          <li>This is designed to prevent accidental clicks.</li>
          <li>You’ll be taken to onboarding to invite a new partner.</li>
          <li>You must type an exact phrase and confirm your partner’s email.</li>
        </ul>
      </div>

      <div className="mt-4 text-sm text-slate-700">
        {loading ? (
          "Loading couple status…"
        ) : memberCount <= 1 ? (
          <span className="text-slate-600">You are not connected to a partner yet.</span>
        ) : (
          <span className="text-slate-700">
            Partner detected. Only proceed if you’re sure.
          </span>
        )}
      </div>

      {msg ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {msg}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-900">Confirm partner email</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            placeholder="partner@example.com"
            autoComplete="email"
          />
          <div className="mt-1 text-xs text-slate-600">
            Must match your current partner’s email exactly.
          </div>
        </div>

        {!started ? (
          <button
            type="button"
            className={pinkOutline}
            disabled={!canStart || busy}
            onClick={startDisconnect}
          >
            {busy ? "Starting…" : "Start disconnect"}
          </button>
        ) : (
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Final confirmation</div>
            <div className="mt-1 text-sm text-slate-700">
              Type this phrase exactly:
              <div className="mt-2 rounded-xl border bg-slate-50 px-3 py-2 font-mono text-sm">
                {phrase}
              </div>
            </div>

            <input
              className="mt-3 w-full rounded-xl border px-3 py-2"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type the phrase here"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={pinkBtn}
                disabled={!canConfirm}
                onClick={confirmDisconnect}
              >
                {busy ? "Disconnecting…" : "Disconnect now"}
              </button>

              <button
                type="button"
                className={pinkOutline}
                disabled={busy}
                onClick={() => {
                  setStarted(false);
                  setToken(null);
                  setPhrase(null);
                  setTyped("");
                  setMsg("Cancelled.");
                }}
              >
                Cancel
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              The button unlocks only when the phrase matches exactly.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
