import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskEmail(email?: string | null) {
  if (!email) return "Unknown";
  const [u, d] = email.split("@");
  return `${u.slice(0, 6)}…@${d}`;
}

export async function GET() {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) {
      return NextResponse.json({ error: "No couple connected" }, { status: 400 });
    }

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: {
        id: true,
        status: true,
        members: {
          select: {
            user: {
              select: { id: true, email: true, name: true, image: true },
            },
          },
        },
        partnerAliases: {
          select: { ownerUserId: true, targetUserId: true, nickname: true },
        },
      },
    });

    if (!couple) {
      return NextResponse.json({ error: "Couple not found" }, { status: 404 });
    }

    // Nicknames from the perspective of the viewer (ownerUserId = me.id)
    const myAliases = couple.partnerAliases.filter((a) => a.ownerUserId === me.id);

    const members = couple.members.map((m) => {
      const u = m.user;
      const nickname =
        myAliases.find((a) => a.targetUserId === u.id)?.nickname?.trim() || null;

      const baseName = (u.name || "").trim();
      const label = nickname || baseName || maskEmail(u.email);

      return {
        userId: u.id,
        email: u.email,
        name: u.name,
        image: u.image,
        nickname,
        label,
      };
    });

    const viewerLabel =
      members.find((m) => m.userId === me.id)?.label || "You";

    const partnerLabel =
      members.find((m) => m.userId !== me.id)?.label || "Partner";

    return NextResponse.json({
      ok: true,
      couple: { id: couple.id, status: couple.status },
      viewerUserId: me.id,
      viewerLabel,
      partnerLabel,
      members,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
