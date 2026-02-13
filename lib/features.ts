// lib/features.ts

export type PlanType = "FREE" | "PREMIUM";

/**
 * Feature keys used throughout the app for gating.
 * Add new flags here only.
 */
export const FEATURES = {
  DAILY_TIMELINE_DAYS: "DAILY_TIMELINE_DAYS",
  REPAIR_SUGGESTIONS_WEEKLY: "REPAIR_SUGGESTIONS_WEEKLY",
  EMOTION_SIGNAL_SHARING: "EMOTION_SIGNAL_SHARING",
  INSIGHTS_PATTERN_DETECTION: "INSIGHTS_PATTERN_DETECTION",
  NARRATIVE_COACHING_PRIORITY: "NARRATIVE_COACHING_PRIORITY",
  GRATITUDE_VAULT: "GRATITUDE_VAULT",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export type FeatureDecision = {
  allowed: boolean;
  reason: "OK" | "PREMIUM_REQUIRED";
  // Optional limits: used by endpoints to enforce quotas/retention windows
  limits?: Record<string, number>;
};

/**
 * Central rules: define what FREE vs PREMIUM gets.
 * This is the only place you should modify plan gating rules.
 */
export function decideFeature(planType: PlanType, feature: FeatureKey): FeatureDecision {
  const isPremium = planType === "PREMIUM";

  switch (feature) {
    // FREE: always 7 days
    // PREMIUM: default 30 days, allow up to 90 days
    case FEATURES.DAILY_TIMELINE_DAYS: {
      const daysDefault = isPremium ? 30 : 7;
      const daysMax = isPremium ? 90 : 7;

      return {
        allowed: true,
        reason: "OK",
        limits: { daysDefault, daysMax },
      };
    }

    // FREE: 1–2 per week
    // PREMIUM: unlimited (we'll implement the counter later)
    case FEATURES.REPAIR_SUGGESTIONS_WEEKLY:
      return {
        allowed: true,
        reason: "OK",
        limits: { perWeek: isPremium ? 999999 : 2 },
      };

    // PREMIUM only
    case FEATURES.EMOTION_SIGNAL_SHARING:
    case FEATURES.INSIGHTS_PATTERN_DETECTION:
    case FEATURES.NARRATIVE_COACHING_PRIORITY:
    case FEATURES.GRATITUDE_VAULT:
      if (!isPremium) return { allowed: false, reason: "PREMIUM_REQUIRED" };
      return { allowed: true, reason: "OK" };

    default:
      // Fail-closed on unknown keys
      return { allowed: false, reason: "PREMIUM_REQUIRED" };
  }
}
