import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireUser";
import { getEntitlementsByEmail } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { email } = await requireUser();
    const ent = await getEntitlementsByEmail(email);

    return NextResponse.json({
      ok: true,
      ...ent,
      proUntil: ent.proUntil ? ent.proUntil.toISOString() : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
