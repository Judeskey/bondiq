// lib/dailyAggregation.ts
import { prisma } from "@/lib/db";
import { dayKeyFromDate, addDays } from "@/lib/dayKey";
import { EmotionState } from "@prisma/client";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundInt(n: number) {
  return Math.round(n);
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mostCommonTags(tags: string[], max = 3) {
  if (!tags.length) return [];
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}

function emotionFromAvgRating(avgRating: number): { state: EmotionState; intensity: number } {
  // rating expected ~1..5
  if (avgRating >= 4.7) return { state: EmotionState.THRIVING, intensity: 88 };
  if (avgRating >= 4.0) return { state: EmotionState.GOOD, intensity: 72 };
  if (avgRating >= 3.0) return { state: EmotionState.NEUTRAL, intensity: 50 };
  if (avgRating >= 2.0) return { state: EmotionState.STRESSED, intensity: 72 };
  return { state: EmotionState.DISCONNECTED, intensity: 88 };
}

/**
 * Recompute daily metrics + emotion signals for a couple over a date range.
 *
 * Range is specified in "day keys" (UTC midnights representing local days).
 * Example: startDayKey = 2026-02-01T00:00Z, endDayKeyExclusive = 2026-03-01T00:00Z
 */
export async function recomputeDailySeriesForCouple(params: {
  coupleId: string;
  timeZone: string;
  startDayKey: Date;
  endDayKeyExclusive: Date;
}) {
  const { coupleId, timeZone, startDayKey, endDayKeyExclusive } = params;

  // Fetch check-ins by createdAt window that covers the day-key range.
  // (We compute dayKey per row using couple timezone.)
  const startReal = startDayKey; // ok to use directly; dayKey is UTC midnight
  const endReal = endDayKeyExclusive;

  const checkins = await prisma.checkIn.findMany({
    where: {
      coupleId,
      createdAt: { gte: startReal, lt: endReal },
    },
    select: {
      id: true,
      userId: true,
      rating: true,
      languageTags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Members so we know both partner IDs (for stability calc and signal coverage)
  const members = await prisma.coupleMember.findMany({
    where: { coupleId },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);

  // Group: dayKey -> { userId -> ratings[], tags[] }
  const dayMap = new Map<
    string,
    {
      dayKey: Date;
      perUser: Map<string, { ratings: number[]; tags: string[] }>;
      allTags: string[];
    }
  >();

  for (const c of checkins) {
    const dk = dayKeyFromDate(new Date(c.createdAt), timeZone);
    const key = dk.toISOString();

    if (!dayMap.has(key)) {
      dayMap.set(key, {
        dayKey: dk,
        perUser: new Map(),
        allTags: [],
      });
    }

    const bucket = dayMap.get(key)!;

    if (!bucket.perUser.has(c.userId)) {
      bucket.perUser.set(c.userId, { ratings: [], tags: [] });
    }

    bucket.perUser.get(c.userId)!.ratings.push(c.rating);
    bucket.perUser.get(c.userId)!.tags.push(...(c.languageTags || []));
    bucket.allTags.push(...(c.languageTags || []));
  }

  // Iterate over every day in range (even if no checkins) to keep chart continuous.
  let cursor = new Date(startDayKey);
  let metricsUpserts = 0;
  let signalUpserts = 0;

  while (cursor.getTime() < endDayKeyExclusive.getTime()) {
    const key = cursor.toISOString();
    const bucket = dayMap.get(key);

    const allRatings: number[] = [];
    const allTags: string[] = [];

    const perUserAvg = new Map<string, number>(); // userId -> avgRating

    if (bucket) {
      allTags.push(...bucket.allTags);

      for (const [uid, data] of bucket.perUser.entries()) {
        const a = avg(data.ratings);
        if (a != null) {
          perUserAvg.set(uid, a);
          allRatings.push(...data.ratings);
        }
      }
    }

    const avgRating = avg(allRatings);
    const checkInCount = bucket ? allRatings.length : 0;
    const topTags = mostCommonTags(allTags, 3);

    // Connection score: map avg rating 1..5 -> 20..100
    const connectionScore =
      avgRating == null ? null : clamp(roundInt(avgRating * 20), 0, 100);

    // Stability score: if both partners have data, reward closeness of ratings.
    // If only one partner checked in, keep a neutral baseline to avoid shaming.
    let stabilityScore: number | null = null;
    if (perUserAvg.size >= 2) {
      // take first two members present (usually 2-person couple)
      const vals = [...perUserAvg.values()];
      const diff = Math.abs(vals[0] - vals[1]); // 0..4
      stabilityScore = clamp(100 - roundInt(diff * 20), 0, 100);
    } else if (perUserAvg.size === 1) {
      stabilityScore = 70;
    } else {
      stabilityScore = null;
    }

    // Bond score: average of available scores
    let bondScore: number | null = null;
    if (connectionScore != null && stabilityScore != null) {
      bondScore = roundInt((connectionScore + stabilityScore) / 2);
    } else if (connectionScore != null) {
      bondScore = connectionScore;
    } else if (stabilityScore != null) {
      bondScore = stabilityScore;
    } else {
      bondScore = null;
    }

    // Upsert daily couple metric
    await prisma.dailyCoupleMetric.upsert({
      where: { coupleId_day: { coupleId, day: cursor } },
      update: {
        bondScore,
        connectionScore,
        stabilityScore,
        checkInCount,
        avgRating,
        topTags,
      },
      create: {
        coupleId,
        day: cursor,
        bondScore,
        connectionScore,
        stabilityScore,
        checkInCount,
        avgRating,
        topTags,
      },
    });
    metricsUpserts++;

    // Upsert emotion signals per user for that day if they have checkins
    for (const uid of memberIds) {
      const a = perUserAvg.get(uid);
      if (a == null) continue;

      const emo = emotionFromAvgRating(a);

      await prisma.partnerEmotionSignal.upsert({
        where: { coupleId_userId_day: { coupleId, userId: uid, day: cursor } },
        update: {
          state: emo.state,
          intensity: emo.intensity,
          reasonCode: "DAILY_CHECKIN",
          note: null,
        },
        create: {
          coupleId,
          userId: uid,
          day: cursor,
          state: emo.state,
          intensity: emo.intensity,
          reasonCode: "DAILY_CHECKIN",
          note: null,
        },
      });
      signalUpserts++;
    }

    cursor = addDays(cursor, 1);
  }

  return {
    coupleId,
    startDayKey: startDayKey.toISOString(),
    endDayKeyExclusive: endDayKeyExclusive.toISOString(),
    metricsUpserts,
    signalUpserts,
  };
}
