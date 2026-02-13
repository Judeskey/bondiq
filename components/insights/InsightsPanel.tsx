"use client";

import { useEffect, useMemo, useState } from "react";

type MemberInfo = {
  userId: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

type DayStat = { dayKey: string; dow: number; avg: number };

type Dip = {
  dayKey: string;
  dow: number;
  avg: number;
  baseline: number;
  delta: number; // negative means dip
};

type Trigger = { tag: string; hits: number };

type Stats = {
  daysCheckedIn: number;
  avg: number;
  volatility: number;
};

type PartnerInsights = {
  userId: string;
  stats: Stats;
  bestDay?: DayStat | null;
  hardestDay?: DayStat | null;
  midWeekDips?: Dip[] | null;
  recoveryTriggers?: Trigger[] | null;
};

type CoupleInsights = {
  stats: Stats;
  bestDay?: DayStat | null;
  hardestDay?: DayStat | null;
  midWeekDips?: Dip[] | null;
  recoveryTriggers?: Trigger[] | null;
};

type InsightsPayload = {
  coupleId: string;
  windowDays: number;
  since: string;
  couple: CoupleInsights;
  perPartner: PartnerInsights[];
};

type ApiResponse = {
  coupleId: string;
  windowDays: number;
  cached: boolean;
  dayKey?: string;
  cachedAt?: string;
  ttlSeconds?: number;
  insights: InsightsPayload;
};

function displayName(m?: MemberInfo) {
  const nick = (m?.nickname || "").trim();
  const name = (m?.name || "").trim();
  const email = (m?.email || "").trim();
  if (nick) return nick;
  if (name) return name;
  if (email) return email.split("@")[0];
  return "Partner";
}

function dowLabel(dow: number) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const i = Number.isFinite(dow) ? ((dow % 7) + 7) % 7 : 0;
  return names[i] || "Day";
}

function fmtDayStat(s?: DayStat | null) {
  if (!s?.dayKey) return "—";
  return `${dowLabel(s.dow)} (${s.dayKey})`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-700">
      {children}
    </span>
  );
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function formatTriggers(triggers?: Trigger[] | null, limit = 3) {
  const arr = Array.isArray(triggers) ? triggers : [];
  if (!arr.length) return { value: "Not enough signal", sub: "Add a few more check-ins to learn recovery triggers" };

  const top = arr
    .slice()
    .sort((a, b) => (b.hits ?? 0) - (a.hits ?? 0))
    .slice(0, limit)
    .map((t) => `${String(t.tag)} (${t.hits})`);

  return {
    value: `${arr.length} signal(s)`,
    sub: top.join(" • "),
  };
}

function formatDips(dips?: Dip[] | null) {
  const arr = Array.isArray(dips) ? dips : [];
  if (!arr.length) return { value: "None detected", sub: "Stable mid-week pattern" };

  const top = arr.slice(0, 2).map((d) => {
    const avg = Number.isFinite(d.avg) ? d.avg.toFixed(1) : String(d.avg);
    const delta = Number.isFinite(d.delta) ? d.delta.toFixed(2) : String(d.delta);
    return `${dowLabel(d.dow)} avg ${avg} (Δ${delta})`;
  });

  return {
    value: `${arr.length} dip(s)`,
    sub: top.join(" • "),
  };
}

export default function InsightsPanel({
  windowDays = 28,
  members = [],
  onUpgrade,
}: {
  windowDays?: number;
  members?: MemberInfo[];
  onUpgrade?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [proBlocked, setProBlocked] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) map.set(m.userId, displayName(m));
    return map;
  }, [members]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setProBlocked(false);

        const res = await fetch(`/api/insights?windowDays=${windowDays}`, {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => ({}))) as any;

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 402 || res.status === 403) {
            setProBlocked(true);
            setData(null);
            return;
          }
          setErr(json?.error || "Failed to load insights");
          setData(null);
          return;
        }

        setData(json as ApiResponse);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load insights");
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const couple = data?.insights?.couple;
  const perPartner = data?.insights?.perPartner ?? [];

  const dipsFmt = useMemo(() => formatDips(couple?.midWeekDips), [couple?.midWeekDips]);
  const triggersFmt = useMemo(
    () => formatTriggers(couple?.recoveryTriggers),
    [couple?.recoveryTriggers]
  );

  return (
    <section className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Deep insights</div>
          <div className="text-xs text-slate-600 mt-1">
            Patterns from the last {windowDays} days (best day, hardest day, dips, what helps).
          </div>
        </div>

        {data ? (
          <div className="flex items-center gap-2">
            <Badge>{data.cached ? "Cached" : "Fresh"}</Badge>
            <Badge>Window: {data.windowDays}d</Badge>
          </div>
        ) : null}
      </div>

      {loading && <div className="mt-4 text-sm text-slate-700">Loading…</div>}

      {!loading && proBlocked && (
        <div className="mt-4 rounded-lg border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">
            Pro feature: Deep insights
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Upgrade to view best/hardest day patterns, mid-week dips, and recovery triggers.
          </div>
          {onUpgrade ? (
            <button
              onClick={onUpgrade}
              className="mt-3 inline-flex items-center rounded-md bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Upgrade
            </button>
          ) : null}
        </div>
      )}

      {!loading && !proBlocked && err && (
        <div className="mt-4 text-sm text-red-600">{err}</div>
      )}

      {!loading && !proBlocked && !err && data?.insights && (
        <div className="mt-4 space-y-4">
          {/* Couple-level cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Best day"
              value={fmtDayStat(couple?.bestDay)}
              sub="Highest average day"
            />
            <Card
              title="Hardest day"
              value={fmtDayStat(couple?.hardestDay)}
              sub="Lowest average day"
            />
            <Card title="Mid-week dips" value={dipsFmt.value} sub={dipsFmt.sub} />
            <Card title="What helps (triggers)" value={triggersFmt.value} sub={triggersFmt.sub} />
          </div>

          {/* Per-partner mini cards */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Per-partner highlights
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {perPartner.map((p) => {
                const who = nameByUserId.get(p.userId) || "Partner";

                const dips = Array.isArray(p.midWeekDips) ? p.midWeekDips.length : 0;
                const trig = Array.isArray(p.recoveryTriggers) ? p.recoveryTriggers : [];

                const trigText =
                  trig.length > 0
                    ? trig
                        .slice()
                        .sort((a, b) => (b.hits ?? 0) - (a.hits ?? 0))
                        .slice(0, 3)
                        .map((t) => `${String(t.tag)} (${t.hits})`)
                        .join(" • ")
                    : "—";

                return (
                  <div key={p.userId} className="rounded-lg border bg-white p-3">
                    <div className="text-xs font-semibold text-slate-900">{who}</div>

                    <div className="mt-2 grid gap-2 grid-cols-2">
                      <Card title="Best" value={fmtDayStat(p.bestDay)} />
                      <Card title="Hardest" value={fmtDayStat(p.hardestDay)} />
                    </div>

                    <div className="mt-2 text-xs text-slate-600">
                      <span className="font-medium">Mid-week dips:</span>{" "}
                      {dips > 0 ? `${dips} detected` : "None detected"}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-medium">Triggers:</span> {trigText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
