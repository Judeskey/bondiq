"use client";

import { useEffect, useState } from "react";

type CandleMember = {
  userId: string;
  label: string;
  score: number; // 0-100
  level: string;
  color: "pink" | "blue" | string;
  details?: {
    daysWithCheckinLast7: number;
    completenessToday: number;
    reportSecondsToday: number;
  };
};

function CandleSvg({ score, color }: { score: number; color: string }) {
  const flame = Math.max(6, Math.min(48, Math.round((score / 100) * 48))); // 6..48
  const flameY = 58 - flame; // top position

  const candleFill = color === "pink" ? "#f472b6" : "#60a5fa"; // tailwind-ish
  const flameFill = score >= 80 ? "#f59e0b" : score >= 40 ? "#fb7185" : "#fbbf24";

  return (
    <svg width="70" height="90" viewBox="0 0 70 90" aria-hidden>
      {/* candle body */}
      <rect x="18" y="30" width="34" height="52" rx="8" fill={candleFill} opacity="0.85" />
      <rect x="22" y="34" width="26" height="44" rx="7" fill="white" opacity="0.18" />

      {/* wick */}
      <rect x="34" y="24" width="2" height="8" rx="1" fill="#111827" opacity="0.8" />

      {/* flame */}
      <path
        d={`M35 ${flameY}
            C 28 ${flameY + 10}, 28 ${flameY + 22}, 35 ${flameY + 28}
            C 42 ${flameY + 22}, 42 ${flameY + 10}, 35 ${flameY}
            Z`}
        fill={flameFill}
        opacity="0.95"
      />

      {/* base shadow */}
      <ellipse cx="35" cy="84" rx="20" ry="4" fill="#111827" opacity="0.08" />
    </svg>
  );
}

export default function CommitmentCandles() {
  const [members, setMembers] = useState<CandleMember[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/engagement/candle", { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(d?.members)) setMembers(d.members);
      else setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // refresh after 20s so engagement pings show up
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Commitment Candles</div>
          <div className="text-sm text-slate-600">
            A daily signal of consistency: check-ins + thoughtful entries + showing up.
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-600">Loading candles…</div>
      ) : members.length === 0 ? (
        <div className="mt-4 text-sm text-slate-600">No candle data yet.</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <div key={m.userId} className="rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <CandleSvg score={m.score} color={m.color} />

                <div className="flex-1">
                  <div className="font-medium">{m.label}</div>
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold">{m.score}</span>/100 • {m.level}
                  </div>

                  {m.details ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Last 7 days: {m.details.daysWithCheckinLast7}/7 • Today completeness:{" "}
                      {m.details.completenessToday}/100 • Report time today:{" "}
                      {Math.min(600, m.details.reportSecondsToday)}s
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Tip: 1 check-in/day is enough — quality beats quantity.
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
