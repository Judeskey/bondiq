import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validatePassword(pw: string) {
  // keep it simple + safe: min 8 chars
  return typeof pw === "string" && pw.length >= 8;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

    if (!validatePassword(newPassword)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // If user already has a password, require current password to change it
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required." }, { status: 400 });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
