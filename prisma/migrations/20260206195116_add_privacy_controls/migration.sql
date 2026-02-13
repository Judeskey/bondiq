-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PRIVATE', 'PARTNER', 'COUPLE');

-- AlterTable
ALTER TABLE "CoupleMember" ADD COLUMN     "shareCheckinText" "VisibilityLevel" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "shareEmotionState" "VisibilityLevel" NOT NULL DEFAULT 'PARTNER',
ADD COLUMN     "shareInsights" "VisibilityLevel" NOT NULL DEFAULT 'PARTNER',
ADD COLUMN     "shareTags" "VisibilityLevel" NOT NULL DEFAULT 'PARTNER';

-- CreateIndex
CREATE INDEX "CoupleMember_coupleId_joinedAt_idx" ON "CoupleMember"("coupleId", "joinedAt");

-- RenameIndex
ALTER INDEX "EmotionStateSnapshot_couple_user_day_window_unique" RENAME TO "EmotionStateSnapshot_coupleId_userId_dayKey_windowDays_key";
