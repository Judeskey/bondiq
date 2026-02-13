// app/api/partner-alias/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await requireUser();

    const coupleId = await getCoupleForUser(userId);
    if (!coupleId) {
      return NextResponse.json({ ok: true, partner: null, nickname: null });
    }

    const partnerMember = await prisma.coupleMember.findFirst({
      where: { coupleId, userId: { not: userId } },
      select: { userId: true },
    });

    if (!partnerMember?.userId) {
      return NextResponse.json({ ok: true, partner: null, nickname: null });
    }

    const partner = await prisma.user.findUnique({
      where: { id: partnerMember.userId },
      select: { id: true, name: true, email: true },
    });

    const alias = await prisma.partnerAlias.findUnique({
      where: {
        coupleId_ownerUserId_targetUserId: {
          coupleId,
          ownerUserId: userId,
          targetUserId: partnerMember.userId,
        },
      },
      select: { nickname: true },
    });

    return NextResponse.json({
      ok: true,
      partner: partner
        ? { userId: partner.id, name: partner.name ?? null, email: partner.email }
        : { userId: partnerMember.userId, name: null, email: null },
      nickname: alias?.nickname ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
