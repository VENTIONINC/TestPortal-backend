-- AlterTable: Change analysisConfidence from Float to Int (1-5 scale)
-- IMPORTANT: This will round existing float values to nearest integer
ALTER TABLE "Result" ALTER COLUMN "analysisConfidence" TYPE INTEGER USING ROUND("analysisConfidence" * 5)::INTEGER;

-- AlterTable: Add new error quality evaluation fields
ALTER TABLE "Result" ADD COLUMN "analysisErrorQuality" INTEGER;
ALTER TABLE "Result" ADD COLUMN "analysisErrorQualityConclusion" TEXT;
