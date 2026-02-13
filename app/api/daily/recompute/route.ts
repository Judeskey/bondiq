import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { dayKeyFromDate, addDays } from "@/lib/dayKey";
import { recomputeDailySeriesForCouple } from "@/lib/dailyAggregation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/daily/recompute
 * Body (optional):
 *  { "days": 30 }
 *
 * Recomputes daily metrics + emotion signals for the last N days including today (by couple timezone).
 */
export async function POST(req: Request) {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "No couple found" }, { status: 404 });

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { timezone: true },
    });
    const timeZone = couple?.timezone || "America/Toronto";

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const days = Number(body?.days ?? 30);
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(365, days)) : 30;

    // Build day-key range in couple timezone
    const now = new Date();
    const todayKey = dayKeyFromDate(now, timeZone);
    const startDayKey = addDays(todayKey, -(safeDays - 1));
    const endDayKeyExclusive = addDays(todayKey, 1);

    const result = await recomputeDailySeriesForCouple({
      coupleId,
      timeZone,
      startDayKey,
      endDayKeyExclusive,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
