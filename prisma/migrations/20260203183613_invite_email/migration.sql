-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
