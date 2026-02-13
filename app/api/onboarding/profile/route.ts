// app/api/onboarding/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { ensureCoupleForUser } from "@/lib/ensureCoupleForUser";
import type { LoveLanguage, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asLoveLanguage(v: any): LoveLanguage | null {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return null;

  // Must match your Prisma enum values
  const allowed = new Set(["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"]);
  if (!allowed.has(s)) return null;

  return s as LoveLanguage;
}

export async function POST(req: Request) {
  const { userId, email } = await requireUser();

  const body = await req.json().catch(() => ({}));

  const name =
    typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";

  const primary = asLoveLanguage(body?.primaryLanguage);
  const secondary = asLoveLanguage(body?.secondaryLanguage);

  if (!primary) {
    return NextResponse.json(
      { error: "Primary love language is required." },
      { status: 400 }
    );
  }
  if (secondary && secondary === primary) {
    return NextResponse.json(
      { error: "Secondary love language must be different from primary." },
      { status: 400 }
    );
  }

  const { coupleId } = await ensureCoupleForUser(userId);

  await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: userId },
        data: { name },
        select: { id: true },
      });
    }

    await tx.loveProfile.upsert({
      where: { coupleId_userId: { coupleId, userId } },
      create: {
        coupleId,
        userId,
        primaryLanguage: primary,
        secondaryLanguage: secondary ?? null,
        completedAt: new Date(),
      },
      update: {
        primaryLanguage: primary,
        secondaryLanguage: secondary ?? null,
        completedAt: new Date(),
      },
    });
  });

  const membersCount = await prisma.coupleMember.count({ where: { coupleId } });
  const nextStep = membersCount <= 1 ? 2 : 3;

  // Keep one source of truth for onboarding step + completion
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStep: nextStep,
      onboardingCompleted: false,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    email,
    coupleId,
    nextStep,
  });
}
