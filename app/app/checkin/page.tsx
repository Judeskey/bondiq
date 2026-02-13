// app/app/checkin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

const LOVE = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"] as const;
type LoveTag = (typeof LOVE)[number];

function labelFor(tag: LoveTag) {
  switch (tag) {
    case "WORDS":
      return "Words of Affirmation";
    case "TIME":
      return "Quality Time";
    case "GIFTS":
      return "Receiving Gifts";
    case "SERVICE":
      return "Acts of Service";
    case "TOUCH":
      return "Physical Touch";
    default:
      return tag;
  }
}

export default function CheckinPage() {
  const router = useRouter();

  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<LoveTag[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  function toggleTag(t: LoveTag) {
    setTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return prev;
      return [...prev, t];
    });
  }

  async function load() {
    const r = await fetch("/api/checkins/week", { method: "GET", cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setEntries(Array.isArray(d.entries) ? d.entries : []);
  }

  async function submit() {
    if (saving) return;

    setMsg("");
    setSavedOk(false);
    setSaving(true);

    try {
      const r = await fetch("/api/checkins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text, tags }),
      });

      const d = await r.json().catch(() => ({}));

      if (r.ok) {
        setText("");
        setTags([]);
        setMsg("Saved ✅");
        setSavedOk(true);
        await load();

        // ✅ Nice UX: return them to reports shortly after saving
        // (If you prefer not to auto-redirect, delete this timeout block.)
        setTimeout(() => {
          router.push("/app/reports");
          router.refresh();
        }, 900);
      } else {
        setMsg(d?.error || "Error");
      }
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
            {/* Top row: title left, button right */}
            <div className="flex items-start justify-between">
                <div>
                <h1 className="text-2xl font-semibold">Weekly Check-In</h1>

                <p className="mt-2 text-sm text-gray-600 flex items-center gap-2 italic">
                    <span>💛</span>
                    <span>A moment to reflect on your day together.</span>
                </p>
                </div>

                <Link
                href="/app/reports"
                className="text-sm rounded-lg border px-3 py-1.5 hover:bg-slate-50 whitespace-nowrap"
                >
                Back to reports
                </Link>
            </div>
        </div>


        

      <div className="mt-6 space-y-6 border p-4 rounded-lg">
        <div>
          <label className="block font-medium">
            How connected did you feel with your partner this week? (1–5)
          </label>
          <p className="mt-1 text-xs text-slate-600">1 = disconnected • 3 = mixed • 5 = deeply connected</p>

          <input
            type="range"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-slate-700">{rating}/5</div>
        </div>

        <div>
          <label className="block font-medium">
            What made you feel loved? <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Optional: share a moment, a gesture, or leave blank…"
            maxLength={500}
          />
          <div className="mt-1 text-xs text-slate-500">{text.length}/500</div>
        </div>

        <div>
          <label className="block font-medium">Love language tags (optional, up to 3)</label>

          <div className="mt-2 grid gap-2">
            {LOVE.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input type="checkbox" checked={tags.includes(t)} onChange={() => toggleTag(t)} />
                <span>{labelFor(t)}</span>
              </label>
            ))}
          </div>

          <div className="mt-1 text-xs text-slate-500">Selected: {tags.length}/3</div>
        </div>

        {/* ✅ Action row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="w-fit rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save check-in"}
          </button>

          {savedOk ? (
            <button
              type="button"
              onClick={() => {
                router.push("/app/reports");
                router.refresh();
              }}
              className="w-fit rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Go to reports
            </button>
          ) : null}
        </div>

        {msg && <div className="text-sm text-slate-700">{msg}</div>}
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">This week</h2>

        {entries.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">No check-ins yet for this week.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="border p-3 rounded">
                <div className="flex items-center gap-2">
                  <span aria-hidden>⭐</span>
                  <span className="font-medium">{e.rating}/5</span>
                </div>

                {e.whatMadeMeFeelLoved ? (
                  <div className="mt-1">{e.whatMadeMeFeelLoved}</div>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">(No note added for this check-in.)</div>
                )}

                {Array.isArray(e.languageTags) && e.languageTags.length > 0 && (
                  <div className="mt-2 text-sm text-slate-700">
                    Tags: {e.languageTags.map((t: LoveTag) => labelFor(t)).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
