import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export async function GET() {
  try {
    const { email } = await requireUser();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(user.id);

    let profile = null;
    if (coupleId) {
      profile = await prisma.loveProfile.findUnique({
        where: { coupleId_userId: { coupleId, userId: user.id } },
      });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      coupleId,
      profile,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
