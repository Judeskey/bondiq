/*
  Warnings:

  - A unique constraint covering the columns `[confirmHash]` on the table `DisconnectRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `DisconnectRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phrase` to the `DisconnectRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DisconnectRequest" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "phrase" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DisconnectRequest_confirmHash_key" ON "DisconnectRequest"("confirmHash");

-- CreateIndex
CREATE INDEX "DisconnectRequest_expiresAt_idx" ON "DisconnectRequest"("expiresAt");
