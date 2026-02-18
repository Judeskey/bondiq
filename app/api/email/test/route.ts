import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function keyFingerprint(key: string) {
  // Safe: does NOT reveal the key. Just a short hash.
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = (url.searchParams.get("to") || "").trim();

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from = (process.env.EMAIL_FROM || "").trim();

  const fp = keyFingerprint(apiKey);

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing RESEND_API_KEY", keyFingerprint: fp }, { status: 500 });
  }
  if (!from) {
    return NextResponse.json({ ok: false, error: "Missing EMAIL_FROM", keyFingerprint: fp }, { status: 500 });
  }
  if (!to) {
    return NextResponse.json(
      { ok: false, error: "Missing ?to=you@example.com", keyFingerprint: fp },
      { status: 400 }
    );
  }

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to,
      subject: "BondIQ Resend test ✅",
      html: `<div style="font-family:system-ui;padding:16px">
        <h2>BondIQ Resend test</h2>
        <p>If you received this, your Resend API + sender are working.</p>
        <p style="color:#666;font-size:12px">Key fingerprint: ${fp}</p>
      </div>`,
    });

    return NextResponse.json({
      ok: true,
      keyFingerprint: fp,
      from,
      to,
      id: (result as any)?.data?.id ?? null,
      result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Send failed", keyFingerprint: fp, details: e },
      { status: 500 }
    );
  }
}
