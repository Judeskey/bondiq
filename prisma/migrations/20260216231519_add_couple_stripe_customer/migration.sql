/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Couple` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Couple" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Couple_stripeCustomerId_key" ON "Couple"("stripeCustomerId");
