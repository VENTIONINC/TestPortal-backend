-- Add nullable plain-text metadata without backfilling existing scenarios.
ALTER TABLE "TestScenario" ADD COLUMN "details" TEXT;
