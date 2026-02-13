// lib/generateNarrative.ts

export type NarrativeTone = "gentle" | "supportive" | "encouraging";

export type NarrativeCheckIn = {
  rating: number;
  languageTags?: string[] | null;
  note?: string | null;
};

export type LoveProfile = {
  primary?: string;
  secondary?: string;
};

export type NarrativeMemory = {
  previousAvgRating?: number | null;
  previousSummary?: string | null;
  previousWindowDays?: number | null;
};

export type NarrativeInput = {
  recentCheckIns: NarrativeCheckIn[];

  // Optional (safe to pass or omit)
  windowDays?: number;
  insights?: any;
  emotionStates?: any[];
  loveProfile?: LoveProfile;

  // ✅ Stage 7.3
  memory?: NarrativeMemory;
};

export type NarrativeOutput = {
  summary: string;
  reflection: string;
  coaching: string[];
  tone: NarrativeTone;

  // ✅ Stage 7.3 (additive, UI can choose to render)
  memoryLine?: string;
};

function collectRecentTags(checkIns: NarrativeCheckIn[]) {
  const out: string[] = [];
  for (const c of checkIns) {
    const tags = Array.isArray(c.languageTags) ? c.languageTags : [];
    for (const t of tags) out.push(String(t));
  }
  return out;
}

function detectUnmetNeeds(tags: string[]) {
  const needs: string[] = [];
  const set = new Set(tags.map((t) => String(t).toUpperCase()));

  if (set.has("LONELY") || set.has("DISCONNECTED")) needs.push("connection");
  if (set.has("UNAPPRECIATED") || set.has("TAKEN_FOR_GRANTED")) needs.push("appreciation");
  if (set.has("NEGLECTED") || set.has("NO_TIME")) needs.push("quality time");
  if (set.has("OVERWHELMED") || set.has("STRESSED")) needs.push("support");

  return [...new Set(needs)];
}

function averageRating(checkIns: NarrativeCheckIn[]) {
  if (!checkIns.length) return 0;
  let sum = 0;
  let count = 0;
  for (const c of checkIns) {
    const n = Number(c.rating);
    if (!Number.isFinite(n)) continue;
    sum += n;
    count++;
  }
  return count ? sum / count : 0;
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta * 10) / 10}`;
}

export function generateNarrative(input: NarrativeInput): NarrativeOutput {
  const recentCheckIns = Array.isArray(input?.recentCheckIns) ? input.recentCheckIns : [];
  const insights = input?.insights ?? {};
  const loveProfile = input?.loveProfile;
  const windowDays = typeof input?.windowDays === "number" ? input.windowDays : undefined;

  const avg = averageRating(recentCheckIns);
  const dips = recentCheckIns.filter((c) => Number(c.rating) <= 2).length;

  const tags = collectRecentTags(recentCheckIns);
  const unmetNeeds = detectUnmetNeeds(tags);

  const recentNotes = recentCheckIns
    .map((c) => (typeof c.note === "string" ? c.note.trim() : ""))
    .filter((s) => s.length > 0)
    .slice(0, 2);

  const tone: NarrativeTone = avg >= 4 ? "encouraging" : avg >= 3 ? "supportive" : "gentle";

  // ✅ Stage 7.3: memory line
  let memoryLine: string | undefined = undefined;
  const prevAvg = input?.memory?.previousAvgRating;

  if (typeof prevAvg === "number" && Number.isFinite(prevAvg)) {
    const delta = avg - prevAvg;
    if (Math.abs(delta) >= 0.2) {
      if (delta > 0) {
        memoryLine = `Compared to last week, your connection looks **up ${formatDelta(
          delta
        )}** on average — progress is showing.`;
      } else {
        memoryLine = `Compared to last week, your connection looks **down ${formatDelta(
          delta
        )}** on average — not failure, just a signal to slow down and reconnect.`;
      }
    } else {
      memoryLine = `Compared to last week, things look **mostly steady** — consistency is doing work.`;
    }
  }

  let summary =
    avg >= 4
      ? "Your recent check-ins suggest a generally positive connection with moments of warmth."
      : avg >= 3
      ? "Your recent check-ins show a steady connection with natural ups and downs."
      : "Your recent check-ins suggest some strain — a gentle signal to slow down and reconnect.";

  if (insights?.midWeekDip) {
    summary += " A small mid-week dip pattern may be showing up when routines get busy.";
  }
  if (insights?.volatility === "HIGH") {
    summary += " Emotions have fluctuated more than usual lately.";
  }
  if (typeof windowDays === "number" && windowDays > 0) {
    summary += ` (Window: ${windowDays} days.)`;
  }

  // carry prior narrative context softly (no hard dependency)
  const prevSummary = input?.memory?.previousSummary;
  if (typeof prevSummary === "string" && prevSummary.trim().length > 0) {
    summary += " This week builds on what you’ve been working through together.";
  }

  let reflection = "Small daily moments are shaping how you both feel.";

  if (unmetNeeds.length) {
    reflection += ` Some signals point to a need for more ${unmetNeeds.join(" and ")}.`;
  }

  if (loveProfile?.primary) {
    reflection += ` Feeling loved may connect strongly to ${loveProfile.primary.toLowerCase()} right now.`;
  }

  if (dips >= 2) {
    reflection += " A couple of lower-energy days showed up, which is often a cue to reconnect gently.";
  }

  if (recentNotes.length) {
    reflection += ` A recent note that stood out: “${recentNotes[0]}”`;
  }

  const coaching: string[] = [];
  const primary = (loveProfile?.primary ?? "").toUpperCase();

  if (primary === "WORDS") {
    coaching.push("Share one specific appreciation today — one sentence is enough.");
  } else if (primary === "TIME") {
    coaching.push("Plan 15 minutes of distraction-free time together this week.");
  } else if (primary === "ACTIONS") {
    coaching.push("Pick one small practical support action that would noticeably help your partner.");
  } else if (primary === "GIFTS") {
    coaching.push("Offer a small thoughtful gesture that shows you noticed them.");
  } else if (primary === "TOUCH") {
    coaching.push(
      "Create a warm, consensual touch moment (a hug or hand-hold) that feels good for both of you."
    );
  }

  if (unmetNeeds.includes("connection")) {
    coaching.push("Ask: “How are you really feeling today?” and listen without fixing immediately.");
  }
  if (unmetNeeds.includes("appreciation")) {
    coaching.push("Name one thing you value about your partner and one thing you noticed them do.");
  }
  if (unmetNeeds.includes("quality time")) {
    coaching.push("Create a small ritual: a short walk, tea together, or a check-in before bed.");
  }
  if (unmetNeeds.includes("support")) {
    coaching.push("Offer a concrete support choice: “Would you prefer help or quiet company?”");
  }

  const trigger = Array.isArray(insights?.recoveryTriggers) ? insights.recoveryTriggers[0] : null;
  if (trigger) {
    coaching.push(
      `Better days often follow ${String(trigger).toLowerCase()} — lean into that this week.`
    );
  }

  if (coaching.length < 2) {
    coaching.push("Keep noticing the small positive moments — they quietly strengthen connection.");
    coaching.push("If today feels off, try a soft reset: a kind message, a small favor, or a gentle check-in.");
  }

  return {
    summary,
    reflection,
    coaching: coaching.slice(0, 4),
    tone,
    ...(memoryLine ? { memoryLine } : {}),
  };
}
