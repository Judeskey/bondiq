-- 1) Add dayKey (nullable first to avoid failing on existing rows)
ALTER TABLE "EmotionStateSnapshot"
ADD COLUMN "dayKey" TEXT;

-- 2) Backfill dayKey from createdAt (UTC date)
UPDATE "EmotionStateSnapshot"
SET "dayKey" = to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE "dayKey" IS NULL;

-- 3) Make it required
ALTER TABLE "EmotionStateSnapshot"
ALTER COLUMN "dayKey" SET NOT NULL;

-- 4) Add unique constraint (anti-spam)
CREATE UNIQUE INDEX "EmotionStateSnapshot_couple_user_day_window_unique"
ON "EmotionStateSnapshot" ("coupleId", "userId", "dayKey", "windowDays");
