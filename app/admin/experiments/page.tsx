import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  variant: "A" | "B" | "C";
  impressions: number;
  clicks: number;
  signInClicks: number;
  openAppClicks: number;
  updatedAt: string;
};

function isAdminEmail(email: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allow.length === 0) return false;
  return allow.includes(email.toLowerCase());
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(2)}%`;
}

export default async function ExperimentsAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;

  if (!isAdminEmail(email)) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">Forbidden.</p>
      </main>
    );
  }

  const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/exp/stats`, {
    cache: "no-store",
    headers: { cookie: "" },
  }).catch(() => null);

  const json = (await res?.json().catch(() => null)) as { ok: boolean; rows: Row[] } | null;
  const rows = json?.rows ?? [];

  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions || 0;
      acc.clicks += r.clicks || 0;
      acc.signInClicks += r.signInClicks || 0;
      return acc;
    },
    { impressions: 0, clicks: 0, signInClicks: 0 }
  );

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xs font-semibold text-pink-600">BondIQ Admin</div>
        <h1 className="mt-1 text-2xl font-semibold">Landing A/B/C performance</h1>
        <p className="mt-2 text-sm text-slate-600">
          Global learning across all users. Counts are cumulative.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-slate-500">Total impressions</div>
            <div className="mt-1 text-xl font-semibold">{totals.impressions}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-xs text-slate-500">Total clicks</div>
            <div className="mt-1 text-xl font-semibold">{totals.clicks}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-xs text-slate-500">Sign-in clicks</div>
            <div className="mt-1 text-xl font-semibold">{totals.signInClicks}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Variant</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">CTR</th>
                <th className="p-3">Sign-in clicks</th>
                <th className="p-3">Sign-in rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
                  const signInRate = r.impressions > 0 ? r.signInClicks / r.impressions : 0;

                  return (
                    <tr key={r.variant} className="border-t">
                      <td className="p-3 font-semibold">{r.variant}</td>
                      <td className="p-3">{r.impressions}</td>
                      <td className="p-3">{r.clicks}</td>
                      <td className="p-3">{pct(ctr)}</td>
                      <td className="p-3">{r.signInClicks}</td>
                      <td className="p-3">{pct(signInRate)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-t">
                  <td className="p-3 text-slate-600" colSpan={6}>
                    No stats yet. Load the landing page a few times.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Tip: If you want “winner gets served more”, we’ll add a chooser that weights variants using these stats.
        </div>
      </div>
    </main>
  );
}
