-- CreateTable
CREATE TABLE "TestScenarioFolder" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TestScenarioFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSuite" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "purpose" TEXT,
    "release" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSuiteMember" (
    "suiteId" UUID NOT NULL,
    "testScenarioId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestSuiteMember_pkey" PRIMARY KEY ("suiteId", "testScenarioId")
);

ALTER TABLE "TestScenario" ADD COLUMN "folderId" UUID;
CREATE INDEX "TestScenario_projectId_folderId_idx" ON "TestScenario"("projectId", "folderId");
CREATE INDEX "TestScenarioFolder_projectId_parentId_position_idx" ON "TestScenarioFolder"("projectId", "parentId", "position");
CREATE INDEX "TestScenarioFolder_projectId_idx" ON "TestScenarioFolder"("projectId");
CREATE UNIQUE INDEX "TestScenarioFolder_projectId_parentId_name_lower_key" ON "TestScenarioFolder"("projectId", COALESCE("parentId", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"));
CREATE INDEX "TestSuite_projectId_name_idx" ON "TestSuite"("projectId", "name");
CREATE UNIQUE INDEX "TestSuite_projectId_name_lower_key" ON "TestSuite"("projectId", lower("name"));
CREATE UNIQUE INDEX "TestSuiteMember_suiteId_position_key" ON "TestSuiteMember"("suiteId", "position");
CREATE INDEX "TestSuiteMember_testScenarioId_idx" ON "TestSuiteMember"("testScenarioId");

ALTER TABLE "TestScenarioFolder" ADD CONSTRAINT "TestScenarioFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestScenarioFolder" ADD CONSTRAINT "TestScenarioFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TestScenarioFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestScenario" ADD CONSTRAINT "TestScenario_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "TestScenarioFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSuiteMember" ADD CONSTRAINT "TestSuiteMember_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSuiteMember" ADD CONSTRAINT "TestSuiteMember_testScenarioId_fkey" FOREIGN KEY ("testScenarioId") REFERENCES "TestScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
