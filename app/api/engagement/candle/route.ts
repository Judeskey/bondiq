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

function clean(s: any) {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Abbreviate email like:
 *   jude.okoye@example.com -> jude…@example.com
 *   ab@x.com -> ab@x.com
 */
function abbreviateEmail(email: string) {
  const e = clean(email);
  const at = e.indexOf("@");
  if (at <= 0) return e || "";

  const local = e.slice(0, at);
  const domain = e.slice(at + 1);

  if (!domain) return e;

  if (local.length <= 3) return `${local}@${domain}`;

  const head = local.slice(0, 4);
  return `${head}…@${domain}`;
}

/**
 * Label preference:
 * 1) nickname (viewer-specific PartnerAlias)
 * 2) user.name
 * 3) abbreviated email
 * 4) Partner X
 */
function computeLabel(args: {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
  fallback: string;
}) {
  const nick = clean(args.nickname);
  if (nick) return nick;

  const name = clean(args.name);
  if (name) return name;

  const email = clean(args.email);
  if (email) {
    const ab = abbreviateEmail(email);
    if (ab) return ab;
  }

  return args.fallback;
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
    const textOk =
      typeof c?.whatMadeMeFeelLoved === "string" && c.whatMadeMeFeelLoved.trim().length > 0
        ? 1
        : 0;
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

    // ✅ Pull viewer-specific nicknames for these members
    // ownerUserId = viewer (current user), targetUserId = the person being displayed
    const aliases = await prisma.partnerAlias.findMany({
      where: {
        coupleId,
        ownerUserId: userId,
        targetUserId: { in: memberIds },
      },
      select: { targetUserId: true, nickname: true },
    });

    const nicknameByTarget = new Map<string, string>();
    for (const a of aliases) {
      const nick = clean(a.nickname);
      if (nick) nicknameByTarget.set(a.targetUserId, nick);
    }

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

    // Daily engagement today
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
      const nickname = nicknameByTarget.get(m.userId) || null;

      const userLabel = computeLabel({
        nickname,
        name: m.user?.name ?? null,
        email: m.user?.email ?? null,
        fallback: `Partner ${idx + 1}`,
      });

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
        label: userLabel, // ✅ nickname -> name -> abbreviated email -> Partner X
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
