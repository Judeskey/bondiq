// lib/email/sendWeeklyReflection.ts
import { prisma } from "@/lib/db";
import { getResend, getCareFromAddress, getAppUrl } from "@/lib/email/resend";
import {
  weeklyReflectionHtml,
  weeklyReflectionSubject,
  weeklyReflectionText,
} from "@/lib/email/templates/weeklyReflection";

function isCouplePremium(couple: { planType: "FREE" | "PREMIUM"; proUntil: Date | null }) {
  if (couple.planType !== "PREMIUM") return false;
  if (!couple.proUntil) return true;
  return couple.proUntil.getTime() > Date.now();
}

function safeArray(x: any): string[] {
  return Array.isArray(x) ? x.filter((s) => typeof s === "string" && s.trim()) : [];
}

function safeNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function firstLine(s: string, max = 180) {
  const clean = String(s || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

export async function sendWeeklyReflectionEmail(opts: { userId: string }) {
  const resend = getResend();
  if (!resend) throw new Error("Missing RESEND_API_KEY (getResend() returned null)");

  const appUrl = getAppUrl();
  const from = getCareFromAddress();


  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.email) throw new Error("User email missing");

  // Find couple for this user
  const membership = await prisma.coupleMember.findFirst({
    where: { userId: user.id },
    select: { coupleId: true },
  });
  if (!membership?.coupleId) throw new Error("No couple connected");

  const couple = await prisma.couple.findUnique({
    where: { id: membership.coupleId },
    select: { id: true, planType: true, proUntil: true },
  });
  if (!couple) throw new Error("Couple not found");

  const plan: "FREE" | "PREMIUM" = isCouplePremium(couple) ? "PREMIUM" : "FREE";

  // Latest report for this couple
  const report = await prisma.weeklyReport.findFirst({
    where: { coupleId: couple.id },
    orderBy: { weekStart: "desc" },
    select: { id: true, weekStart: true, reportJson: true },
  });
  if (!report) throw new Error("No weekly report found");

  // Per-user sections (often includes nextActions, highlights, whatPartnerLoved, etc.)
  const perUser = await prisma.weeklyReportForUser.findFirst({
    where: { reportId: report.id, userId: user.id },
    select: { sectionsJson: true },
  });

  const rj: any = report.reportJson || {};
  const sj: any = perUser?.sectionsJson || {};

  // Extract stable fields (best-effort, safe fallbacks)
  const pulseValue = safeNum(rj?.bondScore?.value) ?? safeNum(rj?.relationshipPulse?.value);
  const pulseLabel =
    typeof rj?.bondScore?.label === "string"
      ? rj.bondScore.label
      : typeof rj?.relationshipPulse?.label === "string"
      ? rj.relationshipPulse.label
      : null;

  const habitScore = safeNum(rj?.habit) ?? safeNum(rj?.bondScore?.breakdown?.habit);

  const connectionAvg =
    safeNum(rj?.thisWeekAvg) ??
    safeNum(rj?.connectionScore) ??
    safeNum(rj?.bondScore?.breakdown?.connection);

  const momentumLabel =
    typeof rj?.momentum === "string"
      ? rj.momentum
      : typeof rj?.momentumLabel === "string"
      ? rj.momentumLabel
      : null;

  const alignmentLabel =
    typeof rj?.alignmentLabel === "string"
      ? rj.alignmentLabel
      : typeof rj?.alignment === "string"
      ? rj.alignment
      : null;

  const memoryLine =
    typeof rj?.narrative?.overall?.memoryLine === "string"
      ? rj.narrative.overall.memoryLine
      : typeof rj?.memoryLine === "string"
      ? rj.memoryLine
      : null;

  const story =
    typeof rj?.story === "string"
      ? firstLine(rj.story, 900)
      : typeof rj?.narrative?.overall?.story === "string"
      ? firstLine(rj.narrative.overall.story, 900)
      : null;

  const topThemes = safeArray(rj?.topThemes).length ? safeArray(rj?.topThemes) : safeArray(rj?.themes);

  // Next actions can live either in reportJson (V3.1) or per-user sectionsJson (V2)
  const nextActions =
    safeArray(rj?.nextActions).length
      ? safeArray(rj?.nextActions)
      : safeArray(rj?.narrative?.overall?.nextActions).length
      ? safeArray(rj?.narrative?.overall?.nextActions)
      : safeArray(sj?.nextActions);

  const weeklyChallengeTitle =
    typeof rj?.weeklyChallenge?.title === "string"
      ? rj.weeklyChallenge.title
      : typeof rj?.weeklyChallenge?.name === "string"
      ? rj.weeklyChallenge.name
      : null;

  const weeklyChallengeSteps = Array.isArray(rj?.weeklyChallenge?.steps)
    ? rj.weeklyChallenge.steps
        .map((s: any) => (typeof s === "string" ? s : s?.text || s?.label || s?.title || ""))
        .filter((x: any) => typeof x === "string" && x.trim())
        .slice(0, 5)
    : [];

  const weekLabel = "This week";
  const reportUrl = `${appUrl}/app/reports`;
  const unsubscribeMailto = `mailto:care@bondiq.app?subject=Unsubscribe`;

  const templateInput = {
    recipientName: user.name,
    weekLabel,
    plan,
    pulseValue,
    pulseLabel,
    habitScore,
    connectionAvg,
    momentumLabel,
    alignmentLabel,
    memoryLine,
    story,
    topThemes,
    nextActions,
    weeklyChallengeTitle,
    weeklyChallengeSteps,
    reportUrl,
    unsubscribeMailto,
  } as const;

  const subject = weeklyReflectionSubject(templateInput);
  const html = weeklyReflectionHtml(templateInput);
  const text = weeklyReflectionText(templateInput);

  const res = await resend.emails.send({
    from,
    to: user.email,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeMailto}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return { ok: true, id: (res as any)?.data?.id ?? null };
}
