// lib/narrativePersonalizer.ts

import { generateNarrative, type NarrativeMemory } from "@/lib/generateNarrative";

type CheckInRow = {
  userId: string;
  rating: number;
  languageTags?: string[] | null;
  note?: string | null;
  createdAt?: string;
};

function safeNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function extractPrevMemory(previousReportJson: any, windowDays: number): NarrativeMemory {
  // We keep this defensive: it works even if your reportJson shape evolves.
  const prevAvg =
    safeNumber(previousReportJson?.breakdownObj?.connection) ??
    safeNumber(previousReportJson?.connectionScore) ??
    safeNumber(previousReportJson?.climateScore) ??
    null;

  const prevSummary =
    typeof previousReportJson?.narrative?.overall?.summary === "string"
      ? previousReportJson.narrative.overall.summary
      : typeof previousReportJson?.story === "string"
      ? previousReportJson.story
      : null;

  const prevWindowDays =
    safeNumber(previousReportJson?.meta?.windowDays) ?? safeNumber(previousReportJson?.windowDays) ?? null;

  return {
    previousAvgRating: prevAvg,
    previousSummary: prevSummary,
    previousWindowDays: prevWindowDays ?? windowDays,
  };
}

export function buildPersonalizedNarratives(args: {
  coupleId: string;
  windowDays: number;
  checkIns: CheckInRow[];
  insights: any;
  emotionStates: any[];
  loveProfileByUserId?: Record<string, { primary?: string; secondary?: string }>;

  // ✅ Stage 7.3: pass last week reportJson here
  previousReportJson?: any;
}) {
  const {
    checkIns,
    insights,
    emotionStates,
    loveProfileByUserId,
    windowDays,
    previousReportJson,
  } = args;

  const memory = previousReportJson ? extractPrevMemory(previousReportJson, windowDays) : undefined;

  const overall = generateNarrative({
    windowDays,
    insights,
    emotionStates,
    recentCheckIns: checkIns.map((c) => ({
      rating: c.rating,
      languageTags: Array.isArray(c.languageTags) ? c.languageTags : [],
      note: c.note ?? null,
    })),
    loveProfile: undefined,
    memory,
  });

  const byPartner: Record<string, any> = {};
  const userIds = Array.from(new Set(checkIns.map((c) => c.userId)));

  for (const userId of userIds) {
    const mine = checkIns.filter((c) => c.userId === userId);

    byPartner[userId] = generateNarrative({
      windowDays,
      insights,
      emotionStates,
      recentCheckIns: mine.map((c) => ({
        rating: c.rating,
        languageTags: Array.isArray(c.languageTags) ? c.languageTags : [],
        note: c.note ?? null,
      })),
      loveProfile: loveProfileByUserId?.[userId],
      memory,
    });
  }

  return { overall, byPartner };
}
