// app/api/stripe/checkout/status/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateFromUnixSeconds(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  return new Date(sec * 1000);
}

function unwrapStripe<T>(res: any): T {
  return res && typeof res === "object" && "data" in res ? (res.data as T) : (res as T);
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const anySub = sub as any;
  return (anySub?.current_period_end ?? null) as number | null;
}

export async function GET(req: Request) {
  try {
    // ✅ Must be logged in (keeps this endpoint from being publicly abusable)
    await requireUser();

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // ✅ Retrieve checkout session from Stripe
    const sessionRaw = await stripe.checkout.sessions.retrieve(sessionId);
    const session = unwrapStripe<Stripe.Checkout.Session>(sessionRaw);

    // ✅ Stripe marks payment as paid/complete
    const paid = session.payment_status === "paid" || session.status === "complete";

    if (!paid) {
      return NextResponse.json({
        ok: true,
        paid: false,
        status: session.status,
        payment_status: session.payment_status,
      });
    }

    // ✅ Prefer coupleId from session metadata (most reliable)
    const coupleId =
      (session.metadata?.coupleId as string | undefined) ||
      (session.client_reference_id as string | undefined);

    if (!coupleId) {
      return NextResponse.json(
        { error: "Missing coupleId on checkout session. Ensure checkout sets session metadata." },
        { status: 400 }
      );
    }

    // Must be a subscription checkout
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    let proUntil: Date | null = null;

    if (subscriptionId) {
      const subRaw = await stripe.subscriptions.retrieve(subscriptionId);
      const sub = unwrapStripe<Stripe.Subscription>(subRaw);
      proUntil = toDateFromUnixSeconds(getSubscriptionPeriodEnd(sub));
    }

    // ✅ Update couple (server-truth)
    const updated = await prisma.couple.update({
      where: { id: coupleId },
      data: {
        planType: "PREMIUM",
        proUntil,
      },
    });

    return NextResponse.json({
      ok: true,
      paid: true,
      coupleId,
      planType: updated.planType,
      proUntil: updated.proUntil,
    });
  } catch (err: any) {
    console.error("checkout status error:", err);
    return NextResponse.json(
      { error: err?.message || "Status check failed" },
      { status: 500 }
    );
  }
}
