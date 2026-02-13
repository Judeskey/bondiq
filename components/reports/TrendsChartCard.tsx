"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = {
  weekStart: string;
  weekLabel: string;
  connectionScore: number | null;
  stability: number | null;
  checkinsCount: number;
};

type Props = {
  points: TrendPoint[];
};

export default function TrendsChartCard({ points }: Props) {
  const safePoints = Array.isArray(points) ? points : [];

  const weeksWithData = safePoints.filter((p) => (p?.checkinsCount ?? 0) > 0).length;
  const hasAnyData = weeksWithData > 0;
  const showBuildMessage = weeksWithData < 2;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-2">
        <div className="text-lg font-semibold">Trends</div>
        <div className="text-sm text-gray-600">
          <b>Connection</b> = your weekly average rating (1–5).{" "}
          <b>Stability</b> = how consistent the week felt.
          <span className="text-gray-500"> Lower = more consistent (less up-and-down).</span>
        </div>
      </div>

      {showBuildMessage && (
        <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
          Trends get meaningful after <b>2+ weeks</b> of check-ins. Keep checking in weekly to see your
          story unfold.
        </div>
      )}

      {!hasAnyData ? (
        <div className="mt-4 rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
          No check-ins found in this period yet. Once you add weekly check-ins, your trends will appear here.
        </div>
      ) : (
        <div className="mt-4 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safePoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />

              {/* trend lines */}
              <Line
                type="monotone"
                dataKey="connectionScore"
                name="Connection"
                dot
                connectNulls
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="stability"
                name="Stability (consistency)"
                dot
                connectNulls
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        Tip: If Stability is high (more up-and-down), try one small consistent action each day instead of one big effort.
      </div>
    </div>
  );
}
