/*
  Warnings:

  - You are about to drop the `ProjectMeta` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectMeta" DROP CONSTRAINT "ProjectMeta_projectId_fkey";

-- DropTable
DROP TABLE "ProjectMeta";

-- CreateTable
CREATE TABLE "DailyExecutionMetric" (
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

-- CreateIndex
CREATE INDEX "DailyExecutionMetric_projectId_date_idx" ON "DailyExecutionMetric"("projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyExecutionMetric_projectId_environment_type_date_key" ON "DailyExecutionMetric"("projectId", "environment", "type", "date");

-- AddForeignKey
ALTER TABLE "DailyExecutionMetric" ADD CONSTRAINT "DailyExecutionMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
