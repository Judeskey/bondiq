import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    const body = await req.json();
    const targetUserId = String(body?.userId || "");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (targetUserId === me.id) {
      return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
    }

    // Ensure target is actually in the same couple
    const target = await prisma.coupleMember.findUnique({
      where: { coupleId_userId: { coupleId, userId: targetUserId } },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json({ error: "That user is not in your couple." }, { status: 404 });
    }

    // Remove member (their data stays, but membership is removed)
    await prisma.coupleMember.delete({
      where: { coupleId_userId: { coupleId, userId: targetUserId } },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
