// app/api/settings/report-schedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(n: any, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const y = Math.floor(x);
  if (y < min || y > max) return null;
  return y;
}

function isValidTimeZone(tz: any) {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    // throws if invalid
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * POST body:
 * {
 *   reportDay: 0..6,
 *   time: "HH:MM"   (optional alternative),
 *   reportTimeMinutes: 0..1439 (optional alternative),
 *   timezone: "America/Toronto" (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(user.id);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const reportDay = clampInt(body?.reportDay, 0, 6);
    if (reportDay == null) {
      return NextResponse.json({ error: "Invalid reportDay (must be 0..6)" }, { status: 400 });
    }

    // Accept either reportTimeMinutes or "HH:MM"
    let reportTimeMinutes: number | null = null;

    const direct = clampInt(body?.reportTimeMinutes, 0, 1439);
    if (direct != null) reportTimeMinutes = direct;

    if (reportTimeMinutes == null && typeof body?.time === "string") {
      const m = body.time.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        const hh = clampInt(m[1], 0, 23);
        const mm = clampInt(m[2], 0, 59);
        if (hh != null && mm != null) reportTimeMinutes = hh * 60 + mm;
      }
    }

    if (reportTimeMinutes == null) {
      return NextResponse.json(
        { error: "Invalid time. Provide reportTimeMinutes (0..1439) or time \"HH:MM\"." },
        { status: 400 }
      );
    }

    const timezone =
      isValidTimeZone(body?.timezone) ? String(body.timezone).trim() : undefined;

    // ✅ Last setting wins: this updates the SINGLE schedule for the couple
    const updated = await prisma.couple.update({
      where: { id: coupleId },
      data: {
        reportDay,
        reportTimeMinutes,
        ...(timezone ? { timezone } : {}),
      },
      select: { id: true, reportDay: true, reportTimeMinutes: true, timezone: true },
    });

    return NextResponse.json({ ok: true, schedule: updated });
  } catch (e: any) {
    const msg = e?.message || "Failed";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 }
    );
  }
}
export async function GET() {
    try {
      const { email } = await requireUser();
  
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  
      const coupleId = await getCoupleForUser(user.id);
      if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });
  
      const schedule = await prisma.couple.findUnique({
        where: { id: coupleId },
        select: { reportDay: true, reportTimeMinutes: true, timezone: true },
      });
  
      return NextResponse.json({ ok: true, schedule });
    } catch (e: any) {
      const msg = e?.message || "Failed";
      return NextResponse.json(
        { error: msg },
        { status: msg === "UNAUTHORIZED" ? 401 : 500 }
      );
    }
  }
  