// lib/emotionState.ts

export type EmotionState =
  | "Secure & Connected"
  | "Rebuilding"
  | "Drifting"
  | "Tense"
  | "Disconnected"
  | "Mixed Signals";

export type PartnerEmotionResult = {
  userId: string;
  state: EmotionState;
  emoji: string;
  confidence: number; // 0..1
  reasons: string[];
  metrics: {
    daysConsidered: number;
    daysCheckedIn: number;
    avgRating: number | null; // 0..5
    lastRating: number | null;
    trendSlope: number; // per day, approx
    volatility: number; // stddev
    missingDays: number;
    topTags: string[];
  };
};

type DailyPoint = { day: string; rating: number }; // day = YYYY-MM-DD

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]) {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

// Simple linear regression slope (x=0..n-1, y=rating)
function slope(points: DailyPoint[]) {
  const n = points.length;
  if (n <= 1) return 0;

  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.rating);

  const xBar = mean(xs);
  const yBar = mean(ys);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xBar) * (ys[i] - yBar);
    den += (xs[i] - xBar) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function emojiFor(state: EmotionState) {
  switch (state) {
    case "Secure & Connected":
      return "🟢";
    case "Rebuilding":
      return "🟡";
    case "Drifting":
      return "🟠";
    case "Tense":
      return "🔴";
    case "Disconnected":
      return "⚫";
    case "Mixed Signals":
      return "🟣";
  }
}

/**
 * Tags are “signals”, not sentiment.
 * We use:
 * - Presence of tags => clarity
 * - Variety => mixed / scattered
 * - Repetition => consistent need
 */
function tagSignals(tags: string[]) {
  const clean = (tags || [])
    .map((t) => String(t || "").trim().toUpperCase())
    .filter(Boolean);

  const freq: Record<string, number> = {};
  for (const t of clean) freq[t] = (freq[t] ?? 0) + 1;

  const unique = Object.keys(freq).length;
  const total = clean.length;
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const concentration = total ? (freq[top[0]] ?? 0) / total : 0; // 0..1

  return {
    topTags: top,
    uniqueCount: unique,
    totalCount: total,
    concentration, // higher => consistent need
  };
}

/**
 * Core classifier.
 * Inputs:
 * - points: daily ratings (already grouped per day)
 * - daysConsidered: e.g. 14
 * - tags: partner-level tags from check-ins / report / notes
 */
export function classifyPartnerEmotionState(args: {
  userId: string;
  points: DailyPoint[]; // sorted by day asc
  daysConsidered: number;
  tags: string[];
}): PartnerEmotionResult {
  const { userId, points, daysConsidered } = args;

  const ratings = points.map((p) => p.rating);
  const daysCheckedIn = points.length;
  const missingDays = Math.max(0, daysConsidered - daysCheckedIn);

  const avg = ratings.length ? mean(ratings) : null;
  const last = ratings.length ? ratings[ratings.length - 1] : null;

  const s = slope(points); // approx rating change per day
  const vol = stddev(ratings);

  const t = tagSignals(args.tags);

  // --- Heuristic scoring ---
  // “Health”
  const avgScore = avg == null ? 0 : (avg - 1) / 4; // map 1..5 => 0..1
  const trendScore = clamp01((s + 0.15) / 0.3); // slope -0.15..+0.15 => 0..1
  const stabilityScore = clamp01(1 - vol / 1.25); // vol ~0..1.25+
  const habitScore = clamp01(daysCheckedIn / Math.max(1, Math.min(daysConsidered, 7))); // normalize over a week-ish
  const clarityScore = clamp01(
    // tags help explain what’s happening
    (t.totalCount ? 0.6 : 0) + (t.concentration >= 0.5 ? 0.3 : 0) + (t.uniqueCount >= 1 ? 0.1 : 0)
  );

  // Weighted “overall signal”
  const overall =
    0.35 * avgScore +
    0.20 * trendScore +
    0.20 * stabilityScore +
    0.15 * habitScore +
    0.10 * clarityScore;

  // --- Decide state via rules (more interpretable than pure score) ---
  const reasons: string[] = [];

  const lowHabit = daysCheckedIn <= Math.floor(daysConsidered * 0.25);
  const lowAvg = avg != null && avg < 3.0;
  const highAvg = avg != null && avg >= 4.0;

  const downTrend = s <= -0.08;
  const upTrend = s >= 0.08;

  const highVol = vol >= 0.9;
  const midVol = vol >= 0.55 && vol < 0.9;

  let state: EmotionState = "Mixed Signals";

  if (avg == null || daysCheckedIn === 0) {
    state = "Disconnected";
    reasons.push("No recent check-ins to read emotional signals.");
  } else if (highAvg && !downTrend && !highVol) {
    state = "Secure & Connected";
    reasons.push("Strong average rating with stable pattern.");
  } else if (lowAvg && (downTrend || highVol)) {
    state = "Tense";
    reasons.push("Low average with downward momentum or emotional swings.");
  } else if (lowAvg && lowHabit) {
    state = "Disconnected";
    reasons.push("Low ratings plus very few check-ins (low visibility/engagement).");
  } else if (!lowAvg && downTrend) {
    state = "Drifting";
    reasons.push("Not in crisis, but connection is sliding week-over-week.");
  } else if (lowAvg && upTrend) {
    state = "Rebuilding";
    reasons.push("Ratings are still low, but trend is improving—repair is working.");
  } else if (midVol) {
    state = "Mixed Signals";
    reasons.push("Inconsistent days/ratings suggest mixed emotional experience.");
  } else {
    // fallback based on overall score
    if (overall >= 0.72) state = "Secure & Connected";
    else if (overall >= 0.55) state = "Rebuilding";
    else if (overall >= 0.42) state = "Drifting";
    else if (overall >= 0.28) state = "Mixed Signals";
    else state = "Tense";
  }

  // Add tag-based interpretability
  if (t.topTags.length) reasons.push(`Top expressed needs/signals: ${t.topTags.join(", ")}.`);
  if (lowHabit) reasons.push("Low consistency reduces emotional clarity; a tiny daily ritual can help.");

  // Confidence: more data + stronger patterns => higher confidence
  const dataConfidence = clamp01(daysCheckedIn / Math.min(daysConsidered, 7)); // saturate around 7 days
  const patternStrength = clamp01(
    0.4 * Math.abs(s) / 0.2 + // stronger slope => stronger signal
      0.3 * (avg != null ? Math.abs(avg - 3) / 2 : 0) + // far from neutral => clearer
      0.3 * (1 - Math.min(1, vol / 1.25))
  );

  const confidence = clamp01(0.45 * dataConfidence + 0.55 * patternStrength);

  return {
    userId,
    state,
    emoji: emojiFor(state),
    confidence: round2(confidence),
    reasons,
    metrics: {
      daysConsidered,
      daysCheckedIn,
      avgRating: avg == null ? null : round2(avg),
      lastRating: last == null ? null : round2(last),
      trendSlope: round2(s),
      volatility: round2(vol),
      missingDays,
      topTags: t.topTags,
    },
  };
}
