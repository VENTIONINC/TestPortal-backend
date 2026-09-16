-- Replace project-related foreign keys with database-level cascades.
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_projectId_fkey";
ALTER TABLE "Spec" DROP CONSTRAINT "Spec_projectId_fkey";
ALTER TABLE "Result" DROP CONSTRAINT "Result_specId_fkey";
ALTER TABLE "Result" DROP CONSTRAINT "Result_executionId_fkey";
ALTER TABLE "ResultError" DROP CONSTRAINT "ResultError_resultId_fkey";
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_projectId_fkey";
ALTER TABLE "Assumption" DROP CONSTRAINT "Assumption_issueId_fkey";
ALTER TABLE "Assumption" DROP CONSTRAINT "Assumption_resultErrorId_fkey";
ALTER TABLE "UploadApiKey" DROP CONSTRAINT "UploadApiKey_projectId_fkey";
ALTER TABLE "DailyExecutionMetric" DROP CONSTRAINT "DailyExecutionMetric_projectId_fkey";

ALTER TABLE "Execution"
  ADD CONSTRAINT "Execution_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Spec"
  ADD CONSTRAINT "Spec_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Result"
  ADD CONSTRAINT "Result_specId_fkey"
  FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Result"
  ADD CONSTRAINT "Result_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResultError"
  ADD CONSTRAINT "ResultError_resultId_fkey"
  FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Issue"
  ADD CONSTRAINT "Issue_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assumption"
  ADD CONSTRAINT "Assumption_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assumption"
  ADD CONSTRAINT "Assumption_resultErrorId_fkey"
  FOREIGN KEY ("resultErrorId") REFERENCES "ResultError"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadApiKey"
  ADD CONSTRAINT "UploadApiKey_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyExecutionMetric"
  ADD CONSTRAINT "DailyExecutionMetric_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ResultError_resultId_idx" ON "ResultError"("resultId");
CREATE INDEX IF NOT EXISTS "Assumption_issueId_idx" ON "Assumption"("issueId");
CREATE INDEX IF NOT EXISTS "Assumption_resultErrorId_idx" ON "Assumption"("resultErrorId");
CREATE INDEX "Result_specId_idx" ON "Result"("specId");
CREATE INDEX "Result_executionId_idx" ON "Result"("executionId");
