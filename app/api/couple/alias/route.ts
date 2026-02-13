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
    const targetUserId = String(body?.targetUserId || "");
    const nicknameRaw = String(body?.nickname || "").trim();

    if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    if (targetUserId === me.id) return NextResponse.json({ error: "You can't nickname yourself here." }, { status: 400 });

    const nickname = nicknameRaw.slice(0, 40);
    if (!nickname) return NextResponse.json({ error: "Nickname can't be empty." }, { status: 400 });

    // Ensure target is actually a member in your couple
    const isMember = await prisma.coupleMember.findUnique({
      where: { coupleId_userId: { coupleId, userId: targetUserId } },
      select: { id: true },
    });
    if (!isMember) return NextResponse.json({ error: "That user is not in your couple." }, { status: 404 });

    await prisma.partnerAlias.upsert({
      where: { coupleId_ownerUserId_targetUserId: { coupleId, ownerUserId: me.id, targetUserId } },
      create: { coupleId, ownerUserId: me.id, targetUserId, nickname },
      update: { nickname },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
