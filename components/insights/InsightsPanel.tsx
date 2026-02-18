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

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bond-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-700">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
          {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
        </div>
        {icon ? (
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/70 p-2 text-slate-700 shadow-sm">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatTriggers(triggers?: Trigger[] | null, limit = 3) {
  const arr = Array.isArray(triggers) ? triggers : [];
  if (!arr.length)
    return {
      value: "Not enough signal",
      sub: "Add a few more check-ins to learn recovery triggers",
    };

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

function fmtAvg(n?: number) {
  if (!Number.isFinite(n as any)) return "—";
  return (n as number).toFixed(1);
}

function fmtVol(n?: number) {
  if (!Number.isFinite(n as any)) return "—";
  const v = n as number;
  return v.toFixed(2);
}

function TinyIcon({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center">{children}</span>;
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

  function gaEvent(name: string, params?: Record<string, any>) {
    if (typeof window === "undefined") return;
    const gtag = (window as any).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", name, params || {});
  }

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

            // ✅ Track Pro lock trigger (insights API blocked)
            gaEvent("pro_feature_blocked", {
              feature: "deep_insights",
              location: "reports_insights_panel",
              window_days: windowDays,
              status: res.status,
            });

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

  // ✅ Track when the locked panel is shown (once per mount / change)
  useEffect(() => {
    if (!loading && proBlocked) {
      gaEvent("pro_lock_shown", {
        feature: "deep_insights",
        location: "reports_insights_panel",
        window_days: windowDays,
      });
    }
  }, [loading, proBlocked, windowDays]);

  const couple = data?.insights?.couple;
  const perPartner = data?.insights?.perPartner ?? [];

  const dipsFmt = useMemo(() => formatDips(couple?.midWeekDips), [couple?.midWeekDips]);
  const triggersFmt = useMemo(
    () => formatTriggers(couple?.recoveryTriggers),
    [couple?.recoveryTriggers]
  );

  const coupleStats = couple?.stats;

  const freshnessLabel = useMemo(() => {
    if (!data) return null;
    if (!data.cached) return "Fresh";
    if (data.cachedAt) return `Cached • ${new Date(data.cachedAt).toLocaleString()}`;
    return "Cached";
  }, [data]);

  return (
    <section className="bond-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900">Deep insights</div>
            <span className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
              Last {windowDays} days
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Best day, hardest day, mid-week dips, and what helps you recover.
          </div>
        </div>

        {data ? (
          <div className="flex items-center gap-2">
            <Badge>{freshnessLabel || (data.cached ? "Cached" : "Fresh")}</Badge>
            {Number.isFinite(data.ttlSeconds as any) ? <Badge>TTL: {data.ttlSeconds}s</Badge> : null}
          </div>
        ) : null}
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/60 p-4">
          <div className="text-sm font-semibold text-slate-900">Loading insights…</div>
          <div className="mt-1 text-xs text-slate-600">Gathering patterns from recent check-ins.</div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 w-1/3 rounded-full bg-slate-200" />
          </div>
        </div>
      )}

      {!loading && proBlocked && (
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Pro feature: Deep insights</div>
              <div className="mt-1 text-xs text-slate-600">
                Upgrade to view best/hardest day patterns, mid-week dips, and recovery triggers.
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  📈 Best & hardest day
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  🫧 Mid-week dips
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  💛 Recovery triggers
                </span>
              </div>

              {onUpgrade ? (
                <button
                  onClick={() => {
                    // ✅ Track upgrade click (does NOT change behavior)
                    gaEvent("upgrade_click", {
                      location: "reports_insights_panel_lock",
                      feature: "deep_insights",
                      window_days: windowDays,
                    });

                    onUpgrade();
                  }}
                  className="bond-btn bond-btn-primary mt-4"
                >
                  Upgrade
                </button>
              ) : null}
            </div>

            <div className="shrink-0 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <div className="text-xs font-semibold text-slate-600">Status</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">Locked</div>
              <div className="mt-1 text-xs text-slate-500">Pro required</div>
            </div>
          </div>
        </div>
      )}

      {!loading && !proBlocked && err && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-900">Couldn’t load deep insights</div>
          <div className="mt-1 text-xs text-rose-800">{err}</div>
        </div>
      )}

      {!loading && !proBlocked && !err && data?.insights && (
        <div className="mt-4 space-y-4">
          {/* couple stats row */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="Days checked in" value={String(coupleStats?.daysCheckedIn ?? "—")} />
            <StatPill label="Average" value={fmtAvg(coupleStats?.avg)} />
            <StatPill label="Volatility" value={fmtVol(coupleStats?.volatility)} />
          </div>

          {/* Couple-level cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Best day"
              value={fmtDayStat(couple?.bestDay)}
              sub="Highest average day"
              icon={<TinyIcon>🏆</TinyIcon>}
            />
            <Card
              title="Hardest day"
              value={fmtDayStat(couple?.hardestDay)}
              sub="Lowest average day"
              icon={<TinyIcon>🫧</TinyIcon>}
            />
            <Card
              title="Mid-week dips"
              value={dipsFmt.value}
              sub={dipsFmt.sub}
              icon={<TinyIcon>📉</TinyIcon>}
            />
            <Card
              title="What helps (triggers)"
              value={triggersFmt.value}
              sub={triggersFmt.sub}
              icon={<TinyIcon>💛</TinyIcon>}
            />
          </div>

          {/* Per-partner highlights */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-700">Per-partner highlights</div>
              <div className="text-[11px] text-slate-500">
                Personal patterns may differ — this helps you compare gently.
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                  <div key={p.userId} className="bond-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{who}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge>Avg {fmtAvg(p.stats?.avg)}</Badge>
                          <Badge>Vol {fmtVol(p.stats?.volatility)}</Badge>
                          <Badge>{p.stats?.daysCheckedIn ?? 0} check-in(s)</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/70 p-2 text-slate-700 shadow-sm">
                        <TinyIcon>👤</TinyIcon>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 grid-cols-2">
                      <Card title="Best" value={fmtDayStat(p.bestDay)} />
                      <Card title="Hardest" value={fmtDayStat(p.hardestDay)} />
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Mid-week dips:</span>{" "}
                      {dips > 0 ? `${dips} detected` : "None detected"}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Triggers:</span> {trigText}
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
