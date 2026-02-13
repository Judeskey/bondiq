// app/api/partner-alias/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const coupleId = await getCoupleForUser(userId);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";

    if (nickname.length < 2) {
      return NextResponse.json({ error: "Nickname must be at least 2 characters" }, { status: 400 });
    }
    if (nickname.length > 40) {
      return NextResponse.json({ error: "Nickname too long (max 40)" }, { status: 400 });
    }

    const partnerMember = await prisma.coupleMember.findFirst({
      where: { coupleId, userId: { not: userId } },
      select: { userId: true },
    });
    if (!partnerMember?.userId) {
      return NextResponse.json({ error: "No partner connected yet" }, { status: 400 });
    }

    const saved = await prisma.partnerAlias.upsert({
      where: {
        coupleId_ownerUserId_targetUserId: {
          coupleId,
          ownerUserId: userId,
          targetUserId: partnerMember.userId,
        },
      },
      create: {
        coupleId,
        ownerUserId: userId,
        targetUserId: partnerMember.userId,
        nickname,
      },
      update: { nickname },
      select: { nickname: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, alias: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
