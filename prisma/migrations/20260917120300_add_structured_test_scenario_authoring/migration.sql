-- Structured authoring intentionally resets development Test Scenario records.
-- Preserve Specs, Results, Issues, Projects, Users, and all unrelated records.
DELETE FROM "TestScenarioSpecLink";
DELETE FROM "TestScenario";

ALTER TABLE "TestScenario"
    ADD COLUMN "objective" TEXT,
    ADD COLUMN "preconditions" TEXT,
    ADD COLUMN "testData" TEXT,
    ADD COLUMN "expectedResult" TEXT,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "contentMdHash" CHAR(64) NOT NULL,
    ADD COLUMN "contentMdFormatVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "TestScenarioStep" (
    "id" UUID NOT NULL,
    "testScenarioId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT,

    CONSTRAINT "TestScenarioStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestScenarioStep_position_check" CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "TestScenarioStep_testScenarioId_position_key"
    ON "TestScenarioStep"("testScenarioId", "position");

ALTER TABLE "TestScenarioStep"
    ADD CONSTRAINT "TestScenarioStep_testScenarioId_fkey"
    FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
