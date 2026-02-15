// app/app/reports/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TrendsChartCard from "@/components/reports/TrendsChartCard";
import DailyTimelineBlock from "./components/DailyTimelineBlock";
import SuggestionsPanel from "./components/SuggestionsPanel";
import EmotionPanel from "@/components/emotion/EmotionPanel";
import InsightsPanel from "@/components/insights/InsightsPanel";
import type { ReportJson } from "@/lib/reportSchema";
import Link from "next/link";
import CommitmentCandles from "./components/CommitmentCandles";

import ReportEngagementTracker from "./components/ReportEngagementTracker";

type Report = {
  id: string;
  weekStart: string;
  toneIndex: number;
  reportJson: any;
};

type MemberInfo = {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  nickname: string | null;
  label: string;
};

type CoupleInfo = {
  viewerUserId: string;
  viewerLabel: string;
  partnerLabel: string;
  members: MemberInfo[];
  couple: { id: string; status: string };
};

type GenerateReportResponse = {
  ok: boolean;
  report?: {
    id: string;
    weekStart: string;
    toneIndex: number;
    reportJson: ReportJson;
  };
  error?: string;
};

function tagLabel(tag: string) {
  switch (tag) {
    case "WORDS":
      return "Words of Affirmation";
    case "TIME":
      return "Quality Time";
    case "GIFTS":
      return "Thoughtful Gifts";
    case "SERVICE":
      return "Acts of Support";
    case "TOUCH":
      return "Physical Touch";
    default:
      return tag;
  }
}

function asText(v: unknown) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function stripBoldMarkers(s: string) {
  return String(s || "").replace(/\*\*/g, "").trim();
}

