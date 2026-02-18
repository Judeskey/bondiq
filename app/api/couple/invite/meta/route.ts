// app/api/couple/invite/meta/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Dual-mode endpoint:
 * 1) INVITE META (public)  -> /api/couple/invite/meta?token=...
 * 2) REMINDER META (authed)-> /api/couple/invite/meta
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();

    // ============================================================
    // MODE 1: Invite token metadata (used by /invite page UX)
    // ============================================================
    if (token) {
      const tokenHash = sha256(token);

      const invite = await prisma.invite.findFirst({
        where: { tokenHash },
        select: {
          coupleId: true,
          createdAt: true, // if your Invite model doesn't have this, remove this line
          expiresAt: true,
          acceptedAt: true,
          email: true,
        },
      });

      if (!invite) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 410 });
      }

      return NextResponse.json({
        ok: true,
        mode: "invite",
        invite: {
          coupleId: invite.coupleId,
          createdAt: invite.createdAt ?? null,
          expiresAt: invite.expiresAt ?? null,
          acceptedAt: invite.acceptedAt ?? null,
          email: invite.email ?? null,
          inviter: {
            // If your schema has inviter relation, you can populate it later.
            name: null,
            email: null,
          },
        },
      });
    }

    // ============================================================
    // MODE 2: Invite reminder metadata (used by in-app reminder modal)
    // ============================================================
    const { email, userId } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!me?.id) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const coupleId = await getCoupleForUser(me.id);

    // If user has no couple at all, they definitely need reminder UI
    if (!coupleId) {
      return NextResponse.json({
        ok: true,
        mode: "reminder",
        viewerUserId: userId,
        coupleId: null,
        memberCount: 0,
        pendingInviteCount: 0,
        latestInvite: null,
        needsInviteReminder: true,
        reason: "NO_COUPLE",
      });
    }

    const memberCount = await prisma.coupleMember.count({
      where: { coupleId },
    });

    const now = new Date();

    // Pending invite = not accepted, not expired
    const pendingInviteCount = await prisma.invite.count({
      where: {
        coupleId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    });

    // Try to get any latest pending invite (no orderBy to avoid schema mismatch issues)
    const latestInvite = await prisma.invite.findFirst({
      where: {
        coupleId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        email: true,
        expiresAt: true,
      },
    });

    const needsInviteReminder = memberCount < 2;

    let reason: "SOLO" | "SOLO_PENDING_INVITE" | "NO_COUPLE" = "SOLO";
    if (memberCount < 2 && pendingInviteCount > 0) reason = "SOLO_PENDING_INVITE";

    return NextResponse.json({
      ok: true,
      mode: "reminder",
      viewerUserId: userId,
      coupleId,
      memberCount,
      pendingInviteCount,
      latestInvite: latestInvite
        ? { email: latestInvite.email ?? null, expiresAt: latestInvite.expiresAt ?? null }
        : null,
      needsInviteReminder,
      reason,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
