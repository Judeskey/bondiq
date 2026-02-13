// lib/reportV2.ts
export function formatLovedPhraseForDisplay(text: string) {
    if (!text) return text;
  
    let t = text.trim();
  
    // lowercase start for natural speech
    t = t.charAt(0).toLowerCase() + t.slice(1);
  
    // Convert to partner-voiced present tense
    return `I feel loved when you ${t.replace(/^when\s+/i, "")}`;
}  
export type LoveTag =
  | "WORDS"
  | "TIME"
  | "GIFTS"
  | "SERVICE"
  | "TOUCH"
  | "RESPECT"
  | "TRUST"
  | "SUPPORT"
  | "TEAMWORK"
  | "OTHER";

export type CheckInRow = {
  userId: string;
  rating: number; // 1..5
  whatMadeMeFeelLoved: string | null;
  languageTags: LoveTag[]; // <-- multiple tags
  createdAt: Date;
};

export type LoveProfile = {
  primary: LoveTag[]; // up to 3
  secondary: LoveTag[]; // up to 3
  notes?: string | null;
  avoidList?: string[]; // optional
};

export type PartnerSummary = {
  userId: string;
  avgRating: number | null;
  checkinCount: number;
  topTags: { tag: LoveTag; count: number }[];
  topLovedPhrases: string[]; // distilled from whatMadeMeFeelLoved
  highlights: {
    best?: Highlight;
    hardest?: Highlight | { type: "none"; label: string };
  };
  recommendations: Recommendation[];

  // ✅ NEW: drives “Next actions” section
  nextActions: string[];
};

export type Highlight = {
  rating: number;
  label: string; // humanized title
  detail: string; // humanized explanation
  tags: LoveTag[];
};

export type Recommendation = {
  tag: LoveTag;
  title: string;
  why: string;
  ideas: string[]; // each is a flexible “do at least X” type
};

export type ReportTone = {
  name: string;
  style: "warm" | "direct" | "playful" | "poetic" | "coachy";
  emoji: string;
};

export type WeeklyReportJsonV2 = {
  version: "v2";
  weekStartISO: string;
  tone: ReportTone;
  climateScore: number; // 0..5
  stability: number | null; // std dev, lower is steadier
  momentum: "up" | "down" | "flat" | "unknown";
  alignment: "strong" | "medium" | "low" | "unknown";
  topThemes: LoveTag[];
  story: string;
  coupleInsights: string[];
  partners: PartnerSummary[];
};

/** ---------- helpers ---------- */

export function clampRating(n: any): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.max(1, Math.min(5, Math.round(v)));
}

export function normalizeText(s: any): string {
  const t = String(s ?? "").trim();
  return t.length ? t : "";
}

export function toTitle(tag: LoveTag): string {
  switch (tag) {
    case "WORDS":
      return "Words of Affirmation";
    case "TIME":
      return "Quality Time";
    case "GIFTS":
      return "Receiving Gifts";
    case "SERVICE":
      return "Acts of Service";
    case "TOUCH":
      return "Physical Touch";
    case "RESPECT":
      return "Respect";
    case "TRUST":
      return "Trust";
    case "SUPPORT":
      return "Support";
    case "TEAMWORK":
      return "Teamwork";
    default:
      return "Other";
  }
}

export function pickTone(toneIndex: number): ReportTone {
  const tones: ReportTone[] = [
    { name: "Warm & Celebratory", style: "warm", emoji: "💛" },
    { name: "Clear & Grounded", style: "direct", emoji: "🧭" },
    { name: "Playful & Light", style: "playful", emoji: "✨" },
    { name: "Poetic & Reflective", style: "poetic", emoji: "🌙" },
    { name: "Coach Mode", style: "coachy", emoji: "🏁" },
  ];
  return tones[((toneIndex % tones.length) + tones.length) % tones.length];
}

