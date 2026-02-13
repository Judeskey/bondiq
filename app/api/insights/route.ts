// app/api/insights/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { detectCouplePatterns } from "@/lib/patternDetection";
import { getEntitlementsByEmail } from "@/lib/entitlements";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function yyyyMmDdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLegacyInsightsShape(patterns: any) {
  const couple = patterns?.couple ?? {};
  const perPartner = Array.isArray(patterns?.perPartner) ? patterns.perPartner : [];

  // ✅ legacy aliases (what UI commonly expects)
  const legacy = {
    // top-level summary fields
    bestDay: couple.bestDay ?? null,
    hardestDay: couple.hardestDay ?? null,
    midWeekDips: Array.isArray(couple.midWeekDips) ? couple.midWeekDips : [],
    recoveryTriggers: Array.isArray(couple.recoveryTriggers) ? couple.recoveryTriggers : [],
    stats: couple.stats ?? null,

    // very common boolean / shorthand fields
    midWeekDip:
      Array.isArray(couple.midWeekDips) && couple.midWeekDips.length > 0 ? true : false,

    // partner summaries (UI often expects perPartner directly)
    perPartner,
  };

  return legacy;
}

/**
 * ✅ FIX: Ensure per-partner "triggers" are always populated when we have signal.
 *
 * Why Jude showed "Triggers: —":
 * - detectCouplePatterns may only populate per-partner triggers under certain conditions
 *   (e.g., only when it detects explicit "recovery triggers" from dips),
 * - but the UI expects triggers for each partner whenever we have meaningful topTags.
 *
 * Strategy:
 * - If partner.triggers is empty/missing, derive triggers from:
 *   1) partner.recoveryTriggers (if present)
 *   2) partner.topTags (best signal: [{tag,count}])
 *   3) partner.topReceivedTags (string[])
 */
function ensurePerPartnerTriggers(patterns: any) {
  const perPartner = Array.isArray(patterns?.perPartner) ? patterns.perPartner : [];
  if (!perPartner.length) return patterns;

  const normalizeTriggers = (arr: any[]) => {
    // expected UI shape: [{ tag: "TIME", count: 2 }, ...]
    return arr
      .map((x) => {
        if (!x) return null;

        // already in shape {tag,count}
        if (typeof x === "object" && typeof x.tag === "string") {
          const c =
            typeof x.count === "number" && Number.isFinite(x.count) ? x.count : 1;
          return { tag: x.tag, count: c };
        }

        // string tag -> count=1
        if (typeof x === "string" && x.trim()) return { tag: x.trim(), count: 1 };

        return null;
      })
      .filter(Boolean);
  };

  const nextPerPartner = perPartner.map((p: any) => {
    const existing = Array.isArray(p?.triggers) ? normalizeTriggers(p.triggers) : [];

    // If triggers already exist, keep them
    if (existing.length > 0) {
      return { ...p, triggers: existing };
    }

    // 1) fallback: recoveryTriggers on partner (some implementations use this name)
    const fromRecovery = Array.isArray(p?.recoveryTriggers)
      ? normalizeTriggers(p.recoveryTriggers)
      : [];
    if (fromRecovery.length > 0) {
      return { ...p, triggers: fromRecovery };
    }

    // 2) fallback: derive from topTags [{tag,count}]
    const fromTopTags = Array.isArray(p?.topTags) ? normalizeTriggers(p.topTags) : [];
    if (fromTopTags.length > 0) {
      // keep it small and stable for UI
      return { ...p, triggers: fromTopTags.slice(0, 3) };
    }

    // 3) fallback: derive from topReceivedTags ["TIME","SERVICE",...]
    const fromTopReceived = Array.isArray(p?.topReceivedTags)
      ? normalizeTriggers(p.topReceivedTags)
      : [];
    if (fromTopReceived.length > 0) {
      return { ...p, triggers: fromTopReceived.slice(0, 3) };
    }

    // nothing to infer
    return { ...p, triggers: [] };
  });

  return { ...patterns, perPartner: nextPerPartner };
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const raw = Number(url.searchParams.get("windowDays") ?? "28");
    const windowDays = clampInt(Number.isFinite(raw) ? raw : 28, 7, 90);

    // ✅ optional: force bypass cache
    const force =
      url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

    // ✅ Get plan + couple
    const ent = await getEntitlementsByEmail(email);

    if (!ent.coupleId) {
      return NextResponse.json(
        { error: "No active couple membership found." },
        { status: 400 }
      );
    }

    // 🔒 PRO GATE (insights are pro-only)
    if (!ent.isPremium) {
      return NextResponse.json(
        {
          error: "Premium required",
          code: "PREMIUM_REQUIRED",
          upgradeUrl: "/pricing",
        },
        { status: 402 }
      );
    }

    const coupleId = ent.coupleId;

    // ✅ Cache settings
    const TTL_SECONDS = 6 * 60 * 60; // 6 hours
    const now = Date.now();
    const dayKey = yyyyMmDdUTC(new Date());

    // ✅ Try cache unless forced
    if (!force) {
      const cached = await prisma.coupleInsightsCache.findFirst({
        where: { coupleId, windowDays, dayKey },
        select: { id: true, payload: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      if (cached?.payload) {
        const ageSeconds = Math.floor((now - cached.createdAt.getTime()) / 1000);
        if (ageSeconds <= TTL_SECONDS) {
          return NextResponse.json({
            coupleId,
            windowDays,
            dayKey,
            cached: true,
            cachedAt: cached.createdAt,
            ttlSeconds: TTL_SECONDS,
            insights: cached.payload,
          });
        }
      }
    }

    // ✅ Compute fresh insights
    let patterns = await detectCouplePatterns({ coupleId, windowDays });

    // ✅ FIX: ensure per-partner triggers are present (Jude was blank while Jane had SERVICE)
    patterns = ensurePerPartnerTriggers(patterns);

    // ✅ Add compatibility aliases so UI can read either:
    // - insights.couple.bestDay (new)
    // - insights.bestDay (legacy)
    const legacy = toLegacyInsightsShape(patterns);

    const insights = {
      ...patterns,
      ...legacy,
    } as unknown as Prisma.InputJsonValue;

    // ✅ Write cache (dayKey required by your schema)
    // If forced, we still write fresh results (nice for consistent UI reload)
    const existing = await prisma.coupleInsightsCache.findFirst({
      where: { coupleId, windowDays, dayKey },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.id) {
      await prisma.coupleInsightsCache.update({
        where: { id: existing.id },
        data: { payload: insights },
      });
    } else {
      await prisma.coupleInsightsCache.create({
        data: {
          coupleId,
          windowDays,
          dayKey,
          payload: insights,
        },
      });
    }

    return NextResponse.json({
      coupleId,
      windowDays,
      dayKey,
      cached: false,
      ttlSeconds: TTL_SECONDS,
      insights,
    });
  } catch (err) {
    console.error("GET /api/insights error:", err);
    return NextResponse.json({ error: "Failed to compute insights" }, { status: 500 });
  }
}
