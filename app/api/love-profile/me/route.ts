// app/api/love-profile/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoveLanguage = "WORDS" | "TIME" | "GIFTS" | "SERVICE" | "TOUCH";
const LOVE_SET = new Set<LoveLanguage>(["WORDS", "TIME", "GIFTS", "SERVICE", "TOUCH"]);

function normalizeLangArray(v: any): LoveLanguage[] {
  if (!Array.isArray(v)) return [];
  const cleaned = v
    .map((x) => String(x || "").trim().toUpperCase())
    .filter((x) => LOVE_SET.has(x as LoveLanguage)) as LoveLanguage[];
  // de-dupe, preserve order
  return Array.from(new Set(cleaned));
}

async function handleWrite(req: Request) {
  try {
    const { userId } = await requireUser();

    const body = await req.json().catch(() => ({}));

    // Accept BOTH shapes:
    // 1) { name, primary, secondary }
    // 2) { name, primaryLanguages, secondaryLanguages }
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const primary = normalizeLangArray(body?.primary ?? body?.primaryLanguages);
    const secondary = normalizeLangArray(body?.secondary ?? body?.secondaryLanguages);

    if (name && name.length < 2) {
      return NextResponse.json(
        { error: "Please enter your name (at least 2 characters)." },
        { status: 400 }
      );
    }
    if (primary.length < 1) {
      return NextResponse.json(
        { error: "Select at least 1 primary love language." },
        { status: 400 }
      );
    }
    if (primary.length > 3 || secondary.length > 3) {
      return NextResponse.json(
        { error: "You can choose up to 3 primary and up to 3 secondary love languages." },
        { status: 400 }
      );
    }

    // secondary cannot overlap primary
    const secondaryClean = secondary.filter((x) => !primary.includes(x));

    const coupleId = await getCoupleForUser(userId);
    if (!coupleId) {
      return NextResponse.json({ error: "No couple connected yet." }, { status: 409 });
    }

    // Save both name + love profile atomically
    await prisma.$transaction(async (tx) => {
      if (name) {
        await tx.user.update({
          where: { id: userId },
          data: { name },
        });
      }

      // LoveProfile model in your schema:
      // primaryLanguage (single) + secondaryLanguage (single optional)
      // Your onboarding allows multiple selections, so we store:
      // - primaryLanguage = first primary
      // - secondaryLanguage = first secondary (non-overlapping)
      await tx.loveProfile.upsert({
        where: { coupleId_userId: { coupleId, userId } },
        create: {
          coupleId,
          userId,
          primaryLanguage: primary[0],
          secondaryLanguage: secondaryClean[0] ?? null,
          completedAt: new Date(),
          // optionally store extras in Json fields:
          expressionStyle: {
            primaryLanguages: primary,
            secondaryLanguages: secondaryClean,
          } as any,
        },
        update: {
          primaryLanguage: primary[0],
          secondaryLanguage: secondaryClean[0] ?? null,
          completedAt: new Date(),
          expressionStyle: {
            primaryLanguages: primary,
            secondaryLanguages: secondaryClean,
          } as any,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      saved: true,
      primary,
      secondary: secondaryClean,
    });
  } catch (e: any) {
    const message = e?.message || "Unauthorized";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  return handleWrite(req);
}

export async function PATCH(req: Request) {
  return handleWrite(req);
}
