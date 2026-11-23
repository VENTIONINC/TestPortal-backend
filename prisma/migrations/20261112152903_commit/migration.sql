-- RenameForeignKey
ALTER TABLE "ManualTestRunLifecycleInterval" RENAME CONSTRAINT "ManualTestRunLifecycleInterval_run_project_fkey" TO "ManualTestRunLifecycleInterval_manualTestRunId_projectId_fkey";

-- RenameForeignKey
ALTER TABLE "ManualTestRunScenario" RENAME CONSTRAINT "ManualTestRunScenario_run_project_fkey" TO "ManualTestRunScenario_manualTestRunId_projectId_fkey";
