import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { requireProCouple } from "@/lib/requireProCouple";
import crypto from "crypto";
import { Prisma, GratitudeVisibility } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function visibilityWhereForUser(meId: string): Prisma.GratitudeEntryWhereInput {
  return {
    OR: [{ visibility: GratitudeVisibility.SHARED }, { userId: meId }],
  };
}

function startOfWeek(d: Date) {
  // Monday start (ISO-ish)
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function hashToInt(seed: string) {
  const h = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return parseInt(h, 16);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ ok: false, error: "No couple connected" }, { status: 400 });

    const gate = await requireProCouple(coupleId);
    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, error: gate.error, code: (gate as any).code },
        { status: gate.status }
      );
    }

    const weekStart = startOfWeek(new Date());
    const lookback = daysAgo(120); // pick from last ~4 months to keep it meaningful

    // Pull a good candidate pool (ordered by "likely-best")
    const candidates = await prisma.gratitudeEntry.findMany({
      where: {
        coupleId,
        createdAt: { gte: lookback },
        ...visibilityWhereForUser(me.id),
      },
      orderBy: [
        { pinned: "desc" },              // pinned gets preference
        { visibility: "desc" as any },   // SHARED often sorts after PRIVATE depending on enum; not guaranteed, so we also pick deterministically
        { resurfacedCount: "asc" },      // show less-used memories
        { createdAt: "desc" },           // prefer recent
      ],
      take: 80,
      select: {
        id: true,
        title: true,
        body: true,
        visibility: true,
        pinned: true,
        eventDay: true,
        targetUserId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        lastResurfacedAt: true,
        resurfacedCount: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, weekStart: weekStart.toISOString(), entry: null });
    }

    // Make a smaller “top pool” so selection is curated but still varied
    const topPool = candidates.slice(0, Math.min(20, candidates.length));

    // Stable pick for the week (same coupleId + weekStart => same memory)
    const seed = `${coupleId}:${weekStart.toISOString()}`;
    const idx = hashToInt(seed) % topPool.length;
    const pick = topPool[idx];

    return NextResponse.json({
      ok: true,
      weekStart: weekStart.toISOString(),
      entry: pick,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
