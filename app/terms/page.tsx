// app/terms/page.tsx
import SiteFooter from "@/app/components/SiteFooter";

export const metadata = { title: "Terms of Service • BondIQ" };

export default function TermsPage() {
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
              Terms
            </div>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Terms of Service
            </h1>

            <p className="mt-3 text-slate-600">
              These terms govern your use of BondIQ. By using the service, you agree to these terms.
            </p>

            <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-pink-100 to-transparent" />

            <div className="prose prose-slate mt-8 max-w-none">
              <h2>Service</h2>
              <p>
                BondIQ provides relationship reflection tools, reports, and guidance based on your inputs.
              </p>

              <h2>Accounts</h2>
              <ul>
                <li>You are responsible for your account access.</li>
                <li>Do not misuse the service or attempt unauthorized access.</li>
              </ul>

              <h2>Subscriptions</h2>
              <p>Paid plans renew automatically unless canceled. Prices may change with notice.</p>

              <h2>Disclaimer</h2>
              <p>
                BondIQ is for informational and wellness support. It is not medical or professional therapy
                advice.
              </p>

              <h2>Contact</h2>
              <p>
                For help, visit <a href="/support">Support</a>.
              </p>
            </div>

            {/* Quick links */}
            <div className="mt-10 rounded-xl border border-pink-100 bg-pink-50/40 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Quick links</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                <a className="font-semibold text-[#ec4899] hover:underline" href="/privacy">
                  Privacy
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

      {/* Global site footer (public) */}
      <SiteFooter />
    </>
  );
}
