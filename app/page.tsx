
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold">BondIQ</h1>
      <p className="mt-3 text-slate-700">
        Weekly relationship insights that help love land.
      </p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded-md bg-black px-4 py-2 text-white" href="/signin">
          Sign in
        </Link>
        <Link className="rounded-md border px-4 py-2" href="/app">
          Open app
        </Link>
      </div>
    </main>
  );
}
