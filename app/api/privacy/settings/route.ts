// app/api/privacy/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VisibilityLevel = "PRIVATE" | "PARTNER" | "COUPLE";

function isVisibility(x: any): x is VisibilityLevel {
  return x === "PRIVATE" || x === "PARTNER" || x === "COUPLE";
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.coupleMember.findFirst({
      where: { userId, couple: { status: "ACTIVE" } },
      select: { id: true, coupleId: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership?.coupleId) {
      return NextResponse.json({ error: "No active couple membership found." }, { status: 400 });
    }

    const me = await prisma.coupleMember.findUnique({
      where: { id: membership.id },
      select: {
        id: true,
        coupleId: true,
        userId: true,
        shareEmotionState: true,
        shareTags: true,
        shareCheckinText: true,
        shareInsights: true,
      },
    });

    return NextResponse.json({ settings: me });
  } catch (err) {
    console.error("GET /api/privacy/settings error:", err);
    return NextResponse.json({ error: "Failed to load privacy settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const membership = await prisma.coupleMember.findFirst({
      where: { userId, couple: { status: "ACTIVE" } },
      select: { id: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership?.id) {
      return NextResponse.json({ error: "No active couple membership found." }, { status: 400 });
    }

    const data: any = {};

    // Only apply fields that are valid VisibilityLevel
    if (isVisibility(body.shareEmotionState)) data.shareEmotionState = body.shareEmotionState;
    if (isVisibility(body.shareTags)) data.shareTags = body.shareTags;
    if (isVisibility(body.shareCheckinText)) data.shareCheckinText = body.shareCheckinText;
    if (isVisibility(body.shareInsights)) data.shareInsights = body.shareInsights;

    // If nothing to update
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid settings provided." },
        { status: 400 }
      );
    }

    const updated = await prisma.coupleMember.update({
      where: { id: membership.id },
      data,
      select: {
        id: true,
        coupleId: true,
        userId: true,
        shareEmotionState: true,
        shareTags: true,
        shareCheckinText: true,
        shareInsights: true,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error("POST /api/privacy/settings error:", err);
    return NextResponse.json({ error: "Failed to update privacy settings" }, { status: 500 });
  }
}