function normalizeInsightCopy(s: unknown) {
  const t = asText(s);
  if (!t) return "";
  return t
    .replace(/climate score/gi, "connection score")
    .replace(/\bclimate\b/gi, "connection")
    .replace(/_toggle\b/gi, "")
    .replace(
      /Bonus:\s*add\s*one\s*small\s*physical(?:-|\s)?touch\s*gesture\s*on\s*day\s*3\.?/gi,
      "Bonus: add several moments of warm physical touch—hug longer, cuddle, or a gentle shoulder rub (whatever feels good and consensual for both of you)."
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderRichText(v: unknown) {
  const raw = asText(v);
  if (!raw) return null;
  const text = normalizeInsightCopy(raw);
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function normalizeTone(viewTone: any) {
  if (!viewTone) return { label: "—", emoji: "" };
  if (typeof viewTone === "string") return { label: viewTone, emoji: "" };
  const name = typeof viewTone?.name === "string" ? viewTone.name : "—";
  const emoji = typeof viewTone?.emoji === "string" ? viewTone.emoji : "";
  return { label: name, emoji };
}

function normalizeBondScore(raw: any) {
  if (raw == null) {
    return {
      score: null as number | null,
      max: 100,
      label: "This week",
      breakdown: null as any,
    };
  }

  if (typeof raw?.value === "number") {
    return {
      score: raw.value as number,
      max: 100,
      label: typeof raw.label === "string" ? raw.label : "This week",
      breakdown: raw.breakdown ?? null,
    };
  }

  if (typeof raw === "number") {
    return { score: raw, max: 100, label: "This week", breakdown: null };
  }

  const score =
    typeof raw.score === "number"
      ? raw.score
      : typeof raw.total === "number"
        ? raw.total
        : typeof raw.value === "number"
          ? raw.value
          : null;

  return {
    score,
    max: typeof raw.max === "number" ? raw.max : 100,
    label: typeof raw.label === "string" ? raw.label : "This week",
    breakdown: raw.breakdown ?? null,
  };
}

function normalizeMetricLabel(x: any) {
  if (x == null) return "—";
  if (typeof x === "string") return x;
  if (typeof x?.label === "string") return x.label;
  if (typeof x?.name === "string") return x.name;
  return "—";
}

function formatBreakdownValue(v: any) {
  if (v == null) return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v?.label === "string" && v.label.trim()) return v.label;
  if (typeof v?.name === "string" && v.name.trim()) return v.name;
  return "—";
}

function formatHabitValue(v: any) {
  if (v == null) return "—/5";

  if (typeof v === "number" && Number.isFinite(v)) return `${v}/5`;
  if (typeof v?.value === "number" && Number.isFinite(v.value)) return `${v.value}/5`;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return "—/5";
    if (/^\d+(\.\d+)?\s*\/\s*5$/i.test(s)) return s.replace(/\s+/g, "");
    if (/^\d+(\.\d+)?$/.test(s)) return `${s}/5`;
    return s;
  }

  const lbl =
    typeof v?.label === "string"
      ? v.label.trim()
      : typeof v?.name === "string"
        ? v.name.trim()
        : "";

  if (lbl) {
    if (/^\d+(\.\d+)?$/.test(lbl)) return `${lbl}/5`;
    if (/^\d+(\.\d+)?\s*\/\s*5$/i.test(lbl)) return lbl.replace(/\s+/g, "");
    return lbl;
  }

  return "—/5";
}

function formatStabilityLabel(v: any) {
  if (v == null) return "—";
  const n =
    typeof v === "number"
      ? v
      : typeof v?.value === "number"
        ? v.value
        : Number(v);

  if (!Number.isFinite(n)) return "—";
  if (n <= 0.35) return "Very stable";
  if (n <= 0.7) return "Stable";
  if (n <= 1.1) return "Up & down";
  return "Very up & down";
}

function formatMomentumLabel(v: any) {
  const s = formatBreakdownValue(v);
  if (s === "—") return "—";
  const k = String(s).toLowerCase();
  if (k === "up") return "Up";
  if (k === "down") return "Down";
  if (k === "flat") return "Steady";
  if (k === "unknown") return "—";
  return s;
}

function buildWeekComparisonLine(view: any) {
  const mem = view?.narrative?.overall?.memoryLine ?? view?.narrative?.memoryLine ?? null;
  if (typeof mem === "string" && mem.trim()) return mem.trim();

  const prev =
    typeof view?.prevWeekAvg === "number"
      ? view.prevWeekAvg
      : typeof view?.previousWeekAvg === "number"
        ? view.previousWeekAvg
        : null;

  const thisAvg =
    typeof view?.connectionScore === "number"
      ? view.connectionScore
      : typeof view?.climateScore === "number"
        ? view.climateScore
        : null;

  if (typeof prev !== "number" || typeof thisAvg !== "number") return null;
  if (!Number.isFinite(prev) || !Number.isFinite(thisAvg)) return null;

  const delta = Math.round((thisAvg - prev) * 10) / 10;

  if (Math.abs(delta) < 0.2) {
    return `Compared to last week, things look **mostly steady** — consistency is quietly doing work.`;
  }
  if (delta > 0) {
    return `Compared to last week, your connection looks **up +${delta}** on average — progress is showing.`;
  }
  return `Compared to last week, your connection looks **down ${delta}** on average — not failure, just a signal to slow down and reconnect.`;
}
function possessive(name: string) {
    const n = (name || "").trim();
    if (!n) return "Your";
    // e.g. "James" -> "James’", "Angel" -> "Angel’s"
    return n.endsWith("s") ? `${n}’` : `${n}’s`;
  }
  
  /**
   * Turn 3rd-person partner-summary bullets into app-friendly copy:
   * - "Their week averaged..." -> "Your week averaged..." (viewer) OR "Angel’s week averaged..."
   * - "Their recent check-ins..." -> "Your recent check-ins..." OR "Angel’s recent check-ins..."
   * - "how connected they felt" -> "how connected you felt" OR "how connected Angel felt"
   */
  function personalizePartnerCopy(line: unknown, opts: { isViewer: boolean; displayName: string }) {
    const raw = asText(line);
    if (!raw) return raw;
  
    const { isViewer, displayName } = opts;
    const subjPoss = isViewer ? "Your" : possessive(displayName);
    const subjName = isViewer ? "you" : (displayName || "they");
  
    let s = raw.trim();
  
    // Starts of sentences (most common in your screenshots)
    s = s.replace(/^Their\b/gi, subjPoss);
    s = s.replace(/^They\b/gi, isViewer ? "You" : displayName || "They");
  
    // Inside the sentence
    s = s.replace(/\btheir\b/gi, isViewer ? "your" : `${subjPoss.toLowerCase()}`);
    s = s.replace(/\bthey\b/gi, isViewer ? "you" : subjName);
    s = s.replace(/\bthem\b/gi, isViewer ? "you" : subjName);
  
    // Very common phrase in your highlight bullet
    s = s.replace(/how connected they felt/gi, isViewer ? "how connected you felt" : `how connected ${displayName} felt`);
  
    // Optional: make it feel warmer (keep it subtle)
    s = s.replace(/\ba solid snapshot\b/gi, "a warm snapshot");
  
    return s;
}
  

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [report, setReport] = useState<Report | null>(null);
  const [trendPoints, setTrendPoints] = useState<any[]>([]);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean | null>(null);
  const [hideCheckinNudge, setHideCheckinNudge] = useState(false);

  async function runBootstrapOrRedirect(): Promise<boolean> {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (typeof data?.redirectTo === "string" && data.redirectTo) {
        window.location.href = data.redirectTo;
        return false;
      }

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : res.status === 401
              ? "Please sign in again."
              : "Bootstrap failed.";
        setError(msg);
        return false;
      }

      return true;
    } catch {
      setError("We couldn’t prepare your account. Please refresh or sign in again.");
      return false;
    }
  }

  async function loadCoupleInfo() {
    try {
      const res = await fetch("/api/couple/members", { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/signin?callbackUrl=%2Fapp";
          return;
        }
        setCoupleInfo(null);
        return;
      }
      setCoupleInfo(data);
    } catch {
      setCoupleInfo(null);
    }
  }

  async function generateThisWeek() {
    setBusy(true);
    setLoading(true);
    setError("");

    try {
      const ok = await runBootstrapOrRedirect();
      if (!ok) return;

      await loadCoupleInfo();

      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data: GenerateReportResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !data.ok || !data.report) {
        setError(typeof data.error === "string" ? data.error : "Failed to generate report");
        setReport(null);
        return;
      }

      setReport({
        id: data.report.id,
        weekStart: data.report.weekStart,
        toneIndex: data.report.toneIndex,
        reportJson: data.report.reportJson,
      });

      const trendRes = await fetch("/api/trends/weeks?weeks=12", { method: "GET", cache: "no-store" });
      const trendData = await trendRes.json().catch(() => ({}));
      setTrendPoints(trendRes.ok && Array.isArray(trendData?.points) ? trendData.points : []);
    } catch (e: any) {
      setError(e?.message || "Failed to generate report");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem("bondiq_hide_checkin_nudge_until") || "0");
      if (until && Date.now() < until) setHideCheckinNudge(true);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/checkins/today", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setHasCheckedInToday(Boolean(data?.hasCheckedInToday));
      } catch {
        setHasCheckedInToday(null);
      }
    })();
  }, []);

  useEffect(() => {
    generateThisWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => report?.reportJson, [report]);
  const tone = useMemo(() => normalizeTone(view?.tone), [view]);
  const bond = useMemo(() => normalizeBondScore(view?.bondScore), [view]);

  const partners = useMemo(() => {
    const arr = view?.partnerSections;
    return Array.isArray(arr) ? arr : [];
  }, [view]);

  const connectionScore =
    typeof view?.connectionScore === "number"
      ? view.connectionScore
      : typeof view?.climateScore === "number"
        ? view.climateScore
        : null;

  const breakdown = useMemo(() => {
    const b = bond?.breakdown ?? {};
    const connection = b.connection ?? connectionScore;
    const alignment =
      b.alignment ??
      (typeof view?.alignmentLabel === "string" && view.alignmentLabel ? view.alignmentLabel : view?.alignment);

    const momentum = b.momentum ?? view?.momentum;
    const stability = b.stability ?? view?.stability;
    const habit = b.habit ?? view?.habit;

    return { connection, alignment, momentum, stability, habit };
  }, [bond?.breakdown, connectionScore, view]);

  const weekComparisonLine = useMemo(() => buildWeekComparisonLine(view), [view]);

  const buildGratitudeDraft = useCallback(() => {
    const summary =
      typeof view?.narrative?.overall?.summary === "string"
        ? view.narrative.overall.summary
        : typeof view?.story === "string"
          ? view.story
          : "";

    const line = typeof weekComparisonLine === "string" ? weekComparisonLine : "";
    const body = stripBoldMarkers([line, summary].filter(Boolean).join("\n\n").slice(0, 1200));

    return {
      title: "A moment I’m grateful for",
      body: body || "Write what happened and why it mattered…",
      source: "weekly_report",
      createdAt: new Date().toISOString(),
    };
  }, [view, weekComparisonLine]);

  const saveToGratitudeVault = useCallback(() => {
    try {
      const draft = buildGratitudeDraft();
      localStorage.setItem("bondiq_gratitude_draft", JSON.stringify(draft));
    } catch {}
    window.location.href = "/app/gratitude?compose=1";
  }, [buildGratitudeDraft]);

  const labelForUserId = (userId?: string) => {
    if (!userId || !coupleInfo) return null;
    const m = coupleInfo.members.find((x) => x.userId === userId);
    if (!m) return null;
    if (userId === coupleInfo.viewerUserId) return `You (${m.label})`;
    return m.label;
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <ReportEngagementTracker />

      {/* Header card */}
      <section className="bond-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your Weekly{" "}
              <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                BondIQ
              </span>{" "}
              Report 💞
            </h1>

            <p className="text-slate-600 text-sm mt-1">
              Gentle insights to help your love grow stronger.
            </p>
            <p className="text-sm text-slate-600">
              Every relationship has waves. This space helps you ride them together 🤍
            </p>

            {coupleInfo ? (
              <div className="mt-3 bond-chip">
                <span className="text-green-600">●</span>
                <span>
                  Together: <b>{coupleInfo.viewerLabel}</b> + <b>{coupleInfo.partnerLabel}</b>
                </span>
                <span className="text-slate-400">•</span>
                <span>Status: {coupleInfo.couple.status}</span>
              </div>
            ) : (
              <div className="mt-3 bond-chip">
                <span className="text-amber-600">●</span>
                <span>{loading ? "Loading your connection…" : "No couple connected yet."}</span>
              </div>
            )}

            {hasCheckedInToday === true && (
              <div className="mt-3 bond-chip">
                <span className="text-green-600">●</span>
                <span>Checked in today</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a href="/settings/privacy" className="bond-btn bond-btn-secondary">
              Privacy
            </a>

            <Link href="/app/settings" className="bond-btn bond-btn-secondary">
              Settings
            </Link>

            <button
              onClick={saveToGratitudeVault}
              disabled={busy || loading || !view}
              className="bond-btn bond-btn-secondary"
              title="Creates a draft from this week’s report and opens Gratitude Notes."
            >
              💖 Gratitude Notes
            </button>

            <button onClick={generateThisWeek} disabled={busy} className="bond-btn bond-btn-primary">
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {!hideCheckinNudge && hasCheckedInToday === false && (
          <div className="mt-5 rounded-2xl border bg-white/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">Quick check-in?</div>
                <div className="text-sm text-slate-700">
                  Takes 60 seconds. Your report gets richer when you show up consistently.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a href="/app/checkin" className="bond-btn bond-btn-primary">
                  Do today’s check-in
                </a>

                <button
                  type="button"
                  className="bond-btn bond-btn-secondary"
                  onClick={() => {
                    setHideCheckinNudge(true);
                    try {
                      localStorage.setItem(
                        "bondiq_hide_checkin_nudge_until",
                        String(Date.now() + 6 * 60 * 60 * 1000)
                      );
                    } catch {}
                  }}
                >
                  Remind me later
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {loading && <div className="mt-6 text-slate-700">Loading…</div>}
      {error && <div className="mt-6 text-red-600">{error}</div>}

      {!loading && !error && !view && (
        <div className="mt-6 text-slate-700">
          No report yet. Try “Refresh”. If you’re newly invited, complete onboarding first.
        </div>
      )}

      {view && (
        <div className="mt-8 space-y-8">
          {/* Main report card */}
          <section className="bond-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">
                Week of{" "}
                {new Date(view.weekStartISO || view.weekStart).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>

              <div className="text-sm text-slate-600">
                Tone:{" "}
                <span className="font-medium">
                  {tone.emoji ? `${tone.emoji} ` : ""}
                  {tone.label}
                </span>
              </div>
            </div>

            {/* Commitment Candles */}
            <div className="mt-5">
              <CommitmentCandles />
            </div>

            {/* Relationship Pulse */}
            <div className="mt-5 bond-card p-5">
              <div className="text-sm text-slate-600">Relationship Pulse</div>

              <div className="text-3xl font-semibold">
                {typeof bond.score === "number" ? bond.score : "—"}
                <span className="text-slate-400">/{bond.max}</span>
              </div>

              <div className="mt-1 text-sm text-slate-600">{bond.label}</div>

              <div className="mt-2 text-sm text-slate-600">
                Breakdown:{" "}
                <span className="text-slate-700">
                  Connection: {formatBreakdownValue(breakdown.connection)}/5 • Alignment:{" "}
                  {formatBreakdownValue(breakdown.alignment)} • Momentum:{" "}
                  {formatMomentumLabel(breakdown.momentum)} • Stability:{" "}
                  {formatStabilityLabel(breakdown.stability)} •{" "}
                  <span
                    title="Habit measures how many days this week you checked in. More days = stronger consistency."
                    className="cursor-help underline decoration-dotted"
                  >
                    Habit: {formatHabitValue(breakdown.habit)}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-6">
              <DailyTimelineBlock fallback={<TrendsChartCard points={trendPoints} />} />
            </div>

            <div className="mt-6">
              <EmotionPanel
                members={(coupleInfo?.members || []).map((m) => ({
                  userId: m.userId,
                  name: m.name,
                  nickname: m.nickname,
                  email: m.email,
                }))}
              />
            </div>

            <div className="mt-6">
              <InsightsPanel
                windowDays={28}
                members={coupleInfo?.members || []}
                onUpgrade={() => {
                  window.location.href = "/pricing";
                }}
              />
            </div>

            <div className="mt-6">
              <SuggestionsPanel
                breakdown={breakdown}
                onUpgrade={() => {
                  window.location.href = "/pricing";
                }}
              />
            </div>

            {(view.story || view?.narrative?.overall || weekComparisonLine) && (
              <div className="mt-6 bond-card p-5">
                <div className="font-semibold flex items-center gap-2">
                  <span>✨</span>
                  <span>This Week’s Story</span>
                </div>

                <div className="mt-1 text-sm text-slate-600">A reflection on your week together.</div>

                {weekComparisonLine ? (
                  <div className="mt-3 mb-3 rounded-xl bg-white/70 border px-4 py-3 text-sm">
                    {renderRichText(weekComparisonLine)}
                  </div>
                ) : null}

                {view?.narrative?.overall?.summary ? (
                  <div className="mt-2 text-slate-700 leading-relaxed whitespace-pre-wrap break-words space-y-3">
                    <div>{renderRichText(view.narrative.overall.summary)}</div>

                    {view?.narrative?.overall?.reflection && (
                      <div className="text-slate-700">{renderRichText(view.narrative.overall.reflection)}</div>
                    )}

                    {Array.isArray(view?.narrative?.overall?.coaching) &&
                      view.narrative.overall.coaching.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium text-slate-800">Coaching</div>
                          <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700">
                            {view.narrative.overall.coaching.map((x: any, i: number) => (
                              <li key={i}>{renderRichText(x)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ) : view.story ? (
                  <div className="mt-2 text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {renderRichText(view.story)}
                  </div>
                ) : (
                  <div className="mt-2 text-slate-600 text-sm">No story yet.</div>
                )}
              </div>
            )}
          </section>

          {/* Weekly Challenge */}
          {view.weeklyChallenge && (
            <section className="bond-card p-6">
              <div className="font-semibold flex items-center gap-2">
                <span>🎯</span>
                <span>Weekly Challenge</span>
              </div>

              <p className="text-slate-600 text-sm mt-1">
                {renderRichText(view.weeklyChallenge.subtitle || "One small mission. Big impact.")}
              </p>

              <div className="mt-4 bond-card p-5">
                {view.weeklyChallenge.theme && (
                  <div className="text-sm text-slate-600">
                    Theme: <b>{renderRichText(view.weeklyChallenge.theme)}</b>
                  </div>
                )}

                <div className="mt-1 text-lg font-semibold">
                  {renderRichText(view.weeklyChallenge.name || view.weeklyChallenge.title)}
                </div>

                {Array.isArray(view.weeklyChallenge.steps) && view.weeklyChallenge.steps.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {view.weeklyChallenge.steps.map((s: any, i: number) => (
                      <div key={i} className="rounded-xl border bg-white/70 p-3 flex items-start gap-2">
                        <div className="mt-0.5">✅</div>
                        <div className="text-slate-800">{renderRichText(s)}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {view.weeklyChallenge.successMetric && (
                  <div className="mt-4 text-sm text-slate-600">
                    Success metric: <b>{renderRichText(view.weeklyChallenge.successMetric)}</b>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Partner Sections */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Your Perspectives This Week</h2>

            {partners.length === 0 && (
              <div className="text-slate-700">
                No partner sections yet. Once both partners check in, you’ll get personalized insights for each person.
              </div>
            )}

            {partners.map((p: any, idx: number) => {
              const topTags = Array.isArray(p.topReceivedTags) ? p.topReceivedTags : [];
              const highlights = Array.isArray(p.highlights) ? p.highlights : [];
              const loved = Array.isArray(p.whatPartnerLoved) ? p.whatPartnerLoved : [];

              const rawActions =
                (Array.isArray(p.nextActionsForTheirPartner) && p.nextActionsForTheirPartner.length
                  ? p.nextActionsForTheirPartner
                  : Array.isArray(p.nextActions) && p.nextActions.length
                    ? p.nextActions
                    : []) as any[];

              const actions = rawActions
                .map((a: any) => {
                  if (typeof a === "string") return { tag: null, suggestion: a };
                  if (a && typeof a === "object") {
                    const suggestion =
                      typeof a.suggestion === "string"
                        ? a.suggestion
                        : typeof a.text === "string"
                          ? a.text
                          : typeof a.action === "string"
                            ? a.action
                            : "";
                    return { tag: (a as any).tag ?? null, suggestion };
                  }
                  return null;
                })
                .filter((x: any) => x && typeof x.suggestion === "string" && x.suggestion.trim().length > 0);

              const title =
                labelForUserId(p.userId) ||
                (typeof p?.displayName === "string" && p.displayName.trim()
                  ? p.displayName.trim()
                  : idx === 0
                    ? "Partner A"
                    : "Partner B");

              const checkins = typeof p.checkinCount === "number" ? p.checkinCount : 0;

              return (
                <div key={p.userId || idx} className="bond-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">💞 {title}</div>
                    <div className="text-sm text-slate-600">
                      Avg rating: {typeof p.avgRating === "number" ? `${p.avgRating}/5` : "—"} • Check-ins: {checkins}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-700">
                    Focus themes:{" "}
                    <span className="font-medium">
                      {topTags.length > 0
                        ? topTags.map((t: any) => tagLabel(asText(t))).join(", ")
                        : checkins > 0
                          ? "This week so far — keep checking in to unlock patterns."
                          : "No check-ins yet for this week."}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="font-medium">Highlights</div>
                    {highlights.length > 0 ? (
                      <ul className="list-disc pl-5 mt-2 text-slate-700 space-y-1">
                        {highlights.map((x: any, i: number) => (
                            <li
                                key={i}
                                className="leading-relaxed"
                            >
                                {renderRichText(
                                personalizePartnerCopy(x, {
                                    isViewer: Boolean(coupleInfo && p.userId === coupleInfo.viewerUserId),
                                    displayName: title, // already computed in your code
                                })
                                )}
                            </li>
                        ))}

                      </ul>
                    ) : (
                      <div className="mt-2 text-slate-600 text-sm">
                        {checkins > 0
                          ? "This week so far: We’ll create highlights once there are 2+ check-ins."
                          : "No highlights yet — complete a check-in to start building your week."}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="font-medium">I feel loved</div>
                    {loved.length > 0 ? (
                      <ul className="list-disc pl-5 mt-2 text-slate-700 space-y-1">
                        {loved.map((x: any, i: number) => (
                        <li key={i} className="leading-relaxed">
                            {renderRichText(
                            personalizePartnerCopy(x, {
                                isViewer: Boolean(coupleInfo && p.userId === coupleInfo.viewerUserId),
                                displayName: title,
                            })
                            )}
                        </li>
                        ))}

                      </ul>
                    ) : (
                      <div className="mt-2 text-slate-600 text-sm">
                        {checkins > 0
                          ? "We’ll summarize ‘what they loved’ after more check-ins."
                          : "No data yet — your check-in notes will power this section."}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="font-medium">Next actions</div>
                    {actions.length > 0 ? (
                      <div className="mt-2 grid gap-2">
                        {actions.map((a: any, i: number) => (
                          <div key={i} className="rounded-xl border bg-white/70 p-3">
                            <div className="text-sm text-slate-600">
                              {a.tag ? tagLabel(asText(a.tag)) : "Suggestion"}
                            </div>
                            <div className="text-slate-800 leading-relaxed">
                                {renderRichText(
                                    personalizePartnerCopy(a.suggestion, {
                                    isViewer: Boolean(coupleInfo && p.userId === coupleInfo.viewerUserId),
                                    displayName: title,
                                    })
                                )}
                            </div>

                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-slate-600 text-sm">
                        {checkins > 0
                          ? "Next actions appear after we detect patterns (usually 2–3 check-ins)."
                          : "Complete a check-in to unlock personalized next actions."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </main>
  );
}
