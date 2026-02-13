import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }

    // Clearing nickname = delete alias row
    if (!nickname) {
      await prisma.partnerAlias.deleteMany({
        where: { coupleId, ownerUserId: me.id, targetUserId },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    if (nickname.length < 2) {
      return NextResponse.json({ error: "Nickname too short" }, { status: 400 });
    }

    const alias = await prisma.partnerAlias.upsert({
      where: {
        coupleId_ownerUserId_targetUserId: {
          coupleId,
          ownerUserId: me.id,
          targetUserId,
        },
      },
      create: {
        coupleId,
        ownerUserId: me.id,
        targetUserId,
        nickname,
      },
      update: { nickname },
      select: { id: true, nickname: true, targetUserId: true },
    });

    return NextResponse.json({ ok: true, alias });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
