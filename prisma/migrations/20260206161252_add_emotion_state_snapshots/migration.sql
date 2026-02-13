-- CreateTable
CREATE TABLE "EmotionStateSnapshot" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "windowDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmotionStateSnapshot_coupleId_createdAt_idx" ON "EmotionStateSnapshot"("coupleId", "createdAt");

-- CreateIndex
CREATE INDEX "EmotionStateSnapshot_userId_createdAt_idx" ON "EmotionStateSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmotionStateSnapshot_coupleId_userId_createdAt_idx" ON "EmotionStateSnapshot"("coupleId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmotionStateSnapshot" ADD CONSTRAINT "EmotionStateSnapshot_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionStateSnapshot" ADD CONSTRAINT "EmotionStateSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
