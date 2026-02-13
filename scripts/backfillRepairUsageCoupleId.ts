// scripts/backfillRepairUsageCoupleId.ts
import { prisma } from "@/lib/db";

async function main() {
  // Find rows that still have NULL coupleId (legacy data)
  const rows = await prisma.$queryRaw<Array<{ id: string; userId: string | null }>>`
    SELECT "id", "userId"
    FROM "RepairSuggestionUsage"
    WHERE "coupleId" IS NULL
  `;

  console.log(`Found ${rows.length} rows with NULL coupleId`);

  for (const r of rows) {
    if (!r.userId) continue;

    // Find the latest ACTIVE couple membership for that user
    const membership = await prisma.coupleMember.findFirst({
      where: { userId: r.userId, couple: { status: "ACTIVE" } },
      select: { coupleId: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership?.coupleId) continue;

    await prisma.repairSuggestionUsage.update({
      where: { id: r.id },
      data: { coupleId: membership.coupleId },
    });
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
