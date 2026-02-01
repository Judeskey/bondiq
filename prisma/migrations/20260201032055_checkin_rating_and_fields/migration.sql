/*
  Warnings:

  - You are about to drop the column `feltLovedScore` on the `CheckIn` table. All the data in the column will be lost.
  - You are about to drop the column `loveLanguageTag` on the `CheckIn` table. All the data in the column will be lost.
  - Added the required column `rating` to the `CheckIn` table without a default value. This is not possible if the table is not empty.
  - Made the column `whatMadeMeFeelLoved` on table `CheckIn` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CheckIn" DROP COLUMN "feltLovedScore",
DROP COLUMN "loveLanguageTag",
ADD COLUMN     "languageTag" TEXT,
ADD COLUMN     "rating" INTEGER NOT NULL,
ALTER COLUMN "whatMadeMeFeelLoved" SET NOT NULL,
ALTER COLUMN "whatMadeMeFeelLoved" SET DATA TYPE TEXT;
