// lib/privacy.ts
import { prisma } from "@/lib/db";

export async function getCoupleProStatus(coupleId: string) {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { planType: true, proUntil: true },
  });

  const premium =
    (typeof couple?.planType === "string" && couple.planType !== "FREE") ||
    (couple?.proUntil ? new Date(couple.proUntil) > new Date() : false);

  return { premium };
}

export function canViewerSeePartnerThing(opts: {
  premium: boolean;
  visibility: "PRIVATE" | "PARTNER" | "COUPLE";
  isViewerOwner: boolean; // viewer is the owner of the data
}) {
  // Owner can always see their own data
  if (opts.isViewerOwner) return true;

  // Partner visibility is PRO only
  if (!opts.premium) return false;

  // If PRO, partner can see PARTNER or COUPLE
  return opts.visibility === "PARTNER" || opts.visibility === "COUPLE";
}
