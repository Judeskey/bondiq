// app/api/exp/click/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["A", "B", "C"]);
const TARGETS = new Set(["signin", "open_app"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const variant = String(body?.variant || "").trim().toUpperCase();
  const target = String(body?.target || "").trim().toLowerCase();

  if (!ALLOWED.has(variant)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  const isSignIn = target === "signin";
  const isOpenApp = target === "open_app";

  if (target && !TARGETS.has(target)) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  // Ensure row exists
  await prisma.landingExperimentStat.upsert({
    where: { variant },
    create: { variant },
    update: {},
  });

  await prisma.landingExperimentStat.update({
    where: { variant },
    data: {
      clicks: { increment: 1 },
      ...(isSignIn ? { signInClicks: { increment: 1 } } : {}),
      ...(isOpenApp ? { openAppClicks: { increment: 1 } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
