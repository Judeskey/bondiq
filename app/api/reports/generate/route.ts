// app/api/reports/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { generateNarrative } from "@/lib/aiNarrative";
import { dayKeyFromDate, addDays } from "@/lib/dayKey";
import { recomputeDailySeriesForCouple } from "@/lib/dailyAggregation";
import { buildPersonalizedNarratives } from "@/lib/narrativePersonalizer";
import type { ReportJson } from "@/lib/reportSchema";
import type { Prisma } from "@prisma/client";

// ✅ Your V3/V3.1 builder (keep)
import { buildV31Report } from "@/lib/reportV3";

// ✅ V2 helpers
import {
  buildPartnerSummary,
  distinctTopThemes,
  pickTone,
  mean,
  stddev,
  computeMomentum,
  computeAlignment,
  buildStory,
  buildCoupleInsights,
  type CheckInRow,
} from "@/lib/reportV2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Week start should follow couple settings.
 * reportDay: 0=Sunday ... 6=Saturday
 */
function startOfWeekForCouple(date: Date, reportDay: number) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const currentDay = d.getDay(); // 0=Sun..6=Sat
  const diff = (currentDay - reportDay + 7) % 7;

  d.setDate(d.getDate() - diff);
  return d;
}

function addDaysDate(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toLabel(x: any, fallback = "unknown") {
  if (!x) return fallback;
  if (typeof x === "string") return x;
  if (typeof x?.label === "string") return x.label;
  if (typeof x?.name === "string") return x.name;
  return fallback;
}

function uniqStrings(arr: any[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const s = typeof x === "string" ? x.trim() : "";
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function tagsFromCheckins(checkins: CheckInRow[]) {
  const counts = new Map<string, number>();
  for (const c of checkins) {
    const tags = Array.isArray(c.languageTags) ? c.languageTags : [];
    for (const t of tags) {
      const key = String(t);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function mostFrequentTag(tags: string[]) {
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function buildPartnerHighlights(checkins: CheckInRow[]) {
  if (checkins.length < 2) return [] as string[];

  const ratings = checkins
    .map((c) => Number(c.rating))
    .filter((n) => Number.isFinite(n));

  const avg = ratings.length ? round1(mean(ratings) ?? 0) : null;

  const ordered = [...checkins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const last = Number(ordered[0]?.rating);
  const prev = Number(ordered[1]?.rating);
  const delta =
    Number.isFinite(last) && Number.isFinite(prev) ? round1(last - prev) : null;

  const tagRank = tagsFromCheckins(checkins).map(String);
  const top1 = tagRank[0] ?? null;
  const top2 = tagRank[1] ?? null;

  const notes = uniqStrings(
    ordered
      .map((c) => (c as any).whatMadeMeFeelLoved)
      .filter((x) => typeof x === "string" && x.trim().length > 0) as any
  );

  const strongestNote = notes[0] ?? null;

  const bullets: string[] = [];

  if (avg != null) {
    bullets.push(`This week averaged **${avg}/5** — a snapshot of felt connection.`);
  }

  if (delta != null) {
    if (delta >= 0.5) {
      bullets.push(
        `The most recent check-in jumped **+${delta}** — the effort you’re making is being felt.`
      );
    } else if (delta <= -0.5) {
      bullets.push(
        `The most recent check-in dipped **${delta}** — not failure, just a signal to slow down and reconnect.`
      );
    } else {
      bullets.push(`Recent check-ins look **stable** — consistency is working.`);
    }
  }

  if (top1 && top2) {
    bullets.push(`The loudest needs showing up: **${top1}** and **${top2}**.`);
  } else if (top1) {
    bullets.push(`The loudest need showing up: **${top1}**.`);
  }

  if (strongestNote) {
    bullets.push(`One moment that mattered: “${strongestNote}”`);
  } else {
    const anchor = mostFrequentTag(tagRank) ?? "connection";
    bullets.push(`Even without notes, tags point to **${anchor}** as the main signal this week.`);
  }

  return bullets.slice(0, 3);
}

/** Removes UI artifacts like "_toggle" and upgrades challenge text. */
function cleanStepText(s: string) {
  return String(s ?? "")
    .replace(/[\s.]*_toggle\b/gi, "")
    .replace(/\s+toggle\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function upgradeTouchBonus(s: string) {
  return s.replace(
    /Bonus:\s*add\s*one\s*small\s*physical(?:-|\s)?touch\s*gesture\s*(?:on\s*day\s*3)?\.?/i,
    "Bonus: create frequent moments of warm, consensual physical touch — hugs, hand-holding, cuddling, or gentle touch that feels good for both of you."
  );
}

function upgradeHugLine(s: string) {
  return s.replace(
    /For\s*3\s*days,\s*do\s*at\s*least\s*one\s*20-second\s*hug\s*\(hello\s*or\s*goodbye\)\.?\s*/i,
    "For 3 days, do at least one 20-second hug when either of you is going out or coming back."
  );
}

/** Supports weeklyChallenge.steps being string[] OR object[] (text/label/title). */
function cleanWeeklyChallengeSteps(reportJson: any) {
  const steps = reportJson?.weeklyChallenge?.steps;
  if (!Array.isArray(steps)) return;

  reportJson.weeklyChallenge.steps = steps.map((step: any) => {
    if (typeof step === "string") {
      return upgradeTouchBonus(upgradeHugLine(cleanStepText(step)));
    }

    if (step && typeof step === "object") {
      const rawText =
        typeof step.text === "string"
          ? step.text
          : typeof step.label === "string"
          ? step.label
          : typeof step.title === "string"
          ? step.title
          : "";

      const cleaned = upgradeTouchBonus(upgradeHugLine(cleanStepText(rawText)));

      if (typeof step.text === "string") return { ...step, text: cleaned };
      if (typeof step.label === "string") return { ...step, label: cleaned };
      if (typeof step.title === "string") return { ...step, title: cleaned };

      return cleaned;
    }

    return step;
  });
}

/**
 * Habit score = how many distinct local-calendar days had at least one check-in.
 * 0->0, 1-2->1, 3->2, 4->3, 5->4, 6-7->5
 */
function computeHabitScore(thisWeek: CheckInRow[], timeZone: string) {
  const days = new Set<string>();

  for (const c of thisWeek) {
    const createdAt = (c as any)?.createdAt;

    const dt =
      createdAt instanceof Date
        ? createdAt
        : typeof createdAt === "string"
        ? new Date(createdAt)
        : new Date(String(createdAt ?? ""));

    if (Number.isNaN(dt.getTime())) continue;

    const dayKey = dayKeyFromDate(dt, timeZone);
    days.add(dayKey.toISOString());
  }

  const n = days.size;

  if (n <= 0) return 0;
  if (n <= 2) return 1;
  if (n === 3) return 2;
  if (n === 4) return 3;
  if (n === 5) return 4;
  return 5;
}

/**
 * Some builders accidentally set bondScore.breakdown to a STRING,
 * which makes "breakdown.habit = ..." crash.
 * This guarantees breakdown is an object and injects habit.
 */
function injectHabitIntoReportJson(reportJson: any, habitScore: number) {
  reportJson.habit = habitScore;

  if (!reportJson.bondScore || typeof reportJson.bondScore !== "object") {
    reportJson.bondScore = { value: null, max: 100, label: "This week", breakdown: {} };
  }

  const b = reportJson.bondScore as any;

  if (!b.breakdown || typeof b.breakdown !== "object" || Array.isArray(b.breakdown)) {
    b.breakdown = {};
  }

  b.breakdown.habit = habitScore;
}

/** ✅ Stage 7.3: build a stable “Compared to last week …” line */
function buildWeekComparisonMemoryLine(prevWeekAvg: number | null, thisWeekAvg: number | null) {
  const prev =
    typeof prevWeekAvg === "number" && Number.isFinite(prevWeekAvg) ? prevWeekAvg : null;
  const cur =
    typeof thisWeekAvg === "number" && Number.isFinite(thisWeekAvg) ? thisWeekAvg : null;

  if (cur == null && prev == null) return null;

  // First report / no previous week data
  if (prev == null && cur != null) {
    return `This is your **starting baseline** — connection averaged **${round1(cur)}/5**. Keep checking in to unlock week-over-week comparisons.`;
  }

  if (prev != null && cur == null) {
    return `Last week averaged **${round1(prev)}/5**. Add check-ins this week to see the comparison.`;
  }

  if (prev == null || cur == null) return null;

  const delta = Math.round((cur - prev) * 10) / 10;

  if (Math.abs(delta) < 0.2) {
    return `Compared to last week, things look **mostly steady** — consistency is doing work.`;
  }

  if (delta > 0) {
    return `Compared to last week, your connection looks **up +${delta}** on average — progress is showing.`;
  }

  return `Compared to last week, your connection looks **down ${delta}** on average — not failure, just a signal to slow down and reconnect.`;
}

export async function POST() {
  try {
    const { email } = await requireUser();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(user.id);
    if (!coupleId) {
      return NextResponse.json({ error: "No couple connected" }, { status: 400 });
    }

    // ✅ Use couple.reportDay + couple.timezone as SOURCE OF TRUTH
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { timezone: true, reportDay: true },
    });

    const timeZone = couple?.timezone || "America/Toronto";
    const reportDay = typeof couple?.reportDay === "number" ? couple.reportDay : 1; // fallback Monday

    const weekStart = startOfWeekForCouple(new Date(), reportDay);
    const prevWeekStart = startOfWeekForCouple(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      reportDay
    );

    // ✅ Use date windows (createdAt) so existing data still works even if weekStart storage differs
    const weekEndExclusive = addDaysDate(weekStart, 7);
    const prevWeekEndExclusive = addDaysDate(prevWeekStart, 7);

    // ✅ Stage 7.3: load last available report before this weekStart (robust across weekStart logic changes)
    const prevReportRow = await prisma.weeklyReport.findFirst({
      where: {
        coupleId,
        weekStart: { lt: weekStart },
      },
      orderBy: { weekStart: "desc" },
      select: { reportJson: true },
    });
    const previousReportJson = (prevReportRow?.reportJson ?? null) as any;

    const existingCount = await prisma.weeklyReport.count({ where: { coupleId } });

    // ✅ FIX: you have 4 tones, so modulo 4
    const toneIndex = existingCount % 4;

    const tone = pickTone(toneIndex);

    const toneLabel =
      typeof tone === "string"
        ? tone
        : typeof (tone as any)?.name === "string"
        ? (tone as any).name
        : "Clear & Grounded";

    const rawThisWeek = await prisma.checkIn.findMany({
      where: {
        coupleId,
        createdAt: {
          gte: weekStart,
          lt: weekEndExclusive,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        rating: true,
        whatMadeMeFeelLoved: true,
        languageTags: true,
        createdAt: true,
      },
    });

    const rawPrevWeek = await prisma.checkIn.findMany({
      where: {
        coupleId,
        createdAt: {
          gte: prevWeekStart,
          lt: prevWeekEndExclusive,
        },
      },
      select: { rating: true },
    });

    const thisWeek: CheckInRow[] = rawThisWeek.map((r) => ({
      userId: r.userId,
      rating: r.rating,
      whatMadeMeFeelLoved: r.whatMadeMeFeelLoved,
      languageTags: (r.languageTags ?? []) as any,
      createdAt: r.createdAt,
    }));

    const byUser = new Map<string, CheckInRow[]>();
    for (const c of thisWeek) {
      const arr = byUser.get(c.userId) ?? [];
      arr.push(c);
      byUser.set(c.userId, arr);
    }

    const members = await prisma.coupleMember.findMany({
      where: { coupleId },
      select: { userId: true, user: { select: { name: true, email: true } } },
    });

    const displayNameByUserId = new Map(
      members.map((m) => [m.userId, (m.user?.name || m.user?.email || "").trim()])
    );

    const partnerSummaries = [...byUser.entries()].map(([userId, checkins]) => {
      const base: any = buildPartnerSummary({
        userId,
        checkins,
        tone: toneLabel,
      });

      const notes = uniqStrings(
        checkins.map((c) => (c as any).whatMadeMeFeelLoved).filter(Boolean) as any
      );
      const tagRank = tagsFromCheckins(checkins);

      if (!Array.isArray(base.whatPartnerLoved) || base.whatPartnerLoved.length === 0) {
        base.whatPartnerLoved = notes.slice(0, 3);
      }

      if (!Array.isArray(base.topReceivedTags) || base.topReceivedTags.length === 0) {
        base.topReceivedTags = tagRank.slice(0, 3);
      }

      base.checkinCount = checkins.length;
      base.displayName = displayNameByUserId.get(userId) || "";

      const highlights = buildPartnerHighlights(checkins);
      base.highlights = highlights.length > 0 ? highlights : [];

      return base;
    });

    const ratingsThisWeek = thisWeek
      .map((c) => Number(c.rating))
      .filter((n) => Number.isFinite(n));

    // ✅ Avoid forcing 0 when there are no check-ins (lets UI show a neutral state)
    const connectionScore =
      ratingsThisWeek.length > 0 ? (mean(ratingsThisWeek) ?? 0) : null;

    const stability =
      ratingsThisWeek.length >= 2 ? stddev(ratingsThisWeek) : null;

    const topThemes = distinctTopThemes(partnerSummaries, 2);

    // ✅ IMPORTANT: store these explicitly for UI + SQL
    const prevAvgRaw = mean(rawPrevWeek.map((r) => r.rating));
    const thisAvgRaw = mean(thisWeek.map((c) => c.rating));

    const prevAvg =
      typeof prevAvgRaw === "number" && Number.isFinite(prevAvgRaw) ? prevAvgRaw : null;
    const thisAvg =
      typeof thisAvgRaw === "number" && Number.isFinite(thisAvgRaw) ? thisAvgRaw : null;

    // Normal week-over-week momentum
    let momentum = computeMomentum(thisAvgRaw, prevAvgRaw);

    // ✅ Fallback when no previous week exists
    if (momentum === "unknown") {
      const ordered = [...thisWeek].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const last = Number(ordered[ordered.length - 1]?.rating);
      const prev = Number(ordered[ordered.length - 2]?.rating);

      if (Number.isFinite(last) && Number.isFinite(prev)) {
        const diff = last - prev;

        if (diff >= 0.5) momentum = "up";
        else if (diff <= -0.5) momentum = "down";
        else momentum = "flat";
      } else {
        momentum = "flat";
      }
    }

    const alignmentRaw = computeAlignment(partnerSummaries.map((p) => p.avgRating));
    const alignmentScore = typeof alignmentRaw === "number" ? alignmentRaw : null;
    const alignmentLabel = typeof alignmentRaw === "string" ? alignmentRaw : "unknown";

    const fallbackStory = (buildStory as any)({
      tone: toneLabel,
      climateScore: typeof connectionScore === "number" ? connectionScore : 0,
      connectionScore: typeof connectionScore === "number" ? connectionScore : 0,
      stability: typeof stability === "number" ? stability : 0,
      momentum,
      alignmentScore,
      alignmentLabel,
      themes: topThemes,
      topThemes,
      partnerSummaries,
      thisWeek,
      prevWeekAvg: prevAvgRaw,
    });

    // ✅ AI narrative expects a number, so pass 0 safely when no check-ins yet
    const narrativeConnectionScore =
      typeof connectionScore === "number" ? connectionScore : 0;

    const aiStory = await generateNarrative({
      connectionScore: narrativeConnectionScore,
      momentumLabel: toLabel(momentum, "unknown"),
      alignmentLabel: alignmentLabel ?? "unknown",
      topThemes: Array.isArray(topThemes) ? topThemes.map(String) : [],
      sampleNotes: Array.isArray(thisWeek)
        ? thisWeek
            .map((c: any) => c?.whatMadeMeFeelLoved)
            .filter((x: any) => typeof x === "string" && x.trim().length > 0)
            .slice(0, 3)
        : [],
    });

    const story =
      aiStory && typeof aiStory === "string" && aiStory.trim().length > 0
        ? aiStory
        : typeof fallbackStory === "string"
        ? fallbackStory
        : String(fallbackStory ?? "");

    const coupleInsights = buildCoupleInsights({
      themes: topThemes,
      climateScore: narrativeConnectionScore,
      stability: typeof stability === "number" ? stability : 0,
      momentum,
      tone: toneLabel as any,
    } as any);

    const loveProfiles = await prisma.loveProfile.findMany({
      where: { coupleId },
      select: {
        userId: true,
        primaryLanguage: true,
        secondaryLanguage: true,
        avoidList: true,
        expressionStyle: true,
        completedAt: true,
      },
    });

    const reportJson = buildV31Report({
      weekStartISO: weekStart.toISOString(),
      toneIndex,
      tone,
      viewerUserId: user.id,
      thisWeek,
      prevWeekAvg: prevAvgRaw,
      partnerSummaries,
      topThemes,
      connectionScore: narrativeConnectionScore, // builder expects number; keep stable
      stability: typeof stability === "number" ? stability : 0,
      momentum,
      alignmentScore,
      alignmentLabel,
      story,
      coupleInsights,
      loveProfiles: (loveProfiles as any) ?? [],
    }) as unknown as ReportJson;

    // ✅ Persist week averages explicitly so UI + SQL can read them
    (reportJson as any).prevWeekAvg = prevAvg;
    (reportJson as any).thisWeekAvg = thisAvg;

    // ✅ Stage 7.2 + 7.3 — Personalized Narrative Injection + Narrative Memory
    try {
      const loveProfileByUserId: Record<string, { primary?: string; secondary?: string }> = {};

      for (const lp of loveProfiles ?? []) {
        loveProfileByUserId[lp.userId] = {
          primary: lp.primaryLanguage ?? undefined,
          secondary: lp.secondaryLanguage ?? undefined,
        };
      }

      const personalized = buildPersonalizedNarratives({
        coupleId,
        windowDays: 7,
        checkIns: thisWeek.map((c) => ({
          userId: c.userId,
          rating: c.rating,
          languageTags: Array.isArray(c.languageTags) ? c.languageTags : [],
          note: (c as any).whatMadeMeFeelLoved ?? null,
          createdAt: c.createdAt ? String(c.createdAt) : undefined,
        })),
        insights: coupleInsights ?? {},
        emotionStates: [], // safe default for now
        loveProfileByUserId,
        previousReportJson, // ✅ Stage 7.3
      });

      // ✅ Guarantee memoryLine exists (even if personalizer didn't set it)
      if (!personalized.overall) personalized.overall = {} as any;
      if (!(personalized.overall as any).memoryLine) {
        (personalized.overall as any).memoryLine = buildWeekComparisonMemoryLine(prevAvg, thisAvg);
      }

      (reportJson as any).narrative = personalized;
    } catch (err) {
      console.warn("[reports/generate] narrative build failed:", err);
    }

    // ✅ Keep your step cleaning
    cleanWeeklyChallengeSteps(reportJson);

    // ✅ Habit injection (robust)
    const habitScore = computeHabitScore(thisWeek, timeZone);
    injectHabitIntoReportJson(reportJson, habitScore);

    // ✅ Prisma Json typing (prevents TS errors)
    const reportJsonForDb = reportJson as unknown as Prisma.InputJsonValue;

    const report = await prisma.weeklyReport.upsert({
      where: { coupleId_weekStart: { coupleId, weekStart } },
      create: { coupleId, weekStart, toneIndex, reportJson: reportJsonForDb },
      update: { toneIndex, reportJson: reportJsonForDb },
      select: {
        id: true,
        coupleId: true,
        weekStart: true,
        toneIndex: true,
        reportJson: true,
      },
    });

    for (const p of partnerSummaries) {
      await prisma.weeklyReportForUser.upsert({
        where: { reportId_userId: { reportId: report.id, userId: p.userId } },
        create: { reportId: report.id, userId: p.userId, sectionsJson: p as any },
        update: { sectionsJson: p as any },
      });
    }

    // ✅ Persist daily timeline metrics + partner emotion signals for charts/insights
    try {
      const todayKey = dayKeyFromDate(new Date(), timeZone);

      // Store 30 days by default (Premium can request up to 90 when reading)
      const startDayKey = addDays(todayKey, -(30 - 1));
      const endDayKeyExclusive = addDays(todayKey, 1);

      await recomputeDailySeriesForCouple({
        coupleId,
        timeZone,
        startDayKey,
        endDayKeyExclusive,
      });
    } catch (err) {
      console.error("[reports/generate] daily recompute failed:", err);
    }

    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}
