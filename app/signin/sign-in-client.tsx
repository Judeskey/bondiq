// app/signin/sign-in-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, type SignInResponse } from "next-auth/react";


type ProviderMap = Record<
  string,
  { id: string; name: string; type: string; signinUrl: string; callbackUrl: string }
>;

export default function SignInClient({ callbackUrl }: { callbackUrl: string }) {
  const [providers, setProviders] = useState<ProviderMap | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [magicEmail, setMagicEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingProviders(true);
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const json = (await res.json()) as ProviderMap;
        if (!cancelled) setProviders(json);
      } catch (e: any) {
        if (!cancelled) setMsg(e?.message || "Failed to load providers");
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasCredentials = useMemo(() => !!providers?.credentials, [providers]);
  const hasResend = useMemo(() => !!providers?.resend, [providers]);
  const hasGoogle = useMemo(() => !!providers?.google, [providers]);

  async function doCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
  
    try {
      const res: SignInResponse | undefined = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
  
      if (!res) {
        setMsg("No response from server.");
        return;
      }
  
      if (res.error) {
        setMsg(res.error);
        return;
      }
  
      // ✅ success
      window.location.href = res.url ?? callbackUrl;
    } catch (err: any) {
      setMsg(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }
  
  async function doMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
  
    try {
      const res: SignInResponse | undefined = await signIn("resend", {
        email: magicEmail,
        callbackUrl,
        redirect: false,
      });
  
      if (!res) {
        setMsg("No response from server.");
        return;
      }
  
      if (res.error) {
        setMsg(res.error);
        return;
      }
  
      // ✅ For magic link, we usually just tell user to check email
      setMsg("Check your email for a sign-in link.");
    } catch (err: any) {
      setMsg(err?.message || "Magic link failed");
    } finally {
      setBusy(false);
    }
  }
  

  async function doGoogle() {
    setMsg(null);
    setBusy(true);
    try {
      await signIn("google", { callbackUrl, redirect: true });
    } catch (err: any) {
      setMsg(err?.message || "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
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
        <button
          type="button"
          onClick={doGoogle}
          disabled={busy}
          className="w-full rounded-lg border px-4 py-2 disabled:opacity-60"
        >
          {busy ? "Please wait…" : "Continue with Google"}
        </button>
      ) : null}

      {hasCredentials && hasGoogle ? (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="text-xs text-gray-500">OR</div>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      ) : null}

      {hasCredentials ? (
        <form onSubmit={doCredentialsLogin} className="space-y-3">
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

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        !loadingProviders && (
          <div className="text-sm text-gray-600">Credentials provider not available.</div>
        )
      )}

      {hasResend ? (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <div className="text-xs text-gray-500">Magic link</div>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={doMagicLink} className="space-y-3">
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

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg border px-4 py-2 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
