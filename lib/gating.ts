import { getEntitlementsByEmail } from "@/lib/entitlements";
import { decideFeature, type FeatureKey, type FeatureDecision } from "@/lib/features";

export type GateResult = FeatureDecision & {
  planType: "FREE" | "PREMIUM";
  isPremium: boolean;
  coupleId: string | null;
};

export async function gateFeatureByEmail(email: string, feature: FeatureKey): Promise<GateResult> {
  const ent = await getEntitlementsByEmail(email);

  const planType = ent.isPremium ? "PREMIUM" : "FREE";
  const decision = decideFeature(planType, feature);

  return {
    coupleId: ent.coupleId,
    planType,
    isPremium: ent.isPremium,
    ...decision,
  };
}

export async function requireFeatureByEmail(email: string, feature: FeatureKey) {
  const res = await gateFeatureByEmail(email, feature);
  if (!res.allowed) {
    const err = new Error(res.reason);
    // @ts-ignore
    err.code = res.reason;
    throw err;
  }
  return res;
}
