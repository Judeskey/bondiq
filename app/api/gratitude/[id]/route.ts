// app/api/gratitude/[id]/route.ts
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
  

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

    const entry = await prisma.gratitudeEntry.findFirst({
      where: { id: params.id, coupleId, ...visibilityWhereForUser(me.id) },
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

    if (!entry) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

    const existing = await prisma.gratitudeEntry.findFirst({
      where: { id: params.id, coupleId, ...visibilityWhereForUser(me.id) },
      select: { id: true, userId: true },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // Optional: if you want only the creator to edit:
    // if (existing.userId !== me.id) return NextResponse.json({ ok:false, error:"Only the creator can edit this entry" }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const data: any = {};

    if (typeof body.title === "string") data.title = body.title.trim() || null;

    if (typeof body.body === "string") {
      const txt = body.body.trim();
      if (!txt) return NextResponse.json({ ok: false, error: "body cannot be empty" }, { status: 400 });
      if (txt.length > 2000) return NextResponse.json({ ok: false, error: "body too long (max 2000)" }, { status: 400 });
      data.body = txt;
    }

    if (typeof body.visibility === "string") {
      data.visibility = body.visibility === "SHARED" ? "SHARED" : "PRIVATE";
    }

    if (typeof body.pinned === "boolean") data.pinned = body.pinned;

    if (body.targetUserId !== undefined) data.targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : null;

    if (body.eventDay !== undefined) {
      const d = body.eventDay ? new Date(body.eventDay) : null;
      data.eventDay = d && !Number.isNaN(d.getTime()) ? d : null;
    }

    const updated = await prisma.gratitudeEntry.update({
      where: { id: params.id },
      data,
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

    return NextResponse.json({ ok: true, entry: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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

    const existing = await prisma.gratitudeEntry.findFirst({
      where: { id: params.id, coupleId, ...visibilityWhereForUser(me.id) },
      select: { id: true, userId: true },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // Optional: only creator can delete
    // if (existing.userId !== me.id) return NextResponse.json({ ok:false, error:"Only the creator can delete this entry" }, { status: 403 });

    await prisma.gratitudeEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
