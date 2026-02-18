"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const CATEGORIES = [
  { value: "bug", label: "Bug / Error" },
  { value: "billing", label: "Billing / Subscription" },
  { value: "signin", label: "Account / Sign-in" },
  { value: "feedback", label: "Feedback" },
  { value: "feature", label: "Feature request" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export default function SupportClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const sent = sp.get("sent");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const canSend = useMemo(() => {
    const em = email.trim();
    return !busy && message.trim().length >= 10 && em.includes("@") && em.includes(".");
  }, [busy, email, message]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim().toLowerCase(),
          category,
          subject: subject.trim() || null,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Message failed to send.");

      toast.success("Message sent ✅");

      setName("");
      setEmail("");
      setCategory("bug");
      setSubject("");
      setMessage("");

      router.replace("/support?sent=1");
    } catch (err: any) {
      toast.error(err?.message || "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-slate-600">
          Send us a message — we reply to <span className="font-medium">care@bondiq.app</span>.
        </p>

        {sent ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Message sent ✅ We’ll reply soon.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Your name (optional)</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Jude"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Your email</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Category</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-slate-500">
              Choose the type so we route it faster.
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Subject (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary (e.g., “Checkout error”, “Magic link not working”)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Message</label>
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened, what page you were on, and any error you saw…"
              required
            />
            <div className="mt-2 text-xs text-slate-500">
              Tip: include steps to reproduce. You can copy/paste errors.
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className="w-full rounded-lg bg-[#ec4899] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send message"}
          </button>

          <div className="text-xs text-slate-500">
            Or email us directly at{" "}
            <a className="text-[#ec4899] underline" href="mailto:care@bondiq.app">
              care@bondiq.app
            </a>
            .
          </div>
        </form>
      </div>
    </div>
  );
}
