import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";
import { requireProCouple } from "@/lib/requireProCouple";
import { generatePolish } from "@/lib/aiNarrative";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Auth
    const { email } = await requireUser();

    const me = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!me) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Couple
    const coupleId = await getCoupleForUser(me.id);

    if (!coupleId) {
      return NextResponse.json(
        { ok: false, error: "No couple connected" },
        { status: 400 }
      );
    }

    // ✅ Pro gating
    const gate = await requireProCouple(coupleId);

    if (!gate.ok) {
      return NextResponse.json(
        { ok: false, error: gate.error, code: (gate as any).code },
        { status: gate.status }
      );
    }

    // ✅ Fetch entry
    const entry = await prisma.gratitudeEntry.findFirst({
      where: {
        id: params.id,
        coupleId,
      },
      select: {
        id: true,
        body: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    // ✅ Prompt
    const prompt = `
Rewrite this gratitude memory in a warm, emotionally intelligent tone.
Keep it short (2–3 sentences max).
Do not exaggerate or invent details.

Memory:
"${entry.body}"
`.trim();

    // ✅ AI call
    const polishedRaw = await generatePolish(prompt);

    // ✅ Guarantee string for Prisma
    const polished =
      typeof polishedRaw === "string" ? polishedRaw.trim() : "";

    const finalBody =
      polished.length > 0 ? polished : entry.body;

    // ✅ Update
    const updated = await prisma.gratitudeEntry.update({
      where: { id: entry.id },
      data: {
        body: finalBody,
      },
      select: {
        id: true,
        title: true,
        body: true,
        visibility: true,
        pinned: true,
        createdAt: true,
        resurfacedCount: true,
        lastResurfacedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      entry: updated,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Failed",
      },
      { status: 500 }
    );
  }
}
