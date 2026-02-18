// app/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserOrRedirect } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfWeek(d: Date) {
  const x = new Date(d);
  // Monday-start week
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDate(d: Date) {
  try {
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Card({
  title,
  body,
  right,
}: {
  title: string;
  body: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="bond-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{body}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function SoftBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      {children}
    </div>
  );
}

export default async function AppHome() {
  const { userId } = await requireUserOrRedirect();

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      onboardingCompleted: true,
    },
  });

  // Safety fallback (should be rare)
  if (!me) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome to BondIQ</h1>
        <p className="mt-2 text-sm text-slate-600">Please sign in to continue.</p>
        <div className="mt-6">
          <Link href="/signin" className="bond-btn bond-btn-primary">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // 1) Onboarding gate
  const onboardingCompleted = !!me.onboardingCompleted;

  // 2) Must be connected to a couple
  const coupleId = onboardingCompleted ? await getCoupleForUser(userId) : null;

  // 3) If user hasn't set love profile yet
  const loveProfile = coupleId
    ? await prisma.loveProfile.findFirst({
        where: { userId },
        select: { id: true },
      })
    : null;

  // 4) If no check-in this week
  const weekStart = startOfWeek(new Date());
  const checkin = coupleId
    ? await prisma.checkIn.findFirst({
        where: {
          coupleId,
          userId,
          createdAt: { gte: weekStart },
        },
        select: { id: true, createdAt: true },
      })
    : null;

  // Decide next step + messaging
  const next = (() => {
    if (!onboardingCompleted) {
      return {
        href: "/app/onboarding",
        title: "Finish your setup",
        subtitle: "A quick onboarding makes your reflections feel personal from day one.",
        badge: "Setup",
        cta: "Continue onboarding",
      };
    }

    if (!coupleId) {
      return {
        href: "/app/onboarding",
        title: "Connect your partner",
        subtitle: "BondIQ works best when you’re linked as a couple. Invite your partner to join you.",
        badge: "Couple",
        cta: "Invite partner",
      };
    }

    if (!loveProfile) {
      return {
        href: "/app/settings",
        title: "Set your Love Profile",
        subtitle: "Choose love languages and preferences so your insights feel accurate and warm.",
        badge: "Personalize",
        cta: "Open settings",
      };
    }

    if (!checkin) {
      return {
        href: "/app/checkin",
        title: "Do this week’s check-in",
        subtitle: "It takes under a minute. Your next reflection gets smarter with each check-in.",
        badge: "This week",
        cta: "Start check-in",
      };
    }

    return {
      href: "/app/reports",
      title: "You’re all set",
      subtitle: "Your weekly reflection and insights are ready whenever you are.",
      badge: "Ready",
      cta: "View reports",
    };
  })();

  const displayName = (me.name || me.email || "there").trim();

  return (
    // ✅ Mobile: smaller top padding so no “empty space”. Desktop unchanged.
    // ✅ Mobile: larger bottom padding so content never hides behind bottom tabs.
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:pb-20 sm:pt-10">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white/70 p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill>Weekly reflection letter</Pill>
              <Pill>Deep insights</Pill>
              <Pill>Gratitude Vault</Pill>
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {displayName.split(" ")[0]} 👋
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              BondIQ turns small check-ins into calm clarity — what’s going well, what needs care,
              and one gentle next step to keep closeness easy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={next.href} className="bond-btn bond-btn-primary">
              {next.cta}
            </Link>
            <Link href="/app/reports" className="bond-btn bond-btn-secondary">
              Reports
            </Link>
            <Link href="/app/checkin" className="bond-btn bond-btn-ghost">
              Check-in
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <SoftBox>
            <div className="text-xs font-semibold text-slate-700">This week</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{fmtDate(weekStart)} →</div>
            <div className="mt-1 text-xs text-slate-500">
              BondIQ uses a Monday-start week for your reflections.
            </div>
          </SoftBox>

          <SoftBox>
            <div className="text-xs font-semibold text-slate-700">Your status</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{next.badge}</div>
            <div className="mt-1 text-xs text-slate-500">{next.subtitle}</div>
          </SoftBox>

          <SoftBox>
            <div className="text-xs font-semibold text-slate-700">Last check-in</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {checkin?.createdAt ? fmtDate(checkin.createdAt as unknown as Date) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              If you miss a week, BondIQ gently nudges you back on track.
            </div>
          </SoftBox>
        </div>
      </section>

      {/* Next step card */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card
            title={next.title}
            body={
              <>
                <div>{next.subtitle}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={next.href} className="bond-btn bond-btn-primary">
                    {next.cta}
                  </Link>
                  <Link href="/app/settings" className="bond-btn bond-btn-secondary">
                    Settings
                  </Link>
                  <Link href="/app/gratitude" className="bond-btn bond-btn-secondary">
                    Gratitude
                  </Link>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Tip: the more consistent your check-ins, the more “wow” your weekly reflection feels.
                </div>
              </>
            }
            right={
              <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {next.badge}
              </span>
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Card
              title="Gratitude Vault"
              body="Save meaningful moments and let BondIQ resurface them on hard days — warmth on demand."
              right={
                <Link href="/app/gratitude" className="bond-btn bond-btn-secondary">
                  Open
                </Link>
              }
            />
            <Card
              title="Deep insights"
              body="Spot patterns across days: best day, hardest day, mid-week dips, and what helps you recover."
              right={
                <Link href="/app/reports" className="bond-btn bond-btn-secondary">
                  View
                </Link>
              }
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bond-card p-5">
            <div className="text-sm font-semibold text-slate-900">Quick actions</div>
            <div className="mt-3 grid gap-2">
              <Link href="/app/checkin" className="bond-btn bond-btn-primary justify-between">
                <span>Do a check-in</span>
                <span className="text-white/80">→</span>
              </Link>
              <Link href="/app/reports" className="bond-btn bond-btn-secondary justify-between">
                <span>Open reports</span>
                <span className="text-slate-500">→</span>
              </Link>
              <Link href="/app/settings" className="bond-btn bond-btn-secondary justify-between">
                <span>Settings</span>
                <span className="text-slate-500">→</span>
              </Link>
              <Link href="/privacy" className="bond-btn bond-btn-ghost justify-between">
                <span>Privacy</span>
                <span className="text-slate-500">→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">How BondIQ helps</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span>✓</span>
                <span>Turn daily feelings into calm weekly clarity</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Notice patterns early — before they become fights</span>
              </li>
              <li className="flex gap-2">
                <span>✓</span>
                <span>Repair gently with small, high-leverage suggestions</span>
              </li>
            </ul>

            <div className="mt-4 text-xs text-slate-500">Private by default. You control what is shared.</div>
          </div>
        </div>
      </section>

      <div className="mt-8 text-center text-xs text-slate-500">
        You’re in control • Built for real relationships • Small steps, big closeness
      </div>
    </main>
  );
}
