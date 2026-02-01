// lib/requireUser.ts
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("UNAUTHORIZED");
  return { email };
}
