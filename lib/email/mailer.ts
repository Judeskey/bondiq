// lib/email/mailer.ts
import { Resend } from "resend";
import sgMail from "@sendgrid/mail";

type Provider = "resend" | "sendgrid";

export type SendMailInput = {
  to: string | string[];
  from?: string; // defaults to EMAIL_FROM
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult = {
  ok: boolean;
  provider?: Provider;
  error?: string;
  details?: any;
};

function envBool(name: string, fallback = false) {
  const v = (process.env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function getProviderOrder(): Provider[] {
  const primary = (process.env.EMAIL_PRIMARY || "resend").trim().toLowerCase() as Provider;
  const fallback = (process.env.EMAIL_FALLBACK || "sendgrid").trim().toLowerCase() as Provider;

  const allowed: Provider[] = ["resend", "sendgrid"];
  const p = allowed.includes(primary) ? primary : "resend";
  const f = allowed.includes(fallback) ? fallback : (p === "resend" ? "sendgrid" : "resend");

  return p === f ? [p] : [p, f];
}

async function sendWithResend(input: Required<Pick<SendMailInput, "to" | "from" | "subject" | "html">> & Pick<SendMailInput, "text">) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if ((result as any)?.error) {
    throw new Error((result as any).error?.message || "Resend send failed");
  }

  return result;
}

async function sendWithSendGrid(input: Required<Pick<SendMailInput, "to" | "from" | "subject" | "html">> & Pick<SendMailInput, "text">) {
  const apiKey = (process.env.SENDGRID_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing SENDGRID_API_KEY");

  sgMail.setApiKey(apiKey);

  // SendGrid accepts string[] for "to" too
  const msg = {
    to: input.to,
    from: input.from,
    subject: input.subject,
    html: input.html,
    text: input.text,
  };

  const result = await sgMail.send(msg as any);
  return result;
}

export async function sendMail(payload: SendMailInput): Promise<SendMailResult> {
  const enabled = envBool("EMAIL_SEND_ENABLED", true);
  if (!enabled) {
    // For magic links, disabling email makes login impossible.
    // Keep it as a hard fail so we notice immediately.
    return { ok: false, error: "EMAIL_SEND_ENABLED is false (email sending disabled)" };
  }

  const from = (payload.from || process.env.EMAIL_FROM || "").trim();
  if (!from) return { ok: false, error: "Missing EMAIL_FROM" };

  const to =
    Array.isArray(payload.to)
      ? payload.to.map((s) => String(s).trim()).filter(Boolean)
      : String(payload.to).trim();

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return { ok: false, error: "Missing to" };
  }

  const order = getProviderOrder();
  let lastErr: any = null;

  for (const provider of order) {
    try {
      if (provider === "resend") {
        await sendWithResend({ to, from, subject: payload.subject, html: payload.html, text: payload.text });
        return { ok: true, provider: "resend" };
      }

      if (provider === "sendgrid") {
        await sendWithSendGrid({ to, from, subject: payload.subject, html: payload.html, text: payload.text });
        return { ok: true, provider: "sendgrid" };
      }
    } catch (e: any) {
      lastErr = e;
      // try next provider
      continue;
    }
  }

  return {
    ok: false,
    error: lastErr?.message || "All providers failed",
    details: lastErr,
  };
}
