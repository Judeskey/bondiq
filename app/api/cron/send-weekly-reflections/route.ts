// app/api/cron/send-weekly-reflections/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyReflectionEmail } from "@/lib/email/sendWeeklyReflection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCronSecret(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || secret !== expected) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
}

function dayOfWeekInTimeZone(timeZone: string, now = new Date()) {
  const wk = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  switch (wk) {
    case "Sun": return 0;
    case "Mon": return 1;
    case "Tue": return 2;
    case "Wed": return 3;
    case "Thu": return 4;
    case "Fri": return 5;
    case "Sat": return 6;
    default: return now.getDay();
  }
}

function minutesOfDayInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm; // 0..1439
}

function dayKeyInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value || "0000";
  const m = parts.find((p) => p.type === "month")?.value || "00";
  const d = parts.find((p) => p.type === "day")?.value || "00";
  return `${y}-${m}-${d}`;
}

function getMaxUsersPerRun() {
  const n = Number(process.env.CRON_MAX_USERS || 300);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300;
}

function getWindowMinutes() {
  // Send window to tolerate scheduler drift. Default: ±7 minutes.
  const n = Number(process.env.CRON_SEND_WINDOW_MINUTES || 7);
  return Number.isFinite(n) && n >= 1 && n <= 60 ? Math.floor(n) : 7;
}

function isWithinWindow(nowMinutes: number, targetMinutes: number, window: number) {
  const diff = Math.abs(nowMinutes - targetMinutes);
  return diff <= window;
}

export async function GET(req: Request) {
  try {
    assertCronSecret(req);

    const now = new Date();
    const maxUsers = getMaxUsersPerRun();
    const window = getWindowMinutes();

    const couples = await prisma.couple.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        timezone: true,
        reportDay: true,
        reportTimeMinutes: true,
      },
    });

    let scannedCouples = 0;
    let dueCouples = 0;

    let consideredUsers = 0;
    let sent = 0;
    let skippedNotTimeYet = 0;
    let skippedAlreadySent = 0;
    let skippedNoEmail = 0;
    let failed = 0;

    for (const c of couples) {
      scannedCouples++;

      const tz = c.timezone || "America/Toronto";
      const todayDow = dayOfWeekInTimeZone(tz, now);

      if (todayDow !== c.reportDay) continue;

      const nowMinutes = minutesOfDayInTimeZone(tz, now);
      if (nowMinutes == null) continue;

      const target = typeof c.reportTimeMinutes === "number" ? c.reportTimeMinutes : 540;

      if (!isWithinWindow(nowMinutes, target, window)) {
        skippedNotTimeYet++;
        continue;
      }

      dueCouples++;
      const dayKey = dayKeyInTimeZone(tz, now);

      const members = await prisma.coupleMember.findMany({
        where: { coupleId: c.id },
        select: { userId: true, user: { select: { email: true } } },
      });

      for (const m of members) {
        if (consideredUsers >= maxUsers) break;
        consideredUsers++;

        if (!m.user?.email) {
          skippedNoEmail++;
          continue;
        }

        const already = await prisma.emailSendLog.findUnique({
          where: {
            userId_type_dayKey: {
              userId: m.userId,
              type: "WEEKLY_REFLECTION",
              dayKey,
            },
          },
          select: { id: true },
        });

        if (already) {
          skippedAlreadySent++;
          continue;
        }

        try {
          await sendWeeklyReflectionEmail({ userId: m.userId });

          await prisma.emailSendLog.create({
            data: {
              userId: m.userId,
              type: "WEEKLY_REFLECTION",
              dayKey,
            },
          });

          sent++;
        } catch (err) {
          failed++;
          console.error("[cron/send-weekly-reflections] failed", {
            coupleId: c.id,
            userId: m.userId,
            err,
          });
        }
      }

      if (consideredUsers >= maxUsers) break;
    }

    return NextResponse.json({
      ok: true,
      scannedCouples,
      dueCouples,
      consideredUsers,
      sent,
      skippedNotTimeYet,
      skippedAlreadySent,
      skippedNoEmail,
      failed,
      windowMinutes: window,
      maxUsers,
      now: now.toISOString(),
    });
  } catch (e: any) {
    const status = e?.status || (e?.message === "UNAUTHORIZED" ? 401 : 500);
    return NextResponse.json({ error: e?.message || "Cron failed" }, { status });
  }
}
