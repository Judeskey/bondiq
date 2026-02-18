-- CreateTable
CREATE TABLE "LandingExperimentStat" (
    "id" TEXT NOT NULL,
    "experiment" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingExperimentStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingExperimentStat_experiment_idx" ON "LandingExperimentStat"("experiment");

-- CreateIndex
CREATE UNIQUE INDEX "LandingExperimentStat_experiment_variant_key" ON "LandingExperimentStat"("experiment", "variant");
