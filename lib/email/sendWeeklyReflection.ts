// lib/email/sendWeeklyReflection.ts
import { prisma } from "@/lib/db";
import { getResend, getCareFromAddress, getAppUrl } from "@/lib/email/resend";
import { buildWeeklyReflectionEmail } from "@/lib/email/templates/weeklyReflectionEmail";

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

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatWeekLabel(d: Date) {
  // "Week of Feb 14"
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
  return `Week of ${fmt.format(d)}`;
}

export async function sendWeeklyReflectionEmail(opts: {
  userId: string;
  forcePlan?: "FREE" | "PREMIUM";
}) {
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

  const membership = await prisma.coupleMember.findFirst({
    where: { userId: user.id },
    select: { coupleId: true },
  });
  if (!membership?.coupleId) throw new Error("No couple connected");

  const couple = await prisma.couple.findUnique({
    where: { id: membership.coupleId },
    select: { id: true, planType: true, proUntil: true, timezone: true },
  });
  if (!couple) throw new Error("Couple not found");

  const computedPlan: "FREE" | "PREMIUM" = isCouplePremium(couple) ? "PREMIUM" : "FREE";
  const plan: "FREE" | "PREMIUM" = opts.forcePlan ?? computedPlan;

  // latest report
  const report = await prisma.weeklyReport.findFirst({
    where: { coupleId: couple.id },
    orderBy: { weekStart: "desc" },
    select: { id: true, weekStart: true, reportJson: true },
  });
  if (!report) throw new Error("No weekly report found");

  const perUser = await prisma.weeklyReportForUser.findFirst({
    where: { reportId: report.id, userId: user.id },
    select: { sectionsJson: true },
  });

  const rj: any = report.reportJson || {};
  const sj: any = perUser?.sectionsJson || {};

  // ------- Extract fields (keep your existing behavior) -------
  const pulseValue = safeNum(rj?.bondScore?.value) ?? safeNum(rj?.relationshipPulse?.value);
  const pulseLabel =
    typeof rj?.bondScore?.label === "string"
      ? rj.bondScore.label
      : typeof rj?.relationshipPulse?.label === "string"
      ? rj.relationshipPulse.label
      : "Weekly snapshot";

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
      ? firstLine(rj.story, 1200)
      : typeof rj?.narrative?.overall?.story === "string"
      ? firstLine(rj.narrative.overall.story, 1200)
      : "";

  const topThemes = safeArray(rj?.topThemes).length ? safeArray(rj?.topThemes) : safeArray(rj?.themes);

  const nextActions =
    safeArray(rj?.nextActions).length
      ? safeArray(rj?.nextActions)
      : safeArray(rj?.narrative?.overall?.nextActions).length
      ? safeArray(rj?.narrative?.overall?.nextActions)
      : safeArray(sj?.nextActions);

  // ------- Build “email input” for your template -------
  const weekLabel = report.weekStart ? formatWeekLabel(new Date(report.weekStart)) : "This week";
  const reportUrl = `${appUrl}/app/reports`;
  const settingsUrl = `${appUrl}/app/settings`;
  const upgradeUrl = `${appUrl}/app/settings`; // until you have a billing page
  const unsubscribeMailto = `mailto:care@bondiq.app?subject=Unsubscribe`;

  // Metrics: keep values as-is (you asked not to tamper)
  const metrics = [
    connectionAvg != null
      ? { label: "Connection", value: connectionAvg, max: 5, note: "How connected you felt overall" }
      : null,
    habitScore != null
      ? { label: "Habits", value: habitScore, max: 5, note: "Consistency of small relationship habits" }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: number; max?: number; note?: string }>;

  // Highlights: compact + useful for free users too
  const highlights: string[] = [
    ...(memoryLine ? [memoryLine] : []),
    ...(topThemes.length ? topThemes.slice(0, 4).map((t) => `Theme: ${t}`) : []),
    ...(nextActions.length ? nextActions.slice(0, 2).map((a) => `Next: ${a}`) : []),
  ].filter(Boolean);

  const gentleResetIdea =
    nextActions.length > 0
      ? `Try this together: ${nextActions[0]}`
      : "Try a 10-minute check-in: one appreciation, one need, one tiny plan.";

  const built = buildWeeklyReflectionEmail({
    toName: user.name,
    weekLabel,
    reportUrl,
    narrative: story || "Your story will appear after a few check-ins.",
    gentleResetIdea,
    pulse:
      pulseValue != null
        ? { score: pulseValue, label: pulseLabel || "Weekly snapshot", note: plan === "FREE" ? "More check-ins = sharper insights." : null }
        : null,
    metrics,
    highlights,
    isPro: plan === "PREMIUM",
    upgradeUrl: plan === "FREE" ? upgradeUrl : null,
    settingsUrl,
    unsubscribeUrl: unsubscribeMailto,
  });

  const res = await resend.emails.send({
    from,
    to: user.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeMailto}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  return { ok: true, id: (res as any)?.data?.id ?? null, planUsed: plan };
}
