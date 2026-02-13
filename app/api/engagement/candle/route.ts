// app/api/engagement/candle/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function daysAgoUTC(days: number) {
  const d = startOfDayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Completeness based on: has text + has tags + rating exists
 * (Simple MVP scoring; you can refine later.)
 */
function completenessScoreFromCheckins(checkins: any[]) {
  if (!Array.isArray(checkins) || checkins.length === 0) return 0;

  // We focus on "today" checkins for completeness.
  let best = 0;

  for (const c of checkins) {
    const ratingOk = typeof c?.rating === "number" ? 1 : 0;
    const textOk = typeof c?.whatMadeMeFeelLoved === "string" && c.whatMadeMeFeelLoved.trim().length > 0 ? 1 : 0;
    const tagsOk = Array.isArray(c?.languageTags) && c.languageTags.length > 0 ? 1 : 0;

    // 0..100
    const score = Math.round(((ratingOk + textOk + tagsOk) / 3) * 100);
    best = Math.max(best, score);
  }

  return best;
}

function levelFor(score: number) {
  if (score >= 80) return "Bright";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Steady";
  if (score >= 20) return "Small flame";
  return "Ember";
}

export async function GET() {
  try {
    const { userId } = await requireUser();

    const coupleId = await getCoupleForUser(userId);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    // ✅ FIX 1: CoupleMember has joinedAt, not createdAt
    // ✅ FIX 2: CoupleMember has no label field; use related User data for display
    const members = await prisma.coupleMember.findMany({
      where: { coupleId },
      select: {
        userId: true,
        joinedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) return NextResponse.json({ ok: true, members: [] });

    const today = startOfDayUTC();
    const weekStart = daysAgoUTC(6); // last 7 days inclusive

    // Check-ins in last 7 days (for frequency)
    const weekCheckins = await prisma.checkIn.findMany({
      where: {
        coupleId,
        userId: { in: memberIds },
        createdAt: { gte: weekStart },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    // Today's check-ins (for completeness)
    const todaysCheckins = await prisma.checkIn.findMany({
      where: {
        coupleId,
        userId: { in: memberIds },
        createdAt: { gte: today },
      },
      select: {
        userId: true,
        rating: true,
        whatMadeMeFeelLoved: true,
        languageTags: true,
        createdAt: true,
      },
    });

    // Daily engagement today (seconds on report page etc.)
    // NOTE: assumes you created model DailyEngagement with fields like:
    // userId, day(DateTime), reportSeconds(Int)
    const engagementRows = await prisma.dailyEngagement.findMany({
      where: {
        userId: { in: memberIds },
        day: today,
      },
      select: {
        userId: true,
        reportViewSeconds: true,

      },
    });

    const engagementMap = new Map<string, number>();
    for (const r of engagementRows) engagementMap.set(r.userId, r.reportViewSeconds ?? 0);

    // Pre-group checkins by user
    const weekByUser = new Map<string, any[]>();
    for (const c of weekCheckins) {
      const arr = weekByUser.get(c.userId) ?? [];
      arr.push(c);
      weekByUser.set(c.userId, arr);
    }

    const todayByUser = new Map<string, any[]>();
    for (const c of todaysCheckins) {
      const arr = todayByUser.get(c.userId) ?? [];
      arr.push(c);
      todayByUser.set(c.userId, arr);
    }

    const out = members.map((m, idx) => {
      const userLabel =
        (typeof m.user?.name === "string" && m.user.name.trim()) ||
        (typeof m.user?.email === "string" && m.user.email.split("@")[0]) ||
        `Partner ${idx + 1}`;

      const week = weekByUser.get(m.userId) ?? [];
      const todayC = todayByUser.get(m.userId) ?? [];

      // frequency: days-with-checkin in last 7 days => 0..100
      const uniqueDays = new Set(
        week.map((x) => startOfDayUTC(new Date(x.createdAt)).toISOString())
      );
      const daysWithCheckin = uniqueDays.size; // 0..7
      const freqScore = Math.round((clamp(daysWithCheckin, 0, 7) / 7) * 100);

      // completeness today: 0..100
      const completeScore = completenessScoreFromCheckins(todayC);

      // engagement: cap at 600s (10 min) => 0..100
      const secs = engagementMap.get(m.userId) ?? 0;
      const engagementScore = clamp(Math.round((Math.min(600, secs) / 600) * 100), 0, 100);

      // weighted total
      const total = Math.round(0.6 * freqScore + 0.25 * completeScore + 0.15 * engagementScore);

      return {
        userId: m.userId,
        label: userLabel, // ✅ derived label (fixes TS error)
        score: clamp(total, 0, 100),
        level: levelFor(total),
        details: {
          daysWithCheckinLast7: daysWithCheckin,
          completenessToday: completeScore,
          reportSecondsToday: secs,
        },
      };
    });

    return NextResponse.json({ ok: true, members: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
