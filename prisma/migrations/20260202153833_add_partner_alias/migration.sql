-- CreateTable
CREATE TABLE "PartnerAlias" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerAlias_ownerUserId_idx" ON "PartnerAlias"("ownerUserId");

-- CreateIndex
CREATE INDEX "PartnerAlias_targetUserId_idx" ON "PartnerAlias"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAlias_coupleId_ownerUserId_targetUserId_key" ON "PartnerAlias"("coupleId", "ownerUserId", "targetUserId");

-- AddForeignKey
ALTER TABLE "PartnerAlias" ADD CONSTRAINT "PartnerAlias_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAlias" ADD CONSTRAINT "PartnerAlias_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAlias" ADD CONSTRAINT "PartnerAlias_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
