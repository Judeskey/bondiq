import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const token = (body?.token || "").trim();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const tokenHash = sha256(token);

    const invite = await prisma.invite.findFirst({
      where: { tokenHash },
      select: { id: true, coupleId: true, expiresAt: true, acceptedAt: true },
    });

    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    // Add member if not already
    const existing = await prisma.coupleMember.findFirst({
      where: { coupleId: invite.coupleId, userId: me.id },
      select: { id: true },
    });

    if (!existing) {
      await prisma.coupleMember.create({
        data: { coupleId: invite.coupleId, userId: me.id },
      });
    }

    // Mark accepted (idempotent)
    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: invite.acceptedAt ?? new Date() },
    });

    return NextResponse.json({ ok: true, coupleId: invite.coupleId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
