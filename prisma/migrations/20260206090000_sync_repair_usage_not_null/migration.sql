-- Baseline migration to match manual DB fix:
-- RepairSuggestionUsage.coupleId is NOT NULL in the database.
ALTER TABLE "RepairSuggestionUsage"
ALTER COLUMN "coupleId" SET NOT NULL;