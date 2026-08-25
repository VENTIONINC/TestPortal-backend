-- CreateTable
CREATE TABLE "TestScenario" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "projectId" UUID NOT NULL,

    CONSTRAINT "TestScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestScenario_projectId_idx" ON "TestScenario"("projectId");

-- CreateIndex
CREATE INDEX "TestScenario_projectId_createdAt_idx" ON "TestScenario"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TestScenario_createdById_idx" ON "TestScenario"("createdById");

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
