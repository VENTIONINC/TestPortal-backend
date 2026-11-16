CREATE TABLE "ManualTestRunScenarioResultHistory" (
  "id" SERIAL NOT NULL,
  "scenarioId" UUID NOT NULL,
  "result" "ManualTestRunScenarioResult" NOT NULL,
  "resultById" UUID,
  "resultAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualTestRunScenarioResultHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualTestRunScenarioResultHistory_scenarioId_id_idx" ON "ManualTestRunScenarioResultHistory"("scenarioId", "id");
ALTER TABLE "ManualTestRunScenarioResultHistory" ADD CONSTRAINT "ManualTestRunScenarioResultHistory_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ManualTestRunScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunScenarioResultHistory" ADD CONSTRAINT "ManualTestRunScenarioResultHistory_resultById_fkey" FOREIGN KEY ("resultById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
