// lib/patternDetection.ts
import { prisma } from "@/lib/db";

type DayPoint = {
  dayKey: string; // YYYY-MM-DD (UTC)
  dow: number; // 0..6 (Sun..Sat) UTC
  avg: number;
  count: number;
  tags: string[];
};

type Dip = {
  dayKey: string;
  dow: number;
  avg: number;
  baseline: number;
  delta: number; // avg - baseline (negative is dip)
};

function yyyyMmDdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function topTags(tags: string[], limit = 5) {
  const freq = new Map<string, number>();
  for (const t of tags) {
    const k = String(t || "").trim();
    if (!k) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, hits]) => ({ tag, hits }));
}

function buildDaySeries(rows: Array<{ userId: string; createdAt: Date; rating: number; languageTags: string[] }>) {
  const perUser: Record<
    string,
    Record<string, { ratings: number[]; tags: string[]; dow: number }>
  > = {};

  for (const r of rows) {
    const uid = r.userId;
    const dt = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
    if (Number.isNaN(dt.getTime())) continue;

    const dayKey = yyyyMmDdUTC(dt);
    const dow = dt.getUTCDay();

    const rating = Number(r.rating);
    if (!Number.isFinite(rating)) continue;

    perUser[uid] ||= {};
    perUser[uid][dayKey] ||= { ratings: [], tags: [], dow };
    perUser[uid][dayKey].ratings.push(rating);

    const tags = Array.isArray(r.languageTags) ? r.languageTags : [];
    perUser[uid][dayKey].tags.push(...tags.map((x) => String(x)));
  }

  const seriesByUser: Record<string, DayPoint[]> = {};
  for (const uid of Object.keys(perUser)) {
    const dayKeys = Object.keys(perUser[uid]).sort();
    seriesByUser[uid] = dayKeys.map((dayKey) => {
      const cell = perUser[uid][dayKey];
      const avg = mean(cell.ratings);
      return {
        dayKey,
        dow: cell.dow,
        avg: Math.round(avg * 100) / 100,
        count: cell.ratings.length,
        tags: cell.tags,
      };
    });
  }

  return seriesByUser;
}

function detectForUser(points: DayPoint[]) {
  const ratings = points.map((p) => p.avg);
  const baseline = ratings.length ? mean(ratings) : 0;

  const best = points.reduce<DayPoint | null>((acc, p) => {
    if (!acc) return p;
    return p.avg > acc.avg ? p : acc;
  }, null);

  const hardest = points.reduce<DayPoint | null>((acc, p) => {
    if (!acc) return p;
    return p.avg < acc.avg ? p : acc;
  }, null);

  // Mid-week dips: Tue(2), Wed(3), Thu(4)
  const DIP_THRESHOLD = 0.7;
  const midWeekDips: Dip[] = points
    .filter((p) => p.dow >= 2 && p.dow <= 4)
    .map((p) => {
      const delta = Math.round((p.avg - baseline) * 100) / 100;
      return {
        dayKey: p.dayKey,
        dow: p.dow,
        avg: p.avg,
        baseline: Math.round(baseline * 100) / 100,
        delta,
      };
    })
    .filter((d) => d.delta <= -DIP_THRESHOLD)
    .sort((a, b) => a.delta - b.delta);

  // Recovery triggers: count tags on first rebound day (>= +1.0 within 2 days)
  const REBOUND_MIN = 1.0;
  const REBOUND_WINDOW_DAYS = 2;

  const byDayKey = new Map(points.map((p) => [p.dayKey, p]));
  const sorted = [...points].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  const reboundTags: string[] = [];

  for (const dip of midWeekDips) {
    const dipPoint = byDayKey.get(dip.dayKey);
    if (!dipPoint) continue;

    const dipIndex = sorted.findIndex((p) => p.dayKey === dip.dayKey);
    if (dipIndex < 0) continue;

    for (let k = 1; k <= REBOUND_WINDOW_DAYS; k++) {
      const next = sorted[dipIndex + k];
      if (!next) continue;

      const rebound = next.avg - dipPoint.avg;
      if (rebound >= REBOUND_MIN) {
        reboundTags.push(...(next.tags || []));
        break;
      }
    }
  }

  return {
    stats: {
      daysCheckedIn: points.length,
      avg: Math.round(mean(ratings) * 100) / 100,
      volatility: Math.round(stddev(ratings) * 100) / 100,
    },
    bestDay: best ? { dayKey: best.dayKey, dow: best.dow, avg: best.avg } : null,
    hardestDay: hardest ? { dayKey: hardest.dayKey, dow: hardest.dow, avg: hardest.avg } : null,
    midWeekDips,
    recoveryTriggers: topTags(reboundTags, 6),
  };
}

export async function detectCouplePatterns(opts: { coupleId: string; windowDays?: number }) {
  const windowDays = clamp(Number(opts.windowDays ?? 28), 7, 90);
  const coupleId = opts.coupleId;

  const since = startOfDayUTC(new Date());
  since.setUTCDate(since.getUTCDate() - (windowDays - 1));

  const members = await prisma.coupleMember.findMany({
    where: { coupleId },
    select: { userId: true },
    orderBy: { joinedAt: "asc" },
  });
  const memberUserIds = members.map((m) => m.userId);

  const rows = await prisma.checkIn.findMany({
    where: { coupleId, createdAt: { gte: since } },
    select: {
      userId: true,
      createdAt: true,
      rating: true,
      languageTags: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const seriesByUser = buildDaySeries(
    rows.map((r) => ({
      userId: r.userId,
      createdAt: new Date(r.createdAt),
      rating: Number(r.rating),
      languageTags: Array.isArray(r.languageTags) ? r.languageTags.map(String) : [],
    }))
  );

  const perPartner = memberUserIds.map((uid) => {
    const points = seriesByUser[uid] || [];
    return { userId: uid, ...detectForUser(points) };
  });

  // Couple-level aggregate by dayKey
  const perDay: Record<string, number[]> = {};
  const perDayTags: Record<string, string[]> = {};

  for (const r of rows) {
    const dt = new Date(r.createdAt);
    if (Number.isNaN(dt.getTime())) continue;

    const dayKey = yyyyMmDdUTC(dt);
    const rating = Number(r.rating);
    if (!Number.isFinite(rating)) continue;

    perDay[dayKey] ||= [];
    perDay[dayKey].push(rating);

    const tags = Array.isArray(r.languageTags) ? r.languageTags.map(String) : [];
    perDayTags[dayKey] ||= [];
    perDayTags[dayKey].push(...tags);
  }

  const couplePoints: DayPoint[] = Object.keys(perDay)
    .sort()
    .map((dayKey) => {
      const d = new Date(dayKey + "T00:00:00.000Z");
      const avg = mean(perDay[dayKey]);
      return {
        dayKey,
        dow: d.getUTCDay(),
        avg: Math.round(avg * 100) / 100,
        count: perDay[dayKey].length,
        tags: perDayTags[dayKey] || [],
      };
    });

  const couple = detectForUser(couplePoints);

  return {
    coupleId,
    windowDays,
    since,
    couple,
    perPartner,
  };
}
