/* lib/reportV3.ts */
import type { CheckInRow } from "@/lib/reportV2";

const LOVE = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"] as const;
export type LoveTag = (typeof LOVE)[number];

export type ToneObj = {
  name: string;
  emoji: string;
  style: "direct" | "warm" | "playful" | "reflective";
};

export type LoveProfileLite = {
  userId: string;
  primaryLanguage: LoveTag;
  secondaryLanguage: LoveTag | null;
  avoidList: any | null;
  expressionStyle: any | null;
  completedAt: Date | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function safeText(x: unknown) {
  return String(x ?? "").replace(/\s+/g, " ").trim();
}
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function pickFirstMeaningful(lines: string[], max = 3) {
  const out: string[] = [];
  for (const l of lines) {
    const t = safeText(l);
    if (t.length < 6) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Rewrites text to be clean + premium.
 * IMPORTANT:
 * - For STORY: pass a large maxLen or null to never truncate.
 * - For bullets: you can keep a smaller maxLen.
 */
function toneRewriteText(input: string, opts?: { maxLen?: number | null }) {
  let t = safeText(input);
  if (!t) return t;

  // punctuation hygiene
  t = t.replace(/\s*([.?!])\s*$/g, "$1");

  // simple casing improvements
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/\bi\b/g, "I");

  // soften filler
  t = t.replace(/\bkind of\b/gi, "a bit");
  t = t.replace(/\bvery\b/gi, "really");

  // OPTIONAL truncation (default: NO truncation unless maxLen is provided)
  const maxLen = opts?.maxLen;
  if (typeof maxLen === "number" && maxLen > 20 && t.length > maxLen) {
    t = t.slice(0, Math.max(0, maxLen - 1)) + "…";
  }

  return t;
}

function toneFromIndex(toneIndex: number): ToneObj {
  const idx = ((toneIndex % 4) + 4) % 4;
  switch (idx) {
    case 0:
      return { name: "Warm & Celebratory", emoji: "✨", style: "warm" };
    case 1:
      return { name: "Clear & Grounded", emoji: "🧭", style: "direct" };
    case 2:
      return { name: "Reflective & Deep", emoji: "🪞", style: "reflective" };
    default:
      return { name: "Playful & Light", emoji: "🎈", style: "playful" };
  }
}

function labelBondScore(score: number) {
  if (score >= 85) return "Thriving";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Growing";
  if (score >= 40) return "Unsteady";
  return "Needs Care";
}

function computeBondScore(args: {
  connectionScore: number;
  alignment: number | null;
  momentum: number | null;
  stability: number | null;
  habit: number;
}) {
  const connection = clamp((args.connectionScore / 5) * 100, 0, 100);
  const alignmentPct =
    args.alignment == null ? 70 : clamp((args.alignment / 5) * 100, 0, 100);
  const momentumPct =
    args.momentum == null ? 70 : clamp((args.momentum / 5) * 100, 0, 100);

  let stabilityPct = 70;
  if (typeof args.stability === "number") {
    const inv = 1 - clamp(args.stability / 2, 0, 1);
    stabilityPct = inv * 100;
  }

  const habitPct = clamp((args.habit / 5) * 100, 0, 100);

  const score =
    0.42 * connection +
    0.18 * alignmentPct +
    0.14 * momentumPct +
    0.14 * stabilityPct +
    0.12 * habitPct;

  return clamp(Math.round(score), 0, 100);
}

function partnerActionsFor(tag: LoveTag) {
  switch (tag) {
    case "TIME":
      return [
        "Block out **at least** 15 minutes of phone-free time together — treat it like an appointment.",
        "Ask one question and listen fully: “What would make you feel most supported today?”",
        "Do one small shared ritual (tea, walk, music) — **at least once** this week.",
      ];
    case "TOUCH":
      return [
        "Make touch a gentle part of everyday moments—hold hands, sit close, hug longer, or offer a reassuring arm around them (only if it feels welcome).",
        "Check in with one simple question: “What kind of touch feels comforting for you lately?” Then follow their lead.",
        "Create a calm closeness moment when it naturally fits—cuddling, leaning into each other, or quiet contact with no screens for a few minutes.",
      ];
    case "WORDS":
      return [
        "Give **at least one** specific appreciation daily (effort + character, not just results).",
        "Say one clean sentence: “I noticed ___, and it meant a lot to me.”",
        "Send a short midday message that reassures: “I’m with you today.”",
      ];
    case "SERVICE":
      return [
        "Take **one** friction task off their plate without asking (something they dislike).",
        "Prep tomorrow in one helpful way (meal, plan, reminder, logistics).",
        "Choose one chore and finish it fully — no half-done version.",
      ];
    case "GIFTS":
      return [
        "Bring **one** small thoughtful item tied to what they like (snack, note, tiny comfort).",
        "Leave a short handwritten note somewhere they’ll find it.",
        "Make a micro-surprise that shows you remembered something they said.",
      ];
    default:
      return [];
  }
}

function buildPartnerMirror(args: {
  viewerUserId: string;
  loveProfiles: LoveProfileLite[];
}) {
  const profiles = args.loveProfiles ?? [];
  const partnerProfile = profiles.find((p) => p.userId !== args.viewerUserId);

  if (!partnerProfile) {
    return {
      title: "What your partner likely needs most this week",
      subtitle: "Complete both love profiles to unlock this section.",
      needs: [] as LoveTag[],
      actions: [] as string[],
    };
  }

  const needs = [partnerProfile.primaryLanguage, partnerProfile.secondaryLanguage].filter(
    Boolean
  ) as LoveTag[];

  const actions = needs
    .flatMap((t) => partnerActionsFor(t).slice(0, 2))
    .slice(0, 3);

  return {
    title: "What your partner likely needs most this week",
    subtitle: "Based on your partner’s Love Profile (primary/secondary) — not just weekly tags.",
    needs,
    actions,
  };
}

function buildWhatYouDidRight(args: { thisWeek: CheckInRow[]; viewerUserId: string }) {
  const partnerLines = args.thisWeek
    .filter((c) => c.userId !== args.viewerUserId)
    .map((c) => safeText(c.whatMadeMeFeelLoved))
    .filter(Boolean);

  if (partnerLines.length === 0) {
    return {
      title: "What you did right",
      bullets: [
        "No partner check-in text yet — once they submit, this section becomes beautifully personal.",
      ],
    };
  }

  const cleaned = pickFirstMeaningful(partnerLines, 3).map((s) =>
    toneRewriteText(s, { maxLen: 260 })
  );

  const bullets = cleaned.map((s) => `You showed up in a way that landed: “${s}”`);
  return { title: "What you did right", bullets };
}

function buildWeeklyChallenge(args: {
    topThemes: string[];
    partnerMirrorNeeds: LoveTag[];
    momentum?: any;
    alignmentLabel?: string;
  }) {
    const themes = (args.topThemes ?? []).map((t) => String(t).toUpperCase());
    const needs = args.partnerMirrorNeeds ?? [];
  
    // Pick an anchor that reflects "unmet" needs best.
    // Priority: partner profile > weekly themes > fallback
    const anchor = (needs[0] ?? (themes[0] as LoveTag) ?? "TIME") as LoveTag;
  
    const alignment = String(args.alignmentLabel ?? "").toLowerCase();
    const momentumLabel = String(args.momentum ?? "").toLowerCase();
  
    const isFragile =
      alignment.includes("low") ||
      alignment.includes("unsteady") ||
      momentumLabel.includes("down") ||
      momentumLabel.includes("decline") ||
      momentumLabel.includes("weak");
  
    const intro = isFragile
      ? "Keep it gentle. Small moments count more than big gestures this week."
      : "A small mission that creates a big shift—without feeling forced.";
  
    // Helpers to avoid robotic, mechanical tone
    const soften = (s: string) =>
      s
        .replace(/\bat least\b/gi, "")
        .replace(/\bone\b/gi, "a")
        .replace(/\s{2,}/g, " ")
        .trim();
  
    // ===== TIME (Presence) =====
    if (anchor === "TIME") {
      return {
        subtitle: intro,
        theme: "Presence",
        title: "A Presence Reset",
        steps: [
          soften("Pick one short pocket of phone-free time and be fully together."),
          soften("Ask: “What would help you feel cared for today?” and listen without fixing."),
          soften("End the day with one sincere appreciation each—simple and specific."),
          soften(
            "If it feels good for both of you, add a little more warm touch naturally—hugs, hand-holding, sitting close."
          ),
        ],
        successMetric: isFragile
          ? "Aim for consistency, not perfection—two meaningful moments is a win."
          : "If you do this most days, you’ll feel the difference by the weekend.",
      };
    }
  
    // ===== TOUCH (Closeness) =====
    if (anchor === "TOUCH") {
      return {
        subtitle: intro,
        theme: "Closeness",
        title: "The Closeness Challenge",
        steps: [
          "When either of you is going out or coming back, share a 20-second hug—long enough to actually settle.",
          soften(
            "Bring touch into normal moments in a natural way—hand-holding, a gentle squeeze, sitting close—only if it feels good for both of you."
          ),
          soften(
            "Ask: “What kind of touch feels comforting for you lately?” and honor the answer."
          ),
          soften(
            "Create more warm, consensual physical closeness whenever it fits—hugs, cuddling, affectionate contact that feels safe and welcome."
          ),
        ],
        successMetric: isFragile
          ? "Keep it light and safe—one genuine reconnect is enough to shift the tone."
          : "If this becomes natural, closeness stops feeling like effort.",
      };
    }
  
    // ===== WORDS =====
    if (anchor === "WORDS") {
      return {
        subtitle: intro,
        theme: "Affirmation",
        title: "Speak It Out Loud",
        steps: [
          soften("Once a day, name one thing you appreciate—effort, character, or care."),
          "Say a clean sentence: “I noticed ___, and it meant a lot to me.”",
          soften("Send a short message that reassures: “I’m with you today.”"),
          soften(
            "If it fits, add warmth through closeness too—gentle touch, a hug, sitting near—whatever feels welcome."
          ),
        ],
        successMetric: isFragile
          ? "Don’t over-explain—simple warmth lands best this week."
          : "If you do this consistently, it changes the emotional climate fast.",
      };
    }
  
    // ===== SERVICE =====
    if (anchor === "SERVICE") {
      return {
        subtitle: intro,
        theme: "Support",
        title: "Make It Easier",
        steps: [
          soften("Notice one task that drains them and quietly take it off their plate."),
          soften("Do one helpful thing start-to-finish (no half-done version)."),
          soften("Ask: “What would help you feel supported this week?” and follow through."),
          soften(
            "Add warmth in the background—presence, softness, closeness—without needing a big moment."
          ),
        ],
        successMetric: isFragile
          ? "One steady act of support is stronger than a big speech this week."
          : "If you do this a few times, it builds trust fast.",
      };
    }
  
    // ===== GIFTS =====
    if (anchor === "GIFTS") {
      return {
        subtitle: intro,
        theme: "Thoughtfulness",
        title: "Small Thoughtful Signals",
        steps: [
          soften("Do a small “I thought of you” gesture tied to what they actually like."),
          "Leave a short note somewhere they’ll find it.",
          soften("Bring one micro-surprise that shows you remembered something they said."),
          soften(
            "Pair it with warmth—presence, affection, closeness—whatever feels good and welcome."
          ),
        ],
        successMetric: isFragile
          ? "Keep it simple and sincere—too much can feel heavy this week."
          : "Small thoughtful signals create big emotional safety over time.",
      };
    }
  
    // Fallback
    return {
      subtitle: intro,
      theme: "Connection",
      title: "A Gentle Reconnect",
      steps: [
        soften("Choose one calm moment to reconnect—no multitasking."),
        soften("Say one appreciation out loud (specific + sincere)."),
        soften("Do one small action that makes their day easier."),
        soften("Ask: “What would help you feel closer to me this week?”"),
      ],
      successMetric: isFragile
        ? "Keep it gentle—consistency matters more than intensity."
        : "Two or three solid moments this week is a strong win.",
    };
}
  

function formatBondBreakdown(args: {
  connection: number;
  alignment: number | null;
  momentum: number | null;
  stability: number | null;
  habit: number;
}) {
  const parts: string[] = [];
  parts.push(`Connection ${round1(args.connection)}/5`);

  parts.push(
    `Alignment ${
      typeof args.alignment === "number" ? `${round1(args.alignment)}/5` : "—"
    }`
  );

  parts.push(
    `Momentum ${
      typeof args.momentum === "number" ? `${round1(args.momentum)}/5` : "—"
    }`
  );

  // you were showing “78%” — keep that style:
  const stabilityPct =
    typeof args.stability === "number" ? `${Math.round(args.stability * 100)}%` : "—";
  parts.push(`Stability ${stabilityPct}`);

  parts.push(`Habit ${clamp(args.habit, 0, 5)}/5`);

  return `**Breakdown:** ${parts.join(" • ")}`;
}

export function buildV31Report(args: {
  weekStartISO: string;
  toneIndex: number;
  tone?: any;
  viewerUserId: string;

  thisWeek: CheckInRow[];
  prevWeekAvg: number | null;

  partnerSummaries: any[];
  topThemes: string[];

  connectionScore: number;
  stability: number | null;

  // momentum may be a label or number; we keep both
  momentum: any;

  alignmentScore: number | null;
  alignmentLabel: "unknown" | "strong" | "medium" | "low" | string;

  story: string;
  coupleInsights: string[];

  loveProfiles: LoveProfileLite[];
}) {
  const toneObj = toneFromIndex(args.toneIndex);

  // habit: reward consistent check-ins (0–5)
  const habitScore = clamp(args.thisWeek.length, 0, 5);

  // try to extract numeric momentum if you’re using numbers
  const momentumNum = typeof args.momentum === "number" ? args.momentum : null;

  const bondScoreValue = computeBondScore({
    connectionScore: args.connectionScore,
    alignment: args.alignmentScore,
    momentum: momentumNum,
    stability: args.stability,
    habit: habitScore,
  });

  const partnerMirror = buildPartnerMirror({
    viewerUserId: args.viewerUserId,
    loveProfiles: args.loveProfiles ?? [],
  });

  const whatYouDidRight = buildWhatYouDidRight({
    thisWeek: args.thisWeek,
    viewerUserId: args.viewerUserId,
  });

  const weeklyChallenge = buildWeeklyChallenge({
    topThemes: args.topThemes ?? [],
    partnerMirrorNeeds: partnerMirror.needs ?? [],
    momentum: args.momentum ?? null,
    alignmentLabel: args.alignmentLabel ?? "unknown",
  });
  

  const connectionScore = round1(args.connectionScore);

  const breakdownObj = {
    connection: connectionScore,
    alignment: args.alignmentScore == null ? null : round1(args.alignmentScore),
    momentum: momentumNum == null ? null : round1(momentumNum),
    stability: args.stability == null ? null : Math.round(args.stability * 100) / 100,
    habit: habitScore,
  };

  return {
    version: "v3.1",
    weekStartISO: args.weekStartISO,

    tone: toneObj,

    // ✅ UI-friendly bondScore (works with your normalizeBondScore)
    bondScore: {
      value: bondScoreValue, // UI will pick this as score
      max: 100,
      label: labelBondScore(bondScoreValue),
      badge: labelBondScore(bondScoreValue),
      breakdown: formatBondBreakdown(breakdownObj),
      breakdownObj, // optional: keep raw numbers if you want
    },

    // ✅ rename for UI clarity
    connectionScore,
    stability: args.stability == null ? null : Math.round(args.stability * 100) / 100,

    // ✅ UI expects these to be displayable
    momentum: args.momentum ?? null,
    alignment: args.alignmentLabel ?? "unknown",

    // ✅ keep raw too (optional)
    alignmentScore: args.alignmentScore,
    alignmentLabel: args.alignmentLabel ?? "unknown",

    topThemes: uniq((args.topThemes ?? []).map((t) => String(t).toUpperCase())).slice(0, 3),

    // ✅ NO TRUNCATION on story
    story: toneRewriteText(String(args.story ?? ""), { maxLen: null }),

    // ✅ keep insights readable (no harsh truncation)
    coupleInsights: (args.coupleInsights ?? []).map((x) =>
      toneRewriteText(String(x ?? "").replace(/climate score/gi, "connection score"), {
        maxLen: 320,
      })
    ),

    whatYouDidRight,
    partnerMirror,
    weeklyChallenge,

    // ✅ UI expects partners (your UI checks view.partners OR view.partner)
    partners: args.partnerSummaries ?? [],
    partnerSections: args.partnerSummaries ?? [],
  };
}
