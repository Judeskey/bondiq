// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

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

export async function POST(req: Request) {
  console.log("[stripe] webhook hit", new Date().toISOString());
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature failed:", err?.message);
    return NextResponse.json(
      { error: `Webhook signature failed: ${err?.message || "invalid"}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ Prefer session metadata (most reliable)
      let coupleId =
        (session.metadata?.coupleId as string | undefined) ||
        (session.client_reference_id as string | undefined);

      let proUntil: Date | null = null;

      // If missing, fall back to subscription metadata
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (subscriptionId) {
        const subRaw = await stripe.subscriptions.retrieve(subscriptionId);
        const sub = unwrapStripe<Stripe.Subscription>(subRaw);

        coupleId = coupleId || ((sub as any)?.metadata?.coupleId as string | undefined);
        proUntil = toDateFromUnixSeconds(getSubscriptionPeriodEnd(sub));
      }

      console.log("[stripe] checkout.session.completed", { coupleId, subscriptionId });

      if (coupleId) {
        await prisma.couple.update({
          where: { id: coupleId },
          data: {
            planType: "PREMIUM",
            proUntil,
          },
        });
        console.log("[stripe] couple updated to PREMIUM", { coupleId, proUntil });
      } else {
        console.warn("[stripe] missing coupleId; cannot update plan");
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription;
      const coupleId = (sub as any)?.metadata?.coupleId as string | undefined;

      console.log("[stripe] subscription event", { type: event.type, coupleId, status: sub.status });

      if (coupleId) {
        const isActive = ["trialing", "active"].includes(sub.status);
        const proUntil = isActive ? toDateFromUnixSeconds(getSubscriptionPeriodEnd(sub)) : null;

        await prisma.couple.update({
          where: { id: coupleId },
          data: {
            planType: isActive ? "PREMIUM" : "FREE",
            proUntil: isActive ? proUntil : null,
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const coupleId = (sub as any)?.metadata?.coupleId as string | undefined;

      console.log("[stripe] subscription deleted", { coupleId });

      if (coupleId) {
        await prisma.couple.update({
          where: { id: coupleId },
          data: { planType: "FREE", proUntil: null },
        });
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("stripe webhook handler error:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
