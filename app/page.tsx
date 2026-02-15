// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      {/* HERO */}
      <section className="bond-card mx-auto max-w-5xl p-6 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          {/* Left: Value prop */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              ✨ Weekly reflection • Gentle, practical • Built for real couples
            </div>

            <div className="flex items-center gap-3">
                <Image
                    src="/logo.png"
                    alt="BondIQ logo"
                    width={48}
                    height={48}
                    priority
                />

                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                    BondIQ
                    <span className="ml-2 align-middle text-base font-semibold text-slate-500 sm:text-lg">
                    relationship intelligence, made human
                    </span>
                </h1>
            </div>


            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
              BondIQ turns your weekly check-ins into a warm, clear reflection: what’s going well,
              what’s drifting, and one gentle idea to reconnect — without blame, drama, or therapy-speak.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="bond-chip">💌 Weekly story</span>
              <span className="bond-chip">🌿 Gentle reset suggestion</span>
              <span className="bond-chip">🧠 Deep insights (Pro)</span>
              <span className="bond-chip">📌 Gratitude Vault (Pro)</span>
            </div>

            {/* Proof + Trust (micro) */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                Private by design
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                Takes ~2 minutes per week
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                Better with consistent check-ins
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="bond-btn bond-btn-primary w-full sm:w-auto" href="/signin">
                Sign in <span aria-hidden>→</span>
              </Link>

              <Link className="bond-btn bond-btn-secondary w-full sm:w-auto" href="/app">
                Open app
              </Link>

              <div className="text-xs text-slate-500 sm:ml-2">
                Invite your partner when ready • No pressure
              </div>
            </div>
          </div>

          {/* Right: Image card */}
          <div className="rounded-3xl border border-slate-200 bg-white/70 shadow-sm overflow-hidden">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src="/landing/couple-hero.png"
                alt="A couple sharing a warm emotional connection"
                fill
                priority
                className="object-cover"
              />
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Built for warmth + clarity</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Your reflection gets sharper with consistent check-ins — even small ones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (reduces confusion) */}
      <section className="mx-auto mt-10 max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bond-card p-5">
            <div className="text-xs font-semibold text-pink-600">Step 1</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">Do a quick check-in</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              2 minutes. A few questions about mood, connection, and what you needed most.
            </p>
          </div>

          <div className="bond-card p-5">
            <div className="text-xs font-semibold text-pink-600">Step 2</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">BondIQ finds the pattern</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              We spot what’s improving, what’s drifting, and the love needs showing up.
            </p>
          </div>

          <div className="bond-card p-5">
            <div className="text-xs font-semibold text-pink-600">Step 3</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">Get your weekly reflection</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              A calm story + one gentle reset idea you can actually do.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET (keep yours, slightly tightened + conversion cues) */}
      <section className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
        <div className="bond-card p-5">
          <div className="text-sm font-semibold text-slate-900">Your weekly reflection</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            A calm summary of your week: emotional trend, what each person needed most, and the small
            patterns worth noticing.
          </p>
          <div className="mt-3 text-xs text-slate-500">
            Clear, kind language • No judgement • Designed for busy couples
          </div>
        </div>

        <div className="bond-card p-5">
          <div className="text-sm font-semibold text-slate-900">One gentle reset idea</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            A practical, low-effort suggestion tailored to your week — perfect for “we’re okay, but we want better.”
          </p>
          <div className="mt-3 text-xs text-slate-500">Small action → big leverage</div>
        </div>

        <div className="bond-card p-5">
          <div className="text-sm font-semibold text-slate-900">Gratitude Vault</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Save moments that matter. Pin forever notes. Let BondIQ resurface warmth when stress or distance shows up.
          </p>
          <div className="mt-3 text-xs text-slate-500">Couple-level Pro feature • Private + shared options</div>
        </div>

        <div className="bond-card p-5">
          <div className="text-sm font-semibold text-slate-900">Deep insights</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            See patterns like best day, hardest day, mid-week dips, and what helps recovery — so you can protect what works.
          </p>
          <div className="mt-3 text-xs text-slate-500">Pro feature • Needs a few check-ins to learn your rhythm</div>
        </div>
      </section>

      {/* PRO TEASER (conversion driver) */}
      <section className="mx-auto mt-10 max-w-5xl">
        <div className="rounded-3xl border border-pink-200 bg-white/70 p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Want deeper clarity? Pro shows what’s underneath the surface.
              </div>
              <p className="mt-1 text-sm text-slate-700">
                Free gives you the weekly reflection. Pro adds pattern detection, partner mirror insights, and deeper guidance.
              </p>

              <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <li className="inline-flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                  Love-need narrative (not just “Theme: TIME”)
                </li>
                <li className="inline-flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                  Partner mirror + “what helps recovery”
                </li>
                <li className="inline-flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                  Deeper weekly guidance + more suggestions
                </li>
                <li className="inline-flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-pink-500" aria-hidden />
                  Gratitude Vault resurfacing moments
                </li>
              </ul>

              <div className="mt-3 text-xs text-slate-500">
                Tip: Consistent check-ins = more accurate insights (even small ones).
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link className="bond-btn bond-btn-primary" href="/signin">
                Start free <span aria-hidden>→</span>
              </Link>
              <Link className="bond-btn bond-btn-secondary" href="/app/settings">
                See Pro features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOR RETURNING USERS (keep) */}
      <section className="mx-auto mt-10 max-w-5xl">
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Already using BondIQ?</div>
              <p className="mt-1 text-sm text-slate-700">
                Jump back in to view your latest reflection, gratitude vault, and suggestions.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link className="bond-btn bond-btn-secondary" href="/app/reports">
                View reports
              </Link>
              <Link className="bond-btn bond-btn-ghost" href="/app/checkin">
                Do a check-in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (objection handling) */}
      <section className="mx-auto mt-10 max-w-5xl">
        <div className="bond-card p-6">
          <div className="text-sm font-semibold text-slate-900">Common questions</div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">Is this therapy?</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                No. It’s a gentle weekly reflection and small practical suggestions — designed to feel human, not clinical.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Do we both have to check in?</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                You can start solo — but reflections get more accurate when both partners check in consistently.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">What if we’re “fine”?</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Perfect. BondIQ helps you protect what works and notice small drifts before they grow.
              </p>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">How long does it take?</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                Usually ~2 minutes per week. The goal is consistency, not intensity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-10 max-w-5xl px-1 text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} BondIQ</span>
          <span className="flex items-center gap-3">
            <Link className="hover:underline" href="/privacy">
              Privacy
            </Link>
            <span className="text-slate-300">•</span>
            <span>Built for warmth + clarity</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
