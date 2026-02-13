// app/app/onboarding/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";
import AcceptInviteClient from "./AcceptInviteClient";
import { ensureCoupleForUser } from "@/lib/ensureCoupleForUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token.trim() : null;
  const inviteEmail =
    typeof searchParams?.email === "string" ? searchParams.email.trim().toLowerCase() : null;

  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim() || null;

  // If not signed in, preserve token/email so invite flow continues after auth
  if (!email) {
    const callback =
      `/app/onboarding` +
      (token
        ? `?token=${encodeURIComponent(token)}${
            inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ""
          }`
        : "");

    redirect(
      `/signin?callbackUrl=${encodeURIComponent(callback)}` +
        (inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : "") +
        (token ? `&token=${encodeURIComponent(token)}` : "")
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingStep: true,
      onboardingCompleted: true,
    },
  });

  if (!user?.id) {
    redirect("/signin?callbackUrl=%2Fapp%2Fonboarding");
  }

  // ✅ If arriving with an invite token, accept it FIRST.
  // IMPORTANT: do NOT create a couple before accepting, or accept will fail.
  if (token) {
    return <AcceptInviteClient token={token} />;
  }

  // ✅ If onboarding already completed, never show again
  if (user.onboardingCompleted) {
    redirect("/app");
  }

  // ✅ For normal onboarding (not invited), ensure a couple exists
  await ensureCoupleForUser(user.id);

  const coupleId = await getCoupleForUser(user.id);
  if (!coupleId) {
    // Extremely defensive; ensureCoupleForUser should prevent this.
    redirect("/app");
  }

  const membersCount = await prisma.coupleMember.count({
    where: { coupleId },
  });

  const profile = await prisma.loveProfile.findUnique({
    where: { coupleId_userId: { coupleId, userId: user.id } },
    select: { id: true },
  });

  // ✅ Compute initial step from REAL state
  let computedStep = user.onboardingStep || 1;

  if (!profile) {
    computedStep = 1;
  } else if (membersCount <= 1) {
    computedStep = 2; // invite step (only if no partner yet)
  } else {
    computedStep = 3; // partner exists (invited flow ends up here after accept)
  }

  computedStep = clampInt(computedStep, 1, 3);

  return (
    <OnboardingClient
      email={user.email}
      name={user.name ?? null}
      initialStep={computedStep}
      onboardingCompleted={user.onboardingCompleted}
    />
  );
}
