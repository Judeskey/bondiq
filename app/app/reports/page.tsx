
import { auth } from "@/auth";
import Link from "next/link";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-4">You’re not signed in.</p>
        <Link className="underline" href="/signin">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-slate-700">Placeholder UI for MVP.</p>
    </main>
  );
}
