// app/api/invite/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import crypto from "crypto";
import { sendMail } from "@/lib/email/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getBaseUrl(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envBase) return envBase.replace(/\/+$/, "");
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  return "http://localhost:3001";
}

async function ensureCoupleForUser(userId: string) {
  const existingCoupleId = await getCoupleForUser(userId);
  if (existingCoupleId) return existingCoupleId;

  const created = await prisma.$transaction(async (tx) => {
    const couple = await tx.couple.create({
      data: {
        billingOwnerUserId: userId,
      },
      select: { id: true },
    });

    await tx.coupleMember.create({
      data: {
        coupleId: couple.id,
        userId,
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
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : null;

    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!me)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await ensureCoupleForUser(me.id);

    // Prevent inviting when already connected
    const memberCount = await prisma.coupleMember.count({
      where: { coupleId },
    });

    if (memberCount >= 2) {
      return NextResponse.json(
        {
          ok: false,
          error: "ALREADY_CONNECTED",
          message:
            "You are already connected to a partner. Disconnect first before inviting a new partner.",
        },
        { status: 409 }
      );
    }

    // Create invite
    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.invite.create({
      data: {
        coupleId,
        tokenHash,
        expiresAt,
        email: partnerEmail,
      },
    });

    const baseUrl = getBaseUrl(req);

    const inviteUrl =
      `${baseUrl}/invite?token=${encodeURIComponent(token)}` +
      (partnerEmail
        ? `&email=${encodeURIComponent(partnerEmail)}`
        : "");

    let emailed = false;

    // ✅ Unified mailer (Resend → SendGrid fallback)
    if (partnerEmail) {
      const from = process.env.EMAIL_FROM?.trim();

      if (from) {
        try {
          const result = await sendMail({
            to: partnerEmail,
            subject: "You’ve been invited to BondIQ 💞",
            html: `
              <div style="font-family:system-ui;line-height:1.5">
                <h2>You’ve been invited to BondIQ</h2>
                <p>${me.name || me.email} invited you to connect on BondIQ.</p>
                <p>
                  <a href="${inviteUrl}" style="
                    display:inline-block;
                    background:#ec4899;
                    color:white;
                    padding:10px 16px;
                    border-radius:8px;
                    text-decoration:none;
                    font-weight:600;
                  ">
                    Accept Invite
                  </a>
                </p>
                <p style="font-size:12px;color:#666">
                  This invite expires in 7 days.
                </p>
              </div>
            `,
            text: `
You've been invited to BondIQ

${me.name || me.email} invited you to connect.

Accept invite:
${inviteUrl}

This invite expires in 7 days.
            `,
          });

          emailed = result.ok;
        } catch {
          emailed = false;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      inviteUrl,
      emailed,
      coupleId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create invite" },
      { status: 500 }
    );
  }
}
