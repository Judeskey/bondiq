// app/api/exp/choose/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VARIANTS = ["A", "B", "C"] as const;
type Variant = (typeof VARIANTS)[number];

// Weighted bandit: favors higher CTR with smoothing.
// score = (clicks+1)/(impressions+2). Add epsilon exploration.
function pickVariant(rows: Record<Variant, { impressions: number; clicks: number }>): Variant {
  const epsilon = 0.08;

  if (Math.random() < epsilon) {
    return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
  }

  const scores = VARIANTS.map((v) => {
    const r = rows[v];
    const score = (r.clicks + 1) / (r.impressions + 2);
    return Math.max(0.001, score);
  });

  const total = scores.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;

  for (let i = 0; i < VARIANTS.length; i++) {
    r -= scores[i];
    if (r <= 0) return VARIANTS[i];
  }
  return "A";
}

export async function GET() {
  const result = await prisma.$transaction(async (tx) => {
    // Ensure rows exist
    for (const v of VARIANTS) {
      await tx.landingExperimentStat.upsert({
        where: { variant: v },
        create: { variant: v },
        update: {},
      });
    }

    const stats = await tx.landingExperimentStat.findMany({
      where: { variant: { in: VARIANTS as unknown as string[] } },
      select: { variant: true, impressions: true, clicks: true },
    });

    const map: Record<Variant, { impressions: number; clicks: number }> = {
      A: { impressions: 0, clicks: 0 },
      B: { impressions: 0, clicks: 0 },
      C: { impressions: 0, clicks: 0 },
    };

    for (const s of stats) {
      if (s.variant === "A" || s.variant === "B" || s.variant === "C") {
        map[s.variant] = { impressions: s.impressions, clicks: s.clicks };
      }
    }

    const chosen = pickVariant(map);

    await tx.landingExperimentStat.update({
      where: { variant: chosen },
      data: { impressions: { increment: 1 } },
    });

    return { variant: chosen };
  });

  return NextResponse.json(result);
}
