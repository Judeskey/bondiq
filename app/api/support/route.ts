// app/api/support/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string | null;
  email?: string | null;
  category?: string | null;
  subject?: string | null;
  message?: string | null;
};

function clean(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prettyCategory(cat: string) {
  const c = (cat || "").toLowerCase();
  if (c === "bug") return "Bug / Error";
  if (c === "billing") return "Billing / Subscription";
  if (c === "signin") return "Account / Sign-in";
  if (c === "feedback") return "Feedback";
  if (c === "feature") return "Feature request";
  if (c === "complaint") return "Complaint";
  return "Other";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const categoryRaw = clean(body.category) || "other";
    const category = prettyCategory(categoryRaw);
    const subject = clean(body.subject) || "Support request";
    const message = clean(body.message);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message is too short." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM; // e.g. "BondIQ <care@bondiq.app>"

    if (!apiKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    if (!from) return NextResponse.json({ error: "Missing RESEND_FROM" }, { status: 500 });

    const resend = new Resend(apiKey);

    const to = "care@bondiq.app";

    const fullSubject = `[BondIQ Support • ${category}] ${subject}`;

    const text = [
      "New Support Message (BondIQ)",
      "",
      `Category: ${category}`,
      `From: ${name ? `${name} <${email}>` : email}`,
      `Subject: ${subject}`,
      "",
      message,
    ].join("\n");

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
        <h2 style="margin:0 0 12px">New Support Message (BondIQ)</h2>
        <p style="margin:0 0 6px"><b>Category:</b> ${escapeHtml(category)}</p>
        <p style="margin:0 0 6px"><b>From:</b> ${
          name ? `${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;` : escapeHtml(email)
        }</p>
        <p style="margin:0 0 12px"><b>Subject:</b> ${escapeHtml(subject)}</p>
        <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;padding:12px;border-radius:12px">${escapeHtml(
          message
        )}</pre>
      </div>
    `;

    await resend.emails.send({
      from,
      to,
      subject: fullSubject,
      replyTo: email, // ✅ reply goes to user
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("support send error:", err);
    return NextResponse.json({ error: err?.message || "Send failed" }, { status: 500 });
  }
}