export function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function stddev(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((acc, x) => acc + (x - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

export function topTags(checkins: CheckInRow[], topN = 2) {
  const counts = new Map<LoveTag, number>();
  for (const c of checkins) {
    for (const t of c.languageTags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag, count]) => ({ tag, count }));
}

export function distinctTopThemes(partners: PartnerSummary[], topN = 2): LoveTag[] {
  const all = new Map<LoveTag, number>();
  for (const p of partners) {
    for (const t of p.topTags) all.set(t.tag, (all.get(t.tag) ?? 0) + t.count);
  }
  return [...all.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag);
}

export function computeMomentum(currentAvg: number | null, prevAvg: number | null) {
  if (currentAvg == null || prevAvg == null) return "unknown" as const;
  const diff = currentAvg - prevAvg;
  if (diff >= 0.25) return "up" as const;
  if (diff <= -0.25) return "down" as const;
  return "flat" as const;
}

export function computeAlignment(partnerAvgs: Array<number | null>) {
  const vals = partnerAvgs.filter((x): x is number => typeof x === "number");
  if (vals.length < 2) return "unknown" as const;
  const diff = Math.abs(vals[0] - vals[1]);
  if (diff <= 0.4) return "strong" as const;
  if (diff <= 0.9) return "medium" as const;
  return "low" as const;
}

/**
 * V2 Highlight logic
 * - Best moment: highest rating entry
 * - Hardest moment: lowest rating entry ONLY IF rating <= 2
 * - Otherwise show "No major struggles reported..."
 */
export function buildHighlights(checkins: CheckInRow[], tone: ReportTone) {
  if (!checkins.length) {
    return {
      best: undefined,
      hardest: { type: "none" as const, label: "No check-ins yet this week." },
    };
  }

  const sortedHigh = [...checkins].sort((a, b) => b.rating - a.rating);
  const sortedLow = [...checkins].sort((a, b) => a.rating - b.rating);

  const bestRow = sortedHigh[0];
  const bestTags = bestRow.languageTags ?? [];
  const bestTagTitle = bestTags.length ? bestTags.map(toTitle).join(" + ") : "Connection";

  const best: Highlight = {
    rating: bestRow.rating,
    tags: bestTags,
    label: tone.style === "playful" ? `Peak connection (${bestRow.rating}/5)` : `Peak connection moment`,
    detail: bestRow.whatMadeMeFeelLoved?.trim()
      ? `You felt most loved through ${bestTagTitle.toLowerCase()}. “${bestRow.whatMadeMeFeelLoved.trim()}”.`
      : `You felt most loved through ${bestTagTitle.toLowerCase()}. That’s a strong signal of what lands emotionally.`,
  };

  const worstRow = sortedLow[0];
  if (worstRow.rating <= 2) {
    const hardTags = worstRow.languageTags ?? [];
    const hardTagTitle = hardTags.length ? hardTags.map(toTitle).join(" + ") : "Connection";
    const hardest: Highlight = {
      rating: worstRow.rating,
      tags: hardTags,
      label: tone.style === "direct" ? `Moment to fix (${worstRow.rating}/5)` : `Moment to reflect on`,
      detail: worstRow.whatMadeMeFeelLoved?.trim()
        ? `There was a dip around ${hardTagTitle.toLowerCase()}. “${worstRow.whatMadeMeFeelLoved.trim()}”. This is the clearest place to improve next week.`
        : `There was a dip around ${hardTagTitle.toLowerCase()}. Treat it as a gentle signal to adjust something small next week.`,
    };

    return { best, hardest };
  }

  // No truly hard moments reported
  return {
    best,
    hardest: {
      type: "none" as const,
      label: tone.style === "warm" ? "No major struggles reported this week 💛" : "No major struggles reported this week.",
    },
  };
}

function extractLovedPhrases(checkins: CheckInRow[], limit = 3) {
  const phrases = checkins.map((c) => normalizeText(c.whatMadeMeFeelLoved)).filter(Boolean);

  // simple dedupe
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of phrases) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildRecommendations(top: LoveTag[], tone: ReportTone): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const tag of top) {
    if (tag === "TOUCH") {
      recs.push({
        tag,
        title: "Physical Touch",
        why: "Touch showed up as a top theme — it’s one of the fastest ways to create emotional safety.",
        ideas: [
          "Start and end the day with **at least** a 20-second hug (longer is even better).",
          "Add small touchpoints during conversations (hand on shoulder, gentle contact).",
          "Sit closer during downtime instead of across the room.",
        ],
      });
    } else if (tag === "TIME") {
      recs.push({
        tag,
        title: "Quality Time",
        why: "Presence seems to be a core connector this week — undistracted time amplifies everything else.",
        ideas: [
          "Plan **at least one** 30-minute phone-free check-in this week.",
          "Choose one shared activity with no multitasking (walk, meal, or show).",
          "Create a “2-minute reconnection” moment daily (eye contact + quick catch-up).",
        ],
      });
    } else if (tag === "WORDS") {
      recs.push({
        tag,
        title: "Words of Affirmation",
        why: "Encouragement lands deeply here — small words can change the whole emotional climate.",
        ideas: [
          "Give **at least one** sincere appreciation daily (specific, not generic).",
          "Send a short supportive text during the day (one sentence is enough).",
          "End the day by naming one thing you valued about them today.",
        ],
      });
    } else if (tag === "SERVICE") {
      recs.push({
        tag,
        title: "Acts of Service",
        why: "Practical help often reads as love — it reduces stress and builds teamwork.",
        ideas: [
          "Take **at least one** annoying task off their plate this week.",
          "Ask: “What would make your day 10% easier?” — then do that.",
          "Choose one chore to ‘own’ completely for the week.",
        ],
      });
    } else if (tag === "GIFTS") {
      recs.push({
        tag,
        title: "Receiving Gifts",
        why: "Thoughtful tokens can represent attention and care — it’s the meaning, not the price.",
        ideas: [
          "Give **at least one** small thoughtful item this week (snack, note, favorite thing).",
          "Pair any gift with one sentence explaining why you chose it.",
          "Create a ‘memory gift’ (photo, playlist, or shared moment) instead of buying.",
        ],
      });
    } else {
      recs.push({
        tag,
        title: toTitle(tag),
        why: "This theme appeared in your week — leaning into it strengthens connection.",
        ideas: [
          "Do **at least one** intentional action aligned with this theme this week.",
          "Ask your partner what this theme looks like to them (their definition matters).",
          "Repeat what worked this week, but add 10% more intention.",
        ],
      });
    }
  }

  // Tone tweak: playful/poetic adds extra softness
  if (tone.style === "poetic") {
    for (const r of recs) {
      r.ideas = r.ideas.map((i) => i.replace(/\.$/, " — small moments become big memories."));
    }
  }

  return recs;
}

