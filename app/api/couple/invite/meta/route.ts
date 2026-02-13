import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const tokenHash = sha256(token);

    // We only need coupleId + timestamps.
    // If you have an inviter relation (createdByUser) then include it; otherwise return null inviter.
    const invite = await prisma.invite.findFirst({
      where: { tokenHash },
      select: {
        coupleId: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        // If your schema supports it, uncomment this and remove the `as any` stuff everywhere:
        // createdByUser: { select: { name: true, email: true } },
      },
    });

    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    // If you don't have inviter relation in schema, just return nulls.
    return NextResponse.json({
      ok: true,
      invite: {
        coupleId: invite.coupleId,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        inviter: {
          name: null,
          email: null,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
