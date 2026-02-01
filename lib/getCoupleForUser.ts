import { prisma } from "@/lib/db";

export async function getCoupleForUser(userId: string) {
  const membership = await prisma.coupleMember.findFirst({
    where: { userId },
    select: { coupleId: true },
  });
  return membership?.coupleId ?? null;
}
