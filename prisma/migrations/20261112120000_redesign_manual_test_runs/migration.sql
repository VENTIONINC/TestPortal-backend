-- TP-59 intentionally removes legacy single-scenario manual run history.
DROP TABLE IF EXISTS "ManualTestRunStep";
DROP TABLE IF EXISTS "ManualTestRun";
DROP TYPE IF EXISTS "ManualTestRunStepStatus";
DROP TYPE IF EXISTS "ManualTestRunStatus";

CREATE TYPE "ManualTestRunStatus" AS ENUM ('in_progress', 'completed');
CREATE TYPE "ManualTestRunScenarioResult" AS ENUM ('untested', 'passed', 'failed', 'blocked', 'skipped');

CREATE TABLE "ManualTestRun" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "executedById" UUID,
    "status" "ManualTestRunStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "skippedAtCompletion" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "browser" VARCHAR(200),
    "operatingSystem" VARCHAR(200),
    "device" VARCHAR(200),
    "apiEnvironment" VARCHAR(200),
    "build" VARCHAR(200),
    "deployment" VARCHAR(200),
    CONSTRAINT "ManualTestRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRun_id_projectId_key" UNIQUE ("id", "projectId"),
    CONSTRAINT "ManualTestRun_lifecycle_check" CHECK (
      ("status" = 'in_progress' AND "completedAt" IS NULL) OR
      ("status" = 'completed' AND "completedAt" IS NOT NULL AND "completedAt" >= "startedAt")
    ),
    CONSTRAINT "ManualTestRun_skipped_count_check" CHECK ("skippedAtCompletion" >= 0)
);

CREATE TABLE "ManualTestRunScenario" (
    "id" UUID NOT NULL,
    "manualTestRunId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sourceScenarioId" UUID NOT NULL,
    "sourceScenarioKey" VARCHAR(100) NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "details" TEXT,
    "preconditions" TEXT,
    "testData" TEXT,
    "folderPath" TEXT,
    "result" "ManualTestRunScenarioResult" NOT NULL DEFAULT 'untested',
    "assigneeId" UUID,
    "resultById" UUID,
    "resultAt" TIMESTAMP(3),
    CONSTRAINT "ManualTestRunScenario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRunScenario_manualTestRunId_position_key" UNIQUE ("manualTestRunId", "position"),
    CONSTRAINT "ManualTestRunScenario_id_manualTestRunId_key" UNIQUE ("id", "manualTestRunId"),
    CONSTRAINT "ManualTestRunScenario_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "ManualTestRunScenarioStep" (
    "id" UUID NOT NULL,
    "manualTestRunScenarioId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT,
    CONSTRAINT "ManualTestRunScenarioStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRunScenarioStep_manualTestRunScenarioId_position_key" UNIQUE ("manualTestRunScenarioId", "position"),
    CONSTRAINT "ManualTestRunScenarioStep_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "ManualTestRunLifecycleInterval" (
    "id" UUID NOT NULL,
    "manualTestRunId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "ManualTestRunLifecycleInterval_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ManualTestRunLifecycleInterval_time_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt")
);

CREATE INDEX "ManualTestRun_projectId_startedAt_id_idx" ON "ManualTestRun"("projectId", "startedAt", "id");
CREATE INDEX "ManualTestRun_projectId_status_startedAt_id_idx" ON "ManualTestRun"("projectId", "status", "startedAt", "id");
CREATE INDEX "ManualTestRun_projectId_completedAt_id_idx" ON "ManualTestRun"("projectId", "completedAt", "id");
CREATE INDEX "ManualTestRun_executedById_idx" ON "ManualTestRun"("executedById");
CREATE INDEX "ManualTestRun_completedById_idx" ON "ManualTestRun"("completedById");
CREATE INDEX "ManualTestRunScenario_projectId_result_manualTestRunId_idx" ON "ManualTestRunScenario"("projectId", "result", "manualTestRunId");
CREATE INDEX "ManualTestRunScenario_assigneeId_manualTestRunId_idx" ON "ManualTestRunScenario"("assigneeId", "manualTestRunId");
CREATE INDEX "ManualTestRunScenarioStep_manualTestRunScenarioId_idx" ON "ManualTestRunScenarioStep"("manualTestRunScenarioId");
CREATE INDEX "ManualTestRunLifecycleInterval_projectId_startedAt_endedAt_idx" ON "ManualTestRunLifecycleInterval"("projectId", "startedAt", "endedAt");
CREATE INDEX "ManualTestRunLifecycleInterval_manualTestRunId_startedAt_idx" ON "ManualTestRunLifecycleInterval"("manualTestRunId", "startedAt");
CREATE UNIQUE INDEX "ManualTestRunLifecycleInterval_one_open_per_run_key" ON "ManualTestRunLifecycleInterval"("manualTestRunId") WHERE "endedAt" IS NULL;

ALTER TABLE "ManualTestRun" ADD CONSTRAINT "ManualTestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualTestRun" ADD CONSTRAINT "ManualTestRun_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualTestRun" ADD CONSTRAINT "ManualTestRun_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunScenario" ADD CONSTRAINT "ManualTestRunScenario_run_project_fkey" FOREIGN KEY ("manualTestRunId", "projectId") REFERENCES "ManualTestRun"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunScenario" ADD CONSTRAINT "ManualTestRunScenario_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunScenario" ADD CONSTRAINT "ManualTestRunScenario_resultById_fkey" FOREIGN KEY ("resultById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunScenarioStep" ADD CONSTRAINT "ManualTestRunScenarioStep_manualTestRunScenarioId_fkey" FOREIGN KEY ("manualTestRunScenarioId") REFERENCES "ManualTestRunScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualTestRunLifecycleInterval" ADD CONSTRAINT "ManualTestRunLifecycleInterval_run_project_fkey" FOREIGN KEY ("manualTestRunId", "projectId") REFERENCES "ManualTestRun"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
