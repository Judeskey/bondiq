// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import LandingCtas from "./_components/LandingCtas";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "BondIQ — Relationship Intelligence App for Couples",
  description:
    "BondIQ helps couples turn small weekly check-ins into calm clarity. Get a gentle weekly reflection, relationship insights, gratitude vault, and practical repair suggestions — built for real couples.",

  keywords: [
    "relationship app",
    "couples app",
    "relationship check-in app",
    "relationship tracker for couples",
    "weekly couples check-in",
    "marriage improvement app",
    "relationship insights",
    "gratitude journal for couples",
  ],

  alternates: {
    canonical: "https://bondiq.app/",
  },

  openGraph: {
    title: "BondIQ — Relationship Intelligence for Couples",
    description:
      "Turn tiny weekly check-ins into calm clarity. Weekly reflections, deeper insights, gratitude vault, and gentle repair suggestions for real couples.",
    url: "https://bondiq.app/",
    siteName: "BondIQ",
    type: "website",
    images: [
      {
        url: "https://bondiq.app/og.png",
        width: 1200,
        height: 630,
        alt: "BondIQ — Relationship intelligence, made human",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BondIQ — Relationship Intelligence for Couples",
    description:
      "Weekly reflections + gentle relationship insights for real couples. Start free.",
    images: ["https://bondiq.app/og.png"],
  },
};

type VariantKey = "A" | "B" | "C";

function getVariantFromCookie(): VariantKey {
  const v = cookies().get("bi_lp_v")?.value?.toUpperCase() || "A";
  return v === "A" || v === "B" || v === "C" ? v : "A";
}

export default function HomePage() {
  const variant = getVariantFromCookie();

  const heroCopy: Record<VariantKey, { title: string; body: JSX.Element }> = {
    A: {
      title: "Celebrate what’s working — and catch the tiny drifts early.",
      body: (
        <>
          BondIQ is built for couples who want to protect the love they’ve built — not just “fix problems.”
          <br />
          <br />
          It helps you notice the small shifts that quietly shape a relationship: the days you feel closer,
          the moments you feel distant, and the needs that go unspoken.
          <br />
          <br />
          So you can reconnect early, appreciate each other more often, and keep small drifts from turning
          into real distance.
        </>
      ),
    },
    B: {
      title: "A warmer relationship doesn’t happen by accident.",
      body: (
        <>
          BondIQ turns tiny weekly check-ins into clear, kind insights — the type that help couples stay close.
          <br />
          <br />
          You’ll see what’s improving, what’s drifting, and one gentle action that helps you reset —
          without blame, drama, or therapy-speak.
          <br />
          <br />
          Think of it as a soft relationship “early warning system” that also celebrates the good stuff.
        </>
      ),
    },
    C: {
      title: "Your love has signals. BondIQ helps you read them.",
      body: (
        <>
          Some weeks feel smooth. Some feel “off,” but you can’t explain why.
          BondIQ highlights the pattern — and gives you a calm, practical way to respond.
          <br />
          <br />
          Celebrate wins. Spot tiny deviations. Repair quickly. Repeat.
          <br />
          <br />
          It’s relationship intelligence, made human — designed for real couples with real lives.
        </>
      ),
    },
  };

  const proTip: Record<VariantKey, JSX.Element> = {
    A: (
      <>
        Couples who check in consistently (even briefly) get noticeably sharper reflections.
        Start free — then upgrade when you want deeper pattern detection + richer guidance.
      </>
    ),
    B: (
      <>
        The best results come from “small + steady.” Two minutes weekly beats long sessions once a month —
        and Pro unlocks deeper patterns + more tailored suggestions.
      </>
    ),
    C: (
      <>
        If you want BondIQ to feel “surprisingly accurate,” do 2–3 check-ins first.
        Pro then adds deeper insight layers (patterns, mirrors, and recovery guidance).
      </>
    ),
  };

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

            {/* Logo + Brand: one row. Tagline on its own line (mobile-friendly). */}
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="BondIQ logo" width={44} height={44} priority />
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  BondIQ
                </h1>
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-600 sm:text-base">
                Relationship intelligence, made human
              </div>
            </div>

            {/* NEW: conversion-focused intrigue below tagline */}
            <div className="mt-5">
              <div className="text-lg font-semibold text-slate-900 sm:text-xl">
                {heroCopy[variant].title}
              </div>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                {heroCopy[variant].body}
              </p>
            </div>

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

            {/* CTAs + Pro tip + click tracking */}
            <LandingCtas variant={variant} proTip={proTip[variant]} />
          </div>

          {/* Right: Image card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-sm">
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
          <span className="flex items-center gap-3">
            <SiteFooter />
          </span>
        </div>
      </footer>
    </main>
  );
}
