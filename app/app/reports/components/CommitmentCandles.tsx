"use client";

import { useEffect, useMemo, useState } from "react";

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

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function CandleSvg({ score, color }: { score: number; color: string }) {
  const s = clamp(Number(score || 0), 0, 100);

  // ✅ Extra headroom so the flame is always visible
  const viewTop = -26;
  const viewHeight = 116;

  const candleTopY = 30;
  const wickTopY = 22;
  const flameBaseY = wickTopY + 4;

  const flameH = clamp(Math.round(10 + (s / 100) * 42), 10, 52);
  const flameTopY = flameBaseY - flameH;

  const candleFill =
    color === "blue" ? "#C084FC" : color === "pink" ? "#FCA5A5" : "#F59EAE";
  const candleShade = "#FB7185";
  const candleHighlight = "rgba(255,255,255,0.22)";

  const flameOuter = s >= 80 ? "#FDBA74" : s >= 40 ? "#FB7185" : "#FDE68A";
  const flameInner = s >= 80 ? "#FEF3C7" : s >= 40 ? "#FFE4E6" : "#FFFBEB";

  const flicker = useMemo(() => 1.6 - (s / 100) * 0.35, [s]);

  // Unique ids to avoid collisions when multiple candles render
  const uid = `${Math.round(s)}-${String(color).slice(0, 8)}`;

  return (
    <svg
      width={70}
      height={110}
      viewBox={`0 ${viewTop} 70 ${viewHeight}`}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`candleGrad-${uid}`} x1="0" y1="30" x2="0" y2="82">
          <stop offset="0%" stopColor={candleFill} stopOpacity="0.92" />
          <stop offset="100%" stopColor={candleShade} stopOpacity="0.88" />
        </linearGradient>

        <filter id={`softShadow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.12" />
        </filter>
      </defs>

      <ellipse cx="35" cy="84" rx="20" ry="4" fill="#111827" opacity="0.08" />

      <rect
        x="18"
        y="30"
        width="34"
        height="52"
        rx="10"
        fill={`url(#candleGrad-${uid})`}
        filter={`url(#softShadow-${uid})`}
      />
      <rect x="22" y="34" width="8" height="44" rx="6" fill={candleHighlight} />

      <rect x="34" y="22" width="2" height="10" rx="1" fill="#111827" opacity="0.78" />

      <ellipse cx="35" cy={candleTopY - 6} rx="14" ry="7" fill={flameOuter} opacity="0.10" />

      <g style={{ transformOrigin: `35px ${flameBaseY}px` }} className="bondiq-flame">
        <path
          d={`
            M 35 ${flameTopY}
            C 27 ${flameTopY + flameH * 0.38}, 28 ${flameBaseY - flameH * 0.18}, 35 ${flameBaseY}
            C 42 ${flameBaseY - flameH * 0.18}, 43 ${flameTopY + flameH * 0.38}, 35 ${flameTopY}
            Z
          `}
          fill={flameOuter}
          opacity="0.96"
        />
        <path
          d={`
            M 35 ${flameTopY + flameH * 0.22}
            C 31 ${flameTopY + flameH * 0.44}, 32 ${flameBaseY - flameH * 0.14}, 35 ${flameBaseY - 2}
            C 38 ${flameBaseY - flameH * 0.14}, 39 ${flameTopY + flameH * 0.44}, 35 ${flameTopY + flameH * 0.22}
            Z
          `}
          fill={flameInner}
          opacity="0.92"
        />
      </g>

      <style>{`
        .bondiq-flame {
          animation: bondiq-flicker ${flicker}s ease-in-out infinite;
        }
        @keyframes bondiq-flicker {
          0%   { transform: rotate(-1.4deg) scale(1.0); }
          35%  { transform: rotate(1.1deg)  scale(0.985); }
          70%  { transform: rotate(-0.8deg) scale(1.02); }
          100% { transform: rotate(-1.4deg) scale(1.0); }
        }
      `}</style>
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
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-900">Commitment Candles</div>
          <div className="mt-1 text-sm text-zinc-600">
            A gentle signal of consistency — small moments, repeated with love.
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-zinc-600">Lighting the candles…</div>
      ) : members.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-600">No candle data yet.</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <div key={m.userId} className="rounded-3xl border border-zinc-200 bg-zinc-50/40 p-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0 overflow-visible">
                  <CandleSvg score={m.score} color={m.color} />
                </div>

                <div className="flex-1">
                  <div className="text-sm font-semibold text-zinc-900">{m.label}</div>
                  <div className="mt-1 text-sm text-zinc-700">
                    <span className="font-semibold">{m.score}</span>/100 • {m.level}
                  </div>

                  {m.details ? (
                    <div className="mt-2 text-xs text-zinc-600">
                      Last 7 days: {m.details.daysWithCheckinLast7}/7 • Today completeness:{" "}
                      {m.details.completenessToday}/100 • Report time today:{" "}
                      {Math.min(600, m.details.reportSecondsToday)}s
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                Tip: One honest check-in a day is enough — consistency builds safety.
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
