import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple “today” window based on server date (good enough for MVP)
// If you later want user timezone accuracy, store tz on User and compute accordingly.
function startOfToday(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export async function GET() {
  const { userId } = await requireUser();

  const coupleId = await getCoupleForUser(userId);
  if (!coupleId) return NextResponse.json({ hasCheckedInToday: false });

  const since = startOfToday();

  // Adjust model/table name to your actual check-in table
  // Common names you’ve used: CheckIn / Checkin
  const count = await prisma.checkIn.count({
    where: {
      coupleId,
      userId,
      createdAt: { gte: since },
    },
  });

  return NextResponse.json({ hasCheckedInToday: count > 0 });
}
