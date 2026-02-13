-- AlterTable
ALTER TABLE "GratitudeEntry" ADD COLUMN     "lastResurfacedAt" TIMESTAMP(3),
ADD COLUMN     "resurfacedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "GratitudeEntry_coupleId_lastResurfacedAt_idx" ON "GratitudeEntry"("coupleId", "lastResurfacedAt");
