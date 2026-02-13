import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEmail(e: string) {
  return e.toLowerCase().trim();
}

function isValidTimezone(tz: string) {
  return /^[A-Za-z_]+\/[A-Za-z_\-]+$/.test(tz.trim());
}

function isValidHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

function isValidDataImageUrl(s: string) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s.trim());
}

function isValidAvatarUrl(s: string) {
  const t = s.trim();
  return isValidHttpUrl(t) || isValidDataImageUrl(t);
}

// ✅ GET: load current profile fields for Settings UI
export async function GET() {
  try {
    const { email } = await requireUser();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail(email) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true, // oauth image (optional)
        profileImageUrl: true, // user-chosen avatar (BondIQ)
        timezone: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}

// ✅ POST: save profile fields (name, profileImageUrl, timezone)
export async function POST(req: Request) {
  try {
    const { email } = await requireUser();

    const body = await req.json().catch(() => ({} as any));

    const nameRaw = typeof body?.name === "string" ? body.name.trim() : "";
    const profileImageUrlRaw =
      typeof body?.profileImageUrl === "string" ? body.profileImageUrl.trim() : "";
    const timezoneRaw = typeof body?.timezone === "string" ? body.timezone.trim() : "";

    const name = nameRaw ? nameRaw : null;
    const profileImageUrl = profileImageUrlRaw ? profileImageUrlRaw : null;
    const timezone = timezoneRaw ? timezoneRaw : null;

    if (name && name.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    if (profileImageUrl && !isValidAvatarUrl(profileImageUrl)) {
      return NextResponse.json(
        { error: "profileImageUrl must be a valid http(s) URL or an uploaded image" },
        { status: 400 }
      );
    }

    if (timezone && !isValidTimezone(timezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone format. Example: "America/Toronto"' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email: cleanEmail(email) },
      data: {
        name,
        ...(typeof body?.profileImageUrl !== "undefined" ? { profileImageUrl } : {}),
        ...(typeof body?.timezone !== "undefined" ? { timezone } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        profileImageUrl: true,
        timezone: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
