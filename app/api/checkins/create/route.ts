import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

const VALID_TAGS = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"] as const;
type LoveTag = (typeof VALID_TAGS)[number];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  // Monday as start of week
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);

  return x;
}

function normalizeTags(input: unknown): LoveTag[] {
  if (!Array.isArray(input)) return [];
  const tags = input
    .map((t) => String(t).toUpperCase().trim())
    .filter((t): t is LoveTag => (VALID_TAGS as readonly string[]).includes(t));

  // de-dupe + cap to 3
  return Array.from(new Set(tags)).slice(0, 3);
}

export async function POST(req: Request) {
  try {
    // ✅ Get signed-in user
    const { email } = await requireUser();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Get couple
    const coupleId = await getCoupleForUser(user.id);

    if (!coupleId) {
      return NextResponse.json({ error: "No couple connected" }, { status: 400 });
    }

    // ✅ Parse body
    const body = await req.json();

    const rating = Math.min(5, Math.max(1, Number(body.rating) || 3));
    const text = String(body.text || "").slice(0, 500);

    // ✅ Multi-tag support (up to 3)
    // Expect client sends: { rating, text, tags: ["TOUCH","TIME"] }
    const tags = normalizeTags(body.tags);

    const weekStart = startOfWeek(new Date());

    // ✅ Create check-in
    const checkin = await prisma.checkIn.create({
      data: {
        coupleId,
        userId: user.id,
        weekStart,
        rating,
        whatMadeMeFeelLoved: text,
        languageTags: tags, // <-- requires Prisma field: languageTags String[] @default([])
      },
    });

    return NextResponse.json({ ok: true, checkin });
  } catch (e: any) {
    const message = e?.message || "Unauthorized";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