// lib/reportV2.ts

type Tone = "celebratory" | "coach" | "reflective" | "playful" | "direct" | string;

export function buildStory(opts: {
  tone: Tone;
  climateScore: number; // you may rename elsewhere, but keep param to avoid breaking callers
  themes: string[];
  stability: number | null;
  momentum: any;
  alignment: any;
}) {
  const { tone, climateScore, themes, stability, momentum, alignment } = opts;

  const themeText =
    Array.isArray(themes) && themes.length > 0 ? `${themes.slice(0, 2).join(" and ")}` : "how love landed";

  const score = typeof climateScore === "number" ? climateScore : 0;

  const stabilityLine =
    typeof stability === "number"
      ? stability < 0.6
        ? "Emotions varied more than usual — that’s not “bad,” it just means this week was more sensitive."
        : "Your week showed steady emotional consistency, which is a quiet relationship superpower."
      : "Stability will become clearer as more check-ins land.";

  // Turn metric objects into readable words (never return 'unknown')
  const labelOf = (x: any) => {
    if (!x) return "not enough data yet";
    if (typeof x === "string") return x;
    if (typeof x?.label === "string") return x.label;
    if (typeof x?.name === "string") return x.name;
    return "not enough data yet";
  };

  const momentumText = labelOf(momentum);
  const alignmentText = labelOf(alignment);

  const openers: Record<string, string> = {
    celebratory: "This week had a bright, connected energy.",
    coach: "This week gives you a clear, practical path forward.",
    reflective: "This week reveals a meaningful pattern worth noticing.",
    playful: "This week had a light, lovable vibe — with a lesson inside it.",
    direct: "Here’s what stood out most this week.",
  };

  const opener = openers[String(tone)] ?? "Here’s what stood out most this week.";

  // ✅ IMPORTANT: no truncate(), no slice(), no “...”
  // We return the full paragraph every time.
  return [
    `${opener}`,
    `Your connection score averaged ${Math.round(score * 10) / 10}/5, and ${themeText} played a big role in what felt most loving.`,
    `Alignment is currently ${alignmentText}, and momentum is ${momentumText}.`,
    `${stabilityLine}`,
    `If you want an even stronger week: keep check-ins coming from both partners — it sharpens the “mirror” insights and makes challenges feel custom-made.`,
  ].join(" ");
}

