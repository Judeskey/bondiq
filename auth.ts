// C:\Users\User\bondiq\auth.ts
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/email/mailer";

function hasGoogle() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function appBaseUrl() {
  // Used for links/callbacks (can be localhost in dev)
  const raw =
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001";
  return stripTrailingSlash(raw);
}

function assetBaseUrl() {
  // Used for images in email: MUST be publicly reachable (NOT localhost)
  const raw =
    process.env.BRAND_ASSET_URL ||
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001";
  return stripTrailingSlash(raw);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandEmailHtml(params: { url: string; email: string }) {
  const { url, email } = params;
  const safeEmail = escapeHtml(email);
  const safeUrl = escapeHtml(url);

  const logoUrl = `${assetBaseUrl()}/logo.png`; // ✅ public URL required for email clients
  const brand = "#ec4899";

  return `<!doctype html>
<html>
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in to BondIQ</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your secure BondIQ sign-in link (expires in 30 days).
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:0 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="padding:18px 20px;background:linear-gradient(180deg,#fff1f2 0%,#ffffff 70%);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="vertical-align:middle;">
                            <div style="display:flex;align-items:center;gap:12px;">
                              <img src="${logoUrl}" width="36" height="36" alt="BondIQ" style="border-radius:10px;border:1px solid #e5e7eb;background:white;object-fit:contain;" />
                              <div>
                                <div style="font-size:14px;font-weight:700;color:#0f172a;">BondIQ</div>
                                <div style="font-size:12px;color:#475569;">Relationship intelligence for couples</div>
                              </div>
                            </div>
                          </td>
                          <td align="right" style="font-size:12px;color:#64748b;">
                            Secure sign-in
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 20px 8px;">
                      <h1 style="margin:0;font-size:20px;line-height:1.25;color:#0f172a;">
                        Sign in to your BondIQ account
                      </h1>
                      <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#334155;">
                        We received a request to sign in as <b>${safeEmail}</b>.
                        Click the button below to continue.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:18px 20px;">
                      <a href="${safeUrl}"
                         style="display:inline-block;background:${brand};color:white;text-decoration:none;font-weight:700;
                                padding:12px 18px;border-radius:12px;font-size:14px;">
                        Sign in to BondIQ
                      </a>
                      <div style="margin-top:10px;font-size:12px;color:#64748b;">
                        This link expires in <b>30 days</b>.
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 20px 18px;">
                      <div style="font-size:12px;color:#64748b;line-height:1.6;">
                        If the button doesn’t work, copy and paste this link into your browser:
                      </div>
                      <div style="margin-top:8px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;">
                        <div style="word-break:break-all;font-size:12px;color:#0f172a;line-height:1.6;">${safeUrl}</div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 20px 20px;">
                      <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:12px;color:#64748b;line-height:1.6;">
                        If you didn’t request this email, you can safely ignore it.
                        For help, contact <a href="mailto:care@bondiq.app" style="color:${brand};text-decoration:underline;">care@bondiq.app</a>.
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="text-align:center;margin-top:14px;font-size:11px;color:#94a3b8;padding:0 10px;">
                  BondIQ • Built with care • No therapy talk, no blame — just clarity.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function brandEmailText(params: { url: string; email: string }) {
  const { url, email } = params;
  return [
    "Sign in to BondIQ",
    "",
    `We received a request to sign in as ${email}.`,
    "",
    "Use this link to sign in:",
    url,
    "",
    "This link expires in 30 days.",
    "",
    "If you didn't request this email, you can safely ignore it.",
    "Support: care@bondiq.app",
  ].join("\n");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS,
  },

  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM!, // keep your existing env
      maxAge: THIRTY_DAYS,

      async sendVerificationRequest({ identifier, url }) {
        const subject = "Your BondIQ sign-in link";
        const html = brandEmailHtml({ url, email: identifier });
        const text = brandEmailText({ url, email: identifier });

        const result = await sendMail({
          to: identifier,
          subject,
          html,
          text,
        });

        if (!result.ok) {
          throw new Error(result.error || "Magic link email failed");
        }
      },
    }),

    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password", placeholder: "Your password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),

    ...(hasGoogle()
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  pages: { signIn: "/signin" },
  trustHost: true,
});
