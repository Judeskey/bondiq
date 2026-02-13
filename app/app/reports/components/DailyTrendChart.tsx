"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type DailyMetricPoint = {
  day: string; // ISO string
  connectionScore: number | null;
  stabilityScore: number | null;
};

type Props = {
  title?: string;
  timeZone?: string; // for nicer date labels (optional)
  metrics: DailyMetricPoint[];
  height?: number;
};

function formatDayLabel(iso: string, timeZone?: string) {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "America/Toronto",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(5, 10); // MM-DD
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clean(points: DailyMetricPoint[]) {
  const sorted = [...points].sort(
    (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
  );

  return sorted.map((p) => ({
    ...p,
    connectionScore:
      typeof p.connectionScore === "number"
        ? clamp(p.connectionScore, 0, 100)
        : null,
    stabilityScore:
      typeof p.stabilityScore === "number"
        ? clamp(p.stabilityScore, 0, 100)
        : null,
  }));
}

export default function DailyTrendChart({
  title = "Connection & Stability (Daily)",
  timeZone = "America/Toronto",
  metrics,
  height = 260,
}: Props) {
  const data = useMemo(() => clean(metrics || []), [metrics]);

  const hasAny =
    data.some((d) => typeof d.connectionScore === "number") ||
    data.some((d) => typeof d.stabilityScore === "number");

  if (!data.length || !hasAny) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        <div className="mt-2 text-sm text-neutral-600">
          No daily trend yet — once check-ins come in, you’ll see connection highs and
          lows here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>

        <div className="flex items-center gap-3 text-xs text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-900" />
            Connection
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-500" />
            Stability
          </span>
        </div>
      </div>

      <div className="mt-3" style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => formatDayLabel(String(v), timeZone)}
              tickMargin={8}
              minTickGap={12}
            />
            <YAxis domain={[0, 100]} tickMargin={8} width={32} />

            <Tooltip
              formatter={(value: any, name: any) => {
                if (value == null) return ["—", name];
                return [Math.round(Number(value)), name];
              }}
              labelFormatter={(label: any) => {
                const iso = String(label);
                const d = new Date(iso);
                try {
                  return new Intl.DateTimeFormat("en-CA", {
                    timeZone,
                    weekday: "short",
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  }).format(d);
                } catch {
                  return iso;
                }
              }}
            />

            {/* ✅ KEY FIX: connectNulls=true so the line draws across missing days */}
            <Line
              type="monotone"
              dataKey="connectionScore"
              name="Connection"
              strokeWidth={3}
              dot
              connectNulls={true}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="stabilityScore"
              name="Stability"
              strokeWidth={3}
              dot
              connectNulls={true}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-neutral-600">
        Connection reflects how close you both felt day-to-day. Stability reflects how
        aligned your emotional experience was.
      </div>
    </div>
  );
}
