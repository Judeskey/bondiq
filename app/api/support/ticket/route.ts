// app/api/support/ticket/route.ts
import { NextResponse } from "next/server";
import { getResend, getCareFromAddress, getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(s: unknown, max = 2000) {
  return String(s ?? "").trim().slice(0, max);
}

export async function POST(req: Request) {
  try {
    const resend = getResend();
    if (!resend) {
      return NextResponse.json(
        { ok: false, error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    // Basic fields
    const name = clean(body?.name, 120);
    const email = clean(body?.email, 180).toLowerCase();
    const category = clean(body?.category, 60);
    const subject = clean(body?.subject, 140);
    const message = clean(body?.message, 6000);

    // Honeypot (spam bots fill hidden inputs)
    const hp = clean(body?.company, 60);
    if (hp) {
      return NextResponse.json({ ok: true }); // silently accept
    }

    // Minimal validation
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Message is too short" },
        { status: 400 }
      );
    }

    const from = getCareFromAddress(); // e.g. "BondIQ <care@bondiq.app>"
    const appUrl = getAppUrl();

    const safeSubject = subject ? subject : `${category || "Support"} request`;
    const emailSubject = `BondIQ Support — ${safeSubject}`;

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
        <h2 style="margin:0 0 12px 0;">New support request</h2>
        <p style="margin:0 0 8px 0;"><strong>From:</strong> ${escapeHtml(name || "—")} (${escapeHtml(email)})</p>
        <p style="margin:0 0 8px 0;"><strong>Category:</strong> ${escapeHtml(category || "—")}</p>
        <p style="margin:0 0 8px 0;"><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <pre style="white-space:pre-wrap;margin:0;font-size:14px;line-height:1.6;color:#0f172a;">${escapeHtml(
          message
        )}</pre>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;" />
        <p style="margin:0;color:#64748b;font-size:12px;">
          Sent from ${escapeHtml(appUrl)} /support
        </p>
      </div>
    `;

    const text =
      `New support request\n\n` +
      `From: ${name || "—"} (${email})\n` +
      `Category: ${category || "—"}\n` +
      `Subject: ${safeSubject}\n\n` +
      `${message}\n`;

    const res = await resend.emails.send({
      from,
      to: "care@bondiq.app",
      replyTo: email, // so you can reply directly
      subject: emailSubject,
      html,
      text,
    });

    return NextResponse.json({ ok: true, id: (res as any)?.data?.id ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to submit support request" },
      { status: 500 }
    );
  }
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
