// app/invite/page.tsx
import InviteClient from "./InviteClient";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InvitePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const token =
    typeof searchParams?.token === "string" ? searchParams.token.trim() : "";

  const email =
    typeof searchParams?.email === "string"
      ? searchParams.email.trim().toLowerCase()
      : "";

  if (!token) {
    redirect("/signin?error=MissingInviteToken&callbackUrl=%2Fapp%2Fonboarding");
  }

  // ✅ DO NOT force sign-in here.
  // The InviteClient will handle:
  // - signed-in users (accept invite)
  // - guests (create account + accept invite + sign in with credentials)
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-2xl border bg-gradient-to-b from-pink-50 to-white p-6">
        <div className="text-sm font-semibold text-[#ec4899]">BondIQ Invite</div>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">You’re invited</h1>
        <p className="mt-2 text-slate-700">
          Join your partner on BondIQ. If you’re new, create your account here — no email link
          needed.
        </p>
      </div>

      {/* Client reads token/email from URL via useSearchParams */}
      <InviteClient />
    </main>
  );
}
