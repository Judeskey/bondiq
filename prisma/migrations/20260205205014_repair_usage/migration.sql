-- CreateTable
CREATE TABLE "RepairSuggestionUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairSuggestionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairSuggestionUsage_userId_createdAt_idx" ON "RepairSuggestionUsage"("userId", "createdAt");
