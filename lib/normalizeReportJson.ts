import type { ReportJson } from "@/lib/reportSchema";

export function normalizeReportJson(input: any): any {
  const out = { ...input };

  // Example: legacy -> canonical
  if (out.trend && !out.trends) out.trends = out.trend;
  if (out.moodOrb && !out.moodSignals) out.moodSignals = out.moodOrb;

  // Make sure required blocks exist
  out.meta ??= { version: "v3.2", generatedAt: new Date().toISOString(), windowDays: 14 };

  return out;
}
