// app/api/me/features/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { gateFeatureByEmail } from "@/lib/gating";
import { FEATURES, type FeatureKey } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { email } = await requireUser();

    const url = new URL(req.url);
    const feature = url.searchParams.get("feature") as FeatureKey | null;

    if (!feature) {
      // Return all feature decisions
      const keys = Object.values(FEATURES) as FeatureKey[];
      const all = await Promise.all(
        keys.map(async (k) => {
          const res = await gateFeatureByEmail(email, k);
          return [k, res] as const;
        })
      );

      return NextResponse.json({
        ok: true,
        features: Object.fromEntries(all),
      });
    }

    const res = await gateFeatureByEmail(email, feature);
    return NextResponse.json({ ok: true, feature, decision: res });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 401 }
    );
  }
}
