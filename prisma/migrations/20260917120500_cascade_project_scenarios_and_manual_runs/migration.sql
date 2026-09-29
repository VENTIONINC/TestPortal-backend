-- Remove project-owned scenarios and run history atomically with the project.
ALTER TABLE "TestScenario" DROP CONSTRAINT "TestScenario_projectId_fkey";
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualTestRun" DROP CONSTRAINT "ManualTestRun_projectId_fkey";
ALTER TABLE "ManualTestRun" ADD CONSTRAINT "ManualTestRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
