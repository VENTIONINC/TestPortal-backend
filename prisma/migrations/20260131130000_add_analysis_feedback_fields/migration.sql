-- Add analysis feedback/review fields to Result
ALTER TABLE "Result"
ADD COLUMN IF NOT EXISTS "analysisFeedbackCategory" TEXT,
ADD COLUMN IF NOT EXISTS "analysisFeedbackConfidence" INTEGER,
ADD COLUMN IF NOT EXISTS "analysisFeedbackConclusion" TEXT,
ADD COLUMN IF NOT EXISTS "analysisReviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "analysisReviewedById" UUID;
