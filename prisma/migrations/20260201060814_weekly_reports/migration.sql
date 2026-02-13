/*
  Warnings:

  - You are about to drop the column `tone` on the `WeeklyReport` table. All the data in the column will be lost.
  - You are about to drop the column `openedAt` on the `WeeklyReportForUser` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyReportId` on the `WeeklyReportForUser` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reportId,userId]` on the table `WeeklyReportForUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reportJson` to the `WeeklyReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WeeklyReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportId` to the `WeeklyReportForUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WeeklyReportForUser` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WeeklyReportForUser" DROP CONSTRAINT "WeeklyReportForUser_weeklyReportId_fkey";

-- DropIndex
DROP INDEX "WeeklyReportForUser_userId_createdAt_idx";

-- DropIndex
DROP INDEX "WeeklyReportForUser_weeklyReportId_userId_key";

-- AlterTable
ALTER TABLE "WeeklyReport" DROP COLUMN "tone",
ADD COLUMN     "reportJson" JSONB NOT NULL,
ADD COLUMN     "toneIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WeeklyReportForUser" DROP COLUMN "openedAt",
DROP COLUMN "weeklyReportId",
ADD COLUMN     "reportId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "WeeklyReportForUser_userId_reportId_idx" ON "WeeklyReportForUser"("userId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReportForUser_reportId_userId_key" ON "WeeklyReportForUser"("reportId", "userId");

-- AddForeignKey
ALTER TABLE "WeeklyReportForUser" ADD CONSTRAINT "WeeklyReportForUser_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
