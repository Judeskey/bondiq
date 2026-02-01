/*
  Warnings:

  - You are about to drop the column `languageTag` on the `CheckIn` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CheckIn" DROP COLUMN "languageTag",
ADD COLUMN     "languageTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
