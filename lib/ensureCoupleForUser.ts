// lib/ensureCoupleForUser.ts
import { prisma } from "@/lib/db";

export async function ensureCoupleForUser(userId: string) {
  if (!userId) throw new Error("ensureCoupleForUser: missing userId");

  // Fast path
  const existing = await prisma.coupleMember.findFirst({
    where: { userId },
    select: { coupleId: true },
  });
  if (existing?.coupleId) return { coupleId: existing.coupleId };

  // Create couple + membership atomically (handles race conditions)
  return await prisma.$transaction(async (tx) => {
    const again = await tx.coupleMember.findFirst({
      where: { userId },
      select: { coupleId: true },
    });
    if (again?.coupleId) return { coupleId: again.coupleId };

    const couple = await tx.couple.create({
      data: {},
      select: { id: true },
    });

    await tx.coupleMember.create({
      data: { coupleId: couple.id, userId },
      select: { id: true },
    });

    return { coupleId: couple.id };
  });
}
