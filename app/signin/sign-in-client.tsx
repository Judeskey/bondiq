// app/components/SignInClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, type SignInResponse } from "next-auth/react";

type ProviderMap = Record<
  string,
  { id: string; name: string; type: string; signinUrl: string; callbackUrl: string }
>;

type SignInClientProps = {
  callbackUrl: string;
  errorCode?: string;
};

function friendlyAuthError(code: string) {
  const c = (code || "").trim();

  if (c === "CredentialsSignin") return "Incorrect email or password.";
  if (c === "AccessDenied") return "Access denied. Try a different sign-in method.";
  if (c === "Verification") return "That magic link is invalid or expired. Please request a new one.";
  if (c === "OAuthSignin") return "Google sign-in failed. Please try again.";
  if (c === "OAuthCallback") return "Google sign-in could not complete. Please try again.";
  if (c === "Configuration") return "Auth configuration error. Please contact support.";

  return c ? `Sign-in failed: ${c}` : "Sign-in failed. Please try again.";
}

export default function SignInClient({ callbackUrl, errorCode }: SignInClientProps) {
  const [providers, setProviders] = useState<ProviderMap | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [magicEmail, setMagicEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"magic" | "password">("magic");

  useEffect(() => {
    if (errorCode) {
      setMsg(friendlyAuthError(errorCode));
      if (errorCode === "CredentialsSignin") setActiveTab("password");
    }
  }, [errorCode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingProviders(true);
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const json = (await res.json()) as ProviderMap;
        if (!cancelled) setProviders(json);
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load sign-in methods.");
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const credentialsProviderId = useMemo(() => {
    const p = providers?.credentials;
    return p?.id || "credentials";
  }, [providers]);

  const googleProviderId = useMemo(() => {
    const p = providers?.google;
    return p?.id || "google";
  }, [providers]);

  const emailProviderId = useMemo(() => {
    if (!providers) return null;
    const found = Object.values(providers).find((p) => p?.type === "email");
    return found?.id || null;
  }, [providers]);

  const hasCredentials = useMemo(() => !!providers?.credentials, [providers]);
  const hasGoogle = useMemo(() => !!providers?.google, [providers]);
  const hasEmailProvider = useMemo(() => !!emailProviderId, [emailProviderId]);

  async function doCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    try {
      const res: SignInResponse | undefined = await signIn(credentialsProviderId, {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl,
        redirect: false,
      });

      if (!res) {
        setMsg("No response from server.");
        return;
      }

      if (res.error) {
        setMsg(friendlyAuthError(res.error));
        return;
      }

      window.location.href = res.url ?? callbackUrl;
    } catch (err: any) {
      setMsg(err?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function doMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const em = magicEmail.trim().toLowerCase();
    if (!em) {
      setMsg("Please enter your email.");
      return;
    }

    if (!emailProviderId) {
      setMsg("Magic link provider not available right now. Use email + password instead.");
      return;
    }

    setBusy(true);

    try {
      await signIn(emailProviderId, {
        email: em,
        callbackUrl,
      });
    } catch (err: any) {
      setMsg(err?.message || "Magic link request failed. Please try again.");
      setBusy(false);
    }
  }

  async function doGoogle() {
    setMsg(null);
    setBusy(true);
    try {
      await signIn(googleProviderId, { callbackUrl, redirect: true });
    } catch (err: any) {
      setMsg(err?.message || "Google sign-in failed.");
      setBusy(false);
    }
  }

  const pinkBtn =
    "w-full rounded-lg bg-[#ec4899] px-4 py-2 text-white shadow-sm hover:opacity-95 disabled:opacity-60";
  const pinkOutline =
    "w-full rounded-lg border border-[#ec4899] px-4 py-2 text-[#ec4899] hover:bg-pink-50 disabled:opacity-60";

  return (
    <div className="space-y-5">
      {msg ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {msg}
        </div>
      ) : null}

      <div className="text-sm text-gray-600">
        {loadingProviders ? "Loading sign-in methods…" : null}
        {!loadingProviders && !providers ? "No providers loaded." : null}
      </div>

      {hasGoogle ? (
        <button type="button" onClick={doGoogle} disabled={busy} className={pinkOutline}>
          {busy ? "Please wait…" : "Continue with Google"}
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("magic")}
          className={`rounded-lg border px-3 py-2 text-sm ${
            activeTab === "magic"
              ? "border-[#ec4899] bg-pink-50 text-[#ec4899]"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          New / Guest (Magic link)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`rounded-lg border px-3 py-2 text-sm ${
            activeTab === "password"
              ? "border-[#ec4899] bg-pink-50 text-[#ec4899]"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Returning (Password)
        </button>
      </div>

      {activeTab === "magic" ? (
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Sign in with a magic link</div>
          <div className="mt-1 text-xs text-slate-600">
            Best for first-time users. No password needed.
          </div>

          {!hasEmailProvider && !loadingProviders ? (
            <div className="mt-3 text-sm text-slate-600">
              Magic link provider not available right now. Use email + password instead.
            </div>
          ) : (
            <form onSubmit={doMagicLink} className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button type="submit" disabled={busy || !hasEmailProvider} className={pinkBtn}>
                {busy ? "Sending…" : "Send sign-in link"}
              </button>

              <div className="text-xs text-slate-500">
                Tip: if you don’t see it, check Promotions/Spam, then request a fresh link.
              </div>
            </form>
          )}
        </div>
      ) : null}

      {activeTab === "password" ? (
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Sign in with email & password</div>
          <div className="mt-1 text-xs text-slate-600">Best for returning users.</div>

          {hasCredentials ? (
            <form onSubmit={doCredentialsLogin} className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Password</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={busy} className={pinkBtn}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            !loadingProviders && (
              <div className="mt-3 text-sm text-slate-600">Credentials provider not available.</div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
