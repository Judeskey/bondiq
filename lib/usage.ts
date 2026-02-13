import { prisma } from "@/lib/db";
import { startOfWeek } from "./time";

export async function getWeeklySuggestionUsage(coupleId: string) {
  const weekStart = startOfWeek();

  return prisma.repairSuggestionUsage.count({
    where: {
      coupleId,
      createdAt: { gte: weekStart },
    },
  });
}

export async function recordSuggestionUsage(coupleId: string) {
  return prisma.repairSuggestionUsage.create({
    data: { coupleId },
  });
}
