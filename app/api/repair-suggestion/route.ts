import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Week start in UTC (Sunday 00:00 UTC)
function startOfWeekUTC(d: Date) {
  const x = new Date(d);
  const day = x.getUTCDay(); // 0..6 (Sun..Sat)
  x.setUTCDate(x.getUTCDate() - day);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function asNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ✅ Consultant-style suggestion (no AI call, but feels professional)
function generateConsultantSuggestion(b: any) {
  const connection = asNum(b?.connection, 0); // 0..5
  const habit = asNum(b?.habit, 0); // 0..5 (days)
  const stabilityLabel = String(b?.stability ?? "").toLowerCase();
  const momentumLabel = String(b?.momentum ?? "").toLowerCase();

  const connectionLevel =
    connection >= 4.3 ? "strong" : connection >= 3.5 ? "okay" : "fragile";

  const habitLevel = habit >= 4 ? "high" : habit >= 2 ? "medium" : "low";

  const stabilityLevel = stabilityLabel.includes("stable")
    ? "stable"
    : stabilityLabel.includes("unstable")
    ? "unstable"
    : "mixed";

  const momentumLevel = momentumLabel.includes("up")
    ? "up"
    : momentumLabel.includes("down")
    ? "down"
    : "steady";

  const focus =
    stabilityLevel === "unstable"
      ? "stability"
      : momentumLevel === "down"
      ? "momentum"
      : habitLevel === "low"
      ? "consistency"
      : "connection";

  const opening =
    connectionLevel === "strong"
      ? "You’re doing a lot right — the relationship is running on real emotional safety, not just ‘good moments.’"
      : connectionLevel === "okay"
      ? "You have a workable base, but it needs a bit more structure so you don’t rely on mood or timing."
      : "Right now, the bond looks sensitive — small missteps can feel bigger than they are, so we want gentle, predictable repair.";

  const calibration = (() => {
    const warmth =
      connectionLevel === "strong"
        ? "warm"
        : connectionLevel === "okay"
        ? "present but inconsistent"
        : "thin right now";

    const consistency =
      habitLevel === "high"
        ? "already building momentum"
        : habitLevel === "medium"
        ? "there, but not yet automatic"
        : "the missing piece";

    return `Calibration: closeness feels **${warmth}**, and consistency is **${consistency}**. Your best ROI this week is **${focus}**.`;
  })();

  const plan =
    focus === "stability"
      ? [
          "Use a 10-minute ‘reset’ once this week: one appreciation + one request each (no debating).",
          "When tension rises, switch to: ‘What did you hear me say?’ before responding.",
          "End one day with a 2-sentence debrief: ‘Today felt ___ because ___. Tomorrow I’d love ___.’",
        ]
      : focus === "momentum"
      ? [
          "Schedule one ‘easy win’ date: 30 minutes, no logistics talk, just shared enjoyment.",
          "Each partner initiates one small act of care without being asked (something the other notices).",
          "Create a ‘next-time’ rule: after a miss, agree on what you’ll do differently in one sentence.",
        ]
      : focus === "consistency"
      ? [
          "Pick ONE daily micro-habit (2 minutes): a hug, a check-in text, or ‘one good thing’ at night.",
          "Tie it to a trigger (after dinner / before bed) so it becomes automatic.",
          "Keep it tiny: the goal is repetition, not intensity.",
        ]
      : [
          "Do one ‘feel seen’ moment: reflect back what mattered to your partner this week (no fixing).",
          "Ask one curious question: ‘What would make you feel supported this weekend?’",
          "Celebrate one win together — even small — to reinforce ‘we’re a team.’",
        ];

  const scripts =
    focus === "stability"
      ? [
          "“When ___ happened, I felt ___. I know you didn’t mean it — can we try ___ next time?”",
          "“I want us on the same team. Can we each say one appreciation and one request?”",
        ]
      : [
          "“One thing I appreciated this week was ___. It mattered because ___.”",
          "“This week I need a little more ___. Could we do ___ on ___?”",
        ];

  return [
    opening,
    "",
    calibration,
    "",
    "Do this (simple plan):",
    `1) ${plan[0]}`,
    `2) ${plan[1]}`,
    `3) ${plan[2]}`,
    "",
    "Try these scripts (copy/paste):",
    `• ${scripts[0]}`,
    `• ${scripts[1]}`,
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const email = session?.user?.email;

    if (!userId || !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const breakdownFromClient = body?.breakdown ?? null;

    // ✅ Find active couple
    const membership = await prisma.coupleMember.findFirst({
      where: { userId, couple: { status: "ACTIVE" } },
      select: { coupleId: true },
      orderBy: { joinedAt: "desc" },
    });

    const coupleId = membership?.coupleId;
    if (!coupleId) {
      return NextResponse.json(
        { error: "No active couple membership found." },
        { status: 400 }
      );
    }

    // ✅ Couple-level premium
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { planType: true, proUntil: true },
    });

    const premium =
      (typeof couple?.planType === "string" && couple.planType !== "FREE") ||
      (couple?.proUntil ? new Date(couple.proUntil) > new Date() : false);

    const FREE_WEEKLY_LIMIT = 2;

    // ✅ Free weekly quota check (per couple)
    let usedThisWeek = 0;
    if (!premium) {
      const weekStart = startOfWeekUTC(new Date());

      usedThisWeek = await prisma.repairSuggestionUsage.count({
        where: {
          coupleId,
          createdAt: { gte: weekStart },
        },
      });

      if (usedThisWeek >= FREE_WEEKLY_LIMIT) {
        return NextResponse.json(
          {
            error: "Free limit reached. Upgrade for unlimited suggestions.",
            upgrade: true,
            remaining: 0,
          },
          { status: 403 }
        );
      }
    }

    // ✅ Resolve breakdown
    let breakdown = breakdownFromClient;

    const latestReport = await prisma.weeklyReport.findFirst({
        where: { coupleId },
        orderBy: { createdAt: "desc" },
        // ✅ no select: avoids TS mismatch when Prisma client is stale or field name differs
    });

    const reportPayload =
        (latestReport as any)?.json ??
        (latestReport as any)?.reportJson ??
        (latestReport as any)?.payload ??
        (latestReport as any)?.data ??
        (latestReport as any)?.report ??
        null;

    breakdown =
        reportPayload?.bondScore?.breakdown ??
        reportPayload?.bond?.breakdown ??
        {};


    const suggestion = generateConsultantSuggestion(breakdown);

    // ✅ Track usage ONLY for free (keeps table clean)
    if (!premium) {
      await prisma.repairSuggestionUsage.create({
        data: { coupleId },
      });
    }

    return NextResponse.json({
      suggestion,
      premium,
      remaining: premium ? "unlimited" : FREE_WEEKLY_LIMIT - (usedThisWeek + 1),
    });
  } catch (err: any) {
    console.error("POST /api/repair-suggestion error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
