// components/emotion/stateMap.ts

export type EmotionStateKey =
  | "SECURE"
  | "CONNECTED"
  | "NEUTRAL"
  | "DRIFTING"
  | "TENSE"
  | "DISCONNECTED"
  | "UNKNOWN";

export type EmotionStateMeta = {
  key: EmotionStateKey;
  label: string; // user-facing
  emoji: string;
  short: string; // 1-line friendly description
  why: string; // tooltip copy
  // Tailwind gradient classes (gentle, non-alarming)
  orbGradient: string;
  ringClass: string;
};

export function normalizeState(raw: unknown): EmotionStateKey {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return "UNKNOWN";

  // allow server strings like "Disconnected", "No signal yet", etc.
  if (s.includes("SECURE")) return "SECURE";
  if (s.includes("CONNECTED")) return "CONNECTED";
  if (s.includes("NEUTRAL")) return "NEUTRAL";
  if (s.includes("DRIFT")) return "DRIFTING";
  if (s.includes("TENSE")) return "TENSE";
  if (s.includes("DISCONNECT") || s.includes("NO SIGNAL")) return "DISCONNECTED";

  return "UNKNOWN";
}

export const EMOTION_STATE_MAP: Record<EmotionStateKey, EmotionStateMeta> = {
  SECURE: {
    key: "SECURE",
    label: "Secure",
    emoji: "🌤️",
    short: "Warm, steady connection.",
    why: "Signals suggest consistent check-ins and stable ratings—this week looks emotionally safe and steady.",
    orbGradient: "bg-gradient-to-br from-emerald-200 via-sky-200 to-indigo-200",
    ringClass: "ring-emerald-200/60",
  },
  CONNECTED: {
    key: "CONNECTED",
    label: "Connected",
    emoji: "✨",
    short: "You’re in a good groove.",
    why: "Your recent trend suggests healthy closeness with enough consistency to keep momentum.",
    orbGradient: "bg-gradient-to-br from-sky-200 via-indigo-200 to-fuchsia-200",
    ringClass: "ring-sky-200/70",
  },
  NEUTRAL: {
    key: "NEUTRAL",
    label: "Neutral",
    emoji: "🌿",
    short: "Okay—room to deepen.",
    why: "This looks stable but not strongly increasing; small daily warmth will raise closeness over time.",
    orbGradient: "bg-gradient-to-br from-slate-200 via-sky-100 to-emerald-100",
    ringClass: "ring-slate-200/70",
  },
  DRIFTING: {
    key: "DRIFTING",
    label: "Drifting",
    emoji: "🫧",
    short: "Slight distance—easy to repair.",
    why: "A soft dip or fewer check-ins can feel like distance. A tiny consistent habit is high ROI this week.",
    orbGradient: "bg-gradient-to-br from-amber-100 via-sky-100 to-indigo-100",
    ringClass: "ring-amber-200/60",
  },
  TENSE: {
    key: "TENSE",
    label: "Tense",
    emoji: "🌧️",
    short: "More friction than usual.",
    why: "Ups-and-downs or a downward trend suggests stress. Keep repairs gentle and structured (10-minute reset).",
    orbGradient: "bg-gradient-to-br from-rose-100 via-amber-100 to-sky-100",
    ringClass: "ring-rose-200/60",
  },
  DISCONNECTED: {
    key: "DISCONNECTED",
    label: "No signal yet",
    emoji: "🌙",
    short: "Not enough recent data.",
    why: "We need at least one check-in from this partner in the last two weeks to read patterns confidently.",
    orbGradient: "bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100",
    ringClass: "ring-slate-200/70",
  },
  UNKNOWN: {
    key: "UNKNOWN",
    label: "—",
    emoji: "•",
    short: "Loading signal…",
    why: "We’re still gathering enough data to classify the recent emotional trend.",
    orbGradient: "bg-gradient-to-br from-slate-100 via-white to-slate-100",
    ringClass: "ring-slate-200/70",
  },
};
