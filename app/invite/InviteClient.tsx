// app/invite/InviteClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import QRCode from "qrcode";

function pickParam(sp: URLSearchParams, keys: string[]) {
  for (const k of keys) {
    const v = sp.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function isSoftAcceptError(message: string) {
  const m = (message || "").toLowerCase();
  return (
    m.includes("already connected") ||
    m.includes("already") ||
    m.includes("connected to a couple") ||
    m.includes("already a member") ||
    m.includes("already joined")
  );
}

type SessionUser = { email?: string | null } | null;

export default function InviteClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => pickParam(sp, ["token", "t", "invite", "inviteToken"]), [sp]);
  const emailParam = useMemo(() => pickParam(sp, ["email", "e", "inviteeEmail"]), [sp]);

  const invitedEmail = (emailParam || "").trim().toLowerCase();
  const hasInvite = Boolean(token);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  const onboardingUrl = useMemo(() => {
    if (typeof window === "undefined") return "/app/onboarding";
    const u = new URL(window.location.origin + "/app/onboarding");
    if (token) u.searchParams.set("token", token);
    if (invitedEmail) u.searchParams.set("email", invitedEmail);
    return u.pathname + u.search;
  }, [token, invitedEmail]);

  const [sessionUser, setSessionUser] = useState<SessionUser>(null);
  const authedEmail = (sessionUser?.email || "").trim().toLowerCase();
  const emailMatches = invitedEmail && authedEmail && invitedEmail === authedEmail;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Sign-in form (credentials)
  const [loginEmail, setLoginEmail] = useState(invitedEmail || "");
  const [loginPassword, setLoginPassword] = useState("");

  // Create account form (credentials)
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState(invitedEmail || "");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");

  // QR
  const [qr, setQr] = useState<string>("");
  const [qrErr, setQrErr] = useState<string | null>(null);

  const pinkBtn =
    "rounded-xl bg-[#ec4899] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition";
  const pinkBtnFull = "w-full " + pinkBtn;
  const pinkOutline =
    "rounded-xl border border-[#ec4899] px-4 py-2 text-sm font-semibold text-[#ec4899] hover:bg-pink-50 disabled:opacity-60 disabled:cursor-not-allowed transition";

  async function loadSession() {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setSessionUser(data?.user ?? null);
    } catch {
      setSessionUser(null);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function gen() {
      setQrErr(null);
      if (!inviteLink || !hasInvite) {
        setQr("");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(inviteLink, { margin: 1, width: 220 });
        if (!cancelled) setQr(dataUrl);
      } catch {
        if (!cancelled) {
          setQr("");
          setQrErr("Unable to generate QR code.");
        }
      }
    }

    gen();
    return () => {
      cancelled = true;
    };
  }, [inviteLink, hasInvite]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMsg("✅ Copied invite link!");
      setTimeout(() => setMsg(null), 1200);
    } catch {
      setMsg("Copy failed — please copy manually.");
    }
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      const email = loginEmail.trim().toLowerCase();
      if (!email) {
        setMsg("Email is required.");
        return;
      }
      if (invitedEmail && email !== invitedEmail) {
        setMsg(`Please sign in with the invited email: ${invitedEmail}`);
        return;
      }

      const res = await signIn("credentials", {
        email,
        password: loginPassword,
        redirect: false,
        callbackUrl: inviteLink || "/invite",
      });

      if (res?.error) {
        setMsg(res.error);
        return;
      }

      await loadSession();
      setMsg("✅ Signed in. Click Continue to connect.");
    } catch (err: any) {
      setMsg(err?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function doCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      const email = newEmail.trim().toLowerCase();
      if (!email) {
        setMsg("Email is required.");
        return;
      }
      if (invitedEmail && email !== invitedEmail) {
        setMsg(`Account must be created with invited email: ${invitedEmail}`);
        return;
      }
      if (newPassword.length < 8) {
        setMsg("Password must be at least 8 characters.");
        return;
      }
      if (newPassword !== newConfirm) {
        setMsg("Passwords do not match.");
        return;
      }
      if (!token) {
        setMsg("Missing invite token. Please open the invite link again.");
        return;
      }

      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword, name: newName, token }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(d?.error || "Unable to create account.");
        return;
      }

      const res = await signIn("credentials", {
        email,
        password: newPassword,
        redirect: false,
        callbackUrl: inviteLink || "/invite",
      });

      if (res?.error) {
        setMsg(res.error);
        return;
      }

      await loadSession();
      setMsg("✅ Account created. Click Continue to connect.");
    } catch (err: any) {
      setMsg(err?.message || "Create account failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleContinue() {
    setMsg(null);

    if (!hasInvite) {
      setMsg("This page must be opened with a valid invite link.");
      return;
    }

    if (!authedEmail) {
      setMsg("Please sign in or create an account first.");
      return;
    }

    if (invitedEmail && !emailMatches) {
      setMsg(`You are signed in as ${authedEmail}. Please sign in with ${invitedEmail}.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = String(data?.error || "Unable to accept invite.");
        if (isSoftAcceptError(errMsg)) {
          setMsg("✅ You’re already connected. Continuing to onboarding…");
          router.push(onboardingUrl);
          router.refresh();
          return;
        }

        setMsg(errMsg);
        return;
      }

      router.push(onboardingUrl);
      router.refresh();
    } catch {
      setMsg("Network error accepting invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Invite details</div>

        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex gap-2">
            <div className="w-24 font-semibold">Token:</div>
            <div className="break-all">{token ?? "—"}</div>
          </div>

          <div className="flex gap-2">
            <div className="w-24 font-semibold">Email:</div>
            <div className="break-all">{emailParam ?? "— (not required)"}</div>
          </div>

          <div className="flex gap-2">
            <div className="w-24 font-semibold">Signed in:</div>
            <div className="break-all">{authedEmail || "No"}</div>
          </div>
        </div>

        {!hasInvite ? (
          <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            This page must be opened using an invite link.
            <div className="mt-2 text-xs text-slate-500">
              Example: <span className="font-mono">/invite?token=YOUR_TOKEN</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border bg-pink-50 p-4 text-sm text-slate-700">
            {invitedEmail ? (
              <>
                Use <b>{invitedEmail}</b> to sign in or create an account. Then we’ll connect you automatically.
              </>
            ) : (
              <>Sign in to accept this invite.</>
            )}
          </div>
        )}

        {msg ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {msg}
          </div>
        ) : null}

        {!authedEmail ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">Sign in</div>
              <form onSubmit={doLogin} className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={!!invitedEmail}
                  />
                  {invitedEmail ? (
                    <div className="mt-1 text-xs text-slate-500">Email locked to invite.</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium">Password</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    type="password"
                    required
                  />
                </div>

                {/* ✅ Make Sign in SECONDARY */}
                <button type="submit" disabled={busy || !hasInvite} className={"w-full " + pinkOutline}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">Create account</div>
              <form onSubmit={doCreateAccount} className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium">Name (optional)</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Jayne"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={!!invitedEmail}
                  />
                  {invitedEmail ? (
                    <div className="mt-1 text-xs text-slate-500">Email locked to invite.</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium">Password</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Confirm password</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={newConfirm}
                    onChange={(e) => setNewConfirm(e.target.value)}
                    type="password"
                    required
                    minLength={8}
                  />
                </div>

                {/* ✅ Make Create account PRIMARY */}
                <button type="submit" disabled={busy || !hasInvite} className={pinkBtnFull}>
                  {busy ? "Creating…" : "Create account"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!hasInvite || busy || !authedEmail || (invitedEmail ? !emailMatches : false)}
            className={pinkBtn}
          >
            {busy ? "Working…" : "Continue"}
          </button>

          <button type="button" onClick={copyLink} className={pinkOutline} disabled={!inviteLink}>
            Copy link
          </button>
        </div>

        {hasInvite ? (
          <div className="mt-6">
            <div className="text-sm font-semibold">Scan QR to open invite</div>
            <div className="mt-2 text-xs text-slate-600">Great for inviting in person.</div>

            {qrErr ? (
              <div className="mt-3 rounded-xl border bg-rose-50 p-3 text-sm">{qrErr}</div>
            ) : qr ? (
              <div className="mt-3 inline-block rounded-xl border bg-white p-3">
                <img src={qr} alt="Invite QR code" className="h-[220px] w-[220px]" />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">Generating QR…</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
