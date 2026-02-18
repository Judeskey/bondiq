// app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy • BondIQ",
  description:
    "BondIQ’s Privacy Policy explains what data we collect, how we use it, and your choices. We treat relationship data as sensitive and prioritize your privacy.",

  alternates: {
    canonical: "/privacy",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    url: "/privacy",
    title: "Privacy Policy • BondIQ",
    description:
      "Learn how BondIQ protects your data and handles sensitive relationship information.",
    siteName: "BondIQ",
    images: [
      {
        url: "/landing/couple-hero.png",
        width: 1200,
        height: 630,
        alt: "BondIQ — Relationship intelligence, made human",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy • BondIQ",
    description:
      "How BondIQ collects, uses, and protects your relationship data.",
    images: ["/landing/couple-hero.png"],
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[70vh] bg-gradient-to-b from-pink-50/50 to-white px-4 py-14">
      <div className="mx-auto max-w-3xl">
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-pink-100 shadow-sm">
              <img
                src="/logo-mark.png"
                alt="BondIQ"
                className="h-5 w-5"
                loading="lazy"
              />
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              BondIQ
            </span>
          </a>

          <a
            href="/support"
            className="rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-pink-50"
          >
            Support
          </a>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-pink-100 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-[#ec4899] ring-1 ring-pink-100">
            Privacy
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-slate-600">
            Your privacy matters. This page explains what we collect, why we
            collect it, and your choices.
          </p>

          <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-pink-100 to-transparent" />

          <div className="prose prose-slate mt-8 max-w-none">
            <h2>What we collect</h2>
            <ul>
              <li>Account details (email, name)</li>
              <li>Relationship check-in inputs you choose to submit</li>
              <li>Basic usage data for reliability and security</li>
            </ul>

            <h2>How we use it</h2>
            <ul>
              <li>To generate your reports and reflections</li>
              <li>To improve product stability and prevent abuse</li>
              <li>To provide support when you contact us</li>
            </ul>

            <h2>Your choices</h2>
            <ul>
              <li>You can request data export or deletion by contacting support.</li>
              <li>You can unsubscribe from emails via links in messages.</li>
            </ul>

            <h2>Contact</h2>
            <p>
              Questions? Reach us at <a href="/support">Support</a>.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-10 rounded-xl border border-pink-100 bg-pink-50/40 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Quick links</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <a className="font-semibold text-[#ec4899] hover:underline" href="/terms">
                Terms
              </a>
              <a className="font-semibold text-[#ec4899] hover:underline" href="/faq">
                FAQ
              </a>
              <a className="font-semibold text-[#ec4899] hover:underline" href="/support">
                Support
              </a>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BondIQ • Built for clarity, not drama.
        </div>
      </div>
    </main>
  );
}
