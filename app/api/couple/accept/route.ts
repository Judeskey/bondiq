import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const tokenHash = sha256(token);

    const invite = await prisma.invite.findUnique({ where: { tokenHash } });
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 400 });

    // prevent >2 members
    const memberCount = await prisma.coupleMember.count({ where: { coupleId: invite.coupleId } });
    if (memberCount >= 2) return NextResponse.json({ error: "Couple already full" }, { status: 400 });

    // if user already in a couple, block (MVP rule)
    const existing = await prisma.coupleMember.findFirst({ where: { userId: user.id } });
    if (existing) return NextResponse.json({ error: "User already in a couple" }, { status: 400 });

    await prisma.$transaction([
      prisma.coupleMember.create({ data: { coupleId: invite.coupleId, userId: user.id } }),
      prisma.invite.update({ where: { tokenHash }, data: { acceptedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, coupleId: invite.coupleId });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
