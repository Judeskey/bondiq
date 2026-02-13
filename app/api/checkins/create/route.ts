// app/api/checkins/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  x.setDate(x.getDate() + diff);
  return x;
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const rating = Number(body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const rawText = typeof body?.text === "string" ? body.text : "";
    const text = rawText.trim().slice(0, 500); // ✅ allow empty string

    const tags = Array.isArray(body?.tags) ? body.tags.slice(0, 3).map(String) : [];

    const weekStart = startOfWeek(new Date());

    const created = await prisma.checkIn.create({
      data: {
        coupleId,
        userId: me.id,
        weekStart,
        rating,
        whatMadeMeFeelLoved: text, // ✅ empty string ok (schema unchanged)
        languageTags: tags as any,
      },
      select: {
        id: true,
        rating: true,
        whatMadeMeFeelLoved: true,
        languageTags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, entry: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: 401 });
  }
}
