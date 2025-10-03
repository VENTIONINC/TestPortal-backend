-- CreateTable
CREATE TABLE "UploadApiKey" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "projectId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,

    CONSTRAINT "UploadApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadApiKey_apiKey_key" ON "UploadApiKey"("apiKey");

-- CreateIndex
CREATE INDEX "UploadApiKey_projectId_idx" ON "UploadApiKey"("projectId");

-- CreateIndex
CREATE INDEX "UploadApiKey_ownerId_idx" ON "UploadApiKey"("ownerId");

-- CreateIndex
CREATE INDEX "UploadApiKey_apiKey_idx" ON "UploadApiKey"("apiKey");

-- AddForeignKey
ALTER TABLE "UploadApiKey" ADD CONSTRAINT "UploadApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadApiKey" ADD CONSTRAINT "UploadApiKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
