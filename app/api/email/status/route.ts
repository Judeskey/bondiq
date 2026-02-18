import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyFingerprint(key: string) {
  // Safe: does NOT reveal the key. Just a short hash.
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();

  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
  }
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing ?id=<email_id>" }, { status: 400 });
  }

  const fp = keyFingerprint(apiKey);

  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      keyFingerprint: fp,
      data: json,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to fetch email status", keyFingerprint: fp },
      { status: 500 }
    );
  }
}
