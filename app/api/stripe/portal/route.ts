// app/api/stripe/portal/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

export async function POST() {
  try {
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!me?.id) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "Couple not found" }, { status: 400 });

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { stripeCustomerId: true },
    });

    if (!couple?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer for this couple yet." }, { status: 400 });
    }

    const baseUrl = getBaseUrl();

    const portal = await stripe.billingPortal.sessions.create({
      customer: couple.stripeCustomerId,
      // ✅ After they download invoice/receipt, they come back to reports
      return_url: `${baseUrl}/app/reports`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("portal error:", err);
    return NextResponse.json({ error: err?.message || "Portal failed" }, { status: 500 });
  }
}
