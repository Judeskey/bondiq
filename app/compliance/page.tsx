// app/compliance/page.tsx
import SiteFooter from "@/app/components/SiteFooter";

export const metadata = { title: "Compliance & Safety • BondIQ" };

export default function CompliancePage() {
  return (
    <>
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
              Safety & Trust
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Compliance & Safety
            </h1>

            <p className="mt-3 text-slate-600">
              Transparency about safety, data handling, and how to reach us for
              sensitive issues.
            </p>

            <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-pink-100 to-transparent" />

            <div className="prose prose-slate mt-8 max-w-none">
              <h2>Data protection</h2>
              <p>
                We handle relationship data as sensitive. Your reflections and
                check-ins are treated with care and protected using modern security
                practices. Learn more in our <a href="/privacy">Privacy Policy</a>.
              </p>

              <h2>AI transparency</h2>
              <p>
                Some insights may be generated or enhanced using AI, based on
                what you submit. AI helps summarize and reflect patterns — it
                does not replace human judgment or professional advice.
              </p>

              <h2>Abuse prevention</h2>
              <p>
                If you believe your account is being misused or accessed without
                permission, contact support immediately so we can investigate.
              </p>

              <h2>Requests</h2>
              <ul>
                <li>Data access or export requests</li>
                <li>Data deletion requests</li>
                <li>Security or privacy concerns</li>
              </ul>

              <h2>Contact</h2>
              <p>
                Go to <a href="/support">Support</a> to submit a request.
              </p>
            </div>

            {/* Quick links */}
            <div className="mt-10 rounded-xl border border-pink-100 bg-pink-50/40 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Quick links</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                <a className="font-semibold text-[#ec4899] hover:underline" href="/privacy">
                  Privacy
                </a>
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

      <SiteFooter />
    </>
  );
}
