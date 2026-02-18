/*
  Warnings:

  - The primary key for the `LandingExperimentStat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `LandingExperimentStat` table. All the data in the column will be lost.
  - You are about to drop the column `experiment` on the `LandingExperimentStat` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `LandingExperimentStat` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LandingExperimentStat_experiment_idx";

-- DropIndex
DROP INDEX "LandingExperimentStat_experiment_variant_key";

-- AlterTable
ALTER TABLE "LandingExperimentStat" DROP CONSTRAINT "LandingExperimentStat_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "experiment",
DROP COLUMN "id",
ADD COLUMN     "openAppClicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signInClicks" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "LandingExperimentStat_pkey" PRIMARY KEY ("variant");
