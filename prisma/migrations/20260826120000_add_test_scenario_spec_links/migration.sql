-- Additive scenario/Spec association only. Existing scenarios and evidence are untouched.
CREATE TABLE "TestScenarioSpecLink" (
    "testScenarioId" UUID NOT NULL,
    "specId" UUID NOT NULL,

    CONSTRAINT "TestScenarioSpecLink_pkey" PRIMARY KEY ("testScenarioId", "specId")
);

CREATE INDEX "TestScenarioSpecLink_specId_idx" ON "TestScenarioSpecLink"("specId");

ALTER TABLE "TestScenarioSpecLink"
    ADD CONSTRAINT "TestScenarioSpecLink_testScenarioId_fkey"
    FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestScenarioSpecLink"
    ADD CONSTRAINT "TestScenarioSpecLink_specId_fkey"
    FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Result_specId_startTime_idx" ON "Result"("specId", "startTime");
CREATE INDEX "ResultError_resultId_idx" ON "ResultError"("resultId");
CREATE INDEX "Assumption_issueId_idx" ON "Assumption"("issueId");
CREATE INDEX "Assumption_resultErrorId_idx" ON "Assumption"("resultErrorId");
