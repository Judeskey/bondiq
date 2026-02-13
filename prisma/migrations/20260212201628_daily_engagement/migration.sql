-- CreateTable
CREATE TABLE "DailyEngagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "reportViewSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyEngagement_day_idx" ON "DailyEngagement"("day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEngagement_userId_day_key" ON "DailyEngagement"("userId", "day");

-- AddForeignKey
ALTER TABLE "DailyEngagement" ADD CONSTRAINT "DailyEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
