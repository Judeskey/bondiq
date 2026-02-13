/*
  Warnings:

  - You are about to drop the column `userId` on the `RepairSuggestionUsage` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "RepairSuggestionUsage_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "RepairSuggestionUsage" DROP COLUMN "userId",
ADD COLUMN     "coupleId" TEXT;

-- CreateIndex
CREATE INDEX "RepairSuggestionUsage_coupleId_createdAt_idx" ON "RepairSuggestionUsage"("coupleId", "createdAt");

-- AddForeignKey
ALTER TABLE "RepairSuggestionUsage" ADD CONSTRAINT "RepairSuggestionUsage_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
