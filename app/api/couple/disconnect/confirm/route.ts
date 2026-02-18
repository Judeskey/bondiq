// app/api/couple/disconnect/confirm/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function norm(s: unknown) {
  return String(s ?? "").trim();
}

export async function POST(req: Request) {
  const { userId, email } = await requireUser();
  const body = await req.json().catch(() => ({}));

  const token = norm(body?.token);
  const typedPhrase = norm(body?.phrase);
  const partnerEmail = norm(body?.partnerEmail).toLowerCase();

  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  if (!typedPhrase)
    return NextResponse.json({ error: "Please type the confirmation phrase." }, { status: 400 });
  if (!partnerEmail)
    return NextResponse.json({ error: "Partner email is required." }, { status: 400 });

  const coupleId = await getCoupleForUser(userId);
  if (!coupleId) return NextResponse.json({ error: "No couple found." }, { status: 404 });

  const confirmHash = sha256(token);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const reqRow = await tx.disconnectRequest.findUnique({
      where: { confirmHash },
      select: {
        id: true,
        coupleId: true,
        requesterUserId: true,
        phrase: true,
        expiresAt: true,
        confirmedAt: true,
        cancelledAt: true,
      },
    });

    if (!reqRow)
      return { ok: false as const, status: 404, error: "Invalid or expired confirmation." };

    if (reqRow.coupleId !== coupleId)
      return {
        ok: false as const,
        status: 403,
        error: "This confirmation does not match your current couple.",
      };

    if (reqRow.requesterUserId !== userId)
      return {
        ok: false as const,
        status: 403,
        error: "This confirmation was created by a different user.",
      };

    if (reqRow.cancelledAt)
      return { ok: false as const, status: 410, error: "This confirmation was cancelled." };

    if (reqRow.confirmedAt)
      return { ok: false as const, status: 409, error: "This confirmation was already used." };

    if (reqRow.expiresAt <= now)
      return { ok: false as const, status: 410, error: "Confirmation expired. Please start again." };

    if (typedPhrase !== reqRow.phrase)
      return { ok: false as const, status: 400, error: "Confirmation phrase does not match." };

    // Verify partner email matches the OTHER member of this couple
    const members = await tx.coupleMember.findMany({
      where: { coupleId },
      select: { userId: true },
    });

    if (members.length < 2)
      return { ok: false as const, status: 400, error: "No partner found to disconnect from." };

    const users = await tx.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, email: true },
    });

    const myEmail = (email || "").toLowerCase();
    const partner = users.find((u) => (u.email || "").toLowerCase() !== myEmail);

    if (!partner?.email)
      return { ok: false as const, status: 400, error: "Unable to resolve partner email." };

    if (partner.email.toLowerCase() !== partnerEmail)
      return {
        ok: false as const,
        status: 400,
        error: "Partner email does not match. Please double-check.",
      };

    // Remove this user from the current couple
    await tx.coupleMember.deleteMany({
      where: { coupleId, userId },
    });

    // Create a new solo couple for this user.
    // ✅ IMPORTANT: timezone is a non-null String with default, so do NOT set it to null.
    // Let defaults apply (timezone defaults to "America/Toronto", reportDay=0, reportTimeMinutes=540, planType=FREE, etc.)
    const newCouple = await tx.couple.create({
      data: {
        // Optional: inherit timezone/report schedule from prior couple for better UX
        // If you prefer that, uncomment the block below.
        //
        // ...(await tx.couple.findUnique({
        //   where: { id: coupleId },
        //   select: { timezone: true, reportDay: true, reportTimeMinutes: true },
        // })),

        planType: "FREE",
        proUntil: null,
        billingOwnerUserId: userId, // optional but helpful for future billing
        planUpdatedAt: now,
      },
      select: { id: true },
    });

    await tx.coupleMember.create({
      data: { coupleId: newCouple.id, userId },
    });

    // Force user into onboarding invite step so they can connect a new partner
    await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStep: 2,
        onboardingCompleted: false,
      },
    });

    await tx.disconnectRequest.update({
      where: { id: reqRow.id },
      data: { confirmedAt: now },
    });

    return { ok: true as const, newCoupleId: newCouple.id };
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    newCoupleId: result.newCoupleId,
    redirectTo: "/app/onboarding",
  });
}
