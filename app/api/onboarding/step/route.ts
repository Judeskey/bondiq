// app/api/onboarding/step/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim() || null;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const step = Number(body?.step);

  // ✅ onboarding only has 3 steps
  if (!Number.isFinite(step) || step < 1 || step > 3) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  // ✅ completion is only step 3 confirmed
  const completed = step >= 3;

  const user = await prisma.user.update({
    where: { email },
    data: {
      onboardingStep: step,
      onboardingCompleted: completed,
    },
    select: { onboardingStep: true, onboardingCompleted: true },
  });

  return NextResponse.json(user);
}
