// app/api/email/test-weekly-reflection/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyReflectionEmail } from "@/lib/email/sendWeeklyReflection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertSecret(req: Request) {
  const url = new URL(req.url);
  const secret = (url.searchParams.get("secret") || "").trim();
  const expected = (process.env.CRON_SECRET || "").trim();

  if (!expected || secret !== expected) {
    const err: any = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    assertSecret(req);

    const url = new URL(req.url);

    // plan=free|pro (optional)
    const planQ = (url.searchParams.get("plan") || "").toLowerCase();
    const forcePlan =
      planQ === "pro" || planQ === "premium"
        ? ("PREMIUM" as const)
        : planQ === "free"
        ? ("FREE" as const)
        : undefined;

    // email=you@domain.com (optional, but recommended)
    const emailQ = (url.searchParams.get("email") || "").trim().toLowerCase();

    const user = emailQ
      ? await prisma.user.findUnique({
          where: { email: emailQ },
          select: { id: true, email: true },
        })
      : await prisma.user.findFirst({
          where: {
            email: { not: "" }, // ✅ valid for non-nullable string
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true },
        });

    if (!user?.id || !user.email) {
      return NextResponse.json(
        { ok: false, error: "No user found. Pass ?email=you@domain.com" },
        { status: 404 }
      );
    }

    const result = await sendWeeklyReflectionEmail({
      userId: user.id,
      forcePlan,
    });

    return NextResponse.json({ ok: true, sentTo: user.email, result });
  } catch (e: any) {
    const status = e?.status || (e?.message === "UNAUTHORIZED" ? 401 : 500);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Failed to send weekly reflection",
        stack: process.env.NODE_ENV !== "production" ? String(e?.stack || "") : undefined,
      },
      { status }
    );
  }
}
