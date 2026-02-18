// app/app/admin/experiments/page.tsx
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPERIMENT = "home_hero_copy_v1";
const VARIANTS = ["A", "B", "C"] as const;
type Variant = (typeof VARIANTS)[number];

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

type Row = { variant: string; impressions: number; clicks: number };

async function detectExperimentColumn(): Promise<string | null> {
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name IN ('LandingExperimentStat', 'landingexperimentstat')
  `);

  const set = new Set(cols.map((c) => c.column_name));

  const candidates = [
    "experiment",
    "experimentKey",
    "experiment_key",
    "experimentName",
    "experiment_name",
    "experimentId",
    "experiment_id",
  ];

  for (const c of candidates) {
    if (set.has(c)) return c;
  }
  return null;
}

export default async function ExperimentsAdminPage() {
  // ✅ FIX: use NextAuth server session (no crashing)
  const session = await auth();
  const email = (session?.user?.email || "").trim().toLowerCase();

  if (!email) {
    redirect(`/signin?next=${encodeURIComponent("/app/admin/experiments")}`);
  }

  // Admin allowlist: ADMIN_EMAILS="a@x.com,b@y.com"
  const adminList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.length && !adminList.includes(email)) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to this page.</p>
      </main>
    );
  }

  const expCol = await detectExperimentColumn();

  let rows: Row[] = [];
  if (expCol) {
    rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT variant, impressions, clicks
      FROM "LandingExperimentStat"
      WHERE ${Prisma.raw(`"${expCol}"`)} = ${EXPERIMENT}
      ORDER BY variant ASC
    `);
  } else {
    rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT variant, impressions, clicks
      FROM "LandingExperimentStat"
      ORDER BY variant ASC
    `);
  }

  const base: Record<Variant, { variant: Variant; impressions: number; clicks: number }> = {
    A: { variant: "A", impressions: 0, clicks: 0 },
    B: { variant: "B", impressions: 0, clicks: 0 },
    C: { variant: "C", impressions: 0, clicks: 0 },
  };

  for (const r of rows) {
    const v = String(r.variant || "").toUpperCase() as Variant;
    if (v === "A" || v === "B" || v === "C") {
      base[v] = {
        variant: v,
        impressions: Number(r.impressions || 0),
        clicks: Number(r.clicks || 0),
      };
    }
  }

  const computed = VARIANTS.map((v) => {
    const r = base[v];
    const ctr = r.impressions > 0 ? r.clicks / r.impressions : 0;
    return { ...r, ctr };
  });

  const winner = computed.reduce(
    (best, cur) => (cur.ctr > best.ctr ? cur : best),
    computed[0] || { variant: "A", impressions: 0, clicks: 0, ctr: 0 }
  );

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Landing A/B/C Performance</h1>

      <p className="mt-2 text-sm text-slate-600">
        Experiment key: <span className="font-mono">{EXPERIMENT}</span>
        {expCol ? (
          <span className="ml-2 text-xs text-slate-500">(filtered by column: {expCol})</span>
        ) : (
          <span className="ml-2 text-xs text-amber-600">
            (no experiment column found — showing all rows)
          </span>
        )}
      </p>

      <div className="mt-4 rounded-2xl border bg-white/70 p-4">
        <div className="text-sm font-semibold">
          Winner so far: <span className="font-mono">{winner?.variant || "—"}</span>{" "}
          <span className="text-slate-500">(CTR {pct(winner?.ctr || 0)})</span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white/70">
        <table className="w-full text-sm">
          <thead className="border-b bg-white">
            <tr>
              <th className="p-3 text-left">Variant</th>
              <th className="p-3 text-right">Impressions</th>
              <th className="p-3 text-right">Clicks</th>
              <th className="p-3 text-right">CTR</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((r) => (
              <tr key={r.variant} className="border-b last:border-b-0">
                <td className="p-3 font-mono">{r.variant}</td>
                <td className="p-3 text-right">{r.impressions}</td>
                <td className="p-3 text-right">{r.clicks}</td>
                <td className="p-3 text-right">{pct(r.ctr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-600">
        Impressions are counted when a visitor is assigned a variant; clicks are counted when they click a CTA.
      </div>
    </main>
  );
}
