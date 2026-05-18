ALTER TABLE "Result"
ADD COLUMN "artifactProvider" TEXT,
ADD COLUMN "artifactObjectKey" TEXT;

CREATE INDEX "Result_artifactProvider_idx" ON "Result"("artifactProvider");
