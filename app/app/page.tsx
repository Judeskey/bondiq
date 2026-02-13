// app/app/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfWeek(d: Date) {
  const x = new Date(d);
  // Monday-start week
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AppHome() {
  const { userId } = await requireUserOrRedirect();

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingCompleted: true,
    },
  });

  // Safety fallback
  if (!me) redirect("/");

  // 1) Onboarding gate
  if (!me.onboardingCompleted) {
    redirect("/app/onboarding");
  }

  // 2) Must be connected to a couple
  const coupleId = await getCoupleForUser(userId);
  if (!coupleId) {
    redirect("/app/onboarding");
  }

  // 3) If user hasn't set love profile yet, send them to Settings
  const loveProfile = await prisma.loveProfile.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!loveProfile) {
    redirect("/app/settings");
  }

  // 4) If no check-in this week, push them to do it now
  const weekStart = startOfWeek(new Date());
  const checkin = await prisma.checkIn.findFirst({
    where: {
      coupleId,
      userId,
      createdAt: { gte: weekStart },
    },
    select: { id: true },
  });

  if (!checkin) {
    redirect("/app/checkin");
  }

  // 5) Otherwise: reports
  redirect("/app/reports");
}
