// lib/insightsCache.ts
import { prisma } from "@/lib/db";

function yyyyMmDdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getCachedInsights(params: {
  coupleId: string;
  windowDays: number;
}) {
  const dayKey = yyyyMmDdUTC(new Date());

  const row = await prisma.coupleInsightsCache.findUnique({
    where: {
      coupleId_dayKey_windowDays: {
        coupleId: params.coupleId,
        dayKey,
        windowDays: params.windowDays,
      },
    },
    select: { payload: true },
  });

  return row?.payload ?? null;
}

export async function upsertCachedInsights(params: {
  coupleId: string;
  windowDays: number;
  payload: any;
}) {
  const dayKey = yyyyMmDdUTC(new Date());

  await prisma.coupleInsightsCache.upsert({
    where: {
      coupleId_dayKey_windowDays: {
        coupleId: params.coupleId,
        dayKey,
        windowDays: params.windowDays,
      },
    },
    create: {
      coupleId: params.coupleId,
      dayKey,
      windowDays: params.windowDays,
      payload: params.payload,
    },
    update: {
      payload: params.payload,
    },
  });
}
