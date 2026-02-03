-- Ensure ProjectMeta is removed if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename = 'ProjectMeta'
  ) THEN
    ALTER TABLE "ProjectMeta" DROP CONSTRAINT IF EXISTS "ProjectMeta_projectId_fkey";
    DROP TABLE IF EXISTS "ProjectMeta";
  END IF;
END $$;

-- Ensure DailyExecutionMetric exists
CREATE TABLE IF NOT EXISTS "DailyExecutionMetric" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "projectId" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "failedTests" INTEGER NOT NULL DEFAULT 0,
    "skippedTests" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "issuesBug" INTEGER NOT NULL DEFAULT 0,
    "issuesEnvironment" INTEGER NOT NULL DEFAULT 0,
    "issuesScript" INTEGER NOT NULL DEFAULT 0,
    "issuesPerformance" INTEGER NOT NULL DEFAULT 0,
    "issuesOther" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyExecutionMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyExecutionMetric_projectId_date_idx" ON "DailyExecutionMetric"("projectId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyExecutionMetric_projectId_environment_type_date_key" ON "DailyExecutionMetric"("projectId", "environment", "type", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DailyExecutionMetric_projectId_fkey'
  ) THEN
    ALTER TABLE "DailyExecutionMetric"
    ADD CONSTRAINT "DailyExecutionMetric_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
