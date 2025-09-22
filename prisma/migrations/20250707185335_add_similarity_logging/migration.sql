-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "analysisConclusion" TEXT;

-- CreateTable
CREATE TABLE "SimilarityLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceErrorId" INTEGER,
    "sourceErrorType" TEXT,
    "sourceErrorMessage" TEXT,
    "targetErrorId" INTEGER,
    "targetErrorType" TEXT,
    "targetErrorMessage" TEXT,
    "vectorSimilarityScore" DOUBLE PRECISION,
    "stringSimilarityScore" DOUBLE PRECISION,
    "callLogSimilarityScore" DOUBLE PRECISION,
    "stackSimilarityScore" DOUBLE PRECISION,
    "finalCompositeScore" DOUBLE PRECISION,
    "algorithmVersion" TEXT,
    "modelName" TEXT,
    "embeddingDimension" INTEGER,
    "processingTimeMs" INTEGER,
    "embeddingCacheHit" BOOLEAN,
    "modelLoadTimeMs" INTEGER,
    "thresholdMet" BOOLEAN,
    "assumptionCreated" BOOLEAN,
    "assumptionId" INTEGER,
    "errorTextLength" INTEGER,
    "stackTraceLength" INTEGER,
    "confidenceLevel" DOUBLE PRECISION,
    "fallbackUsed" BOOLEAN,
    "serverInstance" TEXT,
    "featureFlags" JSONB,
    "environment" TEXT,

    CONSTRAINT "SimilarityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimilarityLog_sourceErrorId_idx" ON "SimilarityLog"("sourceErrorId");

-- CreateIndex
CREATE INDEX "SimilarityLog_targetErrorId_idx" ON "SimilarityLog"("targetErrorId");

-- CreateIndex
CREATE INDEX "SimilarityLog_createdAt_idx" ON "SimilarityLog"("createdAt");

-- CreateIndex
CREATE INDEX "SimilarityLog_vectorSimilarityScore_idx" ON "SimilarityLog"("vectorSimilarityScore");

-- CreateIndex
CREATE INDEX "SimilarityLog_finalCompositeScore_idx" ON "SimilarityLog"("finalCompositeScore");

-- CreateIndex
CREATE INDEX "SimilarityLog_thresholdMet_idx" ON "SimilarityLog"("thresholdMet");

-- AddForeignKey
ALTER TABLE "SimilarityLog" ADD CONSTRAINT "SimilarityLog_sourceErrorId_fkey" FOREIGN KEY ("sourceErrorId") REFERENCES "ResultError"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityLog" ADD CONSTRAINT "SimilarityLog_targetErrorId_fkey" FOREIGN KEY ("targetErrorId") REFERENCES "ResultError"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarityLog" ADD CONSTRAINT "SimilarityLog_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "Assumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
