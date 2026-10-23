-- TP-20: development-stage fields; stored Markdown and hashes remain unchanged.
CREATE TYPE "TestScenarioPriority" AS ENUM ('low', 'medium', 'high');

ALTER TABLE "TestScenario"
  ADD COLUMN "priority" "TestScenarioPriority",
  ADD COLUMN "relatedIssueUrl" TEXT,
  DROP COLUMN "objective",
  DROP COLUMN "expectedResult",
  DROP COLUMN "notes";

ALTER TABLE "ManualTestRun"
  DROP COLUMN "objective",
  DROP COLUMN "expectedResult",
  DROP COLUMN "scenarioNotes";
