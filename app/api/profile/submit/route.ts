import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

const VALID = ["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"] as const;
type LoveLanguage = (typeof VALID)[number];

function isLoveLanguage(x: any): x is LoveLanguage {
  return typeof x === "string" && (VALID as readonly string[]).includes(x);
}

function normalizeArray(input: any, max = 3): LoveLanguage[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter(isLoveLanguage)
    .map((s: LoveLanguage) => s)
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .slice(0, max);
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(user.id);
    if (!coupleId) return NextResponse.json({ error: "No couple yet" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const primaryLanguages = normalizeArray(body.primaryLanguages, 3);
    const secondaryLanguagesRaw = normalizeArray(body.secondaryLanguages, 3);

    if (primaryLanguages.length === 0) {
      return NextResponse.json({ error: "Pick at least 1 primary love language" }, { status: 400 });
    }

    // Remove any overlap between primary and secondary
    const secondaryLanguages = secondaryLanguagesRaw.filter(
      (x) => !primaryLanguages.includes(x)
    );

    const avoidList = Array.isArray(body.avoidList)
      ? body.avoidList
          .map((s: any) => String(s).trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const extraLovedText =
      typeof body.extraLovedText === "string" ? body.extraLovedText.trim().slice(0, 500) : "";

    const existing = await prisma.loveProfile.findUnique({
      where: { coupleId_userId: { coupleId, userId: user.id } },
      select: { expressionStyle: true },
    });

    const prevExpressionStyle =
      existing?.expressionStyle && typeof existing.expressionStyle === "object"
        ? (existing.expressionStyle as any)
        : {};

    const expressionStyle = {
      ...prevExpressionStyle,
      loveLanguages: {
        primary: primaryLanguages.map((id, idx) => ({
          id,
          // simple weights: 1.0, 0.85, 0.7
          weight: idx === 0 ? 1 : idx === 1 ? 0.85 : 0.7,
        })),
        secondary: secondaryLanguages.map((id, idx) => ({
          id,
          // simple weights: 0.6, 0.5, 0.4
          weight: idx === 0 ? 0.6 : idx === 1 ? 0.5 : 0.4,
        })),
        extraLovedText,
      },
    };

    const profile = await prisma.loveProfile.upsert({
      where: { coupleId_userId: { coupleId, userId: user.id } },
      update: {
        primaryLanguage: primaryLanguages[0],
        secondaryLanguage: secondaryLanguages[0] ?? null,
        avoidList,
        expressionStyle,
        completedAt: new Date(),
      },
      create: {
        coupleId,
        userId: user.id,
        primaryLanguage: primaryLanguages[0],
        secondaryLanguage: secondaryLanguages[0] ?? null,
        avoidList,
        expressionStyle,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
      primaryLanguages,
      secondaryLanguages,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
