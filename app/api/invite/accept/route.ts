// app/api/invite/accept/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

type AcceptResult =
  | {
      ok: true;
      coupleId: string;
      code:
        | "JOINED"
        | "ALREADY_IN_TARGET"
        | "INVITE_ALREADY_ACCEPTED"
        | "PLACEHOLDER_REPLACED";
      blocked?: false;
      // non-breaking optional hints:
      createdUser?: boolean;
      shouldSignInWithCredentials?: boolean;
    }
  | {
      ok: false;
      code:
        | "MISSING_TOKEN"
        | "INVALID_INVITE"
        | "INVITE_EXPIRED"
        | "EMAIL_MISMATCH"
        | "ALREADY_IN_OTHER_COUPLE"
        | "SERVER_ERROR";
      error: string;
      status: number;
      blocked?: boolean;
      coupleId?: string;
    };

async function tryGetAuthUser(): Promise<{ userId: string; email: string } | null> {
  try {
    const u = await requireUser();
    if (!u?.userId || !u?.email) return null;
    return { userId: u.userId, email: u.email };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "").trim();

  if (!token) {
    const out: AcceptResult = {
      ok: false,
      code: "MISSING_TOKEN",
      error: "Missing token",
      status: 400,
    };
    return NextResponse.json(out, { status: out.status });
  }

  // ✅ Mode A: Signed-in user (existing behavior)
  // ✅ Mode B: Guest accept (create/find user + join) — no magic link required
  const authed = await tryGetAuthUser();

  let userId = authed?.userId || "";
  let email = authed?.email || "";

  // Guest accept inputs
  const guestEmail =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const guestPassword = typeof body?.password === "string" ? body.password : "";
  const guestName =
    typeof body?.name === "string" ? body.name.trim().slice(0, 80) : null;

  const isGuestMode = !authed;

  if (isGuestMode) {
    if (!guestEmail) {
      const out: AcceptResult = {
        ok: false,
        code: "SERVER_ERROR",
        error: "Missing email",
        status: 400,
      };
      return NextResponse.json(out, { status: out.status });
    }
    if (!guestPassword || guestPassword.length < 8) {
      const out: AcceptResult = {
        ok: false,
        code: "SERVER_ERROR",
        error: "Password must be at least 8 characters",
        status: 400,
      };
      return NextResponse.json(out, { status: out.status });
    }

    email = guestEmail;
  }

  const tokenHash = sha256(token);
  const now = new Date();

  let createdUser = false;

  const result: AcceptResult = await prisma.$transaction(async (tx) => {
    // --- Invite lookup
    const invite = await tx.invite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        coupleId: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
      },
    });

    if (!invite) {
      return {
        ok: false,
        code: "INVALID_INVITE",
        error: "Invalid invite",
        status: 404,
      };
    }

    if (invite.expiresAt && invite.expiresAt <= now) {
      return {
        ok: false,
        code: "INVITE_EXPIRED",
        error: "Invite expired",
        status: 410,
      };
    }

    // Email binding (always enforced against the effective email)
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return {
        ok: false,
        code: "EMAIL_MISMATCH",
        error: "Please sign in with the invited email",
        status: 403,
      };
    }

    // --- Guest mode: create/find user BEFORE membership checks
    if (isGuestMode) {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true },
      });

      if (!existing) {
        const passwordHash = await bcrypt.hash(guestPassword, 10);

        const created = await tx.user.create({
          data: {
            email,
            name: guestName || undefined,
            passwordHash,
          },
          select: { id: true },
        });

        userId = created.id;
        createdUser = true;
      } else {
        userId = existing.id;

        // If user exists but has no passwordHash, set it so Credentials works
        if (!existing.passwordHash) {
          const passwordHash = await bcrypt.hash(guestPassword, 10);
          await tx.user.update({
            where: { id: userId },
            data: { passwordHash },
          });
        }
      }
    }

    if (!userId) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        error: "Missing user context",
        status: 500,
      };
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

      return {
        ok: true,
        coupleId: invite.coupleId,
        code: invite.acceptedAt ? "INVITE_ALREADY_ACCEPTED" : "ALREADY_IN_TARGET",
        blocked: false,
        createdUser,
        shouldSignInWithCredentials: isGuestMode,
      };
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
        // continue below
      } else {
        // Real couple: do NOT allow automatic re-binding
        return {
          ok: false,
          code: "ALREADY_IN_OTHER_COUPLE",
          error: "You’re already connected to a couple",
          status: 200, // keep your existing UI-friendly behavior
          blocked: true,
          coupleId: existingMembership.coupleId,
        };
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
      data: { onboardingStep: 1, onboardingCompleted: false },
    });

    return {
      ok: true,
      coupleId: invite.coupleId,
      code: existingMembership ? "PLACEHOLDER_REPLACED" : "JOINED",
      blocked: false,
      createdUser,
      shouldSignInWithCredentials: isGuestMode,
    };
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }

  return NextResponse.json(result, { status: 200 });
}
