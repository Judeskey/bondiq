"use client";

import React, { useEffect, useMemo, useState } from "react";
import DailyTrendChart, { type DailyMetricPoint } from "./DailyTrendChart";

type TimelineResponse = {
  ok: boolean;
  coupleId?: string;
  timeZone?: string;
  planType?: "FREE" | "PREMIUM";
  days?: number;
  metrics?: Array<{
    day: string;
    connectionScore: number | null;
    stabilityScore: number | null;
    bondScore?: number | null;
    checkInCount?: number;
    avgRating?: number | null;
    topTags?: string[];
  }>;
  signals?: {
    me: any[];
    partner: any[];
    partnerVisible: boolean;
  };
  error?: string;
};

type Props = {
  /**
   * If provided, requests up to N days.
   * Server will clamp based on plan gating.
   */
  days?: number;

  /**
   * Optional title override.
   */
  title?: string;

  /**
   * What to render when daily data is unavailable (error OR empty).
   * Use this to keep your existing weekly plot.
   */
  fallback?: React.ReactNode;
};

function hasAnyChartData(metrics: DailyMetricPoint[]) {
  return (
    metrics.some((m) => typeof m.connectionScore === "number") ||
    metrics.some((m) => typeof m.stabilityScore === "number")
  );
}

export default function DailyTimelineBlock({
  days,
  title,
  fallback,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (typeof days === "number" && Number.isFinite(days)) p.set("days", String(days));
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [days]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/daily/timeline${qs}`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          cache: "no-store",
        });

        const data = (await res.json()) as TimelineResponse;

        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setResp(data || null);
          setError(data?.error || `Failed to load daily timeline (${res.status})`);
          return;
        }

        setResp(data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load daily timeline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  // Loading state (keeps page feeling production-ready)
  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="mt-3 h-[260px] w-full animate-pulse rounded bg-neutral-100" />
        <div className="mt-3 h-3 w-80 animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  // Error → fallback
  if (error) {
    return (
      <div className="space-y-3">
        {fallback ? fallback : null}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Daily trend couldn’t load right now. Showing the fallback view instead.
        </div>
      </div>
    );
  }

  const timeZone = resp?.timeZone || "America/Toronto";
  const metrics = (resp?.metrics || []).map((m) => ({
    day: m.day,
    connectionScore: m.connectionScore ?? null,
    stabilityScore: m.stabilityScore ?? null,
  })) as DailyMetricPoint[];

  // Empty → fallback
  if (!metrics.length || !hasAnyChartData(metrics)) {
    return (
      <div className="space-y-3">
        {fallback ? fallback : null}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          No daily trend yet — once more check-ins come in, you’ll see connection highs and lows here.
        </div>
      </div>
    );
  }

  return (
    <DailyTrendChart
      title={title || "Connection & Stability (Daily)"}
      timeZone={timeZone}
      metrics={metrics}
    />
  );
}
