// app/api/gratitude/resurface/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { requireProCouple } from "@/lib/requireProCouple";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function visibilityWhereForUser(meId: string) {
  return {
    OR: [{ visibility: "SHARED" }, { userId: meId }],
  } as const;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  try {
    const { email } = await requireUser();
    const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!me) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ ok: false, error: "No couple connected" }, { status: 400 });

    const gate = await requireProCouple(coupleId);
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error, code: (gate as any).code }, { status: gate.status });
    }

    // Cooldown: don't resurface things resurfaced in last 3 days (unless pinned)
    const cooldown = daysAgo(3);

    // Candidate pool:
    // 1) pinned first
    // 2) never resurfaced next
    // 3) least resurfaced next
    // 4) older lastResurfacedAt next
    const candidates = await prisma.gratitudeEntry.findMany({
      where: {
        coupleId,
        ...visibilityWhereForUser(me.id),
        OR: [
          { pinned: true },
          { lastResurfacedAt: null },
          { lastResurfacedAt: { lt: cooldown } },
        ],
      },
      orderBy: [
        { pinned: "desc" },
        { lastResurfacedAt: "asc" },
        { resurfacedCount: "asc" },
        { createdAt: "desc" },
      ],
      take: 40,
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
        lastResurfacedAt: true,
        resurfacedCount: true,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, entry: null });
    }

    // Weighted pick: earlier items are "better" (pinned/never resurfaced/old resurfaced)
    // We'll pick from the top slice for variety without becoming random-noisy.
    const top = candidates.slice(0, Math.min(12, candidates.length));
    const pick = top[Math.floor(Math.random() * top.length)];

    const updated = await prisma.gratitudeEntry.update({
      where: { id: pick.id },
      data: {
        lastResurfacedAt: new Date(),
        resurfacedCount: { increment: 1 },
      },
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
        lastResurfacedAt: true,
        resurfacedCount: true,
      },
    });

    return NextResponse.json({ ok: true, entry: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
