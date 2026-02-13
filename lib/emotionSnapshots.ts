// lib/emotionSnapshots.ts
import { prisma } from "@/lib/db";

function yyyyMmDdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return [String(v)].filter(Boolean);
}

export async function saveEmotionSnapshots(
  coupleId: string,
  windowDays: number,
  perPartner: Array<{
    userId: string;
    state: string;
    confidence: number;
    reasons: any;
    metrics: any;
  }>
) {
  if (!coupleId || !perPartner?.length) return;

  const now = new Date();
  const dayKey = yyyyMmDdUTC(now);

  try {
    await prisma.$transaction(
      perPartner.map((p) =>
        prisma.emotionStateSnapshot.upsert({
          where: {
            coupleId_userId_dayKey_windowDays: {
              coupleId,
              userId: p.userId,
              dayKey,
              windowDays,
            },
          },
          create: {
            coupleId,
            userId: p.userId,
            dayKey,
            windowDays,
            state: String(p.state ?? "UNKNOWN"),
            confidence: Number(p.confidence ?? 0),
            reasons: toStringArray(p.reasons),
            metrics: p.metrics ?? {},
          },
          update: {
            // same row for the same partner/day; keep it fresh
            state: String(p.state ?? "UNKNOWN"),
            confidence: Number(p.confidence ?? 0),
            reasons: toStringArray(p.reasons),
            metrics: p.metrics ?? {},
          },
        })
      )
    );
  } catch (err) {
    // Never block UI/endpoint because snapshot persistence failed
    console.error("saveEmotionSnapshots error:", err);
  }
}
