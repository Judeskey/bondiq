import { prisma } from "@/lib/db";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export type PlanType = "FREE" | "PREMIUM";

export type Entitlements = {
  planType: PlanType;
  isPremium: boolean;
  proUntil: Date | null;
  coupleId: string | null;
};

function nowUtc() {
  return new Date();
}

function isPremiumEntitlement(planType: PlanType, proUntil: Date | null) {
  if (planType !== "PREMIUM") return false;
  if (!proUntil) return true;
  return proUntil.getTime() > nowUtc().getTime();
}

export async function getEntitlementsByEmail(email: string): Promise<Entitlements> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { planType: "FREE", isPremium: false, proUntil: null, coupleId: null };
  }

  const coupleId = await getCoupleForUser(user.id);

  if (!coupleId) {
    return { planType: "FREE", isPremium: false, proUntil: null, coupleId: null };
  }

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { planType: true, proUntil: true },
  });

  if (!couple) {
    return { planType: "FREE", isPremium: false, proUntil: null, coupleId };
  }

  const planType = (couple.planType as PlanType) ?? "FREE";
  const proUntil = couple.proUntil ?? null;

  return {
    coupleId,
    planType,
    proUntil,
    isPremium: isPremiumEntitlement(planType, proUntil),
  };
}

export async function requirePremiumByEmail(email: string) {
  const ent = await getEntitlementsByEmail(email);
  if (!ent.isPremium) {
    const err = new Error("PREMIUM_REQUIRED");
    // @ts-ignore
    err.code = "PREMIUM_REQUIRED";
    throw err;
  }
  return ent;
}
