ALTER TABLE "ResultError"
ADD COLUMN "rawLogs" JSONB,
ADD COLUMN "sourceSnippet" JSONB,
ADD COLUMN "generatedTestCase" TEXT;
