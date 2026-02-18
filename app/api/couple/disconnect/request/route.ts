// app/api/couple/disconnect/request/route.ts
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

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function makePhrase() {
  // Hard to do by accident
  return "DISCONNECT MY COUPLE";
}

export async function POST() {
  const { userId } = await requireUser();

  const coupleId = await getCoupleForUser(userId);
  if (!coupleId) {
    return NextResponse.json({ error: "No couple found." }, { status: 404 });
  }

  const memberCount = await prisma.coupleMember.count({ where: { coupleId } });
  if (memberCount <= 1) {
    return NextResponse.json(
      { error: "You are not connected to a partner yet." },
      { status: 400 }
    );
  }

  const token = makeToken();
  const confirmHash = sha256(token);
  const phrase = makePhrase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const now = new Date();

  // Cancel any previous pending requests from this user in this couple
  await prisma.disconnectRequest.updateMany({
    where: {
      coupleId,
      requesterUserId: userId,
      confirmedAt: null,
      cancelledAt: null,
      expiresAt: { gt: now },
    },
    data: { cancelledAt: now },
  });

  await prisma.disconnectRequest.create({
    data: {
      coupleId,
      requesterUserId: userId,
      confirmHash,
      phrase,
      expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    token,
    phrase,
    expiresAt: expiresAt.toISOString(),
  });
}
