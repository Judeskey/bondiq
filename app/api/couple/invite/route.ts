import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST() {
  try {
    const { email } = await requireUser();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const membership = await prisma.coupleMember.findFirst({ where: { userId: user.id } });
    if (!membership) return NextResponse.json({ error: "Create a couple first" }, { status: 400 });

    // ensure couple has < 2 members
    const memberCount = await prisma.coupleMember.count({ where: { coupleId: membership.coupleId } });
    if (memberCount >= 2) return NextResponse.json({ error: "Couple already has 2 members" }, { status: 400 });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await prisma.invite.create({
      data: {
        coupleId: membership.coupleId,
        tokenHash,
        expiresAt,
      },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "";
    const inviteUrl = `${base}/app/onboarding?invite=${token}`;

    return NextResponse.json({ inviteUrl });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
