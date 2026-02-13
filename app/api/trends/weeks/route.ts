import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// reportDay: 0=Sunday ... 6=Saturday
function startOfWeekByReportDay(d: Date, reportDay: number) {
  const date = new Date(d);
  const day = date.getDay(); // 0..6
  let diff = reportDay - day;
  if (diff > 0) diff -= 7; // go back to the most recent reportDay
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatWeekLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // "Jan 6"
}

function mean(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[]) {
  if (nums.length < 2) return null;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v =
    nums.reduce((acc, x) => acc + (x - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Find active coupleId via membership
    const membership = await prisma.coupleMember.findFirst({
      where: { userId, couple: { status: "ACTIVE" } },
      select: { coupleId: true },
      orderBy: { joinedAt: "desc" },
    });

    const coupleId = membership?.coupleId ?? null;
    if (!coupleId) {
      return NextResponse.json(
        { error: "No active couple membership found for this user." },
        { status: 400 }
      );
    }

    // 2) Read couple.reportDay so our week boundary matches your stored weekStart
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { reportDay: true },
    });

    const reportDay = typeof couple?.reportDay === "number" ? couple.reportDay : 0;

    const url = new URL(req.url);

    // weeks=4..24 (default 12)
    const weeksParam = Number(url.searchParams.get("weeks") ?? "12");
    const weeks = clampInt(Number.isFinite(weeksParam) ? weeksParam : 12, 4, 24);

    const now = new Date();
    const thisWeekStart = startOfWeekByReportDay(now, reportDay);

    // weekStarts oldest -> newest
    const weekStarts: Date[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      weekStarts.push(addDays(thisWeekStart, -7 * i));
    }

    const earliestWeekStart = weekStarts[0];
    const latestWeekStartExclusive = addDays(thisWeekStart, 7);

    // 3) Pull checkins for this couple in the window (use weekStart)
    const checkins = await prisma.checkIn.findMany({
      where: {
        coupleId,
        weekStart: {
          gte: earliestWeekStart,
          lt: latestWeekStartExclusive,
        },
      },
      select: { weekStart: true, rating: true },
      orderBy: { weekStart: "asc" },
    });

    // 4) Build points by range-bucketing (robust)
    const points = weekStarts.map((ws) => {
      const we = addDays(ws, 7);

      const ratings = checkins
        .filter((c) => c.weekStart >= ws && c.weekStart < we)
        .map((c) => Number(c.rating))
        .filter((n) => Number.isFinite(n));

      const connectionScore = mean(ratings);
      const stability = stddev(ratings);

      return {
        weekStart: ws.toISOString(),
        weekLabel: formatWeekLabel(ws),
        connectionScore:
          connectionScore == null ? null : Number(connectionScore.toFixed(2)),
        stability: stability == null ? null : Number(stability.toFixed(2)),
        checkinsCount: ratings.length,
      };
    });

    return NextResponse.json({ weeks, reportDay, points });
  } catch (err: any) {
    console.error("GET /api/trends/weeks error:", err);
    return NextResponse.json(
      { error: "Failed to load trends" },
      { status: 500 }
    );
  }
}
