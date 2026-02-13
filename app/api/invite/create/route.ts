// app/api/invite/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import crypto from "crypto";
import { getResend } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getBaseUrl(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // IMPORTANT: env base must be like "http://localhost:3001" (NO /app)
  if (envBase) return envBase.replace(/\/+$/, "");
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  return "http://localhost:3001";
}

async function ensureCoupleForUser(userId: string) {
  // If already in a couple, use it.
  const existingCoupleId = await getCoupleForUser(userId);
  if (existingCoupleId) return existingCoupleId;

  // ✅ Bootstrap a couple for brand-new users so onboarding doesn't dead-end.
  const created = await prisma.$transaction(async (tx) => {
    const couple = await tx.couple.create({
      data: {
        billingOwnerUserId: userId, // nice default for billing later
      },
      select: { id: true },
    });

    await tx.coupleMember.create({
      data: {
        coupleId: couple.id,
        userId,
        // privacy defaults already in schema
      },
    });

    return couple.id;
  });

  return created;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const partnerEmail =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ✅ Ensure couple exists (critical for brand-new users after magic-link signup)
    const coupleId = await ensureCoupleForUser(me.id);

    // raw token (only shown once) + store hash only
    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = sha256(token);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invite.create({
      data: {
        coupleId,
        tokenHash,
        expiresAt,
        email: partnerEmail, // optional bind
      },
    });

    const baseUrl = getBaseUrl(req);

    // ✅ PUBLIC invite page (NOT /app/*)
    const inviteUrl =
      `${baseUrl}/invite?token=${encodeURIComponent(token)}` +
      (partnerEmail ? `&email=${encodeURIComponent(partnerEmail)}` : "");

    // ✅ Attempt email send (optional)
    let emailed = false;

    if (partnerEmail) {
      const resend = getResend();
      const from = process.env.RESEND_FROM?.trim(); // e.g. "BondIQ <noreply@bondiq.org>"

      if (resend && from) {
        try {
          await resend.emails.send({
            from,
            to: partnerEmail,
            subject: "You’ve been invited to BondIQ",
            html: `
              <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
                <h2>You’ve been invited to BondIQ</h2>
                <p>Click this link to join and connect:</p>
                <p><a href="${inviteUrl}">${inviteUrl}</a></p>
                <p style="color:#666; font-size:12px;">This invite expires in 7 days.</p>
              </div>
            `,
          });
          emailed = true;
        } catch {
          emailed = false; // link still works
        }
      }
    }

    return NextResponse.json({ ok: true, inviteUrl, emailed, coupleId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create invite" },
      { status: 500 }
    );
  }
}