export function buildCoupleInsights(params: {
  themes: LoveTag[];
  climateScore: number;
  stability: number | null;
  momentum: "up" | "down" | "flat" | "unknown";
}) {
  const { themes, climateScore, stability, momentum } = params;
  const insights: string[] = [];

  insights.push(`This week’s climate score is ${climateScore.toFixed(1)} / 5.`);

  if (themes.length) {
    insights.push(`Top themes this week: ${themes.map((t) => t).join(", ")}.`);
  }

  if (stability == null) {
    insights.push("Stability will appear after at least 2 check-ins.");
  } else if (stability <= 0.6) {
    insights.push("Your connection was steady — consistency is a relationship superpower.");
  } else {
    insights.push("There were some emotional swings — try to add small daily anchors.");
  }

  if (momentum === "up") insights.push("Momentum is up — protect what’s working and repeat it.");
  if (momentum === "down") insights.push("Momentum is down — focus on one repair action, not ten.");
  if (momentum === "flat") insights.push("Momentum is stable — small intentional upgrades will create growth.");

  return insights;
}

/** ✅ NEW: Next Actions generator */
function buildNextActions(opts: {
  avgRating: number | null;
  checkins: CheckInRow[];
  topThemes: LoveTag[];
  tone: ReportTone;
}) {
  const actions: string[] = [];
  const { avgRating, checkins, topThemes, tone } = opts;

  // Need at least 2 check-ins to detect a direction
  if (checkins.length < 2) return actions;

  const sorted = [...checkins].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const dip = (last?.rating ?? 0) - (prev?.rating ?? 0);

  // If there was a dip, suggest a short repair/reset
  if (dip <= -1) {
    actions.push(
      tone.style === "direct"
        ? "Do a 10-minute repair: one appreciation + one need, then agree on one small change for tomorrow."
        : "Try a 10-minute reset: share one appreciation + one need, then pick one tiny improvement for tomorrow."
    );
  }

  // Theme-based action (use the strongest theme)
  const t = topThemes?.[0];

  if (t === "TIME") {
    actions.push("Schedule one 30-minute distraction-free moment this week (walk, tea, or a couch check-in).");
  } else if (t === "WORDS") {
    actions.push("Send one specific appreciation daily (what they did + how it made you feel).");
  } else if (t === "SERVICE" || t === "SUPPORT" || t === "TEAMWORK") {
    actions.push("Choose one helpful action you’ll do this week without being asked (small but consistent).");
  } else if (t === "TOUCH") {
    actions.push("Create a simple daily touch ritual (30-second hug, hand-hold, or goodnight cuddle).");
  } else if (t === "TRUST") {
    actions.push("Pick one trust builder: keep one promise small enough to complete daily for 3 days.");
  } else if (t === "RESPECT") {
    actions.push("Practice one respect habit: soften tone + restate what you heard before responding.");
  } else {
    actions.push("Ask one good question: “What would make you feel most supported right now?” then reflect back what you heard.");
  }

  // If avg is below strong, add one stabilizer
  if (typeof avgRating === "number" && avgRating < 4.0) {
    actions.push("Pick one recurring friction and run a tiny 3-day experiment (one change, then review together).");
  }

  // Return 2–3 max, unique
  return Array.from(new Set(actions)).slice(0, 3);
}

export function buildPartnerSummary(args: {
  userId: string;
  checkins: CheckInRow[];
  tone: ReportTone;
}): PartnerSummary {
  const { userId, checkins, tone } = args;
  const ratings = checkins.map((c) => c.rating);
  const avg = mean(ratings);
  const top = topTags(checkins, 3);
  const themes = top.map((t) => t.tag).slice(0, 2);
  const loved = extractLovedPhrases(checkins, 3);
  const highlights = buildHighlights(checkins, tone);
  const recs = buildRecommendations(themes, tone);

  // ✅ Compute next actions (only when patterns exist)
  const nextActions = buildNextActions({
    avgRating: avg,
    checkins,
    topThemes: themes,
    tone,
  });

  return {
    userId,
    avgRating: avg == null ? null : Math.round(avg * 10) / 10,
    checkinCount: checkins.length,
    topTags: top,
    topLovedPhrases: loved.map(formatLovedPhraseForDisplay),
    highlights,
    recommendations: recs,
    nextActions, // ✅ NEW
  };
}
