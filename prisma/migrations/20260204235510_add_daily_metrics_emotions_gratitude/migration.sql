-- CreateEnum
CREATE TYPE "EmotionState" AS ENUM ('THRIVING', 'GOOD', 'NEUTRAL', 'STRESSED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "GratitudeVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateTable
CREATE TABLE "DailyCoupleMetric" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "bondScore" INTEGER,
    "connectionScore" INTEGER,
    "stabilityScore" INTEGER,
    "checkInCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "topTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCoupleMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEmotionSignal" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "state" "EmotionState" NOT NULL,
    "intensity" INTEGER NOT NULL DEFAULT 50,
    "reasonCode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEmotionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GratitudeEntry" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "visibility" "GratitudeVisibility" NOT NULL DEFAULT 'PRIVATE',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "eventDay" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GratitudeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCoupleMetric_coupleId_day_idx" ON "DailyCoupleMetric"("coupleId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCoupleMetric_coupleId_day_key" ON "DailyCoupleMetric"("coupleId", "day");

-- CreateIndex
CREATE INDEX "PartnerEmotionSignal_coupleId_day_idx" ON "PartnerEmotionSignal"("coupleId", "day");

-- CreateIndex
CREATE INDEX "PartnerEmotionSignal_userId_day_idx" ON "PartnerEmotionSignal"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerEmotionSignal_coupleId_userId_day_key" ON "PartnerEmotionSignal"("coupleId", "userId", "day");

-- CreateIndex
CREATE INDEX "GratitudeEntry_coupleId_createdAt_idx" ON "GratitudeEntry"("coupleId", "createdAt");

-- CreateIndex
CREATE INDEX "GratitudeEntry_userId_createdAt_idx" ON "GratitudeEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GratitudeEntry_targetUserId_idx" ON "GratitudeEntry"("targetUserId");

-- AddForeignKey
ALTER TABLE "DailyCoupleMetric" ADD CONSTRAINT "DailyCoupleMetric_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmotionSignal" ADD CONSTRAINT "PartnerEmotionSignal_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEmotionSignal" ADD CONSTRAINT "PartnerEmotionSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GratitudeEntry" ADD CONSTRAINT "GratitudeEntry_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GratitudeEntry" ADD CONSTRAINT "GratitudeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
