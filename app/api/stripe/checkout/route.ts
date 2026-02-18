// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  interval?: "month" | "year";
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

function pickPriceId(interval: "month" | "year") {
  const monthly =
    process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY ||
    process.env.STRIPE_PRICE_ID_PREMIUM;

  const yearly = process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY;

  if (interval === "year") return yearly || monthly;
  return monthly;
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const body = (await req.json().catch(() => ({}))) as Body;

    const interval: "month" | "year" = body.interval === "year" ? "year" : "month";
    const priceId = pickPriceId(interval);

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price id (monthly/yearly)." },
        { status: 400 }
      );
    }

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!me?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) {
      return NextResponse.json({ error: "Couple not found" }, { status: 400 });
    }

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!couple) {
      return NextResponse.json({ error: "Couple not found" }, { status: 404 });
    }

    let customerId = couple.stripeCustomerId || null;

    // (Optional but recommended) self-heal missing customer:
    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId);
        if ("deleted" in c) customerId = null;
      } catch (e: any) {
        if (e?.code === "resource_missing") customerId = null;
        else throw e;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { coupleId, ownerUserId: me.id },
      });
      customerId = customer.id;

      await prisma.couple.update({
        where: { id: coupleId },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,

      // ✅ ADD THESE (makes webhook 10x more reliable)
      metadata: { coupleId },
      client_reference_id: coupleId,

      subscription_data: {
        metadata: { coupleId },
      },

      success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
