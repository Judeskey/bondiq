"use client";

import { useState } from "react";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Failed to set password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password updated ✅ You can now sign in with password next time.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Security</h1>
      <p className="mt-2 text-slate-700">
        Set a password so you don’t need email sign-in every time.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password (leave blank if none yet)"
          className="w-full rounded-md border px-3 py-2"
        />

        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full rounded-md border px-3 py-2"
        />

        <button
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>

      {msg && (
        <div className="mt-4 rounded-md border bg-white p-3 text-sm text-slate-800">
          {msg}
        </div>
      )}
    </main>
  );
}
