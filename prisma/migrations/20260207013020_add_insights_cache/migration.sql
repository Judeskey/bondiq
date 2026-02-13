-- CreateTable
CREATE TABLE "CoupleInsightsCache" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 28,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoupleInsightsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoupleInsightsCache_coupleId_updatedAt_idx" ON "CoupleInsightsCache"("coupleId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleInsightsCache_coupleId_dayKey_windowDays_key" ON "CoupleInsightsCache"("coupleId", "dayKey", "windowDays");

-- AddForeignKey
ALTER TABLE "CoupleInsightsCache" ADD CONSTRAINT "CoupleInsightsCache_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
