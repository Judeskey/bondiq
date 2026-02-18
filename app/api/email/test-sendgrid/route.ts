import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function GET() {
  try {
    const msg = {
      to: "your@email.com",
      from: "noreply@bondiq.app",
      subject: "SendGrid test ✅",
      html: "<strong>If you see this, SendGrid works.</strong>",
    };

    await sgMail.send(msg);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      details: err.response?.body,
    });
  }
}
