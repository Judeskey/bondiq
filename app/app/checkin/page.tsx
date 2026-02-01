"use client";

import { useEffect, useState } from "react";

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
  const [rating, setRating] = useState(4);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<LoveTag[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  function toggleTag(t: LoveTag) {
    setTags((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 3) return prev; // max 3 tags
      return [...prev, t];
    });
  }

  async function load() {
    const r = await fetch("/api/checkins/week", { method: "GET" });
    const d = await r.json();
    if (r.ok) setEntries(d.entries || []);
  }

  async function submit() {
    setMsg("");

    const r = await fetch("/api/checkins/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text, tags }),
    });

    const d = await r.json();

    if (r.ok) {
      setText("");
      setTags([]);
      setMsg("Saved ✅");
      load();
    } else {
      setMsg(d?.error || "Error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Weekly Check-In</h1>

      <div className="mt-6 space-y-6 border p-4 rounded-lg">
        <div>
          <label className="block font-medium">Did you feel loved? (1–5)</label>
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
          <label className="block font-medium">What made you feel loved?</label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write what happened…"
          />
          <div className="mt-1 text-xs text-slate-500">
            {text.length}/500
          </div>
        </div>

        <div>
          <label className="block font-medium">
            Love language tags (optional, up to 3)
          </label>

          <div className="mt-2 grid gap-2">
            {LOVE.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tags.includes(t)}
                  onChange={() => toggleTag(t)}
                />
                <span>{labelFor(t)}</span>
              </label>
            ))}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Selected: {tags.length}/3
          </div>
        </div>

        <button
          onClick={submit}
          className="w-fit rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
          disabled={!text.trim()}
          title={!text.trim() ? "Please enter what made you feel loved." : ""}
        >
          Save check-in
        </button>

        {msg && <div className="text-sm text-slate-700">{msg}</div>}
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">This week</h2>

        {entries.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">
            No check-ins yet for this week.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="border p-3 rounded">
                <div className="flex items-center gap-2">
                  <span aria-hidden>⭐</span>
                  <span className="font-medium">{e.rating}/5</span>
                </div>

                <div className="mt-1">{e.whatMadeMeFeelLoved}</div>

                {Array.isArray(e.languageTags) && e.languageTags.length > 0 && (
                  <div className="mt-2 text-sm text-slate-700">
                    Tags:{" "}
                    {e.languageTags
                      .map((t: LoveTag) => labelFor(t))
                      .join(", ")}
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
