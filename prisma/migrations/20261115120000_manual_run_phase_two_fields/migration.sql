-- Add Phase 2 run metadata and execution evidence without rewriting Phase 1 rows.
ALTER TABLE "ManualTestRun"
  ADD COLUMN "environmentProperties" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "ManualTestRun"
  ALTER COLUMN "browser" TYPE TEXT,
  ALTER COLUMN "operatingSystem" TYPE TEXT,
  ALTER COLUMN "device" TYPE TEXT,
  ALTER COLUMN "apiEnvironment" TYPE TEXT,
  ALTER COLUMN "build" TYPE TEXT,
  ALTER COLUMN "deployment" TYPE TEXT;

UPDATE "ManualTestRun" SET "environmentProperties" =
  (CASE WHEN "browser" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'browser', 'value', "browser")) END) ||
  (CASE WHEN "operatingSystem" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'operatingSystem', 'value', "operatingSystem")) END) ||
  (CASE WHEN "device" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'device', 'value', "device")) END) ||
  (CASE WHEN "apiEnvironment" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'apiEnvironment', 'value', "apiEnvironment")) END) ||
  (CASE WHEN "build" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'build', 'value', "build")) END) ||
  (CASE WHEN "deployment" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', 'deployment', 'value', "deployment")) END);

ALTER TABLE "ManualTestRunScenario"
  ADD COLUMN "priority" "TestScenarioPriority" NOT NULL DEFAULT 'medium',
  ADD COLUMN "requirementContext" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "executionComment" TEXT,
  ADD COLUMN "defectReference" TEXT;

ALTER TABLE "ManualTestRunScenarioStep"
  ADD COLUMN "comment" TEXT,
  ADD COLUMN "failedFlag" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "failedComment" TEXT,
  ADD COLUMN "blockedFlag" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blockedComment" TEXT;
