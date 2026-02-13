// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const token = body?.token ? String(body.token).trim() : null;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  // ✅ If registering via invite, validate invite + bind email
  if (token) {
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: sha256(token) },
      select: { email: true, expiresAt: true, acceptedAt: true },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
    if (invite.acceptedAt) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    if (invite.expiresAt <= new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

    if (invite.email && invite.email.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "This invite was sent to a different email" },
        { status: 403 }
      );
    }
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      ...(name ? { name } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
