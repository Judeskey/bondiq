// app/api/bootstrap/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ensureCoupleForUser } from "@/lib/ensureCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim() || null;

  if (!email) {
    return NextResponse.json(
      { ok: false, redirectTo: "/signin?callbackUrl=%2Fapp" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, onboardingCompleted: true },
  });

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, redirectTo: "/signin?callbackUrl=%2Fapp" },
      { status: 401 }
    );
  }

  // ✅ Ensure couple exists (creates it if missing)
  await ensureCoupleForUser(user.id);

  // ✅ If not onboarded, force the flow
  if (!user.onboardingCompleted) {
    return NextResponse.json({ ok: true, redirectTo: "/app/onboarding" });
  }

  return NextResponse.json({ ok: true });
}
