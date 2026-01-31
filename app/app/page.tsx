
import { auth } from "@/auth";
import Link from "next/link";

export default async function AppHome() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="mb-4">You’re not signed in.</p>
        <Link className="rounded-md bg-black px-4 py-2 text-white" href="/signin">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h2 className="text-2xl font-semibold">Welcome</h2>
      <p className="mt-2 text-slate-700">Signed in as {session.user.email}</p>

      <div className="mt-6 space-y-2">
        <Link className="block underline" href="/app/onboarding">Onboarding</Link>
        <Link className="block underline" href="/app/checkin">Weekly check-in</Link>
        <Link className="block underline" href="/app/reports">Reports</Link>
        <Link className="block underline" href="/app/settings">Settings</Link>
      </div>
    </main>
  );
}
