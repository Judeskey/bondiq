// lib/requireUser.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

/**
 * ✅ For API route handlers ONLY (app/api/**)
 * Throws on missing session so your route can return 401 in a catch block.
 */
export async function requireUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();

  if (!email) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return { email: user.email!, userId: user.id };
}

/**
 * ✅ For SERVER COMPONENTS / layouts / pages (app/**, NOT app/api)
 * Redirects to signin instead of throwing.
 */
export async function requireUserOrRedirect(callbackUrl: string = "/app") {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();

  if (!email) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return { email: user.email!, userId: user.id };
}
