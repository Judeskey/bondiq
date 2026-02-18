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
  // If proUntil is null, treat as "no expiry" premium (lifetime / manual grant)
  if (!proUntil) return true;
  return proUntil.getTime() > nowUtc().getTime();
}

/**
 * Source of truth:
 * - Couple.planType + Couple.proUntil (BondIQ is couple-based)
 * - User -> couple mapping via getCoupleForUser(userId)
 */
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

/**
 * Convenience: use this in API routes where you already have email from requireUser().
 * Throws a typed error you can catch and convert to 402/403.
 */
export async function requirePremiumByEmail(email: string): Promise<Entitlements> {
  const ent = await getEntitlementsByEmail(email);
  if (!ent.isPremium) {
    const err = new Error("PREMIUM_REQUIRED");
    // @ts-expect-error custom error code
    err.code = "PREMIUM_REQUIRED";
    throw err;
  }
  return ent;
}

/**
 * Optional helper: sometimes you want "FREE vs PREMIUM" as a boolean,
 * without throwing.
 */
export async function isPremiumByEmail(email: string): Promise<boolean> {
  const ent = await getEntitlementsByEmail(email);
  return ent.isPremium;
}

/**
 * Small utility for routes that want standardized HTTP handling.
 */
function hasCode(x: unknown): x is { code?: unknown } {
    return typeof x === "object" && x !== null && "code" in x;
  }
  
  export function isPremiumRequiredError(e: unknown) {
    return hasCode(e) && e.code === "PREMIUM_REQUIRED";
  }
  
