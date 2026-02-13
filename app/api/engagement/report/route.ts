import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = await req.json().catch(() => ({} as any));

    const secondsRaw = Number(body?.seconds);
    const seconds = Number.isFinite(secondsRaw) ? Math.max(0, Math.floor(secondsRaw)) : 0;

    // ignore tiny pings
    if (seconds < 1) return NextResponse.json({ ok: true, ignored: true });

    // Cap: max 10 minutes/day credited to candle
    const DAY_CAP = 600;

    const day = startOfDayUTC();

    const existing = await prisma.dailyEngagement.findUnique({
      where: { userId_day: { userId, day } },
      select: { reportViewSeconds: true },
    });

    const current = existing?.reportViewSeconds ?? 0;
    const next = Math.min(DAY_CAP, current + seconds);

    await prisma.dailyEngagement.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, reportViewSeconds: next },
      update: { reportViewSeconds: next },
    });

    return NextResponse.json({ ok: true, reportViewSeconds: next, cap: DAY_CAP });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
