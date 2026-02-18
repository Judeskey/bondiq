// app/api/exp/track/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["A", "B", "C"]);
const EVENTS = new Set(["impression", "click"]);
const TARGETS = new Set(["signin", "open_app"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const variant = String(body?.variant || "").trim().toUpperCase();
  const event = String(body?.event || "").trim().toLowerCase();
  const target = String(body?.target || "").trim().toLowerCase();

  if (!ALLOWED.has(variant)) {
    return NextResponse.json({ ok: false, error: "Bad variant" }, { status: 400 });
  }
  if (!EVENTS.has(event)) {
    return NextResponse.json({ ok: false, error: "Bad event" }, { status: 400 });
  }
  if (target && !TARGETS.has(target)) {
    return NextResponse.json({ ok: false, error: "Bad target" }, { status: 400 });
  }

  await prisma.landingExperimentStat.upsert({
    where: { variant },
    create: { variant },
    update: {},
  });

  const isClick = event === "click";
  const isImpression = event === "impression";
  const isSignIn = isClick && target === "signin";
  const isOpenApp = isClick && target === "open_app";

  await prisma.landingExperimentStat.update({
    where: { variant },
    data: {
      ...(isImpression ? { impressions: { increment: 1 } } : {}),
      ...(isClick ? { clicks: { increment: 1 } } : {}),
      ...(isSignIn ? { signInClicks: { increment: 1 } } : {}),
      ...(isOpenApp ? { openAppClicks: { increment: 1 } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
