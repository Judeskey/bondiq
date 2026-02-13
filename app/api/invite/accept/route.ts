// app/api/invite/accept/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const { userId, email } = await requireUser();

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const tokenHash = sha256(token);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { tokenHash },
      select: { id: true, coupleId: true, email: true, expiresAt: true, acceptedAt: true },
    });

    if (!invite) return { ok: false as const, status: 404, error: "Invalid invite" };
    if (invite.expiresAt <= now) return { ok: false as const, status: 410, error: "Invite expired" };

    // Email binding
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return { ok: false as const, status: 403, error: "Please sign in with the invited email" };
    }

    // ✅ If user is already a member of THIS couple, treat as success (idempotent)
    const alreadyInTarget = await tx.coupleMember.findFirst({
      where: { userId, coupleId: invite.coupleId },
      select: { id: true },
    });

    if (alreadyInTarget) {
      // Mark invite accepted if it wasn't already (safe)
      if (!invite.acceptedAt) {
        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: now },
        });
      }

      // Ensure onboarding is not “completed” for invited partner
      await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: 1, onboardingCompleted: false },
      });

      return { ok: true as const, coupleId: invite.coupleId };
    }

    // ✅ Check if user is already connected somewhere else
    const existingMembership = await tx.coupleMember.findFirst({
      where: { userId },
      select: { coupleId: true },
    });

    if (existingMembership) {
      // If the existing couple is a solo placeholder (only 1 member), remove it and proceed.
      const memberCount = await tx.coupleMember.count({
        where: { coupleId: existingMembership.coupleId },
      });

      if (memberCount <= 1) {
        // Prefer deleting the whole placeholder couple (cascade deletes membership)
        await tx.couple.delete({
          where: { id: existingMembership.coupleId },
        });
      } else {
        // Real couple: do NOT allow automatic re-binding
        return { ok: false as const, status: 409, error: "You’re already connected to a couple" };
      }
    }

    // Join inviter’s couple
    await tx.coupleMember.create({
      data: { coupleId: invite.coupleId, userId },
    });

    // Mark invite accepted
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: now },
    });

    // Force invited partner into onboarding
    await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStep: 1,
        onboardingCompleted: false,
      },
    });

    return { ok: true as const, coupleId: invite.coupleId };
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, coupleId: result.coupleId });
}
