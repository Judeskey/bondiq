// app/api/emotion-state/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { classifyPartnerEmotionState } from "@/lib/emotionState";
import { saveEmotionSnapshots } from "@/lib/emotionSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function yyyyMmDdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function isCouplePremium(couple: { planType: string; proUntil: Date | null } | null) {
  if (!couple) return false;
  const byPlan = typeof couple.planType === "string" && couple.planType !== "FREE";
  const byTime = couple.proUntil ? new Date(couple.proUntil) > new Date() : false;
  return byPlan || byTime;
}

type VisibilityLevel = "PRIVATE" | "PARTNER" | "COUPLE";

function canViewerSeePartnerThing(opts: {
  premium: boolean;
  visibility: VisibilityLevel;
  isViewerOwner: boolean;
}) {
  // Owner always sees their own
  if (opts.isViewerOwner) return true;

  // Partner visibility is Pro-only
  if (!opts.premium) return false;

  // Pro: allow PARTNER or COUPLE
  return opts.visibility === "PARTNER" || opts.visibility === "COUPLE";
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const DAYS = 14;

    // ✅ Find active couple membership for viewer
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

    // ✅ Couple premium status (one partner pays → whole couple upgraded)
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { planType: true, proUntil: true },
    });
    const premium = isCouplePremium(couple);

    // ✅ Always return both partners + their privacy settings
    const members = await prisma.coupleMember.findMany({
      where: { coupleId },
      select: {
        userId: true,
        shareEmotionState: true,
        shareTags: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    const memberUserIds = members.map((m) => m.userId);

    const shareEmotionByUserId = new Map<string, VisibilityLevel>(
      members.map((m) => [m.userId, (m.shareEmotionState as VisibilityLevel) || "PARTNER"])
    );

    const shareTagsByUserId = new Map<string, VisibilityLevel>(
      members.map((m) => [m.userId, (m.shareTags as VisibilityLevel) || "PARTNER"])
    );

    const since = startOfDayUTC(new Date());
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    // ✅ Pull recent check-ins for the couple (last DAYS)
    const rows = await prisma.checkIn.findMany({
      where: { coupleId, createdAt: { gte: since } },
      select: {
        userId: true,
        createdAt: true,
        rating: true,
        languageTags: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by partner and day => daily average rating
    const perUserDay: Record<string, Record<string, number[]>> = {};
    const perUserTags: Record<string, string[]> = {};

    for (const r of rows) {
      const uid = r.userId;
      const day = yyyyMmDdUTC(new Date(r.createdAt));
      const rating = Number(r.rating);

      if (!Number.isFinite(rating)) continue;

      perUserDay[uid] ||= {};
      perUserDay[uid][day] ||= [];
      perUserDay[uid][day].push(rating);

      perUserTags[uid] ||= [];
      if (Array.isArray(r.languageTags) && r.languageTags.length) {
        perUserTags[uid].push(...r.languageTags);
      }
    }

    // ✅ Build classification for all members (even if 0 check-ins)
    const perPartnerRaw = memberUserIds.map((uid) => {
      const dayMap = perUserDay[uid] || {};
      const points = Object.keys(dayMap)
        .sort()
        .map((day) => {
          const xs = dayMap[day];
          const avg = xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
          return { day, rating: avg };
        });

      // Privacy: tags should be included only if allowed
      const tagsVisibility = shareTagsByUserId.get(uid) || "PARTNER";
      const tagsAllowed = canViewerSeePartnerThing({
        premium,
        visibility: tagsVisibility,
        isViewerOwner: uid === userId,
      });

      const tags = tagsAllowed ? (perUserTags[uid] || []) : [];

      return classifyPartnerEmotionState({
        userId: uid,
        points,
        daysConsidered: DAYS,
        tags,
      });
    });

    // ✅ Store emotion snapshot history (deduped by dayKey + windowDays)
    // Your saveEmotionSnapshots should upsert per (coupleId,userId,dayKey,windowDays)
    await saveEmotionSnapshots(coupleId, DAYS, perPartnerRaw);

    // ✅ Apply Pro-only partner visibility + per-member privacy controls
    const perPartner = perPartnerRaw.map((p) => {
      const visibility = shareEmotionByUserId.get(p.userId) || "PARTNER";
      const isOwner = p.userId === userId;

      const allowed = canViewerSeePartnerThing({
        premium,
        visibility,
        isViewerOwner: isOwner,
      });

      // If not allowed, return a safe placeholder (UI non-alarming)
      if (!allowed) {
        return {
          userId: p.userId,
          state: "UNKNOWN",
          confidence: 0,
          reasons: [],
          metrics: { hidden: true },
          uiHint: premium
            ? {
                title: "Private",
                message: "This partner keeps their mood signal private.",
              }
            : {
                title: "Pro feature",
                message: "Upgrade to Pro to view your partner’s mood signal.",
              },
        };
      }

      // Optional soften “no data”
      const noData = (p.metrics?.daysCheckedIn ?? 0) === 0;

      return {
        ...p,
        uiHint: noData
          ? {
              title: "No signal yet",
              message:
                "We need at least one check-in from this partner in the last two weeks to read patterns confidently.",
            }
          : null,
      };
    });

    return NextResponse.json({
      coupleId,
      days: DAYS,
      since,
      premium,
      perPartner,
    });
  } catch (err) {
    console.error("GET /api/emotion-state error:", err);
    return NextResponse.json(
      { error: "Failed to compute emotion state" },
      { status: 500 }
    );
  }
}
