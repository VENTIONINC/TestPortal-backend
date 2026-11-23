CREATE TABLE "ManualRunEnvironmentProfile" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "browser" VARCHAR(200),
    "operatingSystem" VARCHAR(200),
    "device" VARCHAR(200),
    "apiEnvironment" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManualRunEnvironmentProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualRunEnvironmentProfile_projectId_ownerId_createdAt_idx" ON "ManualRunEnvironmentProfile"("projectId", "ownerId", "createdAt");
CREATE INDEX "ManualRunEnvironmentProfile_ownerId_idx" ON "ManualRunEnvironmentProfile"("ownerId");
ALTER TABLE "ManualRunEnvironmentProfile" ADD CONSTRAINT "ManualRunEnvironmentProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualRunEnvironmentProfile" ADD CONSTRAINT "ManualRunEnvironmentProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualTestRun" ADD COLUMN "browser" VARCHAR(200), ADD COLUMN "operatingSystem" VARCHAR(200), ADD COLUMN "device" VARCHAR(200), ADD COLUMN "apiEnvironment" VARCHAR(200), ADD COLUMN "build" VARCHAR(200), ADD COLUMN "deployment" VARCHAR(200);
