CREATE TYPE "ManualTestRunStatus" AS ENUM (
    'in_progress',
    'passed',
    'failed',
    'blocked',
    'skipped'
);

CREATE TYPE "ManualTestRunStepStatus" AS ENUM (
    'not_started',
    'passed',
    'failed',
    'blocked',
    'skipped'
);

CREATE TABLE "ManualTestRun" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testScenarioId" UUID,
    "sourceTestScenarioId" UUID NOT NULL,
    "executedById" UUID,
    "status" "ManualTestRunStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "details" TEXT,
    "objective" TEXT,
    "preconditions" TEXT,
    "testData" TEXT,
    "expectedResult" TEXT,
    "scenarioNotes" TEXT,
    "notes" TEXT,

    CONSTRAINT "ManualTestRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRun_completedAt_status_check" CHECK (
        ("status" = 'in_progress' AND "completedAt" IS NULL)
        OR ("status" <> 'in_progress' AND "completedAt" IS NOT NULL)
    ),
    CONSTRAINT "ManualTestRun_completedAt_startedAt_check" CHECK (
        "completedAt" IS NULL OR "completedAt" >= "startedAt"
    )
);

CREATE TABLE "ManualTestRunStep" (
    "id" UUID NOT NULL,
    "manualTestRunId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT,
    "status" "ManualTestRunStepStatus" NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualTestRunStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRunStep_position_check" CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "ManualTestRunStep_manualTestRunId_position_key"
    ON "ManualTestRunStep"("manualTestRunId", "position");

CREATE INDEX "ManualTestRun_projectId_startedAt_id_idx"
    ON "ManualTestRun"("projectId", "startedAt", "id");

CREATE INDEX "ManualTestRun_projectId_sourceTestScenarioId_startedAt_id_idx"
    ON "ManualTestRun"("projectId", "sourceTestScenarioId", "startedAt", "id");

CREATE INDEX "ManualTestRun_executedById_idx"
    ON "ManualTestRun"("executedById");

ALTER TABLE "ManualTestRun"
    ADD CONSTRAINT "ManualTestRun_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ManualTestRun_testScenarioId_fkey"
    FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ManualTestRun_executedById_fkey"
    FOREIGN KEY ("executedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualTestRunStep"
    ADD CONSTRAINT "ManualTestRunStep_manualTestRunId_fkey"
    FOREIGN KEY ("manualTestRunId") REFERENCES "ManualTestRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
