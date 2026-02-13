// app/api/love-profile/save/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { LoveLanguage } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLoveLanguage(x: unknown): x is LoveLanguage {
  return x === "WORDS" || x === "TIME" || x === "GIFTS" || x === "SERVICE" || x === "TOUCH";
}

function uniqMax3LoveLanguages(input: unknown): LoveLanguage[] {
  const arr = Array.isArray(input) ? input : [];
  const out: LoveLanguage[] = [];
  const seen = new Set<string>();

  for (const v of arr) {
    const s = typeof v === "string" ? v.trim().toUpperCase() : "";
    if (!s) continue;
    if (seen.has(s)) continue;
    if (!isLoveLanguage(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 3) break;
  }

  return out;
}

function parseJsonField(v: unknown) {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (typeof v === "object") return v;
  return null;
}

export async function POST(req: Request) {
  try {
    const { email } = await requireUser();
    const body = await req.json().catch(() => ({} as any));

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const coupleId = await getCoupleForUser(me.id);
    if (!coupleId) return NextResponse.json({ error: "No couple connected" }, { status: 400 });

    // Optional: update user's display name from onboarding step 1
    const nextName = typeof body?.name === "string" ? body.name.trim() : "";
    if (nextName && nextName.length >= 2 && nextName !== (me.name || "")) {
      await prisma.user.update({
        where: { id: me.id },
        data: { name: nextName },
      });
    }

    // ✅ Primary/Secondary arrays (max 3 each)
    const primary = uniqMax3LoveLanguages(body.primaryLanguages);
    const secondaryRaw = uniqMax3LoveLanguages(body.secondaryLanguages);

    // Prevent overlap between lists
    const primarySet = new Set(primary);
    const secondary = secondaryRaw.filter((x) => !primarySet.has(x)).slice(0, 3);

    if (primary.length === 0) {
      return NextResponse.json(
        { error: "Select at least 1 primary love language" },
        { status: 400 }
      );
    }

    // Keep schema unchanged: enum columns as fallback (first item)
    const primaryLanguage: LoveLanguage = primary[0];
    const secondaryLanguage: LoveLanguage | null = secondary[0] ?? null;

    const avoidList = parseJsonField(body.avoidList);
    const expressionStyle = parseJsonField(body.expressionStyle);

    const mergedExpressionStyle =
      expressionStyle && typeof expressionStyle === "object" && !Array.isArray(expressionStyle)
        ? {
            ...(expressionStyle as any),
            primaryLanguages: primary,
            secondaryLanguages: secondary,
          }
        : {
            primaryLanguages: primary,
            secondaryLanguages: secondary,
          };

    const saved = await prisma.loveProfile.upsert({
      where: { coupleId_userId: { coupleId, userId: me.id } },
      create: {
        coupleId,
        userId: me.id,
        primaryLanguage,
        secondaryLanguage,
        avoidList,
        expressionStyle: mergedExpressionStyle,
        completedAt: new Date(),
      },
      update: {
        primaryLanguage,
        secondaryLanguage,
        avoidList,
        expressionStyle: mergedExpressionStyle,
        completedAt: new Date(),
      },
      select: {
        id: true,
        coupleId: true,
        userId: true,
        primaryLanguage: true,
        secondaryLanguage: true,
        avoidList: true,
        expressionStyle: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, profile: saved });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}
