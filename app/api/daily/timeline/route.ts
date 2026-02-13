import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { gateFeatureByEmail } from "@/lib/gating";
import { FEATURES } from "@/lib/features";
import { dayKeyFromDate, addDays } from "@/lib/dayKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/daily/timeline?days=30
 *
 * FREE:
 *  - forced to 7 days
 *
 * PREMIUM:
 *  - default 30
 *  - allow up to 90 via ?days=90
 *
 * Response includes:
 *  - daily metrics (couple-level)
 *  - emotion signals (self always; partner only if premium + sharing)
 */
export async function GET(req: Request) {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ ok: false, error: "No couple found" }, { status: 404 });

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { timezone: true },
    });
    const timeZone = couple?.timezone || "America/Toronto";

    // Gate: how many days are allowed?
    const gate = await gateFeatureByEmail(email, FEATURES.DAILY_TIMELINE_DAYS);
    const limits = gate.limits || {};
    const daysDefault = Number(limits.daysDefault ?? 7);
    const daysMax = Number(limits.daysMax ?? 7);

    const url = new URL(req.url);
    const requestedDaysRaw = url.searchParams.get("days");
    const requestedDays = requestedDaysRaw ? Number(requestedDaysRaw) : daysDefault;

    const safeRequested = Number.isFinite(requestedDays) ? requestedDays : daysDefault;
    const days = Math.max(1, Math.min(daysMax, Math.floor(safeRequested)));

    // Build day-key range in couple timezone (UTC midnight keys representing local days)
    const todayKey = dayKeyFromDate(new Date(), timeZone);
    const startDayKey = addDays(todayKey, -(days - 1));
    const endDayKeyExclusive = addDays(todayKey, 1);

    // Fetch daily metrics
    const metrics = await prisma.dailyCoupleMetric.findMany({
      where: {
        coupleId,
        day: { gte: startDayKey, lt: endDayKeyExclusive },
      },
      select: {
        day: true,
        bondScore: true,
        connectionScore: true,
        stabilityScore: true,
        checkInCount: true,
        avgRating: true,
        topTags: true,
      },
      orderBy: { day: "asc" },
    });

    // Determine partner id (2-person couple expected)
    const members = await prisma.coupleMember.findMany({
      where: { coupleId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    const partnerId = memberIds.find((id) => id !== me.id) || null;

    // Emotion sharing is premium-only feature
    const shareGate = await gateFeatureByEmail(email, FEATURES.EMOTION_SIGNAL_SHARING);
    const canSeePartnerSignals = shareGate.allowed;

    // Always return self signals (if any)
    const mySignals = await prisma.partnerEmotionSignal.findMany({
      where: {
        coupleId,
        userId: me.id,
        day: { gte: startDayKey, lt: endDayKeyExclusive },
      },
      select: {
        day: true,
        state: true,
        intensity: true,
        reasonCode: true,
        note: true,
      },
      orderBy: { day: "asc" },
    });

    // Partner signals only if allowed
    const partnerSignals =
      canSeePartnerSignals && partnerId
        ? await prisma.partnerEmotionSignal.findMany({
            where: {
              coupleId,
              userId: partnerId,
              day: { gte: startDayKey, lt: endDayKeyExclusive },
            },
            select: {
              day: true,
              state: true,
              intensity: true,
              reasonCode: true,
              note: true,
            },
            orderBy: { day: "asc" },
          })
        : [];

    return NextResponse.json({
      ok: true,
      coupleId,
      timeZone,
      planType: gate.planType,
      days,
      range: {
        startDayKey: startDayKey.toISOString(),
        endDayKeyExclusive: endDayKeyExclusive.toISOString(),
      },
      metrics: metrics.map((m) => ({
        day: m.day.toISOString(),
        bondScore: m.bondScore,
        connectionScore: m.connectionScore,
        stabilityScore: m.stabilityScore,
        checkInCount: m.checkInCount,
        avgRating: m.avgRating,
        topTags: m.topTags,
      })),
      signals: {
        me: mySignals.map((s) => ({ ...s, day: s.day.toISOString() })),
        partner: partnerSignals.map((s) => ({ ...s, day: s.day.toISOString() })),
        partnerVisible: canSeePartnerSignals,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
