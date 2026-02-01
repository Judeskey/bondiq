/*
  Warnings:

  - Added the required column `weekStart` to the `CheckIn` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CheckIn_coupleId_createdAt_idx";

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "weekStart" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "CheckIn_coupleId_weekStart_idx" ON "CheckIn"("coupleId", "weekStart");
