-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weeklyEmailDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weeklyEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyEmailLastSentAt" TIMESTAMP(3),
ADD COLUMN     "weeklyEmailTime" TEXT NOT NULL DEFAULT '19:00';
