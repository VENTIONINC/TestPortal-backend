ALTER TABLE "TestScenario"
ADD COLUMN "scenarioKey" VARCHAR(100);

ALTER TABLE "ManualTestRun"
ADD COLUMN "runKey" VARCHAR(100),
ADD COLUMN "sourceScenarioKey" VARCHAR(100);

CREATE INDEX "ManualTestRun_projectId_sourceScenarioKey_startedAt_id_idx"
ON "ManualTestRun"("projectId", "sourceScenarioKey", "startedAt", "id");
