// app/api/gratitude/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { requireProCouple } from "@/lib/requireProCouple";
import { Prisma, GratitudeVisibility } from "@prisma/client";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function visibilityWhereForUser(meId: string): Prisma.GratitudeEntryWhereInput {
    return {
      OR: [{ visibility: GratitudeVisibility.SHARED }, { userId: meId }],
    };
  }
  

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 30)));
    const cursor = url.searchParams.get("cursor"); // createdAt ISO cursor

    const entries = await prisma.gratitudeEntry.findMany({
      where: {
        coupleId,
        ...visibilityWhereForUser(me.id),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take,
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

    const nextCursor = entries.length ? entries[entries.length - 1].createdAt.toISOString() : null;
    return NextResponse.json({ ok: true, entries, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));

    const title = typeof body.title === "string" ? body.title.trim() : null;
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const visibility = typeof body.visibility === "string" ? body.visibility : "PRIVATE";
    const pinned = Boolean(body.pinned);
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : null;

    const eventDay = body.eventDay ? new Date(body.eventDay) : null;

    if (!text) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ ok: false, error: "body too long (max 2000)" }, { status: 400 });

    // Only allow known enum values
    const safeVisibility = visibility === "SHARED" ? "SHARED" : "PRIVATE";

    const entry = await prisma.gratitudeEntry.create({
      data: {
        coupleId,
        userId: me.id,
        targetUserId,
        title: title && title.length ? title : null,
        body: text,
        visibility: safeVisibility as any,
        pinned,
        eventDay: eventDay && !Number.isNaN(eventDay.getTime()) ? eventDay : null,
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
        updatedAt: true,
        lastResurfacedAt: true,
        resurfacedCount: true,
      },
    });

    return NextResponse.json({ ok: true, entry }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
