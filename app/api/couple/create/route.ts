import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export async function POST() {
  try {
    const { email } = await requireUser();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If user already in a couple, return it (MVP rule)
    const existing = await prisma.coupleMember.findFirst({
      where: { userId: user.id },
      include: { couple: true },
    });

    if (existing?.couple) {
      return NextResponse.json({ coupleId: existing.couple.id, already: true });
    }

    const couple = await prisma.couple.create({
      data: {
        members: {
          create: { userId: user.id },
        },
      },
    });

    return NextResponse.json({ coupleId: couple.id, already: false });
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
