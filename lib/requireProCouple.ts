import { prisma } from "@/lib/db";

export async function requireProCouple(coupleId: string) {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: {
      id: true,
      planType: true,
      proUntil: true,
    },
  });

  if (!couple) {
    return { ok: false as const, status: 404, error: "Couple not found" };
  }

  const now = new Date();

  const isPremiumPlan = couple.planType === "PREMIUM";
  const hasActiveProUntil =
    couple.proUntil ? new Date(couple.proUntil) > now : false;

  const entitled = isPremiumPlan || hasActiveProUntil;

  if (!entitled) {
    return {
      ok: false as const,
      status: 402,
      code: "COUPLE_PREMIUM_REQUIRED",
      error: "Premium required (couple-level).",
    };
  }

  return { ok: true as const, couple };
}
