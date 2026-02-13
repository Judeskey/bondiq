-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileImageUrl" TEXT,
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "DisconnectRequest" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "confirmHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "DisconnectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisconnectRequest_coupleId_idx" ON "DisconnectRequest"("coupleId");

-- CreateIndex
CREATE INDEX "DisconnectRequest_requesterUserId_idx" ON "DisconnectRequest"("requesterUserId");

-- AddForeignKey
ALTER TABLE "DisconnectRequest" ADD CONSTRAINT "DisconnectRequest_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisconnectRequest" ADD CONSTRAINT "DisconnectRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
